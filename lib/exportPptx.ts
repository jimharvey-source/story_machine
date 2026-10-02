// The slide text as a PowerPoint file, ready to move onto a company template.
// Two layouts named as PowerPoint names them, "Title Slide" and "Title and Content", built from real
// placeholders: the slide words in the title placeholder, the picture brief in the content placeholder.
// No text boxes, no fonts or colours set on a slide: the theme carries them, so a template replaces them.
// The speaker notes carry the cues for that part of the talk.

import PptxGenJS from "pptxgenjs";
import { z } from "zod";
import type { LandingInputSchema, StoryInputSchema } from "./schema";
import { deck } from "./slides";

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
      { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 0.4, w: 11.9, h: 1.4, align: "left", valign: "middle", fontSize: 40 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: 0.7, y: 2.0, w: 11.9, h: 4.9, fontSize: 20 }, text: "" } },
    ],
  });

  // The deck from the slide brief: titles that narrate the story, one cue per slide, the cue in the notes.
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
