// A rule in a prompt is a request. Anything that must be true of the output is checked here.

export type Violation = { path: string; rule: string; sample: string };

const BANNED: Array<[RegExp, string]> = [
  [/—|–/g, "dash"],
  // "not X, but Y" with or without the comma; "Not because A, but because B."
  [/\bnot (?:just |only |merely |simply |by |about |for |because )?[^.;:!?]{1,70}\bbut\b/gi, "antithesis"],
  [/\b(?:isn't|aren't|wasn't|weren't|doesn't|don't|is not|are not|was not|were not|does not|do not|I'm not|I am not|we're not|we are not)\b[^.!?]{1,70}[.!?]\s+(?:It's|It is|They're|They are|We're|We are|You're|You are|That's|That is|This is|Instead|I'm|I am)\b/g, "antithesis-split"],
  // "X, not Y." and "X, not because Y." up to five words in the tail; also mid-sentence "X, not Y, and..."
  [/,\s*not\s+(?:a\s+|an\s+|the\s+|because\s+)?[\w'-]+(?:\s+[\w'-]+){0,4}\s*(?:[.!?,;]|$)/g, "antithesis-tail"],
  // The comma splice: "That is not a technology problem, it is a positioning opportunity."
  [/\b(?:is|are|was|were)\s+not\s+[^.!?;]{1,60},\s*(?:it|they|this|that|we|you)\s+(?:is|are|was|were)\b/gi, "antithesis-splice"],
  // The same with contractions: "Today isn't the why again, it's the how."
  [/\b(?:isn't|aren't|wasn't|weren't)\s+[^.!?;]{1,60},\s*(?:it's|they're|this is|that's|we're|you're|it is|they are)\b/gi, "antithesis-splice"],
  // "does not feel ten per cent better, they feel like a different category"
  [/\b(?:does not|doesn't|do not|don't|did not|didn't)\s+\w+[^.!?;]{1,60},\s*(?:it|they|we|you|he|she)\s+\w+/gi, "antithesis-splice"],
  [/\brather than\b/gi, "antithesis-rather-than"],
  [/\binstead of\b/gi, "antithesis-instead-of"],
  [/\bNot (?:a|an|the)\s+\w+\.\s+(?:A|An|The)\s+\w+\./g, "antithesis-fragments"],
  // "It does not require more expertise. It requires the ability to..." (the second sentence starts with a plain verb)
  [/\b(?:does not|do not|doesn't|don't|did not|didn't)\s+\w+[^.!?]{0,70}[.!?]\s+(?:It|They|This|That|What it)\s+(?:\w{3,}s|takes|needs|requires|means)\b/g, "antithesis-split"],
  // "Every consultant knows what they do. Very few know why." and "Everyone knows what, few know why."
  [/\b(?:Every|Everyone|Everybody|All|Most)\b[^.!?]{1,70}[.!?,]\s+(?:very\s+|but\s+)?(?:few|hardly anyone|almost nobody|nobody|none)\b/gi, "antithesis-every-few"],
  // "value the relationship more than the immediate deal": a comparison of two things, one set against the other
  [/\b(?:the|their|your|our|its|a|an)\s+[\w-]+\s+more than\s+(?:the|their|your|our|its|a|an)\s+(?:[\w-]+\s+)?[\w-]+/gi, "antithesis-more-than"],
  // "They follow a structured process. But trust is what earns..."
  [/[.!?]\s+But\s+[^.!?]{1,50}\b(?:is|are)\s+(?:what|the thing|where|who)\b/g, "antithesis-but"],
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

// Contrast is the oldest tool a speaker has, so it is rationed, not banned (Jim, 1 October).
// Free: the Big Idea, soundbites, the title and closing slides, and the five lines (which repeat the story).
// Never: audience, the hero, intent, argument, gaps and speech notes, which must be plain and quick to read.
// Everywhere else (headlines, core messages, supporting points, prologue, signposts, epilogue):
// at most CONTRAST_BUDGET in the whole story, and never two in the same section.
const CONTRAST_RULES = new Set(["antithesis", "antithesis-split", "antithesis-tail", "antithesis-fragments", "antithesis-splice", "antithesis-rather-than", "antithesis-instead-of", "antithesis-every-few", "antithesis-more-than", "antithesis-but"]);
const CONTRAST_PATHS = /(^|\.)(bigIdea|titleSlide|closingSlide)$|(^|\.)soundbite(\.|$)|(^|\.)fiveLineStory(\.|$)/;
const CONTRAST_NEVER = /(^|\.)(audience|hero|intent|argument|gaps|speechNotes)(\.|\[|$)/;
export const CONTRAST_BUDGET = 2;

type ContrastHit = Violation;

/** The section a path belongs to: "why", "prologue", "epilogue"... ignoring a leading "story." or "landing.". */
function sectionOf(path: string): string {
  return path.replace(/^(story|landing)\./, "").split(/[.[]/)[0] || "(component)";
}

type WalkOpts = { contrastAllowed?: boolean; bigIdea?: string; contrastHits?: ContrastHit[] };

function walk(value: unknown, path: string, out: Violation[], opts: WalkOpts = {}): void {
  if (typeof value === "string") {
    const contrastOk = opts.contrastAllowed || CONTRAST_PATHS.test(path);
    // The Big Idea may be quoted anywhere (the epilogue ends on it). Its contrast is allowed there too.
    const big = opts.bigIdea?.trim();
    const checked = big && big.length > 8 ? value.split(big).join(" ") : value;
    for (const [re, rule] of BANNED) {
      if (contrastOk && CONTRAST_RULES.has(rule)) continue;
      const target = CONTRAST_RULES.has(rule) ? checked : value;
      re.lastIndex = 0;
      const m = re.exec(target);
      if (m) {
        const start = Math.max(0, m.index - 30);
        const v = { path, rule, sample: target.slice(start, m.index + m[0].length + 30) };
        // A contrast outside the free places is rationed, not refused: collect it and judge the whole story.
        if (CONTRAST_RULES.has(rule) && opts.contrastHits && !CONTRAST_NEVER.test(path)) opts.contrastHits.push(v);
        else out.push(v);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, `${path}[${i}]`, out, opts));
    return;
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    // A soundbite quoted from the presenter's own material is theirs. The rules do not apply to it.
    if (o.source === "material" && typeof o.text === "string") return;
    for (const [k, v] of Object.entries(o)) walk(v, path ? `${path}.${k}` : k, out, opts);
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
    // A soundbite is something the audience repeats. A question is something they answer.
    if (/\?["”’']?\s*$/.test(o.text.trim())) {
      out.push({ path, rule: "soundbite-question", sample: o.text });
    }
    return;
  }
  for (const [k, v] of Object.entries(o)) soundbiteViolations(v, path ? `${path}.${k}` : k, out);
}

export type VoiceOptions = {
  contractionsInWritten?: boolean;
  /** Names and terms the audience section said to leave out. None may appear in the landing text. */
  avoid?: string[];
  /** The story's Big Idea. Its contrast is allowed wherever it is quoted. */
  bigIdea?: string;
  /** The whole value is a component where contrast is allowed (an edit to the Big Idea, a soundbite or a slide line). */
  contrastAllowed?: boolean;
};

const COMMON = new Set(["The", "This", "That", "These", "Those", "There", "Who", "What", "When", "Where", "Why", "How", "It", "They", "We", "You", "Our", "Their", "Internal", "No", "Not", "Any", "All", "One", "Each", "Every", "Some", "For", "And", "But", "Or", "If", "In", "On", "At", "To", "Of", "With", "Without", "After", "Before", "Act", "Stage", "Big", "Idea", "Prologue", "Epilogue"]);

/** Proper nouns in a "leave out" sentence: capitalised words that are not sentence-initial or common. */
export function namesToAvoid(leaveOut: string): string[] {
  const names = new Set<string>();
  for (const sentence of leaveOut.split(/[.!?;:]/)) {
    const words = sentence.trim().split(/\s+/);
    words.forEach((w, i) => {
      const clean = w.replace(/[^A-Za-z'-]/g, "");
      if (i === 0 || clean.length < 3 || COMMON.has(clean)) return;
      if (/^[A-Z][a-z]+$/.test(clean) || /^[A-Z]{2,}[A-Za-z]*$/.test(clean)) names.add(clean);
    });
  }
  return [...names];
}

function avoidViolations(value: unknown, path: string, avoid: string[], out: Violation[]): void {
  if (!avoid.length) return;
  if (typeof value === "string") {
    if (/(^|\.)(audience|gaps)(\.|\[|$)/.test(path)) return;
    for (const name of avoid) {
      const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      const m = re.exec(value);
      if (m) {
        const start = Math.max(0, m.index - 30);
        out.push({ path, rule: "leave-out", sample: `"${name}" is on the leave-out list: ` + value.slice(start, m.index + name.length + 30) });
        break;
      }
    }
    return;
  }
  if (Array.isArray(value)) value.forEach((v, i) => avoidViolations(v, `${path}[${i}]`, avoid, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) avoidViolations(v, path ? `${path}.${k}` : k, avoid, out);
  }
}

export function voiceViolations(value: unknown, options: VoiceOptions = {}): Violation[] {
  const out: Violation[] = [];
  const o = (value && typeof value === "object" ? value : {}) as { bigIdea?: unknown; story?: { bigIdea?: unknown } };
  const bigIdea = options.bigIdea ?? (typeof o.bigIdea === "string" ? o.bigIdea : typeof o.story?.bigIdea === "string" ? o.story.bigIdea : undefined);
  const contrastHits: ContrastHit[] = [];
  walk(value, "", out, { contrastAllowed: options.contrastAllowed, bigIdea, contrastHits });
  // One contrast per component counts once; then the budget and the one-per-section rule.
  const byPath = new Map<string, ContrastHit>();
  for (const h of contrastHits) if (!byPath.has(h.path)) byPath.set(h.path, h);
  const sections = new Set<string>();
  let used = 0;
  for (const h of byPath.values()) {
    const section = sectionOf(h.path);
    if (sections.has(section)) {
      out.push({ ...h, rule: "contrast-twice-in-section" });
    } else if (used >= CONTRAST_BUDGET) {
      out.push({ ...h, rule: `contrast-over-budget (at most ${CONTRAST_BUDGET} outside the Big Idea, soundbites and slides)` });
    } else {
      sections.add(section);
      used++;
    }
  }
  avoidViolations(value, "", options.avoid ?? [], out);
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
