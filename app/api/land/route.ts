import { NextResponse } from "next/server";
import { describeKey, generateStructured } from "@/lib/anthropic";
import { landSystem, landUserMessage } from "@/lib/prompts";
import { LandRequestSchema, LandingSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
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
  const { notes, story, register } = parsed.data;

  try {
    const result = await generateStructured({
      system: landSystem(register),
      user: landUserMessage(notes, JSON.stringify(story, null, 2)),
      schema: LandingSchema,
      maxTokens: 8000,
      label: "land",
    });
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
      { error: "The Story Machine could not finish that. " + message + hint },
      { status: 502 }
    );
  }
}
