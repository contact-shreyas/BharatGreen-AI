"""
BharatGreen AI — Core Calculation Engine
=========================================
Implements the two-part environmental footprint formula:

  Operational Carbon  = (GPU_count × Power_W × Utilization × Hours)
                        / 1000  [→ kWh]
                        × Grid_Intensity_gCO₂_per_kWh / 1000  [→ kg CO₂e]

  Embodied Carbon     = GPU_Embodied_kg × GPU_count × Hours / Lifetime_h

  Total Carbon        = Operational Carbon + Embodied Carbon

  Water Usage         = Energy_kWh × WUE_liters_per_kWh

  Trees to Offset     = Total_Carbon_kg / 21.77 kg_CO₂_per_tree_per_year

All intermediate values are kept as Python floats; rounding is applied
at the serialisation layer (Pydantic response models) only.
"""

from __future__ import annotations
from typing import List, Tuple

from data.regional_data import (
    GPU_CATALOG,
    REGION_CATALOG,
    GPUSpec,
    RegionData,
)
from models.schemas import (
    WorkloadRequest,
    FootprintMetrics,
    OptimizationScenario,
    RegionSummary,
)

# 1 tree absorbs ~21.77 kg CO₂ per year (USDA Forest Service average)
_TREE_ABSORPTION_KG_PER_YEAR: float = 21.77


def _region_to_summary(r: RegionData) -> RegionSummary:
    """Convert internal RegionData dataclass → Pydantic RegionSummary."""
    return RegionSummary(
        id=r.id,
        display_name=r.display_name,
        provider=r.provider,
        country=r.country,
        grid_intensity_g_co2=r.grid_intensity_g_co2,
        wue_liters_per_kwh=r.wue_liters_per_kwh,
        pue=r.pue,
        rating=r.rating.value,
        level=r.level.value,
        is_indian=r.is_indian,
    )


def calculate_footprint(req: WorkloadRequest) -> Tuple[FootprintMetrics, RegionData, GPUSpec]:
    """
    Compute environmental footprint for a given workload request.

    Returns
    -------
    (FootprintMetrics, RegionData, GPUSpec)
        The calculated metrics alongside the resolved region and GPU objects.
    """
    gpu = GPU_CATALOG[req.gpu_type]
    region = REGION_CATALOG[req.region]

    utilization = req.utilization_pct / 100.0

    # ── Energy ──────────────────────────────────────────────────────────────
    # Raw cluster GPU energy (kWh); PUE is tracked separately for
    # transparency but not folded into this figure so that users can
    # see the "bare metal" vs "with overhead" cost.
    energy_kwh = (req.num_gpus * gpu.power_w * utilization * req.duration_hours) / 1_000.0

    # ── Operational Carbon ───────────────────────────────────────────────────
    # Convert gCO₂/kWh → kg CO₂e/kWh (÷ 1000)
    operational_carbon = (energy_kwh * region.grid_intensity_g_co2) / 1_000.0

    # ── Embodied Carbon (amortised) ─────────────────────────────────────────
    # Cradle-to-gate manufacturing emissions spread over rated GPU lifetime.
    embodied_carbon = (
        gpu.embodied_carbon_kg * req.num_gpus * req.duration_hours
    ) / gpu.lifetime_hours

    total_carbon = operational_carbon + embodied_carbon

    # ── Water ────────────────────────────────────────────────────────────────
    water_liters = energy_kwh * region.wue_liters_per_kwh

    # ── Tree Offset ──────────────────────────────────────────────────────────
    trees_to_offset = total_carbon / _TREE_ABSORPTION_KG_PER_YEAR

    metrics = FootprintMetrics(
        energy_kwh=round(energy_kwh, 2),
        carbon_kg_co2e=round(operational_carbon, 2),
        embodied_carbon_kg=round(embodied_carbon, 3),
        total_carbon_kg_co2e=round(total_carbon, 2),
        water_liters=round(water_liters, 1),
        trees_to_offset=round(trees_to_offset, 2),
    )
    return metrics, region, gpu


def _build_k8s_snippet(num_gpus: int, gpu_id: str, region_name: str, max_intensity: int) -> str:
    """Generate a Kubernetes Job manifest for carbon-optimised deployment."""
    return f"""\
# kubernetes/bharatgreen-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ai-training-carbon-optimized
  annotations:
    bharatgreen.io/preferred-region: "{region_name}"
    bharatgreen.io/max-grid-intensity: "{max_intensity}"
spec:
  template:
    spec:
      nodeSelector:
        cloud.provider/region: "{region_name}"
      tolerations:
        - key: "nvidia.com/gpu"
          operator: "Exists"
      containers:
        - name: training
          image: nvcr.io/nvidia/pytorch:24.01-py3
          resources:
            limits:
              nvidia.com/gpu: "{num_gpus}"
          env:
            - name: CARBON_REGION
              value: "{region_name}"
      restartPolicy: OnFailure"""


def _build_terraform_snippet(provider: str, region_name: str, num_gpus: int, gpu_id: str, est_carbon: float) -> str:
    """Generate a Terraform resource block for carbon-optimised infra."""
    tf_provider = provider.lower().replace("gcp", "google").replace("azure", "azurerm")
    return f"""\
# terraform/main.tf — Migrate to {region_name}
provider "{tf_provider}" {{
  region = "{region_name}"
}}

resource "compute_instance" "bharatgreen_training" {{
  name         = "bharatgreen-ai-training"
  machine_type = "gpu-optimized-{num_gpus}x"
  region       = "{region_name}"

  gpu_config {{
    count = {num_gpus}
    type  = "{gpu_id}"
  }}

  labels = {{
    carbon_optimized     = "true"
    est_carbon_kg_co2e  = "{est_carbon}"
    managed_by          = "bharatgreen-ai"
  }}
}}"""


def compute_optimization_scenarios(
    req: WorkloadRequest,
    original_metrics: FootprintMetrics,
) -> List[OptimizationScenario]:
    """
    Generate What-If migration scenarios for every region that has a lower
    grid intensity than the current region.

    Returns up to 5 scenarios, sorted by carbon savings descending.
    """
    current_region = REGION_CATALOG[req.region]
    gpu = GPU_CATALOG[req.gpu_type]
    scenarios: List[OptimizationScenario] = []

    for region in REGION_CATALOG.values():
        if region.id == req.region:
            continue
        if region.grid_intensity_g_co2 >= current_region.grid_intensity_g_co2:
            continue

        # Re-calculate metrics for the alternative region
        alt_req = req.model_copy(update={"region": region.id})
        alt_metrics, _, _ = calculate_footprint(alt_req)

        carbon_savings = original_metrics.carbon_kg_co2e - alt_metrics.carbon_kg_co2e
        water_savings = original_metrics.water_liters - alt_metrics.water_liters
        savings_pct = (carbon_savings / original_metrics.carbon_kg_co2e) * 100 if original_metrics.carbon_kg_co2e else 0

        # Pick the most appropriate infra snippet based on provider
        snippet = _build_k8s_snippet(
            req.num_gpus, req.gpu_type, region.name,
            int(region.grid_intensity_g_co2 + 50)
        )

        scenarios.append(
            OptimizationScenario(
                target_region=_region_to_summary(region),
                new_metrics=alt_metrics,
                carbon_savings_kg=round(carbon_savings, 2),
                water_savings_liters=round(water_savings, 1),
                savings_pct=round(savings_pct, 1),
                recommended=False,
                migration_snippet=snippet,
            )
        )

    # Sort by carbon savings and flag the top result
    scenarios.sort(key=lambda s: s.carbon_savings_kg, reverse=True)
    if scenarios:
        scenarios[0] = scenarios[0].model_copy(update={"recommended": True})

    return scenarios[:5]
