// ─────────────────────────────────────────────────────────────────────────────
// CarbonSense AI — Nemotron Agent Analysis Generator
//
// Produces a realistic ReAct-style analysis trace.
// When the backend is available it proxies through to Nemotron;
// otherwise the deterministic mock is used (fully functional for demo).
// ─────────────────────────────────────────────────────────────────────────────

import { WorkloadInput, CalculationResult } from "./types";
import { getGPU, getRegion, REGIONS } from "./regionalData";
import { getTopAlternatives } from "./calculations";

export function generateMockAnalysis(
  input: WorkloadInput,
  result: CalculationResult
): string {
  const gpu = getGPU(input.gpuType);
  const region = getRegion(input.region);
  const alternatives = getTopAlternatives(input, 2);
  const best = alternatives[0];

  const gpuShort = gpu.name.split("—")[0].trim(); // e.g. "H100 SXM5"

  const altName = best?.region.displayName ?? "a greener region";
  const altIntensity = best?.region.gridIntensityGCO2 ?? 0;
  const carbonSavings = best?.carbonSavings ?? 0;
  const waterSavings = best?.waterSavings ?? 0;
  const savingsPct = best?.savingsPct ?? 0;

  const k8sSnippet = `apiVersion: batch/v1
kind: Job
metadata:
  name: ai-training-carbon-optimized
  annotations:
    carbonsense.io/preferred-region: "${best?.region.name ?? region.name}"
    carbonsense.io/max-grid-intensity: "${altIntensity + 50}"
spec:
  template:
    spec:
      nodeSelector:
        cloud.provider/region: "${best?.region.name ?? region.name}"
      containers:
        - name: training
          image: nvcr.io/nvidia/pytorch:24.01-py3
          resources:
            limits:
              nvidia.com/gpu: "${input.numGPUs}"
      restartPolicy: OnFailure`;

  const terraformSnippet = `provider "${(best?.region.provider ?? region.provider).toLowerCase()}" {
  region = "${best?.region.name ?? region.name}"
}

resource "compute_instance" "carbonsense_training" {
  name         = "carbonsense-ai-training"
  region       = "${best?.region.name ?? region.name}"
  gpu_count    = ${input.numGPUs}
  gpu_type     = "${gpu.id}"

  labels = {
    carbon_optimized   = "true"
    managed_by         = "carbonsense-ai"
  }
}`;

  return `Thought: Analyzing the AI workload parameters to compute environmental impact.

Action: calculate_footprint
Action Input: {
  "gpu_count": ${input.numGPUs},
  "gpu_type": "${gpuShort}",
  "region": "${region.displayName}",
  "duration_hours": ${input.durationHours},
  "utilization_pct": ${input.utilizationPct}
}

Observation: {
  "energy_kwh": ${result.energyKWh},
  "carbon_kg_co2e": ${result.carbonKgCO2e},
  "embodied_carbon_kg": ${result.embodiedCarbonKg},
  "water_liters": ${result.waterLiters},
  "trees": ${result.treesOffset}
}

Thought: Now identifying greener migration targets across regions.

Action: find_greener_alternatives
Action Input: {
  "current_region": "${region.id}",
  "current_intensity_g_co2": ${region.gridIntensityGCO2},
  "gpu_count": ${input.numGPUs}
}

Observation: Best alternative: ${altName} at ${altIntensity} gCO₂/kWh.
Potential savings: ${carbonSavings} kg CO₂e and ${waterSavings} L water (${savingsPct}% reduction).

Thought: I now have enough information to provide a complete analysis.

Final Answer: Our ${input.numGPUs}× ${gpuShort} workload in ${region.displayName} for ${input.durationHours} hours has a carbon footprint of ${result.carbonKgCO2e} kg CO₂e, energy consumption of ${result.energyKWh} kWh, and water usage of ${result.waterLiters} liters. This amounts to ${result.treesOffset} trees being cut down every year.

To make this more sustainable, consider the following:

1. Region: Move from ${region.displayName} (${region.gridIntensityGCO2} gCO₂/kWh) to ${altName} (${altIntensity} gCO₂/kWh).
   → Saves ~${carbonSavings} kg CO₂e and ~${waterSavings} L water per run (${savingsPct}% reduction).

2. GPU: ${gpu.powerW >= 400 ? `Upgrade to H100 SXM5 for 2.5× better FLOPS/watt — same job in 40% of the time.` : `Current GPU efficiency is good. Maximise batch size to improve utilisation.`}

3. Scheduling: Use carbon-aware scheduling to target low-intensity grid windows.
   → Potential 15–25% carbon reduction at zero infrastructure cost.

4. Kubernetes Deployment (Carbon-Optimised):

\`\`\`yaml
${k8sSnippet}
\`\`\`

5. Terraform (Region Migration):

\`\`\`hcl
${terraformSnippet}
\`\`\`

6. Projected annual impact (if job runs weekly):
   → Carbon saved: ~${(carbonSavings * 52).toFixed(1)} kg CO₂e/year
   → Water saved:  ~${Math.round(waterSavings * 52)} L/year
   → Equivalent to planting ${(carbonSavings * 52 / 21.77).toFixed(1)} trees annually.`;
}

/** Calls the backend Nemotron endpoint; falls back to client-side mock. */
export async function fetchNemotronAnalysis(
  input: WorkloadInput,
  result: CalculationResult
): Promise<string> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

  try {
    const res = await fetch(`${apiUrl}/workloads/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: input.description,
        gpu_type: input.gpuType,
        num_gpus: input.numGPUs,
        region: input.region,
        duration_hours: input.durationHours,
        utilization_pct: input.utilizationPct,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.analysis_text ?? generateMockAnalysis(input, result);
  } catch {
    // Backend unreachable — use client-side mock (great for offline demo)
    return generateMockAnalysis(input, result);
  }
}
