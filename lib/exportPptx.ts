// The slide text as a PowerPoint file, ready to move onto a company template.
// Layouts named as PowerPoint names them, built from real placeholders, the slide words in the title placeholder.
// Since 19 November 2026: Title Slide, Title and Content (content left empty for the picture) and Title Only,
// with the picture brief in the speaker notes. Stories made before then keep the old two-layout deck.
// No text boxes, no fonts or colours set on a slide: the theme carries them, so a template replaces them.
// The speaker notes carry the cues for that part of the talk.

import PptxGenJS from "pptxgenjs";
import { z } from "zod";
import type { LandingInputSchema, StoryInputSchema } from "./schema";
import { deck, hasPicture, isNewDeck } from "./slides";

type Story = z.infer<typeof StoryInputSchema>;
type Landing = z.infer<typeof LandingInputSchema>;

const TITLE_SLIDE = "Title Slide";
const TITLE_AND_CONTENT = "Title and Content";
const TITLE_ONLY = "Title Only";

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
    // From 19 November 2026 (John Zimmer): three layouts. Words-only slides get Title Only with the title
    // centred. Picture slides leave the content placeholder empty for the picture; the brief goes in the notes.
    pres.defineSlideMaster({
      title: TITLE_ONLY,
      objects: [
        { placeholder: { options: { name: "title", type: "title", x: 0.9, y: 1.5, w: 11.5, h: 4.5, align: "center", valign: "middle", fontSize: 54 }, text: "" } },
      ],
    });
    const slides = deck(story, landing);
    slides.forEach((d, i) => {
      const brief = hasPicture(d) && i > 0 && i < slides.length - 1 ? `Picture: ${d.picture}` : "";
      const lines = notes([brief, ...d.notes]);
      if (i === 0 || i === slides.length - 1) {
        const slide = pres.addSlide({ masterName: TITLE_SLIDE });
        slide.addText(d.words, { placeholder: "title" });
        slide.addNotes(lines);
      } else if (hasPicture(d)) {
        const slide = pres.addSlide({ masterName: TITLE_AND_CONTENT });
        slide.addText(d.words, { placeholder: "title" });
        slide.addText("", { placeholder: "body" });
        slide.addNotes(lines);
      } else {
        const slide = pres.addSlide({ masterName: TITLE_ONLY });
        slide.addText(d.words, { placeholder: "title" });
        slide.addNotes(lines);
      }
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
