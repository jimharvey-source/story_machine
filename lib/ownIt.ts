// "Make it your own": the coach's advice before the first rehearsal.
// The story's own gaps come first; these standing suggestions follow. Shared by the page and the PDF.

import type { Landing, Story } from "./schema";

export const OWN_IT_TITLE = "Make it your own";
export const OWN_IT_LEAD =
  "The StoryMachine gives you the structure and a first draft. An audience believes a speaker who sounds like themselves, so this part is yours. Do these before you rehearse.";

export function ownItAdvice(story: Story, landing: Landing | null): string[] {
  const out: string[] = [];
  // The StoryMachine gives no legal advice. For bad news, this line always comes first.
  if (story.kind === "badnews") out.push("Take legal advice before you explain how it happened.");
  const proposed = [story.why, story.how, story.what].some((a) => a.soundbite.source === "proposed");
  if (proposed) out.push("Put every soundbite marked \"proposed\" into your own words. The line the room repeats should be one you would say anyway.");
  out.push("Add one story from your own experience to the act that feels thinnest. Stories are what an audience remembers and retells.");
  out.push(
    landing
      ? "Say the Prologue and Epilogue out loud, then change any word that feels borrowed. Rehearse the acts from the speech notes."
      : "Read the three headlines out loud. If one sounds like someone else, rewrite it until it sounds like you."
  );
  return out;
}
