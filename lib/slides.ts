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
const CUE_LABEL = /^(?:open with|close on|close|quote|recap|ask|preview|land it|tell|show|state|say|mention|remind them|soundbite|action)\s*:\s*/i;

// Short words that carry no meaning of their own, so they never decide whether a cue repeats a slide.
const FILLER = new Set(["this", "that", "these", "those", "with", "from", "your", "their", "they", "them", "have", "here", "there", "what", "when", "into", "onto", "about", "just", "also", "very", "then", "than", "will", "were", "been", "being"]);

/** The words that carry meaning: four letters or more, filler dropped, hyphenated words split, a plural "s" dropped. */
function significant(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z']{3,}/g) ?? [])
    .filter((w) => !FILLER.has(w))
    .map((w) => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
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
 * The old deck, kept for stories whose Stage 2 ran before 19 November 2026 (they have no supporting slides).
 * The titles narrate the story: read in order, they tell it.
 * Title (the Big Idea), the Prologue's cues, then for each act its picture slide and one slide per cue,
 * then the Epilogue's cues and the closing slide (the Big Idea again). Cues that only repeat the Big Idea are
 * left to the title and closing slides, and cues that repeat their act's picture slide are left to that slide. A story without speech notes gets the five-slide deck.
 */
function legacyDeck(story: Story, landing: Landing): Slide[] {
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
  if (isNewDeck(landing)) return deck(story, landing).map((s): SlideLine => [s.name, briefText(s), s.serves]);
  return legacyDeck(story, landing).map((s): SlideLine => [s.name, `Words: "${s.words}" Picture: ${s.picture}.`.replace(/\.\.$/, "."), s.serves]);
}

/** The prompt a presenter pastes into their own AI slide tool. Our rules for slides, then their brief. */
export function slidePrompt(story: Story, landing: Landing, slides: SlideLine[] = slideList(story, landing)): string {
  if (isNewDeck(landing)) return newSlidePrompt(story, landing);
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


// ---------------------------------------------------------------------------------------------------------
// The deck from 19 November 2026 (John Zimmer's slide rules). Cues stay in the speaker notes and never become
// slides. The AI chooses a few supporting slides where the audience needs to see something. Order: title, any
// prologue slides, then for each act its act slide and its supporting slides, any epilogue slides, close.
// ---------------------------------------------------------------------------------------------------------

type Beat = "prologue" | "why" | "how" | "what" | "epilogue";

/** A landing made since 19 November carries supporting slides (even an empty set). Older ones keep the old deck. */
export function isNewDeck(landing: Landing): boolean {
  return !!landing.supportingSlides;
}

/** The picture is real when it names something to draw, rather than "none". */
export function hasPicture(s: Slide): boolean {
  return !!s.picture && !/^none\b/i.test(s.picture.trim());
}

function supportingSlide(raw: string, name: string, serves: string): Slide | null {
  const { words, picture } = splitSlideIdea(raw);
  // Labels never reach a slide: if the AI leaves one on, it comes off here.
  const text = (words || "").trim().replace(CUE_LABEL, "").replace(/[;,]\s*$/, "");
  if (!text) return null;
  return {
    name,
    words: text.charAt(0).toUpperCase() + text.slice(1),
    picture: picture.replace(/\.$/, "").trim() || "none; the words carry the slide",
    serves,
    notes: [],
  };
}

/** Numbers in a line ("19x", "5.3%", "9 in 10" gives 9 and 10), for matching a cue to its slide. */
function numbersIn(text: string): string[] {
  return (text.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", "."));
}

/**
 * Share a beat's cues across its slides. Each cue goes to the slide that shares its numbers or, failing that,
 * most of its meaningful words; a cue that matches no slide better than another keeps its place in spoken order.
 * (20 November 2026: order alone put the 19x cue on the chart and the tier figures on the 19x slide.)
 */
function shareCues(slides: Slide[], cues: string[]): void {
  const list = (cues ?? []).map((c) => c.trim()).filter(Boolean);
  if (!slides.length) return;
  const slideText = slides.map((s) => `${s.words} ${s.picture}`);
  const slideNums = slideText.map((t) => new Set(numbersIn(t)));
  const slideWords = slideText.map((t) => new Set(significant(t)));
  list.forEach((c, i) => {
    const byOrder = Math.floor((i * slides.length) / list.length);
    const nums = numbersIn(c);
    const words = significant(c.replace(CUE_LABEL, ""));
    const scores = slides.map((_, k) => 3 * nums.filter((n) => slideNums[k].has(n)).length + words.filter((w) => slideWords[k].has(w)).length);
    const best = Math.max(...scores);
    const winners = scores.flatMap((sc, k) => (sc === best ? [k] : []));
    const target = best >= 2 && winners.length === 1 ? winners[0] : byOrder;
    slides[target].notes.push(c);
  });
}

/** The deck for a landing with supporting slides. */
export function deck(story: Story, landing: Landing): Slide[] {
  if (!isNewDeck(landing)) return legacyDeck(story, landing);
  const big = story.bigIdea;
  const support = landing.supportingSlides!;
  const cues = landing.speechNotes;
  const kept = (beat: Beat, name: string, serves: string, also = "") =>
    (support[beat] ?? [])
      .map((r) => supportingSlide(r, name, serves))
      .filter((s): s is Slide => !!s && !echoes(s.words, big) && !(also && echoes(s.words, also)));

  // Title and closing slides carry the Big Idea word for word, set here, never by the AI.
  const title: Slide = { name: "Title", words: big, picture: "none, or one image that carries the big idea", serves: "Prologue", notes: [] };
  const close: Slide = { name: "Close", words: big, picture: "none", serves: "Epilogue", notes: [] };

  const opening = [title, ...kept("prologue", "Prologue", "Prologue")];
  shareCues(opening, cues.prologue);
  const out: Slide[] = [...opening];

  for (const [key, label] of actsOf(story)) {
    const { words, picture } = splitSlideIdea(landing[key].visualIdea);
    const short = label.split(",")[0];
    const anchorWords = words || story[key].headline;
    const act: Slide = { name: short, words: anchorWords, picture: picture.replace(/\.$/, "").trim() || "none", serves: label, notes: [] };
    const group = [act, ...kept(key, short, label, anchorWords)];
    shareCues(group, cues[key]);
    act.notes.unshift(label, `Signpost: ${landing[key].signpost}`);
    out.push(...group);
  }

  const ending = [...kept("epilogue", "Epilogue", "Epilogue"), close];
  shareCues(ending, cues.epilogue);
  out.push(...ending);
  return out;
}

/** One slide as a brief line: words, picture, and the cues that go in its notes. */
function briefText(s: Slide, withNotes = false): string {
  const cues = s.notes.filter((n) => !/^(Act \d|Signpost:)/.test(n));
  const notes = withNotes && cues.length ? ` Notes: ${cues.join("; ")}` : "";
  return `Words: "${s.words}" Picture: ${s.picture}.${notes}`.replace(/\.\.(\s|$)/, ".$1");
}

/** The prompt a presenter pastes into their own AI slide tool, in John Zimmer's wording (19 November 2026). */
function newSlidePrompt(story: Story, landing: Landing): string {
  const slides = deck(story, landing);
  const rules = [
    "Build the slides listed below, in that order, 16:9. Keep the title and closing slides, and their words, exactly as given. Leave out any other slide that does no job for the audience. If you leave out a slide, add its notes to the speaker notes of the slide before it.",
    "One idea per slide. If a slide carries two ideas, split it into two slides.",
    "Read in order, the slide titles should tell the story. The words for each slide are a strong starting point. Keep their meaning. On every slide except the title and closing slides, you may tighten the words so they fit on two lines, but never cut a title down to a label. List any words you changed.",
    "The three-second rule: the audience should grasp the point of every slide in three seconds. A chart or diagram may hold more detail, but its title and the one element the eye goes to first make the point at a glance. If a slide needs reading, it needs cutting.",
    "Use the standard layouts and their placeholders, so the deck can move onto a company template without rebuilding a slide. Title and closing slides: the Title Slide layout. The words go in the title placeholder. Delete the subtitle placeholder. Slides with a picture: the Title and Content layout. The words go in the title placeholder. An image or a chart goes in the content placeholder. A diagram is one grouped object that fills the content area; delete the empty content placeholder. Slides with words only: the Title Only layout, with the title placeholder centred on the slide. Set this in the layout, not on each slide.",
    "Never add a text box or a shape outside the placeholders, except a grouped diagram. Never put each item in its own box. Where a slide lists several items (stages, steps, a comparison), they are lines in the one content placeholder, one item per line, no bullet characters. A chart is one native chart object, with its labels inside it. Never invent a figure. If a chart would need numbers the slide does not give, show the given number or words set large.",
    "Nothing else on the slides. No subtitles, no logos, no slide numbers, no footers.",
    "Words large, and two lines at most: 54 points on the title, closing and words-only slides; 36 points on slides with a picture, to leave room for it. Labels inside a chart or diagram at least 18 points. One typeface, two weights at most. Set fonts, sizes and colours in the slide master, its layouts and the theme, never on individual slides, so a company template can replace them.",
    "One picture per slide at most, as described below. Slides are for impact, emphasis and illustration, never for narrative: the presenter tells the story. A picture illustrates and supports. It never decorates.",
    "Where a slide has a list or a chart, build it one item at a time: lines appear by paragraph, a chart by category.",
    "A quiet palette: one dark, one light, one accent. Plenty of empty space. Television quality: a viewer across the room reads it at a glance.",
    "No transitions, no clip art, no gradients, no stock-photo people shaking hands.",
    "Put each slide's notes in its speaker notes, as given. They are for the presenter and never appear on the slide.",
    "If your tool cannot make a PowerPoint file, follow the same rules in its own format.",
  ];
  const label = (s: Slide, i: number) => (i === 0 ? "Title" : i === slides.length - 1 ? "Closing" : s.serves);
  const list = slides.map((s, i) => `Slide ${i + 1} (${label(s, i)}): ${briefText(s, true)}`).join("\n");
  return [
    "You are a slide designer. Build the deck for a spoken presentation.",
    "",
    `The big idea: "${story.bigIdea}"`,
    `The subject: ${story.argument}`,
    `The audience: ${story.audience.who}`,
    "",
    "Rules:",
    ...rules.map((r, i) => `${i + 1}. ${r}`),
    "",
    "The slides:",
    list,
    "",
    "Return the deck. Then give one line per slide saying what job it does for the audience. List any slides you split, and any words you changed.",
  ].join("\n");
}

/** Keep the supporting slides within the ceiling: trim from the beat that has most, from its end. */
export function capSupporting<T extends Record<Beat, string[]>>(support: T, cap: number): T {
  const beats: Beat[] = ["prologue", "why", "how", "what", "epilogue"];
  const out = Object.fromEntries(beats.map((b) => [b, [...(support[b] ?? [])]])) as T;
  let total = beats.reduce((n, b) => n + out[b].length, 0);
  while (total > cap) {
    const most = beats.reduce((a, b) => (out[b].length > out[a].length ? b : a));
    out[most].pop();
    total--;
  }
  return out;
}
