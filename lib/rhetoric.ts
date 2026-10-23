import type { Rhetoric } from "./schema";
import { KINDS, kindOf } from "./kinds";

// Rhetoric suggestions. Each sits under the line it belongs to (John Zimmer's change, 18 October). Since the call of
// 23 October only the suggestions show: the suggested line first, then the device and what it is. The grey notes on
// devices already in the story are gone. Shared by the page, the PDF and the Word download.

export const RHETORIC_TITLE = "Add power to your words with a rhetorical device";
export const RHETORIC_LEAD =
  "One well-made line sticks in an audience's mind like the hook of a song. Strong speakers choose their words on purpose. Under some lines of your story, StoryMachine suggests another way to say it, using a rhetorical device.";

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

export function suggestionLine(s: Rhetoric["suggestions"][number]): string {
  return `${s.where ? s.where + ". " : ""}For example, you could say this: “${s.better}” ${s.device}${s.what ? `: ${s.what}` : "."}`;
}

export function hasRhetoric(r: Rhetoric | null | undefined): r is Rhetoric {
  return Boolean(r && r.suggestions.length);
}
