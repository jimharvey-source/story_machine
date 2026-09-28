import { NextResponse } from "next/server";
import { currentProfile, signInRequired } from "@/lib/access";
import { guestId } from "@/lib/guest";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// A story can be read by its owner, or by the guest browser that made it before signing in.
export async function GET(_req: Request, ctx: Ctx) {
  const p = await currentProfile();
  const guest = await guestId();
  if (!p && !guest) return signInRequired();
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const admin = supabaseAdmin();
  const q = admin.from("stories").select("*").eq("id", id);
  // Signed in: your own story, or one this browser made as a guest before you signed in (claimed now).
  const owner = p ? (guest && /^[0-9a-f-]{36}$/.test(guest) ? q.or(`user_id.eq.${p.id},guest_id.eq.${guest}`) : q.eq("user_id", p.id)) : q.eq("guest_id", guest!);
  const { data, error } = await owner.maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (p && !data.user_id) {
    await admin.rpc("claim_stories", { p_guest: data.guest_id, p_user: p.id });
  }
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
