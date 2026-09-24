import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseServer } from "./supabase/server";
import { subscribeToPresentationGuru } from "./mailchimp";

export type Profile = {
  id: string;
  email: string;
  plan: "free" | "pro" | "lifetime";
  plan_source: "stripe" | "code" | "manual" | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cohort_code: string | null;
  story_credits: number;
  stories_started: number;
};

/** The signed-in user's profile, created on first sight. Null when nobody is signed in. */
export async function currentProfile(): Promise<Profile | null> {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user || !user.email) return null;
  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (existing) return existing as Profile;
  const { data: created, error } = await admin
    .from("profiles")
    .insert({ id: user.id, email: user.email })
    .select("*")
    .single();
  if (error) throw new Error(`Could not create profile: ${error.message}`);
  // First sign-in: join the Presentation Guru list. Never blocks the user.
  subscribeToPresentationGuru(user.email)
    .then((ok) => {
      if (ok) admin.from("profiles").update({ mailchimp_subscribed_at: new Date().toISOString() }).eq("id", user.id).then(() => {});
    })
    .catch((e) => console.warn("[mailchimp]", e instanceof Error ? e.message : e));
  return created as Profile;
}

/**
 * Unlimited stories: lifetime, or a monthly subscription (or programme code) whose period has not ended.
 * Everyone else has one free story plus any single-story credits they have bought.
 */
export function isUnlimited(p: Profile | null): boolean {
  if (!p) return false;
  if (p.plan === "lifetime") return true;
  if (p.plan !== "pro") return false;
  if (p.current_period_end && new Date(p.current_period_end).getTime() < Date.now() - 3 * 86400000) return false;
  return true;
}

/** Stories this person may still start before they have to buy. Null means unlimited. */
export function storiesLeft(p: Profile): number | null {
  if (isUnlimited(p)) return null;
  return Math.max(0, 1 + (p.story_credits ?? 0) - (p.stories_started ?? 0));
}

/**
 * Spend the free story or a credit, atomically. Returns false when the person must buy first.
 * Everything that happens to a story once it exists (land, edit, refine, upload, PDF) is free.
 */
export async function startStory(p: Profile): Promise<boolean> {
  const { data, error } = await supabaseAdmin().rpc("start_story", { p_user: p.id });
  if (error) throw new Error(`Could not check your allowance: ${error.message}`);
  return Boolean(data);
}

/** Undo startStory when generation failed. Never throws. */
export async function refundStory(p: Profile): Promise<void> {
  const { error } = await supabaseAdmin().rpc("refund_story", { p_user: p.id });
  if (error) console.warn("[refund_story]", error.message);
}

export function signInRequired() {
  return NextResponse.json({ error: "Sign in to use the Story Machine.", code: "signin" }, { status: 401 });
}

export function purchaseRequired() {
  return NextResponse.json(
    { error: "Your free story is used. Buy a single story, a month, or lifetime access to start another.", code: "buy" },
    { status: 402 }
  );
}

export async function logGeneration(
  userId: string | null,
  kind: "story" | "land" | "edit" | "refine" | "extract",
  meta?: { attempts?: number; violationsBefore?: number; violationsAfter?: number }
) {
  try {
    await supabaseAdmin().from("generations").insert({
      user_id: userId,
      kind,
      attempts: meta?.attempts ?? null,
      violations_before: meta?.violationsBefore ?? null,
      violations_after: meta?.violationsAfter ?? null,
    });
  } catch (e) {
    console.warn("[generations]", e instanceof Error ? e.message : e);
  }
}
