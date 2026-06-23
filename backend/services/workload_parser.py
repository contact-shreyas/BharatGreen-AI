"""
BharatGreen AI — Workload-to-Spec Natural-Language Parser
==========================================================
Turns a plain-English workload description into structured parameters, e.g.

    "training Llama-70B for 3 days on 64 H100 GPUs in Mumbai"
        → gpu_type=h100-sxm, num_gpus=64, region=aws-ap-south-1,
          duration_hours=72, description="training Llama-70B…"

NVIDIA Nemotron does the extraction when a key is present; otherwise a
deterministic regex parser keeps the feature working offline for demos.
"""

from __future__ import annotations
import os
import re
import json
import logging
import textwrap

from data.regional_data import GPU_CATALOG, REGION_CATALOG
from models.schemas import WorkloadRequest, ParseWorkloadResponse

logger = logging.getLogger(__name__)

_NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct")
_NVIDIA_BASE_URL = os.getenv("NVIDIA_API_BASE_URL", "https://integrate.api.nvidia.com/v1")
_NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")

# GPU keyword → catalogue id
_GPU_ALIASES: list[tuple[str, str]] = [
    (r"\bh100\s*sxm\b", "h100-sxm"),
    (r"\bh100\s*pcie\b", "h100-pcie"),
    (r"\bh100\b", "h100-sxm"),
    (r"\ba100\s*sxm\b", "a100-sxm"),
    (r"\ba100\s*pcie\b", "a100-pcie"),
    (r"\ba100\b", "a100-sxm"),
    (r"\bv100\b", "v100"),
    (r"\ba10g?\b", "a10g"),
    (r"\bt4\b", "t4"),
]

# City / region keyword → region id
_REGION_ALIASES: list[tuple[str, str]] = [
    (r"\b(mumbai|ap-south-1)\b", "aws-ap-south-1"),
    (r"\b(chennai|asia-south2)\b", "gcp-asia-south2"),
    (r"\b(bengaluru|bangalore|asia-south1)\b", "gcp-asia-south1"),
    (r"\b(hyderabad|south\s*india)\b", "azure-south-india"),
    (r"\b(pune|central\s*india)\b", "azure-central-india"),
    (r"\b(delhi|ncr|gurgaon|noida)\b", "delhi-ncr"),
    (r"\b(finland|europe-north1)\b", "gcp-europe-north1"),
    (r"\b(stockholm|sweden|eu-north-1)\b", "aws-eu-north-1"),
    (r"\b(paris|france|eu-west-3)\b", "aws-eu-west-3"),
    (r"\b(oregon|us-west-2)\b", "aws-us-west-2"),
    (r"\b(virginia|us-east-1)\b", "aws-us-east-1"),
    (r"\b(iowa|us-central1)\b", "gcp-us-central1"),
]


def _regex_parse(text: str) -> tuple[dict, list[str]]:
    t = text.lower()
    out: dict = {}
    found: list[str] = []

    for pat, gpu_id in _GPU_ALIASES:
        if re.search(pat, t):
            out["gpu_type"] = gpu_id
            found.append("gpu_type")
            break

    for pat, region_id in _REGION_ALIASES:
        if re.search(pat, t):
            out["region"] = region_id
            found.append("region")
            break

    # GPU count: "64 GPUs", "64 H100", "64x", "x64"
    m = re.search(r"(\d[\d,]*)\s*(?:x\s*)?(?:gpus?|h100|a100|v100|a10g?|t4)\b", t)
    if not m:
        m = re.search(r"\b(?:x|×)\s*(\d[\d,]*)\b", t)
    if m:
        out["num_gpus"] = max(1, min(10_000, int(m.group(1).replace(",", ""))))
        found.append("num_gpus")

    # Duration: days / hours / weeks
    dur = None
    md = re.search(r"(\d+(?:\.\d+)?)\s*(day|days|d)\b", t)
    if md:
        dur = float(md.group(1)) * 24
    if dur is None:
        mh = re.search(r"(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs|h)\b", t)
        if mh:
            dur = float(mh.group(1))
    if dur is None:
        mw = re.search(r"(\d+(?:\.\d+)?)\s*(week|weeks|w)\b", t)
        if mw:
            dur = float(mw.group(1)) * 24 * 7
    if dur is not None:
        out["duration_hours"] = max(0.1, min(8_760.0, round(dur, 2)))
        found.append("duration_hours")

    # Utilization: "85% utilization"
    mu = re.search(r"(\d+(?:\.\d+)?)\s*%", t)
    if mu:
        out["utilization_pct"] = max(1.0, min(100.0, float(mu.group(1))))
        found.append("utilization_pct")

    return out, found


def _coerce_to_workload(data: dict, original_text: str) -> WorkloadRequest:
    """Validate/repair a partial dict into a WorkloadRequest with safe defaults."""
    gpu = data.get("gpu_type")
    if gpu not in GPU_CATALOG:
        gpu = "a100-sxm"
    region = data.get("region")
    if region not in REGION_CATALOG:
        region = "aws-ap-south-1"
    return WorkloadRequest(
        description=(data.get("description") or original_text).strip()[:2000],
        gpu_type=gpu,
        num_gpus=int(data.get("num_gpus") or 8),
        region=region,
        duration_hours=float(data.get("duration_hours") or 24.0),
        utilization_pct=float(data.get("utilization_pct") or 90.0),
    )


def _nemotron_prompt() -> str:
    gpu_ids = ", ".join(GPU_CATALOG)
    region_ids = ", ".join(REGION_CATALOG)
    return textwrap.dedent(f"""\
        Extract AI-workload parameters from the user's text. Respond with ONLY a
        compact JSON object, no prose, using these keys:
          gpu_type        one of: {gpu_ids}
          num_gpus        integer
          region          one of: {region_ids}
          duration_hours  number (convert days→hours ×24, weeks→×168)
          utilization_pct number 1-100
          description     short summary of the task
        Omit any key you cannot determine. Map city names to region ids
        (Mumbai=aws-ap-south-1, Chennai=gcp-asia-south2, Bengaluru=gcp-asia-south1,
        Hyderabad=azure-south-india, Pune=azure-central-india, Delhi=delhi-ncr).
    """)


async def parse_workload(text: str) -> ParseWorkloadResponse:
    if _NVIDIA_API_KEY and not _NVIDIA_API_KEY.startswith("nvapi-xxx"):
        try:
            from openai import AsyncOpenAI  # lazy import
            client = AsyncOpenAI(base_url=_NVIDIA_BASE_URL, api_key=_NVIDIA_API_KEY)
            completion = await client.chat.completions.create(
                model=_NVIDIA_MODEL,
                messages=[
                    {"role": "system", "content": _nemotron_prompt()},
                    {"role": "user", "content": text},
                ],
                temperature=0.0,
                max_tokens=300,
            )
            raw = (completion.choices[0].message.content or "").strip()
            raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()
            data = json.loads(raw)
            found = [k for k in (
                "gpu_type", "num_gpus", "region", "duration_hours", "utilization_pct"
            ) if k in data and data[k] is not None]
            workload = _coerce_to_workload(data, text)
            return ParseWorkloadResponse(workload=workload, fields_found=found, source="nemotron")
        except Exception as exc:  # noqa: BLE001
            logger.warning("Nemotron parse failed (%s) — using regex fallback.", exc)

    data, found = _regex_parse(text)
    workload = _coerce_to_workload(data, text)
    return ParseWorkloadResponse(workload=workload, fields_found=found, source="mock")
