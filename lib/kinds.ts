// The seven kinds of presentation, from Jim's Six Speech Structures (2013 outline, 2016 rewrite).
// Buttons use the words people use at work; the PDF carries the book's name.
// Every kind keeps Prologue, three acts and Epilogue. Only the job of each part changes.
// The act jobs are Jim's rewrite of 3 October, benchmarked and approved. Act 3 carries the ask for every kind.
// Shared by the page, the prompts and the PDF.

export const KIND_KEYS = ["progress", "strategy", "sales", "decision", "training", "badnews", "other"] as const;
export type Kind = (typeof KIND_KEYS)[number];

export type KindInfo = {
  /** The button label. */
  label: string;
  /** The book's name, used in the PDF. */
  book: string;
  /** One line under the label in the PDF and on the page. */
  line: string;
  /** What this kind helps the presenter do: the hover text on the form. */
  helps: string;
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
    line: "Where the work stands, the way forward, and what it needs to deliver.",
    helps: "Show where the work stands, how you will deal with what is in the way, and win what you need.",
    acts: ["Where we are", "The way forward", "What we need"],
    prologue: "The assignment, why it matters, and where it stands in a sentence.",
    act1: "Where we are now against the plan, and where we want to be.",
    act2: "The issues and risks in the way, and how we will deal with each, step by step.",
    act3: "What we need: actions, owners, timescales, budget, and the approval we need.",
    epilogue: "The headlines recapped, the approval or action asked for, and the Big Idea last.",
  },
  strategy: {
    label: "Strategy recommendation",
    book: "The Strategy Recommendation",
    line: "Why things must change, the route we recommend, and what happens next.",
    helps: "Make the case for change, show why your route is best, and win the decision.",
    acts: ["Why change", "The strategy", "What happens next"],
    prologue: "Why change is needed now, the strategy recommended, and two or three benefits the audience cares about.",
    act1: "Where we are now, where we want to be, and why it matters.",
    act2: "The route we recommend, step by step, and why it beats the alternatives.",
    act3: "The recommendation, the actions from here, and the decision we need.",
    epilogue: "The case recapped, the decision asked for, and the Big Idea last.",
  },
  sales: {
    label: "Sales pitch",
    book: "The Product Sales Presentation",
    line: "The customer's need, how you close the gap, and the proof.",
    helps: "Show what the gap is costing them, how you close it and the proof, then agree a next step.",
    acts: ["The need", "The solution", "The proof and the close"],
    prologue: "The customer's world and the gap that matters to them.",
    act1: "The need, what it is costing them, and the gap to close.",
    act2: "The product, idea or service, and how it closes the gap.",
    act3: "The proof, the price, and the next step we agree.",
    epilogue: "The need and the value recapped, the agreed next step, and the Big Idea last.",
  },
  decision: {
    label: "Choosing between options",
    book: "The Justification of a Decision",
    line: "The choice ahead, the options measured against the criteria, and the decision required.",
    helps: "Set out what matters, measure each option against it, and get the decision made.",
    acts: ["The choice", "The options", "The decision"],
    prologue: "The choice ahead and why it matters now.",
    act1: "The problem or opportunity ahead, and the criteria for a good decision.",
    act2: "Each option, with its costs and benefits measured against the criteria.",
    act3: "The decision required, the recommendation if one is wanted, who decides, by when and how.",
    epilogue: "The criteria and the best option recapped, the decision and its first step, and the Big Idea last.",
  },
  training: {
    label: "Training session",
    book: "The Training Presentation",
    line: "Why a skill matters, how it works, and the chance to practise it.",
    helps: "Teach a skill step by step, let people practise it, and send them away able to use it.",
    acts: ["Why it matters", "How it works", "Practise and keep going"],
    prologue: "The skill and two or three benefits the audience values.",
    act1: "What the skill is, why it matters, and how it will help them.",
    act2: "The knowledge, skills, attitudes and habits it takes, step by step.",
    act3: "Practice, testing and feedback, and how to keep learning.",
    epilogue: "Why it matters, in a sentence or two; the first thing to practise; how to keep learning.",
  },
  badnews: {
    label: "Bad news",
    book: "The Bad News Presentation",
    line: "What happened, how it is being put right, and where it ends.",
    helps: "Say what went wrong, what you are doing about it, and where it ends for the people affected.",
    acts: ["What happened", "Putting it right", "Where this ends"],
    prologue: "What happened, in one or two facts, and a promise to explain it and say what is being done.",
    act1: "What happened, the impact on people, and why, in facts.",
    act2: "What we are doing now to contain it, and the longer-term fix.",
    act3: "The future state when all is put right, and the help and information for people affected.",
    epilogue: "Who owns the fix, the lessons learned, where to find help, and the Big Idea last.",
  },
  other: {
    label: "Something else",
    book: "Why, How, What",
    line: "Why it matters, the answer, and what we need from this audience.",
    helps: "The classic story: why it matters, how to respond, and what to do next.",
    acts: ["Why", "How", "What"],
    prologue: "The golden first minute: the Big Idea, why it matters now, and what you need from the audience.",
    act1: "Why: the context and the challenge. What has changed, and why it matters.",
    act2: "How: the answer, and how it works. What is being done, and the evidence.",
    act3: "What: what we need from this audience. The decision or action, and what changes as a result.",
    epilogue: "The headlines recapped, the actions from here, and the Big Idea last.",
  },
};

/** Old stories have no kind: they were built as Why, How, What. */
export function kindOf(k: string | null | undefined): Kind {
  return (KIND_KEYS as readonly string[]).includes(k ?? "") ? (k as Kind) : "other";
}
