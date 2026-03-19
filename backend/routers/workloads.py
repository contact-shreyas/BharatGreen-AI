"""
BharatGreen AI — /workloads Router
=====================================
POST /workloads/analyze   → Full carbon + water + Nemotron analysis
POST /workloads/optimize  → What-If comparison across greener regions
"""

from __future__ import annotations
from fastapi import APIRouter, HTTPException

from models.schemas import (
    WorkloadRequest,
    WorkloadResponse,
    OptimizationRequest,
    OptimizationResponse,
)
from services.calculator import (
    calculate_footprint,
    compute_optimization_scenarios,
    _region_to_summary,
)
from services.nemotron_agent import run_nemotron_analysis

router = APIRouter(prefix="/workloads", tags=["Workloads"])


@router.post(
    "/analyze",
    response_model=WorkloadResponse,
    summary="Analyze AI workload carbon & water footprint",
    description=(
        "Calculates the full environmental footprint of an AI compute workload "
        "and returns Nemotron-generated optimisation recommendations."
    ),
)
async def analyze_workload(req: WorkloadRequest) -> WorkloadResponse:
    """
    1. Validates GPU type and region.
    2. Runs the dual-metric calculation engine.
    3. Computes optimisation scenarios.
    4. Calls the Nemotron agent for natural-language analysis.
    """
    try:
        metrics, region, gpu = calculate_footprint(req)
    except KeyError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid input: {exc}") from exc

    scenarios = compute_optimization_scenarios(req, metrics)
    region_summary = _region_to_summary(region)

    analysis_text = await run_nemotron_analysis(req, metrics, region_summary, scenarios)

    return WorkloadResponse(
        request=req,
        metrics=metrics,
        region_info=region_summary,
        gpu_name=gpu.name,
        analysis_text=analysis_text,
    )


@router.post(
    "/optimize",
    response_model=OptimizationResponse,
    summary="What-If optimisation across all greener regions",
    description="Returns migration scenarios to every region with a lower carbon intensity.",
)
async def optimize_workload(req: OptimizationRequest) -> OptimizationResponse:
    try:
        orig_metrics, orig_region, gpu = calculate_footprint(req.original)
    except KeyError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid input: {exc}") from exc

    scenarios = compute_optimization_scenarios(req.original, orig_metrics)
    region_summary = _region_to_summary(orig_region)
    analysis = await run_nemotron_analysis(req.original, orig_metrics, region_summary, scenarios)

    return OptimizationResponse(
        original_metrics=orig_metrics,
        original_region=region_summary,
        scenarios=scenarios,
        summary=analysis,
    )
