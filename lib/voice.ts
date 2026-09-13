// A rule in a prompt is a request. Anything that must be true of the output is checked here.

export type Violation = { path: string; rule: string; sample: string };

const BANNED: Array<[RegExp, string]> = [
  [/—|–/g, "dash"],
  [/\bnot (?:just |only |merely |simply |by |about |for |because )?[^.;:,!?]{1,70}\bbut\b/gi, "antithesis"],
  [/\b(?:isn't|aren't|wasn't|weren't|doesn't|don't|is not|are not|was not|were not|does not|do not|I'm not|I am not|we're not|we are not)\b[^.!?]{1,70}[.!?]\s+(?:It's|It is|They're|They are|We're|We are|You're|You are|That's|That is|This is|Instead|I'm|I am)\b/g, "antithesis-split"],
  [/,\s*not\s+(?:a\s+|an\s+|the\s+)?\w+(?:\s+\w+)?[.!?]/g, "antithesis-tail"],
  [/\bNot (?:a|an|the)\s+\w+\.\s+(?:A|An|The)\s+\w+\./g, "antithesis-fragments"],
  [/\bleverag(e|es|ed|ing)\b/gi, "leverage"],
  [/\bdelv(e|es|ed|ing)\b/gi, "delve"],
  [/\bgame[- ]chang(er|ing)\b/gi, "game-changer"],
  [/\bin today'?s (fast[- ]paced |rapidly changing |ever[- ]changing )?(world|market|environment|landscape|climate)\b/gi, "in-todays-world"],
  [/\bat the end of the day\b/gi, "cliche"],
  [/\b(moving|going) forward\b/gi, "cliche"],
  [/\bsynerg(y|ies|istic)\b/gi, "synergy"],
  [/\bparadigm\b/gi, "paradigm"],
  [/\brobust\b/gi, "robust"],
  [/\bseamless(ly)?\b/gi, "seamless"],
  [/\bcutting[- ]edge\b/gi, "cliche"],
  [/\bbest[- ]in[- ]class\b/gi, "cliche"],
  [/\bunlock(s|ed|ing)?\b/gi, "unlock"],
  [/\bunleash(es|ed|ing)?\b/gi, "unleash"],
  [/\bempower(s|ed|ing|ment)?\b/gi, "empower"],
  [/\bholistic(ally)?\b/gi, "holistic"],
  [/\bdeep[- ]dive\b/gi, "cliche"],
  [/\blow[- ]hanging fruit\b/gi, "cliche"],
  [/\bthink(ing)? outside the box\b/gi, "cliche"],
  [/\bcircle back\b/gi, "cliche"],
  [/\btouch base\b/gi, "cliche"],
  [/\bit(')?s (important|worth) (to note|noting)\b/gi, "filler"],
  [/\bit is (important|worth) (to note|noting)\b/gi, "filler"],
  [/\bin conclusion\b/gi, "filler"],
];

function walk(value: unknown, path: string, out: Violation[]): void {
  if (typeof value === "string") {
    for (const [re, rule] of BANNED) {
      re.lastIndex = 0;
      const m = re.exec(value);
      if (m) {
        const start = Math.max(0, m.index - 30);
        out.push({ path, rule, sample: value.slice(start, m.index + m[0].length + 30) });
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, `${path}[${i}]`, out));
    return;
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    // A soundbite quoted from the presenter's own material is theirs. The rules do not apply to it.
    if (o.source === "material" && typeof o.text === "string") return;
    for (const [k, v] of Object.entries(o)) walk(v, path ? `${path}.${k}` : k, out);
  }
}

const REASSURANCE = ["genuine", "genuinely", "real", "really", "simple", "simply", "powerful", "authentic", "meaningful", "sincere", "sincerely", "truly"];
const REASSURANCE_LIMIT = 2;

function allText(value: unknown, out: string[]): void {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allText(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => allText(v, out));
}

const SPOKEN_PATHS = /(^|\.)(prologue|epilogue|signpost)$/;
const CONTRACTION = /\b\w+(?:'re|'ve|'ll|'d|n't|'s)\b|\bI'm\b/g;
const POSSESSIVE = /\b(?:[A-Za-z]+s'|[A-Za-z]+'s\s+(?:own|[a-z]+ing))\b/;

function contractionViolations(value: unknown, path: string, out: Violation[]): void {
  if (typeof value === "string") {
    if (SPOKEN_PATHS.test(path)) return;
    CONTRACTION.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CONTRACTION.exec(value))) {
      const hit = m[0];
      // 's is ambiguous (possessive). Only flag it after a pronoun or "here/there/that/what".
      if (/'s$/.test(hit) && !/^(it|he|she|that|there|here|what|who|where)'s$/i.test(hit)) continue;
      if (POSSESSIVE.test(hit)) continue;
      const start = Math.max(0, m.index - 30);
      out.push({ path, rule: "contraction", sample: value.slice(start, m.index + hit.length + 30) });
      break;
    }
    return;
  }
  if (Array.isArray(value)) value.forEach((v, i) => contractionViolations(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (o.source === "material" && typeof o.text === "string") return;
    for (const [k, v] of Object.entries(o)) contractionViolations(v, path ? `${path}.${k}` : k, out);
  }
}

function soundbiteViolations(value: unknown, path: string, out: Violation[]): void {
  if (!value || typeof value !== "object") return;
  const o = value as Record<string, unknown>;
  if (typeof o.text === "string" && (o.source === "material" || o.source === "proposed")) {
    if (/^(They|It|This|That|These|Those|He|She|We)\b/.test(o.text.trim())) {
      out.push({ path, rule: "soundbite-pronoun", sample: o.text });
    }
    return;
  }
  for (const [k, v] of Object.entries(o)) soundbiteViolations(v, path ? `${path}.${k}` : k, out);
}

export type VoiceOptions = { contractionsInWritten?: boolean };

export function voiceViolations(value: unknown, options: VoiceOptions = {}): Violation[] {
  const out: Violation[] = [];
  walk(value, "", out);
  soundbiteViolations(value, "", out);
  if (options.contractionsInWritten === false) contractionViolations(value, "", out);
  const texts: string[] = [];
  allText(value, texts);
  const joined = texts.join(" ").toLowerCase();
  for (const w of REASSURANCE) {
    const n = (joined.match(new RegExp(`\\b${w}\\b`, "g")) || []).length;
    if (n > REASSURANCE_LIMIT) {
      out.push({ path: "(whole response)", rule: "repetition", sample: `"${w}" appears ${n} times, limit ${REASSURANCE_LIMIT}` });
    }
  }
  return out;
}

// Mechanical repair for what can be repaired without judgement. Dashes only.
export function repairDashes<T>(value: T): T {
  if (typeof value === "string") {
    return (value as string)
      .replace(/\s*—\s*/g, ", ")
      .replace(/\s*–\s*/g, ", ")
      .replace(/,\s*,/g, ",") as unknown as T;
  }
  if (Array.isArray(value)) return value.map(repairDashes) as unknown as T;
  if (value && typeof value === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) o[k] = repairDashes(v);
    return o as T;
  }
  return value;
}

export function describeViolations(v: Violation[]): string {
  return v.map((x) => `${x.path}: ${x.rule} in "${x.sample.replace(/\s+/g, " ")}"`).join("\n");
}
