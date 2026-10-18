import { NextResponse } from "next/server";
import { capReached, currentProfile, logGeneration, refundAi, signInRequired, spendAi } from "@/lib/access";
import { generateStructured } from "@/lib/anthropic";
import { RHETORIC_SYSTEM, rhetoricUserMessage } from "@/lib/prompts";
import { RhetoricGenSchema, RhetoricRequestSchema, type Rhetoric } from "@/lib/schema";
import { pathLabel } from "@/lib/rhetoric";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

// Rhetoric (9 October): the devices in the finished story, and where one would help.
// Runs on its own after Stage 2, so it never slows the story and never trips the story's voice rules.
export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return signInRequired();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }
  const parsed = RhetoricRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { notes, story, landing, storyId } = parsed.data;
  const admin = supabaseAdmin();
  const { data: row } = await admin.from("stories").select("id, unlocked").eq("id", storyId).eq("user_id", profile.id).maybeSingle();
  if (!row?.unlocked) return NextResponse.json({ error: "Open this story from My stories first." }, { status: 404 });
  if (!(await spendAi(profile, storyId, "rhetoric"))) return capReached("rhetoric");

  try {
    const result = await generateStructured({
      system: RHETORIC_SYSTEM,
      user: rhetoricUserMessage(notes, JSON.stringify(story, null, 2), landing ? JSON.stringify(landing, null, 2) : null),
      schema: RhetoricGenSchema,
      maxTokens: 3000,
      label: "rhetoric",
      skipVoice: true,
    });
    // Check the model's claims we can check. "Yours" only when the words really are in the notes.
    const flat = (t: string) => t.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
    const source = flat(notes);
    const all = { ...story, landing: landing ?? {} } as Record<string, unknown>;
    const textAt = (path: string): string => {
      const v = path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), all);
      return typeof v === "string" ? v : "";
    };
    const devices = result.data.devices
      .filter((d) => d.device.toLowerCase() !== "rhetorical question" || d.line.trim().endsWith("?"))
      .filter((d) => flat(textAt(d.path)).includes(flat(d.line)))
      .slice(0, 3)
      .map((d) => ({ ...d, where: pathLabel(d.path, story.kind), source: (flat(d.line) && source.includes(flat(d.line)) ? "yours" : "added") as "yours" | "added" }));
    // Never suggest a device for a line that already has one, and never two suggestions for one line.
    const taken = new Set(devices.map((d) => d.path as string));
    const suggestions = result.data.suggestions
      .filter((sg) => textAt(sg.path) && !taken.has(sg.path) && (taken.add(sg.path), true))
      .slice(0, 3)
      .map((sg) => ({ ...sg, now: textAt(sg.path), where: pathLabel(sg.path, story.kind) }));
    const rhetoric: Rhetoric = { devices, suggestions };
    await logGeneration(profile.id, "rhetoric");
    await admin.from("stories").update({ rhetoric }).eq("id", storyId).eq("user_id", profile.id);
    return NextResponse.json({ rhetoric });
  } catch (e) {
    await refundAi(storyId, "rhetoric");
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/rhetoric]", message);
    return NextResponse.json({ error: "The rhetoric notes did not come through. " + message }, { status: 502 });
  }
}
