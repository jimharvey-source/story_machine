"use client";

import { useEffect, useState } from "react";

// A small progress bar for a wait of known rough length (agreed 23 October, in place of "usually under 45 seconds").
// It cannot know the real progress, so it moves quickly at first and slows as it nears the end, never reaching it
// until the work is done and the bar is removed.
export default function Progress({ label, expected }: { label: string; expected: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = window.setInterval(() => setElapsed((Date.now() - start) / 1000), 250);
    return () => window.clearInterval(timer);
  }, []);
  const share = Math.min(0.96, 1 - Math.exp((-1.6 * elapsed) / expected));
  const pct = Math.round(share * 100);
  return (
    <div className="w-full max-w-md" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="flex items-baseline justify-between text-sm text-ink-2">
        <span>{label}</span>
        <span className="tabular-nums text-muted">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-rule">
        <div className="h-full rounded-full bg-red transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
