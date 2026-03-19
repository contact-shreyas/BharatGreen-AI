"use client";
// ─────────────────────────────────────────────────────────────────────────────
// BharatGreen AI — Interactive Data-Centre World Map
// Dark-ocean theme · India highlighted · Glowing markers · Live intensity labels
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { REGIONS } from "@/lib/regionalData";
import { LiveRegionState } from "@/lib/useLiveGridData";
import clsx from "clsx";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ISO numeric codes for India
const INDIA_CODE = "356";

// ── Colour helpers ────────────────────────────────────────────────────────────
function markerFill(level: string, isSelected: boolean) {
  if (isSelected) return "#818cf8"; // indigo-400
  if (level === "low")    return "#4ade80"; // green-400
  if (level === "medium") return "#fbbf24"; // amber-400
  return "#f87171"; // red-400
}
function markerGlow(level: string, isSelected: boolean) {
  if (isSelected) return "rgba(129,140,248,0.45)";
  if (level === "low")    return "rgba(74,222,128,0.40)";
  if (level === "medium") return "rgba(251,191,36,0.40)";
  return "rgba(248,113,113,0.40)";
}

function trendLabel(trend?: "up" | "down" | "flat") {
  if (trend === "up")   return " ▲";
  if (trend === "down") return " ▼";
  return "";
}
function trendFill(trend?: "up" | "down" | "flat") {
  if (trend === "up")   return "#f87171";
  if (trend === "down") return "#4ade80";
  return "#94a3b8";
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  selectedRegionId: string;
  onSelectRegion: (id: string) => void;
  liveData: Record<string, LiveRegionState>;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function DataCenterMap({ selectedRegionId, onSelectRegion, liveData }: Props) {
  const [tooltip, setTooltip] = useState<{ regionId: string; x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  const hoveredRegion = tooltip ? REGIONS.find((r) => r.id === tooltip.regionId) : null;
  const hoveredLive   = tooltip ? liveData[tooltip.regionId] : null;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.5, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.5, 1));
  const handleReset = () => setZoom(1);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "linear-gradient(135deg,#0f1722 0%,#0d1f35 100%)", border: "1px solid #1e3a5f" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid #1e3a5f" }}>
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            Live Data-Centre Map
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "#64a0c8" }}>
            Click a marker to select · Brighter glow = higher live intensity
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-5 text-[11px]">
          {[
            { color: "#4ade80", label: "Low < 150" },
            { color: "#fbbf24", label: "Med 150–600" },
            { color: "#f87171", label: "High > 600" },
            { color: "#818cf8", label: "Selected" },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5" style={{ color: "#94a3b8" }}>
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }}
              />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Map ────────────────────────────────────────────────────────── */}
      <div className="relative">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 165, center: [68, 22] }}
          style={{ width: "100%", height: "500px", background: "transparent" }}
        >
          {/* SVG defs: glow filter for India, drop-shadow for markers */}
          <defs>
            <filter id="india-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="marker-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#22c55e" floodOpacity="0.5" />
            </filter>
            <radialGradient id="ocean-center" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#0d1f35" />
              <stop offset="100%" stopColor="#070e1a" />
            </radialGradient>
          </defs>

          {/* Ocean background */}
          <rect width="800" height="600" fill="url(#ocean-center)" />

          <ZoomableGroup zoom={zoom}>
            {/* ── Ocean graticule grid ────────────────────────────────── */}
            <Graticule stroke="#1a2f4a" strokeWidth={0.4} />

            {/* ── Countries ──────────────────────────────────────────── */}
            <Geographies geography={GEO_URL}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo) => {
                  const isIndia = geo.id === INDIA_CODE;
                  // Enhanced boundary visibility: India bright green, rest slate-gray with better contrast
                  const strokeColor = isIndia ? "#22c55e" : "#64748b";
                  const strokeWidth = isIndia ? 1.2 : 0.55;  // Increased from 0.3 for better visibility
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={isIndia ? "#174d35" : "#152435"}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      style={{
                        default: {
                          outline: "none",
                          filter: isIndia ? "url(#india-glow)" : undefined,
                        },
                        hover:   {
                          fill: isIndia ? "#1d6040" : "#1c2f45",
                          outline: "none",
                          filter: isIndia ? "url(#india-glow)" : undefined,
                        },
                        pressed: { outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* ── Markers ────────────────────────────────────────────── */}
            {REGIONS.map((region) => {
              const isSelected = region.id === selectedRegionId;
              const isIndian   = !!region.isIndian;
              const live = liveData[region.id];
              const fill = markerFill(region.level, isSelected);
              const glow = markerGlow(region.level, isSelected);
              const displayVal = live?.gridIntensityGCO2 ?? region.gridIntensityGCO2;
              const rOuter = isSelected ? 20 : isIndian ? 15 : 12;
              const rInner = isSelected ? 10 : isIndian ? 8  : 6;

              return (
                <Marker
                  key={region.id}
                  coordinates={[region.lng, region.lat]}
                  onClick={() => onSelectRegion(region.id)}
                  onMouseEnter={(e: React.MouseEvent) => {
                    const rect = (e.currentTarget as SVGElement).closest("svg")!.getBoundingClientRect();
                    setTooltip({ regionId: region.id, x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Outermost pulse ring (Indian DCs only) */}
                  {isIndian && (
                    <circle
                      r={rOuter + 8}
                      fill="none"
                      stroke={fill}
                      strokeWidth={0.8}
                      strokeOpacity={0.25}
                    />
                  )}
                  {/* Outer glow ring */}
                  <circle r={rOuter} fill={glow} stroke="none" />
                  {/* Mid ring */}
                  <circle
                    r={rInner + 3}
                    fill="none"
                    stroke={fill}
                    strokeWidth={isSelected ? 2 : 1.2}
                    strokeOpacity={0.7}
                  />
                  {/* Core dot */}
                  <circle
                    r={rInner}
                    fill={fill}
                    stroke="#0f1722"
                    strokeWidth={1.5}
                    style={{ filter: isIndian ? "url(#marker-shadow)" : undefined }}
                  />
                  {/* Centre dot for selected */}
                  {isSelected && <circle r={3} fill="#fff" opacity={0.85} />}

                  {/* Live value label */}
                  <text
                    textAnchor="middle"
                    y={-(rOuter + 5)}
                    style={{
                      fontSize: isIndian ? 9.5 : 8,
                      fontWeight: "700",
                      fill: fill,
                      letterSpacing: "-0.3px",
                      pointerEvents: "none",
                    }}
                  >
                    {displayVal}g
                    <tspan style={{ fontSize: 7.5, fill: trendFill(live?.trend) }}>
                      {trendLabel(live?.trend)}
                    </tspan>
                  </text>
                  {/* City name */}
                  <text
                    textAnchor="middle"
                    y={rOuter + 13}
                    style={{
                      fontSize: isSelected ? 9 : isIndian ? 8 : 7,
                      fontWeight: isSelected ? "700" : isIndian ? "600" : "400",
                      fill: isSelected ? fill : isIndian ? "#d1fae5" : "#64748b",
                      pointerEvents: "none",
                    }}
                  >
                    {region.displayName.split(" (")[0].split(" ")[0]}
                  </text>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* ── Zoom Controls ──────────────────────────────────────────── */}
        <div className="absolute top-4 right-4 z-20 flex gap-1.5">
          <button
            onClick={handleZoomIn}
            className="w-9 h-9 rounded-lg bg-green-500 hover:bg-green-600 text-white shadow-lg transition-all flex items-center justify-center"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleReset}
            className="w-9 h-9 rounded-lg bg-gray-600 hover:bg-gray-700 text-white shadow-lg transition-all flex items-center justify-center text-[10px] font-bold"
            title="Reset zoom"
          >
            1x
          </button>
          <button
            onClick={handleZoomOut}
            className="w-9 h-9 rounded-lg bg-gray-600 hover:bg-gray-700 text-white shadow-lg transition-all flex items-center justify-center"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
        </div>

        {/* ── Zoom Level Indicator ───────────────────────────────────── */}
        {zoom !== 1 && (
          <div className="absolute bottom-4 right-4 z-20 bg-gray-900/80 text-white text-[10px] px-2.5 py-1 rounded-md font-mono">
            {(zoom * 100).toFixed(0)}% zoom
          </div>
        )}

        {/* ── Rich Tooltip ──────────────────────────────────────────── */}
        {tooltip && hoveredRegion && (
          <div
            className="pointer-events-none absolute z-30 text-xs rounded-xl shadow-2xl"
            style={{
              left: tooltip.x + 14,
              top: tooltip.y - 16,
              transform: tooltip.x > 640 ? "translateX(-108%)" : undefined,
              background: "linear-gradient(145deg,#111827,#1a2a3a)",
              border: "1px solid #1e3a5f",
              minWidth: 210,
              padding: "12px 14px",
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="font-bold text-white text-[12px] leading-tight">{hoveredRegion.displayName.split(" (")[0]}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#64a0c8" }}>
                  {hoveredRegion.provider} · {hoveredRegion.country}
                </p>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: markerFill(hoveredRegion.level, false) + "22",
                  color: markerFill(hoveredRegion.level, false),
                  border: `1px solid ${markerFill(hoveredRegion.level, false)}44`,
                }}
              >
                {hoveredRegion.rating}
              </span>
            </div>
            <div className="space-y-1.5">
              {[
                {
                  k: "Grid intensity",
                  v: `${hoveredLive?.gridIntensityGCO2 ?? hoveredRegion.gridIntensityGCO2} g CO₂/kWh`,
                  accent: hoveredLive?.trend !== "flat",
                },
                { k: "WUE",  v: `${hoveredRegion.wueLitersPerKWh} L/kWh`, accent: false },
                { k: "PUE",  v: `${hoveredRegion.pue}`,                    accent: false },
                { k: "Carbon price (est.)", v: `₹${Math.round((hoveredLive?.gridIntensityGCO2 ?? hoveredRegion.gridIntensityGCO2) * 0.00075 * 1000)} / job hr`, accent: false },
              ].map(({ k, v, accent }) => (
                <div key={k} className="flex justify-between items-center">
                  <span style={{ color: "#64a0c8" }}>{k}</span>
                  <span
                    className="font-semibold"
                    style={{ color: accent ? trendFill(hoveredLive?.trend) : "#e2e8f0" }}
                  >
                    {v}
                    {hoveredLive && k === "Grid intensity" && (
                      <span style={{ color: trendFill(hoveredLive.trend), marginLeft: 3 }}>
                        {trendLabel(hoveredLive.trend)}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-[9.5px] font-medium rounded-md py-1"
               style={{ background: "#6366f122", color: "#818cf8", border: "1px solid #6366f133" }}>
              Click to run workload in this region
            </p>
          </div>
        )}
      </div>

      {/* ── Region Pills ───────────────────────────────────────────────── */}
      <div className="px-5 py-3 flex flex-wrap gap-2" style={{ borderTop: "1px solid #1e3a5f" }}>
        {REGIONS.map((region) => {
          const isSelected = region.id === selectedRegionId;
          const live = liveData[region.id];
          const fill = markerFill(region.level, isSelected);
          return (
            <button
              key={region.id}
              onClick={() => onSelectRegion(region.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
              style={{
                background: isSelected ? `${fill}18` : "#162032",
                border: `1px solid ${isSelected ? fill : "#1e3a5f"}`,
                color: isSelected ? fill : "#94a3b8",
                boxShadow: isSelected ? `0 0 8px ${fill}33` : "none",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
                style={{ background: fill, boxShadow: `0 0 4px ${fill}` }}
              />
              {region.displayName.split(" (")[0].split(" ").slice(0, 1).join(" ")}
              {live && (
                <span style={{ color: fill, fontSize: 10 }}>
                  {live.gridIntensityGCO2}g
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
