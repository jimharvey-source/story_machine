import type { Rhetoric } from "./schema";

// Rhetoric notes (9 October): shared by the page, the PDF and the Word download.
// No separate module. The tool points out the devices in the story so the presenter learns as they go.

export const RHETORIC_TITLE = "Rhetoric in your story";
export const RHETORIC_LEAD = "Classical devices, in your words and ours. Spot them here, then use them on purpose.";

export function deviceLine(d: Rhetoric["devices"][number]): string {
  return `${d.device}, ${d.where} (${d.source === "yours" ? "your words" : "added"}): “${d.line}” ${d.note}`;
}

export function suggestionLine(s: Rhetoric["suggestions"][number]): string {
  return `${s.where}, ${s.device}: “${s.now}” could become “${s.better}”`;
}

export function hasRhetoric(r: Rhetoric | null | undefined): r is Rhetoric {
  return Boolean(r && (r.devices.length || r.suggestions.length));
}
