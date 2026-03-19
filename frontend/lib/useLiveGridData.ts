"use client";
// ─────────────────────────────────────────────────────────────────────────────
// BharatGreen AI — Real-Time Grid Intensity Hook
//
// Indian zones → /api/grid-intensity (proxies Electricity Maps v3 API)
// Global zones → time-of-day cosine + ±8 % jitter simulation
// Auto-refreshes every 30 seconds.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { REGIONS } from "./regionalData";
import { LiveGridData } from "./types";

const INDIAN_REGION_IDS = [
  "aws-ap-south-1",
  "azure-south-india",
  "gcp-asia-south2",
  "gcp-asia-south1",
  "azure-central-india",
  "delhi-ncr",
];

// Time-of-day multiplier for non-Indian simulation
function timeOfDayFactor(): number {
  const utcHour = new Date().getUTCHours();
  const ish = (utcHour + 5.5) % 24;
  return 1 + 0.12 * Math.cos((Math.PI * (ish - 14)) / 12);
}

function jitter(): number {
  return 1 + (Math.random() - 0.5) * 0.16;
}

function simulateLive(baseGCO2: number): number {
  return Math.round(baseGCO2 * timeOfDayFactor() * jitter());
}

export interface LiveRegionState extends LiveGridData {
  prevIntensity: number;
  source?: "live" | "simulated";
}

// Fetch real carbon intensity for Indian zones from our API route
async function fetchIndianIntensities(): Promise<Record<string, { intensity: number; source: "live" | "simulated" }>> {
  try {
    const ids = INDIAN_REGION_IDS.join(",");
    const res = await fetch(`/api/grid-intensity?regions=${ids}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data as Record<string, { intensity: number; source: "live" | "simulated" }>;
  } catch {
    return {};
  }
}

export function useLiveGridData(refreshMs = 30_000) {
  const [liveData, setLiveData] = useState<Record<string, LiveRegionState>>({});
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const prevRef = useRef<Record<string, number>>({});

  const refresh = useCallback(async () => {
    const now = Date.now();

    // Fetch real data for Indian zones
    const indianLive = await fetchIndianIntensities();

    const next: Record<string, LiveRegionState> = {};
    for (const r of REGIONS) {
      let newVal: number;
      let source: "live" | "simulated" = "simulated";

      const apiData = indianLive[r.id];
      if (apiData) {
        newVal = apiData.intensity;
        source = apiData.source;
      } else {
        newVal = simulateLive(r.gridIntensityGCO2);
      }

      const prev = prevRef.current[r.id] ?? r.gridIntensityGCO2;
      const trend: LiveGridData["trend"] =
        newVal > prev + 5 ? "up" : newVal < prev - 5 ? "down" : "flat";
      next[r.id] = {
        regionId: r.id,
        gridIntensityGCO2: newVal,
        trend,
        lastUpdated: now,
        prevIntensity: prev,
        source,
      };
    }
    prevRef.current = Object.fromEntries(
      Object.entries(next).map(([k, v]) => [k, v.gridIntensityGCO2])
    );
    setLiveData(next);
    setLastRefresh(now);
    setSecondsAgo(0);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const id = setInterval(refresh, refreshMs);
    return () => clearInterval(id);
  }, [refresh, refreshMs]);
  useEffect(() => {
    const id = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [lastRefresh]);

  return { liveData, lastRefresh, secondsAgo, refresh };
}
