// A programme code that arrived in a link (?programme=XXXX) and waits for the person to sign in.
// Kept in this browser only. Every access is wrapped: private windows refuse storage, and the page must still work.

const KEY = "storymachine.programme";

export function normaliseCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export function readPendingProgramme(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function savePendingProgramme(code: string): void {
  try {
    localStorage.setItem(KEY, normaliseCode(code));
  } catch {
    // storage unavailable; the code still works for this page view
  }
}

export function clearPendingProgramme(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
