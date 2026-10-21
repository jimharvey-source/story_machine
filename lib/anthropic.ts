import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ZodType } from "zod";
import { describeViolations, repairDashes, voiceViolations, type VoiceOptions } from "./voice";

// Server-side only. Never import this file from a client component.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

let client: Anthropic | null = null;
function keyHint(raw: string): string {
  const key = raw.trim();
  const tail = key.length > 4 ? key.slice(-4) : "";
  const extra = raw.length !== key.length ? ", had surrounding whitespace" : "";
  return `key length ${key.length}, starts ${key.slice(0, 7)}, ends ${tail}${extra}`;
}

export function describeKey(): string {
  const raw = process.env.ANTHROPIC_API_KEY ?? "";
  return raw ? keyHint(raw) : "ANTHROPIC_API_KEY is not set";
}

function getClient(): Anthropic {
  const raw = process.env.ANTHROPIC_API_KEY ?? "";
  const apiKey = raw.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  if (!client) {
    console.log(JSON.stringify({ tag: "anthropic-key", hint: keyHint(raw), model: MODEL }));
    client = new Anthropic({ apiKey });
  }
  return client;
}

export type GenerateResult<T> = {
  data: T;
  model: string;
  attempts: number;
  violationsBefore: number;
  violationsAfter: number;
  unresolved: string[];
};

/**
 * Generate structured output against a Zod schema, then enforce the voice rules:
 * one corrective retry quoting the model's own text, then mechanical repair of dashes,
 * and anything still unresolved is logged and returned without blocking.
 */
export async function generateStructured<T>(opts: {
  system: string;
  user: string;
  schema: ZodType<T>;
  maxTokens?: number;
  label: string;
  /** Prior conversation turns to place after the first user message (for refine). */
  history?: Anthropic.MessageParam[];
  voice?: VoiceOptions;
  /** Skip the voice rules (dashes are still repaired). For text that quotes the story rather than writing it: rhetoric notes, ask-back questions. */
  skipVoice?: boolean;
}): Promise<GenerateResult<T>> {
  const anthropic = getClient();
  const format = zodOutputFormat(opts.schema);
  // Thinking tokens count against max_tokens on current models. Give thinking a fixed
  // budget and keep the ceiling well above it so the answer always has room.
  // Sonnet 5 uses adaptive thinking, steered by output_config.effort; a fixed budget is rejected.
  // Thinking still counts against max_tokens, so story-sized calls get a 16,000 ceiling.
  // Short calls (single-line edits) run with thinking off: it would cost more than the answer.
  const wanted = opts.maxTokens ?? 8000;
  const big = wanted >= 4000;
  const maxTokens = big ? Math.max(wanted, 16000) : wanted;
  const thinking = big ? { type: "adaptive" as const, display: "omitted" as const } : { type: "disabled" as const };
  const effort = big ? ("medium" as const) : ("low" as const);

  async function call(messages: Anthropic.MessageParam[]): Promise<{ parsed: T; raw: string }> {
    let res;
    try {
      res = await anthropic.messages.parse({
        model: MODEL,
        max_tokens: maxTokens,
        system: opts.system,
        messages,
        thinking,
        output_config: { format, effort },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/Unterminated|Unexpected end|parse structured output/i.test(msg)) {
        throw new Error(`The response was cut off before it finished (limit ${maxTokens} tokens). ${msg}`);
      }
      throw e;
    }
    const used = res.usage as { output_tokens?: number; output_tokens_details?: { thinking_tokens?: number } };
    console.log(JSON.stringify({ tag: "usage", label: opts.label, output_tokens: used.output_tokens, thinking_tokens: used.output_tokens_details?.thinking_tokens, stop_reason: res.stop_reason }));
    if (res.stop_reason === "max_tokens") {
      throw new Error(`The response was cut off before it finished (limit ${maxTokens} tokens, thinking ${used.output_tokens_details?.thinking_tokens ?? "?"})`);
    }
    const block = res.content.find((b) => b.type === "text");
    const raw = block && block.type === "text" ? block.text : "";
    if (!raw.trim()) {
      throw new Error(`Empty response from model (stop_reason=${res.stop_reason})`);
    }
    const parsed = opts.schema.safeParse(res.parsed_output ?? JSON.parse(raw));
    if (!parsed.success) {
      throw new Error(
        `Model output failed schema: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`
      );
    }
    return { parsed: parsed.data, raw };
  }

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: opts.user }, ...(opts.history ?? [])];
  let attempts = 1;
  let { parsed, raw } = await call(messages);
  if (opts.skipVoice) {
    return { data: repairDashes(parsed), model: MODEL, attempts: 1, violationsBefore: 0, violationsAfter: 0, unresolved: [] };
  }
  const before = voiceViolations(parsed, opts.voice);
  let violations = before;

  if (violations.length) {
    attempts = 2;
    const correction = `Your previous answer broke these writing rules:\n${describeViolations(violations)}\n\nReturn the same JSON with only those passages rewritten so that every rule is met. Change nothing else.`;
    try {
      const retry = await call([
        ...messages,
        { role: "assistant", content: raw },
        { role: "user", content: correction },
      ]);
      parsed = retry.parsed;
      raw = retry.raw;
      violations = voiceViolations(parsed, opts.voice);
    } catch (e) {
      console.warn(`[voice] ${opts.label}: retry failed, keeping first answer`, e);
    }
  }

  if (violations.some((v) => v.rule === "dash")) {
    parsed = repairDashes(parsed);
    violations = voiceViolations(parsed, opts.voice);
  }

  const unresolved = violations.map((v) => `${v.path}: ${v.rule}`);
  console.log(
    JSON.stringify({
      tag: "voice",
      label: opts.label,
      model: MODEL,
      attempts,
      violationsBefore: before.length,
      violationsAfter: violations.length,
      unresolved,
    })
  );

  return {
    data: parsed,
    model: MODEL,
    attempts,
    violationsBefore: before.length,
    violationsAfter: violations.length,
    unresolved,
  };
}

// Photos and screenshots (21 October 2026). Claude reads the picture and writes out what is in it,
// as plain text for the notes box. The picture is sent once and kept nowhere.
const READ_IMAGE_SYSTEM = `You turn a photograph or screenshot into plain text notes for someone preparing a presentation.

Write out every word you can read, in reading order, keeping headings, lists and the order of slides or columns.
Copy every number, name, date and label exactly as shown. Never round, correct or complete a figure.
For a table, write one line per row with the cells separated by " | ".
For a chart, diagram or drawing, add one short line in square brackets saying what it shows, using only what is visible, e.g. [Bar chart: sales by region, 2025; Europe highest at 4.2m].
For handwriting you cannot read, write [unreadable]. Never guess.
Do not summarise, comment, give advice or add anything that is not in the picture.
If the picture holds no text and nothing useful for a presentation, reply with exactly: NOTHING
Plain text only. No Markdown symbols, no dashes used as punctuation.`;

export type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export async function readImage(base64: string, mediaType: ImageMediaType): Promise<string> {
  const anthropic = getClient();
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: READ_IMAGE_SYSTEM,
    thinking: { type: "disabled" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Write out what is in this picture as notes." },
        ],
      },
    ],
  });
  console.log(JSON.stringify({ tag: "usage", label: "photo", output_tokens: res.usage.output_tokens, input_tokens: res.usage.input_tokens, stop_reason: res.stop_reason }));
  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n")
    .replace(/\s+[–—]\s+/g, ", ")
    .replace(/[–—]/g, "-")
    .trim();
  return text;
}
