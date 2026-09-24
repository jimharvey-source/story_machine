import { NextResponse } from "next/server";
import { currentProfile, signInRequired } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const p = await currentProfile();
  if (!p) return signInRequired();
  let code = "";
  try {
    const body = await req.json();
    code = String(body.code ?? "").trim().toUpperCase();
  } catch {
    return NextResponse.json({ error: "Enter a programme code" }, { status: 400 });
  }
  if (!/^[A-Z0-9]{3,32}$/.test(code)) {
    return NextResponse.json({ error: "A programme code is capital letters and numbers, no spaces" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin().rpc("redeem_code", { p_user: p.id, p_code: code });
  if (error) {
    return NextResponse.json({ error: error.message.replace(/^.*?: /, "") }, { status: 400 });
  }
  return NextResponse.json({ ok: true, label: data });
}
