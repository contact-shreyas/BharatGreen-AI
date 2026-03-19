"use client";
// ─────────────────────────────────────────────────────────────────────────────
// BharatGreen AI — Green Scheduling Engine
// Generates a 24-hour carbon-intensity forecast for the selected region and
// recommends the optimal run window. Indian grid is cleanest 2–6 AM (solar gap,
// low industrial demand). This engine simulates that pattern realistically.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { WorkloadInput, CalculationResult } from "@/lib/types";
import { getRegion } from "@/lib/regionalData";
import { calculateFootprint } from "@/lib/calculations";
import { Calendar, Clock, TrendingDown, Zap } from "lucide-react";
import clsx from "clsx";

interface Props {
  input: WorkloadInput;
  result: CalculationResult;
}

// Simulate 24-hour intensity pattern for a region
function buildForecast(baseIntensity: number): { hour: number; intensity: number }[] {
  // Multiplier curve: peaks at 9 AM and 7 PM (Indian demand), lowest at 4 AM
  const curve = [
    0.72, 0.68, 0.65, 0.63, 0.62, 0.64, 0.71, 0.84,
    0.95, 1.05, 1.10, 1.08, 1.04, 1.02, 1.00, 0.97,
    0.96, 0.98, 1.06, 1.12, 1.08, 0.98, 0.88, 0.78,
  ];
  return curve.map((m, h) => ({
    hour: h,
    intensity: Math.round(baseIntensity * m),
  }));
}

function formatHour(h: number) {
  const period = h < 12 ? "AM" : "PM";
  const disp = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${disp}:00 ${period}`;
}

export default function GreenScheduler({ input, result }: Props) {
  const region = getRegion(input.region);

  const forecast = useMemo(() => buildForecast(region.gridIntensityGCO2), [region.gridIntensityGCO2]);

  const best = useMemo(() => {
    return forecast.reduce((a, b) => (a.intensity < b.intensity ? a : b));
  }, [forecast]);

  const worst = useMemo(() => {
    return forecast.reduce((a, b) => (a.intensity > b.intensity ? a : b));
  }, [forecast]);

  const nowHour = new Date().getUTCHours(); // approximate
  const nowIntensity = forecast[nowHour]?.intensity ?? region.gridIntensityGCO2;

  const bestResult = calculateFootprint({ ...input }, best.intensity);
  const carbonSaved = Math.max(0, result.totalCarbonKgCO2e - bestResult.totalCarbonKgCO2e);
  const savingsPct = result.totalCarbonKgCO2e > 0
    ? Math.round((carbonSaved / result.totalCarbonKgCO2e) * 100)
    : 0;
  const inrSaved = Math.round((carbonSaved / 1000) * 750);

  const maxIntensity = worst.intensity;
  const minIntensity = best.intensity;

  function barColor(intensity: number, isBest: boolean, isCurrent: boolean) {
    if (isCurrent) return "bg-indigo-500";
    if (isBest) return "bg-green-500";
    const pct = (intensity - minIntensity) / (maxIntensity - minIntensity);
    if (pct < 0.33) return "bg-green-400";
    if (pct < 0.66) return "bg-amber-400";
    return "bg-red-400";
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-semibold text-gray-900 flex items-center gap-1.5">
            <Calendar size={13} className="text-green-600" />
            Green Scheduling Engine
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            24-h carbon forecast · {region.displayName.split(" (")[0]}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-400">Best window</p>
          <p className="text-[14px] font-bold text-green-600">{formatHour(best.hour)}</p>
        </div>
      </div>

      {/* Savings banner */}
      {savingsPct > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 flex items-center gap-3">
          <TrendingDown size={16} className="text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[11.5px] font-semibold text-green-800">
              Schedule at {formatHour(best.hour)} → save {savingsPct}% carbon
            </p>
            <p className="text-[10px] text-green-600 mt-0.5">
              −{carbonSaved.toFixed(1)} kg CO₂e · saves ₹{inrSaved.toLocaleString()} shadow carbon cost
            </p>
          </div>
          <span className="text-[22px] font-black text-green-500 flex-shrink-0">−{savingsPct}%</span>
        </div>
      )}

      {/* 24-hour bar chart */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Hourly carbon intensity (gCO₂/kWh)
        </p>
        <div className="flex items-end gap-[2px]" style={{ height: 64 }}>
          {forecast.map(({ hour, intensity }) => {
            const isBest = hour === best.hour;
            const isCurrent = hour === nowHour;
            const heightPct = ((intensity - minIntensity) / (maxIntensity - minIntensity)) * 70 + 30;
            return (
              <div
                key={hour}
                className="flex-1 flex flex-col items-center gap-0.5 group relative"
                title={`${formatHour(hour)}: ${intensity} g`}
              >
                <div
                  className={clsx("w-full rounded-sm transition-all", barColor(intensity, isBest, isCurrent))}
                  style={{ height: `${heightPct}%` }}
                />
                {/* Hour label every 6 h */}
                {hour % 6 === 0 && (
                  <span className="text-[7px] text-gray-400 tabular-nums">{hour}h</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-gray-400 mt-1">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" /> Best window</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-500 inline-block" /> Now ({formatHour(nowHour)})</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" /> Peak demand</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Now intensity", value: `${nowIntensity}g`, icon: <Clock size={11} />, color: "text-indigo-600" },
          { label: "Optimal window", value: `${best.intensity}g`, icon: <Zap size={11} />, color: "text-green-600" },
          { label: "Peak intensity", value: `${worst.intensity}g`, icon: <TrendingDown size={11} className="rotate-180" />, color: "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="bg-gray-50 rounded-lg p-2.5 text-center border border-gray-100">
            <p className={clsx("flex items-center justify-center gap-1 text-[9px] font-semibold uppercase tracking-wide mb-1", s.color)}>
              {s.icon}{s.label}
            </p>
            <p className={clsx("text-[16px] font-black tabular-nums", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
