"use client";

import { useState } from "react";
import type { Landing, Story } from "@/lib/schema";
import { slideList, slidePrompt } from "@/lib/slides";
import { KINDS, kindOf } from "@/lib/kinds";

// After Stage 2: rehearsal on the story page, slides on their own (18 October: the slides come last, on a separate view).

function Why({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 mb-3 text-xs leading-relaxed text-muted">{children}</p>;
}

export function Rehearse({ story, landing }: { story: Story; landing: Landing }) {
  const notes = landing.speechNotes ?? { prologue: [], why: [], how: [], what: [], epilogue: [] };
  const acts = KINDS[kindOf(story.kind)].acts;
  const beats: Array<[string, string[], string]> = [
    ["Prologue", notes.prologue, "the golden minute"],
    [`Act 1, ${acts[0]}`, notes.why, story.why.headline],
    [`Act 2, ${acts[1]}`, notes.how, story.how.headline],
    [`Act 3, ${acts[2]}`, notes.what, story.what.headline],
    ["Epilogue", notes.epilogue, "end with certainty"],
  ];
  const hasNotes = beats.some(([, cues]) => cues.length > 0);
  const [showScript, setShowScript] = useState(false);

  const script: Array<[string, string]> = [
    ["Prologue", landing.prologue],
    ["Signpost into Act 1", landing.why.signpost],
    ["Signpost into Act 2", landing.how.signpost],
    ["Signpost into Act 3", landing.what.signpost],
    ["Epilogue", landing.epilogue],
  ];

  return (
    <>
      <section className="border-t border-rule pt-8">
        <p className="eyebrow text-red">Rehearse it into life</p>
        <p className="said mt-2 text-xl leading-snug text-ink">Say it aloud before you build anything. Speak from the notes; read only if you must.</p>
      </section>
      {hasNotes && (
        <section>
          <p className="eyebrow">Speaker notes</p>
          <Why>Speak from these. Never from a script. One cue per line, in the order you say them; the words come from you in the room, so they sound like you.</Why>
          <div className="grid gap-6 sm:grid-cols-2">
            {beats.map(([name, cues, sub]) => (
              <div key={name}>
                <p className="tag text-red">
                  {name} <span className="ml-1 normal-case tracking-normal text-muted">{sub}</span>
                </p>
                <ul className="mt-2 space-y-1.5">
                  {cues.map((c, i) => (
                    <li key={i} className="said border-l-2 border-red pl-3 text-lg leading-snug">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-rule pt-8">
        <p className="eyebrow">Word for word</p>
        <Why>The spoken parts in full, for rehearsal. Hear whether they sound like you and change any that do not. Word for word is for legal and political speeches; for everything else, the notes.</Why>
        <button
          type="button"
          onClick={() => setShowScript((v) => !v)}
          className="text-sm text-muted underline decoration-rule underline-offset-4 hover:text-ink"
        >
          {showScript ? "Hide the spoken parts" : "Show the spoken parts in full"}
        </button>
        {showScript && (
          <div className="mt-4 space-y-5">
            {script.map(([name, text]) => (
              <div key={name}>
                <p className="tag text-red">{name}</p>
                <p className="said mt-1 text-lg leading-[1.7]">{text}</p>
              </div>
            ))}
          </div>
        )}
      </section>

    </>
  );
}

/** The slides view: what good slides look like, the brief, the prompt for an AI tool. The PowerPoint button sits on the page. */
export function Slides({ story, landing }: { story: Story; landing: Landing }) {
  const slides = slideList(story, landing);
  const prompt = slidePrompt(story, landing, slides);
  const [copied, setCopied] = useState(false);
  // The presenter said the talk has no slides: every act's slide idea says so.
  const wordsAlone = (["why", "how", "what"] as const).every((k) => /\bno (visual|slide)s?\b|without slides|words alone/i.test(landing[k]?.visualIdea ?? ""));

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      {wordsAlone && (
        <section className="rounded-md bg-red-soft px-5 py-4 text-ink">
          Your talk is built for words alone, and that is a strength. If you do want slides, here is a brief that serves the story.
        </section>
      )}
      <section>
        <p className="eyebrow">What great slides do</p>
        <ul className="mt-3 space-y-2 text-ink-2">
          <li className="border-l-2 border-red pl-4">One idea per slide. The slide illustrates; your words explain.</li>
          <li className="border-l-2 border-red pl-4">The three-second rule: if the audience cannot take it in at a glance, it is too much.</li>
          <li className="border-l-2 border-red pl-4">The titles tell the story. Read in order, they are your argument.</li>
          <li className="border-l-2 border-red pl-4">Words large, one picture at most, no bullet lists.</li>
        </ul>
      </section>
      <section className="border-t border-rule pt-8">
        <p className="eyebrow">Slide brief</p>
        <Why>One idea per slide. The words carry the story; the slide reinforces it. Build the deck from this list, in this order, and nothing else goes on the slide.</Why>
        <ol className="space-y-3">
          {slides.map(([name, text, serves], i) => (
            <li key={i} className="rounded-md bg-panel p-4">
              <p className="tag text-muted">
                Slide {i + 1} · {name} · serves {serves}
              </p>
              <p className="mt-1 text-ink-2">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-rule pt-8">
        <p className="eyebrow">Make the slides with your own AI tool</p>
        <Why>Copy this prompt into the AI tool you use for slides. It carries our rules and your brief: one idea per slide, the three-second rule, one item at a time, television quality. Add the build animations in your slide software afterwards.</Why>
        <div className="relative">
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-panel p-4 font-mono text-[0.75rem] leading-relaxed text-ink-2">
            {prompt}
          </pre>
          <button
            type="button"
            onClick={copy}
            className="absolute right-3 top-3 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-paper"
          >
            {copied ? "Copied" : "Copy the prompt"}
          </button>
        </div>
      </section>
    </>
  );
}
