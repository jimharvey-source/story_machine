"use client";

import { useState } from "react";
import type { Landing, Story } from "@/lib/schema";

type Meta = {
  model: string;
  attempts: number;
  violationsBefore: number;
  violationsAfter: number;
  unresolved: string[];
};

export default function Home() {
  const [notes, setNotes] = useState("");
  const [audience, setAudience] = useState("");
  const [intent, setIntent] = useState("");
  const [story, setStory] = useState<Story | null>(null);
  const [landing, setLanding] = useState<Landing | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [busy, setBusy] = useState<"story" | "land" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function findStory() {
    setBusy("story");
    setError(null);
    setStory(null);
    setLanding(null);
    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, audience, intent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setStory(data.story);
      setMeta(data.meta);
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
      const res = await fetch("/api/land", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, story }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setLanding(data.landing);
      setMeta(data.meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-20">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Jim&apos;s Three Act Story Machine</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">What are you trying to say?</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Paste in your notes, presentation content, research, rough thinking or existing storyboard. It does not
          need to be polished.
        </p>
      </header>

      {!story && (
        <section className="space-y-5">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={14}
            placeholder="Your notes go here."
            className="w-full rounded-md border border-rule bg-white p-4 text-base leading-relaxed outline-none focus:border-foreground"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-muted">Who is the audience? (optional)</span>
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="The executive committee, eight people, sceptical about cost"
                className="mt-1 w-full rounded-md border border-rule bg-white p-3 text-base outline-none focus:border-foreground"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">After my presentation, the audience will... (optional)</span>
              <input
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder="approve the pilot budget"
                className="mt-1 w-full rounded-md border border-rule bg-white p-3 text-base outline-none focus:border-foreground"
              />
            </label>
          </div>
          <button
            onClick={findStory}
            disabled={busy !== null || notes.trim().length < 40}
            className="rounded-md bg-foreground px-6 py-3 text-base font-medium text-white disabled:opacity-40"
          >
            {busy === "story" ? "Finding your story..." : "Find My Story"}
          </button>
          {error && <p className="text-sm text-accent">{error}</p>}
        </section>
      )}

      {story && (
        <article className="space-y-12">
          <section>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Big Idea</p>
            <p className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{story.bigIdea}</p>
          </section>

          <section className="grid gap-6 border-t border-rule pt-8 sm:grid-cols-2">
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted">Audience</h2>
              <p className="mt-2 font-medium">{story.audience.who}</p>
              <p className="mt-2 text-muted">They need to hear: {story.audience.needToHear}</p>
              <p className="mt-1 text-muted">Leave out: {story.audience.doNotNeedToHear}</p>
            </div>
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted">Statement of intent</h2>
              <p className="mt-2">{story.intent}</p>
              <h2 className="mt-5 text-xs uppercase tracking-[0.2em] text-muted">The argument</h2>
              <p className="mt-2">{story.argument}</p>
            </div>
          </section>

          {landing && (
            <section className="border-t border-rule pt-8">
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted">Prologue</h2>
              <p className="mt-2 text-lg leading-relaxed">{landing.prologue}</p>
            </section>
          )}

          {(["why", "how", "what"] as const).map((key, i) => {
            const act = story[key];
            const land = landing?.[key];
            return (
              <section key={key} className="border-t border-rule pt-8">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">
                  Act {i + 1} <span className="mx-1">&middot;</span> {key.toUpperCase()}
                </p>
                <h2 className="mt-2 text-2xl font-semibold leading-snug">{act.headline}</h2>
                <p className="mt-3 text-lg">{act.coreMessage}</p>
                <ul className="mt-4 space-y-2 text-muted">
                  {act.supportingPoints.map((p, j) => (
                    <li key={j} className="pl-4 border-l-2 border-rule">
                      {p}
                    </li>
                  ))}
                </ul>
                {land && (
                  <div className="mt-5 grid gap-4 rounded-md bg-white p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Signpost</p>
                      <p className="mt-1 italic">&ldquo;{land.signpost}&rdquo;</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Slide idea</p>
                      <p className="mt-1">{land.visualIdea}</p>
                    </div>
                  </div>
                )}
              </section>
            );
          })}

          {landing && (
            <>
              <section className="border-t border-rule pt-8">
                <h2 className="text-xs uppercase tracking-[0.2em] text-muted">Epilogue</h2>
                <p className="mt-2 text-lg leading-relaxed">{landing.epilogue}</p>
              </section>
              <section className="rounded-md border border-rule bg-white p-6">
                <h2 className="text-xs uppercase tracking-[0.2em] text-muted">The story in five lines</h2>
                <ol className="mt-3 space-y-2">
                  {(["prologue", "why", "how", "what", "epilogue"] as const).map((k) => (
                    <li key={k} className="flex gap-4">
                      <span className="w-20 shrink-0 text-xs uppercase tracking-[0.2em] text-muted pt-1">{k}</span>
                      <span>{landing.fiveLineStory[k]}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}

          {story.gaps.length > 0 && (
            <section className="border-t border-rule pt-8">
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted">What would make this stronger</h2>
              <ul className="mt-3 space-y-2">
                {story.gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-wrap items-center gap-4 border-t border-rule pt-8">
            {!landing && (
              <button
                onClick={makeItLand}
                disabled={busy !== null}
                className="rounded-md bg-foreground px-6 py-3 text-base font-medium text-white disabled:opacity-40"
              >
                {busy === "land" ? "Making it land..." : "Your story is straight. Now make it land."}
              </button>
            )}
            <button
              onClick={() => {
                setStory(null);
                setLanding(null);
                setMeta(null);
              }}
              className="text-sm text-muted underline"
            >
              Start again
            </button>
            {error && <p className="w-full text-sm text-accent">{error}</p>}
          </section>

          {meta && (
            <p className="text-xs text-muted">
              {meta.model} &middot; {meta.attempts} attempt{meta.attempts > 1 ? "s" : ""} &middot; voice checks:{" "}
              {meta.violationsBefore} before, {meta.violationsAfter} after
              {meta.unresolved.length ? ` (${meta.unresolved.join("; ")})` : ""}
            </p>
          )}
        </article>
      )}
    </main>
  );
}
