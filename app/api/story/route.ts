import { NextResponse } from "next/server";
import { currentProfile, isUnlimited, logGeneration } from "@/lib/access";
import { describeKey, generateStructured } from "@/lib/anthropic";
import { allowRun, guestIdOrNew, setGuestCookie, tooManyRuns } from "@/lib/guest";
import { storySystem, storyUserMessage } from "@/lib/prompts";
import { StoryRequestSchema, StorySchema } from "@/lib/schema";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

// Stage 1 is free and needs no sign-in. Guests are known by a cookie; their stories are claimed when they sign in.
// Stage 2 and the PDF are where the free story, a credit, a month or lifetime come in (see /api/land and /api/export).
export async function POST(req: Request) {
  const profile = await currentProfile();
  const guest = profile ? null : await guestIdOrNew();
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

  // Reworking a story you own (signed in, or the guest who made it) keeps its id and its unlocked state.
  let existingId: string | null = null;
  if (storyId) {
    const q = admin.from("stories").select("id").eq("id", storyId);
    const { data } = await (profile ? q.eq("user_id", profile.id) : q.eq("guest_id", guest!.id)).maybeSingle();
    existingId = data?.id ?? null;
  }
  const gate = await allowRun(profile, isUnlimited(profile), guest?.id ?? null);
  if (!gate.ok) return tooManyRuns();

  try {
    const result = await generateStructured({
      system: storySystem(register),
      user: storyUserMessage(notes, audience, intent),
      schema: StorySchema,
      maxTokens: 8000,
      label: "story",
      voice: { contractionsInWritten: register === "conversational" },
    });
    if (profile) await logGeneration(profile.id, "story", { attempts: result.attempts, violationsBefore: result.violationsBefore, violationsAfter: result.violationsAfter });

    // Every story is saved, so the person can come back to it and its edits stay free.
    const row = {
      user_id: profile?.id ?? null,
      guest_id: profile ? null : guest!.id,
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

    const res = NextResponse.json({
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
    if (guest?.fresh) setGuestCookie(res, guest.id);
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const hint = /authentication|api-key|api_key/i.test(message) ? ` (${describeKey()})` : "";
    console.error("[api/story]", message);
    return NextResponse.json(
      { error: "The Story Machine could not build a story from that. " + message + hint },
      { status: 502 }
    );
  }
}
