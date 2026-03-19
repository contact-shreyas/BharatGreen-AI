"use client";

import { REGIONS } from "@/lib/regionalData";
import { Rating, RegionData } from "@/lib/types";
import { LiveRegionState } from "@/lib/useLiveGridData";
import clsx from "clsx";

interface Props {
  currentRegionId: string;
  liveData?: Record<string, LiveRegionState>;
}

const RATING_META: Record<Rating, { dot: string; bar: string; badge: string }> = {
  Best: { dot: "bg-green-500",  bar: "bg-green-500",  badge: "bg-green-50  text-green-700  border-green-200"  },
  Low:  { dot: "bg-amber-400",  bar: "bg-amber-400",  badge: "bg-amber-50  text-amber-700  border-amber-200"  },
  Med:  { dot: "bg-orange-400", bar: "bg-orange-400", badge: "bg-orange-50 text-orange-700 border-orange-200" },
};

const MAX_INTENSITY = 900;

// Indian regions: sorted cleanest → heaviest
const INDIAN = REGIONS.filter((r) => r.isIndian).sort((a, b) => a.gridIntensityGCO2 - b.gridIntensityGCO2);
// Global greener comparisons for context (non-Indian, ≤ 400 gCO₂/kWh)
const GLOBAL = REGIONS
  .filter((r) => !r.isIndian && r.gridIntensityGCO2 <= 400)
  .sort((a, b) => a.gridIntensityGCO2 - b.gridIntensityGCO2);

function SectionDivider({ label }: { label: string }) {
  return (
    <tr className="bg-gray-50/80">
      <td colSpan={4} className="px-4 py-1.5">
        <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">{label}</p>
      </td>
    </tr>
  );
}

function RegionRow({ region, isActive, live }: { region: RegionData; isActive: boolean; live?: LiveRegionState }) {
  const meta = RATING_META[region.rating];
  const displayIntensity = live?.gridIntensityGCO2 ?? region.gridIntensityGCO2;
  const barPct = Math.round((displayIntensity / MAX_INTENSITY) * 100);
  const cityOnly = region.displayName.split(" (")[0];
  const trendIcon = live?.trend === "up" ? " ↑" : live?.trend === "down" ? " ↓" : "";
  const trendCls = live?.trend === "up" ? "text-red-500" : live?.trend === "down" ? "text-green-600" : "";

  return (
    <tr className={clsx("border-b border-gray-50 transition-colors", isActive ? "bg-green-50/80" : "hover:bg-gray-50")}>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className={clsx("w-1 h-4 rounded-full flex-shrink-0", isActive ? "bg-green-500" : "invisible")} />
          <div>
            <p className={clsx("text-[11.5px] font-medium leading-tight", isActive ? "text-gray-900" : "text-gray-700")}>{cityOnly}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{region.provider} · {region.country}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5 text-right">
        <span className="text-[12px] font-semibold text-gray-800 tabular-nums">{displayIntensity}</span>
        {live && trendIcon && (
          <span className={clsx("text-[10px] font-bold ml-0.5", trendCls)}>{trendIcon}</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-center gap-1.5">
          <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", meta.dot)} />
          <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className={clsx("h-full rounded-full transition-all duration-500", meta.bar)} style={{ width: `${barPct}%` }} />
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-center">
        <span className={clsx("inline-block px-2 py-0.5 rounded text-[10px] font-semibold border", meta.badge)}>{region.rating}</span>
      </td>
    </tr>
  );
}

export default function RegionTable({ currentRegionId, liveData }: Props) {
  const currentRegion = REGIONS.find((r) => r.id === currentRegionId);
  const currentLive = currentRegionId && liveData ? liveData[currentRegionId] : undefined;
  const displayIntensity = currentLive?.gridIntensityGCO2 ?? currentRegion?.gridIntensityGCO2;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[520px]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between">
        <div>
          <p className="text-[12px] font-semibold text-gray-900">Region carbon intensity</p>
          {currentRegion && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              {currentRegion.displayName.split(" (")[0]} &mdash;{" "}
              <span className={currentLive?.trend === "up" ? "text-red-500" : currentLive?.trend === "down" ? "text-green-600" : ""}>
                {displayIntensity} gCO₂/kWh
              </span>
              {currentLive && currentLive.trend !== "flat" && (
                <span className={currentLive.trend === "up" ? "text-red-500" : "text-green-600"}>
                  {currentLive.trend === "up" ? " ↑" : " ↓"}
                </span>
              )}
            </p>
          )}
        </div>
        <span className="text-[9px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded mt-0.5 whitespace-nowrap">
          🇮🇳 India Focus
        </span>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
            <tr>
              <th className="text-left   px-4 py-2 text-[9.5px] font-bold text-gray-500 uppercase tracking-wider">Region</th>
              <th className="text-right  px-4 py-2 text-[9.5px] font-bold text-gray-500 uppercase tracking-wider">gCO₂/kWh</th>
              <th className="text-center px-3 py-2 text-[9.5px] font-bold text-gray-500 uppercase tracking-wider">Level</th>
              <th className="text-center px-3 py-2 text-[9.5px] font-bold text-gray-500 uppercase tracking-wider">Rating</th>
            </tr>
          </thead>
          <tbody>
            <SectionDivider label="Indian Data Centers" />
            {INDIAN.map((r) => (
              <RegionRow key={r.id} region={r} isActive={r.id === currentRegionId} live={liveData?.[r.id]} />
            ))}
            <SectionDivider label="Global Comparisons" />
            {GLOBAL.map((r) => (
              <RegionRow key={r.id} region={r} isActive={r.id === currentRegionId} live={liveData?.[r.id]} />
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-4">
        <span className="text-[9.5px] text-gray-400 font-medium">Rating:</span>
        <span className="flex items-center gap-1 text-[9.5px] text-gray-500"><span className="w-2 h-2 rounded-full bg-green-500" /> Best</span>
        <span className="flex items-center gap-1 text-[9.5px] text-gray-500"><span className="w-2 h-2 rounded-full bg-orange-400" /> Med</span>
        <span className="flex items-center gap-1 text-[9.5px] text-gray-500"><span className="w-2 h-2 rounded-full bg-amber-400" /> Low</span>
        <span className="text-[9.5px] text-gray-300 ml-auto">Indian regions rated within India context</span>
      </div>
    </div>
  );
}
