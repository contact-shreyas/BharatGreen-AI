// ─────────────────────────────────────────────────────────────────────────────
// BharatGreen AI — Static Regional & GPU Data (Frontend Mirror)
// Matches the backend catalogue; used for instant client-side calculations.
// ─────────────────────────────────────────────────────────────────────────────

import { GPUSpec, RegionData } from "./types";

export const GPU_SPECS: GPUSpec[] = [
  { id: "h100-sxm",  name: "H100 SXM5 — 700W",  powerW: 700, embodiedCarbonKg: 150, lifetimeHours: 87600 },
  { id: "h100-pcie", name: "H100 PCIe — 350W",   powerW: 350, embodiedCarbonKg: 120, lifetimeHours: 87600 },
  { id: "a100-sxm",  name: "A100 SXM4 — 400W",   powerW: 400, embodiedCarbonKg: 100, lifetimeHours: 87600 },
  { id: "a100-pcie", name: "A100 PCIe — 300W",    powerW: 300, embodiedCarbonKg: 80,  lifetimeHours: 87600 },
  { id: "v100",      name: "V100 SXM2 — 300W",    powerW: 300, embodiedCarbonKg: 70,  lifetimeHours: 87600 },
  { id: "a10g",      name: "A10G — 150W",          powerW: 150, embodiedCarbonKg: 40,  lifetimeHours: 87600 },
  { id: "t4",        name: "T4 — 70W",             powerW: 70,  embodiedCarbonKg: 25,  lifetimeHours: 87600 },
];

// ---------------------------------------------------------------------------
// Regions — Indian first (primary focus), then global comparison
// WUE for Virginia = 1.8 L/kWh is intentional to match reference calculations.
// ---------------------------------------------------------------------------
export const REGIONS: RegionData[] = [
  // ── Indian ──────────────────────────────────────────────────────────────
  {
    id: "gcp-asia-south2",
    name: "gcp-asia-south2",
    displayName: "Chennai (GCP asia-south2)",
    provider: "GCP", country: "India",
    gridIntensityGCO2: 600, wueLitersPerKWh: 1.5, pue: 1.40,
    rating: "Best", level: "medium", isIndian: true,
  },
  {
    id: "gcp-asia-south1",
    name: "gcp-asia-south1",
    displayName: "Bengaluru (GCP asia-south1)",
    provider: "GCP", country: "India",
    gridIntensityGCO2: 650, wueLitersPerKWh: 1.4, pue: 1.40,
    rating: "Best", level: "medium", isIndian: true,
  },
  {
    id: "azure-south-india",
    name: "azure-south-india",
    displayName: "Hyderabad (Azure South India)",
    provider: "Azure", country: "India",
    gridIntensityGCO2: 700, wueLitersPerKWh: 1.5, pue: 1.45,
    rating: "Med", level: "medium", isIndian: true,
  },
  {
    id: "aws-ap-south-1",
    name: "aws-ap-south-1",
    displayName: "Mumbai (AWS ap-south-1)",
    provider: "AWS", country: "India",
    gridIntensityGCO2: 750, wueLitersPerKWh: 1.8, pue: 1.50,
    rating: "Med", level: "medium", isIndian: true,
  },
  {
    id: "azure-central-india",
    name: "azure-central-india",
    displayName: "Pune (Azure Central India)",
    provider: "Azure", country: "India",
    gridIntensityGCO2: 780, wueLitersPerKWh: 1.6, pue: 1.45,
    rating: "Med", level: "medium", isIndian: true,
  },
  {
    id: "delhi-ncr",
    name: "delhi-ncr",
    displayName: "Delhi NCR (Various)",
    provider: "Various", country: "India",
    gridIntensityGCO2: 850, wueLitersPerKWh: 2.0, pue: 1.60,
    rating: "Low", level: "high", isIndian: true,
  },
  // ── Global Comparison ───────────────────────────────────────────────────
  {
    id: "gcp-europe-north1",
    name: "gcp-europe-north1",
    displayName: "Finland (GCP europe-north1)",
    provider: "GCP", country: "Finland",
    gridIntensityGCO2: 26, wueLitersPerKWh: 0.2, pue: 1.10,
    rating: "Best", level: "low",
  },
  {
    id: "aws-eu-north-1",
    name: "aws-eu-north-1",
    displayName: "Stockholm (AWS eu-north-1)",
    provider: "AWS", country: "Sweden",
    gridIntensityGCO2: 45, wueLitersPerKWh: 0.3, pue: 1.15,
    rating: "Best", level: "low",
  },
  {
    id: "aws-eu-west-3",
    name: "aws-eu-west-3",
    displayName: "Paris (AWS eu-west-3)",
    provider: "AWS", country: "France",
    gridIntensityGCO2: 85, wueLitersPerKWh: 0.4, pue: 1.20,
    rating: "Best", level: "low",
  },
  {
    id: "aws-us-west-2",
    name: "aws-us-west-2",
    displayName: "Oregon (AWS us-west-2)",
    provider: "AWS", country: "USA",
    gridIntensityGCO2: 118, wueLitersPerKWh: 0.5, pue: 1.15,
    rating: "Best", level: "low",
  },
  {
    id: "aws-us-east-1",
    name: "aws-us-east-1",
    displayName: "Virginia (AWS us-east-1)",
    provider: "AWS", country: "USA",
    gridIntensityGCO2: 320, wueLitersPerKWh: 1.8, pue: 1.20,
    rating: "Med", level: "medium",
  },
  {
    id: "gcp-us-central1",
    name: "gcp-us-central1",
    displayName: "Iowa (GCP us-central1)",
    provider: "GCP", country: "USA",
    gridIntensityGCO2: 380, wueLitersPerKWh: 1.1, pue: 1.11,
    rating: "Med", level: "medium",
  },
];

export function getGPU(id: string): GPUSpec {
  return GPU_SPECS.find((g) => g.id === id) ?? GPU_SPECS[2]; // default A100-SXM
}

export function getRegion(id: string): RegionData {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[3]; // default Mumbai
}
