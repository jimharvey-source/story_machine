import type Stripe from "stripe";
import { stripe } from "./stripe";
import { supabaseAdmin } from "./supabase/server";

// Shared by the return-from-Stripe check and the webhook, so both apply a purchase the same way
// and neither can apply it twice.

/** A monthly subscription changed: keep the profile in step. Lifetime and programme plans are never downgraded. */
export async function applySubscription(sub: Stripe.Subscription) {
  const admin = supabaseAdmin();
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const item = sub.items.data[0];
  const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null;
  const active = sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
  const { data: profile } = await admin.from("profiles").select("id, plan, plan_source").eq("stripe_customer_id", customer).maybeSingle();
  if (!profile) {
    console.warn("[stripe] no profile for customer", customer);
    return;
  }
  const update: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    current_period_end: periodEnd,
    updated_at: new Date().toISOString(),
  };
  if (profile.plan === "lifetime") {
    // Nothing to change about access. Record the subscription fields and leave the plan alone.
  } else if (active) {
    update.plan = "pro";
    update.plan_source = "stripe";
  } else if (profile.plan_source === "stripe" || profile.plan_source === null) {
    update.plan = "free";
  }
  await admin.from("profiles").update(update).eq("id", profile.id);
}

/**
 * Apply a completed checkout session. Returns true when the person now has what they paid for.
 * One-off payments (a story, lifetime) go through story.grant_purchase, which ignores a repeat.
 */
export async function applyCheckoutSession(session: Stripe.Checkout.Session): Promise<boolean> {
  const userId = session.metadata?.user_id;
  const kind = session.metadata?.kind;
  if (!userId) return false;
  if (session.mode === "subscription") {
    if (!session.subscription) return false;
    const sub =
      typeof session.subscription === "string"
        ? await stripe().subscriptions.retrieve(session.subscription)
        : session.subscription;
    await applySubscription(sub);
    return sub.status === "active" || sub.status === "trialing";
  }
  if (session.mode === "payment") {
    if (session.payment_status !== "paid") return false;
    if (kind !== "story" && kind !== "lifetime") {
      console.warn("[stripe] paid session with unknown kind", session.id, kind);
      return false;
    }
    const { error } = await supabaseAdmin().rpc("grant_purchase", { p_user: userId, p_session: session.id, p_kind: kind });
    if (error) throw new Error(`grant_purchase failed: ${error.message}`);
    return true;
  }
  return false;
}
