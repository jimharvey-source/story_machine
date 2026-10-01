import type { LandingInputSchema, StoryInputSchema } from "./schema";
import type { z } from "zod";
import { KINDS, kindOf } from "./kinds";

type Story = z.infer<typeof StoryInputSchema>;
type Landing = z.infer<typeof LandingInputSchema>;

export type SlideLine = [name: string, text: string, serves: string];

/** The three acts with their names for this kind of presentation: "Act 1, The need". */
function actsOf(story: Story): Array<[keyof Pick<Story, "why" | "how" | "what">, string]> {
  const names = KINDS[kindOf(story.kind)].acts;
  return [
    ["why", `Act 1, ${names[0]}`],
    ["how", `Act 2, ${names[1]}`],
    ["what", `Act 3, ${names[2]}`],
  ];
}

/** The five slides: title, one per act, close. */
export function slideList(story: Story, landing: Landing): SlideLine[] {
  return [
    // Title and closing slides carry the Big Idea word for word, set here rather than left to the model,
    // so an edit to the Big Idea carries through and no variant wording ever reaches a slide.
    ["Title", `Words: "${story.bigIdea}" Picture: none, or one image that carries the Big Idea.`, "Prologue"],
    ...actsOf(story).map(([key, label]): SlideLine => [label.split(",")[0], landing[key].visualIdea, label]),
    ["Close", `Words: "${story.bigIdea}" Picture: the title slide again, or nothing.`, "Epilogue"],
  ];
}

/** The prompt a presenter pastes into their own AI slide tool. Our rules for slides, then their brief. */
export function slidePrompt(story: Story, landing: Landing, slides: SlideLine[] = slideList(story, landing)): string {
  const rules = [
    "Make a slide deck of exactly the slides listed below, in that order, 16:9.",
    "One idea per slide. If a slide needs two ideas, it is two slides.",
    "The three-second rule: everything on a slide must be understood in three seconds. If it needs reading, it needs cutting.",
    "The words on each slide are given. Use them exactly, and nothing else. No subtitles, no bullet lists, no logos, no slide numbers, no footers.",
    "Words large: the main line fills the width at 60 to 90 points. One typeface, two weights at most.",
    "One picture per slide at most, described below, full-bleed or as the single object on the slide. A picture illustrates; it never decorates.",
    "One item at a time: where a slide shows several elements (a list of stages, a comparison), each must be able to appear one at a time, so it can be built with simple animation later.",
    "A quiet palette: one dark, one light, one accent. Plenty of empty space. Television quality: a viewer across the room reads it at a glance.",
    "No transitions, no clip art, no gradients, no stock-photo people shaking hands.",
  ];
  const list = slides.map(([name, text, serves], i) => `Slide ${i + 1} (${name}, serves ${serves}): ${text}`).join("\n");
  return [
    "You are a slide designer. Build the deck for a spoken presentation whose Big Idea is:",
    `"${story.bigIdea}"`,
    "",
    "Rules:",
    ...rules.map((r, i) => `${i + 1}. ${r}`),
    "",
    "The slides:",
    list,
    "",
    `The presentation is for: ${story.audience.who}`,
    "Return the deck, then one line per slide saying what job it does for the audience. If a slide has no job, leave it out and say so.",
  ].join("\n");
}
