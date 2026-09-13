import { NextResponse } from "next/server";
import { describeKey, generateStructured } from "@/lib/anthropic";
import { storySystem, storyUserMessage } from "@/lib/prompts";
import { StoryRequestSchema, StorySchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
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
  const { notes, audience, intent, register } = parsed.data;

  try {
    const result = await generateStructured({
      system: storySystem(register),
      user: storyUserMessage(notes, audience, intent),
      schema: StorySchema,
      maxTokens: 8000,
      label: "story",
    });
    return NextResponse.json({
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
    return NextResponse.json(
      { error: "The Story Machine could not build a story from that. " + message + hint },
      { status: 502 }
    );
  }
}
