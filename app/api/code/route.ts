import { NextResponse } from "next/server";
import { currentProfile, signInRequired } from "@/lib/access";
import { ipHash } from "@/lib/guest";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Guessing is throttled: ten wrong codes an hour per account, twenty per address.
// Re-entering a code you already hold is not a wrong guess.
const PER_USER_PER_HOUR = 10;
const PER_IP_PER_HOUR = 20;

export async function POST(req: Request) {
  const p = await currentProfile();
  if (!p) return signInRequired();
  let code = "";
  try {
    const body = await req.json();
    code = String(body.code ?? "").replace(/\s+/g, "").toUpperCase();
  } catch {
    return NextResponse.json({ error: "Enter a programme code" }, { status: 400 });
  }
  if (!/^[A-Z0-9-]{3,32}$/.test(code)) {
    return NextResponse.json({ error: "A programme code is letters, numbers and a dash, for example ABCD-12XY" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const ip = await ipHash();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: mine } = await admin.from("code_attempts").select("id", { count: "exact", head: true }).eq("user_id", p.id).gte("created_at", since);
  let fromIp = 0;
  if (ip) {
    const { count } = await admin.from("code_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ip).gte("created_at", since);
    fromIp = count ?? 0;
  }
  if ((mine ?? 0) >= PER_USER_PER_HOUR || fromIp >= PER_IP_PER_HOUR) {
    return NextResponse.json(
      { error: "Too many codes that did not work. Wait an hour, or ask whoever gave you the code to check it." },
      { status: 429 }
    );
  }

  const { data, error } = await admin.rpc("redeem_code", { p_user: p.id, p_code: code });
  if (error) {
    const message = error.message.replace(/^.*?: /, "");
    if (!/already used/i.test(message)) await admin.from("code_attempts").insert({ user_id: p.id, ip_hash: ip });
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, label: data });
}
