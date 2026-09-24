import Stripe from "stripe";

let client: Stripe | null = null;
export function stripe(): Stripe {
  const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!client) client = new Stripe(key);
  return client;
}

/** The three ways to pay: one story, a month of stories, or lifetime. */
export type Plan = "story" | "monthly" | "lifetime";
export const PLANS: Plan[] = ["story", "monthly", "lifetime"];

export function isPlan(v: unknown): v is Plan {
  return typeof v === "string" && (PLANS as string[]).includes(v);
}

export function priceId(plan: Plan): string {
  const name = `STRIPE_PRICE_${plan.toUpperCase()}`;
  const id = process.env[name] ?? "";
  if (!id) throw new Error(`${name} is not set`);
  return id.trim();
}

export function siteUrl(req: Request): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin).replace(/\/$/, "");
}
