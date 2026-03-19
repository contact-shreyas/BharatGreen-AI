"use client";
// ─────────────────────────────────────────────────────────────────────────────
// BharatGreen AI — Carbon Budget Enforcer
// Arc gauge showing monthly carbon spend vs user-defined budget.
// Auto-projects end-of-month total and fires a warning when close to limit.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import { CalculationResult } from "@/lib/types";
import { ShieldAlert, ShieldCheck, Settings } from "lucide-react";
import clsx from "clsx";

interface Props {
  latestResult: CalculationResult;
}

// Approximate days elapsed in current month
const TODAY = new Date();
const DAY_OF_MONTH = TODAY.getDate();
const DAYS_IN_MONTH = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0).getDate();

// Simulated YTD spend (Mar 2026, runs so far this month)
const SPENT_SO_FAR_KG = 20_934;

const DEFAULT_BUDGET_KG = 30_000;

export default function CarbonBudgetGauge({ latestResult }: Props) {
  const [budget, setBudget] = useState(DEFAULT_BUDGET_KG);
  const [showEdit, setShowEdit] = useState(false);

  const dailyRate = SPENT_SO_FAR_KG / DAY_OF_MONTH;
  const projected = Math.round(dailyRate * DAYS_IN_MONTH);
  const pct = Math.min((SPENT_SO_FAR_KG / budget) * 100, 100);

  const status =
    pct >= 90 ? "critical" :
    pct >= 70 ? "warning"  : "safe";

  const arcColor =
    status === "critical" ? "#ef4444" :
    status === "warning"  ? "#f59e0b" : "#22c55e";

  // SVG arc maths
  const R = 52;
  const CX = 70;
  const CY = 70;
  const CIRCUM = Math.PI * R; // half circle
  const arcLen = (pct / 100) * CIRCUM;
  const dashArray = `${arcLen} ${CIRCUM}`;
  const dashOffset = 0;

  const budgetINR = Math.round((budget / 1000) * 750); // ₹750/tonne

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-semibold text-gray-900">Carbon Budget Enforcer</p>
          <p className="text-[10px] text-gray-400 mt-0.5">March 2026 · Monthly limit</p>
        </div>
        <div className="flex items-center gap-2">
          {status === "critical" ? (
            <ShieldAlert size={18} className="text-red-500" />
          ) : status === "warning" ? (
            <ShieldAlert size={18} className="text-amber-400" />
          ) : (
            <ShieldCheck size={18} className="text-green-500" />
          )}
          <button
            onClick={() => setShowEdit((s) => !s)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Budget edit */}
      {showEdit && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
            Monthly Budget (kg CO₂e)
          </label>
          <input
            type="range"
            min={5000}
            max={100000}
            step={1000}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full accent-green-500"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>5,000 kg</span>
            <span className="font-semibold text-gray-700">{budget.toLocaleString()} kg</span>
            <span>100,000 kg</span>
          </div>
        </div>
      )}

      {/* Arc gauge */}
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0" style={{ width: 140, height: 80 }}>
          <svg width="140" height="90" viewBox="0 0 140 90">
            {/* Background arc */}
            <path
              d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Value arc */}
            <path
              d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
              fill="none"
              stroke={arcColor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.4s ease" }}
            />
            {/* Centre pct */}
            <text x={CX} y={CY - 8} textAnchor="middle" style={{ fontSize: 22, fontWeight: 800, fill: arcColor }}>
              {Math.round(pct)}%
            </text>
            <text x={CX} y={CY + 8} textAnchor="middle" style={{ fontSize: 9, fill: "#94a3b8" }}>
              of budget
            </text>
          </svg>
        </div>
        <div className="flex-1 space-y-2.5">
          <Stat label="Spent (Mar 1–20)" value={`${SPENT_SO_FAR_KG.toLocaleString()} kg`} />
          <Stat label="Budget" value={`${budget.toLocaleString()} kg`} sub={`≈ ₹${budgetINR.toLocaleString()}`} />
          <Stat
            label="Projected EOMonth"
            value={`${projected.toLocaleString()} kg`}
            alert={projected > budget}
          />
          <Stat
            label="Latest job adds"
            value={`+${latestResult.totalCarbonKgCO2e} kg`}
            sub="this run"
          />
        </div>
      </div>

      {/* Status banner */}
      <div
        className={clsx(
          "rounded-lg px-3 py-2 text-[11px] font-medium flex items-center gap-2",
          status === "critical" ? "bg-red-50 border border-red-200 text-red-700" :
          status === "warning"  ? "bg-amber-50 border border-amber-200 text-amber-700" :
                                  "bg-green-50 border border-green-200 text-green-700"
        )}
      >
        {status === "critical" ? "🚨 Budget nearly exhausted — consider pausing non-critical jobs" :
         status === "warning"  ? "⚠️  Approaching budget limit — enable Green Scheduler to save carbon" :
                                 "✅  On track — projected within monthly budget"}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[10.5px] text-gray-400">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={clsx("text-[12px] font-semibold tabular-nums", alert ? "text-red-600" : "text-gray-800")}>
          {value}
        </span>
        {sub && <span className="text-[9.5px] text-gray-400">{sub}</span>}
      </div>
    </div>
  );
}
