"use client";

import { useMemo } from "react";
import { WorkloadInput, CalculationResult } from "@/lib/types";
import { getTopAlternatives } from "@/lib/calculations";
import { getRegion } from "@/lib/regionalData";
import { ArrowRight, Leaf, Droplets, TrendingDown } from "lucide-react";
import clsx from "clsx";

interface Props {
  input: WorkloadInput;
  result: CalculationResult;
}

/**
 * Real-time What-If Optimization Simulator.
 * Shows up to 3 greener migration targets with quantified savings,
 * updating instantly as the user changes inputs — no server round-trip needed.
 */
export default function OptimizationPanel({ input, result }: Props) {
  const alternatives = useMemo(() => getTopAlternatives(input, 3), [input]);
  const currentRegion = getRegion(input.region);

  if (alternatives.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-900 mb-1">Real-Time Optimization Simulator</p>
        <p className="text-xs text-gray-400">
          🎉 You are already using one of the greenest available regions!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-semibold text-gray-900">Real-Time Optimization Simulator</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            What-if analysis · Current: {currentRegion.displayName.split(" (")[0]} ({currentRegion.gridIntensityGCO2} gCO₂/kWh)
          </p>
        </div>
        <span className="text-[9.5px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded font-semibold">
          LIVE
        </span>
      </div>

      {/* Scenario cards */}
      <div className="space-y-2.5">
        {alternatives.map((alt, idx) => {
          const isTop = idx === 0;
          return (
            <div
              key={alt.region.id}
              className={clsx(
                "rounded-lg border p-3.5 transition-all",
                isTop
                  ? "border-green-200 bg-green-50/60"
                  : "border-gray-100 bg-gray-50/40 hover:bg-gray-50"
              )}
            >
              {/* Top row: from → to */}
              <div className="flex items-center gap-2 mb-2.5">
                {isTop && (
                  <span className="text-[9px] font-bold bg-green-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wide">
                    Recommended
                  </span>
                )}
                <div className="flex items-center gap-1.5 text-[11px] flex-1">
                  <span className="text-gray-400 font-medium">{currentRegion.displayName.split(" (")[0]}</span>
                  <ArrowRight size={11} className="text-gray-300 flex-shrink-0" />
                  <span className={clsx("font-semibold", isTop ? "text-green-700" : "text-gray-800")}>
                    {alt.region.displayName.split(" (")[0]}
                  </span>
                  <span className="text-gray-400 text-[10px] ml-auto">
                    {alt.region.gridIntensityGCO2} gCO₂/kWh
                  </span>
                </div>
              </div>

              {/* Savings metrics */}
              <div className="grid grid-cols-3 gap-2">
                <SavingChip
                  icon={<TrendingDown size={11} />}
                  label="Carbon saved"
                  value={`${alt.carbonSavings} kg`}
                  sub={`CO₂e`}
                  color="text-green-600"
                  bg="bg-green-50"
                />
                <SavingChip
                  icon={<Droplets size={11} />}
                  label="Water saved"
                  value={`${alt.waterSavings} L`}
                  sub="cooling"
                  color="text-blue-600"
                  bg="bg-blue-50"
                />
                <SavingChip
                  icon={<Leaf size={11} />}
                  label="Reduction"
                  value={`${alt.savingsPct}%`}
                  sub="less carbon"
                  color="text-emerald-600"
                  bg="bg-emerald-50"
                />
              </div>

              {/* Year projection for top pick */}
              {isTop && (
                <p className="mt-2 text-[10px] text-green-700 bg-green-50 rounded px-2 py-1 border border-green-100">
                  📅 Projected annual savings (weekly run): ~{(alt.carbonSavings * 52).toFixed(0)} kg CO₂e · ~{Math.round(alt.waterSavings * 52)} L water
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SavingChip({
  icon, label, value, sub, color, bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={clsx("rounded-md p-2 flex flex-col gap-0.5", bg)}>
      <div className={clsx("flex items-center gap-1 text-[10px] font-medium", color)}>
        {icon}
        <span>{label}</span>
      </div>
      <p className={clsx("text-[13px] font-bold tabular-nums", color)}>{value}</p>
      <p className="text-[9.5px] text-gray-400">{sub}</p>
    </div>
  );
}
