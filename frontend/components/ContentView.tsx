"use client";

import React from "react";
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
    "Green Scheduler":  "Green Scheduling Engine",
    "Workload Compare": "Multi-Workload Comparison",
    "Carbon Passport":  "Carbon Passport",
    "BRSR Compliance":  "BRSR Compliance Module",
    "Team Leaderboard": "Team Carbon Leaderboard",
    "CI/CD Carbon Gate": "CI/CD Carbon Gate",
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
    case "Green Scheduler":  return <GreenSchedulerView />;
    case "CI/CD Carbon Gate": return <CICDCarbonGateView />;
    case "Workload Compare": return <WorkloadCompareView />;
    case "Carbon Passport":  return <CarbonPassportView />;
    case "BRSR Compliance":  return <BRSRComplianceView />;
    case "Team Leaderboard": return <TeamLeaderboardView />;
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
// 3. Carbon Report  (with Nemotron-powered Historical Trend + Forecasting)
// ═══════════════════════════════════════════════════════════════════════════════
const MONTHLY = [
  { month: "Oct", total: 18400, pct: 72,  forecast: false },
  { month: "Nov", total: 21200, pct: 83,  forecast: false },
  { month: "Dec", total: 24800, pct: 97,  forecast: false },
  { month: "Jan", total: 25600, pct: 100, forecast: false },
  { month: "Feb", total: 22400, pct: 88,  forecast: false },
  { month: "Mar", total: 20934, pct: 82,  forecast: false },
  { month: "Apr", total: 19200, pct: 75,  forecast: true  },
  { month: "May", total: 18100, pct: 71,  forecast: true  },
  { month: "Jun", total: 16800, pct: 66,  forecast: true  },
];
// Linear regression slope: −360 kg/month (downward trend)
const TREND_SLOPE = -360;
const BY_SOURCE = [
  { label: "Electricity (Grid)",   value: 14654, pct: 70, color: "bg-blue-500"   },
  { label: "Embodied GPU carbon",  value: 3348,  pct: 16, color: "bg-purple-500" },
  { label: "Cooling systems",      value: 2092,  pct: 10, color: "bg-cyan-500"   },
  { label: "Network / Storage",    value: 840,   pct: 4,  color: "bg-gray-400"   },
];
const NEMOTRON_FORECAST_INSIGHT =
  "📊 Nemotron analysis: Based on 6-month linear trend (slope −360 kg/month), " +
  "projecting 16,800 kg CO₂e by June 2026. At this rate you will reach your −20% " +
  "annual target (16,747 kg) in July 2026 — 5 months ahead of schedule. " +
  "Key driver: shift from Mumbai → Hampi Solar workloads in Q1. " +
  "Risk: GPT-4 pre-training job in queue could add ~18,432 kg — recommend green-scheduling to 3 AM.";

function CarbonReportView() {
  const MAX_BAR = 96;
  const actual = MONTHLY.filter((m) => !m.forecast);
  const maxTotal = Math.max(...MONTHLY.map((m) => m.total));
  const goalLine = Math.round(actual[0].total * 0.80); // −20% from Oct baseline
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="March Total"    value="20,934" sub="kg CO₂e"    note="↓ 6.6% vs Feb" />
        <KPIStat label="YTD (2026)"     value="68,534" sub="kg CO₂e"    />
        <KPIStat label="June Forecast"  value="16,800" sub="kg CO₂e"    note="Nemotron projection" />
        <KPIStat label="Reduction Goal" value="−20%"   sub="by Dec 26"  note="On track ✓" />
      </div>

      {/* Nemotron forecast insight banner */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <div className="w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-[10px] font-black">N</span>
        </div>
        <p className="text-[11.5px] text-violet-800 leading-relaxed">{NEMOTRON_FORECAST_INSIGHT}</p>
      </div>

      {/* Chart + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-gray-900">Monthly Emissions + 3-Month Forecast (kg CO₂e)</p>
          </div>
          <div className="flex items-end gap-2 px-2" style={{ height: `${MAX_BAR + 32}px` }}>
            {MONTHLY.map((m) => {
              const heightPct = Math.round((m.total / maxTotal) * MAX_BAR);
              return (
                <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[8px] text-gray-400 tabular-nums">{(m.total / 1000).toFixed(1)}k</span>
                  <div
                    className={clsx(
                      "w-full rounded-t transition-all",
                      m.forecast
                        ? "bg-violet-300 border-2 border-violet-400 border-dashed"
                        : m.month === "Mar" ? "bg-green-500" : "bg-blue-400"
                    )}
                    style={{ height: `${heightPct}px` }}
                  />
                  <span className={clsx("text-[8px]", m.forecast ? "text-violet-500 font-semibold" : "text-gray-400")}>
                    {m.month}{m.forecast ? " ▸" : ""}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-[9px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded-sm inline-block" />Actual</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-sm inline-block" />Current month</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-violet-300 rounded-sm inline-block" />Nemotron forecast</span>
          </div>
          <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg p-2.5">
            <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">Trend analysis</p>
            <p className="text-[11px] text-gray-700">
              Slope: <span className="text-green-600 font-semibold">{TREND_SLOPE} kg/month</span> · 
              Goal baseline (−20%): <span className="font-semibold">{goalLine.toLocaleString()} kg</span> · 
              Projected reach: <span className="text-green-600 font-semibold">Jul 2026</span>
            </p>
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
  // util < 60% = stranded capacity; wastedCarbon = powerW × (1-util) × hoursPerDay × gridIntensity
  { name: "H100 SXM5",  powerW: 700, tflops: 1979, inUse: 576, util: 92, carbonPerJob: 28.4, embodied: 2840,  fab: "TSMC N4 (Taiwan)",    refurb: false },
  { name: "H100 PCIe",  powerW: 350, tflops: 1513, inUse: 128, util: 78, carbonPerJob: 18.6, embodied: 1920,  fab: "TSMC N4 (Taiwan)",    refurb: false },
  { name: "A100 SXM4",  powerW: 400, tflops: 624,  inUse: 64,  util: 85, carbonPerJob: 24.0, embodied: 1560,  fab: "TSMC N7 (Taiwan)",    refurb: false },
  { name: "A100 PCIe",  powerW: 300, tflops: 624,  inUse: 32,  util: 71, carbonPerJob: 18.0, embodied: 1400,  fab: "TSMC N7 (Taiwan)",    refurb: false },
  { name: "V100 SXM2",  powerW: 300, tflops: 125,  inUse: 16,  util: 64, carbonPerJob: 36.5, embodied: 980,   fab: "TSMC 12nm (Taiwan)",  refurb: true  },
  { name: "A10G",       powerW: 150, tflops: 125,  inUse: 24,  util: 88, carbonPerJob: 6.2,  embodied: 680,   fab: "Samsung 8nm (Korea)", refurb: false },
  { name: "T4",         powerW: 70,  tflops: 65,   inUse: 48,  util: 91, carbonPerJob: 2.9,  embodied: 420,   fab: "TSMC 12nm (Taiwan)",  refurb: true  },
];

// Wasted carbon per day = powerW × (1 - util/100) × 24h × 0.75 kgCO₂/kWh ÷ 1000
function wastedCarbonKg(powerW: number, util: number): number {
  return Math.round(powerW * (1 - util / 100) * 24 * 0.75 / 1000 * 10) / 10;
}

function GPUEfficiencyView() {
  const effColor = (u: number): BadgeColor => u >= 85 ? "green" : u >= 70 ? "amber" : "red";
  const stranded = GPU_FLEET.filter((g) => g.util < 60);
  const totalWastedCarbon = stranded.reduce((acc, g) => acc + wastedCarbonKg(g.powerW, g.util) * g.inUse, 0);
  const TH = ["GPU Model", "TDP", "TFlops", "Units", "Utilization", "Wasted Carbon/day (kg)", "Carbon/Job", "Grade"];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="Fleet Avg Utilization" value="84"   sub="%"     note="↑ 3% vs last week"     />
        <KPIStat label="Total GPUs in Fleet"   value="888"  sub="GPUs"  />
        <KPIStat label="Stranded GPUs"         value={String(stranded.reduce((a,g)=>a+g.inUse,0))} sub="units" note="< 60% utilization" />
        <KPIStat label="Daily Wasted Carbon"   value={totalWastedCarbon.toFixed(0)} sub="kg CO₂e" note="Emitted for zero output" />
      </div>

      {/* Stranded capacity alert */}
      {stranded.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-[11.5px] font-semibold text-red-800 mb-1">⚠️ GPU Stranded Capacity Detected</p>
          <p className="text-[10.5px] text-red-700">
            {stranded.map((g) => `${g.inUse}× ${g.name} (${g.util}% util)`).join(" · ")} are running below 60% utilization.
            This wastes <span className="font-bold">{totalWastedCarbon.toFixed(1)} kg CO₂e/day</span> — carbon emitted for zero productive output.
            Consolidate workloads or schedule these GPUs for maintenance during off-peak hours.
          </p>
        </div>
      )}

      <Card>
        <p className="text-xs font-semibold text-gray-900 mb-4">GPU Fleet Performance, Efficiency &amp; Stranded Capacity</p>
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
                const isStranded = g.util < 60;
                const barColor = isStranded ? "bg-red-400" : g.util >= 85 ? "bg-green-500" : "bg-amber-400";
                const wasted = wastedCarbonKg(g.powerW, g.util);
                return (
                  <tr key={g.name} className={clsx("border-b border-gray-50 hover:bg-gray-50 transition-colors", isStranded && "bg-red-50/40")}>
                    <td className="px-3 py-2.5">
                      <p className="text-[12px] font-semibold text-gray-800">{g.name}</p>
                      {isStranded && <span className="text-[9px] text-red-600 font-semibold">⚠ STRANDED</span>}
                    </td>
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
                    <td className={clsx("px-3 py-2.5 text-[12px] tabular-nums font-medium", isStranded ? "text-red-600" : "text-gray-400")}>
                      {isStranded ? `${wasted} kg` : "—"}
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

      {/* Embodied Carbon Procurement Score */}
      <Card>
        <p className="text-xs font-semibold text-gray-900 mb-1">Embodied Carbon Procurement Score</p>
        <p className="text-[10.5px] text-gray-400 mb-4">Cradle-to-gate supply chain carbon per GPU · helps procurement teams make greener hardware choices</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["GPU", "Fab / Node", "Embodied Carbon", "Refurb?", "Procurement Score", "Recommendation"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-[9.5px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GPU_FLEET.map((g) => {
                const maxEmbodied = 2840;
                const scorePct = Math.round((1 - g.embodied / maxEmbodied) * 100);
                const scoreColor: BadgeColor = scorePct >= 70 ? "green" : scorePct >= 40 ? "amber" : "red";
                const reco = g.refurb
                  ? "Prefer — refurbished hardware avoids new manufacturing"
                  : g.embodied <= 700
                  ? "Excellent — low fab carbon, best for inference"
                  : g.embodied <= 1500
                  ? "Good — balance of performance and embodied carbon"
                  : "Heavy — only justified for large-scale training on renewables";
                return (
                  <tr key={g.name} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 text-[12px] font-semibold text-gray-800">{g.name}</td>
                    <td className="px-3 py-2.5 text-[11px] text-gray-500">{g.fab}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] tabular-nums font-semibold text-gray-800">{g.embodied.toLocaleString()} kg</span>
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-400 rounded-full" style={{ width: `${(g.embodied / maxEmbodied) * 100}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge color={g.refurb ? "green" : "gray"}>{g.refurb ? "♻️ Yes" : "New"}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Badge color={scoreColor}>{scorePct}/100</Badge>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[10.5px] text-gray-500">{reco}</td>
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

// ═══════════════════════════════════════════════════════════════════════════════
// 11. Green Scheduler
// ═══════════════════════════════════════════════════════════════════════════════
const SCHEDULE_JOBS = [
  { name: "LLaMA-3 Fine-tune (72h)",       region: "Mumbai",    bestHour: "03:00",  savings: 38, nowCarbon: 2304,  optCarbon: 1428 },
  { name: "Stable Diffusion v3 (8h)",      region: "Bengaluru", bestHour: "04:30",  savings: 22, nowCarbon: 12,    optCarbon: 9.4  },
  { name: "GPT-4 Pre-training (240h)",     region: "Chennai",   bestHour: "02:45",  savings: 29, nowCarbon: 18432, optCarbon: 13087 },
  { name: "Vision Transformer (48h)",      region: "Pune",      bestHour: "03:15",  savings: 34, nowCarbon: 112,   optCarbon: 73.9 },
];

const HOUR_CURVE = [72, 68, 65, 63, 62, 64, 71, 84, 95, 105, 110, 108, 104, 102, 100, 97, 96, 98, 106, 112, 108, 98, 88, 78];
const MAX_CURVE = Math.max(...HOUR_CURVE);
const MIN_CURVE = Math.min(...HOUR_CURVE);

function GreenSchedulerView() {
  const totalSaved = SCHEDULE_JOBS.reduce((acc, j) => acc + (j.nowCarbon - j.optCarbon), 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="Jobs to Optimize"    value={String(SCHEDULE_JOBS.length)} sub="pending"    />
        <KPIStat label="Potential Savings"   value={totalSaved.toFixed(0)}        sub="kg CO₂e"   note="If all jobs rescheduled" />
        <KPIStat label="Optimal Time Window" value="02:45–05:00"                  sub="IST"       note="Indian grid minimum" />
        <KPIStat label="Avg Savings/Job"     value="31%"                          sub="reduction" />
      </div>
      <Card>
        <p className="text-xs font-semibold text-gray-900 mb-1">24-Hour Grid Carbon Intensity Forecast</p>
        <p className="text-[10.5px] text-gray-400 mb-4">Based on India national grid — typical weekday pattern (gCO₂/kWh)</p>
        <div className="flex items-end gap-1" style={{ height: 80 }}>
          {HOUR_CURVE.map((val, h) => {
            const heightPct = ((val - MIN_CURVE) / (MAX_CURVE - MIN_CURVE)) * 70 + 30;
            const isBest = h >= 2 && h <= 5;
            const barBg = isBest ? "bg-green-500" : val > 100 ? "bg-red-400" : "bg-blue-400";
            return (
              <div key={h} className="flex-1 flex flex-col items-center" title={`${h}:00 — ${val} gCO₂/kWh`}>
                <div className={clsx("w-full rounded-sm", barBg)} style={{ height: `${heightPct}%` }} />
                {h % 4 === 0 && <span className="text-[7px] text-gray-400 mt-0.5">{h}h</span>}
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2 text-[9px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-sm inline-block" />Optimal window (2–5 AM)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-sm inline-block" />Peak demand</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded-sm inline-block" />Normal</span>
        </div>
      </Card>
      <Card>
        <p className="text-xs font-semibold text-gray-900 mb-4">Job Scheduling Recommendations</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["Job", "Region", "Optimal Time", "Now (kg CO₂e)", "Optimised (kg CO₂e)", "Savings", "Action"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-[9.5px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCHEDULE_JOBS.map((j) => (
                <tr key={j.name} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5 text-[12px] font-medium text-gray-800">{j.name}</td>
                  <td className="px-3 py-2.5 text-[11.5px] text-gray-500">{j.region}</td>
                  <td className="px-3 py-2.5 text-[12px] font-semibold text-green-700">{j.bestHour} IST</td>
                  <td className="px-3 py-2.5 text-[12px] tabular-nums text-gray-700">{j.nowCarbon.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-[12px] tabular-nums font-semibold text-green-700">{j.optCarbon.toLocaleString()}</td>
                  <td className="px-3 py-2.5"><Badge color="green">−{j.savings}%</Badge></td>
                  <td className="px-3 py-2.5">
                    <button className="text-[10.5px] text-green-700 font-semibold border border-green-200 bg-green-50 px-2.5 py-1 rounded hover:bg-green-100 transition-colors">
                      Schedule
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
// 12. Workload Compare
// ═══════════════════════════════════════════════════════════════════════════════
const COMPARE_JOBS = [
  {
    label: "LLaMA-3 70B\nFine-tune",
    gpu: "H100 SXM5 ×64", region: "Mumbai",
    hours: 72, carbon: 2304, energy: 3072, water: 4608, cost: "₹1,728",
    utilPct: 92, badge: "red" as BadgeColor,
  },
  {
    label: "BERT Sentiment\nClassifier",
    gpu: "T4 ×4", region: "Hyderabad",
    hours: 3, carbon: 2.1, energy: 0.84, water: 1.7, cost: "₹1.6",
    utilPct: 91, badge: "green" as BadgeColor,
  },
  {
    label: "Recommendation\nEngine Retrain",
    gpu: "A100 SXM4 ×16", region: "Mumbai",
    hours: 12, carbon: 184.3, energy: 245.8, water: 368.7, cost: "₹138",
    utilPct: 85, badge: "amber" as BadgeColor,
  },
];

function WorkloadCompareView() {
  const maxCarbon = Math.max(...COMPARE_JOBS.map((j) => j.carbon));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="Jobs Compared"    value="3"      sub="workloads"  />
        <KPIStat label="Lowest Carbon"    value="2.1"    sub="kg CO₂e"    note="BERT Classifier" />
        <KPIStat label="Highest Carbon"   value="2,304"  sub="kg CO₂e"    note="LLaMA-3 Fine-tune" />
        <KPIStat label="Range"            value="1,097×" sub="difference" note="Critical gap" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {COMPARE_JOBS.map((j, i) => (
          <Card key={i}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-[12px] font-bold text-gray-900 whitespace-pre-line">{j.label}</p>
              <Badge color={j.badge}>{j.badge === "green" ? "Efficient" : j.badge === "amber" ? "Average" : "Heavy"}</Badge>
            </div>
            <p className="text-[10.5px] text-gray-400 mb-4">{j.gpu} · {j.region} · {j.hours}h</p>
            <div className="space-y-2">
              {[
                { label: "Carbon (kg CO₂e)", val: j.carbon.toLocaleString() },
                { label: "Energy (kWh)",      val: j.energy.toLocaleString() },
                { label: "Water (L)",         val: j.water.toLocaleString() },
                { label: "Carbon Cost (INR)", val: j.cost },
                { label: "GPU Utilization",   val: `${j.utilPct}%` },
              ].map((m) => (
                <div key={m.label} className="flex justify-between items-center border-b border-gray-50 pb-1.5">
                  <span className="text-[10.5px] text-gray-500">{m.label}</span>
                  <span className="text-[12px] font-semibold text-gray-800 tabular-nums">{m.val}</span>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <BarPct
                pct={(j.carbon / maxCarbon) * 100}
                color={j.badge === "green" ? "bg-green-500" : j.badge === "amber" ? "bg-amber-400" : "bg-red-500"}
              />
              <p className="text-[9px] text-gray-400 mt-1">{Math.round((j.carbon / maxCarbon) * 100)}% of max carbon footprint</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13. Carbon Passport
// ═══════════════════════════════════════════════════════════════════════════════
function CarbonPassportView() {
  const passportId = "BGP-2026-IND-078342";
  const issued = "March 20, 2026";
  const org = "NVIDIA India · BharatGreen AI";
  const periodCarbon = 20934;
  const periodEnergy = 27912;
  const periodWater = 41869;
  const periodOffset = 8374;
  const netCarbon = periodCarbon - periodOffset;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="Passport ID"      value={passportId}                       sub=""         />
        <KPIStat label="Gross Emissions"  value={periodCarbon.toLocaleString()}     sub="kg CO₂e"  note="March 2026" />
        <KPIStat label="Credits Retired"  value={periodOffset.toLocaleString()}     sub="kg CO₂e" />
        <KPIStat label="Net Position"     value={netCarbon.toLocaleString()}        sub="kg CO₂e"  note="Verified Net" />
      </div>
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full opacity-60" />
        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-black">B</span>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-900">BharatGreen AI</p>
                  <p className="text-[9px] text-gray-400">Carbon Intelligence Platform</p>
                </div>
              </div>
              <p className="text-[22px] font-black text-gray-900 mt-3">Carbon Passport</p>
              <p className="text-[11px] text-gray-500">Verified AI Workload Emissions Certificate</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-gray-400 uppercase tracking-widest">Passport ID</p>
              <p className="text-[13px] font-bold text-green-700 font-mono">{passportId}</p>
              <p className="text-[10px] text-gray-400 mt-1">Issued: {issued}</p>
              <Badge color="green">VERIFIED</Badge>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4 mb-5">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Organization</p>
            <p className="text-[14px] font-semibold text-gray-900">{org}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Gross GHG Emissions",   value: `${periodCarbon.toLocaleString()} kg`, sub: "CO₂e",    color: "text-red-600"   },
              { label: "Energy Consumed",        value: `${periodEnergy.toLocaleString()} kWh`, sub: "total", color: "text-blue-600"  },
              { label: "Water Consumed",         value: `${periodWater.toLocaleString()} L`,  sub: "cooling", color: "text-cyan-600"  },
              { label: "Net Verified Emissions", value: `${netCarbon.toLocaleString()} kg`,  sub: "CO₂e",     color: "text-green-700" },
            ].map((m) => (
              <div key={m.label} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-1">{m.label}</p>
                <p className={clsx("text-[18px] font-black tabular-nums leading-none", m.color)}>{m.value}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <div className="space-y-1">
              {["GHG Protocol Corporate Standard (Scope 1+2+3)", "India BRSR Principle 6 compliant", "ISO 14064-1:2018 framework", "NVIDIA Sustainable Computing Initiative"].map((c) => (
                <p key={c} className="text-[10px] text-gray-500 flex items-center gap-1">
                  <span className="text-green-500">✓</span> {c}
                </p>
              ))}
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-1">
                <p className="text-white text-[8px] font-mono text-center px-1 leading-relaxed">
                  {passportId}<br />BHARATGREEN<br />VERIFIED
                </p>
              </div>
              <p className="text-[9px] text-gray-400">Scan to verify</p>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-[12px] font-semibold hover:bg-green-700 transition-colors">
              <Download size={13} />
              Download PDF
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 14. BRSR Compliance
// ═══════════════════════════════════════════════════════════════════════════════
const BRSR_FIELDS = [
  { section: "Section C – Principle 6", kpi: "Total energy consumption (kWh)",     value: "27,912 kWh",      status: "filled"   as const },
  { section: "Section C – Principle 6", kpi: "Energy from renewable sources (%)",  value: "8.4%",            status: "partial"  as const },
  { section: "Section C – Principle 6", kpi: "Scope 1 GHG emissions (tCO₂e)",      value: "1.24 t",          status: "filled"   as const },
  { section: "Section C – Principle 6", kpi: "Scope 2 GHG emissions (tCO₂e)",      value: "14.65 t",         status: "filled"   as const },
  { section: "Section C – Principle 6", kpi: "Scope 3 GHG emissions (tCO₂e)",      value: "5.04 t",          status: "filled"   as const },
  { section: "Section C – Principle 6", kpi: "Water withdrawal (kL)",               value: "41.87 kL",        status: "filled"   as const },
  { section: "Section C – Principle 6", kpi: "GHG reduction initiatives",           value: "—",               status: "missing"  as const },
  { section: "Section A – General",     kpi: "Sustainability reporting standard",   value: "GRI+GHG Protocol",status: "filled"   as const },
  { section: "Section A – General",     kpi: "Independent assurance obtained",      value: "In progress",     status: "partial"  as const },
  { section: "Section B – Products",    kpi: "Responsible sourcing policy",         value: "Yes — NVIDIA SER",status: "filled"   as const },
];

function BRSRComplianceView() {
  const filled  = BRSR_FIELDS.filter((f) => f.status === "filled").length;
  const partial = BRSR_FIELDS.filter((f) => f.status === "partial").length;
  const missing = BRSR_FIELDS.filter((f) => f.status === "missing").length;
  const pct = Math.round((filled / BRSR_FIELDS.length) * 100);
  const statusColor: Record<"filled" | "partial" | "missing", BadgeColor> = {
    filled: "green", partial: "amber", missing: "red",
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="Completion"  value={`${pct}%`}      sub="fields filled"  note="SEBI FY2026 filing" />
        <KPIStat label="Filled"      value={String(filled)}  sub="fields"        />
        <KPIStat label="Partial"     value={String(partial)} sub="fields"        />
        <KPIStat label="Missing"     value={String(missing)} sub="fields"        note="Action required" />
      </div>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-gray-900">SEBI BRSR Section C — Principle 6 Auto-Fill Status</p>
          <button className="flex items-center gap-1.5 text-[11px] text-green-700 font-semibold border border-green-200 bg-green-50 px-3 py-1.5 rounded hover:bg-green-100 transition-colors">
            <Download size={12} />
            Export BRSR CSV
          </button>
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
            <span>Overall completion</span><span>{pct}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {["Section", "KPI / Disclosure", "Current Value", "Status"].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-[9.5px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BRSR_FIELDS.map((f, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2.5 text-[10px] text-gray-400 whitespace-nowrap">{f.section}</td>
                <td className="px-3 py-2.5 text-[11.5px] font-medium text-gray-800">{f.kpi}</td>
                <td className="px-3 py-2.5 text-[12px] tabular-nums font-semibold text-gray-700">{f.value}</td>
                <td className="px-3 py-2.5">
                  <Badge color={statusColor[f.status]}>{f.status.charAt(0).toUpperCase() + f.status.slice(1)}</Badge>
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
// 15. Team Leaderboard
// ═══════════════════════════════════════════════════════════════════════════════
const TEAM_MEMBERS = [
  { rank: 1, name: "Priya Sharma",  team: "Research",    avatar: "PS", carbon: 1240,  saving: 38, badge: "🏆 Champion",  badgeColor: "bg-amber-100 text-amber-700"  },
  { rank: 2, name: "Arjun Patel",   team: "Engineering", avatar: "AP", carbon: 1840,  saving: 29, badge: "🥈 Optimizer", badgeColor: "bg-gray-100  text-gray-700"   },
  { rank: 3, name: "Divya Menon",   team: "MLOps",       avatar: "DM", carbon: 2104,  saving: 24, badge: "🥉 Saver",     badgeColor: "bg-orange-50 text-orange-700" },
  { rank: 4, name: "Rajesh Kumar",  team: "Data Science",avatar: "RK", carbon: 2840,  saving: 18, badge: "⭐ Active",    badgeColor: "bg-blue-50   text-blue-600"   },
  { rank: 5, name: "Aisha Nair",    team: "Engineering", avatar: "AN", carbon: 3190,  saving: 12, badge: "✅ Compliant", badgeColor: "bg-green-50  text-green-600"  },
  { rank: 6, name: "Vikram Singh",  team: "Research",    avatar: "VS", carbon: 4230,  saving: 4,  badge: "⚠️ Improve",  badgeColor: "bg-red-50    text-red-600"    },
];

function TeamLeaderboardView() {
  const totalCarbon = TEAM_MEMBERS.reduce((a, m) => a + m.carbon, 0);
  const avgCarbon = Math.round(totalCarbon / TEAM_MEMBERS.length);
  const maxMemberCarbon = Math.max(...TEAM_MEMBERS.map((m) => m.carbon));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="Team Members"    value={String(TEAM_MEMBERS.length)}   sub="active"          />
        <KPIStat label="Total Emissions" value={totalCarbon.toLocaleString()}  sub="kg CO₂e/month"   />
        <KPIStat label="Avg per Member"  value={avgCarbon.toLocaleString()}    sub="kg CO₂e/month"   />
        <KPIStat label="Champion Saver"  value={TEAM_MEMBERS[0].name.split(" ")[0]} sub=""          note={`−${TEAM_MEMBERS[0].saving}% this month`} />
      </div>
      <Card>
        <p className="text-xs font-semibold text-gray-900 mb-2">Carbon Leaderboard — March 2026</p>
        <p className="text-[10.5px] text-gray-400 mb-4">Ranked by lowest carbon emissions per workload. Lower is better.</p>
        <div className="space-y-2">
          {TEAM_MEMBERS.map((m) => {
            const pct = (m.carbon / maxMemberCarbon) * 100;
            const barColor = m.rank === 1 ? "bg-amber-400" : m.rank === 2 ? "bg-gray-400" : m.rank === 3 ? "bg-orange-300" : m.rank <= 4 ? "bg-blue-400" : "bg-red-300";
            return (
              <div key={m.rank} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="text-[14px] font-black text-gray-300 w-6 text-center flex-shrink-0">
                  {m.rank <= 3 ? ["🥇","🥈","🥉"][m.rank - 1] : m.rank}
                </span>
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                  {m.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[12px] font-semibold text-gray-800">{m.name}</p>
                    <span className={clsx("text-[9px] px-1.5 py-0.5 rounded font-semibold", m.badgeColor)}>{m.badge}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1"><BarPct pct={pct} color={barColor} /></div>
                    <span className="text-[9px] text-gray-400 w-20 text-right">{m.team}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-[13px] font-bold text-gray-900 tabular-nums">{m.carbon.toLocaleString()}</p>
                  <p className="text-[9px] text-gray-400">kg CO₂e</p>
                </div>
                <div className="text-right flex-shrink-0 w-12">
                  <p className={clsx("text-[12px] font-semibold tabular-nums", m.saving > 0 ? "text-green-600" : "text-gray-400")}>
                    {m.saving > 0 ? `−${m.saving}%` : "—"}
                  </p>
                  <p className="text-[9px] text-gray-400">saved</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <p className="text-xs font-semibold text-gray-900 mb-4">Team Carbon by Department</p>
        <div className="flex gap-2 items-end" style={{ height: 80 }}>
          {[
            { label: "Research",    total: 5470, color: "bg-indigo-500" },
            { label: "Engineering", total: 5030, color: "bg-blue-500"   },
            { label: "MLOps",       total: 2104, color: "bg-teal-500"   },
            { label: "Data Sci",    total: 2840, color: "bg-violet-500" },
          ].map((d) => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[8px] text-gray-400 tabular-nums">{(d.total / 1000).toFixed(1)}k</span>
              <div className={clsx("w-full rounded-t", d.color)} style={{ height: `${(d.total / 5470) * 64}px` }} />
              <span className="text-[8px] text-gray-400 text-center">{d.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
// CI/CD Carbon Gate
// ═══════════════════════════════════════════════════════════════════════════════
const CICD_YAML = `name: BharatGreen Carbon Gate

on: [push, pull_request]

jobs:
  carbon-gate:
    name: Carbon Emission Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Estimate workload carbon footprint
        id: carbon
        run: |
          CARBON=$(curl -sf \\
            -X POST https://bharatgreen.ai/api/v1/carbon-gate \\
            -H "Authorization: Bearer \${{ secrets.BHARATGREEN_API_KEY }}" \\
            -H "Content-Type: application/json" \\
            -d '{
              "gpuType": "H100 SXM5",
              "gpuCount": 8,
              "durationHours": 4,
              "region": "mumbai"
            }' | jq -r '.carbonKgCO2e')
          echo "carbon=$CARBON" >> $GITHUB_OUTPUT

      - name: Enforce carbon threshold
        run: |
          THRESHOLD=\${{ vars.CARBON_THRESHOLD_KG }}
          CARBON=\${{ steps.carbon.outputs.carbon }}
          echo "Estimated carbon: \${CARBON} kg CO2e (threshold: \${THRESHOLD} kg)"
          if (( \$(echo "\$CARBON > \$THRESHOLD" | bc -l) )); then
            echo "::error::Carbon gate failed — \${CARBON} kg CO2e exceeds \${THRESHOLD} kg limit"
            echo "Tip: Switch region to Hampi Solar (-42%) or schedule off-peak (-28%)"
            exit 1
          fi
          echo "✓ Carbon gate passed"`;

const GATE_RUNS = [
  { sha: "a1b2c3d", branch: "main",     carbon: 28.4, threshold: 35, status: "pass", region: "Mumbai",    time: "14 min ago" },
  { sha: "e4f5a6b", branch: "feat/llm", carbon: 52.1, threshold: 35, status: "fail", region: "US East",   time: "2 hr ago"   },
  { sha: "c7d8e9f", branch: "main",     carbon: 31.2, threshold: 35, status: "pass", region: "Hampi",     time: "5 hr ago"   },
  { sha: "a0b1c2d", branch: "feat/llm", carbon: 47.8, threshold: 35, status: "fail", region: "Mumbai",    time: "1 day ago"  },
  { sha: "e3f4a5b", branch: "main",     carbon: 29.1, threshold: 35, status: "pass", region: "Hampi",     time: "2 days ago" },
];

type DemoStep = "idle" | "queued" | "estimating" | "blocked" | "passed";

function CICDCarbonGateView() {
  const [threshold, setThreshold] = React.useState(35);
  const [demoStep, setDemoStep] = React.useState<DemoStep>("idle");
  const [demoCarbon, setDemoCarbon] = React.useState(0);
  const [logLines, setLogLines] = React.useState<{ line: string; color: string }[]>([]);

  const runBlockedDemo = React.useCallback(() => {
    setDemoStep("queued");
    setDemoCarbon(0);
    setLogLines([]);
    const carbonEst = 52.1;
    const shouldBlock = carbonEst > threshold;
    
    const steps = [
      { delay: 400,  step: "queued" as DemoStep,     log: "▶ Pipeline triggered: feat/gpt4-finetune → main",      color: "#94a3b8" },
      { delay: 900,  step: "queued" as DemoStep,     log: "  Checking out SHA: e4f5a6b...",                        color: "#94a3b8" },
      { delay: 1400, step: "estimating" as DemoStep, log: "⚡ BharatGreen Carbon Gate starting pre-flight...",      color: "#fbbf24" },
      { delay: 1900, step: "estimating" as DemoStep, log: "  GPU: 8× H100 SXM5 · Region: Mumbai (IN-WE)",         color: "#94a3b8" },
      { delay: 2400, step: "estimating" as DemoStep, log: "  Duration: 6h · Grid: 748 gCO₂/kWh (LIVE)",           color: "#4ade80" },
      { delay: 2900, step: "estimating" as DemoStep, log: "  Calculating: 8 × 700W × 6h × 0.748 kg/kWh ...",      color: "#94a3b8" },
      { delay: 3500, step: "estimating" as DemoStep, carbonVal: 52, log: `  Estimated carbon: ${carbonEst.toFixed(1)} kg CO₂e`,       color: "#f87171" },
      { delay: 4100, step: (shouldBlock ? "blocked" : "passed") as DemoStep, carbonVal: 52, log: `  Threshold: ${threshold} kg CO₂e`,       color: "#94a3b8" },
      { delay: 4200, step: (shouldBlock ? "blocked" : "passed") as DemoStep, carbonVal: 52, 
        log: shouldBlock 
          ? `✗ CARBON GATE FAILED — ${carbonEst.toFixed(1)} kg > ${threshold} kg threshold`
          : `✓ CARBON GATE PASSED — ${carbonEst.toFixed(1)} kg < ${threshold} kg threshold`,
        color: shouldBlock ? "#ef4444" : "#22c55e" },
      { delay: 4500, step: (shouldBlock ? "blocked" : "passed") as DemoStep, carbonVal: 52, 
        log: shouldBlock 
          ? "  💡 Tip: Switch to Hampi Solar (IN-SO, 45g) → saves 38.2 kg (−73%)"
          : "  ✓ Carbon Passport updated · Logged to audit trail",
        color: shouldBlock ? "#4ade80" : "#22c55e" },
      { delay: 4800, step: (shouldBlock ? "blocked" : "passed") as DemoStep, carbonVal: 52, 
        log: shouldBlock 
          ? "  💡 Tip: Schedule at 3:00 AM off-peak → saves 14.6 kg (−28%)"
          : "  ✓ Proceeding to deploy...",
        color: shouldBlock ? "#4ade80" : "#22c55e" },
      { delay: 5000, step: (shouldBlock ? "blocked" : "passed") as DemoStep, carbonVal: 52, 
        log: shouldBlock
          ? "  See: https://bharatgreen.ai/passport for carbon audit trail"
          : "",
        color: "#818cf8" },
    ].filter(s => s.log);
    
    steps.forEach(({ delay, step, carbonVal, log, color }) => {
      setTimeout(() => {
        setDemoStep(step);
        if (carbonVal !== undefined) setDemoCarbon(carbonVal);
        setLogLines((prev) => [...prev, { line: log, color }]);
      }, delay);
    });
  }, [threshold]);

  const runPassDemo = React.useCallback(() => {
    setDemoStep("queued");
    setDemoCarbon(0);
    setLogLines([]);
    const steps: { delay: number; step: DemoStep; carbonVal?: number; log: string; color: string }[] = [
      { delay: 400,  step: "queued",     log: "▶ Pipeline triggered: main → production",               color: "#94a3b8" },
      { delay: 900,  step: "estimating", log: "⚡ BharatGreen Carbon Gate starting pre-flight...",      color: "#fbbf24" },
      { delay: 1400, step: "estimating", log: "  GPU: 8× H100 SXM5 · Region: Hampi Solar (IN-SO)",    color: "#94a3b8" },
      { delay: 1900, step: "estimating", log: "  Duration: 6h · Grid: 43 gCO₂/kWh (LIVE — solar)",    color: "#4ade80" },
      { delay: 2500, step: "estimating", carbonVal: 14, log: "  Estimated carbon: 14.1 kg CO₂e",       color: "#4ade80" },
      { delay: 3000, step: "passed",     carbonVal: 14, log: `  Threshold: ${threshold} kg CO₂e`,       color: "#94a3b8" },
      { delay: 3100, step: "passed",     carbonVal: 14, log: `✓ CARBON GATE PASSED — 14.1 kg < ${threshold} kg threshold`, color: "#22c55e" },
      { delay: 3400, step: "passed",     carbonVal: 14, log: "  ✓ Carbon Passport updated · Logged to audit trail", color: "#22c55e" },
      { delay: 3600, step: "passed",     carbonVal: 14, log: "  ✓ Proceeding to deploy...", color: "#22c55e" },
    ];
    steps.forEach(({ delay, step, carbonVal, log, color }) => {
      setTimeout(() => {
        setDemoStep(step);
        if (carbonVal !== undefined) setDemoCarbon(carbonVal);
        setLogLines((prev) => [...prev, { line: log, color }]);
      }, delay);
    });
  }, [threshold]);

  const isRunning = demoStep === "queued" || demoStep === "estimating";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="Gates Checked (30d)"  value="148"  sub="pipeline runs"  />
        <KPIStat label="Blocked Runs"          value="17"   sub="over threshold" note="11.5% block rate" />
        <KPIStat label="Carbon Saved"          value="284"  sub="kg CO₂e"        note="vs no gate policy" />
        <KPIStat label="Current Threshold"     value={String(threshold)} sub="kg CO₂e / run" />
      </div>

      {/* Live terminal demo */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-gray-900">🎬 Live Demo — Watch It Block a Run</p>
            <p className="text-[10.5px] text-gray-400 mt-0.5">See how the carbon gate evaluates workloads in real-time</p>
          </div>
          <div className="flex gap-2">
            <button
              disabled={isRunning}
              onClick={() => { setDemoStep("idle"); setLogLines([]); runPassDemo(); }}
              className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-40 transition-all"
            >
              ✓ Pass Demo
            </button>
            <button
              disabled={isRunning}
              onClick={() => { setDemoStep("idle"); setLogLines([]); runBlockedDemo(); }}
              className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              {isRunning ? <><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />Running...</> : <>⚡ git push feat/gpt4</>}
            </button>
          </div>
        </div>
        <div
          className="rounded-xl p-4 font-mono text-[10.5px] leading-relaxed min-h-[120px] overflow-y-auto"
          style={{ background: "#0d1117", maxHeight: 220 }}
        >
          {logLines.length === 0 ? (
            <span style={{ color: "#475569" }}>$ # Click a button above to run the demo...</span>
          ) : (
            logLines.map((l, i) => (
              <div key={i} style={{ color: l.color }}>{l.line}</div>
            ))
          )}
          {isRunning && <span className="inline-block w-2 h-3.5 bg-green-400 animate-pulse ml-0.5 align-middle" />}
        </div>
        {(demoStep === "blocked" || demoStep === "passed") && (
          <div className={clsx(
            "mt-3 rounded-xl p-3 flex items-center justify-between",
            demoStep === "blocked" ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"
          )}>
            <div className="flex items-center gap-3">
              <span className={clsx("text-2xl font-black", demoStep === "blocked" ? "text-red-600" : "text-green-600")}>
                {demoStep === "blocked" ? "✗ BLOCKED" : "✓ PASSED"}
              </span>
              <div>
                <p className={clsx("text-[12px] font-semibold", demoStep === "blocked" ? "text-red-700" : "text-green-700")}>
                  {demoCarbon} kg CO₂e {demoStep === "blocked" ? `exceeds ${threshold} kg` : `within ${threshold} kg`}
                </p>
                <p className={clsx("text-[10px]", demoStep === "blocked" ? "text-red-500" : "text-green-500")}>
                  {demoStep === "blocked" ? "Switch to Hampi Solar or schedule off-peak" : "Carbon logged to Carbon Passport"}
                </p>
              </div>
            </div>
            <button onClick={() => { setDemoStep("idle"); setLogLines([]); }} className="text-[10px] text-gray-400 border border-gray-200 rounded-md px-2 py-1">Reset</button>
          </div>
        )}
      </Card>

      {/* Concept explainer */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-4 py-3">
        <p className="text-[11.5px] font-semibold text-green-800 mb-1">How the CI/CD Carbon Gate works</p>
        <p className="text-[11px] text-green-700 leading-relaxed">
          Every push triggers a lightweight carbon pre-flight: BharatGreen estimates the GPU·hours × regional grid intensity
          and compares against your org threshold. If the job would exceed the limit, the pipeline fails with a
          remediation hint (e.g., "switch to Hampi Solar −42%"). Passing runs are logged to your Carbon Passport.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Threshold slider */}
        <Card>
          <p className="text-xs font-semibold text-gray-900 mb-4">Gate Threshold Configuration</p>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[11px] text-gray-600 mb-2">
                <span>Carbon threshold per pipeline run</span>
                <span className="font-bold text-green-700">{threshold} kg CO₂e</span>
              </div>
              <input
                type="range" min={5} max={150} step={5} value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-green-500"
              />
              <div className="flex justify-between text-[9px] text-gray-300 mt-1">
                <span>5 kg (strict)</span><span>150 kg (lenient)</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[10.5px]">
              <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                <p className="font-bold text-green-700">≤ {threshold} kg</p>
                <p className="text-green-600 mt-0.5">✓ Gate pass</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                <p className="font-bold text-amber-700">{threshold + 1}–{threshold * 2} kg</p>
                <p className="text-amber-600 mt-0.5">⚠ Warn only</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                <p className="font-bold text-red-700">&gt; {threshold * 2} kg</p>
                <p className="text-red-600 mt-0.5">✗ Hard block</p>
              </div>
            </div>
            <div className="text-[10px] text-gray-400 space-y-1">
              <p>🔗 Webhook: <code className="bg-gray-100 px-1 rounded font-mono">POST /api/v1/carbon-gate</code></p>
              <p>🔑 Auth: Bearer token via <code className="bg-gray-100 px-1 rounded font-mono">BHARATGREEN_API_KEY</code> secret</p>
              <p>📦 Org threshold env var: <code className="bg-gray-100 px-1 rounded font-mono">CARBON_THRESHOLD_KG</code></p>
            </div>
          </div>
        </Card>

        {/* Recent gate runs */}
        <Card>
          <p className="text-xs font-semibold text-gray-900 mb-4">Recent Pipeline Gate Results</p>
          <div className="space-y-2">
            {GATE_RUNS.map((r) => (
              <div key={r.sha} className={clsx("flex items-center gap-3 p-2.5 rounded-lg border", r.status === "pass" ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100")}>
                <span className={clsx("text-[13px]", r.status === "pass" ? "text-green-600" : "text-red-500")}>{r.status === "pass" ? "✓" : "✗"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] font-mono text-gray-500">{r.sha}</code>
                    <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{r.branch}</span>
                    <span className="text-[9px] text-gray-400">{r.region}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    <span className={clsx("font-bold", r.status === "pass" ? "text-green-700" : "text-red-600")}>{r.carbon} kg</span>
                    <span className="text-gray-400"> vs {r.threshold} kg threshold</span>
                  </p>
                </div>
                <span className="text-[9px] text-gray-400 flex-shrink-0">{r.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* GitHub Actions YAML */}
      <Card>
        <p className="text-xs font-semibold text-gray-900 mb-1">GitHub Actions Workflow</p>
        <p className="text-[10.5px] text-gray-400 mb-3">Copy this into <code className="bg-gray-100 px-1 rounded font-mono">.github/workflows/carbon-gate.yml</code></p>
        <div className="relative">
          <pre className="bg-gray-900 text-green-300 rounded-xl p-4 text-[10.5px] font-mono leading-relaxed overflow-x-auto whitespace-pre">
            {CICD_YAML}
          </pre>
          <button
            className="absolute top-3 right-3 bg-gray-700 hover:bg-gray-600 text-gray-200 text-[10px] px-2.5 py-1 rounded-md transition-colors"
            onClick={() => navigator.clipboard.writeText(CICD_YAML)}
          >
            Copy
          </button>
        </div>
      </Card>
    </div>
  );
}