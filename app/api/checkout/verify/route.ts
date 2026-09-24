import { NextResponse } from "next/server";
import { currentProfile, signInRequired } from "@/lib/access";
import { applyCheckoutSession } from "@/lib/purchases";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Called on return from Stripe so the purchase shows at once, before the webhook lands.
export async function POST(req: Request) {
  const p = await currentProfile();
  if (!p) return signInRequired();
  let sessionId = "";
  try {
    sessionId = String((await req.json()).sessionId ?? "");
  } catch {
    return NextResponse.json({ error: "Missing session" }, { status: 400 });
  }
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
    if (session.metadata?.user_id !== p.id) return NextResponse.json({ error: "That checkout is not yours" }, { status: 403 });
    const ok = await applyCheckoutSession(session);
    return NextResponse.json({ ok, kind: session.metadata?.kind ?? null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/checkout/verify]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
