// ─────────────────────────────────────────────────────────────────────────────
// BharatGreen AI — Prompt Footprint Optimizer ("Green Prompting")
//
// Every LLM prompt has an environmental cost: the model must read your input
// tokens and generate output tokens, both of which burn energy and consume
// cooling water in the data center. This module:
//
//   1. Estimates the water / carbon / energy footprint of a prompt + its
//      expected response (input + estimated output tokens).
//   2. Produces an optimized, token-efficient rewrite (rule-based fallback;
//      the backend upgrades this to an NVIDIA Nemotron rewrite when available).
//   3. Quantifies how much water / carbon is saved by the leaner prompt.
//
// ── Methodology (transparent + citable) ──────────────────────────────────────
//   • Token estimate  : ~4 characters / token  (OpenAI/GPT tokenizer rule-of-thumb)
//   • Inference energy : 0.6 Wh per 1,000 tokens  (public LLM inference estimates)
//   • Cooling water    : 1.8 L / kWh  (data-center WUE — same basis as the rest
//                        of BharatGreen AI's regional model)
//   • Grid carbon      : 475 gCO₂ / kWh  (global average grid intensity, IEA)
//
// Per-prompt numbers are small by design — the point is *scale*: billions of
// prompts per day. We therefore also surface annualised "at scale" figures.
// ─────────────────────────────────────────────────────────────────────────────

// ── Model constants ──────────────────────────────────────────────────────────
export const CHARS_PER_TOKEN = 4;
export const WH_PER_1K_TOKENS = 0.6;     // inference energy
export const WATER_L_PER_KWH = 1.8;      // data-center WUE (cooling water)
export const GRID_G_CO2_PER_KWH = 475;   // global average grid intensity

// A clearer, more focused prompt tends to elicit a tighter, on-target answer.
// We model the expected response as proportional to the prompt size so that a
// leaner prompt also trims wasted output tokens (the dominant cost).
const OUTPUT_TOKEN_MULTIPLIER = 3;
const MIN_OUTPUT_TOKENS = 80;

export interface PromptFootprint {
  chars: number;
  words: number;
  inputTokens: number;
  outputTokens: number;   // estimated response length
  totalTokens: number;    // input + estimated output
  energyWh: number;       // whole exchange
  waterMl: number;        // whole exchange
  carbonG: number;        // whole exchange
}

export interface OptimizationResult {
  original: string;
  optimized: string;
  before: PromptFootprint;
  after: PromptFootprint;
  tokenSavingsPct: number;   // reduction in total tokens
  promptTokensSavedPct: number; // reduction in input prompt tokens (the lever we control)
  waterSavedMl: number;
  carbonSavedG: number;
  energySavedWh: number;
  notes: string[];           // human-readable list of what changed
  source: "nemotron" | "local";
}

// ── Token + footprint estimation ─────────────────────────────────────────────
export function estimateTokens(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  // Blend char-based and word-based estimates for robustness.
  const byChars = Math.ceil(t.length / CHARS_PER_TOKEN);
  const byWords = Math.ceil(t.split(/\s+/).length * 1.33);
  return Math.max(1, Math.round((byChars + byWords) / 2));
}

export function computeFootprint(text: string): PromptFootprint {
  const trimmed = text.trim();
  const chars = trimmed.length;
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const inputTokens = estimateTokens(trimmed);
  const outputTokens = inputTokens
    ? Math.max(MIN_OUTPUT_TOKENS, Math.round(inputTokens * OUTPUT_TOKEN_MULTIPLIER))
    : 0;
  const totalTokens = inputTokens + outputTokens;

  const energyWh = (totalTokens / 1000) * WH_PER_1K_TOKENS;
  const energyKWh = energyWh / 1000;
  const waterMl = energyKWh * WATER_L_PER_KWH * 1000; // L → ml
  const carbonG = energyKWh * GRID_G_CO2_PER_KWH;

  return {
    chars,
    words,
    inputTokens,
    outputTokens,
    totalTokens,
    energyWh: round(energyWh, 4),
    waterMl: round(waterMl, 3),
    carbonG: round(carbonG, 4),
  };
}

function round(n: number, dp: number): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

// ── Rule-based prompt compressor (offline fallback) ──────────────────────────
// Removes politeness padding, filler and verbose phrasing while preserving the
// core instruction. Used when the Nemotron backend is unreachable so the demo
// always works.
const PHRASE_RULES: { pattern: RegExp; replace: string; note: string }[] = [
  { pattern: /^\s*(h(i+|ello+|ey+)|yo+|hiya|greetings|good (morning|afternoon|evening|day))\b[,!.\s]*/gi, replace: "", note: "Removed greeting" },
  { pattern: /\bi was (just )?wondering if you (could|would|can)\b/gi, replace: "", note: "Removed hedging ('I was wondering if you could')" },
  { pattern: /\b(could|would|can) you please\b/gi, replace: "", note: "Dropped polite filler ('could you please')" },
  { pattern: /\b(could|would|can) you kindly\b/gi, replace: "", note: "Dropped polite filler" },
  { pattern: /\bi (would like|want|need) you to\b/gi, replace: "", note: "Removed 'I would like you to'" },
  { pattern: /\bi('| a)?m looking for\b/gi, replace: "", note: "Removed 'I'm looking for'" },
  { pattern: /\bplease\b/gi, replace: "", note: "Removed 'please'" },
  { pattern: /\bkindly\b/gi, replace: "", note: "Removed 'kindly'" },
  { pattern: /\bif (it'?s |it is )?(at all )?possible\b/gi, replace: "", note: "Removed 'if possible'" },
  { pattern: /\bfor me\b/gi, replace: "", note: "Removed redundant 'for me'" },
  { pattern: /\bmake sure (to|that you)\b/gi, replace: "", note: "Tightened 'make sure to'" },
  { pattern: /\bin order to\b/gi, replace: "to", note: "'in order to' → 'to'" },
  { pattern: /\bdue to the fact that\b/gi, replace: "because", note: "'due to the fact that' → 'because'" },
  { pattern: /\bat this (point in time|moment in time)\b/gi, replace: "now", note: "Simplified to 'now'" },
  { pattern: /\ba (large|great) (number|amount) of\b/gi, replace: "many", note: "Simplified to 'many'" },
  { pattern: /\bthe (vast )?majority of\b/gi, replace: "most", note: "Simplified to 'most'" },
  { pattern: /\bas (well as|a matter of fact)\b/gi, replace: "and", note: "Tightened phrasing" },
  { pattern: /\b(basically|actually|literally|essentially|really|very|just|simply|quite)\b/gi, replace: "", note: "Removed filler adverbs" },
  { pattern: /\bcan you (help me )?(to )?\b/gi, replace: "", note: "Removed 'can you help me'" },
  { pattern: /\bi would (really )?appreciate it if you (could|would)\b/gi, replace: "", note: "Removed appreciation padding" },
  { pattern: /\b(thanks|thank you)( so much)?( in advance)?\b\.?/gi, replace: "", note: "Removed thanks" },
  { pattern: /\bgo ahead and\b/gi, replace: "", note: "Removed 'go ahead and'" },
  // Wordy connectors & verbose phrasing
  { pattern: /\bso that (it|they|this|that|you|we|i|he|she) (will|would|can|could|may|might)\b/gi, replace: "to", note: "'so that it will…' → 'to'" },
  { pattern: /\bin (the )?order (for .+? )?to\b/gi, replace: "to", note: "Simplified 'in order to'" },
  { pattern: /\bin the event that\b/gi, replace: "if", note: "'in the event that' → 'if'" },
  { pattern: /\bare able to\b/gi, replace: "can", note: "'are able to' → 'can'" },
  { pattern: /\bis able to\b/gi, replace: "can", note: "'is able to' → 'can'" },
  { pattern: /\bhas the ability to\b/gi, replace: "can", note: "'has the ability to' → 'can'" },
  { pattern: /\ba (lot|number) of\b/gi, replace: "many", note: "'a lot of' → 'many'" },
  { pattern: /\bnecessary things\b/gi, replace: "essentials", note: "'necessary things' → 'essentials'" },
  { pattern: /\b(all of|each of) the\b/gi, replace: "all the", note: "Tightened 'all of the'" },
  { pattern: /\bin (my|your|our) opinion\b/gi, replace: "", note: "Removed 'in my opinion'" },
  { pattern: /\bi (think|believe|feel|guess) that\b/gi, replace: "", note: "Removed 'I think that'" },
  { pattern: /\bas soon as possible\b/gi, replace: "ASAP", note: "'as soon as possible' → 'ASAP'" },
  { pattern: /\bat the (present|current) (time|moment)\b/gi, replace: "now", note: "Simplified to 'now'" },
  { pattern: /\bwith regard(s)? to\b/gi, replace: "about", note: "'with regard to' → 'about'" },
  { pattern: /\bin terms of\b/gi, replace: "", note: "Removed 'in terms of'" },
  { pattern: /\bthe thing (is )?that\b/gi, replace: "", note: "Removed 'the thing is that'" },
  { pattern: /\bthat (will|would|can|could) help\b/gi, replace: "to help", note: "Tightened 'that will help'" },
  // Classic wordy → concise substitutions (Strunk & White style)
  { pattern: /\bit is important to note that\b/gi, replace: "", note: "Removed 'it is important to note that'" },
  { pattern: /\bit (is|'s) worth (noting|mentioning) that\b/gi, replace: "", note: "Removed 'it's worth noting that'" },
  { pattern: /\bfor the purpose of\b/gi, replace: "to", note: "'for the purpose of' → 'to'" },
  { pattern: /\bin the (near )?future\b/gi, replace: "soon", note: "'in the future' → 'soon'" },
  { pattern: /\b(despite|in spite of) the fact that\b/gi, replace: "although", note: "'despite the fact that' → 'although'" },
  { pattern: /\bin light of the fact that\b/gi, replace: "because", note: "'in light of the fact that' → 'because'" },
  { pattern: /\b(prior to|in advance of)\b/gi, replace: "before", note: "'prior to' → 'before'" },
  { pattern: /\bsubsequent to\b/gi, replace: "after", note: "'subsequent to' → 'after'" },
  { pattern: /\bin close proximity to\b/gi, replace: "near", note: "'in close proximity to' → 'near'" },
  { pattern: /\bon a (regular|daily) basis\b/gi, replace: "regularly", note: "'on a regular basis' → 'regularly'" },
  { pattern: /\bin a timely manner\b/gi, replace: "promptly", note: "'in a timely manner' → 'promptly'" },
  { pattern: /\b(take into consideration|give consideration to)\b/gi, replace: "consider", note: "Simplified to 'consider'" },
  { pattern: /\bthe manner in which\b/gi, replace: "how", note: "'the manner in which' → 'how'" },
  { pattern: /\bby means of\b/gi, replace: "by", note: "'by means of' → 'by'" },
  { pattern: /\bin conjunction with\b/gi, replace: "with", note: "'in conjunction with' → 'with'" },
  { pattern: /\bwith the exception of\b/gi, replace: "except", note: "'with the exception of' → 'except'" },
  { pattern: /\beach and every\b/gi, replace: "every", note: "'each and every' → 'every'" },
  { pattern: /\bfirst and foremost\b/gi, replace: "first", note: "'first and foremost' → 'first'" },
  { pattern: /\b(end result|final outcome)\b/gi, replace: "result", note: "Removed redundancy ('end result')" },
  { pattern: /\bpast (history|experience)\b/gi, replace: "$1", note: "Removed redundant 'past'" },
  { pattern: /\b(absolutely essential|completely essential)\b/gi, replace: "essential", note: "Removed redundant intensifier" },
  { pattern: /\buntil such time as\b/gi, replace: "until", note: "'until such time as' → 'until'" },
  { pattern: /\bthere (is|are) (a need|the need) for\b/gi, replace: "", note: "Removed 'there is a need for'" },
  { pattern: /\bwould it be possible (for you )?to\b/gi, replace: "", note: "Removed 'would it be possible to'" },
  { pattern: /\b(can|could) you tell me\b/gi, replace: "", note: "Removed 'can you tell me'" },
  { pattern: /\bi'?d (like|love) to (know|see|understand)\b/gi, replace: "", note: "Removed 'I'd like to know'" },
  { pattern: /\ba (wide|broad|whole) (variety|range|host) of\b/gi, replace: "various", note: "Simplified to 'various'" },
  { pattern: /\bvarious different\b/gi, replace: "various", note: "Removed redundant 'different'" },
  { pattern: /\bin most cases\b/gi, replace: "usually", note: "'in most cases' → 'usually'" },
  { pattern: /\bthe reason (why )?(is|was) (that|because)\b/gi, replace: "because", note: "Tightened 'the reason why is that'" },
  { pattern: /\ball things considered\b/gi, replace: "", note: "Removed 'all things considered'" },
];

export function localOptimize(text: string): { optimized: string; notes: string[] } {
  let out = text;
  const notes: string[] = [];

  for (const rule of PHRASE_RULES) {
    if (rule.pattern.test(out)) {
      out = out.replace(rule.pattern, rule.replace).replace(/\s{2,}/g, " ");
      if (!notes.includes(rule.note)) notes.push(rule.note);
    }
  }

  // Collapse whitespace, fix spacing before punctuation, trim.
  out = out
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([.!?])\s*[.!?]+/g, "$1")
    .replace(/\b(\w+)(\s+\1\b)+/gi, "$1") // collapse accidental repeated words from substitutions
    .replace(/^[\s,.;:!?-]+/, "")
    .trim();

  // Capitalize the first letter, and the first letter of each new sentence.
  out = out.replace(/([.!?]\s+)([a-z])/g, (_m, p, c) => p + c.toUpperCase());
  if (out.length) out = out.charAt(0).toUpperCase() + out.slice(1);

  // Ensure it ends with terminal punctuation.
  if (out.length && !/[.!?]$/.test(out)) out += ".";

  if (notes.length) notes.push("Collapsed extra whitespace and tidied punctuation");
  if (!out.trim()) {
    return { optimized: text.trim(), notes: [] };
  }
  return { optimized: out, notes };
}

// ── Build the full optimization result from an optimized rewrite ─────────────
export function buildResult(
  original: string,
  optimized: string,
  notes: string[],
  source: "nemotron" | "local"
): OptimizationResult {
  const before = computeFootprint(original);
  const after = computeFootprint(optimized);

  const tokenSavingsPct = before.totalTokens
    ? round(((before.totalTokens - after.totalTokens) / before.totalTokens) * 100, 1)
    : 0;
  const promptTokensSavedPct = before.inputTokens
    ? round(((before.inputTokens - after.inputTokens) / before.inputTokens) * 100, 1)
    : 0;

  return {
    original,
    optimized,
    before,
    after,
    tokenSavingsPct: Math.max(0, tokenSavingsPct),
    promptTokensSavedPct: Math.max(0, promptTokensSavedPct),
    waterSavedMl: round(Math.max(0, before.waterMl - after.waterMl), 3),
    carbonSavedG: round(Math.max(0, before.carbonG - after.carbonG), 4),
    energySavedWh: round(Math.max(0, before.energyWh - after.energyWh), 4),
    notes,
    source,
  };
}

// ── Backend (Nemotron) call with offline fallback ────────────────────────────
export async function optimizePrompt(original: string): Promise<OptimizationResult> {
  const trimmed = original.trim();
  if (!trimmed) {
    return buildResult("", "", [], "local");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  try {
    const res = await fetch(`${apiUrl}/prompt/optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: trimmed }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const optimized: string = (data.optimized_prompt ?? "").trim();
    if (!optimized) throw new Error("empty optimized prompt");
    // Respect the backend's reported engine: it returns "nemotron" only when the
    // NVIDIA NIM API actually produced the rewrite, otherwise it fell back to the
    // server-side rule-based compressor. Never claim Nemotron when it wasn't used.
    const source: "nemotron" | "local" = data.source === "nemotron" ? "nemotron" : "local";
    const notes: string[] = Array.isArray(data.notes) && data.notes.length
      ? data.notes
      : [source === "nemotron"
          ? "Rewritten by NVIDIA Nemotron for token efficiency and clarity"
          : "Optimized by the rule-based compressor"];
    return buildResult(trimmed, optimized, notes, source);
  } catch {
    // Backend unreachable — use deterministic local compressor (offline demo).
    const { optimized, notes } = localOptimize(trimmed);
    return buildResult(trimmed, optimized, notes, "local");
  }
}

// ── Claude answer (Anthropic) ────────────────────────────────────────────────
// After optimizing, we send the leaner prompt to Claude for the actual answer.
// Claude reports real token usage, so we can show the *measured* footprint of
// the exchange (not just an estimate).
export interface ClaudeAnswer {
  answer: string;
  model: string;
  provider: string;            // "gemini" | "anthropic"
  source: "live" | "mock";
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  energyWh: number;
  waterMl: number;
  carbonG: number;
}

function footprintFromTokens(totalTokens: number) {
  const energyWh = (totalTokens / 1000) * WH_PER_1K_TOKENS;
  const energyKWh = energyWh / 1000;
  return {
    energyWh: round(energyWh, 4),
    waterMl: round(energyKWh * WATER_L_PER_KWH * 1000, 3),
    carbonG: round(energyKWh * GRID_G_CO2_PER_KWH, 4),
  };
}

/**
 * Ask Claude to answer the (optimized) prompt via the backend `/prompt/answer`
 * endpoint. `apiKey` is an optional per-user override; `model` an optional
 * model override. Falls back to a clear message if the backend is unreachable.
 */
export async function answerPrompt(
  prompt: string,
  apiKey?: string,
  model?: string,
): Promise<ClaudeAnswer> {
  const trimmed = prompt.trim();
  const empty: ClaudeAnswer = {
    answer: "",
    model: model || "gemini-2.5-flash",
    provider: "gemini",
    source: "mock",
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    energyWh: 0,
    waterMl: 0,
    carbonG: 0,
  };
  if (!trimmed) return empty;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  try {
    const res = await fetch(`${apiUrl}/prompt/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: trimmed,
        ...(apiKey ? { api_key: apiKey } : {}),
        ...(model ? { model } : {}),
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const inputTokens: number = data.usage?.input_tokens ?? 0;
    const outputTokens: number = data.usage?.output_tokens ?? 0;
    const totalTokens = inputTokens + outputTokens;
    return {
      answer: (data.answer ?? "").trim(),
      model: data.model ?? empty.model,
      provider: data.provider ?? "gemini",
      source: data.source === "live" ? "live" : "mock",
      inputTokens,
      outputTokens,
      totalTokens,
      ...footprintFromTokens(totalTokens),
    };
  } catch {
    return {
      ...empty,
      answer:
        "Offline demo mode — the answer service isn't connected, so no live model " +
        "answered this prompt. The water & carbon estimates above are still fully " +
        "computed. For live answers (and real, measured token savings), run the backend " +
        "with a free GEMINI_API_KEY, or paste your own key above.",
    };
  }
}

// ── "At scale" helpers — small per prompt, enormous at planetary scale ───────
export interface ScaleImpact {
  runsLabel: string;
  waterLiters: number;
  carbonKg: number;
  bottles: number;     // 500 ml water bottles
}

/** Project a per-prompt water/carbon saving to a chosen run volume. */
export function projectScale(result: OptimizationResult, runsPerDay: number, label: string): ScaleImpact {
  const runsPerYear = runsPerDay * 365;
  const waterLiters = (result.waterSavedMl * runsPerYear) / 1000;
  const carbonKg = (result.carbonSavedG * runsPerYear) / 1000;
  return {
    runsLabel: label,
    waterLiters: round(waterLiters, 1),
    carbonKg: round(carbonKg, 2),
    bottles: Math.round((result.waterSavedMl * runsPerYear) / 500),
  };
}
