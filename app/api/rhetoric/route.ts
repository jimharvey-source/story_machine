import { NextResponse } from "next/server";
import { capReached, currentProfile, logGeneration, refundAi, signInRequired, spendAi } from "@/lib/access";
import { generateStructured } from "@/lib/anthropic";
import { RHETORIC_SYSTEM, rhetoricUserMessage } from "@/lib/prompts";
import { RhetoricRequestSchema, RhetoricSchema } from "@/lib/schema";
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
      schema: RhetoricSchema,
      maxTokens: 3000,
      label: "rhetoric",
      skipVoice: true,
    });
    await logGeneration(profile.id, "rhetoric");
    await admin.from("stories").update({ rhetoric: result.data }).eq("id", storyId).eq("user_id", profile.id);
    return NextResponse.json({ rhetoric: result.data });
  } catch (e) {
    await refundAi(storyId, "rhetoric");
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/rhetoric]", message);
    return NextResponse.json({ error: "The rhetoric notes did not come through. " + message }, { status: 502 });
  }
}
