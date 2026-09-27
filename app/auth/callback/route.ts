import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

// The magic link lands here. Two shapes are accepted:
//  - token_hash + type (set the Supabase "Magic Link" email template to use {{ .TokenHash }}): works in any browser,
//    including one that never saw the sign-in form.
//  - code (PKCE): works only in the browser that asked for the link, because the verifier lives in its cookie.
// Then the guest's stories are claimed, and the person goes back to the story they were on.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? "/";
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
    return NextResponse.redirect(new URL(`/?signin=failed&reason=${encodeURIComponent(error)}`, url.origin));
  }

  // Claim the stories made before signing in. The guest id travels in the link, so this works in any browser.
  const nextUrl = new URL(next, url.origin);
  const claim = nextUrl.searchParams.get("claim");
  const { data } = await sb.auth.getUser();
  if (claim && data.user && /^[0-9a-f-]{36}$/.test(claim)) {
    const { data: n, error: ce } = await supabaseAdmin().rpc("claim_stories", { p_guest: claim, p_user: data.user.id });
    if (ce) console.warn("[claim_stories]", ce.message);
    else console.log(JSON.stringify({ tag: "claim", user: data.user.id, stories: n }));
  }
  nextUrl.searchParams.delete("claim");
  console.log(JSON.stringify({ tag: "signin", ok: true, shape: tokenHash ? "token_hash" : "code" }));
  return NextResponse.redirect(nextUrl);
}
