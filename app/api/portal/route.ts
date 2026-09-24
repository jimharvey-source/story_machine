import { NextResponse } from "next/server";
import { currentProfile, signInRequired } from "@/lib/access";
import { siteUrl, stripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Stripe's customer portal: change card, cancel, see invoices.
export async function POST(req: Request) {
  const p = await currentProfile();
  if (!p) return signInRequired();
  if (!p.stripe_customer_id) return NextResponse.json({ error: "No subscription on this account" }, { status: 400 });
  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: p.stripe_customer_id,
      return_url: `${siteUrl(req)}/`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/portal]", message);
    return NextResponse.json({ error: "Could not open billing. " + message }, { status: 502 });
  }
}
