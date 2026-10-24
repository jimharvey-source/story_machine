"use client";

import { useCallback, useEffect, useState } from "react";
import type { CodeRow } from "@/lib/codes";

// The Codes page console: make a personal or group code, copy its link, see who has joined, switch a code off.

function threeMonths(): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + 3);
  return d.toISOString().slice(0, 10);
}
function shortDate(iso: string | null): string {
  if (!iso) return "No end date";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
function linkFor(c: { code: string; slug: string | null }): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return c.slug ? `${origin}/${c.slug}` : `${origin}/join/${c.code}`;
}

// The name to show: the one typed on this page, or for older codes the greeting without "Welcome".
function title(c: CodeRow): string {
  const m = c.label?.match(/^(?:Personal|Group): (.+)$/);
  if (m) return m[1];
  return c.greeting?.replace(/^Welcome(, | to the )?/, "").replace(/\.$/, "") || c.label || c.code;
}

const input = "w-full rounded-md border border-rule bg-paper-2 px-3 py-2.5 text-base outline-none focus:border-ink";
const button = "rounded-md bg-ink px-4 py-2.5 text-base font-medium text-paper disabled:opacity-40";
const quiet = "text-sm text-muted underline decoration-rule underline-offset-4 hover:text-ink";

function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={quiet}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          window.prompt("Copy this:", text);
        }
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

export function CodesConsole() {
  const [codes, setCodes] = useState<CodeRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [type, setType] = useState<"personal" | "group">("personal");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [places, setPlaces] = useState("20");
  const [until, setUntil] = useState(threeMonths());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ code: string; slug: string | null; name: string } | null>(null);
  const [show, setShow] = useState<"open" | "all">("open");
  const [open, setOpen] = useState<string | null>(null);

  // Bump `tick` to reload the list.
  const [tick, setTick] = useState(0);
  const load = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    let alive = true;
    fetch("/api/codes", { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Could not load the codes.");
        if (alive) {
          setCodes(j.codes);
          setLoadError(null);
        }
      })
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : "Could not load the codes."));
    return () => {
      alive = false;
    };
  }, [tick]);

  function onName(v: string) {
    setName(v);
    if (!slugTouched) setSlug(v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 31));
  }

  async function make(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMade(null);
    const body =
      type === "personal"
        ? { type, name, email: email.trim() || undefined, until }
        : { type, name, slug, places: Number(places), until };
    try {
      const r = await fetch("/api/codes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Could not make the code.");
      setMade({ code: j.code, slug: j.slug, name });
      setName("");
      setEmail("");
      setSlug("");
      setSlugTouched(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make the code.");
    } finally {
      setBusy(false);
    }
  }

  async function change(code: string, patch: { active?: boolean; places?: number }) {
    const r = await fetch("/api/codes", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, ...patch }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) window.alert(j.error ?? "Could not change the code.");
    load();
  }

  const isOpen = (c: CodeRow) => c.state === "Open";
  const shown = (codes ?? []).filter((c) => show === "all" || isOpen(c));

  return (
    <div className="mt-8 space-y-10">
      <section className="panel p-6 sm:p-8">
        <h2 className="display text-2xl">Make a code</h2>
        <div className="mt-4 flex gap-2" role="tablist">
          {(["personal", "group"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={type === t}
              onClick={() => { setType(t); setError(null); setMade(null); }}
              className={`rounded-md border px-4 py-2 text-sm font-medium ${type === t ? "border-ink bg-ink text-paper" : "border-rule bg-paper-2 text-ink"}`}
            >
              {t === "personal" ? "For one person" : "For a group"}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">
          {type === "personal"
            ? "One person, one use. Their page greets them by first name: “Welcome, Sarah.”"
            : "A short address for a programme or team, with a number of places: “Welcome to the Acme programme.”"}
        </p>
        <form onSubmit={make} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">{type === "personal" ? "Their name" : "Organisation or programme"}</span>
            <input className={`${input} mt-1`} value={name} onChange={(e) => onName(e.target.value)} placeholder={type === "personal" ? "Sarah Jones" : "Acme"} required maxLength={type === "personal" ? 80 : 60} />
          </label>
          {type === "personal" ? (
            <label className="block">
              <span className="text-sm font-medium">Their email <span className="font-normal text-muted">(optional, for your records)</span></span>
              <input className={`${input} mt-1`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sarah@company.com" />
            </label>
          ) : (
            <>
              <label className="block">
                <span className="text-sm font-medium">Address</span>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-sm text-muted">storymachine…/</span>
                  <input className={input} value={slug} onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugTouched(true); }} placeholder="acme" required maxLength={31} />
                </div>
              </label>
              <label className="block">
                <span className="text-sm font-medium">Places</span>
                <input className={`${input} mt-1`} type="number" min={1} max={500} value={places} onChange={(e) => setPlaces(e.target.value)} required />
              </label>
            </>
          )}
          <label className="block">
            <span className="text-sm font-medium">Join by</span>
            <input className={`${input} mt-1`} type="date" value={until} onChange={(e) => setUntil(e.target.value)} required />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy || !name.trim()} className={button}>{busy ? "Making..." : "Make the code"}</button>
            {error && <p className="mt-3 text-sm text-red">{error}</p>}
          </div>
        </form>
        {made && (
          <div className="mt-6 rounded-md border border-ink bg-paper-2 p-5">
            <p className="eyebrow">Ready to send</p>
            <p className="mt-2 text-ink">
              {made.slug ? `The ${made.name} page` : `${made.name}'s page`} is live:{" "}
              <a className="break-all font-medium underline decoration-rule underline-offset-4" href={linkFor(made)} target="_blank" rel="noreferrer">{linkFor(made)}</a>
            </p>
            <p className="mt-1 text-sm text-muted">Code <span className="font-mono tracking-[0.08em]">{made.code}</span>. They open the link, type their email and the six-digit code we send, and their stories are waiting.</p>
            <div className="mt-3 flex gap-4"><CopyButton text={linkFor(made)} /></div>
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="display text-2xl">Your codes</h2>
          <div className="flex gap-4 text-sm">
            <button type="button" onClick={() => setShow("open")} className={show === "open" ? "font-medium text-ink" : quiet}>Open</button>
            <button type="button" onClick={() => setShow("all")} className={show === "all" ? "font-medium text-ink" : quiet}>All, including closed</button>
          </div>
        </div>
        {loadError && <p className="mt-3 text-sm text-red">{loadError}</p>}
        {!codes && !loadError && <p className="mt-3 text-sm text-muted">Loading...</p>}
        {codes && shown.length === 0 && <p className="mt-3 text-sm text-muted">No codes here yet.</p>}
        <ul className="mt-4 space-y-3">
          {shown.map((c) => {
            const live = isOpen(c);
            const state = c.state;
            return (
              <li key={c.code} className="rounded-md border border-rule bg-paper-2 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{title(c)}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {c.kind === "group" ? "Group" : "Personal"} · <span className="font-mono tracking-[0.06em]">{c.code}</span> · {c.storiesEach} stories each · join by {shortDate(c.until)}
                      {c.createdBy ? ` · made by ${c.createdBy}` : ""}
                    </p>
                    <p className="mt-1 break-all text-sm">
                      <a className="underline decoration-rule underline-offset-4" href={linkFor(c)} target="_blank" rel="noreferrer">{linkFor(c)}</a>
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className={`text-sm font-medium ${live ? "text-ink" : "text-muted"}`}>{state}</p>
                    <p className="text-sm text-muted">{c.uses} of {c.places ?? "unlimited"} joined</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                  <CopyButton text={linkFor(c)} />
                  {c.people.length > 0 && (
                    <button type="button" className={quiet} onClick={() => setOpen(open === c.code ? null : c.code)}>
                      {open === c.code ? "Hide who joined" : `Who joined (${c.people.length})`}
                    </button>
                  )}
                  {c.kind === "group" && c.active && (
                    <button
                      type="button"
                      className={quiet}
                      onClick={() => {
                        const v = window.prompt(`Places for ${c.code} (at least ${Math.max(1, c.uses)}):`, String(c.places ?? ""));
                        if (v) change(c.code, { places: Number(v) });
                      }}
                    >
                      Change places
                    </button>
                  )}
                  <button
                    type="button"
                    className={quiet}
                    onClick={() => {
                      if (c.active && !window.confirm(`Switch off ${c.code}? Nobody new can join with it. People already in keep their stories.`)) return;
                      change(c.code, { active: !c.active });
                    }}
                  >
                    {c.active ? "Switch off" : "Switch on"}
                  </button>
                </div>
                {open === c.code && (
                  <table className="mt-3 w-full text-left text-sm">
                    <thead className="text-muted">
                      <tr><th className="py-1 pr-3 font-normal">Email</th><th className="py-1 pr-3 font-normal">Stories</th><th className="py-1 pr-3 font-normal">Finished</th><th className="py-1 font-normal">Last story</th></tr>
                    </thead>
                    <tbody>
                      {c.people.map((p) => (
                        <tr key={p.email} className="border-t border-rule">
                          <td className="break-all py-1.5 pr-3">{p.email}</td>
                          <td className="py-1.5 pr-3">{p.stories}</td>
                          <td className="py-1.5 pr-3">{p.finished}</td>
                          <td className="py-1.5">{p.lastStory ? shortDate(p.lastStory) : "None yet"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-muted">
          “Finished” means Stage 2 is done. A person is listed under the last code they used. Stories never lapse: the join-by date only closes sign-up.
        </p>
      </section>
    </div>
  );
}
