// ─────────────────────────────────────────────────────────────────────────────
// BharatGreen AI — Agentic Auto-Optimizer (client engine)
//
// An autonomous, multi-step optimizer. Given a workload + an objective
// (minimize carbon / cost / a blend), it searches the FULL space of
//
//     region  ×  GPU model  ×  launch hour (carbon-aware schedule)
//
// scoring every combination with the same footprint engine the rest of the app
// uses, then returns one concrete migration plan such as:
//
//     "Mumbai → Chennai, A100 → H100, run 03:00 IST  =  −47% carbon"
//
// Everything runs client-side so the demo works offline; the backend
// (/agent/auto-optimize, /agent/parse-workload) layers a Nemotron narrative on
// top when an NVIDIA key is present.
// ─────────────────────────────────────────────────────────────────────────────

import { WorkloadInput } from "./types";
import { GPU_SPECS, REGIONS, getGPU, getRegion } from "./regionalData";
import { calculateFootprint, carbonCostINR } from "./calculations";

// ── Extra GPU/region economics (kept here to avoid widening shared types) ─────
// Relative throughput vs A100 SXM4 (=1.0): a faster GPU finishes the same job in
// fewer wall-clock hours, so total energy can drop even when its TDP is higher.
export const GPU_PERF: Record<string, number> = {
  "h100-sxm": 2.6, "h100-pcie": 1.7, "a100-sxm": 1.0, "a100-pcie": 0.85,
  v100: 0.42, a10g: 0.35, t4: 0.18,
};
// On-demand cloud price, USD per GPU-hour (approx).
export const GPU_PRICE_USD: Record<string, number> = {
  "h100-sxm": 3.2, "h100-pcie": 2.4, "a100-sxm": 1.6, "a100-pcie": 1.2,
  v100: 0.8, a10g: 0.55, t4: 0.35,
};
// Regional compute price multiplier vs global baseline (1.0).
const REGION_PRICE_MULT: Record<string, number> = {
  "gcp-asia-south2": 0.92, "gcp-asia-south1": 0.93, "azure-south-india": 0.94,
  "aws-ap-south-1": 0.95, "azure-central-india": 0.94, "delhi-ncr": 0.9,
  "gcp-europe-north1": 1.12, "aws-eu-north-1": 1.1, "aws-eu-west-3": 1.15,
  "aws-us-west-2": 1.0, "aws-us-east-1": 1.0, "gcp-us-central1": 1.0,
};

// India-grid 24-hour intensity multiplier (index = IST hour). Cleanest ~4 AM.
export const HOUR_CURVE = [
  0.72, 0.68, 0.65, 0.63, 0.62, 0.64, 0.71, 0.84,
  0.95, 1.05, 1.10, 1.08, 1.04, 1.02, 1.00, 0.97,
  0.96, 0.98, 1.06, 1.12, 1.08, 0.98, 0.88, 0.78,
];

export const USD_TO_INR = 83;

function gpuPerf(id: string): number { return GPU_PERF[id] ?? 1.0; }
function gpuPriceUSD(id: string): number { return GPU_PRICE_USD[id] ?? 1.5; }
function regionPriceMult(id: string): number { return REGION_PRICE_MULT[id] ?? 1.0; }

export function bestGridHour(): { hour: number; mult: number } {
  let hour = 0;
  for (let h = 1; h < 24; h++) if (HOUR_CURVE[h] < HOUR_CURVE[hour]) hour = h;
  return { hour, mult: HOUR_CURVE[hour] };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

// ── A single evaluated configuration ─────────────────────────────────────────
export interface PlanMetrics {
  gpuType: string;
  gpuName: string;
  region: string;
  regionName: string;
  numGPUs: number;
  durationHours: number;   // effective wall-clock hours (scaled by GPU speed)
  bestHourIST: number;     // -1 if no time-shift applied
  energyKWh: number;
  carbonKgCO2e: number;    // total (operational + embodied), schedule-adjusted
  waterLiters: number;
  costUSD: number;
}

export interface OptimizerPlan {
  label: string;
  metrics: PlanMetrics;
  carbonSavingsKg: number;
  carbonSavingsPct: number;
  waterSavingsLiters: number;
  costDeltaUSD: number;     // negative = cheaper than baseline
  actions: string[];
  recommended: boolean;
}

export interface AgentStep { thought: string; action: string; observation: string; }

export interface AutoOptimizeResult {
  baseline: PlanMetrics;
  recommended: OptimizerPlan;
  carbonOptimal: OptimizerPlan;
  costOptimal: OptimizerPlan;
  candidates: OptimizerPlan[];
  steps: AgentStep[];
  summary: string;
  combosEvaluated: number;
  source: "nemotron" | "local";
  costWeight: number;
}

export interface OptimizeOptions {
  costWeight?: number;       // 0 = carbon only, 1 = cost only
  allowGpuSwap?: boolean;
  allowRegionShift?: boolean;
  allowTimeShift?: boolean;
}

// ── Core evaluation of one (region, gpu, schedule) combination ───────────────
export function evaluateCombo(
  base: WorkloadInput,
  regionId: string,
  gpuId: string,
  timeShift: boolean,
): PlanMetrics {
  const region = getRegion(regionId);
  const gpu = getGPU(gpuId);
  const perfRatio = gpuPerf(base.gpuType) / gpuPerf(gpuId);
  const effHours = Math.max(0.1, round2(base.durationHours * perfRatio));

  const comboInput: WorkloadInput = {
    ...base, region: regionId, gpuType: gpuId, durationHours: effHours,
  };

  const { hour: bh, mult } = bestGridHour();
  const intensity = timeShift ? region.gridIntensityGCO2 * mult : undefined;
  const fp = calculateFootprint(comboInput, intensity);

  const costUSD = round2(
    gpuPriceUSD(gpuId) * base.numGPUs * effHours * regionPriceMult(regionId)
  );

  return {
    gpuType: gpuId,
    gpuName: gpu.name,
    region: regionId,
    regionName: region.displayName,
    numGPUs: base.numGPUs,
    durationHours: effHours,
    bestHourIST: timeShift ? bh : -1,
    energyKWh: fp.energyKWh,
    carbonKgCO2e: fp.totalCarbonKgCO2e,
    waterLiters: fp.waterLiters,
    costUSD,
  };
}

function shortRegion(name: string) { return name.split(" (")[0]; }
function shortGPU(name: string) { return name.split(" —")[0]; }

function buildPlan(base: PlanMetrics, cand: PlanMetrics, orig: WorkloadInput): OptimizerPlan {
  const carbonSavings = round2(base.carbonKgCO2e - cand.carbonKgCO2e);
  const carbonPct = base.carbonKgCO2e > 0
    ? round1((carbonSavings / base.carbonKgCO2e) * 100) : 0;
  const waterSavings = round1(base.waterLiters - cand.waterLiters);
  const costDelta = round2(cand.costUSD - base.costUSD);

  const actions: string[] = [];
  const labelParts: string[] = [];
  if (cand.region !== orig.region) {
    actions.push(`Migrate region: ${shortRegion(base.regionName)} → ${shortRegion(cand.regionName)}`);
    labelParts.push(`${shortRegion(base.regionName)} → ${shortRegion(cand.regionName)}`);
  }
  if (cand.gpuType !== orig.gpuType) {
    actions.push(`Switch GPU: ${shortGPU(base.gpuName)} → ${shortGPU(cand.gpuName)}`);
    labelParts.push(`${shortGPU(base.gpuName)} → ${shortGPU(cand.gpuName)}`);
  }
  if (cand.bestHourIST >= 0) {
    const hh = String(cand.bestHourIST).padStart(2, "0");
    actions.push(`Time-shift launch to ${hh}:00 IST (grid trough)`);
    labelParts.push(`run ${hh}:00 IST`);
  }
  if (actions.length === 0) {
    actions.push("Keep current configuration (already optimal)");
    labelParts.push("No change needed");
  }

  return {
    label: labelParts.join(", "),
    metrics: cand,
    carbonSavingsKg: Math.max(0, carbonSavings),
    carbonSavingsPct: Math.max(0, carbonPct),
    waterSavingsLiters: Math.max(0, waterSavings),
    costDeltaUSD: costDelta,
    actions,
    recommended: false,
  };
}

function normalize(vals: number[]): number[] {
  const lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 1e-9) return vals.map(() => 0);
  return vals.map((v) => (v - lo) / (hi - lo));
}

// ── The agentic search (deterministic, runs offline) ─────────────────────────
export function searchPlans(base: WorkloadInput, opts: OptimizeOptions = {}): AutoOptimizeResult {
  const costWeight = clamp01(opts.costWeight ?? 0);
  const allowGpu = opts.allowGpuSwap ?? true;
  const allowRegion = opts.allowRegionShift ?? true;
  const allowTime = opts.allowTimeShift ?? true;

  const baseline = evaluateCombo(base, base.region, base.gpuType, false);

  const regions = allowRegion ? REGIONS.map((r) => r.id) : [base.region];
  const gpus = allowGpu ? GPU_SPECS.map((g) => g.id) : [base.gpuType];

  const plans: OptimizerPlan[] = [];
  let combos = 0;
  for (const rid of regions) {
    for (const gid of gpus) {
      combos++;
      const cand = evaluateCombo(base, rid, gid, allowTime);
      plans.push(buildPlan(baseline, cand, base));
    }
  }

  const carbonOptimal = plans.reduce((a, b) => (a.metrics.carbonKgCO2e <= b.metrics.carbonKgCO2e ? a : b));
  const costOptimal = plans.reduce((a, b) => (a.metrics.costUSD <= b.metrics.costUSD ? a : b));

  const nCarbon = normalize(plans.map((p) => p.metrics.carbonKgCO2e));
  const nCost = normalize(plans.map((p) => p.metrics.costUSD));
  const scores = plans.map((_, i) => costWeight * nCost[i] + (1 - costWeight) * nCarbon[i]);
  let recIdx = 0;
  for (let i = 1; i < plans.length; i++) if (scores[i] < scores[recIdx]) recIdx = i;
  const recommended = plans[recIdx];
  recommended.recommended = true;

  const ranked = [...plans].sort((a, b) => b.carbonSavingsKg - a.carbonSavingsKg);
  const candidates = [recommended, ...ranked.filter((p) => p !== recommended)].slice(0, 7);

  const steps = buildSteps(baseline, recommended, carbonOptimal, combos);
  const summary = buildSummary(baseline, recommended);

  return {
    baseline, recommended, carbonOptimal, costOptimal, candidates,
    steps, summary, combosEvaluated: combos, source: "local", costWeight,
  };
}

function buildSteps(
  base: PlanMetrics, rec: OptimizerPlan, carbonOpt: OptimizerPlan, combos: number,
): AgentStep[] {
  return [
    {
      thought: "Establish the baseline footprint of the workload as configured.",
      action: "calculate_footprint",
      observation: `${base.numGPUs}× ${shortGPU(base.gpuName)} in ${shortRegion(base.regionName)} → ` +
        `${base.carbonKgCO2e} kg CO₂e, ${base.waterLiters} L water, $${base.costUSD}.`,
    },
    {
      thought: "Enumerate every region × GPU × launch-hour combination and score each.",
      action: "search_configuration_space",
      observation: `Evaluated ${combos} configurations across ${REGIONS.length} regions and ${GPU_SPECS.length} GPU models.`,
    },
    {
      thought: "Find the greenest reachable configuration.",
      action: "rank_by_carbon",
      observation: `Lowest-carbon plan: ${carbonOpt.label} → ${carbonOpt.metrics.carbonKgCO2e} kg CO₂e (−${carbonOpt.carbonSavingsPct}%).`,
    },
    {
      thought: "Balance the objective (carbon vs cost) and commit to a final plan.",
      action: "select_plan",
      observation: `Recommended: ${rec.label} → −${rec.carbonSavingsPct}% carbon, cost delta $${rec.costDeltaUSD}.`,
    },
  ];
}

function buildSummary(base: PlanMetrics, rec: OptimizerPlan): string {
  const m = rec.metrics;
  const annual = round1(rec.carbonSavingsKg * 52);
  const costPhrase = rec.costDeltaUSD < 0
    ? `saves $${Math.abs(rec.costDeltaUSD).toLocaleString()}`
    : `adds $${rec.costDeltaUSD.toLocaleString()}`;
  const hh = m.bestHourIST >= 0 ? `${String(m.bestHourIST).padStart(2, "0")}:00 IST` : "current schedule";
  return [
    `Your workload (${base.numGPUs}× ${shortGPU(base.gpuName)} in ${shortRegion(base.regionName)}) ` +
    `currently emits ${base.carbonKgCO2e} kg CO₂e and uses ${base.waterLiters} L of cooling water per run.`,
    ``,
    `Recommended plan: ${rec.label}`,
    `• Carbon: ${base.carbonKgCO2e} → ${m.carbonKgCO2e} kg CO₂e  (−${rec.carbonSavingsPct}%)`,
    `• Water:  saves ${rec.waterSavingsLiters} L per run`,
    `• Cost:   ${costPhrase} per run (now $${m.costUSD})`,
    `• Launch at ${hh} when the grid is cleanest.`,
    ``,
    `At weekly cadence this avoids ~${annual} kg CO₂e/year ` +
    `(≈ ${round1(annual / 21.77)} trees' annual absorption).`,
  ].join("\n");
}

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }

// ── Backend (Nemotron) narration with offline fallback ───────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Runs the local search instantly, then (best-effort) asks the backend for a
 * Nemotron-written narrative. The plan numbers are always the local ones so the
 * UI is instant and consistent; only the prose `summary`/`source` may upgrade.
 */
export async function autoOptimize(
  base: WorkloadInput, opts: OptimizeOptions = {},
): Promise<AutoOptimizeResult> {
  const local = searchPlans(base, opts);
  try {
    const res = await fetch(`${API_URL}/agent/auto-optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workload: toBackendWorkload(base),
        objective: (opts.costWeight ?? 0) <= 0 ? "carbon" : "balanced",
        cost_weight: opts.costWeight ?? 0,
        allow_gpu_swap: opts.allowGpuSwap ?? true,
        allow_region_shift: opts.allowRegionShift ?? true,
        allow_time_shift: opts.allowTimeShift ?? true,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data?.summary) {
      return {
        ...local,
        summary: data.summary,
        source: data.source === "nemotron" ? "nemotron" : "local",
      };
    }
  } catch {
    /* backend unreachable — local result already complete */
  }
  return local;
}

// ── Natural-language → structured workload (feature 3) ────────────────────────
const GPU_ALIASES: [RegExp, string][] = [
  [/h100\s*sxm/i, "h100-sxm"], [/h100\s*pcie/i, "h100-pcie"], [/h100/i, "h100-sxm"],
  [/a100\s*sxm/i, "a100-sxm"], [/a100\s*pcie/i, "a100-pcie"], [/a100/i, "a100-sxm"],
  [/v100/i, "v100"], [/a10g?/i, "a10g"], [/\bt4\b/i, "t4"],
];
const REGION_ALIASES: [RegExp, string][] = [
  [/mumbai|ap-south-1/i, "aws-ap-south-1"], [/chennai|asia-south2/i, "gcp-asia-south2"],
  [/bengaluru|bangalore|asia-south1/i, "gcp-asia-south1"], [/hyderabad|south\s*india/i, "azure-south-india"],
  [/pune|central\s*india/i, "azure-central-india"], [/delhi|ncr|gurgaon|noida/i, "delhi-ncr"],
  [/finland|europe-north1/i, "gcp-europe-north1"], [/stockholm|sweden|eu-north-1/i, "aws-eu-north-1"],
  [/paris|france|eu-west-3/i, "aws-eu-west-3"], [/oregon|us-west-2/i, "aws-us-west-2"],
  [/virginia|us-east-1/i, "aws-us-east-1"], [/iowa|us-central1/i, "gcp-us-central1"],
];

export interface ParseResult { workload: WorkloadInput; fieldsFound: string[]; source: "nemotron" | "local"; }

export function localParse(text: string): ParseResult {
  const t = text.toLowerCase();
  const found: string[] = [];
  const w: WorkloadInput = {
    description: text.trim().slice(0, 2000),
    gpuType: "a100-sxm", numGPUs: 8, region: "aws-ap-south-1",
    durationHours: 24, utilizationPct: 90,
  };

  for (const [re, id] of GPU_ALIASES) if (re.test(t)) { w.gpuType = id; found.push("gpuType"); break; }
  for (const [re, id] of REGION_ALIASES) if (re.test(t)) { w.region = id; found.push("region"); break; }

  let m = t.match(/(\d[\d,]*)\s*(?:x\s*)?(?:gpus?|h100|a100|v100|a10g?|t4)\b/);
  if (!m) m = t.match(/(?:x|×)\s*(\d[\d,]*)/);
  if (m) { w.numGPUs = Math.max(1, Math.min(10000, parseInt(m[1].replace(/,/g, ""), 10))); found.push("numGPUs"); }

  let dur: number | null = null;
  const md = t.match(/(\d+(?:\.\d+)?)\s*(days?|d)\b/);
  if (md) dur = parseFloat(md[1]) * 24;
  if (dur === null) { const mh = t.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h)\b/); if (mh) dur = parseFloat(mh[1]); }
  if (dur === null) { const mw = t.match(/(\d+(?:\.\d+)?)\s*(weeks?|w)\b/); if (mw) dur = parseFloat(mw[1]) * 168; }
  if (dur !== null) { w.durationHours = Math.max(0.1, Math.min(8760, round2(dur))); found.push("durationHours"); }

  const mu = t.match(/(\d+(?:\.\d+)?)\s*%/);
  if (mu) { w.utilizationPct = Math.max(1, Math.min(100, parseFloat(mu[1]))); found.push("utilizationPct"); }

  return { workload: w, fieldsFound: found, source: "local" };
}

export async function parseWorkload(text: string): Promise<ParseResult> {
  try {
    const res = await fetch(`${API_URL}/agent/parse-workload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const bw = data.workload;
    return {
      workload: {
        description: bw.description ?? text,
        gpuType: bw.gpu_type, numGPUs: bw.num_gpus, region: bw.region,
        durationHours: bw.duration_hours, utilizationPct: bw.utilization_pct,
      },
      fieldsFound: Array.isArray(data.fields_found) ? data.fields_found : [],
      source: data.source === "nemotron" ? "nemotron" : "local",
    };
  } catch {
    return localParse(text);
  }
}

// ── Cost ↔ carbon helpers (feature 5) ────────────────────────────────────────
export function costINR(usd: number): number { return Math.round(usd * USD_TO_INR); }
export { carbonCostINR };

// ── 24-hour time-shift forecast for a region (feature 2) ─────────────────────
export interface ForecastPoint { hour: number; intensity: number; }
export function buildForecast(regionId: string, liveBaseIntensity?: number): ForecastPoint[] {
  const region = getRegion(regionId);
  const base = liveBaseIntensity ?? region.gridIntensityGCO2;
  return HOUR_CURVE.map((m, h) => ({ hour: h, intensity: Math.round(base * m) }));
}

function toBackendWorkload(w: WorkloadInput) {
  return {
    description: w.description, gpu_type: w.gpuType, num_gpus: w.numGPUs,
    region: w.region, duration_hours: w.durationHours, utilization_pct: w.utilizationPct,
  };
}

// ── Shareable report (feature 4) ─────────────────────────────────────────────
export function buildReportHTML(input: WorkloadInput, result: AutoOptimizeResult): string {
  const b = result.baseline;
  const r = result.recommended;
  const m = r.metrics;
  const now = new Date().toLocaleString();
  const rows = result.candidates.map((p, i) => `
    <tr style="${p.recommended ? "background:#ecfdf5;font-weight:600" : ""}">
      <td>${i + 1}${p.recommended ? " ★" : ""}</td>
      <td>${esc(p.label)}</td>
      <td>${p.metrics.carbonKgCO2e}</td>
      <td>−${p.carbonSavingsPct}%</td>
      <td>${p.metrics.waterLiters}</td>
      <td>$${p.metrics.costUSD}</td>
    </tr>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <title>BharatGreen AI — Optimization Report</title>
  <style>
    body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;margin:40px;max-width:860px}
    h1{font-size:22px;margin:0} .sub{color:#666;font-size:12px;margin-top:4px}
    .badge{display:inline-block;background:#059669;color:#fff;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}
    .card{border:1px solid #e5e7eb;border-radius:10px;padding:12px}
    .card .k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#888}
    .card .v{font-size:20px;font-weight:800;margin-top:4px}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
    th,td{border-bottom:1px solid #eee;text-align:left;padding:6px 8px}
    th{font-size:10px;text-transform:uppercase;color:#888}
    .plan{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;margin:16px 0}
    .foot{color:#999;font-size:10px;margin-top:24px;border-top:1px solid #eee;padding-top:10px}
    ul{margin:6px 0 0 18px;padding:0}
  </style></head><body>
  <h1>🌱 BharatGreen AI — Autonomous Optimization Report</h1>
  <div class="sub">Generated ${esc(now)} · Powered by NVIDIA Nemotron${result.source === "nemotron" ? "" : " (offline engine)"} · ${result.combosEvaluated} configurations evaluated</div>
  <div class="grid">
    <div class="card"><div class="k">Carbon saved</div><div class="v" style="color:#059669">−${r.carbonSavingsPct}%</div><div class="sub">${r.carbonSavingsKg} kg CO₂e / run</div></div>
    <div class="card"><div class="k">Water saved</div><div class="v" style="color:#2563eb">${r.waterSavingsLiters} L</div><div class="sub">per run</div></div>
    <div class="card"><div class="k">Cost delta</div><div class="v" style="color:${r.costDeltaUSD <= 0 ? "#059669" : "#dc2626"}">${r.costDeltaUSD <= 0 ? "−" : "+"}$${Math.abs(r.costDeltaUSD).toLocaleString()}</div><div class="sub">per run</div></div>
    <div class="card"><div class="k">New footprint</div><div class="v">${m.carbonKgCO2e}</div><div class="sub">kg CO₂e</div></div>
  </div>
  <div class="plan">
    <span class="badge">RECOMMENDED PLAN</span>
    <p style="font-size:16px;font-weight:700;margin:10px 0 6px">${esc(r.label)}</p>
    <ul>${r.actions.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
  </div>
  <p style="white-space:pre-wrap;font-size:13px;line-height:1.5">${esc(result.summary)}</p>
  <h3 style="font-size:14px;margin-top:24px">Top configurations evaluated</h3>
  <table><thead><tr><th>#</th><th>Plan</th><th>kg CO₂e</th><th>Carbon Δ</th><th>Water (L)</th><th>Cost</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="foot">Baseline: ${b.numGPUs}× ${esc(b.gpuName)} · ${esc(b.regionName)} · ${input.durationHours}h ·
  ${b.carbonKgCO2e} kg CO₂e · ${b.waterLiters} L · $${b.costUSD}.
  Estimates are indicative (grid intensity, WUE & cloud pricing vary by provider/region).</div>
  </body></html>`;
}

function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string
  ));
}

/** Open the report in a new tab and trigger the browser's print/save-as-PDF. */
export function openReportForPrint(input: WorkloadInput, result: AutoOptimizeResult): void {
  const html = buildReportHTML(input, result);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
}
