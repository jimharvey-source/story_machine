"use client";

import { useEffect, useRef, useState } from "react";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type Props = {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (text: string) => Promise<void>;
};

const SUGGESTIONS = [
  "Act 1 is too long.",
  "Make the opening more provocative.",
  "The CEO will hear this. Make it more strategic.",
  "Give me three alternative Big Ideas.",
  "Make the ask more confident.",
  "Connect the ending back to the opening.",
];

export function Refine({ messages, busy, onSend }: Props) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length, busy]);

  async function send(t: string) {
    const v = t.trim();
    if (!v || busy) return;
    setText("");
    await onSend(v);
  }

  return (
    <section className="border-t border-rule pt-8">
      <p className="eyebrow">Refine the story</p>
      <p className="mt-2 max-w-xl text-ink-2">
        Talk to the strategist. Say what is wrong, what the room is like, or what the real point is. The story
        above changes as you go.
      </p>

      {messages.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              disabled={busy}
              className="rounded-md border border-rule bg-paper-2 px-3 py-1.5 text-sm text-ink-2 hover:border-ink hover:text-ink disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <ol className="mt-5 space-y-4">
          {messages.map((m, i) => (
            <li key={i} className={m.role === "user" ? "pl-0" : "border-l-2 border-red pl-4"}>
              <p className="eyebrow">{m.role === "user" ? "You" : "Strategist"}</p>
              <p className="mt-1 whitespace-pre-wrap text-ink">{m.content}</p>
            </li>
          ))}
          {busy && (
            <li className="border-l-2 border-red pl-4">
              <p className="eyebrow">Strategist</p>
              <p className="mt-1 text-muted">Reworking the story...</p>
            </li>
          )}
          <div ref={endRef} />
        </ol>
      )}

      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What would you change?"
          disabled={busy}
          className="w-full rounded-md border border-rule bg-paper-2 px-3 py-2.5 text-base outline-none focus:border-ink disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="rounded-md bg-ink px-4 py-2.5 text-base font-medium text-paper disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </section>
  );
}
