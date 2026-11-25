"use client";

import { useEffect, useState } from "react";

export type StorySummary = { id: string; title: string; createdAt: string; updatedAt: string; landed: boolean };

// Date and time on each card (John, draft 10), so two stories with the same title can be told apart.
function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function StoriesPanel({ onOpen, onNew, onClose, currentId }: { onOpen: (id: string) => void; onNew: () => void; onClose: () => void; currentId: string | null }) {
  const [list, setList] = useState<StorySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stories")
      .then((r) => r.json())
      .then((d) => (d.stories ? setList(d.stories) : setError(d.error || "Could not load")))
      .catch(() => setError("Could not load"));
  }, []);

  async function remove(id: string) {
    await fetch(`/api/stories/${id}`, { method: "DELETE" });
    setList((l) => (l ? l.filter((s) => s.id !== id) : l));
  }

  return (
    <section className="mb-10 rounded-md border border-rule bg-paper-2 p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">My stories</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onNew}
            className="rounded-md bg-red px-3 py-1.5 text-sm font-medium text-paper hover:opacity-90"
          >
            Start a new story
          </button>
          <button type="button" onClick={onClose} className="text-sm text-muted underline decoration-rule underline-offset-4 hover:text-ink">
            Close
          </button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red">{error}</p>}
      {list && list.length === 0 && <p className="mt-3 text-ink-2">Nothing saved yet. Stories save themselves as you work.</p>}
      {list && list.length > 0 && (
        <ul className="mt-3 divide-y divide-rule">
          {list.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <button type="button" onClick={() => onOpen(s.id)} className={"text-left hover:underline " + (s.id === currentId ? "font-medium" : "")}>
                {s.title}
                <span className="ml-2 tag text-muted">
                  {s.landed ? "stages 1 and 2" : "stage 1"} · started {when(s.createdAt ?? s.updatedAt)} · last changed {when(s.updatedAt)}
                </span>
              </button>
              <button type="button" onClick={() => remove(s.id)} className="text-xs text-muted hover:text-red">
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
