import { NextResponse } from "next/server";
import { currentProfile, logGeneration, purchaseRequired, refundStory, signInRequired, startStory } from "@/lib/access";
import { describeKey, generateStructured } from "@/lib/anthropic";
import { storySystem, storyUserMessage } from "@/lib/prompts";
import { StoryRequestSchema, StorySchema } from "@/lib/schema";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

// A new story spends the free story or a credit. Reworking an existing story (storyId given) is free.
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
  const { notes, audience, intent, register, storyId } = parsed.data;
  const admin = supabaseAdmin();

  let existingId: string | null = null;
  if (storyId) {
    const { data } = await admin.from("stories").select("id").eq("id", storyId).eq("user_id", profile.id).maybeSingle();
    existingId = data?.id ?? null;
  }
  if (!existingId) {
    const allowed = await startStory(profile);
    if (!allowed) return purchaseRequired();
  }

  try {
    const result = await generateStructured({
      system: storySystem(register),
      user: storyUserMessage(notes, audience, intent),
      schema: StorySchema,
      maxTokens: 8000,
      label: "story",
      voice: { contractionsInWritten: register === "conversational" },
    });
    await logGeneration(profile.id, "story", { attempts: result.attempts, violationsBefore: result.violationsBefore, violationsAfter: result.violationsAfter });

    // Every story is saved, so the person can come back to it and its edits stay free.
    const row = {
      user_id: profile.id,
      title: result.data.bigIdea.slice(0, 160),
      notes,
      audience,
      intent,
      register,
      story: result.data,
      landing: null,
      updated_at: new Date().toISOString(),
    };
    let id = existingId;
    if (existingId) {
      await admin.from("stories").update(row).eq("id", existingId);
    } else {
      const { data, error } = await admin.from("stories").insert(row).select("id").single();
      if (error) console.error("[api/story] save failed", error.message);
      id = data?.id ?? null;
    }

    return NextResponse.json({
      id,
      story: result.data,
      meta: {
        model: result.model,
        attempts: result.attempts,
        violationsBefore: result.violationsBefore,
        violationsAfter: result.violationsAfter,
        unresolved: result.unresolved,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const hint = /authentication|api-key|api_key/i.test(message) ? ` (${describeKey()})` : "";
    console.error("[api/story]", message);
    if (!existingId) await refundStory(profile);
    return NextResponse.json(
      { error: "The Story Machine could not build a story from that. " + message + hint },
      { status: 502 }
    );
  }
}
