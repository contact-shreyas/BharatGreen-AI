"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { REGIONS } from "@/lib/regionalData";
import { LiveRegionState } from "@/lib/useLiveGridData";

interface Props {
  selectedRegionId: string;
  onSelectRegion: (id: string) => void;
  liveData: Record<string, LiveRegionState>;
}

interface DistrictLiveRecord {
  id: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  postalSamples: number;
  zone: string;
  gridIntensityGCO2: number;
  level: "low" | "medium" | "high";
  source: "live" | "simulated";
}

interface DistrictApiResponse {
  data: DistrictLiveRecord[];
  states?: string[];
  insights?: {
    avgIntensity: number;
    highCount: number;
    lowCount: number;
  };
}

interface DistrictPolygonFeature {
  type: string;
  properties?: Record<string, unknown>;
  geometry: unknown;
}

interface DistrictPolygonCollection {
  type: string;
  features: DistrictPolygonFeature[];
}

type SortKey = "district" | "state" | "gridIntensityGCO2" | "level" | "zone" | "source";
type SortDir = "asc" | "desc";

function levelColor(level: string, selected: boolean): string {
  if (selected) return "#7c3aed";
  if (level === "low") return "#16a34a";
  if (level === "medium") return "#f59e0b";
  return "#dc2626";
}

function providerSymbol(provider: string): string {
  const p = provider.toLowerCase();
  if (p.includes("aws")) return "☁";
  if (p.includes("azure")) return "⚡";
  if (p.includes("google") || p.includes("gcp")) return "◉";
  return "●";
}

function makeIcon(level: string, provider: string, selected: boolean) {
  const color = levelColor(level, selected);
  const symbol = providerSymbol(provider);

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.18;animation:bgaPulse 2.2s ease-in-out infinite;"></div>
        <div style="position:relative;width:20px;height:20px;border-radius:50%;background:${color};border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:11px;font-weight:700;box-shadow:0 0 10px ${color};">
          ${symbol}
        </div>
      </div>
      <style>
        @keyframes bgaPulse {
          0% { transform: scale(0.9); opacity: 0.22; }
          70% { transform: scale(1.55); opacity: 0.05; }
          100% { transform: scale(1.65); opacity: 0; }
        }
      </style>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });
}

function districtDotIcon(level: "low" | "medium" | "high", selected: boolean) {
  const color = level === "low" ? "#16a34a" : level === "medium" ? "#f59e0b" : "#dc2626";
  const size = selected ? 14 : 10;
  const border = selected ? "#7c3aed" : "#ffffff";
  const glow = selected ? "#7c3aed" : color;
  return L.divIcon({
    className: "",
    html: `
      <div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};border:2px solid ${border};box-shadow:0 0 8px ${glow};"></div>
    `,
    iconSize: [size, size],
    iconAnchor: [Math.round(size / 2), Math.round(size / 2)],
    popupAnchor: [0, -6],
  });
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/district/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function colorForIntensity(intensity: number): string {
  if (intensity < 300) return "#1a9850";
  if (intensity < 450) return "#66bd63";
  if (intensity < 600) return "#fdae61";
  if (intensity < 750) return "#f46d43";
  return "#d73027";
}

function buildCSV(rows: DistrictLiveRecord[]): string {
  const header = [
    "district",
    "state",
    "zone",
    "gridIntensityGCO2",
    "level",
    "source",
    "postalSamples",
    "lat",
    "lng",
  ].join(",");

  const body = rows
    .map((r) => [
      r.district,
      r.state,
      r.zone,
      r.gridIntensityGCO2,
      r.level,
      r.source,
      r.postalSamples,
      r.lat,
      r.lng,
    ])
    .map((arr) => arr.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return `${header}\n${body}`;
}

export default function IndiaRealisticMapClient({ selectedRegionId, onSelectRegion, liveData }: Props) {
  const center = useMemo<[number, number]>(() => [22.8, 80.5], []);
  const [districts, setDistricts] = useState<DistrictLiveRecord[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [stateFilter, setStateFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showChoropleth, setShowChoropleth] = useState<boolean>(true);
  const [polygons, setPolygons] = useState<DistrictPolygonCollection | null>(null);
  const [polygonError, setPolygonError] = useState<string>("");
  const [avgIntensity, setAvgIntensity] = useState<number>(0);
  const [highCount, setHighCount] = useState<number>(0);
  const [lowCount, setLowCount] = useState<number>(0);
  const [sortKey, setSortKey] = useState<SortKey>("gridIntensityGCO2");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const markerRefs = useRef<Record<string, any>>({});

  const districtByName = useMemo(() => {
    const map = new Map<string, DistrictLiveRecord>();
    districts.forEach((d) => {
      map.set(`${normalizeName(d.state)}|${normalizeName(d.district)}`, d);
      map.set(normalizeName(d.district), d);
    });
    return map;
  }, [districts]);

  const filteredDistricts = useMemo(() => {
    return districts.filter((d) => {
      if (stateFilter && d.state !== stateFilter) return false;
      if (!search.trim()) return true;
      const s = search.trim().toLowerCase();
      return d.state.toLowerCase().includes(s) || d.district.toLowerCase().includes(s);
    });
  }, [districts, search, stateFilter]);

  const sortedDistricts = useMemo(() => {
    const rows = [...filteredDistricts];
    rows.sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;

      if (sortKey === "gridIntensityGCO2") {
        return (a.gridIntensityGCO2 - b.gridIntensityGCO2) * mul;
      }

      if (sortKey === "district") return a.district.localeCompare(b.district) * mul;
      if (sortKey === "state") return a.state.localeCompare(b.state) * mul;
      if (sortKey === "zone") return a.zone.localeCompare(b.zone) * mul;
      if (sortKey === "source") return a.source.localeCompare(b.source) * mul;

      const rank: Record<DistrictLiveRecord["level"], number> = { low: 1, medium: 2, high: 3 };
      return (rank[a.level] - rank[b.level]) * mul;
    });

    return rows;
  }, [filteredDistricts, sortDir, sortKey]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (stateFilter) count += 1;
    if (search.trim()) count += 1;
    if (sortKey !== "gridIntensityGCO2" || sortDir !== "desc") count += 1;
    if (!showHeatmap) count += 1;
    if (!showChoropleth) count += 1;
    return count;
  }, [search, showChoropleth, showHeatmap, sortDir, sortKey, stateFilter]);

  const changeSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDir(nextKey === "district" || nextKey === "state" ? "asc" : "desc");
  };

  const focusDistrictFromTable = (d: DistrictLiveRecord) => {
    setSelectedDistrictId(d.id);
    if (mapInstance) {
      mapInstance.flyTo([d.lat, d.lng], 8, { duration: 0.7 });
    }
    setTimeout(() => {
      markerRefs.current[d.id]?.openPopup?.();
    }, 180);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchDistricts = async () => {
      try {
        const q = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : "";
        const sf = stateFilter ? `&state=${encodeURIComponent(stateFilter)}` : "";
        const res = await fetch(`/api/district-intensity?limit=3000${q}${sf}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as DistrictApiResponse;
        if (cancelled) return;
        setDistricts((json.data || []) as DistrictLiveRecord[]);
        if (json.states?.length) setStates(json.states);
        if (json.insights) {
          setAvgIntensity(json.insights.avgIntensity);
          setHighCount(json.insights.highCount);
          setLowCount(json.insights.lowCount);
        }
        setLastUpdated(Date.now());
        setError("");
      } catch {
        if (!cancelled) setError("District feed unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDistricts();
    const id = setInterval(fetchDistricts, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [search, stateFilter]);

  useEffect(() => {
    let cancelled = false;

    const fetchPolygons = async () => {
      try {
        const res = await fetch("/api/district-polygons", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        if (json.data?.features?.length) {
          setPolygons(json.data as DistrictPolygonCollection);
          setPolygonError("");
        } else {
          setPolygonError(json.error || "District polygons unavailable");
        }
      } catch {
        if (!cancelled) setPolygonError("District polygons unavailable");
      }
    };

    fetchPolygons();
    return () => {
      cancelled = true;
    };
  }, []);

  const onExportCSV = () => {
    const csv = buildCSV(filteredDistricts);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `district-intensity-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onResetView = () => {
    setSelectedDistrictId("");
    if (mapInstance) {
      mapInstance.flyTo(center, 5, { duration: 0.6 });
    }
  };

  const onClearFilters = () => {
    setSearch("");
    setStateFilter("");
    setSortKey("gridIntensityGCO2");
    setSortDir("desc");
    setShowHeatmap(true);
    setShowChoropleth(true);
    setSelectedDistrictId("");
    if (mapInstance) {
      mapInstance.flyTo(center, 5, { duration: 0.6 });
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-300 bg-white">
      <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Realistic India Map (OSM)</h3>
          <p className="text-xs text-gray-500 mt-0.5">District-level live map · refreshes every 30s</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="h-8 rounded-md border border-gray-300 px-2 text-xs text-gray-700 outline-none focus:border-green-500"
          >
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search district/state"
            className="h-8 w-44 rounded-md border border-gray-300 px-2 text-xs text-gray-700 outline-none focus:border-green-500"
          />
          <button
            onClick={onExportCSV}
            className="h-8 px-3 rounded-md border border-blue-300 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowHeatmap((v) => !v)}
            className={`h-8 px-3 rounded-md border text-xs font-medium ${showHeatmap ? "border-orange-300 bg-orange-50 text-orange-700" : "border-gray-300 bg-gray-50 text-gray-700"}`}
          >
            Heatmap {showHeatmap ? "ON" : "OFF"}
          </button>
          <button
            onClick={() => setShowChoropleth((v) => !v)}
            className={`h-8 px-3 rounded-md border text-xs font-medium ${showChoropleth ? "border-purple-300 bg-purple-50 text-purple-700" : "border-gray-300 bg-gray-50 text-gray-700"}`}
          >
            Choropleth {showChoropleth ? "ON" : "OFF"}
          </button>
          <button
            onClick={onResetView}
            className="h-8 px-3 rounded-md border border-gray-300 bg-gray-50 text-gray-700 text-xs font-medium hover:bg-gray-100"
          >
            Reset View
          </button>
          <button
            onClick={onClearFilters}
            className="h-8 px-3 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100"
          >
            <span className="inline-flex items-center gap-1.5">
              Clear Filters
              <span className="inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold text-white">
                {activeFiltersCount}
              </span>
            </span>
          </button>
          <span className="text-[11px] text-gray-600">Districts: {filteredDistricts.length || "..."}</span>
          <span
            className={`text-[11px] px-2 py-1 rounded-full ${error ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}
          >
            {error ? error : "Real-time"}
          </span>
        </div>
      </div>

      <div className="px-5 py-2 border-b border-gray-200 bg-gray-50 text-xs text-gray-700 flex items-center gap-6">
        <span>Avg intensity: <b>{avgIntensity}</b> gCO2/kWh</span>
        <span>Low districts: <b>{lowCount}</b></span>
        <span>High districts: <b>{highCount}</b></span>
        {polygonError && <span className="text-amber-700">Polygons: {polygonError}</span>}
      </div>

      <MapContainer
        center={center}
        zoom={5}
        whenCreated={setMapInstance}
        className="w-full"
        style={{ height: 520 }}
      >
        <TileLayer
          // OSM Standard closely matches your screenshot style
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* District boundary polygons for choropleth */}
        {showChoropleth && polygons && (
          <GeoJSON
            data={polygons as unknown as GeoJSON.GeoJsonObject}
            style={(feature: any) => {
              const props = feature?.properties || {};
              const stateName = String(props.shapeName_1 || props.ADM1_EN || props.state || "");
              const districtName = String(props.shapeName || props.shapeName_2 || props.ADM2_EN || props.district || "");

              const keyed = districtByName.get(`${normalizeName(stateName)}|${normalizeName(districtName)}`)
                || districtByName.get(normalizeName(districtName));

              const intensity = keyed?.gridIntensityGCO2 ?? 550;
              return {
                color: "#334155",
                weight: 0.45,
                fillOpacity: 0.38,
                fillColor: colorForIntensity(intensity),
              };
            }}
            onEachFeature={(feature: any, layer: any) => {
              const props = feature?.properties || {};
              const stateName = String(props.shapeName_1 || props.ADM1_EN || props.state || "");
              const districtName = String(props.shapeName || props.shapeName_2 || props.ADM2_EN || props.district || "");
              const keyed = districtByName.get(`${normalizeName(stateName)}|${normalizeName(districtName)}`)
                || districtByName.get(normalizeName(districtName));

              const info = keyed
                ? `${districtName}, ${stateName}<br/>${keyed.gridIntensityGCO2} gCO2/kWh · ${keyed.level} · ${keyed.source}`
                : `${districtName}, ${stateName}<br/>No live join`;

              layer.bindTooltip(info, { sticky: true });
            }}
          />
        )}

        {/* Heatmap layer */}
        {showHeatmap && filteredDistricts.map((d) => {
          const intensity = d.gridIntensityGCO2;
          const radius = Math.min(18000, Math.max(5000, intensity * 18));
          const color = colorForIntensity(intensity);
          return (
            <Circle
              key={`heat-${d.id}`}
              center={[d.lat, d.lng]}
              radius={radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.14,
                weight: 0,
              }}
            />
          );
        })}

        {/* District-level live points */}
        {filteredDistricts.map((d) => (
          <Marker
            key={d.id}
            ref={(m: any) => {
              if (m) markerRefs.current[d.id] = m;
            }}
            position={[d.lat, d.lng]}
            icon={districtDotIcon(d.level, selectedDistrictId === d.id)}
          >
            <Popup>
              <div className="text-sm min-w-[230px]">
                <p className="font-semibold text-gray-900">{d.district}</p>
                <p className="text-xs text-gray-600">{d.state} · Zone {d.zone}</p>
                <div className="mt-1.5 text-xs text-gray-800">
                  <div><span className="font-medium">Grid:</span> {d.gridIntensityGCO2} gCO2/kWh</div>
                  <div><span className="font-medium">Level:</span> {d.level}</div>
                  <div><span className="font-medium">PIN samples:</span> {d.postalSamples}</div>
                  <div><span className="font-medium">Source:</span> {d.source}</div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Data-center hub markers */}
        {REGIONS.map((region) => {
          const live = liveData[region.id];
          const intensity = live?.gridIntensityGCO2 ?? region.gridIntensityGCO2;
          const trend = live?.trend ?? "flat";
          const selected = selectedRegionId === region.id;
          const icon = makeIcon(region.level, region.provider, selected);

          return (
            <Marker
              key={region.id}
              position={[region.lat, region.lng]}
              icon={icon}
              eventHandlers={{ click: () => onSelectRegion(region.id) }}
            >
              <Popup>
                <div className="text-sm min-w-[210px]">
                  <p className="font-semibold text-gray-900">{region.displayName}</p>
                  <p className="text-xs text-gray-600">{region.provider} · {region.country}</p>
                  <div className="mt-1.5 text-xs text-gray-800">
                    <div><span className="font-medium">Grid:</span> {intensity} gCO2/kWh</div>
                    <div><span className="font-medium">Trend:</span> {trend}</div>
                    <div><span className="font-medium">PUE:</span> {region.pue}</div>
                    <div><span className="font-medium">WUE:</span> {region.wueLitersPerKWh} L/kWh</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="px-5 py-2 border-t border-gray-200 text-[11px] text-gray-600 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600 inline-block" />Low</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Medium</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600 inline-block" />High</span>
        </div>
        <div>
          {loading ? "Loading districts..." : `Last update: ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "-"}`}
        </div>
      </div>

      <div className="border-t border-gray-200">
        <div className="px-5 py-2 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
          <span className="font-semibold text-gray-700">District Data Table (synced with filters)</span>
          <span>Showing {Math.min(sortedDistricts.length, 250)} of {sortedDistricts.length}</span>
        </div>
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-gray-200">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-2 cursor-pointer" onClick={() => changeSort("district")}>District {sortKey === "district" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                <th className="px-4 py-2 cursor-pointer" onClick={() => changeSort("state")}>State {sortKey === "state" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                <th className="px-4 py-2 cursor-pointer" onClick={() => changeSort("gridIntensityGCO2")}>Grid {sortKey === "gridIntensityGCO2" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                <th className="px-4 py-2 cursor-pointer" onClick={() => changeSort("level")}>Level {sortKey === "level" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                <th className="px-4 py-2 cursor-pointer" onClick={() => changeSort("zone")}>Zone {sortKey === "zone" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                <th className="px-4 py-2 cursor-pointer" onClick={() => changeSort("source")}>Source {sortKey === "source" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
              </tr>
            </thead>
            <tbody>
              {sortedDistricts.slice(0, 250).map((d) => (
                <tr
                  key={`tbl-${d.id}`}
                  onClick={() => focusDistrictFromTable(d)}
                  className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${selectedDistrictId === d.id ? "bg-purple-50" : ""}`}
                >
                  <td className="px-4 py-2 text-gray-800">{d.district}</td>
                  <td className="px-4 py-2 text-gray-700">{d.state}</td>
                  <td className="px-4 py-2 font-semibold text-gray-800">{d.gridIntensityGCO2}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full ${d.level === "low" ? "bg-green-50 text-green-700" : d.level === "medium" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                      {d.level}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{d.zone}</td>
                  <td className="px-4 py-2 text-gray-700">{d.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
