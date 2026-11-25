// "Additional suggestions from StoryMachine" (was "Make it your own" until the call of 16 November): the coach's advice before the first rehearsal.
// The story's own gaps come first; these standing suggestions follow. Shared by the page and the PDF.

import type { Landing, Story } from "./schema";

export const OWN_IT_TITLE = "Additional suggestions from StoryMachine";
export const OWN_IT_LEAD =
  "StoryMachine gives you the structure and a first draft. Audiences believe speakers who sound like themselves, so this part is yours. Follow this advice before you rehearse.";

// On the page (John, draft 10): one line that says how to act on the panel. The PDF and Word file keep OWN_IT_LEAD.
export const OWN_IT_PAGE_LEAD = "Each point is a gap. Fill it by changing the line above, or ask Refine to do it.";

export function ownItAdvice(story: Story, landing: Omit<Landing, "supportingSlides"> | null): string[] {
  const out: string[] = [];
  // The StoryMachine gives no legal advice. For bad news, this line always comes first.
  if (story.kind === "badnews") out.push("Take legal advice before you explain how it happened.");
  const proposed = [story.why, story.how, story.what].some((a) => a.soundbite.source === "proposed");
  if (proposed) out.push("Put every soundbite StoryMachine proposed into your own words. The line the room repeats should be one you would say anyway.");
  out.push("Add one story from your own experience to the act that feels thinnest. Stories are what an audience remembers and retells.");
  out.push(
    landing
      ? "Say the prologue and epilogue out loud, then change any word that feels borrowed. Rehearse the acts from the speaker notes."
      : "Read the three headlines out loud. If one sounds like someone else, rewrite it until it sounds like you."
  );
  return out;
}
