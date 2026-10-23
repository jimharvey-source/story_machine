import { NextResponse } from "next/server";
import { capReached, currentProfile, logGeneration, refundAi, signInRequired, spendAi } from "@/lib/access";
import { generateStructured } from "@/lib/anthropic";
import { RHETORIC_SYSTEM, rhetoricUserMessage } from "@/lib/prompts";
import { RhetoricGenSchema, RhetoricRequestSchema, type Rhetoric } from "@/lib/schema";
import { pathLabel } from "@/lib/rhetoric";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

// Rhetoric (9 October): lines where a rhetorical device would add power. Since 23 October, suggestions only.
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
    const all = { ...story, landing: landing ?? {} } as Record<string, unknown>;
    const textAt = (path: string): string => {
      const v = path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), all);
      return typeof v === "string" ? v : "";
    };
    // One suggestion a line, for a line that exists, and never the line unchanged.
    const taken = new Set<string>();
    const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
    const suggestions = result.data.suggestions
      .filter((sg) => textAt(sg.path) && !same(textAt(sg.path), sg.better) && !taken.has(sg.path) && (taken.add(sg.path), true))
      .slice(0, 4)
      .map((sg) => ({ ...sg, now: textAt(sg.path), where: pathLabel(sg.path, story.kind) }));
    const rhetoric: Rhetoric = { devices: [], suggestions };
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
