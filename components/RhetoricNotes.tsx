"use client";

import type { Rhetoric } from "@/lib/schema";

// A rhetoric suggestion for one line of the story, shown under it (John Zimmer's change, 18 October).
// Since 23 October: the suggested line first, then the device and what it is. No notes on devices already used.
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
  const suggestions = rhetoric.suggestions.filter((s) => s.path === path);
  if (!suggestions.length) return null;
  return (
    <div className="mt-4 space-y-3">
      {suggestions.map((s, i) => {
        const used = current !== undefined && current.trim() === s.better.trim();
        return (
          <div key={i} className="rounded-md border border-red bg-red-soft px-4 py-3 text-sm">
            <p className="tag text-red">Add power to your words with a rhetorical device</p>
            <p className="mt-2 text-ink-2">For example, you could say this:</p>
            <p className="said mt-1 text-base text-ink">&ldquo;{s.better}&rdquo;</p>
            <p className="mt-2 text-ink-2">
              <span className="font-semibold text-ink">{s.device}.</span> {s.what}
            </p>
            {onUse && (
              <button
                type="button"
                onClick={() => onUse(path, s.better)}
                disabled={used}
                className="mt-3 rounded-md border border-ink bg-paper px-3 py-1 text-xs font-medium text-ink disabled:opacity-50"
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
