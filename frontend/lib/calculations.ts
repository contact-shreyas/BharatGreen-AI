// ─────────────────────────────────────────────────────────────────────────────
// BharatGreen AI — Client-Side Calculation Engine
//
// Mirrors the backend Python logic exactly so the UI can update instantly
// without a network round-trip. Backend is called only for Nemotron analysis.
//
// Verified against reference values:
//   8× A100-SXM (400W) | Virginia (320 gCO₂/kWh) | 24h | 100% utilisation
//   → 76.8 kWh | 24.58 kg CO₂e | 138.2 L | 1.1 trees  ✓
// ─────────────────────────────────────────────────────────────────────────────

import { WorkloadInput, CalculationResult, RegionData } from "./types";
import { GPU_SPECS, REGIONS, getGPU, getRegion } from "./regionalData";

/** One tree absorbs ~21.77 kg CO₂ per year (USDA Forest Service). */
const TREE_ABSORPTION_KG = 21.77;

/**
 * Core dual-metric calculation.
 *
 * Energy   = GPU_count × Power_W × Utilisation × Hours / 1000  (kWh)
 * Carbon   = Energy × Grid_Intensity_gCO₂ / 1000              (kg CO₂e)
 * Embodied = GPU_embodied_kg × count × hours / lifetime_h      (kg CO₂e)
 * Water    = Energy × WUE                                       (litres)
 * Trees    = Total_Carbon / 21.77
 */
export function calculateFootprint(input: WorkloadInput): CalculationResult {
  const gpu = getGPU(input.gpuType);
  const region = getRegion(input.region);
  const util = input.utilizationPct / 100;

  // Energy (kWh) — raw GPU cluster energy
  const energyKWh = (input.numGPUs * gpu.powerW * util * input.durationHours) / 1000;

  // Operational carbon (kg CO₂e)
  const carbonKgCO2e = (energyKWh * region.gridIntensityGCO2) / 1000;

  // Embodied carbon amortised over GPU lifetime (kg CO₂e)
  const embodiedCarbonKg =
    (gpu.embodiedCarbonKg * input.numGPUs * input.durationHours) / gpu.lifetimeHours;

  const totalCarbonKgCO2e = carbonKgCO2e + embodiedCarbonKg;

  // Water (litres)
  const waterLiters = energyKWh * region.wueLitersPerKWh;

  // Trees to offset total emissions
  const treesOffset = totalCarbonKgCO2e / TREE_ABSORPTION_KG;

  return {
    energyKWh:        round2(energyKWh),
    carbonKgCO2e:     round2(carbonKgCO2e),
    embodiedCarbonKg: round3(embodiedCarbonKg),
    totalCarbonKgCO2e: round2(totalCarbonKgCO2e),
    waterLiters:      round1(waterLiters),
    treesOffset:      round1(treesOffset),
  };
}

/** What-If: returns carbon & water savings by switching to a target region. */
export function whatIfScenario(
  input: WorkloadInput,
  targetRegionId: string
): { carbonSavings: number; waterSavings: number; savingsPct: number } {
  const original = calculateFootprint(input);
  const altInput = { ...input, region: targetRegionId };
  const alt = calculateFootprint(altInput);

  const carbonSavings = round2(original.carbonKgCO2e - alt.carbonKgCO2e);
  const waterSavings = round1(original.waterLiters - alt.waterLiters);
  const savingsPct = round1(
    original.carbonKgCO2e > 0
      ? (carbonSavings / original.carbonKgCO2e) * 100
      : 0
  );
  return { carbonSavings, waterSavings, savingsPct };
}

/** Top N greener alternatives sorted by carbon savings. */
export function getTopAlternatives(
  input: WorkloadInput,
  topN = 3
): Array<{ region: RegionData; carbonSavings: number; waterSavings: number; savingsPct: number }> {
  const currentRegion = getRegion(input.region);

  return REGIONS
    .filter((r) => r.id !== input.region && r.gridIntensityGCO2 < currentRegion.gridIntensityGCO2)
    .map((r) => {
      const s = whatIfScenario(input, r.id);
      return { region: r, ...s };
    })
    .sort((a, b) => b.carbonSavings - a.carbonSavings)
    .slice(0, topN);
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;
