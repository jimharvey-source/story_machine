import { NextResponse, after } from "next/server";
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
  return ensureProfile({ id: user.id, email: user.email });
}

/**
 * The inbox an address really reaches: no +tag, and for Gmail no dots.
 * jim+a@gmail.com, jim+b@gmail.com and j.i.m@gmail.com are one inbox, so one free story.
 * Keep in step with supabase/migrations/20261002_email_canonical.sql.
 */
export function canonicalEmail(email: string): string {
  const [local = "", domain = ""] = email.trim().toLowerCase().split("@");
  const base = local.split("+")[0];
  if (domain === "gmail.com" || domain === "googlemail.com") return `${base.replace(/\./g, "")}@gmail.com`;
  return `${base}@${domain}`;
}

/** The profile for a signed-in user, created (and subscribed to the list) on first sight. */
export async function ensureProfile(user: { id: string; email: string }): Promise<Profile> {
  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (existing) return existing as Profile;
  // The free story belongs to the inbox, not the address. A second account on the same inbox starts
  // with it already spent (stories_started 1), so it can still buy, or use a programme code.
  const email_canonical = canonicalEmail(user.email);
  const { count: siblings } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("email_canonical", email_canonical);
  const { data: created, error } = await admin
    .from("profiles")
    .insert({ id: user.id, email: user.email, email_canonical, stories_started: (siblings ?? 0) > 0 ? 1 : 0 })
    .select("*")
    .single();
  if (error) {
    // Two requests on first sign-in can race to create it. If the other one won, use its row.
    const { data: again } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (again) return again as Profile;
    throw new Error(`Could not create profile: ${error.message}`);
  }
  // First sign-in: join the Presentation Guru list. Never blocks the user.
  // after() keeps the function alive until this finishes: a bare promise is cut off when the response
  // is sent, which is how jghatherton+sm1 (2 October) signed in and never reached the list.
  after(async () => {
    try {
      const ok = await subscribeToPresentationGuru(user.email);
      if (ok) await admin.from("profiles").update({ mailchimp_subscribed_at: new Date().toISOString() }).eq("id", user.id);
    } catch (e) {
      console.warn("[mailchimp]", e instanceof Error ? e.message : e);
    }
  });
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
  return NextResponse.json({ error: "Sign in to use the StoryMachine.", code: "signin" }, { status: 401 });
}

export function purchaseRequired() {
  return NextResponse.json(
    { error: "Your free story is used. Buy this story, a month, or lifetime access to carry on.", code: "buy" },
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
