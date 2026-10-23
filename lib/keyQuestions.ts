// The key questions. Rewritten at the call with John Zimmer on 23 October: what the presentation is about,
// the audience, the objective, the message, and how long it runs. Kind of presentation and tone stay as they were.
// The answers travel in the two fields the stories have always had: audience and intent, each answer under its
// own label so the page can split them again. A blank answer means "I don't know yet": the story names it as a gap.

export type KeyQuestion = {
  field: "audience" | "intent";
  /** The label inside the stored text. Never change it: saved stories are split on it. */
  tag: string;
  question: string;
  hint: string;
  /** A one-line answer, such as the length. */
  short?: boolean;
};

export const KEY_QUESTIONS: KeyQuestion[] = [
  {
    field: "intent",
    tag: "Topic",
    question: "What is your presentation about?",
    hint: "For example: the case for opening an office in Singapore next year.",
  },
  {
    field: "audience",
    tag: "Who they are and what matters to them",
    question: "Who is the audience, and why does it matter to them?",
    hint: "For example: the executive committee, eight people, sceptical about cost, who care most about total pipeline value. What do they already know about the topic, and where do they stand on it?",
  },
  {
    field: "intent",
    tag: "Objective",
    question: "What is your objective? What do you want the audience to do as a result?",
    hint: "For example: approve the pilot budget at this meeting.",
  },
  {
    field: "intent",
    tag: "Message and why they should care",
    question: "What is your message, and why should they care?",
    hint: "For example: we should open an office in Singapore because of the low tax rate, a highly skilled workforce and proximity to our clients in East Asia. They should care because this will result in larger profits for the company.",
  },
  {
    field: "intent",
    tag: "Length",
    question: "How long is your presentation, not counting questions?",
    hint: "For example: 20 minutes",
    short: true,
  },
];

/** Labels used before 23 October. Their answers fold into the question that replaced them. */
const LEGACY_TAGS: Array<{ tag: string; field: "audience" | "intent"; into: number }> = [
  { tag: "What they think about the topic", field: "audience", into: 1 },
];

export const BLANK_KEYS = (): string[] => KEY_QUESTIONS.map(() => "");

/** The length answer as whole minutes, when it gives a number. "20 minutes", "half an hour", "1 hour" and "90" all read. */
export function minutesFrom(text: string): number | null {
  const line = text.match(/(?:^|\n)Length:\s*(.+)/)?.[1] ?? text;
  const t = line.toLowerCase();
  if (/half an hour/.test(t)) return 30;
  if (/quarter of an hour/.test(t)) return 15;
  const hours = t.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/);
  const mins = t.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/);
  if (hours || mins) {
    const total = (hours ? parseFloat(hours[1].replace(",", ".")) * 60 : 0) + (mins ? parseInt(mins[1], 10) : 0);
    return total > 0 ? Math.round(total) : null;
  }
  if (/an hour|one hour/.test(t)) return 60;
  const bare = t.match(/^\s*(\d+)\s*$/);
  return bare ? parseInt(bare[1], 10) || null : null;
}

const BLANK = "(not answered yet)";

/** The four answers as the two stored fields. Nothing answered at all leaves a field empty. */
export function composeAnswers(answers: string[]): { audience: string; intent: string } {
  const field = (f: "audience" | "intent") => {
    const parts = KEY_QUESTIONS.map((q, i) => ({ q, a: (answers[i] ?? "").trim() })).filter(({ q }) => q.field === f);
    if (parts.every(({ a }) => !a)) return "";
    return parts.map(({ q, a }) => `${q.tag}: ${a || BLANK}`).join("\n");
  };
  return { audience: field("audience"), intent: field("intent") };
}

/** The two stored fields back as answers. Stories made before 18 October have no labels: the whole field is the first answer for that field. */
export function splitAnswers(audience: string, intent: string): string[] {
  const out = BLANK_KEYS();
  const read = (text: string, f: "audience" | "intent") => {
    const own = KEY_QUESTIONS.map((q, i) => ({ tag: q.tag, i })).filter(({ i }) => KEY_QUESTIONS[i].field === f);
    const legacy = LEGACY_TAGS.filter((l) => l.field === f).map((l) => ({ tag: l.tag, i: l.into }));
    const all = [...own, ...legacy];
    const found = all
      .map(({ tag, i }) => ({ tag, i, at: text.startsWith(`${tag}:`) ? 0 : text.indexOf(`\n${tag}:`) }))
      .filter(({ at }) => at >= 0)
      .sort((a, b) => a.at - b.at);
    if (!found.length) {
      const first = own.find(({ i }) => KEY_QUESTIONS[i].tag !== "Topic") ?? own[0];
      out[first.i] = text;
      return;
    }
    found.forEach(({ tag, i, at }, k) => {
      const begin = (at === 0 ? 0 : at + 1) + tag.length + 1;
      const stop = k + 1 < found.length ? found[k + 1].at : text.length;
      const value = text.slice(begin, stop).trim();
      if (!value || value === BLANK) return;
      out[i] = out[i] ? `${out[i]}\n${value}` : value;
    });
  };
  read(audience ?? "", "audience");
  read(intent ?? "", "intent");
  return out;
}
