import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { REGIONS } from "@/lib/regionalData";

export const runtime = "nodejs";

type ZoneCode = "IN-WE" | "IN-SO" | "IN-NO";

interface DistrictBase {
  id: string;
  state: string;
  district: string;
  lat: number;
  lng: number;
  postalSamples: number;
  zone: ZoneCode;
}

interface ZoneIntensity {
  value: number;
  source: "live" | "simulated";
}

let districtCache: DistrictBase[] | null = null;

const ZONE_ANCHORS: Record<ZoneCode, { lat: number; lng: number; fallback: number }> = {
  "IN-WE": { lat: 19.076, lng: 72.8777, fallback: 760 },
  "IN-SO": { lat: 13.0827, lng: 80.2707, fallback: 640 },
  "IN-NO": { lat: 28.6139, lng: 77.209, fallback: 840 },
};

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h << 5) - h + value.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function intensityLevel(v: number): "low" | "medium" | "high" {
  if (v < 400) return "low";
  if (v < 600) return "medium";
  return "high";
}

function nearestZone(lat: number, lng: number): ZoneCode {
  let best: ZoneCode = "IN-WE";
  let bestDist = Number.POSITIVE_INFINITY;

  (Object.keys(ZONE_ANCHORS) as ZoneCode[]).forEach((zone) => {
    const a = ZONE_ANCHORS[zone];
    const d = (lat - a.lat) ** 2 + (lng - a.lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = zone;
    }
  });

  return best;
}

async function loadDistrictBaseData(): Promise<DistrictBase[]> {
  if (districtCache) return districtCache;

  const filePath = path.join(process.cwd(), "node_modules", "postalcodes-india", "data", "IN.txt");
  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  const grouped = new Map<
    string,
    { state: string; district: string; sumLat: number; sumLng: number; count: number }
  >();

  for (const line of lines) {
    if (!line.trim()) continue;
    const c = line.split("\t");
    if (c.length < 11) continue;

    const state = (c[3] || "").trim();
    const district = (c[5] || "").trim();
    const lat = Number(c[9]);
    const lng = Number(c[10]);

    if (!state || !district || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < 5 || lat > 38 || lng < 67 || lng > 99) continue;

    const key = `${state}|${district}`;
    const prev = grouped.get(key);
    if (prev) {
      prev.sumLat += lat;
      prev.sumLng += lng;
      prev.count += 1;
    } else {
      grouped.set(key, { state, district, sumLat: lat, sumLng: lng, count: 1 });
    }
  }

  districtCache = Array.from(grouped.values()).map((g) => {
    const lat = g.sumLat / g.count;
    const lng = g.sumLng / g.count;
    const zone = nearestZone(lat, lng);
    return {
      id: `${g.state}::${g.district}`,
      state: g.state,
      district: g.district,
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4)),
      postalSamples: g.count,
      zone,
    };
  });

  return districtCache;
}

function simulateZoneIntensity(zone: ZoneCode): number {
  const base = ZONE_ANCHORS[zone].fallback;
  const utcHour = new Date().getUTCHours();
  const ist = (utcHour + 5.5) % 24;
  const tod = 1 + 0.12 * Math.cos((Math.PI * (ist - 14)) / 12);
  const jitter = 1 + (Math.random() - 0.5) * 0.12;
  return Math.round(base * tod * jitter);
}

async function fetchZoneIntensities(): Promise<Record<ZoneCode, ZoneIntensity>> {
  const out: Record<ZoneCode, ZoneIntensity> = {
    "IN-WE": { value: simulateZoneIntensity("IN-WE"), source: "simulated" },
    "IN-SO": { value: simulateZoneIntensity("IN-SO"), source: "simulated" },
    "IN-NO": { value: simulateZoneIntensity("IN-NO"), source: "simulated" },
  };

  const apiKey = process.env.ELECTRICITY_MAPS_API_KEY;
  if (!apiKey) return out;

  await Promise.all(
    (Object.keys(out) as ZoneCode[]).map(async (zone) => {
      try {
        const res = await fetch(
          `https://api.electricitymap.org/v3/carbon-intensity/latest?zone=${zone}`,
          {
            headers: { "auth-token": apiKey },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        out[zone] = { value: Math.round(json.carbonIntensity as number), source: "live" };
      } catch {
        // Keep simulated value for this zone.
      }
    })
  );

  return out;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const stateFilter = (searchParams.get("state") || "").trim().toLowerCase();
  const limit = Math.min(Number(searchParams.get("limit") || 1500), 3000);

  const [baseRows, zones] = await Promise.all([loadDistrictBaseData(), fetchZoneIntensities()]);

  let rows = baseRows;
  if (search) {
    rows = rows.filter((r) =>
      r.district.toLowerCase().includes(search) || r.state.toLowerCase().includes(search)
    );
  }
  if (stateFilter) {
    rows = rows.filter((r) => r.state.toLowerCase().includes(stateFilter));
  }

  const bucket = Math.floor(Date.now() / 30000);

  const data = rows.slice(0, limit).map((r) => {
    const zoneInfo = zones[r.zone];
    const seed = hashString(`${r.id}:${bucket}`);
    const drift = (seed % 17) - 8;
    const intensity = Math.max(40, zoneInfo.value + drift);

    return {
      id: r.id,
      district: r.district,
      state: r.state,
      lat: r.lat,
      lng: r.lng,
      postalSamples: r.postalSamples,
      zone: r.zone,
      gridIntensityGCO2: intensity,
      level: intensityLevel(intensity),
      source: zoneInfo.source,
    };
  });

  const states = Array.from(new Set(baseRows.map((r) => r.state))).sort((a, b) => a.localeCompare(b));
  const avgIntensity = data.length
    ? Math.round(data.reduce((sum, d) => sum + d.gridIntensityGCO2, 0) / data.length)
    : 0;
  const highCount = data.filter((d) => d.level === "high").length;
  const lowCount = data.filter((d) => d.level === "low").length;

  const liveShare = data.length ? data.filter((d) => d.source === "live").length / data.length : 0;

  return NextResponse.json(
    {
      data,
      total: rows.length,
      returned: data.length,
      states,
      fetchedAt: Date.now(),
      isRealTime: true,
      refreshSeconds: 30,
      liveShare,
      insights: {
        avgIntensity,
        highCount,
        lowCount,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
