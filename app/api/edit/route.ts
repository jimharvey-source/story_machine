import { NextResponse } from "next/server";
import { currentProfile, logGeneration, signInRequired } from "@/lib/access";
import { generateStructured } from "@/lib/anthropic";
import { EDIT_ACTIONS, editSystem, editUserMessage } from "@/lib/prompts";
import { EditListSchema, EditRequestSchema, EditTextSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return signInRequired();
  await logGeneration(profile.id, "edit");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }
  const parsed = EditRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { notes, story, landing, register, path, current, action, instruction } = parsed.data;
  const ask = action === "custom" ? instruction.trim() : EDIT_ACTIONS[action];
  if (!ask) return NextResponse.json({ error: "Say what you want changed" }, { status: 400 });

  const user = editUserMessage({
    notes,
    storyJson: JSON.stringify(story, null, 2),
    landingJson: landing ? JSON.stringify(landing, null, 2) : null,
    path,
    current,
    instruction: ask,
  });

  try {
    if (Array.isArray(current)) {
      const result = await generateStructured({
        system: editSystem(register),
        user,
        schema: EditListSchema,
        maxTokens: 2000,
        label: `edit:${path}`,
        voice: { contractionsInWritten: register === "conversational" },
      });
      return NextResponse.json({ value: result.data.items, meta: { attempts: result.attempts } });
    }
    const result = await generateStructured({
      system: editSystem(register),
      user,
      schema: EditTextSchema,
      maxTokens: 1500,
      label: `edit:${path}`,
      voice: { contractionsInWritten: register === "conversational" },
    });
    return NextResponse.json({ value: result.data.value, meta: { attempts: result.attempts } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/edit]", message);
    return NextResponse.json({ error: "That edit did not go through. " + message }, { status: 502 });
  }
}
