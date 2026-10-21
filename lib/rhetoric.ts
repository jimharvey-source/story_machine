import type { Rhetoric } from "./schema";
import { KINDS, kindOf } from "./kinds";

// Rhetoric notes. Since 18 October each note sits under the line it belongs to (John Zimmer's change): up to three
// devices the story already uses and up to three suggestions. Shared by the page, the PDF and the Word download.

export const RHETORIC_TITLE = "Add power to your language";
export const RHETORIC_LEAD =
  "One well-made line sticks in an audience's mind like the hook of a song. Strong speakers choose their words on purpose. The notes in your story show the rhetorical devices you already use, and three places where one would add power.";

/** The part of the story a path points at, in the words the presenter sees on the page. */
export function pathLabel(path: string | undefined, kind?: string | null): string {
  if (!path) return "";
  const acts = KINDS[kindOf(kind)].acts;
  const actName = (k: string) => {
    const i = ["why", "how", "what"].indexOf(k);
    return `Act ${i + 1}, ${acts[i]}`;
  };
  if (path === "bigIdea") return "Big Idea";
  if (path === "landing.prologue") return "Prologue";
  if (path === "landing.epilogue") return "Epilogue";
  const m = path.match(/^(?:landing\.)?(why|how|what)\.(headline|coreMessage|soundbite\.text|signpost)$/);
  if (!m) return "";
  const part = { headline: "headline", coreMessage: "core message", "soundbite.text": "soundbite", signpost: "signpost" }[m[2]];
  return `${actName(m[1])}, ${part}`;
}

export function deviceLine(d: Rhetoric["devices"][number]): string {
  return `${d.device}, ${d.where} (${d.source === "yours" ? "your words" : "added"}): “${d.line}” ${d.what ? d.what + " " : ""}${d.note}`;
}

export function suggestionLine(s: Rhetoric["suggestions"][number]): string {
  return `${s.where}, ${s.device}: “${s.now}” could become “${s.better}”${s.what ? ` ${s.what}` : ""}`;
}

export function hasRhetoric(r: Rhetoric | null | undefined): r is Rhetoric {
  return Boolean(r && (r.devices.length || r.suggestions.length));
}
