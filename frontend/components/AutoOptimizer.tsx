"use client";
// ─────────────────────────────────────────────────────────────────────────────
// BharatGreen AI — Agentic Auto-Optimizer
// One flagship view combining:
//   1. Autonomous multi-step agent (region × GPU × schedule search)
//   2. Live Carbon Time-Shift scheduler (24h grid forecast, run-now vs best)
//   3. Workload-to-spec natural-language parser (Nemotron)
//   4. Side-by-side scenario comparison + shareable PDF report
//   5. Cost ↔ carbon trade-off slider (money vs planet, real-time)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Bot, Sparkles, Loader2, Wand2, Leaf, Droplets, DollarSign,
  Clock, TrendingDown, Scale, FileDown, Check, ArrowRight, Gauge,
} from "lucide-react";
import { GPU_SPECS, REGIONS, getRegion } from "@/lib/regionalData";
import { WorkloadInput } from "@/lib/types";
import {
  autoOptimize, searchPlans, parseWorkload, buildForecast,
  openReportForPrint,
  type AutoOptimizeResult, type OptimizerPlan,
} from "@/lib/autoOptimizer";

const SAMPLE = "Training Llama-70B for 3 days on 64 H100 GPUs in Mumbai at 85% utilization";

const DEFAULT_INPUT: WorkloadInput = {
  description: "LLaMA-3 70B fine-tune",
  gpuType: "a100-sxm", numGPUs: 64, region: "aws-ap-south-1",
  durationHours: 72, utilizationPct: 90,
};

function fmtHour(h: number) {
  if (h < 0) return "—";
  const hh = String(h).padStart(2, "0");
  return `${hh}:00`;
}
function fmtWater(l: number) { return l >= 1000 ? `${(l / 1000).toFixed(1)} m³` : `${l.toFixed(0)} L`; }

export default function AutoOptimizer() {
  const [nlText, setNlText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseSource, setParseSource] = useState<"nemotron" | "local" | null>(null);
  const [input, setInput] = useState<WorkloadInput>(DEFAULT_INPUT);

  const [costWeight, setCostWeight] = useState(0); // 0 = carbon, 1 = cost
  const [result, setResult] = useState<AutoOptimizeResult | null>(null);
  const [running, setRunning] = useState(false);
  const [revealStep, setRevealStep] = useState(0);

  // ── Feature 3: NL → spec ────────────────────────────────────────────────────
  async function handleParse() {
    if (!nlText.trim() || parsing) return;
    setParsing(true);
    const r = await parseWorkload(nlText.trim());
    setInput(r.workload);
    setParseSource(r.source);
    setParsing(false);
  }

  // ── Feature 1: run the autonomous agent ─────────────────────────────────────
  async function handleOptimize() {
    if (running) return;
    setRunning(true);
    setResult(null);
    setRevealStep(0);
    const r = await autoOptimize(input, { costWeight });
    setResult(r);
    setRunning(false);
  }

  // Animate the reasoning trace as it "thinks".
  useEffect(() => {
    if (!result) return;
    setRevealStep(0);
    const id = setInterval(() => {
      setRevealStep((s) => {
        if (s >= result.steps.length) { clearInterval(id); return s; }
        return s + 1;
      });
    }, 450);
    return () => clearInterval(id);
  }, [result]);

  // ── Feature 5: re-score instantly as the cost↔carbon slider moves ───────────
  // (local search, no network — keeps the slider buttery; prose stays from the
  //  last full run.)
  const liveResult = useMemo(() => {
    if (!result) return null;
    const local = searchPlans(input, { costWeight });
    return { ...local, summary: result.summary, source: result.source };
  }, [costWeight, input, result]);

  const shown = liveResult ?? result;

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="rounded-2xl overflow-hidden border border-emerald-200"
        style={{ background: "linear-gradient(135deg, #052e2b 0%, #064e3b 45%, #047857 100%)" }}>
        <div className="px-6 py-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
            <Bot size={22} className="text-emerald-200" />
          </div>
          <div>
            <p className="text-white font-bold text-[15px]">Agentic Auto-Optimizer</p>
            <p className="text-emerald-100/90 text-[12px] mt-1 leading-relaxed max-w-2xl">
              Don&apos;t just measure carbon — <span className="font-semibold text-white">eliminate</span> it.
              Describe a workload in plain English, then let the{" "}
              <span className="font-semibold text-white">NVIDIA Nemotron</span> agent autonomously search
              every region × GPU × launch-hour combination and hand you one concrete migration plan.
            </p>
          </div>
        </div>
      </div>

      {/* Feature 3 — NL parser */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
            <Wand2 size={13} className="text-emerald-600" /> Describe your workload
          </label>
          <button onClick={() => setNlText(SAMPLE)} className="text-[11px] text-emerald-700 font-medium hover:text-emerald-800">
            Try a sample
          </button>
        </div>
        <div className="flex gap-2">
          <input
            value={nlText}
            onChange={(e) => setNlText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleParse()}
            placeholder="e.g. training Llama-70B for 3 days on 64 H100 GPUs in Mumbai"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
          />
          <button
            onClick={handleParse}
            disabled={!nlText.trim() || parsing}
            className="flex items-center gap-2 px-4 rounded-lg bg-gray-900 text-white text-[12px] font-semibold hover:bg-gray-700 disabled:bg-gray-300 transition-colors whitespace-nowrap"
          >
            {parsing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Parse with Nemotron
          </button>
        </div>
        {parseSource && (
          <p className="text-[10.5px] text-gray-400 mt-2 flex items-center gap-1.5">
            <Check size={11} className="text-emerald-500" />
            Parsed into structured parameters
            <span className={clsx("ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded",
              parseSource === "nemotron" ? "bg-[#76b900] text-black" : "bg-gray-200 text-gray-600")}>
              {parseSource === "nemotron" ? "NVIDIA Nemotron" : "Offline parser"}
            </span>
          </p>
        )}

        {/* Structured params (editable) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          <Field label="GPU model">
            <select value={input.gpuType} onChange={(e) => setInput({ ...input, gpuType: e.target.value })} className={selectCls}>
              {GPU_SPECS.map((g) => <option key={g.id} value={g.id}>{g.name.split(" —")[0]}</option>)}
            </select>
          </Field>
          <Field label="GPU count">
            <input type="number" min={1} max={10000} value={input.numGPUs}
              onChange={(e) => setInput({ ...input, numGPUs: Math.max(1, Number(e.target.value) || 1) })} className={inputCls} />
          </Field>
          <Field label="Region">
            <select value={input.region} onChange={(e) => setInput({ ...input, region: e.target.value })} className={selectCls}>
              {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.displayName.split(" (")[0]}</option>)}
            </select>
          </Field>
          <Field label="Duration (h)">
            <input type="number" min={0.1} value={input.durationHours}
              onChange={(e) => setInput({ ...input, durationHours: Math.max(0.1, Number(e.target.value) || 1) })} className={inputCls} />
          </Field>
          <Field label="Utilization %">
            <input type="number" min={1} max={100} value={input.utilizationPct}
              onChange={(e) => setInput({ ...input, utilizationPct: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })} className={inputCls} />
          </Field>
        </div>

        {/* Feature 5 — cost↔carbon slider */}
        <div className="mt-5 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-700 flex items-center gap-1.5">
              <Scale size={13} className="text-violet-600" /> Optimization objective
            </span>
            <span className="text-[11px] font-bold text-gray-800">
              {costWeight <= 0.15 ? "🌍 Greenest" : costWeight >= 0.85 ? "💰 Cheapest" : `${Math.round((1 - costWeight) * 100)}% planet · ${Math.round(costWeight * 100)}% cost`}
            </span>
          </div>
          <input type="range" min={0} max={1} step={0.05} value={costWeight}
            onChange={(e) => setCostWeight(Number(e.target.value))}
            className="w-full accent-emerald-500" />
          <div className="flex justify-between text-[9.5px] text-gray-400 mt-1">
            <span className="flex items-center gap-1"><Leaf size={10} className="text-emerald-500" /> Minimize carbon</span>
            <span className="flex items-center gap-1"><DollarSign size={10} className="text-amber-500" /> Minimize cost</span>
          </div>
        </div>

        <button
          onClick={handleOptimize}
          disabled={running}
          className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-600 text-white text-[13px] font-bold hover:bg-emerald-700 disabled:bg-gray-300 transition-colors"
        >
          {running ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
          {running ? "Agent is evaluating configurations…" : "Minimize my carbon →"}
        </button>
      </div>

      {shown && (
        <>
          {/* Feature 1 — agent reasoning trace */}
          <div className="rounded-xl border border-violet-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-violet-100 bg-violet-50/50 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center">
                <Bot size={15} className="text-violet-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">Agent reasoning trace</p>
                <p className="text-[10px] text-gray-400">
                  {shown.combosEvaluated} configurations evaluated ·{" "}
                  <span className={clsx("font-bold", shown.source === "nemotron" ? "text-[#5a8c00]" : "text-gray-500")}>
                    {shown.source === "nemotron" ? "narrated by NVIDIA Nemotron" : "offline reasoning engine"}
                  </span>
                </p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {shown.steps.map((s, i) => (
                <div key={i} className={clsx("flex items-start gap-3 transition-all duration-300",
                  i < revealStep ? "opacity-100" : "opacity-30")}>
                  <div className="flex flex-col items-center">
                    <div className={clsx("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0",
                      i < revealStep ? "bg-violet-600 text-white" : "bg-gray-200 text-gray-400")}>
                      {i < revealStep ? <Check size={11} /> : i + 1}
                    </div>
                    {i < shown.steps.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" style={{ minHeight: 18 }} />}
                  </div>
                  <div className="pb-1">
                    <p className="text-[12px] text-gray-800"><span className="font-semibold text-violet-700">Thought:</span> {s.thought}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-600">{s.action}</code>
                      {" → "}{s.observation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature 1 — the migration plan */}
          <PlanCard result={shown} />

          {/* Feature 2 — live time-shift forecast */}
          <TimeShiftForecast regionId={shown.recommended.metrics.region} result={shown} />

          {/* Feature 4 — side-by-side candidates + report export */}
          <CandidatesTable input={input} result={shown} />
        </>
      )}
    </div>
  );
}

// ── Plan card ────────────────────────────────────────────────────────────────
function PlanCard({ result }: { result: AutoOptimizeResult }) {
  const r = result.recommended;
  const b = result.baseline;
  const m = r.metrics;
  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-green-50/40 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">RECOMMENDED PLAN</span>
          <span className="text-[10px] text-gray-400">objective: {result.costWeight <= 0.15 ? "greenest" : result.costWeight >= 0.85 ? "cheapest" : "balanced"}</span>
        </div>
        <span className="text-[26px] font-black text-emerald-600 leading-none tabular-nums">−{r.carbonSavingsPct}%</span>
      </div>

      <p className="text-[17px] font-bold text-gray-900 leading-snug flex items-center gap-2 flex-wrap">
        {r.label === "No change needed"
          ? "✅ Already optimal for this objective"
          : <>{r.label} <span className="text-emerald-600">= −{r.carbonSavingsPct}% carbon</span></>}
      </p>

      {/* before → after */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DeltaStat icon={<Leaf size={15} className="text-emerald-500" />} label="Carbon / run"
          before={`${b.carbonKgCO2e} kg`} after={`${m.carbonKgCO2e} kg`} accent="text-emerald-600" />
        <DeltaStat icon={<Droplets size={15} className="text-blue-500" />} label="Water / run"
          before={fmtWater(b.waterLiters)} after={fmtWater(m.waterLiters)} accent="text-blue-600" />
        <DeltaStat icon={<DollarSign size={15} className="text-amber-500" />} label="Cost / run"
          before={`$${b.costUSD}`} after={`$${m.costUSD}`} accent={r.costDeltaUSD <= 0 ? "text-emerald-600" : "text-red-500"} />
        <DeltaStat icon={<Clock size={15} className="text-violet-500" />} label="Best launch"
          before={`${b.durationHours}h`} after={fmtHour(m.bestHourIST) + " IST"} accent="text-violet-600" />
      </div>

      {/* action chips */}
      <div className="flex flex-wrap gap-2">
        {r.actions.map((a, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-700 bg-white border border-emerald-200 rounded-full px-3 py-1.5">
            <ArrowRight size={11} className="text-emerald-500" /> {a}
          </span>
        ))}
      </div>

      {/* narrative */}
      <div className="bg-white/70 border border-emerald-100 rounded-lg p-4">
        <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <Sparkles size={11} /> {result.source === "nemotron" ? "Nemotron migration plan" : "Migration plan"}
        </p>
        <p className="text-[12.5px] text-gray-700 leading-relaxed whitespace-pre-wrap">{result.summary}</p>
      </div>

      <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
        <DollarSign size={12} className="text-amber-500" />
        Shadow carbon cost avoided: <span className="font-semibold text-gray-700">₹{carbonRupees(r.carbonSavingsKg)}/run</span>
        <span className="text-gray-400">(India ₹750/t CO₂e)</span>
      </p>
    </div>
  );
}

function carbonRupees(kg: number) { return Math.round((kg / 1000) * 750).toLocaleString(); }

// ── Feature 2 — Live Carbon Time-Shift forecast ──────────────────────────────
function TimeShiftForecast({ regionId, result }: { regionId: string; result: AutoOptimizeResult }) {
  const region = getRegion(regionId);
  const forecast = useMemo(() => buildForecast(regionId), [regionId]);
  const best = useMemo(() => forecast.reduce((a, b) => (a.intensity < b.intensity ? a : b)), [forecast]);
  const worst = useMemo(() => forecast.reduce((a, b) => (a.intensity > b.intensity ? a : b)), [forecast]);
  const nowHour = Math.floor((new Date().getUTCHours() + 5.5) % 24); // approx IST
  const nowIntensity = forecast[nowHour]?.intensity ?? region.gridIntensityGCO2;

  // "Run now vs run at best hour" carbon delta on the recommended config.
  const m = result.recommended.metrics;
  const opNow = m.energyKWh * nowIntensity / 1000;
  const opBest = m.energyKWh * best.intensity / 1000;
  const savedKg = Math.max(0, opNow - opBest);
  const savedPct = opNow > 0 ? Math.round((savedKg / opNow) * 100) : 0;

  const min = best.intensity, max = worst.intensity;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
            <Clock size={13} className="text-emerald-600" /> Live Carbon Time-Shift · {region.displayName.split(" (")[0]}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">24-hour grid carbon forecast (gCO₂/kWh) · cleanest window highlighted</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400">Best window</p>
          <p className="text-[15px] font-bold text-emerald-600">{fmtHour(best.hour)} IST</p>
        </div>
      </div>

      {savedKg > 0.001 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 flex items-center gap-3">
          <TrendingDown size={16} className="text-emerald-600 flex-shrink-0" />
          <p className="text-[11.5px] text-emerald-800 flex-1">
            Run <span className="font-semibold">now ({fmtHour(nowHour)})</span> vs{" "}
            <span className="font-semibold">{fmtHour(best.hour)}</span> ={" "}
            <span className="font-bold">save {savedKg.toFixed(savedKg < 10 ? 2 : 1)} kg CO₂e</span> this run.
          </p>
          <span className="text-[20px] font-black text-emerald-500">−{savedPct}%</span>
        </div>
      )}

      {/* bar chart */}
      <div className="flex items-end gap-[2px]" style={{ height: 70 }}>
        {forecast.map(({ hour, intensity }) => {
          const isBest = hour === best.hour;
          const isNow = hour === nowHour;
          const heightPct = ((intensity - min) / Math.max(1, max - min)) * 70 + 30;
          const color = isNow ? "bg-indigo-500" : isBest ? "bg-emerald-500"
            : intensity > min + (max - min) * 0.66 ? "bg-red-400"
            : intensity > min + (max - min) * 0.33 ? "bg-amber-400" : "bg-emerald-300";
          return (
            <div key={hour} className="flex-1 flex flex-col items-center" title={`${fmtHour(hour)} IST: ${intensity} gCO₂/kWh`}>
              <div className={clsx("w-full rounded-sm transition-all", color)} style={{ height: `${heightPct}%` }} />
              {hour % 6 === 0 && <span className="text-[7px] text-gray-400 mt-0.5">{hour}h</span>}
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 text-[9px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /> Best ({fmtHour(best.hour)})</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-500 inline-block" /> Now ({fmtHour(nowHour)})</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" /> Peak demand</span>
      </div>
    </div>
  );
}

// ── Feature 4 — candidate comparison + report export ──────────────────────────
function CandidatesTable({ input, result }: { input: WorkloadInput; result: AutoOptimizeResult }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
            <Gauge size={13} className="text-gray-500" /> Top configurations evaluated
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Side-by-side — the agent ranked all {result.combosEvaluated} options; best 7 shown</p>
        </div>
        <button
          onClick={() => openReportForPrint(input, result)}
          className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold border border-emerald-200 bg-emerald-50 px-3 py-1.5 rounded hover:bg-emerald-100 transition-colors"
        >
          <FileDown size={13} /> Export CFO report (PDF)
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400">
              {["#", "Plan", "GPU", "Region", "kg CO₂e", "Carbon Δ", "Water", "Cost", "Launch"].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-[9px] font-bold uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.candidates.map((p: OptimizerPlan, i) => (
              <tr key={i} className={clsx("border-b border-gray-50", p.recommended ? "bg-emerald-50/60" : "hover:bg-gray-50")}>
                <td className="px-3 py-2 tabular-nums text-gray-400">{p.recommended ? "★" : i + 1}</td>
                <td className="px-3 py-2 text-gray-700 max-w-[220px] truncate" title={p.label}>{p.label}</td>
                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{p.metrics.gpuName.split(" —")[0]}</td>
                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{p.metrics.regionName.split(" (")[0]}</td>
                <td className="px-3 py-2 tabular-nums font-semibold text-gray-800">{p.metrics.carbonKgCO2e}</td>
                <td className="px-3 py-2 tabular-nums text-emerald-600 font-semibold">−{p.carbonSavingsPct}%</td>
                <td className="px-3 py-2 tabular-nums text-gray-600">{fmtWater(p.metrics.waterLiters)}</td>
                <td className={clsx("px-3 py-2 tabular-nums", p.costDeltaUSD <= 0 ? "text-emerald-600" : "text-red-500")}>${p.metrics.costUSD}</td>
                <td className="px-3 py-2 tabular-nums text-gray-500">{fmtHour(p.metrics.bestHourIST)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── small UI helpers ──────────────────────────────────────────────────────────
const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-800 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 tabular-nums";
const selectCls = inputCls + " cursor-pointer";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">{label}</label>
      {children}
    </div>
  );
}

function DeltaStat({ icon, label, before, after, accent }: {
  icon: React.ReactNode; label: string; before: string; after: string; accent: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3.5 py-3">
      <div className="flex items-center gap-1.5 mb-1.5">{icon}
        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-gray-400 line-through tabular-nums">{before}</span>
        <ArrowRight size={11} className="text-gray-300" />
        <span className={clsx("text-[15px] font-bold tabular-nums", accent)}>{after}</span>
      </div>
    </div>
  );
}
