"use client";

import clsx from "clsx";
import { REGIONS } from "@/lib/regionalData";
import { Rating, RegionData } from "@/lib/types";
import { Download } from "lucide-react";

// ── Shared helpers ────────────────────────────────────────────────────────────
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("bg-white rounded-xl border border-gray-200 shadow-sm p-5", className)}>
      {children}
    </div>
  );
}

type BadgeColor = "green" | "amber" | "red" | "gray" | "blue" | "purple";
function Badge({ color, children }: { color: BadgeColor; children: React.ReactNode }) {
  const c: Record<BadgeColor, string> = {
    green:  "bg-green-50  text-green-700  border-green-200",
    amber:  "bg-amber-50  text-amber-700  border-amber-200",
    red:    "bg-red-50    text-red-700    border-red-200",
    gray:   "bg-gray-50   text-gray-500   border-gray-200",
    blue:   "bg-blue-50   text-blue-700   border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <span className={clsx("inline-block px-2 py-0.5 rounded text-[10px] font-semibold border", c[color])}>
      {children}
    </span>
  );
}

function KPIStat({
  label, value, sub, note,
}: {
  label: string; value: string; sub?: string; note?: string;
}) {
  return (
    <Card>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{value}</span>
        {sub && <span className="text-[11px] text-gray-400">{sub}</span>}
      </div>
      {note && <p className="text-[10.5px] mt-1.5 text-gray-400">{note}</p>}
    </Card>
  );
}

function BarPct({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={clsx("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── View router ───────────────────────────────────────────────────────────────
interface Props { view: string; }

export default function ContentView({ view }: Props) {
  const titles: Record<string, string> = {
    "AI Workloads":     "AI Workloads",
    "Data Centers":     "Data Centers",
    "Carbon Report":    "Carbon Report",
    "Scope 1 / 2 / 3": "GHG Scope 1 / 2 / 3",
    "Offsets & Credits":"Offsets & Carbon Credits",
    "Water Usage":      "Water Usage Analytics",
    "GPU Efficiency":   "GPU Efficiency",
    "Energy Mix":       "Energy Mix",
    "ESG Reports":      "ESG Reports",
    "Audit Trail":      "Audit Trail",
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50 overflow-y-auto">
      <header className="flex items-center justify-between px-7 py-4 bg-white border-b border-gray-200 sticky top-0 z-10">
        <div>
          <h1 className="text-base font-semibold text-gray-900">{titles[view] ?? view}</h1>
          <p className="text-xs text-gray-400 mt-0.5">BharatGreen AI · India Enterprise Platform</p>
        </div>
      </header>
      <main className="flex-1 px-7 py-6">
        {viewFor(view)}
      </main>
    </div>
  );
}

function viewFor(view: string) {
  switch (view) {
    case "AI Workloads":     return <AIWorkloadsView />;
    case "Data Centers":     return <DataCentersView />;
    case "Carbon Report":    return <CarbonReportView />;
    case "Scope 1 / 2 / 3": return <ScopesView />;
    case "Offsets & Credits":return <OffsetsView />;
    case "Water Usage":      return <WaterUsageView />;
    case "GPU Efficiency":   return <GPUEfficiencyView />;
    case "Energy Mix":       return <EnergyMixView />;
    case "ESG Reports":      return <ESGReportsView />;
    case "Audit Trail":      return <AuditTrailView />;
    default:                 return <p className="text-gray-400 text-sm">Page not found.</p>;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AI Workloads
// ═══════════════════════════════════════════════════════════════════════════════
type JobStatus = "Running" | "Queued" | "Complete";
const WORKLOADS: {
  name: string; gpu: string; count: number; region: string;
  hours: number; carbon: string; status: JobStatus;
}[] = [
  { name: "LLaMA-3 70B Fine-tune",         gpu: "H100 SXM5", count: 64,  region: "Mumbai",    hours: 72,  carbon: "2,304",  status: "Running"  },
  { name: "Stable Diffusion v3 Inference", gpu: "A10G",      count: 8,   region: "Bengaluru", hours: 8,   carbon: "12.4",   status: "Running"  },
  { name: "GPT-4 Scale Pre-training",      gpu: "H100 SXM5", count: 512, region: "Chennai",   hours: 240, carbon: "18,432", status: "Queued"   },
  { name: "BERT Sentiment Classifier",     gpu: "T4",        count: 4,   region: "Hyderabad", hours: 3,   carbon: "2.1",    status: "Complete" },
  { name: "Recommendation Engine Retrain", gpu: "A100 SXM4", count: 16,  region: "Mumbai",    hours: 12,  carbon: "184.3",  status: "Complete" },
  { name: "Vision Transformer ImageNet",   gpu: "A100 PCIe", count: 8,   region: "Pune",      hours: 48,  carbon: "112.0",  status: "Running"  },
];

function AIWorkloadsView() {
  const statusColor: Record<JobStatus, BadgeColor> = { Running: "green", Queued: "amber", Complete: "gray" };
  const TH = ["Workload", "GPU", "Count", "Region", "Duration", "Carbon (kg CO₂e)", "Status"];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="Active Jobs"      value="3"      sub="jobs"      note="↑ 2 since yesterday" />
        <KPIStat label="GPUs in Use"      value="88"     sub="GPUs"      />
        <KPIStat label="Monthly Carbon"   value="20,934" sub="kg CO₂e"   note="↑ 12% vs Feb" />
        <KPIStat label="Avg Utilization"  value="84"     sub="%"         note="↓ 3% vs last week" />
      </div>
      <Card>
        <p className="text-xs font-semibold text-gray-900 mb-4">Active &amp; Recent Workloads</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {TH.map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-[9.5px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WORKLOADS.map((w) => (
                <tr key={w.name} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5 text-[12px] font-medium text-gray-800">{w.name}</td>
                  <td className="px-3 py-2.5 text-[11.5px] text-gray-500 whitespace-nowrap">{w.gpu}</td>
                  <td className="px-3 py-2.5 text-[12px] tabular-nums text-gray-700">{w.count}</td>
                  <td className="px-3 py-2.5 text-[11.5px] text-gray-500">{w.region}</td>
                  <td className="px-3 py-2.5 text-[11.5px] tabular-nums text-gray-500">{w.hours}h</td>
                  <td className="px-3 py-2.5 text-[12px] tabular-nums font-semibold text-gray-800">{w.carbon}</td>
                  <td className="px-3 py-2.5"><Badge color={statusColor[w.status]}>{w.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Data Centers
// ═══════════════════════════════════════════════════════════════════════════════
function DataCentersView() {
  const indian = [...REGIONS].filter((r) => r.isIndian).sort((a, b) => a.gridIntensityGCO2 - b.gridIntensityGCO2);
  const global = [...REGIONS].filter((r) => !r.isIndian).sort((a, b) => a.gridIntensityGCO2 - b.gridIntensityGCO2);
  const ratingColor: Record<Rating, BadgeColor> = { Best: "green", Med: "amber", Low: "red" };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="Indian Centers"    value="6"    sub="facilities"   />
        <KPIStat label="Lowest Intensity"  value="600"  sub="gCO₂/kWh"     note="Chennai (GCP)" />
        <KPIStat label="Highest Intensity" value="850"  sub="gCO₂/kWh"     note="Delhi NCR" />
        <KPIStat label="Avg WUE (India)"   value="1.63" sub="L/kWh"        />
      </div>
      <Card>
        <p className="text-xs font-semibold text-gray-900 mb-1">🇮🇳 Indian Data Centers</p>
        <p className="text-[10.5px] text-gray-400 mb-4">Primary deployment targets — India cloud infrastructure</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {indian.map((r) => (
            <div key={r.id} className="border border-gray-100 rounded-lg p-3 hover:border-green-200 hover:bg-green-50/30 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-[12px] font-semibold text-gray-800">{r.displayName.split(" (")[0]}</p>
                  <p className="text-[10px] text-gray-400">{r.provider} · {r.country}</p>
                </div>
                <Badge color={ratingColor[r.rating]}>{r.rating}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { label: "Intensity", value: String(r.gridIntensityGCO2), unit: "gCO₂/kWh" },
                  { label: "WUE",       value: String(r.wueLitersPerKWh),   unit: "L/kWh"    },
                  { label: "PUE",       value: String(r.pue),               unit: "ratio"    },
                ].map((m) => (
                  <div key={m.label}>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wide">{m.label}</p>
                    <p className="text-[13px] font-bold text-gray-800 tabular-nums">{m.value}</p>
                    <p className="text-[9px] text-gray-400">{m.unit}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <p className="text-xs font-semibold text-gray-900 mb-4">🌍 Global Comparison Centers</p>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {["Location", "Provider", "Country", "gCO₂/kWh", "WUE", "PUE", "Rating"].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-[9.5px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {global.map((r) => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 text-[12px] font-medium text-gray-800">{r.displayName.split(" (")[0]}</td>
                <td className="px-3 py-2 text-[11.5px] text-gray-500">{r.provider}</td>
                <td className="px-3 py-2 text-[11.5px] text-gray-500">{r.country}</td>
                <td className="px-3 py-2 text-[12px] tabular-nums font-semibold text-gray-800">{r.gridIntensityGCO2}</td>
                <td className="px-3 py-2 text-[11.5px] tabular-nums text-gray-600">{r.wueLitersPerKWh}</td>
                <td className="px-3 py-2 text-[11.5px] tabular-nums text-gray-600">{r.pue}</td>
                <td className="px-3 py-2"><Badge color={ratingColor[r.rating]}>{r.rating}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Carbon Report
// ═══════════════════════════════════════════════════════════════════════════════
const MONTHLY = [
  { month: "Oct", total: 18400, pct: 72 },
  { month: "Nov", total: 21200, pct: 83 },
  { month: "Dec", total: 24800, pct: 97 },
  { month: "Jan", total: 25600, pct: 100 },
  { month: "Feb", total: 22400, pct: 88 },
  { month: "Mar", total: 20934, pct: 82 },
];
const BY_SOURCE = [
  { label: "Electricity (Grid)",   value: 14654, pct: 70, color: "bg-blue-500"   },
  { label: "Embodied GPU carbon",  value: 3348,  pct: 16, color: "bg-purple-500" },
  { label: "Cooling systems",      value: 2092,  pct: 10, color: "bg-cyan-500"   },
  { label: "Network / Storage",    value: 840,   pct: 4,  color: "bg-gray-400"   },
];

function CarbonReportView() {
  const MAX_BAR = 96;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="March Total"    value="20,934" sub="kg CO₂e"    note="↓ 6.6% vs Feb" />
        <KPIStat label="YTD (2026)"     value="68,534" sub="kg CO₂e"    />
        <KPIStat label="Best Month"     value="Oct 25" sub=""           note="18,400 kg CO₂e" />
        <KPIStat label="Reduction Goal" value="−20%"   sub="by Dec 26"  note="On track" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <p className="text-xs font-semibold text-gray-900 mb-5">Monthly Emissions (kg CO₂e)</p>
          <div className="flex items-end gap-3 px-2" style={{ height: `${MAX_BAR + 32}px` }}>
            {MONTHLY.map((m) => (
              <div key={m.month} className="flex flex-col items-center gap-1.5 flex-1">
                <span className="text-[9px] text-gray-500 tabular-nums">{(m.total / 1000).toFixed(1)}k</span>
                <div
                  className={clsx("w-full rounded-t transition-all", m.month === "Mar" ? "bg-green-500" : "bg-blue-400")}
                  style={{ height: `${Math.round((m.pct / 100) * MAX_BAR)}px` }}
                />
                <span className="text-[9px] text-gray-400">{m.month}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-gray-900 mb-4">March Breakdown by Source</p>
          <div className="space-y-4">
            {BY_SOURCE.map((s) => (
              <div key={s.label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] text-gray-600">{s.label}</span>
                  <span className="text-[11px] font-semibold text-gray-800 tabular-nums">{s.value.toLocaleString()} kg</span>
                </div>
                <BarPct pct={s.pct} color={s.color} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Scope 1 / 2 / 3
// ═══════════════════════════════════════════════════════════════════════════════
const SCOPES = [
  { num: "1", label: "Direct Emissions",          desc: "On-site diesel generators, fire suppression gases",                    value: 1240,  icon: "🏭", color: "bg-red-500",    barColor: "bg-red-500"    },
  { num: "2", label: "Indirect — Electricity",    desc: "Purchased electricity from Indian grid (750 gCO₂/kWh average)",        value: 14654, icon: "⚡", color: "bg-blue-500",   barColor: "bg-blue-500"   },
  { num: "3", label: "Value Chain Emissions",     desc: "Embodied GPU manufacturing, supply chain logistics, cooling equipment", value: 5040,  icon: "🔗", color: "bg-purple-500", barColor: "bg-purple-500" },
];
const SCOPE_TOTAL = 20934;

function ScopesView() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {SCOPES.map((s) => {
          const pct = Math.round((s.value / SCOPE_TOTAL) * 100);
          return (
            <Card key={s.num}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{s.icon}</span>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Scope {s.num}</p>
                  <p className="text-[12px] font-semibold text-gray-900">{s.label}</p>
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{s.value.toLocaleString()}</span>
                <span className="text-[11px] text-gray-400">kg CO₂e</span>
                <span className="text-[11px] text-gray-400 ml-auto">{pct}%</span>
              </div>
              <BarPct pct={pct} color={s.barColor} />
              <p className="text-[10.5px] text-gray-400 mt-3">{s.desc}</p>
            </Card>
          );
        })}
      </div>
      <Card>
        <p className="text-xs font-semibold text-gray-900 mb-5">GHG Scope Breakdown — March 2026</p>
        <div className="flex items-end gap-6 px-4" style={{ height: "120px" }}>
          {SCOPES.map((s) => {
            const pct = s.value / SCOPE_TOTAL;
            return (
              <div key={s.num} className="flex flex-col items-center gap-1.5 flex-1">
                <span className="text-[9px] text-gray-500 tabular-nums">{s.value.toLocaleString()}</span>
                <div
                  className={clsx("w-full rounded-t", s.barColor)}
                  style={{ height: `${Math.max(pct * 90, 8)}px` }}
                />
                <span className="text-[9px] text-gray-400">Scope {s.num}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Offsets & Credits
// ═══════════════════════════════════════════════════════════════════════════════
const OFFSET_PROJECTS = [
  { name: "Rajasthan Solar Farm",         type: "Solar",    credits: 1240, priceINR: 1038, location: "Rajasthan, IN",  cert: "Gold Standard" },
  { name: "Tamil Nadu Wind Energy",       type: "Wind",     credits: 860,  priceINR: 830,  location: "Tamil Nadu, IN", cert: "VCS"           },
  { name: "Sundarbans Mangrove REDD+",    type: "Forest",   credits: 320,  priceINR: 1494, location: "West Bengal, IN",cert: "CCB"           },
  { name: "Gujarat Green Hydrogen",       type: "Hydrogen", credits: 180,  priceINR: 1826, location: "Gujarat, IN",    cert: "Gold Standard" },
  { name: "Karnataka Biogas Cookstoves",  type: "Biogas",   credits: 640,  priceINR: 706,  location: "Karnataka, IN",  cert: "VCS"           },
];
const TYPE_ICON: Record<string, string> = { Solar: "☀️", Wind: "🌬️", Forest: "🌳", Hydrogen: "⚗️", Biogas: "♻️" };

function OffsetsView() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="Credit Balance"    value="2,840" sub="tonnes CO₂e"  />
        <KPIStat label="Retired (Mar 26)"  value="420"   sub="credits"      />
        <KPIStat label="Portfolio Value"   value="₹2.4M" sub=""             />
        <KPIStat label="Net Position"      value="+2,420" sub="credits"     note="Post retirement" />
      </div>
      <Card>
        <p className="text-xs font-semibold text-gray-900 mb-4">Available Offset Projects — India</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["Project", "Type", "Credits Available", "Price/tonne", "Location", "Standard", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-[9.5px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {OFFSET_PROJECTS.map((p) => (
                <tr key={p.name} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5 text-[12px] font-medium text-gray-800">{p.name}</td>
                  <td className="px-3 py-2.5 text-[11.5px] text-gray-600 whitespace-nowrap">{TYPE_ICON[p.type]} {p.type}</td>
                  <td className="px-3 py-2.5 text-[12px] tabular-nums text-gray-700">{p.credits.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-[12px] tabular-nums text-gray-700">₹{p.priceINR}</td>
                  <td className="px-3 py-2.5 text-[11.5px] text-gray-500">{p.location}</td>
                  <td className="px-3 py-2.5"><Badge color="blue">{p.cert}</Badge></td>
                  <td className="px-3 py-2.5">
                    <button className="text-[10.5px] text-green-700 font-semibold border border-green-200 bg-green-50 px-2.5 py-1 rounded hover:bg-green-100 transition-colors">
                      Purchase
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Water Usage
// ═══════════════════════════════════════════════════════════════════════════════
function WaterUsageView() {
  const sorted = [...REGIONS].sort((a, b) => a.wueLitersPerKWh - b.wueLitersPerKWh);
  const maxWUE = Math.max(...REGIONS.map((r) => r.wueLitersPerKWh));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="March Consumption"   value="28,400"  sub="liters"       note="↓ 4% vs Feb"     />
        <KPIStat label="Avg WUE (Fleet)"     value="1.63"    sub="L/kWh"        />
        <KPIStat label="Best WUE Region"     value="0.2"     sub="L/kWh"        note="Finland (GCP)"   />
        <KPIStat label="High-Stress Regions" value="2"       sub="regions"      note="Mumbai · Delhi"  />
      </div>
      <Card>
        <p className="text-xs font-semibold text-gray-900 mb-4">Water Usage Effectiveness (WUE) by Region</p>
        <div className="space-y-3">
          {sorted.map((r) => {
            const pct = (r.wueLitersPerKWh / maxWUE) * 100;
            const barColor =
              r.wueLitersPerKWh <= 0.5 ? "bg-green-500" :
              r.wueLitersPerKWh <= 1.5 ? "bg-amber-400" : "bg-red-400";
            return (
              <div key={r.id} className="flex items-center gap-3">
                <span className="text-[11px] text-gray-600 w-36 flex-shrink-0 truncate">
                  {r.displayName.split(" (")[0]}
                </span>
                <div className="flex-1">
                  <BarPct pct={pct} color={barColor} />
                </div>
                <span className="text-[11px] tabular-nums font-semibold text-gray-800 w-16 text-right flex-shrink-0">
                  {r.wueLitersPerKWh} L/kWh
                </span>
                <span className="text-[9px] text-gray-400 w-4 flex-shrink-0">{r.isIndian ? "🇮🇳" : ""}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-4 border-t border-gray-100 pt-3">
          WUE = Water Usage Effectiveness. Lower is better. Target: &lt;1.0 L/kWh for new facilities.
        </p>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. GPU Efficiency
// ═══════════════════════════════════════════════════════════════════════════════
const GPU_FLEET = [
  { name: "H100 SXM5",  powerW: 700, tflops: 1979, inUse: 576, util: 92, carbonPerJob: 28.4 },
  { name: "H100 PCIe",  powerW: 350, tflops: 1513, inUse: 128, util: 78, carbonPerJob: 18.6 },
  { name: "A100 SXM4",  powerW: 400, tflops: 624,  inUse: 64,  util: 85, carbonPerJob: 24.0 },
  { name: "A100 PCIe",  powerW: 300, tflops: 624,  inUse: 32,  util: 71, carbonPerJob: 18.0 },
  { name: "V100 SXM2",  powerW: 300, tflops: 125,  inUse: 16,  util: 64, carbonPerJob: 36.5 },
  { name: "A10G",       powerW: 150, tflops: 125,  inUse: 24,  util: 88, carbonPerJob: 6.2  },
  { name: "T4",         powerW: 70,  tflops: 65,   inUse: 48,  util: 91, carbonPerJob: 2.9  },
];

function GPUEfficiencyView() {
  const effColor = (u: number): BadgeColor => u >= 85 ? "green" : u >= 70 ? "amber" : "red";
  const TH = ["GPU Model", "TDP", "TFlops (BF16)", "Units in Fleet", "Avg Utilization", "Carbon/Job (kg)", "Grade"];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="Fleet Avg Utilization" value="84"  sub="%"          note="↑ 3% vs last week"    />
        <KPIStat label="Total GPUs in Fleet"   value="888" sub="GPUs"       />
        <KPIStat label="Most Carbon-Efficient" value="T4"  sub=""           note="2.9 kg CO₂e / job"    />
        <KPIStat label="Idle GPUs"             value="12"  sub="units"      note="~₹14,400/day wasted"  />
      </div>
      <Card>
        <p className="text-xs font-semibold text-gray-900 mb-4">GPU Fleet Performance &amp; Efficiency</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {TH.map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-[9.5px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GPU_FLEET.map((g) => {
                const barColor = g.util >= 85 ? "bg-green-500" : g.util >= 70 ? "bg-amber-400" : "bg-red-400";
                return (
                  <tr key={g.name} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 text-[12px] font-semibold text-gray-800">{g.name}</td>
                    <td className="px-3 py-2.5 text-[11.5px] text-gray-500">{g.powerW}W</td>
                    <td className="px-3 py-2.5 text-[11.5px] tabular-nums text-gray-600">{g.tflops.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-[12px] tabular-nums text-gray-700">{g.inUse}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={clsx("h-full rounded-full", barColor)} style={{ width: `${g.util}%` }} />
                        </div>
                        <span className="text-[11px] tabular-nums text-gray-700">{g.util}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] tabular-nums font-medium text-gray-800">{g.carbonPerJob}</td>
                    <td className="px-3 py-2.5">
                      <Badge color={effColor(g.util)}>{g.util >= 85 ? "High" : g.util >= 70 ? "Med" : "Low"}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Energy Mix
// ═══════════════════════════════════════════════════════════════════════════════
const ENERGY_PROVIDERS = [
  { name: "GCP",         renewPct: 94, coalPct: 2,  gasPct: 4,  textColor: "text-blue-600",   bgColor: "bg-blue-50",   border: "border-blue-100"   },
  { name: "Azure",       renewPct: 90, coalPct: 4,  gasPct: 6,  textColor: "text-cyan-600",   bgColor: "bg-cyan-50",   border: "border-cyan-100"   },
  { name: "AWS",         renewPct: 85, coalPct: 6,  gasPct: 9,  textColor: "text-amber-600",  bgColor: "bg-amber-50",  border: "border-amber-100"  },
  { name: "Indian Grid", renewPct: 42, coalPct: 38, gasPct: 20, textColor: "text-orange-600", bgColor: "bg-orange-50", border: "border-orange-100" },
];

function EnergyMixView() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="Fleet Renewable Avg" value="85"   sub="%" note="↑ 4% vs Q4 '25"         />
        <KPIStat label="Coal Dependency"     value="11"   sub="%" note="↓ 2% vs Q4 '25"         />
        <KPIStat label="Best Provider"       value="GCP"  sub=""  note="94% renewable"          />
        <KPIStat label="Carbon Avoided"      value="3,240" sub="t CO₂e/mo" note="vs national grid" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {ENERGY_PROVIDERS.map((ep) => (
          <Card key={ep.name} className={clsx("border", ep.border)}>
            <div className="flex items-center justify-between mb-4">
              <p className={clsx("text-sm font-bold", ep.textColor)}>{ep.name}</p>
              <span className={clsx("text-2xl font-black tabular-nums", ep.textColor)}>{ep.renewPct}%</span>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "🌱 Renewable",  pct: ep.renewPct, color: "bg-green-500" },
                { label: "🏭 Coal",       pct: ep.coalPct,  color: "bg-gray-400"  },
                { label: "⛽ Natural Gas", pct: ep.gasPct,   color: "bg-amber-400" },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>{row.label}</span>
                    <span>{row.pct}%</span>
                  </div>
                  <BarPct pct={row.pct} color={row.color} />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. ESG Reports
// ═══════════════════════════════════════════════════════════════════════════════
type ReportStatus = "Published" | "Verified" | "In Progress";
const REPORTS: { name: string; type: string; date: string; size: string; status: ReportStatus }[] = [
  { name: "Q1 2026 ESG Report",              type: "ESG",   date: "Mar 31, 2026", size: "2.4 MB", status: "Published"   },
  { name: "Carbon Disclosure (CDP 2025)",    type: "CDP",   date: "Feb 14, 2026", size: "1.8 MB", status: "Published"   },
  { name: "Water Stewardship Statement",     type: "Water", date: "Jan 20, 2026", size: "0.9 MB", status: "Published"   },
  { name: "ISO 14064-1 Verification",        type: "ISO",   date: "Dec 15, 2025", size: "3.2 MB", status: "Verified"    },
  { name: "Q2 2026 ESG Report (Draft)",      type: "ESG",   date: "Jun 30, 2026", size: "—",      status: "In Progress" },
  { name: "BRSR Core Disclosure Q1 2026",    type: "BRSR",  date: "Apr 30, 2026", size: "1.1 MB", status: "In Progress" },
];
const REPORT_TYPE_COLOR: Record<string, BadgeColor> = { ESG: "green", CDP: "blue", Water: "blue", ISO: "amber", BRSR: "purple" };
const REPORT_STATUS_COLOR: Record<ReportStatus, BadgeColor> = { Published: "green", Verified: "blue", "In Progress": "amber" };

function ESGReportsView() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="Published Reports" value="4"      sub="documents"   />
        <KPIStat label="ESG Score"         value="82"     sub="/ 100"       note="↑ 5 vs 2025"    />
        <KPIStat label="CDP Rating"        value="A−"     sub="2025 cycle"  />
        <KPIStat label="Next Filing"       value="Apr 30" sub=""            note="BRSR Core"      />
      </div>
      <Card>
        <p className="text-xs font-semibold text-gray-900 mb-4">Report Library</p>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {["Report", "Type", "Date", "Size", "Status", "Action"].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-[9.5px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REPORTS.map((r) => (
              <tr key={r.name} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-3 py-3 text-[12px] font-medium text-gray-800">{r.name}</td>
                <td className="px-3 py-3"><Badge color={REPORT_TYPE_COLOR[r.type] ?? "gray"}>{r.type}</Badge></td>
                <td className="px-3 py-3 text-[11.5px] text-gray-500 whitespace-nowrap">{r.date}</td>
                <td className="px-3 py-3 text-[11.5px] tabular-nums text-gray-500">{r.size}</td>
                <td className="px-3 py-3"><Badge color={REPORT_STATUS_COLOR[r.status]}>{r.status}</Badge></td>
                <td className="px-3 py-3">
                  {r.status !== "In Progress" ? (
                    <button className="flex items-center gap-1 text-[10.5px] text-gray-600 border border-gray-200 px-2.5 py-1 rounded hover:bg-gray-50 transition-colors">
                      <Download size={11} /> PDF
                    </button>
                  ) : (
                    <span className="text-[10.5px] text-gray-300">Pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. Audit Trail
// ═══════════════════════════════════════════════════════════════════════════════
type AuditType = "calc" | "opt" | "export" | "agent" | "offset" | "view";
const AUDIT_STYLE: Record<AuditType, { color: string; icon: string }> = {
  calc:   { color: "text-blue-600 bg-blue-50 border-blue-100",         icon: "🔢" },
  opt:    { color: "text-green-600 bg-green-50 border-green-100",       icon: "📊" },
  export: { color: "text-purple-600 bg-purple-50 border-purple-100",   icon: "📥" },
  agent:  { color: "text-amber-600 bg-amber-50 border-amber-100",      icon: "🤖" },
  offset: { color: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: "🌿" },
  view:   { color: "text-gray-500 bg-gray-50 border-gray-100",         icon: "👁️" },
};
const AUDIT_LOG: { time: string; event: string; detail: string; user: string; type: AuditType }[] = [
  { time: "11:57 PM", event: "Footprint Analysis", detail: "LLaMA-3 70B · 8×A100 · Mumbai · 24h → 57.6 kg CO₂e",         user: "dev@nvidia.com",   type: "calc"   },
  { time: "11:45 PM", event: "Region Comparison",  detail: "Compared Mumbai vs Finland → 96.5% savings identified",        user: "dev@nvidia.com",   type: "opt"    },
  { time: "10:32 PM", event: "Footprint Analysis", detail: "BERT classifier · 4×T4 · Hyderabad · 3h → 2.1 kg CO₂e",       user: "dev@nvidia.com",   type: "calc"   },
  { time: "09:15 PM", event: "Export Report",      detail: "Q1 March summary exported as PDF",                             user: "admin@nvidia.com", type: "export" },
  { time: "08:04 PM", event: "Agent Analysis",     detail: "Nemotron NIM analysis for Stable Diffusion v3 workload",       user: "dev@nvidia.com",   type: "agent"  },
  { time: "07:50 PM", event: "Footprint Analysis", detail: "Vision Transformer · 8×A100 PCIe · Pune · 48h → 112 kg CO₂e", user: "dev@nvidia.com",   type: "calc"   },
  { time: "06:22 PM", event: "Credit Purchase",    detail: "420 credits retired — Rajasthan Solar Farm (Gold Standard)",   user: "cfo@nvidia.com",   type: "offset" },
  { time: "05:10 PM", event: "Carbon Report View", detail: "Monthly emissions report accessed",                            user: "admin@nvidia.com", type: "view"   },
];

function AuditTrailView() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="Analyses Today"  value="6"       sub="calculations" />
        <KPIStat label="API Calls (Mar)" value="142"     sub="total"        />
        <KPIStat label="Active Users"    value="3"       sub="team members" />
        <KPIStat label="Last Activity"   value="11:57 PM" sub="today · IST" />
      </div>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-gray-900">Activity Log — March 20, 2026</p>
          <span className="text-[10px] text-gray-400">All times IST</span>
        </div>
        <div className="space-y-0.5">
          {AUDIT_LOG.map((e, i) => {
            const style = AUDIT_STYLE[e.type];
            return (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-[10px] text-gray-400 tabular-nums w-16 flex-shrink-0 pt-0.5">{e.time}</span>
                <span className={clsx("text-[9.5px] px-1.5 py-0.5 rounded border text-center w-7 flex-shrink-0", style.color)}>
                  {style.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-semibold text-gray-800">{e.event}</p>
                  <p className="text-[10.5px] text-gray-400 truncate">{e.detail}</p>
                </div>
                <span className="text-[10px] text-gray-400 flex-shrink-0 hidden md:block">{e.user}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
