// The story as a Word document: the same content and order as the PDF.
// Built on Word's own styles (Title, Heading 1, Heading 2, Normal, List Bullet, Quote), so a company
// template restyles it in one step: apply the template, or paste into a document that uses it.

import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { z } from "zod";
import type { LandingInputSchema, StoryInputSchema } from "./schema";
import { KINDS, kindOf } from "./kinds";
import { LICENCE, METHOD, SIGN_OFF } from "./method";
import { OWN_IT_LEAD, OWN_IT_TITLE, ownItAdvice } from "./ownIt";
import { slideList, slidePrompt } from "./slides";

type Story = z.infer<typeof StoryInputSchema>;
type Landing = z.infer<typeof LandingInputSchema>;

const h1 = (t: string, pageBreak = false) =>
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: pageBreak, children: [new TextRun(t)] });
const h2 = (t: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const p = (t: string, opts: { italic?: boolean; bold?: boolean; small?: boolean } = {}) =>
  new Paragraph({ children: [new TextRun({ text: t, italics: opts.italic, bold: opts.bold, size: opts.small ? 18 : undefined })] });
const label = (name: string, t: string) =>
  new Paragraph({ children: [new TextRun({ text: `${name}: `, bold: true }), new TextRun(t)] });
const bullet = (t: string) => new Paragraph({ text: t, bullet: { level: 0 } });
const spoken = (t: string) => new Paragraph({ style: "Quote", children: [new TextRun(t)] });

function words(t: string): number {
  return t.trim().split(/\s+/).filter(Boolean).length;
}
function timing(t: string): string {
  const n = words(t);
  const secs = Math.round((n / 140) * 60);
  return `${n} words, about ${secs < 60 ? `${secs} seconds` : `${Math.round(secs / 60)} minute${secs >= 90 ? "s" : ""}`} spoken`;
}

export async function renderDocx(title: string, story: Story, landing: Landing | null): Promise<Buffer> {
  const kind = KINDS[kindOf(story.kind)];
  const out: Paragraph[] = [];
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  out.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(story.bigIdea)] }));
  out.push(p(`Jim Harvey's StoryMachine  ·  ${landing ? "Stage 2: Add interest and impact" : "Stage 1: Get your story straight"}  ·  ${date}`, { small: true }));
  out.push(p(`Structure: ${kind.book}. ${kind.line}`, { small: true }));

  out.push(h1("Audience"));
  out.push(p(story.audience.who));
  out.push(label("They need to hear", story.audience.needToHear));
  out.push(label("Leave out", story.audience.doNotNeedToHear));
  if (story.hero?.who) {
    out.push(h2("The hero"));
    out.push(p(story.hero.who));
    out.push(label("What they want", story.hero.wants));
    out.push(label("What stands in the way", story.hero.obstacle));
  }
  out.push(h1("Statement of intent"));
  out.push(p(story.intent));
  out.push(h1("The argument"));
  out.push(p(story.argument));

  if (landing) {
    out.push(h1("Prologue"));
    out.push(spoken(landing.prologue));
    out.push(p(timing(landing.prologue), { small: true }));
  }

  const acts: Array<["why" | "how" | "what", string]> = [
    ["why", `Act 1, ${kind.acts[0]}`],
    ["how", `Act 2, ${kind.acts[1]}`],
    ["what", `Act 3, ${kind.acts[2]}`],
  ];
  for (const [key, name] of acts) {
    const act = story[key];
    out.push(h1(name));
    out.push(h2(act.headline));
    out.push(p(act.coreMessage));
    out.push(label(act.soundbite.source === "material" ? "Soundbite, from your notes" : "Soundbite, proposed", `“${act.soundbite.text}”`));
    for (const pt of act.supportingPoints) out.push(bullet(pt));
    if (landing) {
      out.push(label("Signpost, spoken", landing[key].signpost));
      out.push(label("Slide idea", landing[key].visualIdea));
    }
  }

  if (landing) {
    out.push(h1("Epilogue"));
    out.push(spoken(landing.epilogue));
    out.push(p(timing(landing.epilogue), { small: true }));
    out.push(h1("The story in five lines"));
    out.push(label("Prologue", landing.fiveLineStory.prologue));
    out.push(label(kind.acts[0], landing.fiveLineStory.why));
    out.push(label(kind.acts[1], landing.fiveLineStory.how));
    out.push(label(kind.acts[2], landing.fiveLineStory.what));
    out.push(label("Epilogue", landing.fiveLineStory.epilogue));
  }

  out.push(h1(OWN_IT_TITLE));
  out.push(p(OWN_IT_LEAD, { italic: true }));
  for (const g of [...(landing ? landing.gaps : story.gaps), ...ownItAdvice(story, landing)]) out.push(bullet(g));
  if (/\d/.test(JSON.stringify([story.why, story.how, story.what]))) {
    out.push(p("Every figure here comes from your material. Check each one against its source before you present.", { small: true }));
  }

  if (landing) {
    const notes = landing.speechNotes;
    const beats: Array<[string, string[]]> = [
      ["Prologue", notes.prologue],
      [`Act 1, ${kind.acts[0]}`, notes.why],
      [`Act 2, ${kind.acts[1]}`, notes.how],
      [`Act 3, ${kind.acts[2]}`, notes.what],
      ["Epilogue", notes.epilogue],
    ];
    if (beats.some(([, c]) => c.length)) {
      out.push(h1("Speech notes", true));
      out.push(p("Speak from these. Never from a script. One cue per line, in the order you say them.", { italic: true }));
      for (const [name, cues] of beats) {
        out.push(h2(name));
        for (const c of cues) out.push(bullet(c));
      }
    }

    out.push(h1("Word for word", true));
    out.push(p("The spoken parts in full, for rehearsal. If you must read, read only the Prologue and the Epilogue; the acts are yours to tell.", { italic: true }));
    for (const [name, text] of [
      ["Prologue", landing.prologue],
      ["Signpost into Act 1", landing.why.signpost],
      ["Signpost into Act 2", landing.how.signpost],
      ["Signpost into Act 3", landing.what.signpost],
      ["Epilogue", landing.epilogue],
    ] as const) {
      out.push(h2(name));
      out.push(p(text));
    }

    out.push(h1("Slide brief", true));
    const slides = slideList(story, landing);
    slides.forEach(([name, text, serves], i) => {
      out.push(h2(`Slide ${i + 1}, ${name}, serves ${serves}`));
      out.push(p(text));
    });

    out.push(h1("Make the slides with your own AI tool", true));
    out.push(p("Copy the prompt below into the AI tool you use for slides.", { italic: true }));
    for (const line of slidePrompt(story, landing, slides).split("\n")) {
      out.push(new Paragraph({ children: [new TextRun({ text: line, font: "Courier New", size: 18 })] }));
    }
  }

  out.push(h1("How this was made", true));
  for (const [name, text] of METHOD) {
    out.push(h2(name));
    out.push(p(text));
  }
  out.push(p(LICENCE, { small: true }));
  out.push(new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: SIGN_OFF, size: 18 })] }));

  const doc = new Document({
    creator: "Jim Harvey's StoryMachine",
    title,
    description: landing ? "Stage 2: Add interest and impact" : "Stage 1: Get your story straight",
    styles: {
      paragraphStyles: [
        {
          id: "Quote",
          name: "Quote",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { italics: true },
          paragraph: { indent: { left: 360 } },
        },
      ],
    },
    sections: [{ children: out }],
  });
  return Packer.toBuffer(doc);
}
