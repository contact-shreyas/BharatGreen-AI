"use client";
// ─────────────────────────────────────────────────────────────────────────────
// BharatGreen AI — Shared Live-Data Context
//
// One source of truth for real-time grid carbon intensity, consumed by every
// page in the app. Wraps `useLiveGridData` (which pulls REAL data from
// Electricity Maps for Indian zones via /api/grid-intensity, and simulates the
// rest). Exposes a fleet-wide "live factor" so any static current-period metric
// can be made to breathe with the live grid:
//
//     liveValue = staticValue × liveFactor
//
// `liveFactor` = (current fleet intensity) ÷ (baseline fleet intensity) ≈ 1.0,
// fluctuating with the real grid. `source` reflects whether ANY zone is backed
// by the real external API ("live") or fully simulated ("simulated").
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useMemo } from "react";
import { REGIONS } from "./regionalData";
import { useLiveGridData, LiveRegionState } from "./useLiveGridData";

// Baseline fleet intensity = mean static intensity of the Indian deployment zones.
const INDIAN_REGIONS = REGIONS.filter((r) => r.isIndian);
const BASELINE_FLEET_INTENSITY =
  INDIAN_REGIONS.reduce((a, r) => a + r.gridIntensityGCO2, 0) /
  Math.max(1, INDIAN_REGIONS.length);

export interface LiveContextValue {
  liveData: Record<string, LiveRegionState>;
  /** Current mean live intensity across Indian deployment zones (gCO₂/kWh). */
  fleetIntensity: number;
  /** Constant baseline mean intensity for the same zones. */
  baselineFleetIntensity: number;
  /** fleetIntensity ÷ baseline — multiply static "now" metrics by this. */
  liveFactor: number;
  /** "live" if any zone is backed by the real Electricity Maps API. */
  source: "live" | "simulated";
  secondsAgo: number;
  refresh: () => void;
  /** Live intensity for a specific region id (falls back to its static value). */
  intensityFor: (regionId: string) => number;
}

const LiveContext = createContext<LiveContextValue | null>(null);

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const { liveData, secondsAgo, refresh } = useLiveGridData(30_000);

  const value = useMemo<LiveContextValue>(() => {
    const indian = INDIAN_REGIONS.map((r) => liveData[r.id]?.gridIntensityGCO2 ?? r.gridIntensityGCO2);
    const fleetIntensity = indian.reduce((a, v) => a + v, 0) / Math.max(1, indian.length);
    const liveFactor = BASELINE_FLEET_INTENSITY > 0 ? fleetIntensity / BASELINE_FLEET_INTENSITY : 1;
    const source: "live" | "simulated" = Object.values(liveData).some((d) => d?.source === "live")
      ? "live"
      : "simulated";

    const intensityFor = (regionId: string) => {
      const live = liveData[regionId]?.gridIntensityGCO2;
      if (live != null) return live;
      const r = REGIONS.find((x) => x.id === regionId);
      return r?.gridIntensityGCO2 ?? fleetIntensity;
    };

    return {
      liveData,
      fleetIntensity,
      baselineFleetIntensity: BASELINE_FLEET_INTENSITY,
      liveFactor,
      source,
      secondsAgo,
      refresh,
      intensityFor,
    };
  }, [liveData, secondsAgo, refresh]);

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveContextValue {
  const ctx = useContext(LiveContext);
  if (ctx) return ctx;
  // Safe fallback if a component renders outside the provider (SSR/edge cases):
  // behaves as a neutral, fully-simulated, factor-1 layer so the UI never crashes.
  return {
    liveData: {},
    fleetIntensity: BASELINE_FLEET_INTENSITY,
    baselineFleetIntensity: BASELINE_FLEET_INTENSITY,
    liveFactor: 1,
    source: "simulated",
    secondsAgo: 0,
    refresh: () => {},
    intensityFor: (regionId: string) =>
      REGIONS.find((x) => x.id === regionId)?.gridIntensityGCO2 ?? BASELINE_FLEET_INTENSITY,
  };
}
