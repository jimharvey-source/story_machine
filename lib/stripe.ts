import Stripe from "stripe";

let client: Stripe | null = null;
export function stripe(): Stripe {
  const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!client) client = new Stripe(key);
  return client;
}

/** The three ways to pay: one story, a month, or a year. Lifetime stopped selling on 11 October 2026. */
export type Plan = "story" | "monthly" | "annual";
export const PLANS: Plan[] = ["story", "monthly", "annual"];

/** Monthly and annual are subscriptions; a story is a one-off payment. */
export function isSubscription(plan: Plan): boolean {
  return plan !== "story";
}

export function isPlan(v: unknown): v is Plan {
  return typeof v === "string" && (PLANS as string[]).includes(v);
}

// The price for each plan is found by its lookup key, so a new price made by scripts/stripe-setup.mjs
// (for example the 18 October prices: $9.99, $19.99, $149.99) takes effect without touching Vercel.
// The STRIPE_PRICE_* variables are the fallback if the lookup fails.
const LOOKUP: Record<Plan, string> = {
  story: "story_machine_story",
  monthly: "story_machine_monthly",
  annual: "story_machine_annual",
};

export async function priceId(plan: Plan): Promise<string> {
  try {
    const found = await stripe().prices.list({ lookup_keys: [LOOKUP[plan]], active: true, limit: 1 });
    if (found.data[0]?.id) return found.data[0].id;
  } catch (e) {
    console.warn("[stripe] price lookup failed", plan, e instanceof Error ? e.message : e);
  }
  const name = `STRIPE_PRICE_${plan.toUpperCase()}`;
  const id = process.env[name] ?? "";
  if (!id) throw new Error(`${name} is not set`);
  return id.trim();
}

export function siteUrl(req: Request): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin).replace(/\/$/, "");
}
