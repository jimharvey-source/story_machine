import { NextResponse } from "next/server";
import { currentProfile, signInRequired } from "@/lib/access";
import { redeemFor } from "@/lib/join";

export const runtime = "nodejs";

// Apply a programme code to the signed-in account. Throttled in lib/join.ts:
// ten wrong codes an hour per account, twenty per address.
export async function POST(req: Request) {
  const p = await currentProfile();
  if (!p) return signInRequired();
  let code = "";
  try {
    const body = await req.json();
    code = String(body.code ?? "");
  } catch {
    return NextResponse.json({ error: "Enter a programme code" }, { status: 400 });
  }
  const r = await redeemFor(p.id, code);
  if (r.ok) return NextResponse.json({ ok: true, label: r.message });
  return NextResponse.json({ error: r.error, already: r.already ?? false }, { status: r.throttled ? 429 : 400 });
}
