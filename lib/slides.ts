import type { LandingInputSchema, StoryInputSchema } from "./schema";
import type { z } from "zod";
import { KINDS, kindOf } from "./kinds";
import { splitSlideIdea } from "./method";

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

/** One slide in the deck. Words go in the title; the picture brief goes in the content area; notes are the cue. */
export type Slide = { name: string; words: string; picture: string; serves: string; notes: string[] };

// Labels a cue uses to tell the presenter what to do. On a slide they go: the rest of the cue is the title.
const CUE_LABEL = /^(?:open with|close on|close|quote|recap|ask|preview|land it|tell|show|state|say|mention|remind them)\s*:\s*/i;

/** The words that carry meaning: four letters or more, hyphenated words split, a plural "s" dropped. */
function significant(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z']{3,}/g) ?? []).map((w) => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

/** A cue that only says again what another slide already says: most of its words are on that slide. */
function echoes(cue: string, slideWords: string): boolean {
  const words = significant(cue.replace(CUE_LABEL, ""));
  if (!words.length) return false;
  const on = new Set(significant(slideWords));
  return words.filter((w) => on.has(w)).length / words.length >= 0.6;
}

function cueSlide(cue: string, name: string, serves: string): Slide {
  const isQuote = /^quote\s*:/i.test(cue.trim());
  const text = cue.trim().replace(CUE_LABEL, "").replace(/[.;,]\s*$/, "");
  const words = text.charAt(0).toUpperCase() + text.slice(1);
  return {
    name,
    words,
    picture: isQuote ? "the words set large, as a quotation" : "none; the title carries the slide",
    serves,
    notes: [cue],
  };
}

/**
 * The deck. The titles narrate the story: read in order, they tell it.
 * Title (the Big Idea), the Prologue's cues, then for each act its picture slide and one slide per cue,
 * then the Epilogue's cues and the closing slide (the Big Idea again). Cues that only repeat the Big Idea are
 * left to the title and closing slides, and cues that repeat their act's picture slide are left to that slide. A story without speech notes gets the five-slide deck.
 */
export function deck(story: Story, landing: Landing): Slide[] {
  const cues = landing.speechNotes;
  const big = story.bigIdea;
  // A cue that repeats the Big Idea is left to the title and closing slides; one that repeats its act's
  // picture slide is left to that slide. Either way its words stay in the speaker notes.
  const fromCues = (list: string[], name: string, serves: string, also = "") =>
    (list ?? [])
      .filter((c) => c.trim() && !echoes(c, big) && !(also && echoes(c, also)))
      .map((c) => cueSlide(c, name, serves));
  const out: Slide[] = [];
  // Title and closing slides carry the Big Idea word for word, set here rather than left to the model,
  // so an edit to the Big Idea carries through and no variant wording ever reaches a slide.
  out.push({ name: "Title", words: big, picture: "none, or one image that carries the Big Idea", serves: "Prologue", notes: ["Prologue", ...(cues.prologue ?? [])] });
  out.push(...fromCues(cues.prologue, "Prologue", "Prologue"));
  for (const [key, label] of actsOf(story)) {
    const { words, picture } = splitSlideIdea(landing[key].visualIdea);
    const short = label.split(",")[0];
    const anchorWords = words || story[key].headline;
    const repeats = (cues[key] ?? []).filter((c) => c.trim() && echoes(c, anchorWords));
    out.push({
      name: short,
      words: anchorWords,
      picture: picture || "none",
      serves: label,
      notes: [label, `Signpost: ${landing[key].signpost}`, ...repeats],
    });
    out.push(...fromCues(cues[key], short, label, anchorWords));
  }
  out.push(...fromCues(cues.epilogue, "Epilogue", "Epilogue"));
  out.push({ name: "Close", words: big, picture: "the title slide again, or nothing", serves: "Epilogue", notes: ["Epilogue", ...(cues.epilogue ?? [])] });
  return out;
}

/** The deck as brief lines: name, the words and picture, the part it serves. */
export function slideList(story: Story, landing: Landing): SlideLine[] {
  return deck(story, landing).map((s): SlideLine => [s.name, `Words: "${s.words}" Picture: ${s.picture}.`.replace(/\.\.$/, "."), s.serves]);
}

/** The prompt a presenter pastes into their own AI slide tool. Our rules for slides, then their brief. */
export function slidePrompt(story: Story, landing: Landing, slides: SlideLine[] = slideList(story, landing)): string {
  const rules = [
    "Make a slide deck of exactly the slides listed below, in that order, 16:9.",
    "One idea per slide. If a slide needs two ideas, it is two slides.",
    "The slide titles narrate the story: read in order, they tell it. Every slide title is a sentence the presenter would say, so keep each one exactly as given and never shorten it to a label.",
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
