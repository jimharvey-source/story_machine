// The slide text as a PowerPoint file, ready to move onto a company template.
// Two layouts named as PowerPoint names them, "Title Slide" and "Title and Content", built from real
// placeholders: the slide words in the title placeholder, the picture brief in the content placeholder.
// No text boxes, no fonts or colours set on a slide: the theme carries them, so a template replaces them.
// The speaker notes carry the cues for that part of the talk.

import PptxGenJS from "pptxgenjs";
import { z } from "zod";
import type { LandingInputSchema, StoryInputSchema } from "./schema";
import { KINDS, kindOf } from "./kinds";
import { splitSlideIdea } from "./method";

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

  const kind = KINDS[kindOf(story.kind)];
  const cues = landing.speechNotes;

  // Title: the Big Idea, word for word.
  const title = pres.addSlide({ masterName: TITLE_SLIDE });
  title.addText(story.bigIdea, { placeholder: "title" });
  title.addNotes(notes(["Prologue", ...cues.prologue]));

  // One slide per act: the words as the title, the picture brief in the content placeholder
  // for whoever makes the picture to replace.
  const acts: Array<["why" | "how" | "what", string, string[]]> = [
    ["why", `Act 1, ${kind.acts[0]}`, cues.why],
    ["how", `Act 2, ${kind.acts[1]}`, cues.how],
    ["what", `Act 3, ${kind.acts[2]}`, cues.what],
  ];
  for (const [key, name, beat] of acts) {
    const { words, picture } = splitSlideIdea(landing[key].visualIdea);
    const slide = pres.addSlide({ masterName: TITLE_AND_CONTENT });
    slide.addText(words || story[key].headline, { placeholder: "title" });
    slide.addText(picture ? `Picture: ${picture}` : "", { placeholder: "body" });
    slide.addNotes(notes([name, `Signpost: ${landing[key].signpost}`, ...beat]));
  }

  // Close: the last words the audience hears, which are the Big Idea.
  const close = pres.addSlide({ masterName: TITLE_SLIDE });
  close.addText(story.bigIdea, { placeholder: "title" });
  close.addNotes(notes(["Epilogue", ...cues.epilogue]));

  const out = await pres.write({ outputType: "nodebuffer" });
  return out as Buffer;
}
