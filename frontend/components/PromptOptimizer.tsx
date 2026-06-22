"use client";
// ─────────────────────────────────────────────────────────────────────────────
// BharatGreen AI — Green Prompt Optimizer
// Estimates the water / carbon footprint of any LLM prompt, then uses NVIDIA
// Nemotron to rewrite it into a leaner, clearer, more token-efficient prompt —
// quantifying exactly how much water & CO₂ the optimised prompt saves.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  Droplets, Leaf, Zap, Sparkles, Copy, Check, Wand2,
  Info, Loader2, Cpu, Globe2, Bot, KeyRound, ChevronDown, Gauge,
} from "lucide-react";
import {
  optimizePrompt,
  answerPrompt,
  projectScale,
  type OptimizationResult,
  type ClaudeAnswer,
  type PromptFootprint,
} from "@/lib/promptFootprint";

const CLAUDE_KEY_STORAGE = "bharatgreen.claudeKey";

const SAMPLE_PROMPT =
  "Hello, I was just wondering if you could please kindly help me to write a short, " +
  "simple Python function for me that basically takes a list of numbers and actually " +
  "returns the average of all of them. Thank you so much in advance!";

function fmtWater(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(2)} L`;
  return `${ml.toFixed(2)} ml`;
}
function fmtCarbon(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(2)} kg`;
  return `${g.toFixed(3)} g`;
}

// "gemini-2.5-flash" → "Gemini 2.5 Flash", "claude-sonnet-4-6" → "Claude Sonnet 4.6"
function prettyModel(model: string): string {
  if (!model) return "AI";
  return model
    .replace(/(\d)-(\d)/g, "$1.$2") // 4-6 → 4.6
    .split("-")
    .map((p) => (/^[\d.]/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

export default function PromptOptimizer() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Claude answer (Anthropic) + optional per-user key ("works on every laptop").
  const [claude, setClaude] = useState<ClaudeAnswer | null>(null);          // answer to OPTIMIZED prompt
  const [claudeOriginal, setClaudeOriginal] = useState<ClaudeAnswer | null>(null); // answer to ORIGINAL prompt
  const [answering, setAnswering] = useState(false);
  const [answerCopied, setAnswerCopied] = useState(false);
  const [userKey, setUserKey] = useState("");
  const [showKeyBox, setShowKeyBox] = useState(false);

  // Load any previously saved personal Claude key from this browser.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CLAUDE_KEY_STORAGE);
      if (saved) setUserKey(saved);
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, []);

  function saveUserKey(value: string) {
    setUserKey(value);
    try {
      if (value.trim()) localStorage.setItem(CLAUDE_KEY_STORAGE, value.trim());
      else localStorage.removeItem(CLAUDE_KEY_STORAGE);
    } catch {
      /* localStorage unavailable — ignore */
    }
  }

  const liveFootprintTokens = prompt.trim()
    ? Math.max(1, Math.round((Math.ceil(prompt.trim().length / 4) + Math.ceil(prompt.trim().split(/\s+/).length * 1.33)) / 2))
    : 0;

  async function handleOptimize() {
    if (!prompt.trim() || loading || answering) return;
    setLoading(true);
    setResult(null);
    setClaude(null);
    setClaudeOriginal(null);
    setCopied(false);
    setAnswerCopied(false);

    const r = await optimizePrompt(prompt);
    setResult(r);
    setLoading(false);

    // Have Claude answer BOTH the optimized and the original prompt (in parallel)
    // so we can show the real, measured footprint difference between them.
    if (r.optimized) {
      setAnswering(true);
      const key = userKey.trim() || undefined;
      const [optimizedAns, originalAns] = await Promise.all([
        answerPrompt(r.optimized, key),
        answerPrompt(r.original, key),
      ]);
      setClaude(optimizedAns);
      setClaudeOriginal(originalAns);
      setAnswering(false);
    }
  }

  function handleCopyAnswer() {
    if (!claude?.answer) return;
    navigator.clipboard.writeText(claude.answer);
    setAnswerCopied(true);
    setTimeout(() => setAnswerCopied(false), 1800);
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result.optimized);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const scale = result ? projectScale(result, 1_000_000, "1M prompts/day") : null;

  return (
    <div className="space-y-5">
      {/* Explainer banner */}
      <div className="rounded-2xl overflow-hidden border border-emerald-200"
        style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 45%, #047857 100%)" }}>
        <div className="px-6 py-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
            <Wand2 size={22} className="text-emerald-200" />
          </div>
          <div>
            <p className="text-white font-bold text-[15px]">Green Prompt Optimizer</p>
            <p className="text-emerald-100/90 text-[12px] mt-1 leading-relaxed max-w-2xl">
              Every prompt you send to an AI burns energy and evaporates cooling water in a data
              center. Paste any prompt below — BharatGreen estimates its water &amp; carbon footprint,
              uses <span className="font-semibold text-white">NVIDIA Nemotron</span> to rewrite it
              leaner and clearer, then has <span className="font-semibold text-white">Gemini</span>{" "}
              answer the optimized prompt. Same result, fewer tokens, less water. 💧
            </p>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-900">Your prompt</label>
          <button
            onClick={() => setPrompt(SAMPLE_PROMPT)}
            className="text-[11px] text-emerald-700 font-medium hover:text-emerald-800"
          >
            Try a sample prompt
          </button>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder="Type or paste a prompt you'd send to ChatGPT, Claude, Gemini…"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-3 text-[13px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 transition-all resize-y leading-relaxed"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] text-gray-400 tabular-nums">
            {prompt.trim().length} chars · ~{liveFootprintTokens} tokens
          </span>
          <button
            onClick={handleOptimize}
            disabled={!prompt.trim() || loading || answering}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-[12px] font-semibold hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading || answering ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading
              ? "Optimizing with Nemotron…"
              : answering
              ? "Asking Gemini…"
              : "Optimize & Answer with Gemini"}
          </button>
        </div>

        {/* Optional per-user Claude key — works on every laptop, no shared key needed */}
        <div className="mt-3 border-t border-gray-100 pt-3">
          <button
            onClick={() => setShowKeyBox((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-700"
          >
            <KeyRound size={12} />
            Use my own API key
            {userKey.trim() && (
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                saved
              </span>
            )}
            <ChevronDown size={12} className={clsx("transition-transform", showKeyBox && "rotate-180")} />
          </button>
          {showKeyBox && (
            <div className="mt-2">
              <input
                type="password"
                value={userKey}
                onChange={(e) => saveUserKey(e.target.value)}
                placeholder="Gemini or Claude key (optional — stored only in this browser)"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 transition-all"
              />
              <p className="text-[10px] text-gray-400 mt-1.5">
                Leave blank to use the server&apos;s shared key. Your key is saved locally on this
                device and sent only to answer your prompt — never stored on the server.
              </p>
            </div>
          )}
        </div>
      </div>

      {result && result.optimized && (
        <>
          {/* Savings headline */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SavingsCard
              icon={<Droplets size={16} className="text-blue-500" />}
              label="Water Saved / prompt"
              value={fmtWater(result.waterSavedMl)}
              accent="text-blue-600"
            />
            <SavingsCard
              icon={<Leaf size={16} className="text-emerald-500" />}
              label="CO₂ Saved / prompt"
              value={fmtCarbon(result.carbonSavedG)}
              accent="text-emerald-600"
            />
            <SavingsCard
              icon={<Zap size={16} className="text-amber-500" />}
              label="Energy Saved / prompt"
              value={`${result.energySavedWh.toFixed(3)} Wh`}
              accent="text-amber-600"
            />
            <SavingsCard
              icon={<Cpu size={16} className="text-violet-500" />}
              label="Prompt Tokens Cut"
              value={`−${result.promptTokensSavedPct}%`}
              accent="text-violet-600"
              sub={`${result.before.inputTokens} → ${result.after.inputTokens} tokens`}
            />
          </div>

          {/* Before / After */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <PromptCard
              title="Original prompt"
              tone="red"
              text={result.original}
              fp={result.before}
            />
            <PromptCard
              title="Optimized prompt"
              tone="green"
              text={result.optimized}
              fp={result.after}
              onCopy={handleCopy}
              copied={copied}
              badge={
                result.source === "nemotron"
                  ? { label: "NVIDIA Nemotron", color: "bg-[#76b900] text-black" }
                  : { label: "Rule-based compressor", color: "bg-gray-200 text-gray-700" }
              }
            />
          </div>

          {/* Claude's answer to the optimized prompt */}
          {(answering || claude) && (
            <div className="rounded-xl border border-violet-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3 flex items-center justify-between border-b border-violet-100 bg-violet-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center">
                    <Bot size={15} className="text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Gemini&apos;s answer to your optimized prompt</p>
                    <p className="text-[10px] text-gray-400">Same intent, leaner prompt — fewer tokens in &amp; out</p>
                  </div>
                </div>
                {claude && (
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                      claude.source === "live" ? "bg-violet-600 text-white" : "bg-gray-200 text-gray-700"
                    )}>
                      <Sparkles size={10} className={claude.source === "live" ? "text-violet-200" : "text-gray-400"} />
                      {claude.source === "live" ? prettyModel(claude.model) : "Mock (no key)"}
                    </span>
                    {claude.answer && (
                      <button
                        onClick={handleCopyAnswer}
                        className="flex items-center gap-1 text-[10.5px] text-violet-700 font-medium hover:text-violet-800"
                      >
                        {answerCopied ? <Check size={12} /> : <Copy size={12} />}
                        {answerCopied ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="px-5 py-4">
                {answering && !claude ? (
                  <div className="flex items-center gap-2 text-[12px] text-gray-400">
                    <Loader2 size={14} className="animate-spin text-violet-500" />
                    Gemini is answering your optimized prompt…
                  </div>
                ) : (
                  <p className="text-[12.5px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {claude?.answer}
                  </p>
                )}
              </div>

              {/* Measured footprint of Claude's real token usage */}
              {claude && claude.source === "live" && claude.totalTokens > 0 && (
                <div className="px-5 py-3 border-t border-violet-100 bg-violet-50/30">
                  <p className="text-[9px] font-semibold text-violet-700 uppercase tracking-widest mb-2">
                    Measured footprint of this answer
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <MiniStat icon={<Cpu size={12} className="text-violet-500" />} value={`${claude.inputTokens}`} label="prompt tokens" />
                    <MiniStat icon={<Cpu size={12} className="text-violet-400" />} value={`${claude.outputTokens}`} label="answer tokens" />
                    <MiniStat icon={<Zap size={12} className="text-amber-500" />} value={`${claude.energyWh.toFixed(3)} Wh`} label="energy" />
                    <MiniStat icon={<Droplets size={12} className="text-blue-500" />} value={fmtWater(claude.waterMl)} label="water" />
                    <MiniStat icon={<Leaf size={12} className="text-emerald-500" />} value={fmtCarbon(claude.carbonG)} label="CO₂e" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Measured savings: answering the optimized vs the original prompt */}
          <MeasuredComparison original={claudeOriginal} optimized={claude} />

          {/* What changed */}
          {result.notes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-900 mb-3">What the optimizer changed</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
                {result.notes.map((n, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-gray-600">
                    <Check size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* At scale */}
          {scale && result.waterSavedMl > 0 && (
            <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Globe2 size={16} className="text-blue-600" />
                <p className="text-xs font-semibold text-blue-900">
                  Tiny per prompt — planet-scale impact
                </p>
              </div>
              <p className="text-[12px] text-blue-800/90 mb-4 leading-relaxed">
                A single optimised prompt saves little. But if this one prompt were sent at scale
                ({scale.runsLabel}), the same optimisation would save:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ScaleStat value={`${scale.waterLiters.toLocaleString()} L`} label="Water / year" sub={`≈ ${scale.bottles.toLocaleString()} × 500 ml bottles`} />
                <ScaleStat value={`${scale.carbonKg.toLocaleString()} kg`} label="CO₂e / year" sub={`≈ ${(scale.carbonKg / 21.77).toFixed(0)} trees' annual absorption`} />
                <ScaleStat value={`−${result.tokenSavingsPct}%`} label="Total tokens / exchange" sub="Incl. estimated response" />
              </div>
            </div>
          )}

          {/* Methodology */}
          <details className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 group">
            <summary className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-900 list-none">
              <Info size={14} className="text-gray-400" />
              How we calculate this
              <span className="ml-auto text-[11px] text-gray-400 group-open:hidden">Show</span>
            </summary>
            <div className="mt-3 text-[11.5px] text-gray-500 leading-relaxed space-y-1.5">
              <p>Footprint covers the whole exchange: your <strong>input tokens</strong> plus the model&apos;s <strong>estimated response tokens</strong> (a leaner prompt elicits a tighter answer).</p>
              <ul className="space-y-0.5 ml-1">
                <li>• Tokens ≈ 4 characters / token (GPT tokenizer rule-of-thumb)</li>
                <li>• Inference energy ≈ 0.6 Wh per 1,000 tokens (public LLM estimates)</li>
                <li>• Cooling water ≈ 1.8 L / kWh (data-center WUE — same basis as BharatGreen&apos;s regional model)</li>
                <li>• Grid carbon ≈ 475 gCO₂ / kWh (global average, IEA)</li>
              </ul>
              <p className="text-gray-400">Estimates are indicative and vary by model, provider and region. Figures are intended to build intuition about AI&apos;s resource cost, not for formal accounting.</p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SavingsCard({
  icon, label, value, accent, sub,
}: { icon: React.ReactNode; label: string; value: string; accent: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
      </div>
      <p className={clsx("text-2xl font-bold tabular-nums leading-none", accent)}>{value}</p>
      {sub && <p className="text-[10.5px] mt-1.5 text-gray-400 tabular-nums">{sub}</p>}
    </div>
  );
}

function FootprintRow({ fp }: { fp: PromptFootprint }) {
  return (
    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
      {[
        { icon: <Droplets size={12} className="text-blue-400" />, v: fmtWater(fp.waterMl), l: "water" },
        { icon: <Leaf size={12} className="text-emerald-400" />, v: fmtCarbon(fp.carbonG), l: "CO₂e" },
        { icon: <Cpu size={12} className="text-violet-400" />, v: `${fp.totalTokens}`, l: "tokens" },
      ].map((m) => (
        <div key={m.l}>
          <div className="flex items-center gap-1">{m.icon}<span className="text-[12px] font-bold text-gray-800 tabular-nums">{m.v}</span></div>
          <p className="text-[9px] text-gray-400 uppercase tracking-wide mt-0.5">{m.l}</p>
        </div>
      ))}
    </div>
  );
}

function PromptCard({
  title, tone, text, fp, onCopy, copied, badge,
}: {
  title: string;
  tone: "red" | "green";
  text: string;
  fp: PromptFootprint;
  onCopy?: () => void;
  copied?: boolean;
  badge?: { label: string; color: string };
}) {
  return (
    <div className={clsx(
      "rounded-xl border shadow-sm p-5 flex flex-col",
      tone === "green" ? "border-emerald-200 bg-emerald-50/30" : "border-gray-200 bg-white"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-gray-900">{title}</p>
          {badge && (
            <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded", badge.color)}>{badge.label}</span>
          )}
        </div>
        {onCopy && (
          <button onClick={onCopy} className="flex items-center gap-1 text-[10.5px] text-emerald-700 font-medium hover:text-emerald-800">
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <p className="text-[12.5px] text-gray-700 leading-relaxed flex-1 whitespace-pre-wrap">{text}</p>
      <FootprintRow fp={fp} />
    </div>
  );
}

// ── Measured savings: real metered footprint of answering both prompts ────────
function MeasuredComparison({
  original, optimized,
}: { original: ClaudeAnswer | null; optimized: ClaudeAnswer | null }) {
  // Only meaningful when the model actually answered both prompts (needs a key).
  if (!original || !optimized) return null;
  if (original.source !== "live" || optimized.source !== "live") return null;
  if (original.totalTokens <= 0 || optimized.totalTokens <= 0) return null;

  const waterSaved = Math.max(0, original.waterMl - optimized.waterMl);
  const carbonSaved = Math.max(0, original.carbonG - optimized.carbonG);
  const energySaved = Math.max(0, original.energyWh - optimized.energyWh);
  const tokensSaved = Math.max(0, original.totalTokens - optimized.totalTokens);
  const pct = (saved: number, base: number) => (base > 0 ? Math.round((saved / base) * 1000) / 10 : 0);

  const rows: { label: string; fp: ClaudeAnswer; tone: "red" | "green" }[] = [
    { label: "Original prompt → answer", fp: original, tone: "red" },
    { label: "Optimized prompt → answer", fp: optimized, tone: "green" },
  ];

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/70 to-emerald-50/50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Gauge size={16} className="text-blue-600" />
        <div>
          <p className="text-xs font-semibold text-blue-900">Measured savings — same task, leaner prompt</p>
          <p className="text-[10.5px] text-blue-700/80">
            Gemini answered <span className="font-semibold">both</span>{" "}prompts. These are the real,
            metered footprints from the model&apos;s token usage — not estimates.
          </p>
        </div>
      </div>

      {/* Headline deltas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DeltaCard icon={<Droplets size={15} className="text-blue-500" />} label="Water saved" value={fmtWater(waterSaved)} sub={`−${pct(waterSaved, original.waterMl)}%`} accent="text-blue-600" />
        <DeltaCard icon={<Leaf size={15} className="text-emerald-500" />} label="CO₂ saved" value={fmtCarbon(carbonSaved)} sub={`−${pct(carbonSaved, original.carbonG)}%`} accent="text-emerald-600" />
        <DeltaCard icon={<Zap size={15} className="text-amber-500" />} label="Energy saved" value={`${energySaved.toFixed(3)} Wh`} sub={`−${pct(energySaved, original.energyWh)}%`} accent="text-amber-600" />
        <DeltaCard icon={<Cpu size={15} className="text-violet-500" />} label="Tokens cut" value={`${tokensSaved}`} sub={`−${pct(tokensSaved, original.totalTokens)}%`} accent="text-violet-600" />
      </div>

      {/* Side-by-side metered footprints */}
      <div className="bg-white/70 rounded-lg border border-blue-100 overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-blue-100 text-gray-400">
              {["", "In", "Out", "Total", "Energy", "Water", "CO₂e"].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold uppercase tracking-wide text-[9px] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-blue-50 last:border-0">
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={clsx("inline-flex items-center gap-1.5 font-medium",
                    r.tone === "green" ? "text-emerald-700" : "text-gray-600")}>
                    <span className={clsx("w-1.5 h-1.5 rounded-full", r.tone === "green" ? "bg-emerald-500" : "bg-red-400")} />
                    {r.label}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums text-gray-700">{r.fp.inputTokens}</td>
                <td className="px-3 py-2 tabular-nums text-gray-700">{r.fp.outputTokens}</td>
                <td className="px-3 py-2 tabular-nums font-semibold text-gray-800">{r.fp.totalTokens}</td>
                <td className="px-3 py-2 tabular-nums text-gray-700">{r.fp.energyWh.toFixed(3)} Wh</td>
                <td className="px-3 py-2 tabular-nums text-gray-700">{fmtWater(r.fp.waterMl)}</td>
                <td className="px-3 py-2 tabular-nums text-gray-700">{fmtCarbon(r.fp.carbonG)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Proof: the answer the bloated prompt produced */}
      {original.answer && (
        <details className="group">
          <summary className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-blue-800 list-none">
            <ChevronDown size={12} className="transition-transform group-open:rotate-180" />
            Show the answer to the original (un-optimized) prompt
          </summary>
          <p className="mt-2 text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap bg-white/70 border border-blue-100 rounded-lg p-3">
            {original.answer}
          </p>
        </details>
      )}
    </div>
  );
}

function DeltaCard({
  icon, label, value, sub, accent,
}: { icon: React.ReactNode; label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="bg-white/80 rounded-lg border border-blue-100 px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <p className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
      </div>
      <p className={clsx("text-xl font-bold tabular-nums leading-none", accent)}>{value}</p>
      <p className="text-[10px] mt-1 font-semibold text-gray-400 tabular-nums">{sub} vs original</p>
    </div>
  );
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div>
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-[12.5px] font-bold text-gray-800 tabular-nums">{value}</span>
      </div>
      <p className="text-[9px] text-gray-400 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

function ScaleStat({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div className="bg-white/70 rounded-lg border border-blue-100 px-4 py-3">
      <p className="text-xl font-black text-blue-700 tabular-nums leading-none">{value}</p>
      <p className="text-[11px] font-semibold text-blue-900 mt-1.5">{label}</p>
      <p className="text-[10px] text-blue-600/80 mt-0.5">{sub}</p>
    </div>
  );
}
