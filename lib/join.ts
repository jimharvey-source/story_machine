import { ipHash } from "./guest";
import { supabaseAdmin } from "./supabase/server";

// The way in for programme participants and trialists: a short address per cohort (/givaudan) or
// /join/CODE for single-use codes. Read before sign-in, so it shows only what a welcome needs:
// the greeting, the stories and the end date. Never the use count, never the internal label.

export type Invitation =
  | { status: "open"; code: string; greeting: string; banner: string; stories: number; until: string | null }
  | { status: "closed"; code: string; greeting: string; banner: string; why: "expired" | "full" }
  | { status: "unknown" }
  | { status: "throttled" };

// Wrong codes and unknown addresses share one count: ten an hour per account, twenty per address.
const PER_USER_PER_HOUR = 10;
const PER_IP_PER_HOUR = 20;
const HOUR = 60 * 60 * 1000;

async function tooManyFailures(userId: string | null, ip: string | null): Promise<boolean> {
  const admin = supabaseAdmin();
  const since = new Date(Date.now() - HOUR).toISOString();
  if (userId) {
    const { count } = await admin.from("code_attempts").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since);
    if ((count ?? 0) >= PER_USER_PER_HOUR) return true;
  }
  if (ip) {
    const { count } = await admin.from("code_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ip).gte("created_at", since);
    if ((count ?? 0) >= PER_IP_PER_HOUR) return true;
  }
  return false;
}

async function logFailure(userId: string | null, ip: string | null) {
  await supabaseAdmin().from("code_attempts").insert({ user_id: userId, ip_hash: ip });
}

/** "31 March 2027". Codes end at 23:59:59 UTC, so read the date in UTC. */
export function untilDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Look up an invitation by its short address or its code. Unknown keys count as failed guesses. */
export async function lookupInvitation(key: string, by: "slug" | "code"): Promise<Invitation> {
  const ip = await ipHash();
  if (await tooManyFailures(null, ip)) return { status: "throttled" };
  const value = by === "slug" ? key.trim().toLowerCase() : key.replace(/\s+/g, "").toUpperCase();
  const ok = by === "slug" ? /^[a-z0-9][a-z0-9-]{1,30}$/.test(value) : /^[A-Z0-9-]{3,32}$/.test(value);
  if (!ok) return { status: "unknown" };
  const { data } = await supabaseAdmin()
    .from("cohort_codes")
    .select("code, greeting, banner, max_uses, uses, active, expires_at, stories_per_user")
    .eq(by, value)
    .maybeSingle();
  if (!data || !data.active) {
    await logFailure(null, ip);
    return { status: "unknown" };
  }
  const greeting = data.greeting ?? "Welcome.";
  const banner = data.banner ?? "Your programme";
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return { status: "closed", code: data.code, greeting, banner, why: "expired" };
  if (data.max_uses !== null && data.uses >= data.max_uses) return { status: "closed", code: data.code, greeting, banner, why: "full" };
  return { status: "open", code: data.code, greeting, banner, stories: data.stories_per_user, until: untilDate(data.expires_at) };
}

/**
 * Apply a programme code to a signed-in account, with the guessing throttle.
 * Re-entering a code you already hold is not a failed guess, and reports `already`.
 */
export async function redeemFor(userId: string, rawCode: string): Promise<{ ok: true; message: string } | { ok: false; already?: boolean; throttled?: boolean; error: string }> {
  const code = rawCode.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9-]{3,32}$/.test(code)) return { ok: false, error: "A programme code is letters, numbers and a dash, for example ABCD-12XY" };
  const ip = await ipHash();
  if (await tooManyFailures(userId, ip)) {
    return { ok: false, throttled: true, error: "Too many codes that did not work. Wait an hour, or ask whoever gave you the code to check it." };
  }
  const { data, error } = await supabaseAdmin().rpc("redeem_code", { p_user: userId, p_code: code });
  if (error) {
    const message = error.message.replace(/^.*?: /, "");
    const already = /already used/i.test(message);
    if (!already) await logFailure(userId, ip);
    return { ok: false, already, error: message };
  }
  return { ok: true, message: String(data ?? "Your stories are on your account") };
}

/** The banner for a signed-in person's programme, if their code is still running. */
export async function programmeBanner(code: string | null): Promise<string | null> {
  if (!code) return null;
  const { data } = await supabaseAdmin().from("cohort_codes").select("banner, expires_at").eq("code", code).maybeSingle();
  if (!data?.banner) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data.banner;
}
