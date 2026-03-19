"""
BharatGreen AI — Pydantic Schemas
==================================
All request / response models used by FastAPI endpoints.
Validated at the API boundary; internal logic uses domain dataclasses.
"""

from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class WorkloadRequest(BaseModel):
    """
    Describes an AI compute workload whose environmental footprint
    should be calculated.
    """
    description: str = Field(
        default="",
        description="Free-text natural language description of the workload.",
        max_length=2000,
    )
    gpu_type: str = Field(
        default="a100-sxm",
        description="GPU model ID (e.g. 'h100-sxm', 'a100-sxm').",
    )
    num_gpus: int = Field(
        default=8, ge=1, le=10_000,
        description="Number of GPUs in the cluster.",
    )
    region: str = Field(
        default="aws-us-east-1",
        description="Cloud / data-center region ID.",
    )
    duration_hours: float = Field(
        default=24.0, ge=0.1, le=8_760.0,
        description="Wall-clock job duration in hours.",
    )
    utilization_pct: float = Field(
        default=100.0, ge=1.0, le=100.0,
        description="Average GPU utilization percentage (1–100).",
    )

    @field_validator("gpu_type")
    @classmethod
    def gpu_type_must_be_known(cls, v: str) -> str:
        from data.regional_data import GPU_CATALOG
        if v not in GPU_CATALOG:
            raise ValueError(f"Unknown gpu_type '{v}'. Valid: {list(GPU_CATALOG)}")
        return v

    @field_validator("region")
    @classmethod
    def region_must_be_known(cls, v: str) -> str:
        from data.regional_data import REGION_CATALOG
        if v not in REGION_CATALOG:
            raise ValueError(f"Unknown region '{v}'. Valid: {list(REGION_CATALOG)}")
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "description": "Fine-tuning LLaMA-3 70B on 64 H100 GPUs in Mumbai for 72 hours.",
                "gpu_type": "h100-sxm",
                "num_gpus": 64,
                "region": "aws-ap-south-1",
                "duration_hours": 72,
                "utilization_pct": 85,
            }
        }
    }


class OptimizationRequest(BaseModel):
    """Request a What-If comparison between two regions."""
    original: WorkloadRequest
    target_region: str = Field(description="Region ID to compare against.")

    @field_validator("target_region")
    @classmethod
    def target_must_be_known(cls, v: str) -> str:
        from data.regional_data import REGION_CATALOG
        if v not in REGION_CATALOG:
            raise ValueError(f"Unknown region '{v}'")
        return v


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class FootprintMetrics(BaseModel):
    """Core environmental metrics for a workload."""
    energy_kwh: float = Field(description="Total cluster energy consumed (kWh).")
    carbon_kg_co2e: float = Field(description="Operational carbon emissions (kg CO₂e).")
    embodied_carbon_kg: float = Field(description="Amortized embodied carbon from GPU manufacturing (kg CO₂e).")
    total_carbon_kg_co2e: float = Field(description="Operational + embodied carbon (kg CO₂e).")
    water_liters: float = Field(description="Estimated cooling water consumed (liters).")
    trees_to_offset: float = Field(description="Trees needed to offset total emissions annually.")


class RegionSummary(BaseModel):
    """Lightweight region info for responses."""
    id: str
    display_name: str
    provider: str
    country: str
    grid_intensity_g_co2: float
    wue_liters_per_kwh: float
    pue: float
    rating: str
    level: str
    is_indian: bool = False


class WorkloadResponse(BaseModel):
    """Full analysis response for a workload calculation."""
    request: WorkloadRequest
    metrics: FootprintMetrics
    region_info: RegionSummary
    gpu_name: str
    analysis_text: Optional[str] = Field(
        default=None,
        description="Nemotron-generated natural language analysis and recommendations.",
    )


class OptimizationScenario(BaseModel):
    """A single What-If migration scenario."""
    target_region: RegionSummary
    new_metrics: FootprintMetrics
    carbon_savings_kg: float = Field(description="kg CO₂e saved vs original region.")
    water_savings_liters: float = Field(description="Liters saved vs original region.")
    savings_pct: float = Field(description="Percentage reduction in carbon emissions.")
    recommended: bool = Field(description="True if this is the top recommendation.")
    migration_snippet: str = Field(description="Kubernetes / Terraform deployment snippet.")


class OptimizationResponse(BaseModel):
    """Response for a What-If optimization request."""
    original_metrics: FootprintMetrics
    original_region: RegionSummary
    scenarios: List[OptimizationScenario]
    summary: str = Field(description="Nemotron-generated migration plan summary.")


class RegionListResponse(BaseModel):
    """All available regions with their carbon data."""
    regions: List[RegionSummary]
    total: int


class GPUListResponse(BaseModel):
    """All supported GPU models."""
    gpus: List[dict]
    total: int
