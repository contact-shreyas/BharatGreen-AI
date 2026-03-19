"use client";

import { useEffect, useRef, useState } from "react";
import { AnalysisStatus } from "@/lib/types";
import { Bot, Loader2, CheckCircle, Activity } from "lucide-react";

interface Props {
  displayedText: string;
  fullText: string;
  status: AnalysisStatus;
  timestamp: string;
}

/**
 * AgentAnalysis renders the Nemotron ReAct trace with a terminal-like style.
 * Keywords like "Thought:", "Action:", "Final Answer:" are highlighted to
 * make the agent's reasoning chain visually scannable.
 */
export default function AgentAnalysis({ displayedText, fullText, status, timestamp }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [insights, setInsights] = useState<{
    avgIntensity: number;
    highCount: number;
    lowCount: number;
    total: number;
    states: number;
    fetchedAt: number;
    source: "live" | "simulated";
  } | null>(null);

  const [insightError, setInsightError] = useState<string>("");

  // Auto-scroll to bottom as text streams in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedText]);

  // Real-time insight feed for empty state (refresh every 30 s)
  useEffect(() => {
    let cancelled = false;

    const fetchInsights = async () => {
      try {
        const res = await fetch("/api/district-intensity?limit=1000", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;

        const liveShare = Number(json.liveShare || 0);
        setInsights({
          avgIntensity: Number(json?.insights?.avgIntensity || 0),
          highCount: Number(json?.insights?.highCount || 0),
          lowCount: Number(json?.insights?.lowCount || 0),
          total: Number(json?.returned || 0),
          states: Array.isArray(json?.states) ? json.states.length : 0,
          fetchedAt: Number(json?.fetchedAt || Date.now()),
          source: liveShare > 0 ? "live" : "simulated",
        });
        setInsightError("");
      } catch {
        if (!cancelled) setInsightError("Live insight feed unavailable");
      }
    };

    fetchInsights();
    const id = setInterval(fetchInsights, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const isEmpty = !displayedText && status !== "analyzing";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bot size={15} className="text-green-500" />
          <p className="text-xs font-semibold text-gray-800">BharatGreen Agent Analysis</p>
        </div>
        <div className="flex items-center gap-2">
          {status === "analyzing" && (
            <Loader2 size={12} className="text-amber-500 animate-spin" />
          )}
          {status === "done" && fullText && (
            <CheckCircle size={12} className="text-green-500" />
          )}
          {timestamp && (
            <span className="text-[10px] text-gray-400">
              Analysis complete · {timestamp}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[11.5px] leading-5 bg-gray-50/50 rounded-b-xl"
      >
        {isEmpty ? (
          <div className="h-full flex flex-col justify-center gap-5 text-gray-500 px-3">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <Activity size={18} />
              <span className="text-xs font-semibold">Real-Time Sustainability Insights</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InsightCard label="Avg District Intensity" value={`${insights?.avgIntensity ?? "--"} gCO2/kWh`} />
              <InsightCard label="High-Carbon Districts" value={`${insights?.highCount ?? "--"}`} />
              <InsightCard label="Low-Carbon Districts" value={`${insights?.lowCount ?? "--"}`} />
              <InsightCard label="Districts Tracked" value={`${insights?.total ?? "--"}`} />
            </div>

            <div className="text-[11px] text-center">
              <div>
                Source: <span className="font-semibold text-gray-700">{insights?.source ?? "--"}</span>
                {" · "}
                States covered: <span className="font-semibold text-gray-700">{insights?.states ?? "--"}</span>
              </div>
              <div className="mt-1">
                {insightError
                  ? insightError
                  : `Updated: ${insights?.fetchedAt ? new Date(insights.fetchedAt).toLocaleTimeString() : "--"}`}
              </div>
            </div>

            <p className="text-xs text-center text-gray-400">
              Fill in the workload details above and click{" "}
              <span className="font-semibold text-green-600">Analyze</span> to generate
              the Nemotron sustainability report.
            </p>
          </div>
        ) : (
          <HighlightedTrace text={displayedText} isStreaming={status === "analyzing"} />
        )}
      </div>
    </div>
  );
}

function InsightCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-center">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}

// ─── Syntax-highlighted trace renderer ───────────────────────────────────────
function HighlightedTrace({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const lines = text.split("\n");

  return (
    <div>
      {lines.map((line, i) => (
        <div key={i} className="min-h-[1.25rem]">
          <HighlightLine line={line} />
        </div>
      ))}
      {/* blinking caret while streaming */}
      {isStreaming && (
        <span className="inline-block w-1.5 h-3.5 bg-green-500 ml-0.5 animate-pulse" />
      )}
    </div>
  );
}

function HighlightLine({ line }: { line: string }) {
  if (line.startsWith("Thought:"))
    return (
      <span>
        <span className="text-purple-500 font-semibold">Thought:</span>
        <span className="text-gray-600">{line.slice(8)}</span>
      </span>
    );

  if (line.startsWith("Action Input:"))
    return (
      <span>
        <span className="text-blue-500 font-semibold">Action Input:</span>
        <span className="text-gray-500">{line.slice(13)}</span>
      </span>
    );

  if (line.startsWith("Action:"))
    return (
      <span>
        <span className="text-blue-600 font-semibold">Action:</span>
        <span className="text-blue-400">{line.slice(7)}</span>
      </span>
    );

  if (line.startsWith("Observation:"))
    return (
      <span>
        <span className="text-amber-500 font-semibold">Observation:</span>
        <span className="text-gray-600">{line.slice(12)}</span>
      </span>
    );

  if (line.startsWith("Final Answer:"))
    return (
      <>
        <span className="text-green-600 font-bold">Final Answer:</span>
        <span className="text-gray-800">{line.slice(13)}</span>
      </>
    );

  // Code block delimiters
  if (line.startsWith("```"))
    return <span className="text-gray-400 select-none">{line}</span>;

  // Numbered list items
  if (/^\d+\./.test(line))
    return <span className="text-gray-800 font-medium">{line}</span>;

  // Arrow bullets
  if (line.trim().startsWith("→"))
    return <span className="text-green-600">{line}</span>;

  // Blank lines
  if (line.trim() === "") return <span>&nbsp;</span>;

  return <span className="text-gray-700">{line}</span>;
}
