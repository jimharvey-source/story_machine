import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { z } from "zod";
import { currentProfile, signInRequired } from "@/lib/access";
import { LandingInputSchema, StorySchema } from "@/lib/schema";
import { slideList, slidePrompt } from "@/lib/slides";

export const runtime = "nodejs";
export const maxDuration = 60;

const ExportSchema = z.object({
  title: z.string().max(160).default("My story"),
  story: StorySchema,
  landing: LandingInputSchema.nullable().default(null),
});

const INK = "#16140f";
const MUTED = "#7a766c";
const RED = "#b3261e";
const RULE = "#e6e2d8";

export async function POST(req: Request) {
  const p = await currentProfile();
  if (!p) return signInRequired();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }
  const parsed = ExportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const { title, story, landing } = parsed.data;

  const buf = await render(title, story, landing);
  const safe = title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "story";
  const name = `${safe}-${landing ? "stage-2-interest-and-impact" : "stage-1-story-straight"}.pdf`;
  console.log(JSON.stringify({ tag: "export", landed: Boolean(landing), bytes: buf.length, name }));
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}

type Story = z.infer<typeof StorySchema>;
type Landing = z.infer<typeof LandingInputSchema>;

function render(title: string, story: Story, landing: Landing | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 64, bottom: 64, left: 60, right: 60 },
      bufferPages: true,
      info: { Title: title, Author: "Jim's Three Act Story Machine", Subject: landing ? "Stage 2: Add interest and impact" : "Stage 1: Get your story straight" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const L = doc.page.margins.left;
    const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bottom = () => doc.page.height - doc.page.margins.bottom;

    // One vertical rhythm for the whole document: 6pt unit.
    const gap = (units: number) => {
      doc.y += units * 6;
    };
    // Start a new page when less than `need` points remain, so a section never splits at its heading.
    const keep = (need: number) => {
      if (doc.y + need > bottom()) doc.addPage();
    };
    const eyebrow = (t: string, colour = MUTED) => {
      doc.font("Helvetica").fontSize(7.5).fillColor(colour).text(t.toUpperCase(), L, doc.y, { characterSpacing: 1.6, width: W });
      gap(1);
    };
    const display = (t: string, size = 20) => {
      doc.font("Times-Roman").fontSize(size).fillColor(INK).text(t, L, doc.y, { width: W, lineGap: 2 });
    };
    const body = (t: string, size = 10.5, colour = INK) => {
      doc.font("Helvetica").fontSize(size).fillColor(colour).text(t, L, doc.y, { width: W, lineGap: 2.5 });
    };
    const spoken = (t: string) => {
      const y = doc.y;
      doc.font("Times-Roman").fontSize(18).fillColor(RED).text("“", L, y - 2, { lineBreak: false });
      doc.font("Times-Italic").fontSize(11.5).fillColor(INK).text(t, L + 16, y, { width: W - 16, lineGap: 3.5 });
      doc.x = L;
    };
    const rule = () => {
      gap(3);
      doc.moveTo(L, doc.y).lineTo(L + W, doc.y).lineWidth(0.5).strokeColor(RULE).stroke();
      gap(3);
    };
    const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
    // Spoken sections carry a length, because the golden minute is a minute.
    const timing = (t: string) => {
      const n = words(t);
      const secs = Math.round((n / 140) * 60);
      return `${n} words, about ${secs < 60 ? `${secs} seconds` : `${Math.round(secs / 60)} minute${secs >= 90 ? "s" : ""}`} spoken`;
    };
    const small = (t: string) => {
      gap(1);
      doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(t, L, doc.y, { width: W });
    };
    const bullets = (items: string[], size = 10, lineGap = 2, between = 1) => {
      for (const it of items) {
        const y = doc.y;
        doc.rect(L, y + 3, 1.5, size - 1).fillColor(RULE).fill();
        doc.font("Helvetica").fontSize(size).fillColor("#3d3a33").text(it, L + 12, y, { width: W - 12, lineGap });
        doc.x = L;
        gap(between);
      }
    };
    const pageTitle = (kicker: string, t: string, intro?: string) => {
      eyebrow(kicker);
      display(t, 18);
      if (intro) {
        gap(2);
        body(intro, 10, "#3d3a33");
      }
      gap(3);
    };

    // 1. The story
    eyebrow("Jim's Three Act Story Machine");
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(
      `${landing ? "Stage 2: Add interest and impact" : "Stage 1: Get your story straight"}  ·  ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
      L,
      doc.y,
      { width: W }
    );
    gap(6);
    eyebrow("Big Idea");
    display(story.bigIdea, 26);
    rule();
    eyebrow("Audience");
    body(story.audience.who);
    gap(1);
    body("They need to hear: " + story.audience.needToHear, 10, "#3d3a33");
    gap(1);
    body("Leave out: " + story.audience.doNotNeedToHear, 10, "#3d3a33");
    gap(3);
    eyebrow("Statement of intent");
    body(story.intent);
    gap(3);
    eyebrow("The argument");
    body(story.argument);

    if (landing) {
      rule();
      keep(170);
      eyebrow("Prologue, spoken, the golden minute");
      spoken(landing.prologue);
      small(timing(landing.prologue));
    }

    const acts: Array<[keyof Pick<Story, "why" | "how" | "what">, string]> = [
      ["why", "Act 1, Why, the hook"],
      ["how", "Act 2, How, the response"],
      ["what", "Act 3, What, the ask"],
    ];
    for (const [key, label] of acts) {
      const act = story[key];
      rule();
      keep(landing ? 240 : 200);
      eyebrow(label);
      display(act.headline, 16);
      gap(2);
      body(act.coreMessage, 11);
      gap(3);
      eyebrow(act.soundbite.source === "material" ? "Soundbite, from your notes" : "Soundbite, proposed", act.soundbite.source === "material" ? RED : MUTED);
      doc.font("Times-Roman").fontSize(13).fillColor(INK).text("“" + act.soundbite.text + "”", L, doc.y, { width: W });
      gap(3);
      bullets(act.supportingPoints);
      if (landing) {
        const land = landing[key];
        gap(2);
        keep(70);
        eyebrow("Signpost, spoken");
        spoken(land.signpost);
        gap(3);
        eyebrow("Slide idea");
        body(land.visualIdea, 10, "#3d3a33");
      }
    }

    if (landing) {
      rule();
      keep(170);
      eyebrow("Epilogue, spoken, end with certainty");
      spoken(landing.epilogue);
      small(timing(landing.epilogue));
      rule();
      keep(150);
      eyebrow("The story in five lines");
      const lines: Array<[string, string]> = [
        ["Prologue", landing.fiveLineStory.prologue],
        ["Why", landing.fiveLineStory.why],
        ["How", landing.fiveLineStory.how],
        ["What", landing.fiveLineStory.what],
        ["Epilogue", landing.fiveLineStory.epilogue],
      ];
      for (const [k, v] of lines) {
        const y = doc.y;
        doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(k.toUpperCase(), L, y + 3, { width: 60, characterSpacing: 1.2 });
        doc.font("Times-Roman").fontSize(12).fillColor(INK).text(v, L + 66, y, { width: W - 66, lineGap: 2 });
        doc.x = L;
        gap(2);
      }
      if (landing.gaps.length) {
        rule();
        keep(90);
        eyebrow("Before you rehearse: what only you can add");
        bullets(landing.gaps);
      }

      // 2. Speech notes: what the presenter holds in the room
      const notes = landing.speechNotes;
      const beats: Array<[string, string[], string]> = [
        ["Prologue", notes.prologue, "the golden minute"],
        ["Act 1, Why", notes.why, story.why.headline],
        ["Act 2, How", notes.how, story.how.headline],
        ["Act 3, What", notes.what, story.what.headline],
        ["Epilogue", notes.epilogue, "end with certainty"],
      ];
      const hasNotes = beats.some(([, cues]) => cues.length > 0);
      if (hasNotes) {
        doc.addPage();
        pageTitle(
          "Speech notes",
          "Speak from these. Never from a script.",
          "One cue per line, in the order you say them. A cue reminds you what comes next; the words come from you in the room, so they sound like you. Word for word is for legal and political speeches, where every word will be quoted. For everything else, notes."
        );
        for (const [name, cues, sub] of beats) {
          keep(110);
          gap(2);
          doc.font("Helvetica").fontSize(7.5).fillColor(RED).text(name.toUpperCase(), L, doc.y, { characterSpacing: 1.6, width: W, continued: true });
          doc.fillColor(MUTED).text("   " + sub, { characterSpacing: 0 });
          gap(2);
          for (const cue of cues) {
            const y = doc.y;
            doc.rect(L, y + 6, 2, 10).fillColor(RED).fill();
            doc.font("Times-Roman").fontSize(14).fillColor(INK).text(cue, L + 16, y, { width: W - 16, lineGap: 4 });
            doc.x = L;
            gap(2.5);
          }
          gap(2);
        }
      }

      // 3. Word for word: the spoken parts in full, for those who need them
      doc.addPage();
      pageTitle(
        "Word for word",
        "The spoken parts in full.",
        "Use this page to rehearse, and to hear whether the words sound like you. Change any that do not. If you must read, read only the Prologue and the Epilogue; the acts are yours to tell."
      );
      const script: Array<[string, string]> = [
        ["Prologue", landing.prologue],
        ["Signpost into Act 1", landing.why.signpost],
        ["Signpost into Act 2", landing.how.signpost],
        ["Signpost into Act 3", landing.what.signpost],
        ["Epilogue", landing.epilogue],
      ];
      for (const [name, text] of script) {
        keep(90);
        gap(2);
        eyebrow(name, RED);
        doc.font("Times-Roman").fontSize(13).fillColor(INK).text(text, L, doc.y, { width: W, lineGap: 9 });
        gap(2);
      }

      // 4. Slide brief
      doc.addPage();
      pageTitle(
        "Slide brief",
        "One idea per slide. The words carry the story; the slide reinforces it.",
        "Build the deck from this list, in this order. Each line gives the words on the slide, the picture, and the act it serves. Nothing else goes on the slide."
      );
      const slides = slideList(story, landing);
      slides.forEach(([name, text, serves], i) => {
        keep(60);
        rule();
        doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(`SLIDE ${i + 1}  ·  ${name.toUpperCase()}  ·  SERVES ${serves.toUpperCase()}`, L, doc.y, { characterSpacing: 1.2, width: W });
        gap(1.5);
        body(text, 10.5);
      });

      // 5. A prompt for the presenter's own AI tool
      doc.addPage();
      pageTitle(
        "Make the slides with your own AI tool",
        "Copy the prompt below into the AI tool you use for slides.",
        "It carries our rules for slides and your slide brief. The tool will give you a plain, television-quality deck: one idea per slide, big words, one picture. Add the build animations in your slide software afterwards, one item at a time."
      );
      const prompt = slidePrompt(story, landing, slides);
      const boxTop = doc.y;
      doc.font("Courier").fontSize(8.5).fillColor(INK).text(prompt, L + 10, boxTop + 10, { width: W - 20, lineGap: 2 });
      const boxBottom = doc.y + 10;
      // Draw the frame after the text so page breaks inside the text are handled by pdfkit.
      if (boxBottom > boxTop) {
        doc.rect(L, boxTop, W, Math.min(boxBottom, bottom()) - boxTop).lineWidth(0.5).strokeColor(RULE).stroke();
      }
      doc.x = L;
      doc.y = boxBottom + 6;
    }

    if (!landing && story.gaps.length) {
      rule();
      keep(90);
      eyebrow("What only you can add");
      bullets(story.gaps);
    }

    // 6. How this was made
    doc.addPage();
    pageTitle("How this was made", "The method behind your story.");
    const method: Array<[string, string]> = [
      ["Understand the audience", "Every story starts with who is listening: what they need to hear, and what they do not. A message that is right for everyone lands with no one."],
      ["State your intent", "One sentence: after my presentation, the audience will... If you cannot finish it, you are not ready to present."],
      ["Clarify the argument", "The case in one sentence, in your words, that a sceptic could test. The Big Idea is the memorable form of it: the line people repeat in the corridor."],
      ["Build a three-act story", "Why: the problem, and why it matters now. How: the insight or the answer. What: the ask. Each act has a headline that says the point, a soundbite worth quoting, and only the evidence that carries the point."],
      ["Make it land", "A Prologue that earns attention in the first sentence and states the idea inside a minute. A signpost into each act so the audience knows the important thing has arrived. One slide per act that illustrates rather than explains."],
      ["End with certainty", "Audiences need certainty. End by recapping your headlines and the actions from here. Send them away with the message ringing in their ears."],
      ["Then the slides, last", "Slides come after the story, so every one has a job to do. Few, simple, one idea each."],
    ];
    for (const [name, text] of method) {
      keep(50);
      gap(1);
      doc.font("Times-Roman").fontSize(12.5).fillColor(INK).text(name, L, doc.y, { width: W });
      gap(0.5);
      body(text, 10, "#3d3a33");
      gap(2);
    }
    rule();
    body(
      "The story in this document is yours: your material, your conviction, your words. The method that shaped it, the three-act structure, the Prologue and Epilogue, the tests each part has to pass, is the intellectual property of The Message Business and is licensed to you for your own presentations. Teach it to your team with our training, or use the Story Machine as many times as you need.",
      9.5,
      "#3d3a33"
    );
    gap(2);
    body("Jim Harvey  ·  The Message Business  ·  themessagebusiness.com  ·  presentation-guru.com", 9, MUTED);

    // Footer on every page. Writing inside the bottom margin makes pdfkit add a blank page
    // after each one, so the margin is lifted while the footer goes in.
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const saved = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(
        `Jim's Three Act Story Machine  ·  The Message Business  ·  ${i + 1} of ${range.count}`,
        L,
        doc.page.height - 40,
        { width: W, align: "center", lineBreak: false }
      );
      doc.page.margins.bottom = saved;
    }
    doc.end();
  });
}
