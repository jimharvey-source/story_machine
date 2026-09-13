import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { generateStructured } from "@/lib/anthropic";
import { refineSystem, refineUserContext } from "@/lib/prompts";
import { RefineFullResultSchema, RefineRequestSchema, RefineStoryResultSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }
  const parsed = RefineRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { notes, story, landing, register, messages } = parsed.data;
  if (messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "The last message must be yours" }, { status: 400 });
  }

  const context = refineUserContext({
    notes,
    storyJson: JSON.stringify(story, null, 2),
    landingJson: landing ? JSON.stringify(landing, null, 2) : null,
  });
  // The story context rides on the first user turn; the conversation follows verbatim.
  const history: Anthropic.MessageParam[] = messages.map((m, i) => ({
    role: m.role,
    content: i === 0 ? `${context}\n\n<message>\n${m.content}\n</message>` : m.content,
  }));
  const [first, ...rest] = history;
  const user = typeof first.content === "string" ? first.content : "";

  try {
    if (landing) {
      const result = await generateStructured({
        system: refineSystem(register),
        user,
        history: rest,
        schema: RefineFullResultSchema,
        maxTokens: 10000,
        label: "refine:full",
      });
      return NextResponse.json({ reply: result.data.reply, story: result.data.story, landing: result.data.landing, meta: { attempts: result.attempts, violationsAfter: result.violationsAfter } });
    }
    const result = await generateStructured({
      system: refineSystem(register),
      user,
      history: rest,
      schema: RefineStoryResultSchema,
      maxTokens: 8000,
      label: "refine:story",
    });
    return NextResponse.json({ reply: result.data.reply, story: result.data.story, meta: { attempts: result.attempts, violationsAfter: result.violationsAfter } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/refine]", message);
    return NextResponse.json({ error: "The strategist could not answer that. " + message }, { status: 502 });
  }
}
