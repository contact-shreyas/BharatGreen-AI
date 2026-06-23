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


class PromptOptimizeRequest(BaseModel):
    """A natural-language prompt to be made more token-efficient."""
    prompt: str = Field(
        description="The user's original LLM prompt to optimise.",
        min_length=1,
        max_length=8000,
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "prompt": "Could you please kindly help me write a Python function "
                          "that returns the average of a list of numbers? Thank you!"
            }
        }
    }


class PromptOptimizeResponse(BaseModel):
    """The optimised prompt plus a list of human-readable edits."""
    optimized_prompt: str = Field(description="Leaner, clearer rewrite of the prompt.")
    notes: List[str] = Field(
        default_factory=list,
        description="Human-readable summary of what changed.",
    )
    source: str = Field(
        default="mock",
        description="'nemotron' if rewritten by the NVIDIA NIM API, else 'mock'.",
    )


class PromptAnswerRequest(BaseModel):
    """An (optimized) prompt to be answered by Claude."""
    prompt: str = Field(
        description="The prompt Claude should answer (usually the optimized one).",
        min_length=1,
        max_length=8000,
    )
    api_key: Optional[str] = Field(
        default=None,
        description="Optional per-user API key (Gemini or Claude). Overrides the server key; never stored.",
    )
    model: Optional[str] = Field(
        default=None,
        description="Optional model override (e.g. 'gemini-2.0-flash' or 'claude-sonnet-4-6').",
    )
    provider: Optional[str] = Field(
        default=None,
        description="Optional provider override: 'gemini' (default) or 'anthropic'.",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "prompt": "Write a Python function returning the average of a list of numbers."
            }
        }
    }


class PromptAnswerUsage(BaseModel):
    """Real token usage reported by Claude for the answered prompt."""
    input_tokens: int = Field(default=0, description="Prompt tokens Claude read.")
    output_tokens: int = Field(default=0, description="Tokens Claude generated.")


class PromptAnswerResponse(BaseModel):
    """The model's answer to the prompt, plus the model and measured token usage."""
    answer: str = Field(description="The model's answer to the prompt.")
    model: str = Field(description="Model that produced the answer.")
    provider: str = Field(
        default="gemini",
        description="Provider that answered: 'gemini' or 'anthropic'.",
    )
    source: str = Field(
        default="mock",
        description="'live' if a real model answered, else 'mock'.",
    )
    usage: PromptAnswerUsage = Field(default_factory=PromptAnswerUsage)


# ---------------------------------------------------------------------------
# Agentic Auto-Optimizer  (multi-step: region × GPU × schedule)
# ---------------------------------------------------------------------------

class AutoOptimizeRequest(BaseModel):
    """Ask the agent to autonomously minimise a workload's footprint."""
    workload: WorkloadRequest
    objective: str = Field(
        default="carbon",
        description="Optimisation objective: 'carbon', 'cost', or 'balanced'.",
    )
    cost_weight: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="0 = minimise carbon only, 1 = minimise cost only. "
                    "Used when objective is 'balanced'.",
    )
    allow_gpu_swap: bool = Field(default=True, description="Let the agent change GPU model.")
    allow_region_shift: bool = Field(default=True, description="Let the agent change region.")
    allow_time_shift: bool = Field(default=True, description="Let the agent time-shift the run.")

    model_config = {
        "json_schema_extra": {
            "example": {
                "workload": WorkloadRequest.model_config["json_schema_extra"]["example"],
                "objective": "balanced",
                "cost_weight": 0.4,
            }
        }
    }


class PlanMetrics(BaseModel):
    """Footprint + cost for one workload configuration."""
    gpu_type: str
    gpu_name: str
    region: str
    region_name: str
    num_gpus: int
    duration_hours: float = Field(description="Effective wall-clock hours (scaled by GPU speed).")
    best_hour_ist: int = Field(description="Lowest-carbon hour to launch (0–23, IST).")
    energy_kwh: float
    carbon_kg_co2e: float
    water_liters: float
    cost_usd: float


class AutoOptimizePlan(BaseModel):
    """A single concrete migration plan the agent evaluated."""
    label: str = Field(description="Human-readable summary, e.g. 'Mumbai → Chennai, A100 → H100, run 03:00 IST'.")
    metrics: PlanMetrics
    carbon_savings_kg: float
    carbon_savings_pct: float
    water_savings_liters: float
    cost_delta_usd: float = Field(description="Cost change vs baseline (negative = cheaper).")
    actions: List[str] = Field(default_factory=list, description="Discrete migration steps.")
    recommended: bool = False


class AgentStep(BaseModel):
    """One step of the agent's reasoning trace (ReAct-style)."""
    thought: str
    action: str
    observation: str


class AutoOptimizeResponse(BaseModel):
    """The agent's autonomous optimisation result."""
    baseline: PlanMetrics
    recommended: AutoOptimizePlan
    carbon_optimal: AutoOptimizePlan
    cost_optimal: AutoOptimizePlan
    candidates: List[AutoOptimizePlan]
    steps: List[AgentStep] = Field(description="Multi-step reasoning trace.")
    summary: str = Field(description="Nemotron (or fallback) natural-language migration plan.")
    combos_evaluated: int
    source: str = Field(default="mock", description="'nemotron' if narrated by NVIDIA NIM, else 'mock'.")


# ---------------------------------------------------------------------------
# Workload-to-spec natural-language parser
# ---------------------------------------------------------------------------

class ParseWorkloadRequest(BaseModel):
    """A free-text workload description to convert into structured params."""
    text: str = Field(min_length=1, max_length=2000)

    model_config = {
        "json_schema_extra": {
            "example": {"text": "training Llama-70B for 3 days on 64 H100 GPUs in Mumbai"}
        }
    }


class ParseWorkloadResponse(BaseModel):
    """Structured workload parameters extracted from natural language."""
    workload: WorkloadRequest
    fields_found: List[str] = Field(
        default_factory=list,
        description="Which fields the parser confidently extracted.",
    )
    source: str = Field(default="mock", description="'nemotron' or 'mock' (regex fallback).")


# ---------------------------------------------------------------------------
# 24-hour grid carbon forecast (time-shift scheduler)
# ---------------------------------------------------------------------------

class ForecastPoint(BaseModel):
    hour_ist: int
    intensity_g_co2: float


class GridForecastResponse(BaseModel):
    region: str
    region_name: str
    points: List[ForecastPoint]
    best_hour_ist: int
    worst_hour_ist: int
    best_intensity_g_co2: float
    worst_intensity_g_co2: float
    source: str = Field(default="simulated")


class RegionListResponse(BaseModel):
    """All available regions with their carbon data."""
    regions: List[RegionSummary]
    total: int


class GPUListResponse(BaseModel):
    """All supported GPU models."""
    gpus: List[dict]
    total: int
