import { NextResponse } from "next/server";
import { z } from "zod";
import { currentProfile, purchaseRequired, signInRequired, startStory } from "@/lib/access";
import { unlockStory } from "@/lib/guest";
import { LandingInputSchema, RhetoricSchema, StoryInputSchema } from "@/lib/schema";
import { renderDocx } from "@/lib/exportDocx";
import { renderPptx } from "@/lib/exportPptx";
import { renderPdf } from "@/lib/exportPdf";

export const runtime = "nodejs";
export const maxDuration = 60;

const ExportSchema = z.object({
  title: z.string().max(160).default("My story"),
  story: StoryInputSchema,
  landing: LandingInputSchema.nullable().default(null),
  /** The rhetoric notes, when the page has them. */
  rhetoric: RhetoricSchema.nullable().default(null),
  /** The saved story; the PDF unlocks it like stage 2 does. */
  storyId: z.string().uuid().optional(),
  /** pdf (default), docx (the same content as a Word document), pptx (the slide text, stage 2 only). */
  format: z.enum(["pdf", "docx", "pptx"]).default("pdf"),
});

const TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const;


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
  const { title, story, landing, rhetoric, storyId, format } = parsed.data;
  if (format === "pptx" && !landing) {
    return NextResponse.json({ error: "The slides come with stage 2. Add interest and impact first." }, { status: 400 });
  }

  // The downloads come with the story. Since 11 October a story is unlocked when it is made; older ones unlock here.
  const allowed = storyId ? await unlockStory(p, storyId) : await startStory(p);
  if (!allowed) return purchaseRequired();

  const buf =
    format === "docx" ? await renderDocx(title, story, landing, rhetoric)
    : format === "pptx" && landing ? await renderPptx(story, landing)
    : await renderPdf(title, story, landing, rhetoric);
  // Trim the title at a word boundary, so the file name never ends mid-word.
  const words = title.replace(/[^\w\- ]+/g, "").trim().split(/\s+/).filter(Boolean);
  let safe = "";
  for (const w of words) {
    if ((safe ? safe.length + 1 : 0) + w.length > 60) break;
    safe = safe ? `${safe}-${w}` : w;
  }
  safe = safe || "story";
  const name =
    format === "pptx" ? `${safe}-slides.pptx`
    : `${safe}-${landing ? "presentation-story" : "story-first-draft"}.${format}`;
  console.log(JSON.stringify({ tag: "export", format, landed: Boolean(landing), bytes: buf.length, name }));
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": TYPES[format],
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}

