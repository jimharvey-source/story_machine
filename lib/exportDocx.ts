// The story as a Word document: the same sections, order and wording as the PDF (lib/exportPdf.ts).
// Built on Word's own styles (Title, Heading 1, Heading 2, Normal, List Bullet, Quote), so a company
// template restyles it in one step: apply the template, or paste into a document that uses it.

import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { z } from "zod";
import type { LandingInputSchema, Rhetoric, StoryInputSchema } from "./schema";
import { RHETORIC_LEAD, RHETORIC_TITLE, hasRhetoric, suggestionLine } from "./rhetoric";
import { KINDS, kindOf } from "./kinds";
import { LICENCE, METHOD, SIGN_OFF } from "./method";
import { OWN_IT_LEAD, OWN_IT_TITLE, ownItAdvice } from "./ownIt";

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

export async function renderDocx(title: string, story: Story, landing: Landing | null, rhetoric: Rhetoric | null = null): Promise<Buffer> {
  const kind = KINDS[kindOf(story.kind)];
  const acts = kind.acts;
  const isOther = kindOf(story.kind) === "other";
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const out: Paragraph[] = [];
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  let n = 0;
  // Each section opens on a new page with its number, as in the PDF (lib/exportPdf.ts).
  const section = (name: string, lead: string) => {
    n += 1;
    out.push(h1(`${n}. ${name}`, true));
    out.push(p(lead, { italic: true }));
  };

  // Cover: the same order as the PDF's first page.
  out.push(p("Your presentation story", { bold: true, small: true }));
  out.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(story.bigIdea)] }));
  out.push(p(`Jim Harvey's StoryMachine  ·  ${landing ? "Stage 2: Add interest and impact" : "Stage 1: Get your story straight"}  ·  ${date}`, { small: true }));
  out.push(p(kind.book === acts.join(", ") ? `Structure: ${kind.book}.` : `Structure: ${kind.book}. ${acts.join(", ")}.`, { small: true }));

  // ---- 1 Your audience and your argument ----
  section(
    "Your audience and your argument",
    "These are the foundations of your story. Check them first. If any of them is wrong, change it in StoryMachine and find your story again: everything else is built on them."
  );
  out.push(h2("Your audience analysis"));
  out.push(label("Who they are", story.audience.who));
  if (story.hero?.wants) out.push(label("What they want", story.hero.wants));
  if (story.hero?.obstacle) out.push(label("What stands in the way", story.hero.obstacle));
  out.push(label("What they need to hear", story.audience.needToHear));
  out.push(label("What to leave out", story.audience.doNotNeedToHear));
  out.push(h2("What you want your presentation to do"));
  out.push(p(story.intent));
  out.push(h2("Your argument"));
  out.push(p(story.argument));
  if (landing) {
    out.push(h2("Your story in five lines"));
    out.push(p("The whole talk in 30 seconds. If it works here, it will work in the room.", { italic: true, small: true }));
    out.push(label("Prologue", landing.fiveLineStory.prologue));
    out.push(label(`Act 1: ${acts[0]}`, landing.fiveLineStory.why));
    out.push(label(`Act 2: ${acts[1]}`, landing.fiveLineStory.how));
    out.push(label(`Act 3: ${acts[2]}`, landing.fiveLineStory.what));
    out.push(label("Epilogue", landing.fiveLineStory.epilogue));
  }

  // ---- 2 Your presentation ----
  section(
    "Your presentation",
    landing
      ? "The talk from the first word to the last. The indented lines are for saying aloud."
      : "Your Big Idea and the three acts. Add interest and impact in StoryMachine to get the opening, the signposts and the ending."
  );
  out.push(h2("Your Big Idea"));
  out.push(spoken(story.bigIdea));
  out.push(h2("Your speech structure"));
  out.push(p(landing ? `Prologue, Act 1: ${acts[0]}, Act 2: ${acts[1]}, Act 3: ${acts[2]}, Epilogue.` : `Act 1: ${acts[0]}, Act 2: ${acts[1]}, Act 3: ${acts[2]}. The Prologue and Epilogue come with Stage 2.`));
  if (landing) {
    out.push(h2("Prologue"));
    out.push(p("The first 30 to 60 seconds, to grab your audience's attention. State the Big Idea, say why it matters now, and tell them what you need from them.", { italic: true, small: true }));
    out.push(spoken(landing.prologue));
    out.push(p(timing(landing.prologue), { small: true }));
  }
  const actKeys = ["why", "how", "what"] as const;
  const actJobs = [kind.act1, kind.act2, kind.act3];
  actKeys.forEach((key, i) => {
    const act = story[key];
    out.push(h2(`Act ${i + 1}: ${acts[i]}`));
    out.push(p(cap(isOther ? actJobs[i].replace(/^\w+:\s*/, "") : actJobs[i]), { italic: true, small: true }));
    if (landing) {
      out.push(p(`Your signpost that introduces Act ${i + 1}`, { bold: true }));
      out.push(spoken(landing[key].signpost));
    }
    out.push(label("Headline", act.headline));
    out.push(label("What it means", act.coreMessage));
    out.push(label(act.soundbite.source === "material" ? "Soundbite, from your notes" : "Soundbite, our suggestion. Put it in your own words", `“${act.soundbite.text}”`));
    if (act.supportingPoints.length) {
      out.push(p("Evidence: only what carries the point", { bold: true }));
      for (const pt of act.supportingPoints) out.push(bullet(pt));
    }
  });
  if (landing) {
    out.push(h2("End with certainty: your Epilogue"));
    out.push(p("Recap your headlines and the actions from here. Send them away with your message ringing in their ears.", { italic: true, small: true }));
    out.push(spoken(landing.epilogue));
    out.push(p(timing(landing.epilogue), { small: true }));
  }
  if (/\d/.test(JSON.stringify([story.why, story.how, story.what]))) {
    out.push(p("Every figure here comes from your material. Check each one against its source before you present.", { small: true }));
  }

  // ---- 3 Suggestions from StoryMachine ----
  section("Suggestions from StoryMachine", "This is a first draft. Here's how we think you can make the message even stronger.");
  out.push(h2(OWN_IT_TITLE));
  out.push(p(OWN_IT_LEAD, { italic: true }));
  for (const g of [...(landing ? landing.gaps : story.gaps), ...ownItAdvice(story, landing)]) out.push(bullet(g));
  if (landing && hasRhetoric(rhetoric)) {
    out.push(h2(RHETORIC_TITLE));
    out.push(p(RHETORIC_LEAD, { italic: true }));
    for (const s of rhetoric.suggestions) out.push(bullet(suggestionLine(s)));
  }

  if (landing) {
    // ---- 4 Speaker notes ----
    const notes = landing.speechNotes;
    const beats: Array<[string, string[]]> = [
      ["Prologue", notes.prologue],
      [`Act 1: ${acts[0]}`, notes.why],
      [`Act 2: ${acts[1]}`, notes.how],
      [`Act 3: ${acts[2]}`, notes.what],
      ["Epilogue", notes.epilogue],
    ];
    if (beats.some(([, c]) => c.length)) {
      section(
        "Speaker notes",
        "Story first, then slides, then rehearsal. Make your slides on the StoryMachine slides page, then rehearse from these notes. Speak from them, never from a script: each cue reminds you what comes next, and the words come from you in the room, so they sound like you."
      );
      for (const [name, cues] of beats) {
        out.push(h2(name));
        for (const c of cues) out.push(bullet(c));
      }
    }

    // ---- 5 Word for word ----
    section(
      "Word for word",
      "Read these aloud to hear whether they sound like you, and change any word that does not. If you must read on the day, read only the Prologue and the Epilogue. The acts are yours to tell."
    );
    for (const [name, text] of [
      ["Prologue", landing.prologue],
      [`Signpost into Act 1: ${acts[0]}`, landing.why.signpost],
      [`Signpost into Act 2: ${acts[1]}`, landing.how.signpost],
      [`Signpost into Act 3: ${acts[2]}`, landing.what.signpost],
      ["Epilogue", landing.epilogue],
    ] as const) {
      out.push(h2(name));
      out.push(p(text));
    }
  }

  // ---- How this was made ----
  section("How this was made", "The method behind your story.");
  for (const [name, text] of METHOD) {
    out.push(h2(name));
    out.push(p(text));
  }
  for (const para of LICENCE) out.push(p(para, { small: true }));
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
