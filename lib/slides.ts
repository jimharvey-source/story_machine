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
    "Use the standard layouts and their placeholders, so the deck can be moved onto a company template without rebuilding a slide. The title slide uses the Title Slide layout: the words go in the title placeholder and the subtitle placeholder stays empty or is removed. Every other slide uses the Title and Content layout: the slide's words go in the title placeholder, and the picture goes in the content placeholder. If the picture is an image, insert it into the content placeholder.",
    "Never add a text box or a shape outside the placeholders. Never put each item in its own box. Where a slide lists several items (stages, steps, a comparison), they are lines in the one content placeholder, one item per line, no bullet characters. A chart is one native chart object in the content placeholder, with its labels inside it. A diagram is one object, grouped, in the content placeholder, with its labels inside it.",
    "The words on each slide are given. Use them exactly, and nothing else. No subtitles, no logos, no slide numbers, no footers.",
    "Words large: the title fills the width at 60 to 90 points. One typeface, two weights at most. Set fonts and colours in the slide master and theme, never on individual slides, so a company template can replace them.",
    "One picture per slide at most, described below. A picture illustrates; it never decorates.",
    "One item at a time: lines in the content placeholder appear by paragraph, and a chart appears by category, so the slide can be built with simple animation later. No separate boxes are needed for this.",
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
