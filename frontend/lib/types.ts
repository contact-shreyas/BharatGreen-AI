// ─────────────────────────────────────────────────────────────────────────────
// CarbonSense AI — Shared TypeScript Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GPUSpec {
  id: string;
  name: string;
  powerW: number;            // TDP in watts
  embodiedCarbonKg: number;  // cradle-to-gate kg CO₂e
  lifetimeHours: number;     // 10-year rated lifetime
}

export type Rating = "Best" | "Med" | "Low";
export type CarbonLevel = "low" | "medium" | "high";

export interface RegionData {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  country: string;
  gridIntensityGCO2: number;   // gCO₂/kWh
  wueLitersPerKWh: number;     // Water Usage Effectiveness
  pue: number;                  // Power Usage Effectiveness
  rating: Rating;
  level: CarbonLevel;
  isIndian?: boolean;
}

export interface WorkloadInput {
  description: string;
  gpuType: string;
  numGPUs: number;
  region: string;
  durationHours: number;
  utilizationPct: number;
}

export interface CalculationResult {
  energyKWh: number;
  carbonKgCO2e: number;        // operational carbon only (displayed in KPI card)
  embodiedCarbonKg: number;    // amortised manufacturing carbon
  totalCarbonKgCO2e: number;   // operational + embodied
  waterLiters: number;
  treesOffset: number;
}

export type AnalysisStatus = "idle" | "analyzing" | "done";

export interface DashboardState {
  input: WorkloadInput;
  result: CalculationResult | null;
  agentText: string;
  status: AnalysisStatus;
}
