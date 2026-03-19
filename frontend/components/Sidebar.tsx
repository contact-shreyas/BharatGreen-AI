"use client";

import {
  LayoutDashboard,
  Cpu,
  Building2,
  BarChart3,
  Layers,
  ArrowLeftRight,
  Droplets,
  Zap,
  Wind,
  FileText,
  ClipboardCheck,
  Leaf,
} from "lucide-react";
import clsx from "clsx";

interface NavItem {
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

const NAV: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard",     icon: <LayoutDashboard size={15} /> },
      { label: "AI Workloads",  icon: <Cpu size={15} /> },
      { label: "Data Centers",  icon: <Building2 size={15} /> },
    ],
  },
  {
    title: "EMISSIONS",
    items: [
      { label: "Carbon Report",     icon: <BarChart3 size={15} /> },
      { label: "Scope 1 / 2 / 3",  icon: <Layers size={15} /> },
      { label: "Offsets & Credits", icon: <ArrowLeftRight size={15} /> },
    ],
  },
  {
    title: "RESOURCES",
    items: [
      { label: "Water Usage",    icon: <Droplets size={15} /> },
      { label: "GPU Efficiency", icon: <Zap size={15} /> },
      { label: "Energy Mix",     icon: <Wind size={15} /> },
    ],
  },
  {
    title: "COMPLIANCE",
    items: [
      { label: "ESG Reports",  icon: <FileText size={15} /> },
      { label: "Audit Trail",  icon: <ClipboardCheck size={15} /> },
    ],
  },
];

export default function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <aside className="flex flex-col w-56 min-h-screen bg-[#0f1117] text-gray-400 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-800">
        <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-lg shadow-lg shadow-green-500/30">
          <Leaf size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-tight">CarbonSense AI</p>
          <p className="text-[10px] text-gray-500 leading-tight">Enterprise Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV.map((section) => (
          <div key={section.title}>
            <p className="px-2 mb-1.5 text-[10px] font-semibold tracking-widest text-gray-600 uppercase">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeView === item.label;
                return (
                <li key={item.label}>
                  <button
                    onClick={() => onNavigate(item.label)}
                    className={clsx(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-colors",
                      isActive
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200"
                    )}
                  >
                    <span className={isActive ? "text-green-400" : ""}>{item.icon}</span>
                    {item.label}
                  </button>
                </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — NVIDIA branding */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-[#76b900] rounded text-black font-black text-xs">
            NV
          </div>
          <div>
            <p className="text-xs font-medium text-gray-200">NVIDIA Corp</p>
            <p className="text-[10px] text-gray-500">Enterprise · 2015</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
