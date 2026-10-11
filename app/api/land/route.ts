import { NextResponse } from "next/server";
import { capReached, currentProfile, logGeneration, purchaseRequired, refundAi, signInRequired, spendAi, startStory } from "@/lib/access";
import { unlockStory } from "@/lib/guest";
import { describeKey, generateStructured } from "@/lib/anthropic";
import { landSystem, landUserMessage } from "@/lib/prompts";
import { namesToAvoid } from "@/lib/voice";
import { LandRequestSchema, LandingSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return signInRequired();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }
  const parsed = LandRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
  const { notes, story, register, storyId } = parsed.data;

  // Since 11 October a story is unlocked when it is made, so this rarely spends anything. Older locked stories
  // are unlocked here. Once unlocked, it stays unlocked. A free story may run Stage 2 twice (first run and after its rerun).
  const allowed = storyId ? await unlockStory(profile, storyId) : await startStory(profile);
  if (!allowed) return purchaseRequired();
  if (storyId && !(await spendAi(profile, storyId, "land"))) return capReached("land");

  try {
    const result = await generateStructured({
      system: landSystem(register, story.kind),
      user: landUserMessage(notes, JSON.stringify(story, null, 2)),
      schema: LandingSchema,
      maxTokens: 8000,
      label: "land",
      voice: { contractionsInWritten: register === "conversational", source: notes, avoid: namesToAvoid(story.audience.doNotNeedToHear), bigIdea: story.bigIdea },
    });
    await logGeneration(profile.id, "land", { attempts: result.attempts, violationsBefore: result.violationsBefore, violationsAfter: result.violationsAfter });
    return NextResponse.json({
      landing: result.data,
      meta: {
        model: result.model,
        attempts: result.attempts,
        violationsBefore: result.violationsBefore,
        violationsAfter: result.violationsAfter,
        unresolved: result.unresolved,
      },
    });
  } catch (e) {
    if (storyId) await refundAi(storyId, "land");
    const message = e instanceof Error ? e.message : "Unknown error";
    const hint = /authentication|api-key|api_key/i.test(message) ? ` (${describeKey()})` : "";
    console.error("[api/land]", message);
    return NextResponse.json(
      { error: "The StoryMachine could not finish that. " + message + hint },
      { status: 502 }
    );
  }
}
