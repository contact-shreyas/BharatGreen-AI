"""
BharatGreen AI — Green Prompt Optimizer Service
=================================================
Rewrites a user's LLM prompt into a leaner, clearer, more token-efficient
version using the NVIDIA Nemotron NIM API.

Fewer tokens → less inference energy → less cooling water & carbon, while
preserving (and often improving) the quality of the result.

Fallback: if the NVIDIA_API_KEY is missing or the call fails, a deterministic
rule-based compressor is used so the feature works fully offline for demos.
"""

from __future__ import annotations
import os
import re
import logging
import textwrap

logger = logging.getLogger(__name__)

_NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct")
_NVIDIA_BASE_URL = os.getenv("NVIDIA_API_BASE_URL", "https://integrate.api.nvidia.com/v1")
_NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")


# ── Rule-based fallback compressor ────────────────────────────────────────────
# (Mirrors the client-side compressor in frontend/lib/promptFootprint.ts.)
_PHRASE_RULES: list[tuple[str, str, str]] = [
    (r"^\s*(h(i+|ello+|ey+)|yo+|hiya|greetings|good (morning|afternoon|evening|day))\b[,!.\s]*", "", "Removed greeting"),
    (r"\bi was (just )?wondering if you (could|would|can)\b", "", "Removed hedging ('I was wondering if you could')"),
    (r"\b(could|would|can) you please\b", "", "Dropped polite filler ('could you please')"),
    (r"\b(could|would|can) you kindly\b", "", "Dropped polite filler"),
    (r"\bi (would like|want|need) you to\b", "", "Removed 'I would like you to'"),
    (r"\bi('| a)?m looking for\b", "", "Removed 'I'm looking for'"),
    (r"\bplease\b", "", "Removed 'please'"),
    (r"\bkindly\b", "", "Removed 'kindly'"),
    (r"\bif (it'?s |it is )?(at all )?possible\b", "", "Removed 'if possible'"),
    (r"\bfor me\b", "", "Removed redundant 'for me'"),
    (r"\bmake sure (to|that you)\b", "", "Tightened 'make sure to'"),
    (r"\bin order to\b", "to", "'in order to' -> 'to'"),
    (r"\bdue to the fact that\b", "because", "'due to the fact that' -> 'because'"),
    (r"\bat this (point in time|moment in time)\b", "now", "Simplified to 'now'"),
    (r"\ba (large|great) (number|amount) of\b", "many", "Simplified to 'many'"),
    (r"\bthe (vast )?majority of\b", "most", "Simplified to 'most'"),
    (r"\b(basically|actually|literally|essentially|really|very|just|simply|quite)\b", "", "Removed filler adverbs"),
    (r"\bcan you (help me )?(to )?\b", "", "Removed 'can you help me'"),
    (r"\bi would (really )?appreciate it if you (could|would)\b", "", "Removed appreciation padding"),
    (r"\b(thanks|thank you)( so much)?( in advance)?\b\.?", "", "Removed thanks"),
    (r"\bgo ahead and\b", "", "Removed 'go ahead and'"),
    (r"\bso that (it|they|this|that|you|we|i|he|she) (will|would|can|could|may|might)\b", "to", "'so that it will...' -> 'to'"),
    (r"\bin (the )?order (for .+? )?to\b", "to", "Simplified 'in order to'"),
    (r"\bin the event that\b", "if", "'in the event that' -> 'if'"),
    (r"\b(are|is) able to\b", "can", "'able to' -> 'can'"),
    (r"\bhas the ability to\b", "can", "'has the ability to' -> 'can'"),
    (r"\ba (lot|number) of\b", "many", "'a lot of' -> 'many'"),
    (r"\bnecessary things\b", "essentials", "'necessary things' -> 'essentials'"),
    (r"\b(all of|each of) the\b", "all the", "Tightened 'all of the'"),
    (r"\bin (my|your|our) opinion\b", "", "Removed 'in my opinion'"),
    (r"\bi (think|believe|feel|guess) that\b", "", "Removed 'I think that'"),
    (r"\bas soon as possible\b", "ASAP", "'as soon as possible' -> 'ASAP'"),
    (r"\bat the (present|current) (time|moment)\b", "now", "Simplified to 'now'"),
    (r"\bwith regard(s)? to\b", "about", "'with regard to' -> 'about'"),
    (r"\bin terms of\b", "", "Removed 'in terms of'"),
    (r"\bthe thing (is )?that\b", "", "Removed 'the thing is that'"),
    (r"\bthat (will|would|can|could) help\b", "to help", "Tightened 'that will help'"),
    # Classic wordy -> concise substitutions
    (r"\bit is important to note that\b", "", "Removed 'it is important to note that'"),
    (r"\bit (is|'s) worth (noting|mentioning) that\b", "", "Removed 'it's worth noting that'"),
    (r"\bfor the purpose of\b", "to", "'for the purpose of' -> 'to'"),
    (r"\bin the (near )?future\b", "soon", "'in the future' -> 'soon'"),
    (r"\b(despite|in spite of) the fact that\b", "although", "'despite the fact that' -> 'although'"),
    (r"\bin light of the fact that\b", "because", "'in light of the fact that' -> 'because'"),
    (r"\b(prior to|in advance of)\b", "before", "'prior to' -> 'before'"),
    (r"\bsubsequent to\b", "after", "'subsequent to' -> 'after'"),
    (r"\bin close proximity to\b", "near", "'in close proximity to' -> 'near'"),
    (r"\bon a (regular|daily) basis\b", "regularly", "'on a regular basis' -> 'regularly'"),
    (r"\bin a timely manner\b", "promptly", "'in a timely manner' -> 'promptly'"),
    (r"\b(take into consideration|give consideration to)\b", "consider", "Simplified to 'consider'"),
    (r"\bthe manner in which\b", "how", "'the manner in which' -> 'how'"),
    (r"\bby means of\b", "by", "'by means of' -> 'by'"),
    (r"\bin conjunction with\b", "with", "'in conjunction with' -> 'with'"),
    (r"\bwith the exception of\b", "except", "'with the exception of' -> 'except'"),
    (r"\beach and every\b", "every", "'each and every' -> 'every'"),
    (r"\bfirst and foremost\b", "first", "'first and foremost' -> 'first'"),
    (r"\b(end result|final outcome)\b", "result", "Removed redundancy ('end result')"),
    (r"\bpast (history|experience)\b", r"\1", "Removed redundant 'past'"),
    (r"\b(absolutely essential|completely essential)\b", "essential", "Removed redundant intensifier"),
    (r"\buntil such time as\b", "until", "'until such time as' -> 'until'"),
    (r"\bthere (is|are) (a need|the need) for\b", "", "Removed 'there is a need for'"),
    (r"\bwould it be possible (for you )?to\b", "", "Removed 'would it be possible to'"),
    (r"\b(can|could) you tell me\b", "", "Removed 'can you tell me'"),
    (r"\bi'?d (like|love) to (know|see|understand)\b", "", "Removed 'I'd like to know'"),
    (r"\ba (wide|broad|whole) (variety|range|host) of\b", "various", "Simplified to 'various'"),
    (r"\bvarious different\b", "various", "Removed redundant 'different'"),
    (r"\bin most cases\b", "usually", "'in most cases' -> 'usually'"),
    (r"\bthe reason (why )?(is|was) (that|because)\b", "because", "Tightened 'the reason why is that'"),
    (r"\ball things considered\b", "", "Removed 'all things considered'"),
]


def _rule_based_optimize(prompt: str) -> tuple[str, list[str]]:
    out = prompt
    notes: list[str] = []
    for pattern, repl, note in _PHRASE_RULES:
        if re.search(pattern, out, flags=re.IGNORECASE):
            out = re.sub(pattern, repl, out, flags=re.IGNORECASE)
            out = re.sub(r"\s{2,}", " ", out)
            if note not in notes:
                notes.append(note)

    out = re.sub(r"\s{2,}", " ", out)
    out = re.sub(r"\s+([,.;:!?])", r"\1", out)
    out = re.sub(r"([.!?])\s*[.!?]+", r"\1", out)
    out = re.sub(r"\b(\w+)(\s+\1\b)+", r"\1", out, flags=re.IGNORECASE)  # collapse repeated words
    out = re.sub(r"^[\s,.;:!?-]+", "", out).strip()

    out = re.sub(r"([.!?]\s+)([a-z])", lambda m: m.group(1) + m.group(2).upper(), out)
    if out:
        out = out[0].upper() + out[1:]
    if out and out[-1] not in ".!?":
        out += "."

    if notes:
        notes.append("Collapsed extra whitespace and tidied punctuation")
    if not out.strip():
        return prompt.strip(), []
    return out, notes


def _system_prompt() -> str:
    return textwrap.dedent("""\
        You are a prompt-efficiency optimizer for BharatGreen AI. Your job is to
        rewrite a user's LLM prompt so it uses as FEW tokens as possible while
        preserving — and ideally improving — clarity and the quality of the answer
        it will elicit.

        Rules:
        - Remove politeness padding, hedging, filler words and redundancy.
        - Keep every concrete requirement, constraint and piece of context.
        - Prefer plain, direct, imperative phrasing.
        - Do NOT add new requirements or change the intent.
        - Output ONLY the rewritten prompt. No preamble, no quotes, no explanation.
    """)


async def optimize_prompt(prompt: str) -> tuple[str, list[str], str]:
    """
    Returns (optimized_prompt, notes, source).
    source is 'nemotron' when the NIM API produced the rewrite, else 'mock'.
    """
    if not _NVIDIA_API_KEY or _NVIDIA_API_KEY.startswith("nvapi-xxx"):
        logger.info("NVIDIA_API_KEY not configured — using rule-based prompt optimizer.")
        optimized, notes = _rule_based_optimize(prompt)
        return optimized, notes, "mock"

    try:
        from openai import AsyncOpenAI  # lazy import to avoid hard dep
        client = AsyncOpenAI(base_url=_NVIDIA_BASE_URL, api_key=_NVIDIA_API_KEY)
        completion = await client.chat.completions.create(
            model=_NVIDIA_MODEL,
            messages=[
                {"role": "system", "content": _system_prompt()},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=600,
        )
        optimized = (completion.choices[0].message.content or "").strip()
        # Strip wrapping quotes the model sometimes adds.
        optimized = optimized.strip('"').strip("'").strip()
        if not optimized:
            raise ValueError("empty completion")
        notes = ["Rewritten by NVIDIA Nemotron for token efficiency and clarity"]
        return optimized, notes, "nemotron"
    except Exception as exc:  # noqa: BLE001
        logger.warning("Nemotron prompt optimize failed (%s) — falling back to rules.", exc)
        optimized, notes = _rule_based_optimize(prompt)
        return optimized, notes, "mock"
