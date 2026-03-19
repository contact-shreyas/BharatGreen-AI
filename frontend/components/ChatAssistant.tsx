"use client";
// ─────────────────────────────────────────────────────────────────────────────
// BharatGreen AI — Nemotron Chat Assistant
// Floating chat panel powered by NVIDIA Nemotron (with offline mock fallback).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import { WorkloadInput, CalculationResult } from "@/lib/types";
import { getRegion } from "@/lib/regionalData";
import clsx from "clsx";

interface Message {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const QUICK_PROMPTS = [
  "How can I reduce carbon by 50%?",
  "Which GPU has the best carbon efficiency?",
  "What is my water footprint impact?",
  "Explain my BRSR obligations",
  "Show renewable energy options for my region",
];

// Smart offline responses keyed on keyword groups
const OFFLINE_RESPONSES: { test: RegExp; reply: (i: WorkloadInput, r: CalculationResult) => string }[] = [
  {
    test: /reduc|cut|lower|decreas|50%|optim/i,
    reply: (i, r) => {
      const region = getRegion(i.region);
      const saving = Math.round(r.totalCarbonKgCO2e * 0.38);
      return `**Top 3 actions to cut your footprint:**\n\n1. **Switch region** — Moving from ${region.displayName.split(" (")[0]} (${region.gridIntensityGCO2} gCO₂/kWh) to Hampi Solar Farm (54 gCO₂/kWh) saves ~**38%** (≈${saving} kg CO₂e).\n\n2. **Off-peak scheduling** — Running at 3–5 AM reduces grid carbon by up to **22%** on the Indian grid (minimum thermal generation).\n\n3. **Utilization tuning** — Bumping GPU utilization from ${i.utilizationPct}% → 90% saves energy per workload by ~**${Math.round((1 - i.utilizationPct / 90) * 100)}%** through better amortisation of idle power.\n\nCombined potential: **up to 55% reduction**.`;
    },
  },
  {
    test: /gpu|chip|hardware|h100|a100|best/i,
    reply: () =>
      `**Carbon efficiency ranking (inference @ 100% utilization):**\n\n| GPU | TDP | Eco-index |\n|---|---|---|\n| H100 SXM5 | 700 W | ⭐⭐⭐⭐⭐ |\n| A100 SXM4 | 400 W | ⭐⭐⭐⭐ |\n| H100 PCIe | 350 W | ⭐⭐⭐⭐ |\n| A10G | 150 W | ⭐⭐⭐ (best for inference) |\n| T4 | 70 W | ⭐⭐ (low carbon, low perf) |\n\nFor inference workloads the **A10G** gives the best carbon-per-token ratio. For large-scale training with a renewable grid, **H100 SXM5** is most efficient per FLOP.`,
  },
  {
    test: /water|wue|coolant/i,
    reply: (i, r) => {
      const region = getRegion(i.region);
      return `**Water consumption analysis:**\n\nYour workload on ${region.displayName.split(" (")[0]} consumed an estimated **${r.waterLiters.toFixed(0)} L** of water (WUE = ${region.wueLitersPerKWh} L/kWh).\n\nIndia faces **severe water stress** — data centers here should target WUE < 1.1. Facilities in Chennai and Hyderabad use seawater cooling in new builds.\n\n**Actions:**\n• Prefer regions with WUE ≤ 1.1 (e.g. Mumbai, Hampi Solar)\n• Request data center Water Stewardship Certifications\n• Disclose under BRSR Principle 6 (Environmental Responsibility)`;
    },
  },
  {
    test: /brsr|sebi|compli|report|esg|regulat/i,
    reply: () =>
      `**BRSR (Business Responsibility & Sustainability Reporting) for AI ops:**\n\nSEBI mandates BRSR for top-1000 listed companies from FY23. Key AI-related disclosures:\n\n• **Section C – Principle 6**: GHG emissions (Scope 1, 2, 3), energy intensity, water usage\n• **KPI 7**: Energy consumed from renewables\n• **KPI 8**: Scope 2 emissions from data center operations\n\n**BharatGreen AI automates:** carbon attribution per AI job, renewable % tracking, and CSV export formatted for BRSR templates. Use the **BRSR Compliance** page to generate your report.`,
  },
  {
    test: /renew|solar|wind|green energy|rec|certificate/i,
    reply: (i) => {
      const region = getRegion(i.region);
      return `**Renewable Energy Certificates (RECs) for ${region.displayName.split(" (")[0]}:**\n\nIndia's REC market (IEX platform) currently prices:\n• **Solar REC**: ₹1,000 – ₹3,500 / MWh\n• **Non-solar REC**: ₹500 – ₹1,500 / MWh\n\n**For your workload:**\nYou could fully offset emissions by purchasing RECs matching your energy consumption. This qualifies as Scope 2 market-based accounting under GHG Protocol.\n\nNote: Hampi Solar Farm and Tamil Nadu Solar Park already have >90% renewable supply — no RECs needed if you route workloads there.`;
    },
  },
  {
    test: /.*/,
    reply: (i, r) =>
      `**BharatGreen AI — Carbon Summary for this workload:**\n\n• **Energy**: ${r.energyKWh.toFixed(2)} kWh\n• **Carbon**: ${r.totalCarbonKgCO2e.toFixed(2)} kg CO₂e *(includes embodied: ${r.embodiedCarbonKg.toFixed(2)} kg)*\n• **Water**: ${r.waterLiters.toFixed(0)} L consumed\n• **Carbon cost**: ₹${Math.round((r.totalCarbonKgCO2e / 1000) * 750)} (shadow carbon at ₹750/tonne)\n• **Equivalent trees**: ${r.treesOffset.toFixed(1)} trees/year to offset\n\nAsk me anything about reducing your workload's environmental impact, GPU selection, BRSR compliance, or green scheduling!`,
  },
];

function getOfflineReply(userMsg: string, input: WorkloadInput, result: CalculationResult): string {
  const handler = OFFLINE_RESPONSES.find((o) => o.test.test(userMsg));
  return handler ? handler.reply(input, result) : OFFLINE_RESPONSES[OFFLINE_RESPONSES.length - 1].reply(input, result);
}

async function callNemotronChat(message: string, context: string): Promise<string | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  try {
    const res = await fetch(`${apiUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.reply ?? null;
  } catch {
    return null;
  }
}

interface Props {
  input: WorkloadInput;
  result: CalculationResult | null;
}

export default function ChatAssistant({ input, result }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `👋 I'm **BharatGreen AI**, your Nemotron-powered carbon intelligence assistant.\n\nI can help you reduce your AI workload carbon footprint, understand BRSR compliance, explore green scheduling, and more. What would you like to know?`,
      ts: Date.now(),
    },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      const userMsg: Message = { role: "user", content: text.trim(), ts: Date.now() };
      setMessages((m) => [...m, userMsg]);
      setDraft("");
      setLoading(true);

      const context = result
        ? `User's current AI workload: ${input.numGPUs}× ${input.gpuType}, ${input.durationHours}h in ${input.region} at ${input.utilizationPct}% utilization. Carbon: ${result.totalCarbonKgCO2e.toFixed(2)} kg CO₂e, Energy: ${result.energyKWh.toFixed(2)} kWh, Water: ${result.waterLiters.toFixed(0)} L.`
        : "No workload calculated yet.";

      // Try backend first, fall back to rich offline responses
      const backendReply = await callNemotronChat(text.trim(), context);
      const reply = backendReply ?? getOfflineReply(text.trim(), input, result ?? ({} as CalculationResult));

      setLoading(false);
      setMessages((m) => [...m, { role: "assistant", content: reply, ts: Date.now() }]);
    },
    [loading, input, result]
  );

  function renderContent(text: string) {
    // Simple markdown: **bold**, bullet points, tables (basic)
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("• ") || line.startsWith("- ")) {
        const inner = line.slice(2).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        return <li key={i} className="ml-3 text-[12px]" dangerouslySetInnerHTML={{ __html: inner }} />;
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} className="font-bold text-[12px] mt-2 mb-0.5">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith("|")) {
        // Very basic table line rendering
        const cells = line.split("|").filter(Boolean).map((c) => c.trim());
        return (
          <div key={i} className="flex gap-2 text-[11px] font-mono border-b border-gray-100 py-0.5">
            {cells.map((c, j) => (
              <span key={j} className="flex-1">{c}</span>
            ))}
          </div>
        );
      }
      const processed = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      if (!line.trim()) return <div key={i} className="h-1.5" />;
      return <p key={i} className="text-[12px] leading-relaxed" dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300",
          open
            ? "bg-gray-800 text-white rotate-0"
            : "bg-gradient-to-br from-green-500 to-emerald-600 text-white hover:scale-110"
        )}
        title="BharatGreen AI Chat"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
            <Sparkles size={9} className="text-white" />
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[560px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-4 py-3 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-[13px]">BharatGreen AI</p>
              <p className="text-green-100 text-[10px]">Powered by NVIDIA Nemotron · Carbon Intelligence</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
              <span className="text-green-200 text-[10px]">Live</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 max-h-[360px]">
            {messages.map((msg) => (
              <div
                key={msg.ts}
                className={clsx("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                <div
                  className={clsx(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    msg.role === "user" ? "bg-indigo-500" : "bg-gradient-to-br from-green-500 to-emerald-600"
                  )}
                >
                  {msg.role === "user" ? (
                    <User size={12} className="text-white" />
                  ) : (
                    <Bot size={12} className="text-white" />
                  )}
                </div>
                <div
                  className={clsx(
                    "rounded-2xl px-3 py-2 max-w-[82%] text-gray-800",
                    msg.role === "user"
                      ? "bg-indigo-500 text-white rounded-tr-sm"
                      : "bg-gray-50 border border-gray-100 rounded-tl-sm"
                  )}
                >
                  {msg.role === "user" ? (
                    <p className="text-[12px] text-white">{msg.content}</p>
                  ) : (
                    <div className="text-gray-800 space-y-0.5">{renderContent(msg.content)}</div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Loader2 size={12} className="text-white animate-spin" />
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          <div className="px-3 py-2 border-t border-gray-100">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="flex-shrink-0 bg-gray-100 hover:bg-green-50 hover:text-green-700 text-gray-600 text-[10px] px-2.5 py-1 rounded-full border border-gray-200 hover:border-green-300 transition-all whitespace-nowrap"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-1 flex gap-2">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(draft)}
              placeholder="Ask about carbon, GPUs, BRSR..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200 transition-all"
            />
            <button
              onClick={() => sendMessage(draft)}
              disabled={!draft.trim() || loading}
              className="w-9 h-9 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 rounded-lg flex items-center justify-center transition-colors"
            >
              <Send size={14} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
