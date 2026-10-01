// The seven kinds of presentation, from Jim's Six Speech Structures (2013 outline, 2016 rewrite).
// Buttons use the words people use at work; the PDF carries the book's name.
// Every kind keeps Prologue, three acts and Epilogue. Only the job of each part changes.
// The jobs are Jim's wording, lightly edited. Shared by the page, the prompts and the PDF.

export const KIND_KEYS = ["progress", "strategy", "sales", "decision", "training", "badnews", "other"] as const;
export type Kind = (typeof KIND_KEYS)[number];

export type KindInfo = {
  /** The button label. */
  label: string;
  /** The book's name, used in the PDF. */
  book: string;
  /** One line under the label in the PDF and on the page. */
  line: string;
  /** Short names for the three acts, shown on the page. */
  acts: [string, string, string];
  prologue: string;
  act1: string;
  act2: string;
  act3: string;
  epilogue: string;
};

export const KINDS: Record<Kind, KindInfo> = {
  progress: {
    label: "Project update",
    book: "The Progress Report",
    line: "Where the work stands, what is in the way, and what it will deliver.",
    acts: ["Where we are", "The problems", "The results"],
    prologue: "The assignment and why it matters; one or two effects the work will have.",
    act1: "Where you started, where you are, the steps still outstanding.",
    act2: "The problems, in priority order, and how each is being handled.",
    act3: "Progress so far, the results expected, the big picture.",
    epilogue: "How the actions answer Act 1's problems; the steps still to take.",
  },
  strategy: {
    label: "Strategy recommendation",
    book: "The Strategy Recommendation",
    line: "Why things must change, how much better they could be, and the best way there.",
    acts: ["Where we are", "What could be", "The options"],
    prologue: "Why a new strategy, the one recommended, and two or three benefits the audience cares about.",
    act1: "Current conditions, with the cost of doing nothing as the bridge to Act 2.",
    act2: "The desired state: how much better things could be.",
    act3: "The options, with the pros and cons of each.",
    epilogue: "The best option, tested against Acts 1 and 2; what happens next.",
  },
  sales: {
    label: "Sales pitch",
    book: "The Product Sales Presentation",
    line: "The customer's need, how the product meets it, and the proof.",
    acts: ["The need", "The solution", "The proof"],
    prologue: "The customer's need: open the gap the product fills.",
    act1: "The need in detail: how it hurts now.",
    act2: "How the solution meets the need: feature, problem solved, benefit.",
    act3: "Proof: facts, figures and cases for this audience.",
    epilogue: "A summary and one agreed next step.",
  },
  decision: {
    label: "Decision",
    book: "The Justification of a Decision",
    line: "The dilemma, the criteria, the options, and the one that passes the test.",
    acts: ["The criteria", "The options", "The test"],
    prologue: "The dilemma and why the choice matters.",
    act1: "The criteria for success, in priority order.",
    act2: "The options: how each works, its pros and cons.",
    act3: "The options tested against the criteria; the weak ones eliminated.",
    epilogue: "The recommended option, endorsed by the criteria; the action to implement it.",
  },
  training: {
    label: "Training session",
    book: "The Training Presentation",
    line: "A skill worth having: how it works, a chance to try it, and feedback.",
    acts: ["How it works", "Try it", "Feedback"],
    prologue: "The skill and two or three benefits the audience values.",
    act1: "How the skill works and why it is worth learning, then the teaching.",
    act2: "The audience tries it: what to do, how, and how long they have.",
    act3: "Feedback, the value again, the whole skill recapped, variations.",
    epilogue: "Why it matters, in a sentence or two; how to keep learning.",
  },
  badnews: {
    label: "Bad news",
    book: "The Bad News Presentation",
    line: "What happened, how, what is being done now, and the permanent fix.",
    acts: ["How it happened", "Containing it", "The fix"],
    prologue: "What happened and the damage, in facts.",
    act1: "How and why it happened: the explanation, no blame, the audience's questions answered.",
    act2: "Interim steps to contain the damage, most important first.",
    act3: "The path to a permanent fix, tied back to Act 1.",
    epilogue: "Who owns the fix; the lessons learned; the call to action.",
  },
  other: {
    label: "Something else",
    book: "Why, How, What",
    line: "The problem and why it matters, the response, and the ask.",
    acts: ["Why", "How", "What"],
    prologue: "The golden first minute: the Big Idea, why it matters now, and what you need from the audience.",
    act1: "Why: the hook. What has changed, the problem or opportunity, why it matters.",
    act2: "How: the response. What has been learned, what is being done, the evidence.",
    act3: "What: the ask. The decision or action required, and what changes as a result.",
    epilogue: "The headlines recapped, the actions from here, and the Big Idea last.",
  },
};

/** Old stories have no kind: they were built as Why, How, What. */
export function kindOf(k: string | null | undefined): Kind {
  return (KIND_KEYS as readonly string[]).includes(k ?? "") ? (k as Kind) : "other";
}

/** Where the ask goes: Strategy and Decision lay out options in Act 3 and recommend in the Epilogue. */
export function askInEpilogue(k: Kind): boolean {
  return k === "strategy" || k === "decision";
}
