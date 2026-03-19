import { NextResponse } from "next/server";

export const runtime = "nodejs";

let polygonCache: any = null;
let cacheAt = 0;

const CACHE_MS = 12 * 60 * 60 * 1000;

async function loadDistrictPolygons() {
  const now = Date.now();
  if (polygonCache && now - cacheAt < CACHE_MS) return polygonCache;

  // GeoBoundaries ADM2 = district-level boundaries for India
  const metaRes = await fetch("https://www.geoboundaries.org/api/current/gbOpen/IND/ADM2/", {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!metaRes.ok) throw new Error(`Meta fetch failed: ${metaRes.status}`);

  const meta = await metaRes.json();
  const geoUrl = (meta?.gjDownloadURL || meta?.gjDownloadURL?.toString?.() || "").trim();
  if (!geoUrl) throw new Error("GeoJSON download URL missing from GeoBoundaries response");

  const geoRes = await fetch(geoUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!geoRes.ok) throw new Error(`GeoJSON fetch failed: ${geoRes.status}`);

  const geoJson = await geoRes.json();

  polygonCache = geoJson;
  cacheAt = now;
  return polygonCache;
}

export async function GET() {
  try {
    const geoJson = await loadDistrictPolygons();
    return NextResponse.json(
      { data: geoJson, fetchedAt: Date.now(), source: "geoboundaries" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load district polygons";
    return NextResponse.json(
      { data: null, fetchedAt: Date.now(), source: "none", error: message },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
