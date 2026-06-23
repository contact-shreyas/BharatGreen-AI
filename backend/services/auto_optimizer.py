"""
BharatGreen AI — Agentic Auto-Optimizer
========================================
An *autonomous* multi-step agent. Instead of merely recommending one greener
region, it searches the full space of

    region  ×  GPU model  ×  launch hour (carbon-aware schedule)

evaluating every combination with the real footprint engine, then returns a
single concrete migration plan:

    "Mumbai → Chennai, A100 → H100, run 03:00 IST  =  −47% carbon"

The search is deterministic (so it always works offline for a demo); NVIDIA
Nemotron is used only to *narrate* the resulting plan as a ReAct-style trace.
If the NVIDIA key is absent or the call fails, a rich deterministic narrative
is produced instead.
"""

from __future__ import annotations
import os
import math
import logging
import textwrap
from typing import Tuple

from data.regional_data import GPU_CATALOG, REGION_CATALOG, RegionData
from models.schemas import (
    WorkloadRequest,
    AutoOptimizeRequest,
    AutoOptimizeResponse,
    AutoOptimizePlan,
    PlanMetrics,
    AgentStep,
)
from services.calculator import calculate_footprint, _region_to_summary  # noqa: F401

logger = logging.getLogger(__name__)

_NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "nvidia/nemotron-mini-4b-instruct")
_NVIDIA_BASE_URL = os.getenv("NVIDIA_API_BASE_URL", "https://integrate.api.nvidia.com/v1")
_NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")

# India-grid 24-hour intensity multiplier curve (peaks ~9AM & ~7PM, trough ~4AM).
# Mirrors the frontend Green Scheduler so numbers line up across the app.
_HOUR_CURVE = [
    0.72, 0.68, 0.65, 0.63, 0.62, 0.64, 0.71, 0.84,
    0.95, 1.05, 1.10, 1.08, 1.04, 1.02, 1.00, 0.97,
    0.96, 0.98, 1.06, 1.12, 1.08, 0.98, 0.88, 0.78,
]
_USD_PER_TONNE_CO2 = 51.0  # social cost proxy, used only for context in summary


def _best_hour() -> Tuple[int, float]:
    """Return (hour_ist, multiplier) of the lowest-carbon launch window."""
    h = min(range(24), key=lambda i: _HOUR_CURVE[i])
    return h, _HOUR_CURVE[h]


def _evaluate(
    base: WorkloadRequest,
    region_id: str,
    gpu_id: str,
    time_shift: bool,
) -> PlanMetrics:
    """Compute footprint + cost for one (region, gpu, schedule) combination."""
    region = REGION_CATALOG[region_id]
    gpu = GPU_CATALOG[gpu_id]
    base_gpu = GPU_CATALOG[base.gpu_type]

    # A faster GPU finishes the same work in fewer wall-clock hours.
    perf_ratio = base_gpu.perf_relative / gpu.perf_relative
    eff_hours = round(base.duration_hours * perf_ratio, 3)

    combo = base.model_copy(update={
        "region": region_id,
        "gpu_type": gpu_id,
        "duration_hours": max(0.1, eff_hours),
    })
    metrics, _, _ = calculate_footprint(combo)

    best_h, mult = _best_hour()
    if time_shift:
        # Operational carbon scales with the launch-hour grid multiplier;
        # embodied carbon is schedule-independent. metrics.carbon_kg_co2e is
        # the operational component only (see calculator.calculate_footprint).
        op_carbon = metrics.carbon_kg_co2e * mult
        carbon = round(op_carbon + metrics.embodied_carbon_kg, 2)
    else:
        best_h = -1
        carbon = metrics.total_carbon_kg_co2e

    cost_usd = round(
        gpu.price_usd_per_hour
        * base.num_gpus
        * max(0.1, eff_hours)
        * region.price_multiplier,
        2,
    )

    return PlanMetrics(
        gpu_type=gpu_id,
        gpu_name=gpu.name,
        region=region_id,
        region_name=region.display_name,
        num_gpus=base.num_gpus,
        duration_hours=round(max(0.1, eff_hours), 2),
        best_hour_ist=best_h,
        energy_kwh=metrics.energy_kwh,
        carbon_kg_co2e=carbon,
        water_liters=metrics.water_liters,
        cost_usd=cost_usd,
    )


def _plan_from(
    base_metrics: PlanMetrics,
    cand: PlanMetrics,
    orig: WorkloadRequest,
) -> AutoOptimizePlan:
    carbon_savings = round(base_metrics.carbon_kg_co2e - cand.carbon_kg_co2e, 2)
    carbon_pct = round(
        (carbon_savings / base_metrics.carbon_kg_co2e * 100) if base_metrics.carbon_kg_co2e else 0,
        1,
    )
    water_savings = round(base_metrics.water_liters - cand.water_liters, 1)
    cost_delta = round(cand.cost_usd - base_metrics.cost_usd, 2)

    actions: list[str] = []
    label_parts: list[str] = []
    if cand.region != orig.region:
        actions.append(f"Migrate region: {base_metrics.region_name} → {cand.region_name}")
        label_parts.append(f"{base_metrics.region_name.split(' (')[0]} → {cand.region_name.split(' (')[0]}")
    if cand.gpu_type != orig.gpu_type:
        actions.append(f"Switch GPU: {base_metrics.gpu_name} → {cand.gpu_name}")
        label_parts.append(f"{base_metrics.gpu_name.split(' —')[0]} → {cand.gpu_name.split(' —')[0]}")
    if cand.best_hour_ist >= 0:
        actions.append(f"Time-shift launch to {cand.best_hour_ist:02d}:00 IST (grid trough)")
        label_parts.append(f"run {cand.best_hour_ist:02d}:00 IST")
    if not actions:
        actions.append("Keep current configuration (already optimal)")
        label_parts.append("No change needed")

    return AutoOptimizePlan(
        label=", ".join(label_parts),
        metrics=cand,
        carbon_savings_kg=max(0.0, carbon_savings),
        carbon_savings_pct=max(0.0, carbon_pct),
        water_savings_liters=max(0.0, water_savings),
        cost_delta_usd=cost_delta,
        actions=actions,
    )


def _normalize(values: list[float]) -> list[float]:
    lo, hi = min(values), max(values)
    if math.isclose(hi, lo):
        return [0.0 for _ in values]
    return [(v - lo) / (hi - lo) for v in values]


def search_plans(req: AutoOptimizeRequest) -> dict:
    """Run the deterministic combinatorial search. Returns plan objects + counts."""
    base = req.workload
    baseline = _evaluate(base, base.region, base.gpu_type, time_shift=False)

    regions = list(REGION_CATALOG) if req.allow_region_shift else [base.region]
    gpus = list(GPU_CATALOG) if req.allow_gpu_swap else [base.gpu_type]

    plans: list[AutoOptimizePlan] = []
    combos = 0
    for region_id in regions:
        for gpu_id in gpus:
            combos += 1
            cand = _evaluate(base, region_id, gpu_id, time_shift=req.allow_time_shift)
            plans.append(_plan_from(baseline, cand, base))

    # Carbon-optimal & cost-optimal poles.
    carbon_optimal = min(plans, key=lambda p: p.metrics.carbon_kg_co2e)
    cost_optimal = min(plans, key=lambda p: p.metrics.cost_usd)

    # Weighted choice for the recommendation.
    if req.objective == "carbon":
        weight = 0.0
    elif req.objective == "cost":
        weight = 1.0
    else:
        weight = req.cost_weight

    n_carbon = _normalize([p.metrics.carbon_kg_co2e for p in plans])
    n_cost = _normalize([p.metrics.cost_usd for p in plans])
    scores = [weight * c + (1 - weight) * cb for c, cb in zip(n_cost, n_carbon)]
    rec_idx = min(range(len(plans)), key=lambda i: scores[i])
    recommended = plans[rec_idx]
    recommended.recommended = True

    # Top candidates by carbon savings (deduped, recommended first).
    ranked = sorted(plans, key=lambda p: p.carbon_savings_kg, reverse=True)
    candidates = [recommended] + [p for p in ranked if p is not recommended][:6]

    return {
        "baseline": baseline,
        "recommended": recommended,
        "carbon_optimal": carbon_optimal,
        "cost_optimal": cost_optimal,
        "candidates": candidates,
        "combos": combos,
    }


def _build_steps(result: dict) -> list[AgentStep]:
    base: PlanMetrics = result["baseline"]
    rec: AutoOptimizePlan = result["recommended"]
    carbon_opt: AutoOptimizePlan = result["carbon_optimal"]
    return [
        AgentStep(
            thought="Establish the baseline footprint of the workload as configured.",
            action="calculate_footprint",
            observation=(
                f"{base.num_gpus}× {base.gpu_name.split(' —')[0]} in "
                f"{base.region_name.split(' (')[0]} → {base.carbon_kg_co2e} kg CO₂e, "
                f"{base.water_liters} L water, ${base.cost_usd}."
            ),
        ),
        AgentStep(
            thought="Enumerate every region × GPU × launch-hour combination and score each.",
            action="search_configuration_space",
            observation=(
                f"Evaluated {result['combos']} configurations across "
                f"{len(REGION_CATALOG)} regions and {len(GPU_CATALOG)} GPU models."
            ),
        ),
        AgentStep(
            thought="Identify the greenest reachable configuration.",
            action="rank_by_carbon",
            observation=(
                f"Lowest-carbon plan: {carbon_opt.label} → "
                f"{carbon_opt.metrics.carbon_kg_co2e} kg CO₂e "
                f"(−{carbon_opt.carbon_savings_pct}%)."
            ),
        ),
        AgentStep(
            thought="Balance the objective (carbon vs cost) and commit to a final plan.",
            action="select_plan",
            observation=(
                f"Recommended: {rec.label} → −{rec.carbon_savings_pct}% carbon, "
                f"cost delta ${rec.cost_delta_usd}."
            ),
        ),
    ]


def _mock_summary(result: dict, req: AutoOptimizeRequest) -> str:
    base: PlanMetrics = result["baseline"]
    rec: AutoOptimizePlan = result["recommended"]
    m = rec.metrics
    annual_carbon = round(rec.carbon_savings_kg * 52, 1)
    cost_phrase = (
        f"saves ${abs(rec.cost_delta_usd):,.2f}" if rec.cost_delta_usd < 0
        else f"adds ${rec.cost_delta_usd:,.2f}"
    )
    return textwrap.dedent(f"""\
        Final Answer — Autonomous migration plan

        Your workload ({base.num_gpus}× {base.gpu_name.split(' —')[0]} in
        {base.region_name.split(' (')[0]}) currently emits {base.carbon_kg_co2e} kg CO₂e
        and uses {base.water_liters} L of cooling water per run.

        Recommended plan: **{rec.label}**
        • Carbon: {base.carbon_kg_co2e} → {m.carbon_kg_co2e} kg CO₂e  (−{rec.carbon_savings_pct}%)
        • Water:  saves {rec.water_savings_liters} L per run
        • Cost:   {cost_phrase} per run (now ${m.cost_usd})
        • Schedule: launch at {m.best_hour_ist:02d}:00 IST when the grid is cleanest

        Steps:
        {chr(10).join('  ' + str(i + 1) + '. ' + a for i, a in enumerate(rec.actions))}

        At weekly cadence this avoids ~{annual_carbon} kg CO₂e/year
        (≈ {round(annual_carbon / 21.77, 1)} trees' annual absorption).
    """).strip()


async def auto_optimize(req: AutoOptimizeRequest) -> AutoOptimizeResponse:
    """Run the search, then narrate via Nemotron (falling back to a mock)."""
    result = search_plans(req)
    steps = _build_steps(result)
    summary = _mock_summary(result, req)
    source = "mock"

    if _NVIDIA_API_KEY and not _NVIDIA_API_KEY.startswith("nvapi-xxx"):
        try:
            from openai import AsyncOpenAI  # lazy import
            client = AsyncOpenAI(base_url=_NVIDIA_BASE_URL, api_key=_NVIDIA_API_KEY)
            rec: AutoOptimizePlan = result["recommended"]
            base: PlanMetrics = result["baseline"]
            user = textwrap.dedent(f"""\
                Baseline: {base.num_gpus}x {base.gpu_name} in {base.region_name},
                {base.carbon_kg_co2e} kg CO2e, {base.water_liters} L water, ${base.cost_usd}.
                Best plan found: {rec.label}. New footprint {rec.metrics.carbon_kg_co2e} kg CO2e
                (-{rec.carbon_savings_pct}%), water saved {rec.water_savings_liters} L,
                cost delta ${rec.cost_delta_usd}. Actions: {rec.actions}.
                Write a concise, confident migration plan (<160 words) a platform engineer
                can act on. Use metric units. End with one motivational sustainability line.
            """)
            completion = await client.chat.completions.create(
                model=_NVIDIA_MODEL,
                messages=[
                    {"role": "system", "content":
                        "You are BharatGreen AI's autonomous optimization agent. "
                        "You turn a chosen migration plan into clear engineer-ready guidance."},
                    {"role": "user", "content": user},
                ],
                temperature=0.3,
                max_tokens=400,
                timeout=18,
            )
            text = (completion.choices[0].message.content or "").strip()
            if text:
                summary = text
                source = "nemotron"
        except Exception as exc:  # noqa: BLE001
            logger.warning("Nemotron auto-optimize narration failed (%s) — using mock.", exc)

    return AutoOptimizeResponse(
        baseline=result["baseline"],
        recommended=result["recommended"],
        carbon_optimal=result["carbon_optimal"],
        cost_optimal=result["cost_optimal"],
        candidates=result["candidates"],
        steps=steps,
        summary=summary,
        combos_evaluated=result["combos"],
        source=source,
    )
