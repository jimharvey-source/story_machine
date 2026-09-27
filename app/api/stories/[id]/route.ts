import { NextResponse } from "next/server";
import { currentProfile, signInRequired } from "@/lib/access";
import { guestId } from "@/lib/guest";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// A story can be read by its owner, or by the guest browser that made it before signing in.
export async function GET(_req: Request, ctx: Ctx) {
  const p = await currentProfile();
  const guest = p ? null : await guestId();
  if (!p && !guest) return signInRequired();
  const { id } = await ctx.params;
  const q = supabaseAdmin().from("stories").select("*").eq("id", id);
  const { data, error } = await (p ? q.eq("user_id", p.id) : q.eq("guest_id", guest!)).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: data.id,
    title: data.title,
    notes: data.notes,
    audience: data.audience,
    intent: data.intent,
    register: data.register,
    story: data.story,
    landing: data.landing,
    unlocked: Boolean(data.unlocked),
    updatedAt: data.updated_at,
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const p = await currentProfile();
  if (!p) return signInRequired();
  const { id } = await ctx.params;
  const { error } = await supabaseAdmin().from("stories").delete().eq("id", id).eq("user_id", p.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
