import { NextResponse } from "next/server";
import { currentProfile, logGeneration, signInRequired } from "@/lib/access";
import { generateStructured } from "@/lib/anthropic";
import { endingUserMessage, landSystem } from "@/lib/prompts";
import { namesToAvoid } from "@/lib/voice";
import { EndingRequestSchema, EndingSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 300;

// The Big Idea changed after Stage 2. Rewrite the epilogue, its five-line entry and its cues so the story ends on the
// new Big Idea. The story already has a landing, so it is already unlocked; this spends nothing.
export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return signInRequired();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }
  const parsed = EndingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { notes, story, landing, register } = parsed.data;
  try {
    const result = await generateStructured({
      system: landSystem(register, story.kind),
      user: endingUserMessage(notes, JSON.stringify(story, null, 2), JSON.stringify(landing, null, 2)),
      schema: EndingSchema,
      maxTokens: 3000,
      label: "ending",
      voice: { contractionsInWritten: register === "conversational", source: notes, avoid: namesToAvoid(story.audience.doNotNeedToHear), bigIdea: story.bigIdea },
    });
    await logGeneration(profile.id, "edit", { attempts: result.attempts, violationsBefore: result.violationsBefore, violationsAfter: result.violationsAfter });
    return NextResponse.json({ ending: result.data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/ending]", message);
    return NextResponse.json({ error: "The ending could not be rewritten. " + message }, { status: 502 });
  }
}
