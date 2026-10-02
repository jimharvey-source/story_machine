// "How this was made": the method page that closes every download. Shared by the PDF and the Word file.
export const METHOD: Array<[string, string]> = [
  ["Understand the audience", "Every story starts with who is listening: what they need to hear, and what they do not. A message that is right for everyone lands with no one."],
  ["State your intent", "One sentence: after my presentation, the audience will... If you cannot finish it, you are not ready to present."],
  ["Clarify the argument", "The case in one sentence, in your words, that a sceptic could test. The Big Idea is the memorable form of it: the line people repeat in the corridor."],
  ["Build a three-act story", "Each kind of presentation gives the acts their own jobs. The classic story runs Why: the problem, and why it matters now. How: the insight or the answer. What: the ask. Each act has a headline that says the point, a soundbite worth quoting, and only the evidence that carries the point."],
  ["Make it land", "A Prologue that earns attention in the first sentence and states the idea inside a minute. A signpost into each act so the audience knows the important thing has arrived. One slide per act that illustrates rather than explains."],
  ["End with certainty", "Audiences need certainty. End by recapping your headlines and the actions from here. Send them away with the message ringing in their ears."],
  ["Then the slides, last", "Slides come after the story, so every one has a job to do. Few, simple, one idea each."],
];

export const LICENCE =
  "The story in this document is yours: your material, your conviction, your words. The method that shaped it, the three-act structure, the Prologue and Epilogue, the tests each part has to pass, is the intellectual property of The Message Business and is licensed to you for your own presentations. Teach it to your team with our training, or use the StoryMachine as many times as you need.";

export const SIGN_OFF = "Jim Harvey  ·  The Message Business  ·  themessagebusiness.com  ·  presentation-guru.com";

/** Slide ideas are written as: Words: "..." Picture: ... Split them for the PowerPoint file. */
export function splitSlideIdea(idea: string): { words: string; picture: string } {
  const m = idea.match(/Words:\s*["“]([^"”]*)["”]\s*(?:Picture:\s*)?([\s\S]*)$/i);
  if (m) return { words: m[1].trim(), picture: m[2].trim() };
  return { words: "", picture: idea.trim() };
}
