"""
CarbonSense AI — NVIDIA Nemotron Agent
========================================
Wraps the NVIDIA NIM API (OpenAI-compatible) to power the agentic
"CarbonSense" analysis.  The agent uses a structured ReAct-style
prompt that mirrors the reasoning chain shown in the UI.

Fallback: if the API key is missing or the call fails, a rich
deterministic mock response is returned so the app remains fully
functional for demo / hackathon purposes.
"""

from __future__ import annotations
import os
import logging
import textwrap
from typing import Optional

from models.schemas import WorkloadRequest, FootprintMetrics, RegionSummary, OptimizationScenario
from data.regional_data import REGION_CATALOG

logger = logging.getLogger(__name__)

_NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct")
_NVIDIA_BASE_URL = os.getenv("NVIDIA_API_BASE_URL", "https://integrate.api.nvidia.com/v1")
_NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")


def _build_system_prompt() -> str:
    return textwrap.dedent("""\
        You are CarbonSense AI, an expert sustainability architect specialising in the
        environmental impact of AI/ML workloads on cloud infrastructure.

        When given workload parameters and calculated metrics, you:
        1. Acknowledge the data and briefly describe the footprint magnitude.
        2. Clearly state the most impactful optimisation (region shift, GPU upgrade,
           scheduling change) with quantified savings.
        3. Provide a concise Kubernetes YAML or Terraform snippet for the top migration.
        4. Close with a one-sentence motivational sustainability insight.

        Format your response as a ReAct trace:
          Thought: <reasoning step>
          Action: <tool_name>
          Action Input: <json>
          Observation: <result>
          ...
          Thought: I now have enough information.
          Final Answer: <full analysis with bullet points and code blocks>

        Be concise but technically precise. Use metric units (kg CO₂e, kWh, L).
    """)


def _build_user_prompt(
    req: WorkloadRequest,
    metrics: FootprintMetrics,
    region: RegionSummary,
    scenarios: list[OptimizationScenario],
) -> str:
    top = scenarios[0] if scenarios else None
    scenario_text = (
        f"Best alternative: {top.target_region.display_name} "
        f"({top.target_region.grid_intensity_g_co2} gCO₂/kWh) — saves "
        f"{top.carbon_savings_kg} kg CO₂e and {top.water_savings_liters} L water "
        f"({top.savings_pct:.1f}% reduction)."
    ) if top else "No greener region found."

    return textwrap.dedent(f"""\
        Workload Parameters:
        - GPU: {req.num_gpus}× {req.gpu_type}
        - Region: {region.display_name} ({region.grid_intensity_g_co2} gCO₂/kWh)
        - Duration: {req.duration_hours} hours
        - Utilisation: {req.utilization_pct}%
        - Description: {req.description or 'N/A'}

        Calculated Metrics:
        - Energy: {metrics.energy_kwh} kWh
        - Operational Carbon: {metrics.carbon_kg_co2e} kg CO₂e
        - Embodied Carbon: {metrics.embodied_carbon_kg} kg CO₂e
        - Total Carbon: {metrics.total_carbon_kg_co2e} kg CO₂e
        - Water: {metrics.water_liters} L
        - Trees to offset: {metrics.trees_to_offset}

        Optimisation Analysis:
        {scenario_text}

        Please provide a full CarbonSense analysis with the migration snippet for
        the top recommended region.
    """)


def _mock_analysis(
    req: WorkloadRequest,
    metrics: FootprintMetrics,
    region: RegionSummary,
    scenarios: list[OptimizationScenario],
) -> str:
    """
    Deterministic mock response — returned when the NVIDIA API is unavailable.
    Mimics the ReAct trace format expected by the frontend.
    """
    top = scenarios[0] if scenarios else None
    gpu_label = req.gpu_type.upper().replace("-", " ")

    alt_name = top.target_region.display_name if top else "a greener region"
    alt_intensity = top.target_region.grid_intensity_g_co2 if top else 0
    carbon_savings = top.carbon_savings_kg if top else 0
    water_savings = top.water_savings_liters if top else 0
    savings_pct = top.savings_pct if top else 0
    snippet = top.migration_snippet if top else ""

    return f"""\
Thought: Analyzing AI workload parameters to compute environmental footprint.

Action: calculate_footprint
Action Input: {{
  "gpu_count": {req.num_gpus},
  "gpu_type": "{gpu_label}",
  "region": "{region.display_name}",
  "duration_hours": {req.duration_hours},
  "utilization_pct": {req.utilization_pct}
}}

Observation: {{
  "energy_kwh": {metrics.energy_kwh},
  "carbon_kg_co2e": {metrics.carbon_kg_co2e},
  "embodied_carbon_kg": {metrics.embodied_carbon_kg},
  "water_liters": {metrics.water_liters},
  "trees": {metrics.trees_to_offset}
}}

Thought: Now identifying greener migration targets.

Action: find_greener_alternatives
Action Input: {{
  "current_region": "{region.id}",
  "current_intensity_g_co2": {region.grid_intensity_g_co2},
  "gpu_count": {req.num_gpus}
}}

Observation: Best alternative: {alt_name} at {alt_intensity} gCO₂/kWh.
Potential savings: {carbon_savings} kg CO₂e and {water_savings} L water ({savings_pct:.1f}% reduction).

Thought: I now have enough information to provide a complete analysis.

Final Answer: Your {req.num_gpus}× {gpu_label} workload in {region.display_name} for \
{req.duration_hours} hours has a carbon footprint of {metrics.carbon_kg_co2e} kg CO₂e, \
energy consumption of {metrics.energy_kwh} kWh, and water usage of {metrics.water_liters} liters. \
This amounts to {metrics.trees_to_offset} trees being cut down every year.

To make this more sustainable, consider the following:

1. Region Shift: Move from {region.display_name} ({region.grid_intensity_g_co2} gCO₂/kWh) \
to {alt_name} ({alt_intensity} gCO₂/kWh).
   → Saves ~{carbon_savings} kg CO₂e and ~{water_savings} L water per run ({savings_pct:.1f}% reduction).

2. GPU Efficiency: Consider upgrading to H100 SXM5 for 2.5× better FLOPS/watt.
   → Same model trains in ~40% of the time → proportionally less energy.

3. Carbon-Aware Scheduling: Shift job launch windows to low-grid-intensity hours.
   → Potential 15–25% carbon reduction at zero infrastructure cost.

4. Kubernetes Deployment (Carbon-Optimised):

```yaml
{snippet}
```

5. Estimated net annual savings if workload runs weekly:
   → Carbon: ~{round(carbon_savings * 52, 1)} kg CO₂e/year
   → Water:  ~{round(water_savings * 52, 0):.0f} L/year
   → Equivalent to planting {round(carbon_savings * 52 / 21.77, 1)} trees annually.
"""


async def run_nemotron_analysis(
    req: WorkloadRequest,
    metrics: FootprintMetrics,
    region: RegionSummary,
    scenarios: list[OptimizationScenario],
) -> str:
    """
    Call the NVIDIA NIM endpoint for Nemotron analysis.
    Falls back to _mock_analysis() if the key is absent or the call errors.
    """
    if not _NVIDIA_API_KEY or _NVIDIA_API_KEY.startswith("nvapi-xxx"):
        logger.info("NVIDIA_API_KEY not configured — using mock analysis.")
        return _mock_analysis(req, metrics, region, scenarios)

    try:
        from openai import AsyncOpenAI  # lazy import to avoid hard dep
        client = AsyncOpenAI(
            base_url=_NVIDIA_BASE_URL,
            api_key=_NVIDIA_API_KEY,
        )
        completion = await client.chat.completions.create(
            model=_NVIDIA_MODEL,
            messages=[
                {"role": "system", "content": _build_system_prompt()},
                {"role": "user", "content": _build_user_prompt(req, metrics, region, scenarios)},
            ],
            temperature=0.2,
            max_tokens=1_200,
        )
        return completion.choices[0].message.content or _mock_analysis(req, metrics, region, scenarios)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Nemotron API call failed (%s) — falling back to mock.", exc)
        return _mock_analysis(req, metrics, region, scenarios)
