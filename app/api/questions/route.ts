import { NextResponse } from "next/server";
import { currentProfile, isUnlimited, logGeneration, purchaseRequired, signInRequired, storiesLeft } from "@/lib/access";
import { generateStructured } from "@/lib/anthropic";
import { KINDS } from "@/lib/kinds";
import { QUESTIONS_SYSTEM, questionsUserMessage } from "@/lib/prompts";
import { QuestionsRequestSchema, QuestionsSchema } from "@/lib/schema";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Ask back (9 October): before the story is written, up to three questions about what the material leaves out.
// Spends nothing. Only for someone who could start this story: an allowance left, an unlimited plan, or their own story.
export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return signInRequired();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }
  const parsed = QuestionsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { notes, audience, intent, kind, storyId } = parsed.data;

  let ownsStory = false;
  if (storyId) {
    const { data } = await supabaseAdmin().from("stories").select("id").eq("id", storyId).eq("user_id", profile.id).maybeSingle();
    ownsStory = Boolean(data);
  }
  if (!ownsStory && !isUnlimited(profile) && (storiesLeft(profile) ?? 0) === 0) return purchaseRequired();

  try {
    const result = await generateStructured({
      system: QUESTIONS_SYSTEM,
      user: questionsUserMessage(notes, audience, intent, kind ? KINDS[kind].label : null),
      schema: QuestionsSchema,
      maxTokens: 1500,
      label: "questions",
      skipVoice: true,
    });
    await logGeneration(profile.id, "questions");
    return NextResponse.json({ questions: result.data.questions.slice(0, 3) });
  } catch (e) {
    // The questions help; they are not essential. On failure the page goes straight to the story.
    console.error("[api/questions]", e instanceof Error ? e.message : e);
    return NextResponse.json({ questions: [] });
  }
}
