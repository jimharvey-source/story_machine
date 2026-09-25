"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export type Me = {
  signedIn: boolean;
  email?: string;
  plan?: "free" | "pro" | "lifetime";
  unlimited?: boolean;
  /** Stories still to start before buying. Null means unlimited. */
  storiesLeft?: number | null;
  storiesStarted?: number;
  planSource?: "stripe" | "code" | "manual" | null;
  periodEnd?: string | null;
  cohortCode?: string | null;
  stripeCustomer?: boolean;
  subscribed?: boolean;
};

export const PRICES = {
  story: { label: "One story", price: "$2.99", note: "This story, for as long as you keep it." },
  monthly: { label: "A month", price: "$15.99", note: "As many as you need. Cancel any time." },
  lifetime: { label: "Lifetime", price: "$99", note: "Every story you ever tell. One payment." },
  launch: "$49",
} as const;

export type PlanKey = "story" | "monthly" | "lifetime";


/** One line on where this person stands. */
export function planLine(me: Me): string {
  if (me.plan === "lifetime") return "Lifetime";
  if (me.unlimited) return me.planSource === "code" ? "Programme" : "Monthly";
  const left = me.storiesLeft ?? 0;
  if (left === 0) return "No stories left";
  if (left === 1 && !me.storiesStarted) return "One free story";
  return `${left} ${left === 1 ? "story" : "stories"} left`;
}

export function SignIn({ compact }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!v) return;
    setBusy(true);
    setError(null);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.signInWithOtp({
        email: v,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the link");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-md border border-rule bg-paper-2 p-5">
        <p className="eyebrow">Check your email</p>
        <p className="mt-2 text-ink">
          A sign-in link is on its way to <span className="font-medium">{email}</span>. Open it on this device and you
          come straight back here.
        </p>
        <p className="mt-2 text-sm text-muted">Nothing arrived after a minute? Look in spam, or send it again.</p>
        <button type="button" onClick={() => setSent(false)} className="mt-3 text-sm text-muted underline decoration-rule underline-offset-4 hover:text-ink">
          Send it again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={send} className={compact ? "flex flex-wrap items-end gap-2" : "rounded-md border border-rule bg-paper-2 p-5"}>
      {!compact && (
        <>
          <p className="eyebrow">Sign in to find your story</p>
          <p className="mt-2 text-ink">
            Your first story is free, the whole thing. Enter your email and we send you a link. No password to remember.
          </p>
        </>
      )}
      <div className={compact ? "flex flex-wrap items-center gap-2" : "mt-4 flex flex-wrap items-center gap-2"}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-64 max-w-full rounded-md border border-rule bg-paper-2 px-3 py-2.5 text-base outline-none focus:border-ink"
        />
        <button type="submit" disabled={busy} className="rounded-md bg-ink px-4 py-2.5 text-base font-medium text-paper disabled:opacity-40">
          {busy ? "Sending..." : "Send me a link"}
        </button>
      </div>
      {!compact && (
        <p className="mt-3 text-xs text-muted">
          Signing in adds you to the Presentation Guru list, one email a month from Jim Harvey. Unsubscribe any time.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red">{error}</p>}
    </form>
  );
}

function CodeForm({ onDone, className }: { onDone: (label: string) => void; className?: string }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setCode("");
      onDone(data.label);
    } else setError(data.error || "That code did not work");
  }

  return (
    <form onSubmit={redeem} className={className ?? "flex flex-wrap items-center gap-2"}>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="CODE"
        aria-label="Programme code"
        className="w-36 rounded-md border border-rule bg-paper-2 px-3 py-1.5 font-mono text-sm tracking-[0.12em] text-ink outline-none focus:border-ink"
      />
      <button type="submit" disabled={busy || !code.trim()} className="rounded-md border border-ink px-3 py-1.5 font-body text-sm normal-case tracking-normal text-ink disabled:opacity-40">
        {busy ? "Checking..." : "Unlock"}
      </button>
      {error && <span className="w-full font-body text-sm normal-case tracking-normal text-red">{error}</span>}
    </form>
  );
}

export function AccountBar({ me, onChange, onOpenStories }: { me: Me; onChange: () => void; onOpenStories: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function signOut() {
    setBusy("out");
    await fetch("/api/me", { method: "DELETE" });
    onChange();
    setBusy(null);
  }

  async function portal() {
    setBusy("portal");
    const res = await fetch("/api/portal", { method: "POST" });
    const data = await res.json();
    setBusy(null);
    if (data.url) window.location.assign(data.url);
    else setMsg(data.error || "Could not open billing");
  }

  if (!me.signedIn) return null;
  const line = planLine(me);
  return (
    <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule pb-4 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted">
      <span className="normal-case tracking-normal font-body text-sm text-ink">{me.email}</span>
      <span className={me.unlimited ? "text-red" : ""}>{line}</span>
      <button type="button" onClick={onOpenStories} className="underline decoration-rule underline-offset-4 hover:text-ink">
        My stories
      </button>
      {me.stripeCustomer && (
        <button type="button" onClick={portal} disabled={busy !== null} className="underline decoration-rule underline-offset-4 hover:text-ink">
          Billing
        </button>
      )}
      {me.plan !== "lifetime" && (
        <button type="button" onClick={() => setShowCode((v) => !v)} className="underline decoration-rule underline-offset-4 hover:text-ink">
          Programme code
        </button>
      )}
      <button type="button" onClick={signOut} disabled={busy !== null} className="underline decoration-rule underline-offset-4 hover:text-ink">
        Sign out
      </button>
      {showCode && (
        <CodeForm
          className="flex w-full flex-wrap items-center gap-2 pt-1"
          onDone={(label) => {
            setMsg(`Unlocked. ${label}.`);
            setShowCode(false);
            onChange();
          }}
        />
      )}
      {msg && <span className="w-full font-body text-sm normal-case tracking-normal text-ink">{msg}</span>}
    </div>
  );
}

/**
 * Shown when the free story is used and the person starts another.
 * Three ways in: one story, a month, or lifetime. Programme codes underneath.
 */
export function Paywall({ me, onChange }: { me: Me; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function checkout(plan: PlanKey) {
    setBusy(plan);
    setMsg(null);
    const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
    const data = await res.json();
    setBusy(null);
    if (data.url) window.location.assign(data.url);
    else setMsg(data.error || "Could not start checkout");
  }

  const started = me.storiesStarted ?? 0;
  return (
    <section className="rounded-md border border-ink bg-paper-2 p-6 sm:p-8">
      <p className="eyebrow">{started > 0 ? "Your free story is used" : "Ready for the next one"}</p>
      <h2 className="display mt-2 text-2xl sm:text-3xl">Every story after the first is a paid story.</h2>
      <p className="mt-3 max-w-xl text-ink-2">
        The same machine each time: audience, argument, Big Idea, three acts, then the Prologue, signposts, slides,
        Epilogue and the story in five lines. Edits, the strategist, document upload, saved stories and the PDF brief
        come with every story.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {(["story", "monthly", "lifetime"] as PlanKey[]).map((k) => {
          const p = PRICES[k];
          const featured = k === "lifetime";
          return (
            <button
              key={k}
              type="button"
              onClick={() => checkout(k)}
              disabled={busy !== null}
              className={
                "flex flex-col items-start rounded-md border p-4 text-left transition disabled:opacity-40 " +
                (featured ? "border-ink bg-ink text-paper hover:opacity-90" : "border-rule bg-paper hover:border-ink")
              }
            >
              <span className={"eyebrow " + (featured ? "text-paper/70" : "")}>{p.label}</span>
              <span className="display mt-1 text-3xl">{busy === k ? "Opening..." : p.price}</span>
              <span className={"mt-2 text-sm " + (featured ? "text-paper/80" : "text-muted")}>{p.note}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">Card payments through Stripe. Offer codes go in at checkout. Cancel a month from the billing page.</p>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-rule pt-4">
        <span className="text-sm text-muted">On a programme? Your code gives you your stories.</span>
        <CodeForm
          onDone={(label) => {
            setMsg(`Unlocked. ${label}.`);
            onChange();
          }}
        />
      </div>
      {msg && <p className="mt-3 text-sm text-ink">{msg}</p>}
      <p className="mt-4 text-xs text-muted">Signed in as {me.email}.</p>
    </section>
  );
}
