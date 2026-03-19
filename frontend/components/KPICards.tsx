"use client";

import { CalculationResult } from "@/lib/types";
import { Zap, CloudRain, Droplets, TreePine, IndianRupee } from "lucide-react";
import { carbonCostINR } from "@/lib/calculations";
import clsx from "clsx";

interface Props {
  result: CalculationResult | null;
}

interface CardDef {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  value: (r: CalculationResult) => string;
  unit: string;
}

const CARDS: CardDef[] = [
  {
    title: "Energy Used",
    subtitle: "Total cluster energy",
    icon: <Zap size={16} />,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-400",
    value: (r) => r.energyKWh.toFixed(1),
    unit: "kWh",
  },
  {
    title: "Carbon Emissions",
    subtitle: "Total footprint",
    icon: <CloudRain size={16} />,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    value: (r) => r.carbonKgCO2e.toFixed(2),
    unit: "kg CO₂ₑ",
  },
  {
    title: "Water Usage",
    subtitle: "Cooling consumption",
    icon: <Droplets size={16} />,
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-500",
    value: (r) => r.waterLiters.toFixed(1),
    unit: "liters",
  },
  {
    title: "Trees to Offset",
    subtitle: "Annual offset needed",
    icon: <TreePine size={16} />,
    iconBg: "bg-green-50",
    iconColor: "text-green-500",
    value: (r) => r.treesOffset.toFixed(1),
    unit: "trees/yr",
  },
  {
    title: "Carbon Cost",
    subtitle: "Shadow tax · ₹750/tonne",
    icon: <IndianRupee size={16} />,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-500",
    value: (r) => Math.round(carbonCostINR(r.totalCarbonKgCO2e)).toLocaleString(),
    unit: "₹",
  },
];

export default function KPICards({ result }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {CARDS.map((card) => (
        <div
          key={card.title}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col"
        >
          {/* Row: title + icon */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest leading-tight">
              {card.title}
            </p>
            <div className={clsx("p-1.5 rounded-md flex-shrink-0", card.iconBg, card.iconColor)}>
              {card.icon}
            </div>
          </div>

          {/* Big number + inline unit (matches screenshot style) */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-[2rem] font-bold text-gray-900 leading-none tabular-nums tracking-tight">
              {result ? card.value(result) : "—"}
            </span>
            <span className="text-[11px] text-gray-400 font-medium">{card.unit}</span>
          </div>

          {/* Subtitle */}
          <p className="text-[10.5px] text-gray-400 mt-2">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
