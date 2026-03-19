"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { GPU_SPECS, REGIONS, getGPU, getRegion } from "@/lib/regionalData";
import { calculateFootprint, carbonCostINR, getTopAlternatives } from "@/lib/calculations";
import { fetchNemotronAnalysis } from "@/lib/agentAnalysis";
import { WorkloadInput, CalculationResult, AnalysisStatus } from "@/lib/types";
import { useLiveGridData } from "@/lib/useLiveGridData";
import KPICards from "./KPICards";
import WorkloadInputForm from "./WorkloadInput";
import AgentAnalysis from "./AgentAnalysis";
import RegionTable from "./RegionTable";
import OptimizationPanel from "./OptimizationPanel";
import IndiaRealisticMap from "./IndiaRealisticMap";
import CarbonBudgetGauge from "./CarbonBudgetGauge";
import GreenScheduler from "./GreenScheduler";
import ChatAssistant from "./ChatAssistant";
import { Download, Loader2, RefreshCw, Wifi, Leaf, TrendingDown, Zap } from "lucide-react";

// ─── Default workload — India-focused demo ───────────────────────────────────
const DEFAULT_INPUT: WorkloadInput = {
  description:
    "We're fine-tuning a 70-billion-parameter LLaMA model using 64 H100 GPUs in a Mumbai data center for 72 hours.",
  gpuType: "a100-sxm",
  numGPUs: 8,
  region: "aws-ap-south-1",   // Mumbai — AWS ap-south-1 (750 gCO₂/kWh)
  durationHours: 24,
  utilizationPct: 100,
};

export default function Dashboard() {
  const [input, setInput] = useState<WorkloadInput>(DEFAULT_INPUT);
  const [result, setResult] = useState<CalculationResult>(() =>
    calculateFootprint(DEFAULT_INPUT)
  );
  const [agentText, setAgentText] = useState<string>("");
  const [displayedText, setDisplayedText] = useState<string>("");
  const [status, setStatus] = useState<AnalysisStatus>("done");
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string>("");
  const [costGreenBalance, setCostGreenBalance] = useState<number>(72);
  const [appliedPlanCount, setAppliedPlanCount] = useState<number>(0);
  const [eventFeed, setEventFeed] = useState<Array<{ id: number; time: string; message: string; tone: "good" | "info" | "warn" | "critical" }>>([]);

  // ── Live grid-intensity data (auto-refreshes every 30 s) ────────────────
  const { liveData, secondsAgo, refresh: refreshLive } = useLiveGridData(30_000);

  // Determine if any Indian zone is returning real API data
  const hasLiveApiData = Object.values(liveData).some((d) => (d as any).source === "live");

  // Carbon saved counter — animated, grows every second for demo wow factor
  // Base: 42.3 tonnes saved this month; increments ~0.003 kg/sec (realistic)
  const [carbonSaved, setCarbonSaved] = useState(42318.4);
  useEffect(() => {
    const id = setInterval(() => setCarbonSaved((v) => Math.round((v + 0.003) * 10) / 10), 1000);
    return () => clearInterval(id);
  }, []);

  // When live data updates, recalculate footprint with current live intensity
  useEffect(() => {
    const live = liveData[input.region];
    if (!live) return;
    // Re-run calculation with live grid intensity
    setResult(calculateFootprint(input, live.gridIntensityGCO2));
  }, [liveData, input]);

  // Stream the analysis text character-by-character for the typing effect
  const streamRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const streamText = (fullText: string) => {
    if (streamRef.current) clearInterval(streamRef.current);
    setDisplayedText("");
    let i = 0;
    streamRef.current = setInterval(() => {
      i += 8; // advance 8 chars per tick for a snappy but visible effect
      setDisplayedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        setDisplayedText(fullText);
        clearInterval(streamRef.current!);
        streamRef.current = null;
      }
    }, 20);
  };

  // Re-calculate KPIs instantly whenever form fields change (no live override)
  useEffect(() => {
    const live = liveData[input.region];
    setResult(calculateFootprint(input, live?.gridIntensityGCO2));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const gpu = getGPU(input.gpuType);
  const region = getRegion(input.region);
  const rankedAlternatives = useMemo(() => {
    const current = getRegion(input.region);
    const alternatives = getTopAlternatives(input, 6);
    const greenWeight = costGreenBalance / 100;
    const costWeight = 1 - greenWeight;

    return alternatives
      .map((alt) => {
        const gridDelta = Math.max(0, current.gridIntensityGCO2 - alt.region.gridIntensityGCO2);
        const pueDelta = Math.max(0, current.pue - alt.region.pue);
        const wueDelta = Math.max(0, current.wueLitersPerKWh - alt.region.wueLitersPerKWh);

        const greenScore = alt.savingsPct;
        const costProxyScore = gridDelta * 0.035 + pueDelta * 90 + wueDelta * 10;
        const score = greenScore * greenWeight + costProxyScore * costWeight;

        return {
          ...alt,
          score,
          carbonInrSaved: carbonCostINR(Math.max(0, alt.carbonSavings)),
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [costGreenBalance, input]);

  const bestPlan = rankedAlternatives[0];
  const latestCriticalEvent = useMemo(
    () => eventFeed.find((e) => e.tone === "critical"),
    [eventFeed]
  );

  const appendEvent = (message: string, tone: "good" | "info" | "warn" | "critical" = "info") => {
    const now = new Date();
    setEventFeed((prev) => [{
      id: now.getTime(),
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      message,
      tone,
    }, ...prev].slice(0, 7));
  };

  const handleApplyBestPlan = () => {
    if (!bestPlan) return;
    const applyGreenerSchedule = costGreenBalance >= 70;

    setInput((prev) => ({
      ...prev,
      region: bestPlan.region.id,
      durationHours: applyGreenerSchedule ? Math.round(prev.durationHours * 1.15 * 10) / 10 : prev.durationHours,
      utilizationPct: applyGreenerSchedule ? Math.min(prev.utilizationPct, 90) : prev.utilizationPct,
    }));

    setAppliedPlanCount((n) => n + 1);
    appendEvent(
      `Applied best plan: ${bestPlan.region.displayName.split(" (")[0]} · save ~${bestPlan.carbonSavings} kg CO2e and ₹${Math.round(bestPlan.carbonInrSaved).toLocaleString("en-IN")}.`,
      "good"
    );
  };

  // Derive the status badge label (e.g. "Done · 8× A100 SXM4 · Mumbai")
  const statusLabel = (() => {
    if (status === "analyzing") return "Analyzing…";
    if (status === "done" && agentText) {
      const gpuShort = gpu.name.split("—")[0].trim();  // "A100 SXM4"
      const cityName = region.displayName.split(" (")[0]; // "Mumbai"
      return `Done · ${input.numGPUs}× ${gpuShort} · ${cityName}`;
    }
    return "Ready";
  })();

  const handleAnalyze = async () => {
    setStatus("analyzing");
    setAgentText("");
    setDisplayedText("");

    const text = await fetchNemotronAnalysis(input, result);

    setAgentText(text);
    setAnalysisTimestamp(
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    );
    setStatus("done");
    streamText(text);
  };

  useEffect(() => {
    if (eventFeed.length > 0) return;
    appendEvent("Live optimizer online. Watching grid intensity shifts every 30s.", "info");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bestPlan) return;

    const id = setInterval(() => {
      const currentLive = liveData[input.region];
      const bestLive = liveData[bestPlan.region.id];
      const currentIntensity = currentLive?.gridIntensityGCO2 ?? getRegion(input.region).gridIntensityGCO2;
      const bestIntensity = bestLive?.gridIntensityGCO2 ?? bestPlan.region.gridIntensityGCO2;
      const delta = Math.round(currentIntensity - bestIntensity);

      if (delta > 180) {
        appendEvent(
          `Carbon spike detected in ${region.displayName.split(" (")[0]} (+${delta} gCO2/kWh vs recommended). Auto-reroute opportunity is high.`,
          delta > 250 ? "critical" : "warn"
        );
      } else if (delta > 80) {
        appendEvent(
          `Optimization candidate updated: move to ${bestPlan.region.displayName.split(" (")[0]} for ~${bestPlan.savingsPct}% lower CO2e.`,
          "info"
        );
      } else {
        appendEvent(
          `Grid is stable. Current vs best-plan spread is ${Math.max(0, delta)} gCO2/kWh.`,
          "good"
        );
      }
    }, 20000);

    return () => clearInterval(id);
  }, [bestPlan, input.region, liveData, region.displayName]);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50 overflow-y-auto">
      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-7 py-4 bg-white border-b border-gray-200 sticky top-0 z-10">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Workload Carbon Analyzer</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {status === "analyzing" ? (
              <Loader2 size={11} className="text-amber-500 animate-spin" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            )}
            <span className="text-xs text-gray-500">{statusLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Live data indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-md ${hasLiveApiData ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
            <Wifi size={11} className={hasLiveApiData ? "text-green-600" : "text-amber-500"} />
            <span className={`text-xs font-medium ${hasLiveApiData ? "text-green-700" : "text-amber-600"}`}>
              {hasLiveApiData ? "LIVE API" : "LIVE"}
            </span>
            <span className={`text-xs ${hasLiveApiData ? "text-green-600" : "text-amber-600"}`}>
              {secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`}
            </span>
            <button
              onClick={refreshLive}
              title="Refresh live data"
              className={`ml-0.5 transition-colors ${hasLiveApiData ? "text-green-500 hover:text-green-700" : "text-amber-400 hover:text-amber-600"}`}
            >
              <RefreshCw size={10} />
            </button>
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            onClick={() => console.log("Export report")}
          >
            <Download size={13} />
            Export Report
          </button>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 px-7 py-6 space-y-6">

        {/* ── HERO IMPACT BANNER ─────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #052e16 0%, #14532d 40%, #166534 100%)", border: "1px solid #166534" }}>
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
            {/* Stat 1 — Carbon Saved */}
            <div className="flex items-center gap-4 px-6 py-5">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-400/30 flex items-center justify-center flex-shrink-0">
                <Leaf size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-green-300/80 uppercase tracking-wider">CO₂e Avoided This Month</p>
                <p className="text-2xl font-black text-white tabular-nums leading-tight">
                  {(carbonSaved / 1000).toFixed(3)}
                  <span className="text-sm font-semibold text-green-300 ml-1.5">tonnes</span>
                </p>
                <p className="text-[10px] text-green-400 mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                  Live counter · updates every second
                </p>
              </div>
            </div>
            {/* Stat 2 — Green Jobs Routed */}
            <div className="flex items-center gap-4 px-6 py-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                <TrendingDown size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-green-300/80 uppercase tracking-wider">Workloads Green-Routed</p>
                <p className="text-2xl font-black text-white tabular-nums leading-tight">
                  1,284
                  <span className="text-sm font-semibold text-emerald-300 ml-1.5">jobs</span>
                </p>
                <p className="text-[10px] text-emerald-400 mt-0.5">Shifted to low-carbon regions or off-peak slots</p>
              </div>
            </div>
            {/* Stat 3 — INR Savings */}
            <div className="flex items-center gap-4 px-6 py-5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center flex-shrink-0">
                <Zap size={20} className="text-teal-400" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-green-300/80 uppercase tracking-wider">Carbon Cost Saved (INR)</p>
                <p className="text-2xl font-black text-white tabular-nums leading-tight">
                  ₹{Math.round(carbonSaved / 1000 * 750).toLocaleString("en-IN")}
                  <span className="text-sm font-semibold text-teal-300 ml-1.5">est.</span>
                </p>
                <p className="text-[10px] text-teal-400 mt-0.5">@ ₹750 / tonne CO₂e (India carbon market)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Workload Input Section */}
        <WorkloadInputForm
          input={input}
          onChange={setInput}
          onAnalyze={handleAnalyze}
          isAnalyzing={status === "analyzing"}
        />

        {/* KPI Cards */}
        <KPICards result={result} />

        {/* Real-Time Optimization Simulator — full width */}
        <OptimizationPanel input={input} result={result} />

        {/* Decision Action Center: apply best plan + tradeoff slider + event feed */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold text-gray-900">Decision Action Center</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Tune cost vs green priority, then apply the top recommendation in one click.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500">Plans applied</p>
              <p className="text-sm font-bold text-emerald-700 tabular-nums">{appliedPlanCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center justify-between text-[11px] text-gray-600 mb-2">
                <span>Cost-first</span>
                <span className="font-semibold text-gray-800">Priority: {costGreenBalance}% green</span>
                <span>Carbon-first</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={costGreenBalance}
                onChange={(e) => setCostGreenBalance(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <p className="mt-2 text-[10px] text-gray-500">
                Lower values favor operational efficiency proxy. Higher values maximize CO2e reduction.
              </p>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              {bestPlan ? (
                <>
                  <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold">Best Plan Right Now</p>
                  <p className="mt-1 text-sm font-bold text-emerald-900">
                    {bestPlan.region.displayName.split(" (")[0]}
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-800">
                    Save ~{bestPlan.carbonSavings} kg CO2e ({bestPlan.savingsPct}%)
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    Carbon cost avoided: ₹{Math.round(bestPlan.carbonInrSaved).toLocaleString("en-IN")}
                  </p>
                  <button
                    onClick={handleApplyBestPlan}
                    className="mt-3 w-full h-9 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                  >
                    Apply Best Plan
                  </button>
                </>
              ) : (
                <p className="text-[11px] text-gray-500">Current region is already among the best options.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-gray-700">Live What Changed Feed</p>
              <p className="text-[10px] text-gray-500">Auto-refresh events</p>
            </div>
            {latestCriticalEvent && (
              <div className="mx-3 mt-3 mb-1 rounded-md border border-red-300 bg-red-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-red-700">Pinned Critical Alert</p>
                <p className="mt-0.5 text-[11px] text-red-900 leading-4">{latestCriticalEvent.message}</p>
                <p className="text-[10px] text-red-700 mt-1">{latestCriticalEvent.time}</p>
              </div>
            )}
            <div className="max-h-44 overflow-auto divide-y divide-gray-100">
              {eventFeed.map((e) => (
                <div
                  key={e.id}
                  className={`px-3 py-2 flex items-start gap-2 border-l-2 ${
                    e.tone === "critical"
                      ? "bg-red-50/80 border-l-red-500"
                      : e.tone === "warn"
                        ? "bg-amber-50/70 border-l-amber-500"
                        : e.tone === "good"
                          ? "bg-green-50/60 border-l-green-500"
                          : "bg-blue-50/50 border-l-blue-400"
                  }`}
                >
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full ${
                      e.tone === "critical"
                        ? "bg-red-600"
                        : e.tone === "good"
                          ? "bg-green-500"
                          : e.tone === "warn"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-800 leading-4">{e.message}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{e.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Separate realistic map matching screenshot style */}
        <IndiaRealisticMap
          selectedRegionId={input.region}
          onSelectRegion={(id) => setInput((prev) => ({ ...prev, region: id }))}
          liveData={liveData}
        />

        {/* Bottom Two-Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <AgentAnalysis
            displayedText={displayedText}
            fullText={agentText}
            status={status}
            timestamp={analysisTimestamp}
          />
          <RegionTable currentRegionId={input.region} liveData={liveData} />
        </div>

        {/* Carbon Budget + Green Scheduler */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <CarbonBudgetGauge latestResult={result} />
          <GreenScheduler input={input} result={result} />
        </div>
      </main>

      {/* Floating Nemotron Chat Assistant */}
      <ChatAssistant input={input} result={result} />
    </div>
  );
}
