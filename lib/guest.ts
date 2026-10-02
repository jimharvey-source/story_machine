import { createHash, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabase/server";
import type { Profile } from "./access";

// Stage 1 needs no sign-in. A guest is a browser cookie; their stories are claimed when they sign in.

export const GUEST_COOKIE = "sm_guest";
const YEAR = 60 * 60 * 24 * 365;

/** The guest id from the cookie, if any. */
export async function guestId(): Promise<string | null> {
  const v = (await cookies()).get(GUEST_COOKIE)?.value ?? null;
  return v && /^[0-9a-f-]{36}$/.test(v) ? v : null;
}

/** The guest id, minting one if the browser has none. Call setGuestCookie on the response when `fresh`. */
export async function guestIdOrNew(): Promise<{ id: string; fresh: boolean }> {
  const existing = await guestId();
  if (existing) return { id: existing, fresh: false };
  return { id: randomUUID(), fresh: true };
}

export function setGuestCookie(res: NextResponse, id: string) {
  res.cookies.set(GUEST_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: YEAR });
}

export async function ipHash(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  if (!ip) return null;
  return createHash("sha256").update(ip + (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")).digest("hex").slice(0, 32);
}

// Daily ceilings on free stage-1 runs. Each run costs real money, so guests and free accounts get a sensible number, not an open tap.
const GUEST_PER_DAY = 3;
const IP_PER_DAY = 12;
const FREE_ACCOUNT_PER_DAY = 6;

/**
 * Record a stage-1 run and say whether it may go ahead.
 * Paying and programme accounts are never limited here; their allowance is handled at unlock.
 */
export async function allowRun(profile: Profile | null, unlimited: boolean, guest: string | null): Promise<{ ok: true } | { ok: false; reason: string }> {
  const admin = supabaseAdmin();
  const ip = await ipHash();
  const since = new Date(Date.now() - 86400000).toISOString();
  if (!unlimited) {
    if (profile) {
      const { count } = await admin.from("runs").select("id", { count: "exact", head: true }).eq("user_id", profile.id).gte("created_at", since);
      if ((count ?? 0) >= FREE_ACCOUNT_PER_DAY) return { ok: false, reason: "account" };
    } else if (guest) {
      const { count } = await admin.from("runs").select("id", { count: "exact", head: true }).eq("guest_id", guest).gte("created_at", since);
      if ((count ?? 0) >= GUEST_PER_DAY) return { ok: false, reason: "guest" };
    }
    if (ip) {
      const { count } = await admin.from("runs").select("id", { count: "exact", head: true }).eq("ip_hash", ip).gte("created_at", since);
      if ((count ?? 0) >= IP_PER_DAY) return { ok: false, reason: "ip" };
    }
  }
  await admin.from("runs").insert({ guest_id: profile ? null : guest, user_id: profile?.id ?? null, ip_hash: ip });
  // The privacy notice says hashed addresses are kept for no more than a year. One run in fifty tidies up.
  if (Math.random() < 0.02) {
    const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString();
    await admin.from("runs").update({ ip_hash: null }).lt("created_at", yearAgo).not("ip_hash", "is", null);
    await admin.from("code_attempts").delete().lt("created_at", yearAgo);
  }
  return { ok: true };
}

export function tooManyRuns() {
  return NextResponse.json(
    { error: "That is the free stories for today. Sign in and buy a story, a month or lifetime to keep going, or come back tomorrow.", code: "limit" },
    { status: 429 }
  );
}

/** A guest's stories become theirs. Called whenever a signed-in person arrives with a guest cookie. */
export async function claimGuestStories(profile: Profile): Promise<void> {
  const guest = await guestId();
  if (!guest) return;
  const { data, error } = await supabaseAdmin().rpc("claim_stories", { p_guest: guest, p_user: profile.id });
  if (error) console.warn("[claim_stories]", error.message);
  else if (data) console.log(JSON.stringify({ tag: "claim", user: profile.id, stories: data }));
}

/**
 * Unlock a story for stage 2 and the PDF. The first is free; after that it spends a credit.
 * Returns false when the person must buy first.
 */
export async function unlockStory(profile: Profile, storyId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin().rpc("unlock_story", { p_story: storyId, p_user: profile.id });
  if (error) throw new Error(`Could not check your allowance: ${error.message}`);
  return Boolean(data);
}
