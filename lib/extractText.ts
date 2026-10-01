// Read the words out of an uploaded file. Runs in the browser, so the file never leaves the person's
// computer and its size no longer matters: a 150 MB deck is big because of its pictures, and only the
// words are kept.

import JSZip from "jszip";

export const MAX_CHARS = 60000;

export type Extracted = { text: string; truncated: boolean; chars: number; name: string };

export class ExtractError extends Error {
  name = "ExtractError";
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

async function pdfText(buf: ArrayBuffer): Promise<string> {
  // unpdf carries its own build of pdf.js that runs without a worker, in the browser or on the server.
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return text ?? "";
}

async function docxText(buf: ArrayBuffer): Promise<string> {
  // The prebuilt browser bundle of mammoth: it takes an ArrayBuffer and needs nothing from Node.
  const mod = (await import("mammoth/mammoth.browser.js")) as unknown as { default?: MammothBrowser } & MammothBrowser;
  const mammoth = mod.default ?? mod;
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value ?? "";
}

type MammothBrowser = { extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }> };

// PowerPoint: the text runs of each slide's XML, in slide order, then its speaker notes.
async function pptxText(buf: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  const out: string[] = [];
  for (const name of slideNames) {
    const xml = await zip.file(name)!.async("string");
    const paragraphs = xml.split(/<\/a:p>/).map((p) => [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(""));
    const text = paragraphs.map((t) => t.trim()).filter(Boolean).join("\n");
    const n = name.match(/\d+/)![0];
    if (text) out.push(`Slide ${n}\n${text}`);
    const notes = zip.file(`ppt/notesSlides/notesSlide${n}.xml`);
    if (notes) {
      const nxml = await notes.async("string");
      const ntext = [...nxml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(" ").trim();
      if (ntext && !/^\d+$/.test(ntext)) out.push(`Notes for slide ${n}\n${ntext}`);
    }
  }
  return decodeEntities(out.join("\n\n"));
}

export async function extractFromFile(name: string, buf: ArrayBuffer): Promise<Extracted> {
  const lower = name.toLowerCase();
  let text = "";
  if (lower.endsWith(".pdf")) text = await pdfText(buf);
  else if (lower.endsWith(".docx")) text = await docxText(buf);
  else if (lower.endsWith(".pptx")) text = await pptxText(buf);
  else if (lower.endsWith(".txt") || lower.endsWith(".md")) text = new TextDecoder().decode(buf);
  else throw new ExtractError("Upload a PDF, Word (.docx), PowerPoint (.pptx), text or Markdown file.");
  text = text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) {
    throw new ExtractError(
      lower.endsWith(".pdf")
        ? "This PDF has no text we can read. Export it with text, or paste the text."
        : "No readable text found in that file. Paste the text instead.",
    );
  }
  const truncated = text.length > MAX_CHARS;
  return { text: truncated ? text.slice(0, MAX_CHARS) : text, truncated, chars: text.length, name };
}
