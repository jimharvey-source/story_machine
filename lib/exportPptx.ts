// The slide text as a PowerPoint file, ready to move onto a company template.
// Layouts named as PowerPoint names them, built from real placeholders, the slide words in the title placeholder.
// Since 27 November 2026: a slide outline. Each slide has its number, a proposed title, proposed content and a
// suggestion for the picture or chart. Stories made before 19 November keep the old two-layout deck.
// No text boxes, no fonts or colours set on a slide: the theme carries them, so a template replaces them.
// The speaker notes carry the cues for that part of the talk.

import PptxGenJS from "pptxgenjs";
import { z } from "zod";
import type { LandingInputSchema, StoryInputSchema } from "./schema";
import { deck, isNewDeck, slideOutline } from "./slides";

type Story = z.infer<typeof StoryInputSchema>;
type Landing = z.infer<typeof LandingInputSchema>;

const TITLE_SLIDE = "Title Slide";
const TITLE_AND_CONTENT = "Title and Content";

function notes(lines: string[]): string {
  return lines.filter(Boolean).join("\n");
}

export async function renderPptx(story: Story, landing: Landing): Promise<Buffer> {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in, PowerPoint's own 16:9
  pres.title = story.bigIdea;
  pres.author = "Jim Harvey's StoryMachine";
  pres.theme = { headFontFace: "Calibri Light", bodyFontFace: "Calibri" };

  pres.defineSlideMaster({
    title: TITLE_SLIDE,
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.9, y: 2.2, w: 11.5, h: 2.0, align: "center", valign: "middle", fontSize: 54 }, text: "" } },
      { placeholder: { options: { name: "subtitle", type: "body", x: 0.9, y: 4.4, w: 11.5, h: 0.9, align: "center", fontSize: 20 }, text: "" } },
    ],
  });
  pres.defineSlideMaster({
    title: TITLE_AND_CONTENT,
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 0.4, w: 11.9, h: 1.4, align: "left", valign: "middle", fontSize: isNewDeck(landing) ? 36 : 40 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: 0.7, y: 2.0, w: 11.9, h: 4.9, fontSize: 20 }, text: "" } },
    ],
  });

  if (isNewDeck(landing)) {
    // The slide outline (Jim and John, 27 November 2026): every slide carries its number, a proposed title,
    // proposed content and a suggestion for the picture or chart. The presenter replaces the content and the
    // suggestion with the real thing; the cues stay in the speaker notes.
    const outline = slideOutline(story, landing);
    const total = outline.length;
    outline.forEach((o) => {
      const slide = pres.addSlide({ masterName: TITLE_AND_CONTENT });
      slide.addText(o.title, { placeholder: "title" });
      const body: PptxGenJS.TextProps[] = [
        { text: `Slide ${o.n} of ${total}  ·  ${o.serves}`, options: { fontSize: 12, color: "888888", breakLine: true } },
      ];
      if (o.content.length) {
        body.push({ text: "Proposed content", options: { bold: true, fontSize: 16, breakLine: true } });
        for (const c of o.content) body.push({ text: c, options: { bullet: true, fontSize: 18, breakLine: true } });
      }
      body.push({ text: "Suggestion", options: { bold: true, fontSize: 16, breakLine: true } });
      body.push({ text: o.suggestion, options: { fontSize: 18, italic: true } });
      slide.addText(body, { placeholder: "body" });
      slide.addNotes(notes(o.notes));
    });
    const out = await pres.write({ outputType: "nodebuffer" });
    return out as Buffer;
  }

  // The old deck, for stories made before 19 November: one cue per slide, the cue in the notes.
  const slides = deck(story, landing);
  slides.forEach((d, i) => {
    const first = i === 0;
    const last = i === slides.length - 1;
    if (first || last) {
      const slide = pres.addSlide({ masterName: TITLE_SLIDE });
      slide.addText(d.words, { placeholder: "title" });
      slide.addNotes(notes(d.notes));
      return;
    }
    const slide = pres.addSlide({ masterName: TITLE_AND_CONTENT });
    slide.addText(d.words, { placeholder: "title" });
    slide.addText(d.picture && !/^none/i.test(d.picture) ? `Picture: ${d.picture}` : "", { placeholder: "body" });
    slide.addNotes(notes(d.notes));
  });

  const out = await pres.write({ outputType: "nodebuffer" });
  return out as Buffer;
}
