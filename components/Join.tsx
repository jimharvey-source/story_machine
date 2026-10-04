"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { clearPendingProgramme, savePendingProgramme } from "@/lib/pendingProgramme";
import { LEGAL } from "@/lib/legal";
import type { Invitation } from "@/lib/join";
import { Lockup } from "@/components/Logo";

// The welcome page for programme participants and trialists. Sign in once, at the door, and never be
// interrupted again. The code is the welcome; the email is the key to come back.

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

function storiesInWords(n: number): string {
  const w = n >= 0 && n < WORDS.length ? WORDS[n] : String(n);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)} ${n === 1 ? "story is" : "stories are"}`;
}

function Mail() {
  return (
    <a href={`mailto:${LEGAL.contact}`} className="underline decoration-rule underline-offset-4 hover:text-ink">
      {LEGAL.contact}
    </a>
  );
}

function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <>
      {/* The programme's colour bar. Ink until a programme sets its own colour. */}
      <div className="h-1 w-full bg-client" aria-hidden="true" />
      <main className={"mx-auto w-full px-5 pb-24 pt-6 " + (wide ? "max-w-6xl lg:px-10" : "max-w-xl")}>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Lockup />
          <span className="text-sm text-muted">Beta</span>
        </header>
        <div className={wide ? "pt-12 sm:pt-20" : "pt-12 sm:pt-16"}>{children}</div>
      </main>
    </>
  );
}

/** What happens next, from Jim's invitation email. */
const STEPS: Array<[string, string]> = [
  ["Get your story straight", "Paste your notes or an old deck. Find the Big Idea, three acts and the gaps."],
  ["Add interest and impact", "A Prologue and Epilogue, headlines, signposts and soundbites, with suggestions from Jim."],
  ["Take it with you", "The story as PDF or Word. Draft slides as PowerPoint, ready for your company template."],
];

function Steps() {
  return (
    <aside className="lg:pt-14">
      <p className="eyebrow mb-4">In under thirty minutes</p>
      <ol className="border-b border-rule">
        {STEPS.map(([head, sub], i) => (
          <li key={head} className="grid grid-cols-[2.5rem_1fr] gap-3 border-t border-rule py-5">
            <span className="text-[0.95rem] font-semibold text-red">{i + 1}</span>
            <span>
              <span className="block text-[1.05rem] font-semibold text-ink">{head}</span>
              <span className="mt-1 block text-[0.95rem] leading-relaxed text-ink-2">{sub}</span>
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

export function Welcome({ invitation, tour }: { invitation: Invitation; tour?: React.ReactNode }) {
  if (invitation.status === "unknown") {
    return (
      <Shell>
        <h1 className="display text-4xl leading-[1.05] sm:text-5xl">We do not recognise that address.</h1>
        <p className="mt-5 text-lg text-ink-2">Check the link you were given. If it still does not work, email <Mail />.</p>
        <p className="mt-8">
          <Link href="/" className="text-ink underline decoration-rule underline-offset-4">Go to Jim Harvey&apos;s StoryMachine</Link>
        </p>
      </Shell>
    );
  }
  if (invitation.status === "throttled") {
    return (
      <Shell>
        <h1 className="display text-4xl leading-[1.05] sm:text-5xl">Too many addresses that did not work.</h1>
        <p className="mt-5 text-lg text-ink-2">Wait an hour and try the link again, or email <Mail />.</p>
      </Shell>
    );
  }
  if (invitation.status === "closed") {
    return (
      <Shell>
        <h1 className="display text-4xl leading-[1.05] sm:text-5xl">{invitation.greeting}</h1>
        <p className="mt-5 text-lg text-ink-2">This invitation has closed.</p>
        <p className="mt-2 text-ink-2">Already joined? Sign in and your stories are waiting.</p>
        <div className="mt-8">
          <DoorSignIn next="/build" />
        </div>
        <p className="mt-8 text-sm text-ink-2">Expected to get in? Email <Mail />.</p>
      </Shell>
    );
  }
  return <OpenWelcome invitation={invitation} tour={tour} />;
}

function OpenWelcome({ invitation, tour }: { invitation: Extract<Invitation, { status: "open" }>; tour?: React.ReactNode }) {
  // Keep the code in this browser too, so it survives a wander to the home page before signing in.
  useEffect(() => {
    savePendingProgramme(invitation.code);
  }, [invitation.code]);

  return (
    <Shell wide>
      <div className="grid items-start gap-16 lg:grid-cols-2">
        <section id="signin" className="max-w-xl scroll-mt-8">
          <p className="eyebrow">Your invitation</p>
          <h1 className="display mt-4 text-[2.5rem] leading-[1.05] tracking-[-0.035em] sm:text-6xl sm:leading-none">{invitation.greeting}</h1>
          <p className="mt-6 text-lg text-ink-2 sm:text-xl">
            {storiesInWords(invitation.stories)} waiting for you{invitation.until ? `, free until ${invitation.until}` : ", free"}.
          </p>
          <div className="mt-8">
            <DoorSignIn programme={invitation.code} next="/build?joined=1" />
          </div>
          {tour && (
            <p className="mt-5 text-sm text-ink-2">
              New to the StoryMachine?{" "}
              <a href="#how" className="underline decoration-rule underline-offset-4 hover:text-ink">See how it works</a>, or read the{" "}
              <Link href="/guide" className="underline decoration-rule underline-offset-4 hover:text-ink">user guide</Link>.
            </p>
          )}
        </section>
        <Steps />
      </div>
      {tour && (
        <>
          <div id="how" className="scroll-mt-8">{tour}</div>
          {/* The close: back to the door. */}
          <section className="panel mt-20 !p-8 sm:mt-28 sm:!p-14">
            <h2 className="display max-w-2xl text-3xl leading-tight sm:text-[2.6rem]">Try it on the presentation you are worried about.</h2>
            <p className="mt-4 text-lg text-ink-2">
              {storiesInWords(invitation.stories)} waiting for you{invitation.until ? `, free until ${invitation.until}` : ", free"}.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a href="#signin" className="inline-flex items-center justify-center rounded-md bg-ink px-7 py-3.5 text-base font-medium text-paper hover:opacity-90">
                Sign in to start
              </a>
              <p className="text-sm text-muted">
                Questions? Read the{" "}
                <Link href="/guide" className="underline decoration-rule underline-offset-4 hover:text-ink">user guide</Link> or email <Mail />.
              </p>
            </div>
          </section>
        </>
      )}
    </Shell>
  );
}

/**
 * Email, then the six-digit code, on one screen. The code is the main route: it works on any device and
 * survives the link scanners in corporate mail. The link in the email is the back-up.
 * With `programme`, the code is applied the moment sign-in succeeds, so the stories are there on arrival.
 */
function DoorSignIn({ programme, next }: { programme?: string; next: string }) {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<"email" | "code" | "entering">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [after, setAfter] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stage === "code") codeRef.current?.focus();
  }, [stage]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const v = email.trim();
    if (!v) return;
    setBusy(true);
    setError(null);
    try {
      // The link's destination goes through the callback, which applies the code on the server.
      const dest = programme ? `${next}${next.includes("?") ? "&" : "?"}programme=${encodeURIComponent(programme)}` : next;
      const { error } = await supabaseBrowser().auth.signInWithOtp({
        email: v,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(dest)}` },
      });
      if (error) throw error;
      setToken("");
      setStage("code");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        /rate limit/i.test(msg)
          ? "Too many sign-in emails in the last hour. Wait a few minutes and try again."
          : /invalid/i.test(msg)
            ? "That email address does not look right. Check it and try again."
            : "The email did not send. Try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function verify(raw: string) {
    const t = raw.replace(/\D/g, "");
    if (t.length < 6) {
      setError("The code is the six-digit number in the email.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.verifyOtp({ email: email.trim(), token: t, type: "email" });
    if (error) {
      setBusy(false);
      setError("That code did not work. Use the newest email, or send a new code. Each code works once, for an hour.");
      return;
    }
    setStage("entering");
    if (programme) {
      setAfter("Adding your stories...");
      const res = await fetch("/api/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: programme }) }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!res || (!res.ok && !data.already)) {
        setBusy(false);
        setAfter(null);
        setError(`You are signed in, but your stories were not added: ${data.error ?? "the connection dropped"}. Email ${LEGAL.contact} and we will sort it out.`);
        return;
      }
      clearPendingProgramme();
    }
    window.location.assign(next);
  }

  if (stage === "entering") {
    return (
      <div className="panel">
        <p className="eyebrow">Signed in</p>
        <p className="mt-2 text-lg text-ink">{after ?? "Opening the StoryMachine..."}</p>
        {error && (
          <>
            <p className="mt-3 text-sm text-red">{error}</p>
            <Link href="/build" className="mt-4 inline-block text-ink underline decoration-rule underline-offset-4">Carry on to the StoryMachine</Link>
          </>
        )}
      </div>
    );
  }

  if (stage === "code") {
    return (
      <div className="panel">
        <p className="eyebrow">Check your email</p>
        <p className="mt-2 text-ink">
          A six-digit code is on its way to <span className="font-medium">{email.trim()}</span>, from Jim Harvey&apos;s StoryMachine.
          Type it here.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verify(token);
          }}
          className="mt-5 flex flex-wrap items-center gap-3"
        >
          <input
            ref={codeRef}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="Code from the email"
            value={token}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
              // A paste or the phone's code suggestion arrives all at once: sign in straight away.
              const arrivedWhole = digits.length >= 6 && digits.length - token.replace(/\D/g, "").length >= 6;
              setToken(digits);
              if (arrivedWhole && !busy) verify(digits);
            }}
            placeholder="123456"
            className="w-44 rounded-md border border-rule px-4 py-3 font-mono text-2xl tracking-[0.3em] outline-none focus:border-ink"
          />
          <button type="submit" disabled={busy} className="rounded-md bg-ink px-5 py-3 text-base font-medium text-paper disabled:opacity-40">
            {busy ? "Checking..." : "Sign in"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red">{error}</p>}
        <p className="mt-5 text-sm text-ink-2">
          Nothing after a minute? Look in junk or spam. Work email can take a few minutes. The email also carries a link:
          tap it and you are signed in on that device.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          <button type="button" onClick={() => send()} disabled={busy} className="underline decoration-rule underline-offset-4 hover:text-ink disabled:opacity-40">
            Send a new code
          </button>
          <button
            type="button"
            onClick={() => {
              setStage("email");
              setError(null);
            }}
            className="underline decoration-rule underline-offset-4 hover:text-ink"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="panel">
      <label htmlFor="door-email" className="eyebrow">Your email address</label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          id="door-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="min-w-0 flex-1 basis-60 rounded-md border border-rule px-4 py-3 text-base outline-none focus:border-ink"
        />
        <button type="submit" disabled={busy} className="rounded-md bg-ink px-5 py-3 text-base font-medium text-paper disabled:opacity-40">
          {busy ? "Sending..." : "Send my code"}
        </button>
      </div>
      <p className="mt-3 text-sm text-ink-2">We send you a six-digit code. No password.</p>
      {error && <p className="mt-2 text-sm text-red">{error}</p>}
      <p className="mt-4 text-xs text-muted">
        Signing in adds you to the Presentation Guru list, one email a month from Jim Harvey. Unsubscribe any time.{" "}
        <Link href="/privacy" className="underline decoration-rule underline-offset-4 hover:text-ink">Privacy</Link>
      </p>
    </form>
  );
}
