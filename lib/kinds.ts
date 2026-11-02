// The kinds of presentation, from Jim's Six Speech Structures (2013 outline, 2016 rewrite).
// Buttons use the words people use at work; the PDF carries the book's name.
// Every kind keeps Prologue, three acts and Epilogue. Only the job of each part changes.
// The act jobs are Jim's rewrite of 3 October, benchmarked and approved. Act 3 carries the ask for every kind.
// Shared by the page, the prompts and the PDF.

export const KIND_KEYS = [
  "progress", "strategy", "sales", "decision", "funding", "change", "launch", "kickoff", "lessons", "keynote", "badnews", "other",
  "training", "science",
] as const;
export type Kind = (typeof KIND_KEYS)[number];

/**
 * The kinds offered on the form and to the model when it chooses. Training session is held back for launch
 * (Jim and John, 25 October): a six-hour training day came back as a three-act talk. Workshops are a different job.
 * The training kind stays in KIND_KEYS so older stories made with it still open, print and edit.
 */
export const FORM_KINDS = KIND_KEYS.filter((k) => k !== "training" && k !== "science");
// 2 November (Jim and John): Scientific presentation held back too, since a science talk can be a pitch, a strategy or a
// keynote; five kinds added (funding, change, launch, kickoff, lessons), so the form shows twelve, in a 3 by 4 grid.
// The act jobs of the five new kinds are drafts for Jim's approval.

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
    act3: "The decision required, the recommendation if needed, who decides, by when and how.",
    epilogue: "The criteria and the best option recapped, the decision and its first step, and the Big Idea last.",
  },
  funding: {
    label: "Funding request",
    book: "The Funding Request",
    line: "The opportunity, the plan that delivers it, and the money you ask for.",
    helps: "Show what the money makes possible, why your plan will deliver, and ask for the amount you need.",
    acts: ["The opportunity", "The plan", "The ask"],
    prologue: "The opportunity in a sentence, what it is worth, and the amount you are asking for.",
    act1: "The problem or opportunity, who it matters to, and what it is worth.",
    act2: "The plan: what you will do, who will do it, the milestones, and the evidence it will work.",
    act3: "The amount, what it pays for, the return or result, and the decision you need.",
    epilogue: "The opportunity and the return recapped, the amount asked for, and the Big Idea last.",
  },
  change: {
    label: "Leading change",
    book: "The Change Presentation",
    line: "Why we must change, what the change is, and what it means for you.",
    helps: "Make the case for change, show the future clearly, and bring people with you.",
    acts: ["Why change", "The change", "What it means for you"],
    prologue: "What is changing, why now, and what it means for the people in the room.",
    act1: "Where we are, why staying here is not an option, and what it costs us.",
    act2: "What the change is, how it will happen, step by step, and what stays the same.",
    act3: "What it means for each person here, the support they will have, and the first thing we ask of them.",
    epilogue: "Why we are changing, what happens next, the first step asked for, and the Big Idea last.",
  },
  launch: {
    label: "Product launch",
    book: "The Product Launch",
    line: "The need, what you are launching, and how to get it.",
    helps: "Show the need, bring the new product to life, and tell people how to get it.",
    acts: ["The need", "What is new", "How to get it"],
    prologue: "What you are launching, who it is for, and the difference it makes, in a sentence.",
    act1: "The need or frustration this audience knows, and what it costs them today.",
    act2: "What the product does, how it meets the need, and the proof: a demonstration, a customer or a figure.",
    act3: "When and how to get it, the price or offer, and the first step we ask of this audience.",
    epilogue: "The need and the difference recapped, how to get it, and the Big Idea last.",
  },
  kickoff: {
    label: "Team kickoff",
    book: "The Team Kickoff",
    line: "Why we are here, how we will work, and what happens first.",
    helps: "Set the purpose, agree how you will work together, and get everyone moving.",
    acts: ["Why we are here", "How we will work", "What happens first"],
    prologue: "The goal in a sentence, why it matters, and why this team.",
    act1: "The purpose: what we are here to achieve, why it matters, and what success looks like.",
    act2: "How we will work: roles, the plan, the milestones and the ways of working we agree.",
    act3: "What happens first: the first actions, owners and dates, and what we ask of each person.",
    epilogue: "The goal recapped, the first actions and owners, and the Big Idea last.",
  },
  lessons: {
    label: "Lessons learned",
    book: "The Lessons Learned Review",
    line: "What happened, what we learned, and what we will do differently.",
    helps: "Look back honestly, draw out the lessons, and agree what changes next time.",
    acts: ["What happened", "What we learned", "What we will do differently"],
    prologue: "The project or event in a sentence, the result, and the most important lesson.",
    act1: "What we set out to do, what happened, and the result, in facts.",
    act2: "What worked, what did not, and why: the lessons, most important first.",
    act3: "What we will do differently, who owns each change, and what we ask of this audience.",
    epilogue: "The lessons recapped, the changes and their owners, and the Big Idea last.",
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
  keynote: {
    label: "Conference keynote",
    book: "The Conference Keynote",
    line: "Why your talk matters to this conference, where the field stands, and where it goes next.",
    helps: "Bring your idea to a wide audience and get them interested.",
    acts: ["Why it matters", "The present", "The future"],
    prologue: "Why this talk, for this conference and this audience, now: the Big Idea in a sentence.",
    act1: "How your talk fits the conference and the audience, and why it matters to them.",
    act2: "How you and your organisation are navigating the field now.",
    act3: "What happens next, what it means, and what you want from this audience.",
    epilogue: "The headlines recapped, what you want the audience to do or think, and the Big Idea last.",
  },
  science: {
    label: "Scientific presentation",
    book: "The Scientific Presentation",
    line: "Why the experts should care, what remains unsolved, and what you ask of them.",
    helps: "Turn the data and details into a meaningful message.",
    acts: ["Why the experts should care", "The challenges", "The ask"],
    prologue: "The finding or question in a sentence, and why it matters to this audience now.",
    act1: "The implications of the latest developments in your field, and why these experts should care.",
    act2: "What remains unsolved, and what it means for the field and for society.",
    act3: "What you are doing, how the audience can benefit from your insights, and what you ask of them.",
    epilogue: "The finding and the ask recapped, and the Big Idea last.",
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
