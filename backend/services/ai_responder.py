"""
BharatGreen AI — AI Responder Service
=====================================
Answers the (already optimized) prompt with a configurable LLM provider and
returns the answer plus real token usage, so the UI can show the true water /
carbon footprint of the exchange.

Providers
  • gemini    — Google Gemini via the free Google AI Studio key (default).
                Uses the REST API over httpx — no extra SDK needed.
  • anthropic — Claude via the Anthropic SDK (optional fallback).

Auth ("works on every laptop"):
  • A server-side key (GEMINI_API_KEY / ANTHROPIC_API_KEY) is used by default, so
    every user gets answers with zero setup.
  • A per-request `api_key` may override it (a user pasting their own key). The
    override is never logged or stored server-side.

Fallback: if no usable key (or the call fails) a deterministic mock answer is
returned with source="mock", so the feature never crashes a demo.
"""

from __future__ import annotations
import os
import asyncio
import logging
import textwrap

import httpx

logger = logging.getLogger(__name__)

# Default provider — Gemini's free tier needs no billing, ideal for demos.
_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").strip().lower()

# ── Gemini (Google AI Studio) ─────────────────────────────────────────────────
_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
_GEMINI_BASE_URL = os.getenv(
    "GEMINI_API_BASE_URL", "https://generativelanguage.googleapis.com/v1beta"
)

# ── Anthropic (Claude) — optional fallback ────────────────────────────────────
_ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
_ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")

_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "1024"))


def _system_prompt() -> str:
    return textwrap.dedent("""\
        You are answering inside BharatGreen AI's Green Prompt Optimizer.
        Give a clear, correct and genuinely useful answer to the user's prompt.

        Style:
        - Be direct and concise. No greetings, no filler, no restating the question.
        - Use the fewest tokens needed for a complete, high-quality answer — every
          output token costs real energy, cooling water and carbon in the data center.
        - Prefer plain formatting; use short lists or code blocks only when they help.
    """)


def _is_real_key(key: str | None) -> bool:
    if not key:
        return False
    k = key.strip().lower()
    if not k:
        return False
    if k.startswith(("your-", "<", "sk-ant-xxx")) or "xxxx" in k:
        return False
    return True


def _mock_answer(prompt: str) -> str:
    return textwrap.dedent(f"""\
        ⚙️ No AI key is configured on this server yet, so here is a placeholder answer.

        To get a live answer, set a `GEMINI_API_KEY` (free — get one at
        aistudio.google.com) on the backend, or paste your own key in the
        "Use my own API key" box above. Once a key is present, this panel shows
        the model's real response to your optimized prompt.

        Your optimized prompt was:
        "{prompt.strip()[:400]}"
    """)


# ── Gemini call (REST over httpx) ─────────────────────────────────────────────
async def _answer_gemini(prompt: str, key: str, model: str) -> tuple[str, str, int, int]:
    url = f"{_GEMINI_BASE_URL}/models/{model}:generateContent"
    payload = {
        "system_instruction": {"parts": [{"text": _system_prompt()}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": _MAX_TOKENS, "temperature": 0.4},
    }
    # Gemini occasionally returns transient 503 (overloaded) / 429 — retry briefly.
    last_exc: Exception | None = None
    async with httpx.AsyncClient(timeout=60.0) as client:
        for attempt in range(3):
            resp = await client.post(url, params={"key": key}, json=payload)
            if resp.status_code in (429, 500, 503) and attempt < 2:
                await asyncio.sleep(1.5 * (attempt + 1))
                last_exc = httpx.HTTPStatusError(
                    f"transient {resp.status_code}", request=resp.request, response=resp
                )
                continue
            resp.raise_for_status()
            data = resp.json()
            break
        else:  # pragma: no cover — loop always breaks or raises above
            raise last_exc or RuntimeError("Gemini request failed")

    candidates = data.get("candidates") or []
    text = ""
    if candidates:
        parts = (candidates[0].get("content") or {}).get("parts") or []
        text = "".join(p.get("text", "") for p in parts).strip()
    if not text:
        reason = (
            (candidates[0].get("finishReason") if candidates else None)
            or data.get("promptFeedback")
            or "no content"
        )
        raise ValueError(f"empty Gemini response ({reason})")

    usage = data.get("usageMetadata") or {}
    in_tok = int(usage.get("promptTokenCount", 0) or 0)
    out_tok = int(usage.get("candidatesTokenCount", 0) or 0)
    return text, model, in_tok, out_tok


# ── Anthropic call (SDK) ──────────────────────────────────────────────────────
async def _answer_anthropic(prompt: str, key: str, model: str) -> tuple[str, str, int, int]:
    from anthropic import AsyncAnthropic  # lazy import — keeps it optional

    client = AsyncAnthropic(api_key=key)
    message = await client.messages.create(
        model=model,
        max_tokens=_MAX_TOKENS,
        system=_system_prompt(),
        messages=[{"role": "user", "content": prompt}],
    )
    text = "".join(
        b.text for b in message.content if getattr(b, "type", None) == "text"
    ).strip()
    if not text:
        raise ValueError("empty completion from Claude")
    usage = getattr(message, "usage", None)
    in_tok = int(getattr(usage, "input_tokens", 0) or 0)
    out_tok = int(getattr(usage, "output_tokens", 0) or 0)
    return text, getattr(message, "model", model), in_tok, out_tok


async def answer_prompt(
    prompt: str,
    api_key: str | None = None,
    model: str | None = None,
    provider: str | None = None,
) -> tuple[str, str, str, str, int, int]:
    """
    Returns (answer, model_used, provider, source, input_tokens, output_tokens).
    source is "live" when a real model answered, else "mock".
    """
    prov = (provider or _PROVIDER or "gemini").strip().lower()
    if prov not in ("gemini", "anthropic"):
        prov = "gemini"
    override = api_key.strip() if api_key and api_key.strip() else ""

    if prov == "anthropic":
        key = override or _ANTHROPIC_API_KEY
        default_model = _ANTHROPIC_MODEL
        runner = _answer_anthropic
    else:
        key = override or _GEMINI_API_KEY
        default_model = _GEMINI_MODEL
        runner = _answer_gemini

    chosen_model = (model or default_model).strip() or default_model

    if not _is_real_key(key):
        logger.info("No %s key configured — returning mock answer.", prov)
        return _mock_answer(prompt), chosen_model, prov, "mock", 0, 0

    try:
        text, model_used, in_tok, out_tok = await runner(prompt, key, chosen_model)
        return text, model_used, prov, "live", in_tok, out_tok
    except Exception as exc:  # noqa: BLE001
        logger.warning("%s answer failed (%s) — returning mock answer.", prov, exc)
        return _mock_answer(prompt), chosen_model, prov, "mock", 0, 0
