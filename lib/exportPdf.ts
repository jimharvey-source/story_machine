import { readFileSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { z } from "zod";
import type { LandingInputSchema, Rhetoric, StoryInputSchema } from "./schema";
import { RHETORIC_LEAD, RHETORIC_TITLE, hasRhetoric, pathLabel } from "./rhetoric";
import { OWN_IT_LEAD, ownItAdvice } from "./ownIt";
import { KINDS, kindOf } from "./kinds";
import { LICENCE, METHOD, SIGN_OFF } from "./method";

// The story PDF, redesigned 21 October 2026 (Jim's notes on the PDF of "Trust is the real deliverable.").
// Page 1 says what the document is and how to use it, with a contents list that links to each section.
// Then: 1 Your audience and your argument; 2 Your presentation; 3 Suggestions from StoryMachine;
// 4 Speaker notes; 5 Word for word; 6 How this was made. Story, slides, rehearsal: the slides are made on the
// slides page, so the PDF sends people there before the speaker notes.
// Type follows the design system: Instrument Sans for everything written, Fraunces for words said aloud.

type Story = z.infer<typeof StoryInputSchema>;
type Landing = z.infer<typeof LandingInputSchema>;

const INK = "#16140f";
const INK2 = "#3d3a33";
const MUTED = "#7a766c";
const RED = "#b3261e";
const RULE = "#e6e2d8";
const PANEL = "#f3f1ed";
const RED_SOFT = "#f8ecea";

// Font roles. If the brand fonts cannot be read, the PDF falls back to the built-in fonts rather than failing.
const F = { sans: "Helvetica", bold: "Helvetica-Bold", said: "Times-Roman", display: "Times-Roman" };
let fontData: Record<keyof typeof F, Buffer> | null | undefined;
function loadFonts(): Record<keyof typeof F, Buffer> | null {
  if (fontData !== undefined) return fontData;
  try {
    const dir = path.join(process.cwd(), "lib", "fonts");
    fontData = {
      sans: readFileSync(path.join(dir, "InstrumentSans-Regular.ttf")),
      bold: readFileSync(path.join(dir, "InstrumentSans-SemiBold.ttf")),
      said: readFileSync(path.join(dir, "Fraunces-Text.ttf")),
      display: readFileSync(path.join(dir, "Fraunces-Display.ttf")),
    };
  } catch (e) {
    console.warn("[exportPdf] brand fonts not found, using built-in fonts", e instanceof Error ? e.message : e);
    fontData = null;
  }
  return fontData;
}

type Section = { id: string; title: string; about: string; page: number };

export function renderPdf(title: string, story: Story, landing: Landing | null, rhetoric: Rhetoric | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 54, bottom: 66, left: 64, right: 64 },
      bufferPages: true,
      autoFirstPage: true,
      info: { Title: title, Author: "Jim Harvey's StoryMachine", Subject: "Your presentation story" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const fonts = loadFonts();
    const font = { ...F };
    if (fonts) {
      doc.registerFont("SM-Sans", fonts.sans);
      doc.registerFont("SM-Bold", fonts.bold);
      doc.registerFont("SM-Said", fonts.said);
      doc.registerFont("SM-Display", fonts.display);
      Object.assign(font, { sans: "SM-Sans", bold: "SM-Bold", said: "SM-Said", display: "SM-Display" });
    }

    const L = doc.page.margins.left;
    const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bottom = () => doc.page.height - doc.page.margins.bottom;
    const gap = (pt: number) => {
      doc.y += pt;
    };
    const keep = (need: number) => {
      if (doc.y + need > bottom()) doc.addPage();
    };
    const pageIndex = () => doc.bufferedPageRange().start + doc.bufferedPageRange().count - 1;

    const kind = KINDS[kindOf(story.kind)];
    const acts = kind.acts;
    const isOther = kindOf(story.kind) === "other";
    const dateLine = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    // ---- Building blocks ----
    const text = (t: string, f: string, size: number, colour = INK, opts: PDFKit.Mixins.TextOptions = {}, x = L, w = W) => {
      doc.font(f).fontSize(size).fillColor(colour).text(t, x, doc.y, { width: w, lineGap: size * 0.3, ...opts });
      doc.x = L;
    };
    const heightOf = (t: string, f: string, size: number, w = W) => {
      doc.font(f).fontSize(size);
      return doc.heightOfString(t, { width: w, lineGap: size * 0.3 });
    };
    const label = (t: string, colour = MUTED) => {
      text(t, font.bold, 8.5, colour);
      gap(3);
    };

    const sections: Section[] = [];
    let sectionNo = 0;
    // A section opens on a new page with its number, a large title and one line on what it is for.
    const openSection = (id: string, sectionTitle: string, about: string, intro?: string) => {
      doc.addPage();
      sectionNo += 1;
      sections.push({ id, title: sectionTitle, about, page: pageIndex() });
      doc.addNamedDestination(id);
      doc.outline.addItem(`${sectionNo}  ${sectionTitle}`);
      text(`Section ${sectionNo}`, font.bold, 9, RED);
      gap(4);
      text(sectionTitle, font.bold, 24, INK);
      gap(6);
      doc.rect(L, doc.y, 36, 2.5).fillColor(RED).fill();
      gap(14);
      if (intro) {
        text(intro, font.sans, 11, INK2);
        gap(18);
      }
    };
    // A heading inside a section, with an optional line on what the part is for.
    const subhead = (t: string, about?: string, need = 70) => {
      keep(need);
      text(t, font.bold, 14, INK);
      if (about) {
        gap(2);
        text(about, font.sans, 9.5, MUTED);
      }
      gap(8);
    };
    const thinRule = () => {
      gap(10);
      doc.moveTo(L, doc.y).lineTo(L + W, doc.y).lineWidth(0.5).strokeColor(RULE).stroke();
      gap(14);
    };
    // Label on the left, words on the right: for the audience analysis and the five lines.
    const row = (k: string, v: string, f = font.sans, size = 10.5) => {
      const lw = 118;
      const h = Math.max(heightOf(v, f, size, W - lw), 12);
      keep(h + 8);
      const y = doc.y;
      doc.font(font.bold).fontSize(8.5).fillColor(MUTED).text(k, L, y + 2, { width: lw - 12 });
      doc.font(f).fontSize(size).fillColor(INK).text(v, L + lw, y, { width: W - lw, lineGap: size * 0.3 });
      doc.x = L;
      doc.y = Math.max(doc.y, y + h) + 8;
    };
    // Words to be said aloud: Fraunces, with Jim's red opening quote as the mark.
    const said = (t: string, size = 12.5) => {
      const h = heightOf(t, font.said, size, W - 20);
      keep(Math.min(h + 10, 220));
      const y = doc.y;
      doc.font(font.display).fontSize(size * 1.9).fillColor(RED).text("“", L - 2, y - size * 0.35, { lineBreak: false });
      doc.font(font.said).fontSize(size).fillColor(INK).text(t, L + 20, y, { width: W - 20, lineGap: size * 0.42 });
      doc.x = L;
    };
    const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
    const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
    const timing = (t: string) => {
      const n = words(t);
      const secs = Math.round((n / 140) * 60);
      return `${n} words, about ${secs < 60 ? `${secs} seconds` : `${Math.round(secs / 60)} minute${secs >= 90 ? "s" : ""}`} spoken`;
    };
    const small = (t: string, colour = MUTED) => {
      gap(4);
      text(t, font.sans, 8.5, colour, {}, L + 20, W - 20);
    };
    const bullets = (items: string[], size = 10, colour = INK2, x = L, w = W, mark = RULE) => {
      for (const it of items) {
        keep(heightOf(it, font.sans, size, w - 14) + 6);
        const y = doc.y;
        doc.rect(x, y + 3, 2, size - 1).fillColor(mark).fill();
        doc.font(font.sans).fontSize(size).fillColor(colour).text(it, x + 14, y, { width: w - 14, lineGap: size * 0.3 });
        doc.x = L;
        gap(6);
      }
    };
    // Background boxes need to be drawn before their text. This helper measures a block of rows first.
    const box = (height: number, fill: string, stroke?: string) => {
      const top = doc.y;
      doc.save();
      doc.roundedRect(L - 14, top, W + 28, height, 6).fillColor(fill).fill();
      if (stroke) doc.roundedRect(L - 14, top, W + 28, height, 6).lineWidth(0.75).strokeColor(stroke).stroke();
      doc.restore();
      return top;
    };

    // ---- Page 1 is reserved for the cover and contents, written last when the page numbers are known. ----

    // ---- Section 1: Your audience and your argument ----
    openSection(
      "audience",
      "Your audience and your argument",
      "Who you are talking to, what you want them to do, and your case in one sentence.",
      "These are the foundations of your story. Check them first. If any of them is wrong, change it in StoryMachine and find your story again: everything else is built on them."
    );
    subhead("Your audience analysis", "Who is in the room, and what they need from you.");
    row("Who they are", story.audience.who);
    if (story.hero?.wants) row("What they want", story.hero.wants);
    if (story.hero?.obstacle) row("What stands in the way", story.hero.obstacle);
    row("What they need to hear", story.audience.needToHear);
    row("What to leave out", story.audience.doNotNeedToHear);
    thinRule();
    subhead("What you want your presentation to do", "Your statement of intent: what the audience will do as a result.");
    text(story.intent, font.sans, 11.5, INK);
    thinRule();
    subhead("Your argument", "Your case in one sentence. Everything in the three acts supports it.");
    text(story.argument, font.sans, 11.5, INK);
    if (landing) {
      thinRule();
      const five = [landing.fiveLineStory.prologue, landing.fiveLineStory.why, landing.fiveLineStory.how, landing.fiveLineStory.what, landing.fiveLineStory.epilogue];
      subhead("Your story in five lines", "The whole talk in 30 seconds. If it works here, it will work in the room.", 50 + five.reduce((n, t) => n + heightOf(t, font.said, 11.5, W - 118) + 8, 0));
      row("Prologue", landing.fiveLineStory.prologue, font.said, 11.5);
      row(`Act 1: ${acts[0]}`, landing.fiveLineStory.why, font.said, 11.5);
      row(`Act 2: ${acts[1]}`, landing.fiveLineStory.how, font.said, 11.5);
      row(`Act 3: ${acts[2]}`, landing.fiveLineStory.what, font.said, 11.5);
      row("Epilogue", landing.fiveLineStory.epilogue, font.said, 11.5);
    }

    // ---- Section 2: Your presentation ----
    openSection(
      "presentation",
      "Your presentation",
      "Your Big Idea and the talk itself: Prologue, three acts and Epilogue.",
      landing
        ? "The talk from the first word to the last. Words set in this typeface are for saying aloud."
        : "Your Big Idea and the three acts. Add interest and impact in StoryMachine to get the opening, the signposts and the ending."
    );
    subhead("Your Big Idea", "The one line people repeat in the corridor afterwards. Your whole presentation rests on it.");
    text(story.bigIdea, font.display, 24, INK, { lineGap: 4 });
    gap(18);

    // The speech structure: five boxes, each a link to its part.
    const parts: Array<[string, string, string]> = [
      ["Prologue", landing ? "The first minute" : "Opening", "prologue"],
      [`Act 1`, acts[0], "act1"],
      [`Act 2`, acts[1], "act2"],
      [`Act 3`, acts[2], "act3"],
      ["Epilogue", "End with certainty", "epilogue"],
    ];
    subhead("Your speech structure", landing ? "Five parts. Click any box to go to it." : "Three acts. The Prologue and Epilogue come with Stage 2.", 110);
    {
      const bw = (W - 4 * 6) / 5;
      const top = doc.y;
      parts.forEach(([a, b, id], i) => {
        const x = L + i * (bw + 6);
        const live = landing || id.startsWith("act");
        doc.roundedRect(x, top, bw, 50, 5).fillColor(i === 0 || i === 4 ? RED_SOFT : PANEL).fill();
        doc.font(font.bold).fontSize(9).fillColor(i === 0 || i === 4 ? RED : INK).text(a, x + 8, top + 9, { width: bw - 16 });
        doc.font(font.sans).fontSize(8.5).fillColor(INK2).text(b, x + 8, top + 23, { width: bw - 16, lineGap: 1 });
        if (live) doc.goTo(x, top, bw, 50, id);
      });
      doc.x = L;
      doc.y = top + 50 + 22;
    }

    // A part heading never sits alone at the foot of a page: it keeps the start of what follows with it.
    const partHead = (id: string, name: string, about: string, next = 60) => {
      keep(70 + Math.min(next, 320));
      doc.addNamedDestination(id);
      thinRule();
      text(name, font.bold, 16, INK);
      gap(3);
      text(about, font.sans, 9.5, MUTED);
      gap(12);
    };

    if (landing) {
      partHead("prologue", "Prologue", "The first 30 to 60 seconds, to grab your audience's attention. State the Big Idea, say why it matters now, and tell them what you need from them.", heightOf(landing.prologue, font.said, 12.5, W - 20) + 20);
      said(landing.prologue);
      small(timing(landing.prologue));
      gap(6);
    }

    const actKeys = ["why", "how", "what"] as const;
    const actJobs = [kind.act1, kind.act2, kind.act3];
    actKeys.forEach((key, i) => {
      const act = story[key];
      partHead(
        `act${i + 1}`,
        `Act ${i + 1}: ${acts[i]}`,
        cap(isOther ? actJobs[i].replace(/^\w+:\s*/, "") : actJobs[i]),
        (landing ? heightOf(landing[key].signpost, font.said, 11.5, W - 20) + 30 : 0) + heightOf(act.headline, font.bold, 13.5) + 30
      );
      if (landing) {
        label(`Your signpost that introduces Act ${i + 1}`, RED);
        said(landing[key].signpost, 11.5);
        gap(12);
      }
      keep(heightOf(act.headline, font.bold, 13.5) + 20);
      label("Headline");
      text(act.headline, font.bold, 13.5, INK);
      gap(10);
      keep(heightOf(act.coreMessage, font.sans, 10.5) + 20);
      label("What it means");
      text(act.coreMessage, font.sans, 10.5, INK);
      gap(10);
      keep(60);
      const fromNotes = act.soundbite.source === "material";
      label(fromNotes ? "Soundbite: from your notes" : "Soundbite: our suggestion. Put it in your own words.", fromNotes ? RED : MUTED);
      text(`“${act.soundbite.text}”`, font.said, 13, INK);
      gap(10);
      if (act.supportingPoints.length) {
        keep(50);
        label("Evidence: only what carries the point");
        bullets(act.supportingPoints);
      }
    });

    if (landing) {
      partHead("epilogue", "End with certainty: your Epilogue", "Recap your headlines and the actions from here. Send them away with your message ringing in their ears.", heightOf(landing.epilogue, font.said, 12.5, W - 20) + 20);
      said(landing.epilogue);
      small(timing(landing.epilogue));
    }
    const hasFigures = /\d/.test(JSON.stringify([story.why, story.how, story.what]));
    if (hasFigures) {
      gap(14);
      keep(30);
      text("Every figure here comes from your material. Check each one against its source before you present.", font.sans, 8.5, MUTED);
    }

    // ---- Section 3: Suggestions from StoryMachine ----
    openSection(
      "suggestions",
      "Suggestions from StoryMachine",
      "How to make the first draft stronger, and make it your own.",
      "This is a first draft. Here's how we think you can make the message even stronger."
    );
    const ownIt = [...(landing ? landing.gaps : story.gaps), ...ownItAdvice(story, landing)];
    subhead("Make it your own", OWN_IT_LEAD, 120);
    // A tick box beside each one, for the printed copy.
    for (const it of ownIt) {
      const h = heightOf(it, font.sans, 10.5, W - 26);
      keep(h + 10);
      const y = doc.y;
      doc.roundedRect(L, y + 1.5, 10, 10, 2).lineWidth(0.9).strokeColor(RED).stroke();
      doc.font(font.sans).fontSize(10.5).fillColor(INK).text(it, L + 22, y, { width: W - 22, lineGap: 3 });
      doc.x = L;
      gap(9);
    }

    if (landing && hasRhetoric(rhetoric)) {
      thinRule();
      subhead(RHETORIC_TITLE, RHETORIC_LEAD, 140);
      const where = (p?: string, w?: string) => pathLabel(p, story.kind) || w || "";
      for (const s of rhetoric.suggestions) {
        const what = `${s.device}. ${s.what ?? ""}`.trim();
        keep(heightOf(s.better, font.said, 11.5, W - 12) + heightOf(what, font.sans, 9.5, W - 12) + 56);
        const y0 = doc.y;
        text(where(s.path, s.where), font.bold, 9, MUTED, {}, L + 12, W - 12);
        gap(4);
        text("For example, you could say this:", font.sans, 9.5, INK2, {}, L + 12, W - 12);
        gap(3);
        text(`“${s.better}”`, font.said, 11.5, INK, {}, L + 12, W - 12);
        gap(4);
        doc.font(font.bold).fontSize(9.5).fillColor(INK).text(`${s.device}.`, L + 12, doc.y, { width: W - 12, continued: true, lineGap: 3 });
        doc.font(font.sans).fillColor(INK2).text(` ${s.what ?? ""}`);
        doc.x = L;
        doc.rect(L, y0, 2, doc.y - y0).fillColor(RED).fill();
        gap(12);
      }
      text("To use a line, edit it into your story in StoryMachine, or press Use this line under it.", font.sans, 8.5, MUTED);
    }

    if (landing) {
      // ---- Section 4: Speaker notes ----
      const notes = landing.speechNotes;
      const beats: Array<[string, string[], string]> = [
        ["Prologue", notes.prologue, "The first minute"],
        [`Act 1: ${acts[0]}`, notes.why, story.why.headline],
        [`Act 2: ${acts[1]}`, notes.how, story.how.headline],
        [`Act 3: ${acts[2]}`, notes.what, story.what.headline],
        ["Epilogue", notes.epilogue, "End with certainty"],
      ];
      if (beats.some(([, cues]) => cues.length > 0)) {
        openSection(
          "notes",
          "Speaker notes",
          "The cues to rehearse from, once your slides are made.",
          "Story first, then slides, then rehearsal. Make your slides on the StoryMachine slides page, then rehearse from these notes. Speak from them, never from a script: each cue reminds you what comes next, and the words come from you in the room, so they sound like you."
        );
        for (const [name, cues, sub] of beats) {
          keep(40 + cues.length * 24);
          text(name, font.bold, 12, RED);
          gap(2);
          text(sub, font.sans, 9, MUTED);
          gap(8);
          for (const cue of cues) {
            keep(24);
            const y = doc.y;
            doc.rect(L, y + 4, 2, 11).fillColor(RED).fill();
            doc.font(font.said).fontSize(13).fillColor(INK).text(cue, L + 14, y, { width: W - 14, lineGap: 4 });
            doc.x = L;
            gap(7);
          }
          gap(14);
        }
      }

      // ---- Section 5: Word for word ----
      openSection(
        "words",
        "Word for word",
        "The spoken parts in full, for rehearsal.",
        "Read these aloud to hear whether they sound like you, and change any word that does not. If you must read on the day, read only the Prologue and the Epilogue. The acts are yours to tell."
      );
      const script: Array<[string, string]> = [
        ["Prologue", landing.prologue],
        [`Signpost into Act 1: ${acts[0]}`, landing.why.signpost],
        [`Signpost into Act 2: ${acts[1]}`, landing.how.signpost],
        [`Signpost into Act 3: ${acts[2]}`, landing.what.signpost],
        ["Epilogue", landing.epilogue],
      ];
      for (const [name, t] of script) {
        // Keep each spoken block on one page: a two-line orphan on a fresh page is no use in rehearsal.
        doc.font(font.said).fontSize(13);
        keep(Math.min(doc.heightOfString(t, { width: W, lineGap: 7 }) + 34, bottom() - 80));
        text(name, font.bold, 10, RED);
        gap(5);
        doc.font(font.said).fontSize(13).fillColor(INK).text(t, L, doc.y, { width: W, lineGap: 7 });
        doc.x = L;
        gap(18);
      }
    }

    // ---- Section 6: How this was made ----
    openSection("method", "How this was made", "The method behind your story.");
    for (const [name, t] of METHOD) {
      keep(50);
      text(name, font.bold, 11, INK);
      gap(2);
      text(t, font.sans, 9.5, INK2);
      gap(9);
    }
    thinRule();
    LICENCE.forEach((para, i) => {
      if (i) gap(6);
      text(para, font.sans, 9.5, INK2);
    });
    gap(10);
    text(SIGN_OFF, font.sans, 8.5, MUTED);

    // ---- Page 1: what this is, how to use it, and the contents ----
    doc.switchToPage(0);
    doc.addNamedDestination("contents");
    doc.x = L;
    doc.y = doc.page.margins.top;
    // The lockup: red opening quote and the name.
    {
      const y = doc.y;
      doc.font(font.display).fontSize(30).fillColor(RED).text("“", L - 1, y - 4, { lineBreak: false });
      doc.font(font.sans).fontSize(7.5).fillColor(MUTED).text("Jim Harvey's", L + 22, y + 1, { lineBreak: false });
      doc.font(font.bold).fontSize(15).fillColor(INK).text("StoryMachine", L + 22, y + 10, { lineBreak: false });
      doc.font(font.sans).fontSize(9).fillColor(MUTED).text(dateLine, L, y + 13, { width: W, align: "right", lineBreak: false });
      doc.x = L;
      doc.y = y + 50;
    }
    text("Your presentation story", font.bold, 10, RED);
    gap(6);
    text(story.bigIdea, font.display, 28, INK, { lineGap: 4 });
    gap(8);
    text(
      isOther ? `A story in three acts: ${acts.join(", ")}.` : `${kind.label}, in three acts: ${acts.join(", ")}.`,
      font.sans,
      10.5,
      MUTED
    );
    gap(22);

    // What is in it and how to use it, in a shaded box.
    {
      const what =
        "This is the first draft of your presentation story, built by StoryMachine from your notes and your answers. It holds everything you need to finish the story, make your slides and rehearse.";
      const steps: Array<[string, string]> = [
        ["Check the foundations.", "Section 1 sets out your audience and your argument. If either is wrong, everything built on it will be too."],
        ["Read the talk out loud.", "Section 2 is your presentation, from the first word to the last."],
        ["Make it yours.", "Section 3 has StoryMachine's suggestions. Add the examples only you have, and put any proposed line in your own words."],
        landing
          ? ["Make your slides, then rehearse.", "Build your slides from the StoryMachine slides page, then rehearse from the speaker notes in section 4."]
          : ["Add interest and impact.", "Finish the story in StoryMachine to get your opening, signposts, ending and speaker notes."],
      ];
      const inner = W - 8;
      let h = 14 + heightOf("What is in this document", font.bold, 11, inner) + 4 + heightOf(what, font.sans, 10, inner) + 12;
      h += heightOf("How to use it", font.bold, 11, inner) + 6;
      for (const [a, b] of steps) h += heightOf(`${a} ${b}`, font.sans, 10, inner - 22) + 7;
      h += 8;
      box(h, PANEL);
      gap(14);
      text("What is in this document", font.bold, 11, INK, {}, L + 4, inner);
      gap(4);
      text(what, font.sans, 10, INK2, {}, L + 4, inner);
      gap(12);
      text("How to use it", font.bold, 11, INK, {}, L + 4, inner);
      gap(6);
      steps.forEach(([a, b], i) => {
        const y = doc.y;
        doc.circle(L + 11, y + 6, 7).fillColor(RED).fill();
        doc.font(font.bold).fontSize(8).fillColor("#ffffff").text(String(i + 1), L + 4, y + 2.5, { width: 14, align: "center" });
        doc.font(font.bold).fontSize(10).fillColor(INK).text(a + " ", L + 26, y, { width: inner - 22, continued: true, lineGap: 3 });
        doc.font(font.sans).fillColor(INK2).text(b);
        doc.x = L;
        gap(7);
      });
      gap(16);
    }

    // The contents: each line is a link.
    text("Contents", font.bold, 14, INK);
    gap(3);
    text("Click a section to go straight to it. Every page has a link back here.", font.sans, 9, MUTED);
    gap(10);
    sections.forEach((s, i) => {
      const y = doc.y;
      doc.moveTo(L, y).lineTo(L + W, y).lineWidth(0.5).strokeColor(RULE).stroke();
      const top = y + 8;
      doc.font(font.bold).fontSize(11).fillColor(RED).text(String(i + 1), L, top, { width: 18 });
      doc.font(font.bold).fontSize(11).fillColor(INK).text(s.title, L + 22, top, { width: W - 80 });
      doc.font(font.sans).fontSize(9).fillColor(MUTED).text(s.about, L + 22, doc.y + 1, { width: W - 80 });
      const end = doc.y + 8;
      doc.font(font.sans).fontSize(10).fillColor(INK).text(`page ${s.page + 1}`, L + W - 56, top, { width: 56, align: "right" });
      doc.goTo(L, y, W, end - y, s.id);
      doc.x = L;
      doc.y = end;
    });
    doc.moveTo(L, doc.y).lineTo(L + W, doc.y).lineWidth(0.5).strokeColor(RULE).stroke();

    // Footer on every page, with a link back to the contents. Writing inside the bottom margin makes pdfkit
    // add a page, so the margin is lifted while the footer goes in.
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const saved = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const y = doc.page.height - 42;
      doc.moveTo(L, y - 8).lineTo(L + W, y - 8).lineWidth(0.5).strokeColor(RULE).stroke();
      doc.font(font.sans).fontSize(7.5).fillColor(MUTED).text(`Jim Harvey's StoryMachine  ·  ${title}`, L, y, { width: W * 0.62, lineBreak: false, ellipsis: true, height: 10 });
      if (i > range.start) {
        doc.font(font.bold).fontSize(7.5).fillColor(RED).text("Contents", L + W - 110, y, { width: 50, align: "right", lineBreak: false });
        doc.goTo(L + W - 110, y - 3, 50, 14, "contents");
      }
      doc.font(font.sans).fontSize(7.5).fillColor(MUTED).text(`${i + 1} of ${range.count}`, L + W - 52, y, { width: 52, align: "right", lineBreak: false });
      doc.page.margins.bottom = saved;
    }
    doc.end();
  });
}
