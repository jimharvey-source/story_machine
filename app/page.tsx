"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Landing, Story } from "@/lib/schema";
import { Editable, EditableList } from "@/components/Editable";
import { Refine, type ChatMessage } from "@/components/Refine";
import { AccountBar, Paywall, SignIn, type Me } from "@/components/Account";
import { StoriesPanel } from "@/components/Stories";

const DRAFT_KEY = "storymachine.draft";

type Register = "formal" | "business" | "conversational";
const REGISTERS: Array<{ value: Register; label: string; hint: string }> = [
  {
    value: "formal",
    label: "Formal",
    hint: "No contractions, no rhetorical questions",
  },
  {
    value: "business",
    label: "Business",
    hint: "Direct. Spoken sections may use contractions",
  },
  {
    value: "conversational",
    label: "Conversational",
    hint: "Plain, warm, short sentences",
  },
];

type Meta = {
  model: string;
  attempts: number;
  violationsBefore: number;
  violationsAfter: number;
  unresolved: string[];
};
type ActKey = "why" | "how" | "what";
const ACTS: Array<{ key: ActKey; n: string; word: string; job: string }> = [
  { key: "why", n: "Act 1", word: "Why", job: "the hook" },
  { key: "how", n: "Act 2", word: "How", job: "the response" },
  { key: "what", n: "Act 3", word: "What", job: "the ask" },
];

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: { error?: string } & T;
  try {
    data = JSON.parse(text);
  } catch {
    if (res.status === 504)
      throw new Error(
        "That took too long and the server gave up. Try again; shorter notes finish faster.",
      );
    throw new Error(
      `The server replied with an error (${res.status}). ${text.slice(0, 120)}`,
    );
  }
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data as T;
}

// Immutable deep set for dotted paths.
function setIn<T>(obj: T, path: string[], value: unknown): T {
  if (path.length === 0) return value as T;
  const [k, ...rest] = path;
  const o = obj as unknown as Record<string, unknown>;
  return { ...o, [k]: setIn(o[k], rest, value) } as unknown as T;
}

export default function Home() {
  const [notes, setNotes] = useState("");
  const [audience, setAudience] = useState("");
  const [intent, setIntent] = useState("");
  const [register, setRegister] = useState<Register>("business");
  const [story, setStory] = useState<Story | null>(null);
  const [landing, setLanding] = useState<Landing | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [needSignIn, setNeedSignIn] = useState(false);
  const [showStories, setShowStories] = useState(false);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const saveTimer = useRef<number | null>(null);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      const data = (await res.json()) as Me;
      setMe(data);
      if (data.signedIn) setNeedSignIn(false);
    } catch {
      setMe({ signedIn: false });
    }
  }, []);

  // On load: restore the draft (it survives the magic-link round trip), read the account, handle Stripe's return.
  useEffect(() => {
    // Restore after hydration, so the server-rendered empty form and the client agree first.
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (typeof d.notes === "string") setNotes(d.notes);
        if (typeof d.audience === "string") setAudience(d.audience);
        if (typeof d.intent === "string") setIntent(d.intent);
        if (
          d.register === "formal" ||
          d.register === "business" ||
          d.register === "conversational"
        )
          setRegister(d.register);
      } catch {
        // storage unavailable; carry on
      }
    });
    const params = new URLSearchParams(window.location.search);
    const timer = window.setTimeout(() => {
      if (params.get("checkout") === "success" && params.get("session_id")) {
        fetch("/api/checkout/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: params.get("session_id") }),
        })
          .then((r) => r.json())
          .then((d) => {
            setNotice(
              d.ok
                ? d.kind === "lifetime"
                  ? "Payment received. The Story Machine is yours for good."
                  : d.kind === "monthly"
                    ? "Payment received. A month of stories starts now."
                    : "Payment received. Your next story is ready to start."
                : "Payment is being confirmed. Reload in a moment if it has not appeared.",
            );
            return loadMe();
          })
          .catch(() => loadMe());
      } else if (params.get("checkout") === "cancelled") {
        setNotice("Checkout cancelled. Your story is still here.");
        loadMe();
      } else if (params.get("signin") === "failed") {
        setNotice(
          "That sign-in link did not work. Links expire after an hour and work once. Send a new one.",
        );
        loadMe();
      } else {
        loadMe();
      }
      if (params.toString())
        window.history.replaceState({}, "", window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMe]);

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ notes, audience, intent, register }),
      );
    } catch {
      // ignore
    }
  }, [notes, audience, intent, register]);

  const signedIn = Boolean(me?.signedIn);
  const mustBuy = Boolean(me && me.signedIn && !me.unlimited && (me.storiesLeft ?? 0) === 0);

  // Autosave, a moment after the last change. Every story is saved.
  useEffect(() => {
    if (!signedIn || !story) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const data = await postJson<{ id: string }>("/api/stories", {
          id: storyId ?? undefined,
          title: story.bigIdea.slice(0, 160),
          notes,
          audience,
          intent,
          register,
          story,
          landing,
        });
        setStoryId(data.id);
        setSaveState("saved");
      } catch {
        setSaveState("failed");
      }
    }, 1500);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [signedIn, story, landing, notes, audience, intent, register, storyId]);

  function handleApiError(e: unknown, fallback: string) {
    const message = e instanceof Error ? e.message : fallback;
    if (/Sign in to use/.test(message)) {
      setNeedSignIn(true);
      setError(null);
      return;
    }
    if (/free story is used/.test(message)) {
      setShowPaywall(true);
      setError(null);
      loadMe();
      return;
    }
    setError(message);
  }

  async function openStory(id: string) {
    try {
      const d = await postJson<never>(`/api/stories/${id}`, undefined).catch(
        async () => {
          const r = await fetch(`/api/stories/${id}`);
          const j = await r.json();
          if (!r.ok) throw new Error(j.error || "Could not open");
          return j;
        },
      );
      const s = d as unknown as {
        id: string;
        notes: string;
        audience: string;
        intent: string;
        register: Register;
        story: Story;
        landing: Landing | null;
      };
      setNotes(s.notes);
      setAudience(s.audience);
      setIntent(s.intent);
      setRegister(s.register);
      setStory(s.story);
      setLanding(s.landing);
      setStoryId(s.id);
      setChat([]);
      setShowStories(false);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open that story");
    }
  }

  async function exportPdf() {
    if (!story) return;
    setBusy("export");
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: story.bigIdea, story, landing }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not make the PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "story.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make the PDF");
    } finally {
      setBusy(null);
    }
  }

  async function findStory() {
    if (me && !me.signedIn) {
      setNeedSignIn(true);
      return;
    }
    // A new story spends the free story or a credit. Reworking the notes of an existing story is free.
    if (mustBuy && !storyId) {
      setShowPaywall(true);
      return;
    }
    setBusy("story");
    setError(null);
    setStory(null);
    setLanding(null);
    setChat([]);
    setSaveState("idle");
    try {
      const data = await postJson<{ id: string | null; story: Story; meta: Meta }>("/api/story", {
        notes,
        audience,
        intent,
        register,
        storyId: storyId ?? undefined,
      });
      if (data.id) setStoryId(data.id);
      setStory(data.story);
      setShowPaywall(false);
      loadMe();
      setMeta(data.meta);
      window.scrollTo({ top: 0 });
    } catch (e) {
      handleApiError(e, "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function makeItLand() {
    if (!story) return;
    setBusy("land");
    setError(null);
    try {
      const data = await postJson<{ landing: Landing; meta: Meta }>(
        "/api/land",
        { notes, story, register },
      );
      setLanding(data.landing);
      setMeta(data.meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function upload(file: File) {
    setBusy("upload");
    setError(null);
    setUploadNote(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setNeedSignIn(true);
          return;
        }
        throw new Error(data.error || "Could not read that file");
      }
      setNotes(
        (prev) => (prev.trim() ? prev.trimEnd() + "\n\n" : "") + data.text,
      );
      setUploadNote(
        `Added ${data.name}${data.truncated ? " (trimmed to the first 60,000 characters)" : ""}. Cut anything that is not part of the story before you go on.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function applyPath(path: string, value: string | string[]) {
    const [head, ...rest] = path.split(".");
    if (head === "landing") {
      setLanding((prev) => (prev ? setIn(prev, rest, value) : prev));
    } else {
      setStory((prev) => (prev ? setIn(prev, [head, ...rest], value) : prev));
    }
  }

  // Contextual edit of one component. path is dotted: "why.headline", "landing.prologue", "how.supportingPoints".
  const edit = useCallback(
    async (path: string, current: string | string[], action: string) => {
      if (!story) return;
      setBusy(path);
      setError(null);
      try {
        const data = await postJson<{ value: string | string[] }>("/api/edit", {
          notes,
          story,
          landing: landing ?? undefined,
          register,
          path,
          current,
          action,
        });
        applyPath(path, data.value);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "That edit did not go through",
        );
      } finally {
        setBusy(null);
      }
    },
    [story, landing, notes, register],
  );

  async function refine(text: string) {
    if (!story) return;
    const next = [...chat, { role: "user" as const, content: text }];
    setChat(next);
    setBusy("refine");
    setError(null);
    try {
      const data = await postJson<{
        reply: string;
        story: Story;
        landing?: Landing;
      }>("/api/refine", {
        notes,
        story,
        landing: landing ?? undefined,
        register,
        messages: next,
      });
      setStory(data.story);
      if (data.landing) setLanding(data.landing);
      setChat([...next, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The strategist could not answer that",
      );
      setChat(chat);
    } finally {
      setBusy(null);
    }
  }

  const gaps = landing ? landing.gaps : (story?.gaps ?? []);
  const chips = (path: string, current: string | string[]) =>
    signedIn ? (a: string) => edit(path, current, a) : undefined;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10 sm:pt-16">
      <header className="mb-10">
        <p className="eyebrow">Jim&apos;s Three Act Story Machine</p>
        {me && (
          <div className="mt-4">
            <AccountBar
              me={me}
              onChange={loadMe}
              onOpenStories={() => setShowStories(true)}
            />
          </div>
        )}
        {notice && (
          <p className="mt-2 rounded-md bg-red-soft px-3 py-2 text-sm text-ink">
            {notice}
          </p>
        )}
        {showStories && (
          <div className="mt-4">
            <StoriesPanel
              currentId={storyId}
              onOpen={openStory}
              onClose={() => setShowStories(false)}
            />
          </div>
        )}
        {!story && (
          <>
            <h1 className="display mt-3 text-4xl leading-[1.05] sm:text-6xl">
              What are you trying to say?
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-2">
              Paste in your notes, presentation content, research, rough
              thinking or existing storyboard. It does not need to be polished.
            </p>
          </>
        )}
      </header>

      {!story && (
        <section className="space-y-6">
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={14}
              placeholder="Your notes go here."
              className="w-full rounded-md border border-rule bg-paper-2 p-4 text-base leading-relaxed outline-none focus:border-ink"
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy !== null}
                className="underline decoration-rule underline-offset-4 hover:text-ink disabled:opacity-40"
              >
                {busy === "upload"
                  ? "Reading the file..."
                  : "Or upload a document (PDF, Word, PowerPoint)"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.pptx,.txt,.md"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                }}
              />
              {uploadNote && <span>{uploadNote}</span>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-muted">
                Who is the audience? (optional)
              </span>
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="The executive committee, eight people, sceptical about cost"
                className="mt-1 w-full rounded-md border border-rule bg-paper-2 p-3 text-base outline-none focus:border-ink"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">
                After my presentation, the audience will... (optional)
              </span>
              <input
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder="approve the pilot budget"
                className="mt-1 w-full rounded-md border border-rule bg-paper-2 p-3 text-base outline-none focus:border-ink"
              />
            </label>
          </div>

          <fieldset className="text-sm">
            <legend className="eyebrow">Register</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {REGISTERS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRegister(r.value)}
                  title={r.hint}
                  className={
                    "rounded-md border px-3 py-1.5 " +
                    (register === r.value
                      ? "border-ink bg-ink text-paper"
                      : "border-rule bg-paper-2 text-ink-2 hover:border-ink")
                  }
                >
                  {r.label}
                </button>
              ))}
            </div>
          </fieldset>

          {needSignIn && <SignIn />}

          {me && me.signedIn && !storyId && (showPaywall || mustBuy) && (
            <Paywall me={me} onChange={() => { loadMe(); setShowPaywall(false); }} />
          )}

          {storyId && (
            <p className="text-sm text-muted">
              Reworking the notes of a saved story. Finding it again is free.{" "}
              <button
                type="button"
                onClick={() => setStoryId(null)}
                className="underline decoration-rule underline-offset-4 hover:text-ink"
              >
                Start a new story instead
              </button>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={findStory}
              disabled={busy !== null || notes.trim().length < 40 || (mustBuy && !storyId)}
              className="rounded-md bg-ink px-6 py-3 text-base font-medium text-paper disabled:opacity-40"
            >
              {busy === "story" ? "Finding your story..." : storyId ? "Find My Story Again" : "Find My Story"}
            </button>
            {busy === "story" && (
              <span className="text-sm text-muted">
                Usually twenty to forty seconds.
              </span>
            )}
          </div>
          {error && <p className="text-sm text-red">{error}</p>}
        </section>
      )}

      {story && (
        <article className="rise space-y-14">
          <section>
            <p className="eyebrow">Big Idea</p>
            <Editable
              as="h2"
              value={story.bigIdea}
              busy={busy === "bigIdea"}
              onChange={(v) => applyPath("bigIdea", v)}
              onAction={chips("bigIdea", story.bigIdea)}
              className="display mt-3 text-4xl leading-[1.08] sm:text-5xl"
              label="Big Idea"
            />
          </section>

          <section className="grid gap-8 border-t border-rule pt-8 sm:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="eyebrow">Audience</p>
                <Editable
                  value={story.audience.who}
                  onChange={(v) => applyPath("audience.who", v)}
                  className="mt-1 font-medium"
                />
              </div>
              <div>
                <p className="eyebrow">They need to hear</p>
                <Editable
                  value={story.audience.needToHear}
                  onChange={(v) => applyPath("audience.needToHear", v)}
                  className="mt-1 text-ink-2"
                />
              </div>
              <div>
                <p className="eyebrow">Leave out</p>
                <Editable
                  value={story.audience.doNotNeedToHear}
                  onChange={(v) => applyPath("audience.doNotNeedToHear", v)}
                  className="mt-1 text-ink-2"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="eyebrow">Statement of intent</p>
                <Editable
                  value={story.intent}
                  busy={busy === "intent"}
                  onChange={(v) => applyPath("intent", v)}
                  onAction={chips("intent", story.intent)}
                  actions={["sharper", "simpler", "another"]}
                  className="mt-1"
                />
              </div>
              <div>
                <p className="eyebrow">The argument</p>
                <Editable
                  value={story.argument}
                  busy={busy === "argument"}
                  onChange={(v) => applyPath("argument", v)}
                  onAction={chips("argument", story.argument)}
                  actions={["sharper", "simpler", "clearer", "another"]}
                  className="mt-1"
                />
              </div>
            </div>
          </section>

          {landing && (
            <section className="border-t border-rule pt-8">
              <p className="eyebrow">
                Prologue &middot; spoken &middot; the golden minute
              </p>
              <div className="mt-4">
                <Editable
                  value={landing.prologue}
                  busy={busy === "landing.prologue"}
                  onChange={(v) => applyPath("landing.prologue", v)}
                  onAction={chips("landing.prologue", landing.prologue)}
                  className="spoken"
                  label="Prologue"
                />
              </div>
            </section>
          )}

          {ACTS.map(({ key, n, word, job }) => {
            const act = story[key];
            const land = landing?.[key];
            return (
              <section
                key={key}
                className="border-t border-rule pt-8 sm:grid sm:grid-cols-[5.5rem_1fr] sm:gap-6"
              >
                <div className="mb-3 sm:mb-0">
                  <p className="eyebrow">{n}</p>
                  <p className="display mt-1 text-3xl text-red">{word}</p>
                  <p className="mt-1 text-xs text-muted">{job}</p>
                </div>
                <div className="space-y-5">
                  <Editable
                    as="h2"
                    value={act.headline}
                    busy={busy === `${key}.headline`}
                    onChange={(v) => applyPath(`${key}.headline`, v)}
                    onAction={chips(`${key}.headline`, act.headline)}
                    className="display text-2xl leading-snug sm:text-[1.75rem]"
                    label={`${n} headline`}
                  />
                  <Editable
                    value={act.coreMessage}
                    busy={busy === `${key}.coreMessage`}
                    onChange={(v) => applyPath(`${key}.coreMessage`, v)}
                    onAction={chips(`${key}.coreMessage`, act.coreMessage)}
                    actions={[
                      "sharper",
                      "simpler",
                      "clearer",
                      "senior",
                      "another",
                    ]}
                    className="text-lg"
                  />
                  <div
                    className={
                      "border-l-2 pl-4 " +
                      (act.soundbite.source === "material"
                        ? "border-red"
                        : "border-rule")
                    }
                  >
                    <p className="eyebrow">
                      Soundbite &middot;{" "}
                      {act.soundbite.source === "material" ? (
                        <span className="text-red">from your notes</span>
                      ) : (
                        "proposed, find your own"
                      )}
                    </p>
                    <Editable
                      value={act.soundbite.text}
                      busy={busy === `${key}.soundbite.text`}
                      onChange={(v) => applyPath(`${key}.soundbite.text`, v)}
                      onAction={chips(
                        `${key}.soundbite.text`,
                        act.soundbite.text,
                      )}
                      actions={["sharper", "memorable", "another"]}
                      className="display mt-1 text-xl"
                    />
                  </div>
                  <EditableList
                    items={act.supportingPoints}
                    busy={busy === `${key}.supportingPoints`}
                    onChange={(items) =>
                      applyPath(`${key}.supportingPoints`, items)
                    }
                    onAction={chips(
                      `${key}.supportingPoints`,
                      act.supportingPoints,
                    )}
                  />
                  {land && (
                    <div className="grid gap-5 rounded-md bg-paper-2 p-5 sm:grid-cols-2">
                      <div>
                        <p className="eyebrow">Signpost &middot; spoken</p>
                        <div className="mt-2">
                          <Editable
                            value={land.signpost}
                            busy={busy === `landing.${key}.signpost`}
                            onChange={(v) =>
                              applyPath(`landing.${key}.signpost`, v)
                            }
                            onAction={chips(
                              `landing.${key}.signpost`,
                              land.signpost,
                            )}
                            actions={["sharper", "memorable", "another"]}
                            className="spoken text-base"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="eyebrow">Slide idea</p>
                        <Editable
                          value={land.visualIdea}
                          busy={busy === `landing.${key}.visualIdea`}
                          onChange={(v) =>
                            applyPath(`landing.${key}.visualIdea`, v)
                          }
                          onAction={chips(
                            `landing.${key}.visualIdea`,
                            land.visualIdea,
                          )}
                          actions={["simpler", "another"]}
                          className="mt-2 text-sm text-ink-2"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          })}

          {landing && (
            <>
              <section className="border-t border-rule pt-8">
                <p className="eyebrow">
                  Epilogue &middot; spoken &middot; end with certainty
                </p>
                <div className="mt-4">
                  <Editable
                    value={landing.epilogue}
                    busy={busy === "landing.epilogue"}
                    onChange={(v) => applyPath("landing.epilogue", v)}
                    onAction={chips("landing.epilogue", landing.epilogue)}
                    className="spoken"
                    label="Epilogue"
                  />
                </div>
              </section>
              <section className="rounded-md border border-rule bg-paper-2 p-6 sm:p-8">
                <p className="eyebrow">The story in five lines</p>
                <ol className="mt-4 space-y-3">
                  {(
                    ["prologue", "why", "how", "what", "epilogue"] as const
                  ).map((k) => (
                    <li key={k} className="grid grid-cols-[5rem_1fr] gap-3">
                      <span className="eyebrow pt-1.5">{k}</span>
                      <Editable
                        value={landing.fiveLineStory[k]}
                        onChange={(v) =>
                          applyPath(`landing.fiveLineStory.${k}`, v)
                        }
                        className="display text-lg"
                      />
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}

          {gaps.length > 0 && (
            <section className="border-t border-rule pt-8">
              <p className="eyebrow">What only you can add</p>
              <ul className="mt-3 space-y-2 text-ink-2">
                {gaps.map((g, i) => (
                  <li key={i} className="border-l-2 border-rule pl-4">
                    {g}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-wrap items-center gap-4 border-t border-rule pt-8">
            {!landing && signedIn && (
              <button
                onClick={makeItLand}
                disabled={busy !== null}
                className="rounded-md bg-ink px-6 py-3 text-base font-medium text-paper disabled:opacity-40"
              >
                {busy === "land"
                  ? "Making it land..."
                  : "Your story is straight. Now make it land."}
              </button>
            )}
            {signedIn && (
              <button
                type="button"
                onClick={exportPdf}
                disabled={busy !== null}
                className="rounded-md border border-ink bg-paper-2 px-5 py-3 text-base font-medium text-ink disabled:opacity-40"
              >
                {busy === "export" ? "Making the PDF..." : "Download PDF"}
              </button>
            )}
            {signedIn && saveState !== "idle" && (
              <span className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted">
                {saveState === "saving"
                  ? "Saving"
                  : saveState === "saved"
                    ? "Saved"
                    : "Not saved"}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setStory(null);
                setLanding(null);
                setMeta(null);
                setChat([]);
                setSaveState("idle");
                window.scrollTo({ top: 0 });
              }}
              className="text-sm text-muted underline decoration-rule underline-offset-4 hover:text-ink"
            >
              Rework the notes
            </button>
            <button
              type="button"
              onClick={() => {
                setStory(null);
                setLanding(null);
                setMeta(null);
                setChat([]);
                setStoryId(null);
                setSaveState("idle");
                setNotes("");
                setAudience("");
                setIntent("");
                setUploadNote(null);
                window.scrollTo({ top: 0 });
              }}
              className="text-sm text-muted underline decoration-rule underline-offset-4 hover:text-ink"
            >
              Start a new story
            </button>
            {error && <p className="w-full text-sm text-red">{error}</p>}
          </section>

          {signedIn && (
            <Refine messages={chat} busy={busy === "refine"} onSend={refine} />
          )}

          {meta && (
            <p className="font-mono text-[0.68rem] text-muted">
              {meta.model} &middot; {meta.attempts} attempt
              {meta.attempts > 1 ? "s" : ""} &middot; voice checks{" "}
              {meta.violationsBefore} before, {meta.violationsAfter} after
              {meta.unresolved.length ? ` (${meta.unresolved.join("; ")})` : ""}
            </p>
          )}
        </article>
      )}
    </main>
  );
}
