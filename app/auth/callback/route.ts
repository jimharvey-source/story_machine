import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/access";
import { redeemFor } from "@/lib/join";

// The magic link lands here. Two shapes are accepted:
//  - token_hash + type (set the Supabase "Magic Link" email template to use {{ .TokenHash }}): works in any browser,
//    including one that never saw the sign-in form.
//  - code (PKCE): works only in the browser that asked for the link, because the verifier lives in its cookie.
// Then the guest's stories are claimed, and the person goes back to the story they were on.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? "/build";
  const tokenHash = url.searchParams.get("token_hash");
  const code = url.searchParams.get("code");
  const sb = await supabaseServer();

  let error: string | null = null;
  if (tokenHash) {
    const type = (url.searchParams.get("type") ?? "magiclink") as "magiclink" | "email";
    const { error: e } = await sb.auth.verifyOtp({ token_hash: tokenHash, type });
    error = e?.message ?? null;
  } else if (code) {
    const { error: e } = await sb.auth.exchangeCodeForSession(code);
    error = e?.message ?? null;
  } else {
    error = "no code in the link";
  }
  if (error) {
    console.warn(JSON.stringify({ tag: "signin", ok: false, reason: error, shape: tokenHash ? "token_hash" : code ? "code" : "none" }));
    const why = /code verifier|code challenge/i.test(error) ? "device" : "expired";
    return NextResponse.redirect(new URL(`/build?signin=failed&why=${why}&reason=${encodeURIComponent(error)}`, url.origin));
  }

  // Where to go next. The token_hash template passes {{ .RedirectTo }}, which is this callback again with the real
  // destination in its own "next". Unwrap it, or the second hop arrives with no token and fails. Stay on this site.
  let nextUrl = new URL(next, url.origin);
  for (let i = 0; i < 3 && nextUrl.pathname === "/auth/callback"; i++) {
    nextUrl = new URL(nextUrl.searchParams.get("next") ?? "/", url.origin);
  }
  if (nextUrl.origin !== url.origin) nextUrl = new URL("/build", url.origin);
  // The tool lives at /build since the landing page took over /. Links already sent point at /.
  if (nextUrl.pathname === "/") nextUrl.pathname = "/build";

  // Claim the stories made before signing in. The guest id travels in the link, so this works in any browser.
  const claim = nextUrl.searchParams.get("claim");
  const { data } = await sb.auth.getUser();
  // The profile has to exist before stories can point at it.
  if (data.user?.email) await ensureProfile({ id: data.user.id, email: data.user.email }).catch((e) => console.warn("[profile]", e instanceof Error ? e.message : e));
  if (claim && data.user && /^[0-9a-f-]{36}$/.test(claim)) {
    const { data: n, error: ce } = await supabaseAdmin().rpc("claim_stories", { p_guest: claim, p_user: data.user.id });
    if (ce) console.warn("[claim_stories]", ce.message);
    else console.log(JSON.stringify({ tag: "claim", user: data.user.id, stories: n }));
  }
  nextUrl.searchParams.delete("claim");
  // A programme code carried through the link (from the welcome page, or an old ?programme= link): apply it here,
  // on the server, so the stories are on the account when the page opens.
  const programme = nextUrl.searchParams.get("programme");
  nextUrl.searchParams.delete("programme");
  if (programme && data.user) {
    const r = await redeemFor(data.user.id, programme).catch(() => null);
    if (r && (r.ok || r.already)) nextUrl.searchParams.set("joined", "1");
    else {
      nextUrl.searchParams.delete("joined");
      nextUrl.searchParams.set("joinerror", r && !r.ok && r.throttled ? "throttled" : "failed");
    }
  }
  console.log(JSON.stringify({ tag: "signin", ok: true, shape: tokenHash ? "token_hash" : "code" }));
  return NextResponse.redirect(nextUrl);
}
