"""
BharatGreen AI — Regional Infrastructure Data
==============================================
Mock-but-realistic data sourced from IEA, CEEW (India), and hyperscaler
sustainability reports. Covers Indian data centers (primary focus) and
major global regions for cross-cloud comparison.

Grid Intensity:  gCO₂/kWh  (source: Electricity Maps / WattTime averages)
WUE:             liters/kWh (source: hyperscaler ESG disclosures)
PUE:             dimensionless (source: hyperscaler ESG disclosures)
Embodied Carbon: kg CO₂e per unit (source: lifecycle assessment studies)
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, List


class Rating(str, Enum):
    BEST = "Best"
    LOW = "Low"
    MED = "Med"


class CarbonLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass(frozen=True)
class GPUSpec:
    """Specifications for a GPU model used in footprint calculations."""
    id: str
    name: str
    power_w: float               # Thermal Design Power (watts)
    embodied_carbon_kg: float    # Cradle-to-gate CO₂e (kg)
    lifetime_hours: float = 87_600.0  # 10-year rated lifetime


@dataclass(frozen=True)
class RegionData:
    """Environmental characteristics of a cloud / data-center region."""
    id: str
    name: str
    display_name: str
    provider: str
    country: str
    grid_intensity_g_co2: float   # gCO₂/kWh
    wue_liters_per_kwh: float     # Water Usage Effectiveness
    pue: float                    # Power Usage Effectiveness
    rating: Rating
    level: CarbonLevel
    is_indian: bool = False


# ---------------------------------------------------------------------------
# GPU catalogue
# ---------------------------------------------------------------------------
GPU_CATALOG: Dict[str, GPUSpec] = {
    "h100-sxm": GPUSpec(
        id="h100-sxm", name="H100 SXM5 — 700W",
        power_w=700, embodied_carbon_kg=150
    ),
    "h100-pcie": GPUSpec(
        id="h100-pcie", name="H100 PCIe — 350W",
        power_w=350, embodied_carbon_kg=120
    ),
    "a100-sxm": GPUSpec(
        id="a100-sxm", name="A100 SXM4 — 400W",
        power_w=400, embodied_carbon_kg=100
    ),
    "a100-pcie": GPUSpec(
        id="a100-pcie", name="A100 PCIe — 300W",
        power_w=300, embodied_carbon_kg=80
    ),
    "v100": GPUSpec(
        id="v100", name="V100 SXM2 — 300W",
        power_w=300, embodied_carbon_kg=70
    ),
    "a10g": GPUSpec(
        id="a10g", name="A10G — 150W",
        power_w=150, embodied_carbon_kg=40
    ),
    "t4": GPUSpec(
        id="t4", name="T4 — 70W",
        power_w=70, embodied_carbon_kg=25
    ),
}

# ---------------------------------------------------------------------------
# Region catalogue — Indian regions listed first (primary focus)
# ---------------------------------------------------------------------------
REGION_CATALOG: Dict[str, RegionData] = {
    # ── Indian Regions ──────────────────────────────────────────────────────
    "gcp-asia-south2": RegionData(
        id="gcp-asia-south2", name="gcp-asia-south2",
        display_name="Chennai (GCP asia-south2)",
        provider="GCP", country="India",
        grid_intensity_g_co2=600, wue_liters_per_kwh=1.5, pue=1.40,
        rating=Rating.BEST, level=CarbonLevel.MEDIUM, is_indian=True,
    ),
    "gcp-asia-south1": RegionData(
        id="gcp-asia-south1", name="gcp-asia-south1",
        display_name="Bengaluru (GCP asia-south1)",
        provider="GCP", country="India",
        grid_intensity_g_co2=650, wue_liters_per_kwh=1.4, pue=1.40,
        rating=Rating.BEST, level=CarbonLevel.MEDIUM, is_indian=True,
    ),
    "azure-south-india": RegionData(
        id="azure-south-india", name="azure-south-india",
        display_name="Hyderabad (Azure South India)",
        provider="Azure", country="India",
        grid_intensity_g_co2=700, wue_liters_per_kwh=1.5, pue=1.45,
        rating=Rating.MED, level=CarbonLevel.MEDIUM, is_indian=True,
    ),
    "aws-ap-south-1": RegionData(
        id="aws-ap-south-1", name="aws-ap-south-1",
        display_name="Mumbai (AWS ap-south-1)",
        provider="AWS", country="India",
        grid_intensity_g_co2=750, wue_liters_per_kwh=1.8, pue=1.50,
        rating=Rating.MED, level=CarbonLevel.MEDIUM, is_indian=True,
    ),
    "azure-central-india": RegionData(
        id="azure-central-india", name="azure-central-india",
        display_name="Pune (Azure Central India)",
        provider="Azure", country="India",
        grid_intensity_g_co2=780, wue_liters_per_kwh=1.6, pue=1.45,
        rating=Rating.MED, level=CarbonLevel.MEDIUM, is_indian=True,
    ),
    "delhi-ncr": RegionData(
        id="delhi-ncr", name="delhi-ncr",
        display_name="Delhi NCR (Various)",
        provider="Various", country="India",
        grid_intensity_g_co2=850, wue_liters_per_kwh=2.0, pue=1.60,
        rating=Rating.LOW, level=CarbonLevel.HIGH, is_indian=True,
    ),
    # ── Global Comparison Regions ────────────────────────────────────────────
    "gcp-europe-north1": RegionData(
        id="gcp-europe-north1", name="gcp-europe-north1",
        display_name="Finland (GCP europe-north1)",
        provider="GCP", country="Finland",
        grid_intensity_g_co2=26, wue_liters_per_kwh=0.2, pue=1.10,
        rating=Rating.BEST, level=CarbonLevel.LOW,
    ),
    "aws-eu-north-1": RegionData(
        id="aws-eu-north-1", name="aws-eu-north-1",
        display_name="Stockholm (AWS eu-north-1)",
        provider="AWS", country="Sweden",
        grid_intensity_g_co2=45, wue_liters_per_kwh=0.3, pue=1.15,
        rating=Rating.BEST, level=CarbonLevel.LOW,
    ),
    "aws-eu-west-3": RegionData(
        id="aws-eu-west-3", name="aws-eu-west-3",
        display_name="Paris (AWS eu-west-3)",
        provider="AWS", country="France",
        grid_intensity_g_co2=85, wue_liters_per_kwh=0.4, pue=1.20,
        rating=Rating.LOW, level=CarbonLevel.LOW,
    ),
    "aws-us-west-2": RegionData(
        id="aws-us-west-2", name="aws-us-west-2",
        display_name="Oregon (AWS us-west-2)",
        provider="AWS", country="USA",
        grid_intensity_g_co2=118, wue_liters_per_kwh=0.5, pue=1.15,
        rating=Rating.LOW, level=CarbonLevel.LOW,
    ),
    "aws-us-east-1": RegionData(
        id="aws-us-east-1", name="aws-us-east-1",
        display_name="Virginia (AWS us-east-1)",
        provider="AWS", country="USA",
        grid_intensity_g_co2=320, wue_liters_per_kwh=1.8, pue=1.20,
        rating=Rating.LOW, level=CarbonLevel.MEDIUM,
    ),
    "gcp-us-central1": RegionData(
        id="gcp-us-central1", name="gcp-us-central1",
        display_name="Iowa (GCP us-central1)",
        provider="GCP", country="USA",
        grid_intensity_g_co2=380, wue_liters_per_kwh=1.1, pue=1.11,
        rating=Rating.MED, level=CarbonLevel.MEDIUM,
    ),
}

# Convenience lists
ALL_GPUS: List[GPUSpec] = list(GPU_CATALOG.values())
ALL_REGIONS: List[RegionData] = list(REGION_CATALOG.values())
INDIAN_REGIONS: List[RegionData] = [r for r in ALL_REGIONS if r.is_indian]
