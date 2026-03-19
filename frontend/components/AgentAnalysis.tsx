"use client";

import { useEffect, useRef } from "react";
import { AnalysisStatus } from "@/lib/types";
import { Bot, Loader2, CheckCircle } from "lucide-react";

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

  // Auto-scroll to bottom as text streams in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedText]);

  const isEmpty = !displayedText && status !== "analyzing";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bot size={15} className="text-green-500" />
          <p className="text-xs font-semibold text-gray-800">CarbonSense agent analysis</p>
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
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-gray-400">
            <Bot size={32} className="opacity-30" />
            <p className="text-xs">
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
