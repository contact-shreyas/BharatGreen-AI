"""
BharatGreen AI — /regions Router
===================================
GET /regions          → List all available regions
GET /regions/indian   → List Indian data-center regions only
GET /regions/{id}     → Single region detail
GET /gpus             → List all supported GPU models
"""

from __future__ import annotations
from fastapi import APIRouter, HTTPException

from data.regional_data import REGION_CATALOG, GPU_CATALOG, ALL_REGIONS, INDIAN_REGIONS
from models.schemas import RegionListResponse, RegionSummary, GPUListResponse
from services.calculator import _region_to_summary

router = APIRouter(tags=["Regions & GPUs"])


@router.get(
    "/regions",
    response_model=RegionListResponse,
    summary="List all supported cloud regions",
)
def list_regions() -> RegionListResponse:
    summaries = [_region_to_summary(r) for r in ALL_REGIONS]
    return RegionListResponse(regions=summaries, total=len(summaries))


@router.get(
    "/regions/indian",
    response_model=RegionListResponse,
    summary="List Indian data-center regions only",
)
def list_indian_regions() -> RegionListResponse:
    summaries = [_region_to_summary(r) for r in INDIAN_REGIONS]
    return RegionListResponse(regions=summaries, total=len(summaries))


@router.get(
    "/regions/{region_id}",
    response_model=RegionSummary,
    summary="Get details for a specific region",
)
def get_region(region_id: str) -> RegionSummary:
    region = REGION_CATALOG.get(region_id)
    if not region:
        raise HTTPException(status_code=404, detail=f"Region '{region_id}' not found.")
    return _region_to_summary(region)


@router.get(
    "/gpus",
    response_model=GPUListResponse,
    summary="List all supported GPU models",
)
def list_gpus() -> GPUListResponse:
    gpus = [
        {
            "id": g.id,
            "name": g.name,
            "power_w": g.power_w,
            "embodied_carbon_kg": g.embodied_carbon_kg,
            "lifetime_hours": g.lifetime_hours,
        }
        for g in GPU_CATALOG.values()
    ]
    return GPUListResponse(gpus=gpus, total=len(gpus))
