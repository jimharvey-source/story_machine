import { NextResponse } from "next/server";
import { currentProfile, logGeneration, purchaseRequired, signInRequired, startStory } from "@/lib/access";
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

  // Stage 2 is where the free story, a credit, a month or lifetime is spent. Once a story is unlocked, it stays unlocked.
  const allowed = storyId ? await unlockStory(profile, storyId) : await startStory(profile);
  if (!allowed) return purchaseRequired();

  try {
    const result = await generateStructured({
      system: landSystem(register, story.kind),
      user: landUserMessage(notes, JSON.stringify(story, null, 2)),
      schema: LandingSchema,
      maxTokens: 8000,
      label: "land",
      voice: { contractionsInWritten: register === "conversational", avoid: namesToAvoid(story.audience.doNotNeedToHear), bigIdea: story.bigIdea },
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
    const message = e instanceof Error ? e.message : "Unknown error";
    const hint = /authentication|api-key|api_key/i.test(message) ? ` (${describeKey()})` : "";
    console.error("[api/land]", message);
    return NextResponse.json(
      { error: "The StoryMachine could not finish that. " + message + hint },
      { status: 502 }
    );
  }
}
