"use client";

import type { Rhetoric } from "@/lib/schema";

// The rhetoric notes for one line of the story, shown under it (John Zimmer's change, 18 October).
// A device the line already uses, in grey; a suggestion, in red, with a button that puts the new line in.
// Using a suggestion is an edit by hand: it costs nothing.

export function RhetoricNotes({
  rhetoric,
  path,
  current,
  onUse,
}: {
  rhetoric: Rhetoric | null;
  path: string;
  current?: string;
  onUse?: (path: string, text: string) => void;
}) {
  if (!rhetoric) return null;
  const devices = rhetoric.devices.filter((d) => d.path === path);
  const suggestions = rhetoric.suggestions.filter((s) => s.path === path);
  if (!devices.length && !suggestions.length) return null;
  return (
    <div className="mt-3 space-y-3">
      {devices.map((d, i) => (
        <div key={`d${i}`} className="rounded-md border border-rule bg-paper-2 px-4 py-3 text-sm">
          <p>
            <span className="tag text-muted">Rhetoric</span>{" "}
            <span className="font-semibold text-ink">{d.device}</span>
            <span className="text-muted"> &middot; {d.source === "yours" ? "you already do this" : "added by StoryMachine"}</span>
          </p>
          {d.what && <p className="mt-1 text-ink-2">{d.what}</p>}
          <p className="mt-1 text-ink-2">{d.note}</p>
        </div>
      ))}
      {suggestions.map((s, i) => {
        const used = current !== undefined && current.trim() === s.better.trim();
        return (
          <div key={`s${i}`} className="rounded-md border border-red bg-red-soft px-4 py-3 text-sm">
            <p>
              <span className="tag text-red">Add power</span>{" "}
              <span className="font-semibold text-ink">{s.device}</span>
            </p>
            {s.what && <p className="mt-1 text-ink-2">{s.what}</p>}
            <p className="said mt-2 text-base text-ink">&ldquo;{s.better}&rdquo;</p>
            {s.note && <p className="mt-1 text-ink-2">{s.note}</p>}
            {onUse && (
              <button
                type="button"
                onClick={() => onUse(path, s.better)}
                disabled={used}
                className="mt-2 rounded-md border border-ink bg-paper px-3 py-1 text-xs font-medium text-ink disabled:opacity-50"
              >
                {used ? "In your story" : "Use this line"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
