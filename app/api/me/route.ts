import { NextResponse } from "next/server";
import { currentProfile, isUnlimited, storiesLeft } from "@/lib/access";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const p = await currentProfile();
    if (!p) return NextResponse.json({ signedIn: false });
    const unlimited = isUnlimited(p);
    return NextResponse.json({
      signedIn: true,
      email: p.email,
      plan: p.plan,
      unlimited,
      storiesLeft: storiesLeft(p),
      storiesStarted: p.stories_started,
      planSource: p.plan_source,
      periodEnd: p.current_period_end,
      cohortCode: p.cohort_code,
      stripeCustomer: Boolean(p.stripe_customer_id),
      subscribed: Boolean(p.stripe_subscription_id) && p.plan === "pro",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/me]", message);
    return NextResponse.json({ signedIn: false, error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  return NextResponse.json({ ok: true });
}
