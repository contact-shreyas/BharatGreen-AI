"use client";

import { WorkloadInput } from "@/lib/types";
import { GPU_SPECS, REGIONS } from "@/lib/regionalData";
import { ChevronDown, Sparkles, Loader2 } from "lucide-react";

interface Props {
  input: WorkloadInput;
  onChange: (next: WorkloadInput) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export default function WorkloadInputForm({ input, onChange, onAnalyze, isAnalyzing }: Props) {
  const set = <K extends keyof WorkloadInput>(key: K, value: WorkloadInput[K]) =>
    onChange({ ...input, [key]: value });

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      {/* Title */}
      <div>
        <p className="text-xs font-semibold text-gray-900 mb-1">Describe your AI workload</p>
        <p className="text-[11px] text-gray-400">
          Enter a natural language description, or fill in the fields — the agent uses both to
          reason through your footprint.
        </p>
      </div>

      {/* Text area */}
      <textarea
        rows={3}
        value={input.description}
        onChange={(e) => set("description", e.target.value)}
        placeholder="e.g. We're fine-tuning a 70B LLaMA model using 64 H100 GPUs in Mumbai for 72 hours…"
        className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-green-400/60 placeholder:text-gray-300"
      />

      {/* Controls row */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* GPU Type */}
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            GPU type
          </label>
          <div className="relative">
            <select
              value={input.gpuType}
              onChange={(e) => set("gpuType", e.target.value)}
              className="w-full appearance-none bg-white border border-gray-200 text-sm text-gray-800 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-green-400/60 cursor-pointer"
            >
              {GPU_SPECS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Number of GPUs */}
        <div className="flex flex-col gap-1 w-32">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            Number of GPUs
          </label>
          <input
            type="number"
            min={1}
            max={10000}
            value={input.numGPUs}
            onChange={(e) =>
              set("numGPUs", Math.max(1, Math.min(10000, Number(e.target.value))))
            }
            className="w-full border border-gray-200 text-sm text-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400/60"
          />
        </div>

        {/* Region */}
        <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            Region
          </label>
          <div className="relative">
            <select
              value={input.region}
              onChange={(e) => set("region", e.target.value)}
              className="w-full appearance-none bg-white border border-gray-200 text-sm text-gray-800 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-green-400/60 cursor-pointer"
            >
              <optgroup label="🇮🇳 Indian Regions">
                {REGIONS.filter((r) => r.isIndian).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.displayName} — {r.gridIntensityGCO2} gCO₂/kWh
                  </option>
                ))}
              </optgroup>
              <optgroup label="🌍 Global Regions">
                {REGIONS.filter((r) => !r.isIndian).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.displayName} — {r.gridIntensityGCO2} gCO₂/kWh
                  </option>
                ))}
              </optgroup>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Duration */}
        <div className="flex flex-col gap-1 w-36">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            Duration (hours)
          </label>
          <input
            type="number"
            min={0.1}
            max={8760}
            step={0.5}
            value={input.durationHours}
            onChange={(e) =>
              set("durationHours", Math.max(0.1, Number(e.target.value)))
            }
            className="w-full border border-gray-200 text-sm text-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400/60"
          />
        </div>

        {/* Utilization */}
        <div className="flex flex-col gap-1 w-32">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            Utilization %
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={input.utilizationPct}
            onChange={(e) =>
              set("utilizationPct", Math.max(1, Math.min(100, Number(e.target.value))))
            }
            className="w-full border border-gray-200 text-sm text-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400/60"
          />
        </div>

        {/* Analyze Button */}
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm shadow-green-600/30 self-end"
        >
          {isAnalyzing ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Sparkles size={15} />
          )}
          {isAnalyzing ? "Analyzing…" : "Analyze"}
        </button>
      </div>
    </section>
  );
}
