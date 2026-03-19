// ─────────────────────────────────────────────────────────────────────────────
// BharatGreen AI — /api/grid-intensity
// Proxies Electricity Maps v3 API for live Indian zone carbon intensity.
// Falls back to simulated values if key is missing or request fails.
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";

// Map our region IDs → Electricity Maps zone codes
// https://api.electricitymap.org/v3/zones
const ZONE_MAP: Record<string, string> = {
  "aws-ap-south-1":     "IN-WE",   // Mumbai    → India West
  "azure-south-india":  "IN-SO",   // Hyderabad → India South
  "gcp-asia-south2":    "IN-SO",   // Chennai   → India South
  "gcp-asia-south1":    "IN-SO",   // Bengaluru → India South
  "azure-central-india":"IN-WE",   // Pune      → India West
  "delhi-ncr":          "IN-NO",   // Delhi     → India North
};

// Fallback base intensities (gCO₂eq/kWh) when API unavailable
const FALLBACK: Record<string, number> = {
  "aws-ap-south-1":      750,
  "azure-south-india":   700,
  "gcp-asia-south2":     600,
  "gcp-asia-south1":     650,
  "azure-central-india": 780,
  "delhi-ncr":           850,
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const regionIds = searchParams.get("regions")?.split(",") ?? Object.keys(ZONE_MAP);

  const apiKey = process.env.ELECTRICITY_MAPS_API_KEY;
  const results: Record<string, { intensity: number; source: "live" | "simulated"; zone?: string }> = {};

  await Promise.all(
    regionIds.map(async (regionId) => {
      const zone = ZONE_MAP[regionId];
      if (!zone || !apiKey) {
        results[regionId] = { intensity: simulateFallback(regionId), source: "simulated" };
        return;
      }
      try {
        const res = await fetch(
          `https://api.electricitymap.org/v3/carbon-intensity/latest?zone=${zone}`,
          {
            headers: { "auth-token": apiKey },
            // 5-second timeout
            signal: AbortSignal.timeout(5000),
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        // Electricity Maps returns carbonIntensity in gCO₂eq/kWh
        const intensity = json.carbonIntensity as number;
        results[regionId] = { intensity: Math.round(intensity), source: "live", zone };
      } catch {
        // Graceful fallback: simulate so the UI always has data
        results[regionId] = { intensity: simulateFallback(regionId), source: "simulated", zone };
      }
    })
  );

  return NextResponse.json({ data: results, fetchedAt: Date.now() }, {
    headers: { "Cache-Control": "no-store" },
  });
}

function simulateFallback(regionId: string): number {
  const base = FALLBACK[regionId] ?? 500;
  const utcHour = new Date().getUTCHours();
  const ist = (utcHour + 5.5) % 24;
  const tod = 1 + 0.12 * Math.cos((Math.PI * (ist - 14)) / 12);
  const jitter = 1 + (Math.random() - 0.5) * 0.16;
  return Math.round(base * tod * jitter);
}
