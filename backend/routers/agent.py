"""
BharatGreen AI — /agent Router
=================================
Agentic endpoints powered by NVIDIA Nemotron (all with offline fallbacks).

POST /agent/auto-optimize  → Autonomous multi-step region×GPU×schedule optimiser
POST /agent/parse-workload → Natural-language → structured workload params
GET  /agent/grid-forecast  → 24-hour carbon-intensity forecast for a region
"""

from __future__ import annotations
from fastapi import APIRouter, HTTPException

from data.regional_data import REGION_CATALOG
from models.schemas import (
    AutoOptimizeRequest,
    AutoOptimizeResponse,
    ParseWorkloadRequest,
    ParseWorkloadResponse,
    GridForecastResponse,
)
from services.auto_optimizer import auto_optimize
from services.workload_parser import parse_workload
from services.grid_forecast import build_forecast

router = APIRouter(prefix="/agent", tags=["Agent"])


@router.post(
    "/auto-optimize",
    response_model=AutoOptimizeResponse,
    summary="Autonomously minimise a workload's carbon (and/or cost)",
    description=(
        "A multi-step agent that searches every region × GPU × launch-hour "
        "combination, then returns one concrete migration plan with quantified "
        "carbon, water and cost deltas. Narrated by NVIDIA Nemotron when a key "
        "is configured; otherwise a deterministic plan is returned."
    ),
)
async def auto_optimize_endpoint(req: AutoOptimizeRequest) -> AutoOptimizeResponse:
    return await auto_optimize(req)


@router.post(
    "/parse-workload",
    response_model=ParseWorkloadResponse,
    summary="Parse a plain-English workload description into structured params",
)
async def parse_workload_endpoint(req: ParseWorkloadRequest) -> ParseWorkloadResponse:
    return await parse_workload(req.text)


@router.get(
    "/grid-forecast",
    response_model=GridForecastResponse,
    summary="24-hour grid carbon-intensity forecast for a region",
)
def grid_forecast_endpoint(region: str = "aws-ap-south-1") -> GridForecastResponse:
    if region not in REGION_CATALOG:
        raise HTTPException(status_code=404, detail=f"Unknown region '{region}'.")
    return build_forecast(region)
