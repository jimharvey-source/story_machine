import { NextResponse } from "next/server";
import { beginStory, capReached, currentProfile, isUnlimited, logGeneration, purchaseRequired, refundAi, refundStory, signInRequired, spendAi } from "@/lib/access";
import { describeKey, generateStructured } from "@/lib/anthropic";
import { allowRun, tooManyRuns } from "@/lib/guest";
import { storySystem, storyUserMessage } from "@/lib/prompts";
import { minutesFrom } from "@/lib/keyQuestions";
import { StoryRequestSchema, StorySchema } from "@/lib/schema";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

// Email first (11 October). Every story needs a signed-in account. A new story spends the free story,
// a credit, or nothing on an unlimited plan, and is unlocked from the start: Stage 2 and the downloads
// follow without a second gate. Running an existing story again is a rerun, which a free story may do once.
export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return signInRequired();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }
  const parsed = StoryRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
  const { notes, audience, intent, register, kind, storyId, answers } = parsed.data;
  const admin = supabaseAdmin();

  // Reworking a story you own keeps its id, its unlocked state and its allowance.
  let existing: { id: string; unlocked: boolean; capped: boolean } | null = null;
  if (storyId) {
    const { data } = await admin.from("stories").select("id, unlocked, capped").eq("id", storyId).eq("user_id", profile.id).maybeSingle();
    existing = data ?? null;
  }

  const gate = await allowRun(profile, isUnlimited(profile), null);
  if (!gate.ok) return tooManyRuns();

  let spent: "story" | "rerun" | null = null;
  let capped = false;
  if (existing && existing.unlocked) {
    if (!(await spendAi(profile, existing.id, "rerun"))) return capReached("rerun");
    spent = "rerun";
  } else {
    const how = await beginStory(profile);
    if (!how) return purchaseRequired();
    spent = "story";
    capped = how === "free";
  }

  try {
    const result = await generateStructured({
      system: storySystem(register, kind ?? null),
      user: storyUserMessage(notes, audience, intent, answers, minutesFrom(intent)),
      schema: StorySchema,
      maxTokens: 8000,
      label: "story",
      voice: { contractionsInWritten: register === "conversational", source: notes },
    });
    // The presenter's choice stands, whatever the model wrote.
    if (kind) result.data.kind = kind;
    await logGeneration(profile.id, "story", { attempts: result.attempts, violationsBefore: result.violationsBefore, violationsAfter: result.violationsAfter });

    // Every story is saved, so the person can come back to it and its edits stay free.
    // A rerun replaces Stage 2 and the rhetoric notes too: they belonged to the old story.
    const row = {
      user_id: profile.id,
      guest_id: null,
      title: result.data.bigIdea.slice(0, 160),
      notes,
      audience,
      intent,
      register,
      story: result.data,
      landing: null,
      rhetoric: null,
      updated_at: new Date().toISOString(),
    };
    let id = existing?.id ?? null;
    if (existing) {
      // An older locked story (made as a guest) is unlocked now, on the same terms as a new one.
      await admin.from("stories").update({ ...row, unlocked: true, ...(spent === "story" ? { capped } : {}) }).eq("id", existing.id);
    } else {
      const { data, error } = await admin.from("stories").insert({ ...row, unlocked: true, capped }).select("id").single();
      if (error) console.error("[api/story] save failed", error.message);
      id = data?.id ?? null;
    }

    return NextResponse.json({
      id,
      story: result.data,
      capped: spent === "story" ? capped : Boolean(existing?.capped),
      meta: {
        model: result.model,
        attempts: result.attempts,
        violationsBefore: result.violationsBefore,
        violationsAfter: result.violationsAfter,
        unresolved: result.unresolved,
      },
    });
  } catch (e) {
    // Nothing was made, so nothing is spent.
    if (spent === "story") await refundStory(profile);
    if (spent === "rerun" && existing) await refundAi(existing.id, "rerun");
    const message = e instanceof Error ? e.message : "Unknown error";
    const hint = /authentication|api-key|api_key/i.test(message) ? ` (${describeKey()})` : "";
    console.error("[api/story]", message);
    return NextResponse.json(
      { error: "StoryMachine could not build a story from that. " + message + hint },
      { status: 502 }
    );
  }
}
