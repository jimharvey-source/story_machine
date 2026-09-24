import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { z } from "zod";
import { currentProfile, signInRequired } from "@/lib/access";
import { LandingSchema, StorySchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const ExportSchema = z.object({
  title: z.string().max(160).default("My story"),
  story: StorySchema,
  landing: LandingSchema.nullable().default(null),
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
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safe}-story.pdf"`,
    },
  });
}

type Story = z.infer<typeof StorySchema>;
type Landing = z.infer<typeof LandingSchema>;

function render(title: string, story: Story, landing: Landing | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 64, bottom: 64, left: 60, right: 60 }, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const eyebrow = (t: string) => {
      doc.moveDown(0.6);
      doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(t.toUpperCase(), { characterSpacing: 1.6 });
      doc.moveDown(0.25);
    };
    const display = (t: string, size = 20) => {
      doc.font("Times-Roman").fontSize(size).fillColor(INK).text(t, { width: W, lineGap: 2 });
    };
    const body = (t: string, size = 10.5, colour = INK) => {
      doc.font("Helvetica").fontSize(size).fillColor(colour).text(t, { width: W, lineGap: 2.5 });
    };
    const spoken = (t: string) => {
      const x = doc.x;
      doc.font("Times-Roman").fontSize(16).fillColor(RED).text("“", x, doc.y, { continued: false });
      doc.moveUp(0.9);
      doc.font("Times-Italic").fontSize(11.5).fillColor(INK).text(t, x + 14, doc.y, { width: W - 14, lineGap: 3 });
      doc.x = x;
    };
    const rule = () => {
      doc.moveDown(0.8);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + W, doc.y).lineWidth(0.5).strokeColor(RULE).stroke();
      doc.moveDown(0.4);
    };
    const bullets = (items: string[]) => {
      for (const it of items) {
        const y = doc.y;
        doc.rect(doc.page.margins.left, y + 3, 1.5, 9).fillColor(RULE).fill();
        doc.font("Helvetica").fontSize(10).fillColor("#3d3a33").text(it, doc.page.margins.left + 12, y, { width: W - 12, lineGap: 2 });
        doc.x = doc.page.margins.left;
        doc.moveDown(0.3);
      }
    };

    // Page 1: the story
    doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text("JIM'S THREE ACT STORY MACHINE", { characterSpacing: 1.6 });
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(title);
    doc.moveDown(1.2);
    eyebrow("Big Idea");
    display(story.bigIdea, 26);
    rule();
    eyebrow("Audience");
    body(story.audience.who);
    body("They need to hear: " + story.audience.needToHear, 10, "#3d3a33");
    body("Leave out: " + story.audience.doNotNeedToHear, 10, "#3d3a33");
    eyebrow("Statement of intent");
    body(story.intent);
    eyebrow("The argument");
    body(story.argument);

    if (landing) {
      rule();
      eyebrow("Prologue, spoken, the golden minute");
      spoken(landing.prologue);
    }

    const acts: Array<[keyof Pick<Story, "why" | "how" | "what">, string]> = [
      ["why", "Act 1, Why, the hook"],
      ["how", "Act 2, How, the response"],
      ["what", "Act 3, What, the ask"],
    ];
    for (const [key, label] of acts) {
      const act = story[key];
      rule();
      eyebrow(label);
      display(act.headline, 16);
      doc.moveDown(0.3);
      body(act.coreMessage, 11);
      doc.moveDown(0.4);
      doc.font("Helvetica").fontSize(7.5).fillColor(act.soundbite.source === "material" ? RED : MUTED).text(
        act.soundbite.source === "material" ? "SOUNDBITE, FROM YOUR NOTES" : "SOUNDBITE, PROPOSED",
        { characterSpacing: 1.6 }
      );
      doc.font("Times-Roman").fontSize(13).fillColor(INK).text("“" + act.soundbite.text + "”", { width: W });
      doc.moveDown(0.5);
      bullets(act.supportingPoints);
      if (landing) {
        const land = landing[key];
        doc.moveDown(0.2);
        eyebrow("Signpost, spoken");
        spoken(land.signpost);
        doc.moveDown(0.3);
        eyebrow("Slide idea");
        body(land.visualIdea, 10, "#3d3a33");
      }
    }

    if (landing) {
      rule();
      eyebrow("Epilogue, spoken, end with certainty");
      spoken(landing.epilogue);
      rule();
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
        doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(k.toUpperCase(), doc.page.margins.left, y + 3, { width: 60, characterSpacing: 1.2 });
        doc.font("Times-Roman").fontSize(12).fillColor(INK).text(v, doc.page.margins.left + 66, y, { width: W - 66, lineGap: 2 });
        doc.x = doc.page.margins.left;
        doc.moveDown(0.4);
      }

      // Slide brief
      doc.addPage();
      doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text("SLIDE BRIEF", { characterSpacing: 1.6 });
      doc.moveDown(0.3);
      display("One idea per slide. The words carry the story; the slide reinforces it.", 15);
      doc.moveDown(0.6);
      body("Build the deck from this list, in this order. Each line gives the words on the slide, the picture, and the act it serves. Nothing else goes on the slide.", 10, "#3d3a33");
      const slides: Array<[string, string, string]> = [
        ["Title", story.bigIdea, "Prologue"],
        ...acts.map(([key, label]): [string, string, string] => [label.split(",")[0], landing[key].visualIdea, label]),
        ["Close", landing.fiveLineStory.epilogue, "Epilogue"],
      ];
      slides.forEach(([name, text, serves], i) => {
        rule();
        doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(`SLIDE ${i + 1}  ·  ${name.toUpperCase()}  ·  SERVES ${serves.toUpperCase()}`, { characterSpacing: 1.2 });
        doc.moveDown(0.3);
        body(text, 10.5);
      });
    }

    const gaps = landing ? landing.gaps : story.gaps;
    if (gaps.length) {
      rule();
      eyebrow("What only you can add");
      bullets(gaps);
    }

    // Footer on every page
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(
        `Jim's Three Act Story Machine  ·  The Message Business  ·  ${i + 1} of ${range.count}`,
        doc.page.margins.left,
        doc.page.height - 40,
        { width: W, align: "center" }
      );
    }
    doc.end();
  });
}
