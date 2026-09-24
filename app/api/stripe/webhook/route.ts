import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { applyCheckoutSession, applySubscription } from "@/lib/purchases";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Keeps profiles in step with Stripe: one-off purchases, subscriptions created, renewed, cancelled.
// Configure the endpoint in Stripe at /api/stripe/webhook and set STRIPE_WEBHOOK_SECRET.
// Events: checkout.session.completed, customer.subscription.created/updated/deleted.

export async function POST(req: Request) {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 500 });
  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    const message = e instanceof Error ? e.message : "bad signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await applyCheckoutSession(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await applySubscription(event.data.object);
        break;
      default:
        break;
    }
  } catch (e) {
    console.error("[webhook]", event.type, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
