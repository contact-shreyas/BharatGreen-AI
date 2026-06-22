"""
BharatGreen AI — /prompt Router
==================================
POST /prompt/optimize → Rewrite an LLM prompt to be leaner & more token-efficient
                        (NVIDIA Nemotron, with deterministic rule-based fallback).
"""

from __future__ import annotations
from fastapi import APIRouter

from models.schemas import (
    PromptOptimizeRequest,
    PromptOptimizeResponse,
    PromptAnswerRequest,
    PromptAnswerResponse,
    PromptAnswerUsage,
)
from services.prompt_optimizer import optimize_prompt
from services.ai_responder import answer_prompt

router = APIRouter(prefix="/prompt", tags=["Prompt"])


@router.post(
    "/optimize",
    response_model=PromptOptimizeResponse,
    summary="Optimise an LLM prompt for token / water efficiency",
    description=(
        "Rewrites a natural-language prompt into a leaner, clearer, more "
        "token-efficient version using NVIDIA Nemotron. Fewer tokens means less "
        "inference energy, cooling water and carbon. Footprint figures are "
        "computed client-side from the returned text."
    ),
)
async def optimize(req: PromptOptimizeRequest) -> PromptOptimizeResponse:
    optimized, notes, source = await optimize_prompt(req.prompt)
    return PromptOptimizeResponse(
        optimized_prompt=optimized,
        notes=notes,
        source=source,
    )


@router.post(
    "/answer",
    response_model=PromptAnswerResponse,
    summary="Answer a prompt with an LLM (Gemini by default, Claude optional)",
    description=(
        "Sends the (usually optimized) prompt to the configured LLM provider "
        "(Gemini free tier by default, or Anthropic Claude) and returns the "
        "answer plus real token usage. Uses the server key by default; a "
        "per-request key may override it. Falls back to a mock answer when no "
        "key is configured so the feature always works."
    ),
)
async def answer(req: PromptAnswerRequest) -> PromptAnswerResponse:
    text, model_used, provider, source, in_tok, out_tok = await answer_prompt(
        req.prompt, api_key=req.api_key, model=req.model, provider=req.provider
    )
    return PromptAnswerResponse(
        answer=text,
        model=model_used,
        provider=provider,
        source=source,
        usage=PromptAnswerUsage(input_tokens=in_tok, output_tokens=out_tok),
    )
