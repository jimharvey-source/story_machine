import type { Rhetoric } from "./schema";
import { KINDS, kindOf } from "./kinds";

// Rhetoric suggestions. Each sits under the line it belongs to (John Zimmer's change, 18 October). Since the call of
// 23 October only the suggestions show: the suggested line first, then the device and what it is. The grey notes on
// devices already in the story are gone. Shared by the page, the PDF and the Word download.

export const RHETORIC_TITLE = "Add power to your words with a rhetorical device";
export const RHETORIC_LEAD =
  "One well-made line sticks in an audience's mind like the hook of a song. Strong speakers choose their words on purpose. Under some lines of your story above, StoryMachine has suggested another way to say it, using a rhetorical device.";

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
  const d = checkDevice(s);
  return `${s.where ? s.where + ". " : ""}For example, you could say this: “${s.better}” ${DEVICE_INTRO} ${d.device}.${d.what ? ` ${d.what}` : ""}`;
}

/**
 * The words before the device's name (call of 16 November): a reader working in English should not meet a Greek
 * word with nothing to say it is the name of a device.
 */
export const DEVICE_INTRO = "The rhetorical device is known as";

const ANADIPLOSIS_WHAT = "Anadiplosis ends one sentence or clause with a word and starts the next with the same word, to link the two ideas.";

/**
 * A check on the model's naming (John Zimmer, 16 November): "Contact WIPO this week. This week is how..." came back as
 * epizeuxis. Epizeuxis repeats a word straight away ("weak, weak, weak"); a word that ends one sentence and opens the
 * next is anadiplosis. When the line shows the second and not the first, the name and the definition are corrected.
 */
export function checkDevice<T extends { better: string; device: string; what?: string }>(s: T): T {
  if (!/^epizeuxis$/i.test(s.device.trim())) return s;
  const line = s.better ?? "";
  const repeated = /\b([A-Za-z']+)\b(?:[\s,!…-]+)\1\b/i.test(line);
  const linked = /\b([A-Za-z']+(?:\s+[A-Za-z']+)?)\s*[.;:?!]\s+\1\b/i.test(line);
  if (!repeated && linked) return { ...s, device: "Anadiplosis", what: ANADIPLOSIS_WHAT };
  return s;
}

export function hasRhetoric(r: Rhetoric | null | undefined): r is Rhetoric {
  return Boolean(r && r.suggestions.length);
}

/**
 * A suggested line worth showing: quotation marks and stray punctuation stripped, and at least three words.
 * The model once returned a line that was only a pair of quotation marks (John Zimmer, 2 November): Use this line
 * then emptied the headline. Such a suggestion is dropped, on the server and again on the page for saved stories.
 */
export function cleanLine(t: string | null | undefined): string {
  const s = (t ?? "").trim().replace(/^[\s"'“”‘’«».,;:-]+|[\s"'“”‘’»«,;:-]+$/g, "").trim();
  return s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length >= 3 ? s : "";
}
