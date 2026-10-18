// The four key questions (John Zimmer's working draft 4, agreed 18 October). Shown in step 2 of the tool.
// The answers travel in the two fields the stories have always had: audience (questions 1 and 2) and
// intent (questions 3 and 4), each answer under its own label so the page can split them again.
// A blank answer means "I don't know yet": the story names it as a gap rather than guessing.

export type KeyQuestion = {
  field: "audience" | "intent";
  /** The label inside the stored text. Never change it: saved stories are split on it. */
  tag: string;
  question: string;
  hint: string;
};

export const KEY_QUESTIONS: KeyQuestion[] = [
  {
    field: "audience",
    tag: "Who they are and what matters to them",
    question: "Who is the audience and what matters to them?",
    hint: "For example: the executive committee, eight people, sceptical about cost, who care most about the pipeline number.",
  },
  {
    field: "audience",
    tag: "What they think about the topic",
    question: "What does your audience think about the topic of your presentation?",
    hint: "Do they know a lot or not much at all? Are they in favour of it, or opposed to it? Why is the topic important to them?",
  },
  {
    field: "intent",
    tag: "Objective",
    question: "What is your objective? When you finish speaking, what should the audience know, think and do?",
    hint: "For example: understand why the process needs more structure, and approve the pilot budget.",
  },
  {
    field: "intent",
    tag: "Message and why they should care",
    question: "What is your message, and why should they care?",
    hint: "For example: we should open an office in Singapore because of the low tax rate, a highly skilled workforce and proximity to our clients in East Asia.",
  },
];

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

/** The two stored fields back as four answers. Stories made before 18 October have no labels: the whole field is answer 1 or 3. */
export function splitAnswers(audience: string, intent: string): string[] {
  const out = ["", "", "", ""];
  const read = (text: string, f: "audience" | "intent") => {
    const idx = KEY_QUESTIONS.map((q, i) => ({ q, i })).filter(({ q }) => q.field === f);
    const labelled = idx.some(({ q }) => text.includes(`${q.tag}:`));
    if (!labelled) {
      out[idx[0].i] = text;
      return;
    }
    for (let k = 0; k < idx.length; k++) {
      const { q, i } = idx[k];
      const start = text.indexOf(`${q.tag}:`);
      if (start < 0) continue;
      const next = idx.slice(k + 1).map(({ q: n }) => text.indexOf(`\n${n.tag}:`, start)).find((n) => n >= 0) ?? text.length;
      const value = text.slice(start + q.tag.length + 1, next).trim();
      out[i] = value === BLANK ? "" : value;
    }
  };
  read(audience ?? "", "audience");
  read(intent ?? "", "intent");
  return out;
}
