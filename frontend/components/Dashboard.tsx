"use client";

import { useState, useEffect, useRef } from "react";
import { GPU_SPECS, REGIONS, getGPU, getRegion } from "@/lib/regionalData";
import { calculateFootprint } from "@/lib/calculations";
import { fetchNemotronAnalysis } from "@/lib/agentAnalysis";
import { WorkloadInput, CalculationResult, AnalysisStatus } from "@/lib/types";
import KPICards from "./KPICards";
import WorkloadInputForm from "./WorkloadInput";
import AgentAnalysis from "./AgentAnalysis";
import RegionTable from "./RegionTable";
import OptimizationPanel from "./OptimizationPanel";
import { Download, Loader2 } from "lucide-react";

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

  // Re-calculate KPIs instantly whenever form fields change
  useEffect(() => {
    setResult(calculateFootprint(input));
  }, [input]);

  const gpu = getGPU(input.gpuType);
  const region = getRegion(input.region);

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
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          onClick={() => console.log("Export report")}
        >
          <Download size={13} />
          Export Report
        </button>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 px-7 py-6 space-y-6">
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

        {/* Bottom Two-Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <AgentAnalysis
            displayedText={displayedText}
            fullText={agentText}
            status={status}
            timestamp={analysisTimestamp}
          />
          <RegionTable currentRegionId={input.region} />
        </div>
      </main>
    </div>
  );
}
