"use client";

import { useEffect, useRef, useState } from "react";

export const ACTIONS: Array<{ key: string; label: string }> = [
  { key: "sharper", label: "Sharper" },
  { key: "simpler", label: "Simpler" },
  { key: "senior", label: "More senior" },
  { key: "provocative", label: "More provocative" },
  { key: "memorable", label: "More memorable" },
  { key: "clearer", label: "Clearer" },
  { key: "another", label: "Another version" },
];

type Props = {
  value: string;
  onChange: (v: string) => void;
  onAction?: (action: string) => Promise<void>;
  className?: string;
  as?: "p" | "h2" | "span";
  busy?: boolean;
  actions?: string[];
  label?: string;
};

export function Editable({ value, onChange, onAction, className = "", as = "p", busy, actions, label }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      const el = ref.current;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing, draft]);

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== value) onChange(next);
    else setDraft(value);
  }

  const Tag = as;
  const chips = (actions ?? ACTIONS.map((a) => a.key)).map((k) => ACTIONS.find((a) => a.key === k)!).filter(Boolean);

  return (
    <div className="group relative">
      <div className="editable" data-editing={editing} aria-label={label}>
        {editing ? (
          <textarea
            ref={ref}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraft(value);
                setEditing(false);
              }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
            }}
            className={className}
            rows={1}
          />
        ) : (
          <Tag
            className={className + (busy ? " opacity-50" : "")}
            onClick={() => {
              if (busy) return;
              setDraft(value);
              setEditing(true);
            }}
            title="Click to edit"
          >
            {value}
          </Tag>
        )}
      </div>
      {onAction && !editing && (
        <div className="actions mt-2 flex flex-wrap gap-1.5">
          {chips.map((a) => (
            <button
              key={a.key}
              type="button"
              disabled={busy}
              onClick={() => onAction(a.key)}
              className="rounded-full border border-rule bg-paper-2 px-2.5 py-0.5 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted hover:border-ink hover:text-ink disabled:opacity-40"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type ListProps = {
  items: string[];
  onChange: (items: string[]) => void;
  onAction?: (action: string) => Promise<void>;
  busy?: boolean;
};

export function EditableList({ items, onChange, onAction, busy }: ListProps) {
  return (
    <div className="group relative">
      <ul className="space-y-2 text-ink-2">
        {items.map((p, i) => (
          <li key={i} className="border-l-2 border-rule pl-4">
            <Editable
              value={p}
              busy={busy}
              onChange={(v) => {
                const next = [...items];
                next[i] = v;
                onChange(next);
              }}
            />
          </li>
        ))}
      </ul>
      {onAction && (
        <div className="actions mt-2 flex flex-wrap gap-1.5">
          {["sharper", "simpler", "clearer", "another"].map((k) => {
            const a = ACTIONS.find((x) => x.key === k)!;
            return (
              <button
                key={k}
                type="button"
                disabled={busy}
                onClick={() => onAction(k)}
                className="rounded-full border border-rule bg-paper-2 px-2.5 py-0.5 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted hover:border-ink hover:text-ink disabled:opacity-40"
              >
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
