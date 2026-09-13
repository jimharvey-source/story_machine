"use client";

import { useCallback, useRef, useState } from "react";
import type { Landing, Story } from "@/lib/schema";
import { Editable, EditableList } from "@/components/Editable";
import { Refine, type ChatMessage } from "@/components/Refine";

type Register = "formal" | "business" | "conversational";
const REGISTERS: Array<{ value: Register; label: string; hint: string }> = [
  { value: "formal", label: "Formal", hint: "No contractions, no rhetorical questions" },
  { value: "business", label: "Business", hint: "Direct. Spoken sections may use contractions" },
  { value: "conversational", label: "Conversational", hint: "Plain, warm, short sentences" },
];

type Meta = { model: string; attempts: number; violationsBefore: number; violationsAfter: number; unresolved: string[] };
type ActKey = "why" | "how" | "what";
const ACTS: Array<{ key: ActKey; n: string; word: string; job: string }> = [
  { key: "why", n: "Act 1", word: "Why", job: "the hook" },
  { key: "how", n: "Act 2", word: "How", job: "the response" },
  { key: "what", n: "Act 3", word: "What", job: "the ask" },
];

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
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

  async function findStory() {
    setBusy("story");
    setError(null);
    setStory(null);
    setLanding(null);
    setChat([]);
    try {
      const data = await postJson<{ story: Story; meta: Meta }>("/api/story", { notes, audience, intent, register });
      setStory(data.story);
      setMeta(data.meta);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function makeItLand() {
    if (!story) return;
    setBusy("land");
    setError(null);
    try {
      const data = await postJson<{ landing: Landing; meta: Meta }>("/api/land", { notes, story, register });
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
      if (!res.ok) throw new Error(data.error || "Could not read that file");
      setNotes((prev) => (prev.trim() ? prev.trimEnd() + "\n\n" : "") + data.text);
      setUploadNote(
        `Added ${data.name}${data.truncated ? " (trimmed to the first 60,000 characters)" : ""}. Cut anything that is not part of the story before you go on.`
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
        setError(e instanceof Error ? e.message : "That edit did not go through");
      } finally {
        setBusy(null);
      }
    },
    [story, landing, notes, register]
  );

  async function refine(text: string) {
    if (!story) return;
    const next = [...chat, { role: "user" as const, content: text }];
    setChat(next);
    setBusy("refine");
    setError(null);
    try {
      const data = await postJson<{ reply: string; story: Story; landing?: Landing }>("/api/refine", {
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
      setError(e instanceof Error ? e.message : "The strategist could not answer that");
      setChat(chat);
    } finally {
      setBusy(null);
    }
  }

  const gaps = landing ? landing.gaps : story?.gaps ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10 sm:pt-16">
      <header className="mb-10">
        <p className="eyebrow">Jim&apos;s Three Act Story Machine</p>
        {!story && (
          <>
            <h1 className="display mt-3 text-4xl leading-[1.05] sm:text-6xl">What are you trying to say?</h1>
            <p className="mt-5 max-w-xl text-lg text-ink-2">
              Paste in your notes, presentation content, research, rough thinking or existing storyboard. It does not
              need to be polished.
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
                {busy === "upload" ? "Reading the file..." : "Or upload a document (PDF, Word, PowerPoint)"}
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
              <span className="text-muted">Who is the audience? (optional)</span>
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="The executive committee, eight people, sceptical about cost"
                className="mt-1 w-full rounded-md border border-rule bg-paper-2 p-3 text-base outline-none focus:border-ink"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">After my presentation, the audience will... (optional)</span>
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
                    (register === r.value ? "border-ink bg-ink text-paper" : "border-rule bg-paper-2 text-ink-2 hover:border-ink")
                  }
                >
                  {r.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={findStory}
              disabled={busy !== null || notes.trim().length < 40}
              className="rounded-md bg-ink px-6 py-3 text-base font-medium text-paper disabled:opacity-40"
            >
              {busy === "story" ? "Finding your story..." : "Find My Story"}
            </button>
            {busy === "story" && <span className="text-sm text-muted">Usually twenty to forty seconds.</span>}
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
              onAction={(a) => edit("bigIdea", story.bigIdea, a)}
              className="display mt-3 text-4xl leading-[1.08] sm:text-5xl"
              label="Big Idea"
            />
          </section>

          <section className="grid gap-8 border-t border-rule pt-8 sm:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="eyebrow">Audience</p>
                <Editable value={story.audience.who} onChange={(v) => applyPath("audience.who", v)} className="mt-1 font-medium" />
              </div>
              <div>
                <p className="eyebrow">They need to hear</p>
                <Editable value={story.audience.needToHear} onChange={(v) => applyPath("audience.needToHear", v)} className="mt-1 text-ink-2" />
              </div>
              <div>
                <p className="eyebrow">Leave out</p>
                <Editable value={story.audience.doNotNeedToHear} onChange={(v) => applyPath("audience.doNotNeedToHear", v)} className="mt-1 text-ink-2" />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="eyebrow">Statement of intent</p>
                <Editable
                  value={story.intent}
                  busy={busy === "intent"}
                  onChange={(v) => applyPath("intent", v)}
                  onAction={(a) => edit("intent", story.intent, a)}
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
                  onAction={(a) => edit("argument", story.argument, a)}
                  actions={["sharper", "simpler", "clearer", "another"]}
                  className="mt-1"
                />
              </div>
            </div>
          </section>

          {landing && (
            <section className="border-t border-rule pt-8">
              <p className="eyebrow">Prologue &middot; spoken &middot; the golden minute</p>
              <div className="mt-4">
                <Editable
                  value={landing.prologue}
                  busy={busy === "landing.prologue"}
                  onChange={(v) => applyPath("landing.prologue", v)}
                  onAction={(a) => edit("landing.prologue", landing.prologue, a)}
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
              <section key={key} className="border-t border-rule pt-8 sm:grid sm:grid-cols-[5.5rem_1fr] sm:gap-6">
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
                    onAction={(a) => edit(`${key}.headline`, act.headline, a)}
                    className="display text-2xl leading-snug sm:text-[1.75rem]"
                    label={`${n} headline`}
                  />
                  <Editable
                    value={act.coreMessage}
                    busy={busy === `${key}.coreMessage`}
                    onChange={(v) => applyPath(`${key}.coreMessage`, v)}
                    onAction={(a) => edit(`${key}.coreMessage`, act.coreMessage, a)}
                    actions={["sharper", "simpler", "clearer", "senior", "another"]}
                    className="text-lg"
                  />
                  <div className={"border-l-2 pl-4 " + (act.soundbite.source === "material" ? "border-red" : "border-rule")}>
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
                      onAction={(a) => edit(`${key}.soundbite.text`, act.soundbite.text, a)}
                      actions={["sharper", "memorable", "another"]}
                      className="display mt-1 text-xl"
                    />
                  </div>
                  <EditableList
                    items={act.supportingPoints}
                    busy={busy === `${key}.supportingPoints`}
                    onChange={(items) => applyPath(`${key}.supportingPoints`, items)}
                    onAction={(a) => edit(`${key}.supportingPoints`, act.supportingPoints, a)}
                  />
                  {land && (
                    <div className="grid gap-5 rounded-md bg-paper-2 p-5 sm:grid-cols-2">
                      <div>
                        <p className="eyebrow">Signpost &middot; spoken</p>
                        <div className="mt-2">
                          <Editable
                            value={land.signpost}
                            busy={busy === `landing.${key}.signpost`}
                            onChange={(v) => applyPath(`landing.${key}.signpost`, v)}
                            onAction={(a) => edit(`landing.${key}.signpost`, land.signpost, a)}
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
                          onChange={(v) => applyPath(`landing.${key}.visualIdea`, v)}
                          onAction={(a) => edit(`landing.${key}.visualIdea`, land.visualIdea, a)}
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
                <p className="eyebrow">Epilogue &middot; spoken &middot; end with certainty</p>
                <div className="mt-4">
                  <Editable
                    value={landing.epilogue}
                    busy={busy === "landing.epilogue"}
                    onChange={(v) => applyPath("landing.epilogue", v)}
                    onAction={(a) => edit("landing.epilogue", landing.epilogue, a)}
                    className="spoken"
                    label="Epilogue"
                  />
                </div>
              </section>
              <section className="rounded-md border border-rule bg-paper-2 p-6 sm:p-8">
                <p className="eyebrow">The story in five lines</p>
                <ol className="mt-4 space-y-3">
                  {(["prologue", "why", "how", "what", "epilogue"] as const).map((k) => (
                    <li key={k} className="grid grid-cols-[5rem_1fr] gap-3">
                      <span className="eyebrow pt-1.5">{k}</span>
                      <Editable
                        value={landing.fiveLineStory[k]}
                        onChange={(v) => applyPath(`landing.fiveLineStory.${k}`, v)}
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
            {!landing && (
              <button
                onClick={makeItLand}
                disabled={busy !== null}
                className="rounded-md bg-ink px-6 py-3 text-base font-medium text-paper disabled:opacity-40"
              >
                {busy === "land" ? "Making it land..." : "Your story is straight. Now make it land."}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setStory(null);
                setLanding(null);
                setMeta(null);
                setChat([]);
              }}
              className="text-sm text-muted underline decoration-rule underline-offset-4 hover:text-ink"
            >
              Start again
            </button>
            {error && <p className="w-full text-sm text-red">{error}</p>}
          </section>

          <Refine messages={chat} busy={busy === "refine"} onSend={refine} />

          {meta && (
            <p className="font-mono text-[0.68rem] text-muted">
              {meta.model} &middot; {meta.attempts} attempt{meta.attempts > 1 ? "s" : ""} &middot; voice checks{" "}
              {meta.violationsBefore} before, {meta.violationsAfter} after
              {meta.unresolved.length ? ` (${meta.unresolved.join("; ")})` : ""}
            </p>
          )}
        </article>
      )}
    </main>
  );
}
