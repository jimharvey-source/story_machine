// "How this was made": the method page that closes every download. Shared by the PDF and the Word file.
export const METHOD: Array<[string, string]> = [
  ["Understand the audience", "Every story starts with who is listening: what they need to hear, and what they do not. A message that is right for everyone lands with no one."],
  ["State your intent", "One sentence: after my presentation, the audience will... If you cannot finish it, you are not ready to present."],
  ["Clarify the argument", "The case in one sentence, in your words, that a sceptic could test. The Big Idea is the memorable form of it: the line people repeat in the corridor."],
  ["Build a three-act story", "Each kind of presentation gives the acts their own jobs. The classic story runs Why: the problem, and why it matters now. How: the insight or the answer. What: the ask. Each act has a headline that says the point, a soundbite worth quoting, and only the evidence that carries the point."],
  ["Make it land", "A Prologue that earns attention in the first sentence and states the idea inside a minute. A signpost into each act so the audience knows the important thing has arrived."],
  ["End with certainty", "Audiences need certainty. End by recapping your headlines and the actions from here. Send them away with the message ringing in their ears."],
  ["Then the slides", "Slides come after the story, so every one has a job to do. Few, simple, one idea each, and titles that tell the story."],
  ["Then rehearse", "Rehearse from your notes, with your slides, until the story sounds like you. Say it out loud: a story you have only read is not ready."],
];

/** Where people write for projects, training and organisation licences. Shown in the PDF and Word downloads. */
export const CONTACT_EMAIL = "storymachine@themessagebusiness.com";

/** The closing words of every download, in Jim's wording (12 October 2026). One string per paragraph. */
export const LICENCE: string[] = [
  "The story in this document is yours: your material, your conviction, your words. We have simply helped you shape and sharpen it based on our experience of helping clients sell their ideas, products and services all over the world for the last 35 years.",
  `If you want help on specific projects, training for your team or to license the StoryMachine for your organisation to use, contact us at ${CONTACT_EMAIL}.`,
  "The method that shaped StoryMachine is the intellectual property of The Message Business and is licensed to you for your own presentations.",
];

export const SIGN_OFF = "Jim Harvey  ·  The Message Business  ·  themessagebusiness.com  ·  presentation-guru.com";

/** Slide ideas are written as: Words: "..." Picture: ... Split them for the PowerPoint file. */
export function splitSlideIdea(idea: string): { words: string; picture: string } {
  const m = idea.match(/Words:\s*["“]([^"”]*)["”]\s*(?:Picture:\s*)?([\s\S]*)$/i);
  if (m) return { words: m[1].trim(), picture: m[2].trim() };
  return { words: "", picture: idea.trim() };
}
