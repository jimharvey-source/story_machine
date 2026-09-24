import { NextResponse } from "next/server";
import { z } from "zod";
import { currentProfile, signInRequired } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase/server";
import { LandingSchema, RegisterSchema, StorySchema } from "@/lib/schema";

export const runtime = "nodejs";

const SaveSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(160),
  notes: z.string().min(1).max(60000),
  audience: z.string().max(400).default(""),
  intent: z.string().max(400).default(""),
  register: RegisterSchema,
  story: StorySchema,
  landing: LandingSchema.nullable().default(null),
});

export async function GET() {
  const p = await currentProfile();
  if (!p) return signInRequired();
  const { data, error } = await supabaseAdmin()
    .from("stories")
    .select("id, title, updated_at, landing")
    .eq("user_id", p.id)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    stories: (data ?? []).map((s) => ({ id: s.id, title: s.title, updatedAt: s.updated_at, landed: Boolean(s.landing) })),
  });
}

export async function POST(req: Request) {
  const p = await currentProfile();
  if (!p) return signInRequired();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }
  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const { id, ...fields } = parsed.data;
  const admin = supabaseAdmin();
  const row = { ...fields, user_id: p.id, updated_at: new Date().toISOString() };
  if (id) {
    const { data, error } = await admin.from("stories").update(row).eq("id", id).eq("user_id", p.id).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  }
  const { data, error } = await admin.from("stories").insert(row).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
