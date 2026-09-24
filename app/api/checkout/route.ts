import { NextResponse } from "next/server";
import { currentProfile, signInRequired } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isPlan, priceId, siteUrl, stripe, type Plan } from "@/lib/stripe";

export const runtime = "nodejs";

// story and lifetime are one-off payments; monthly is a subscription.
export async function POST(req: Request) {
  const p = await currentProfile();
  if (!p) return signInRequired();
  let plan: Plan = "story";
  try {
    const body = await req.json();
    if (isPlan(body.plan)) plan = body.plan;
  } catch {
    // default single story
  }
  if (p.plan === "lifetime") return NextResponse.json({ error: "You already have lifetime access." }, { status: 400 });
  try {
    const s = stripe();
    let customer = p.stripe_customer_id;
    if (!customer) {
      const c = await s.customers.create({ email: p.email, metadata: { user_id: p.id, product: "story-machine" } });
      customer = c.id;
      await supabaseAdmin().from("profiles").update({ stripe_customer_id: customer }).eq("id", p.id);
    }
    const base = siteUrl(req);
    const metadata = { user_id: p.id, product: "story-machine", kind: plan };
    const session = await s.checkout.sessions.create({
      mode: plan === "monthly" ? "subscription" : "payment",
      customer,
      line_items: [{ price: priceId(plan), quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${base}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?checkout=cancelled`,
      metadata,
      ...(plan === "monthly"
        ? { subscription_data: { metadata } }
        : { payment_intent_data: { metadata }, invoice_creation: { enabled: true } }),
    });
    if (!session.url) throw new Error("Stripe returned no checkout URL");
    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/checkout]", message);
    return NextResponse.json({ error: "Could not start checkout. " + message }, { status: 502 });
  }
}
