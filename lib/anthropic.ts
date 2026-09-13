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
}): Promise<GenerateResult<T>> {
  const anthropic = getClient();
  const format = zodOutputFormat(opts.schema);
  const maxTokens = opts.maxTokens ?? 8000;

  async function call(messages: Anthropic.MessageParam[]): Promise<{ parsed: T; raw: string }> {
    let res;
    try {
      res = await anthropic.messages.parse({
        model: MODEL,
        max_tokens: maxTokens,
        system: opts.system,
        messages,
        output_config: { format },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/Unterminated|Unexpected end|parse structured output/i.test(msg)) {
        throw new Error(`The response was cut off before it finished (limit ${maxTokens} tokens). ${msg}`);
      }
      throw e;
    }
    if (res.stop_reason === "max_tokens") {
      throw new Error(`The response was cut off before it finished (limit ${maxTokens} tokens)`);
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
