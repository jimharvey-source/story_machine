import { NextResponse } from "next/server";
import JSZip from "jszip";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_CHARS = 60000;

async function extractPdf(buf: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const result = await parser.getText();
  return result.text ?? "";
}

async function extractDocx(buf: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: buf });
  return result.value ?? "";
}

// PowerPoint: read the text runs out of each slide's XML, in slide order.
async function extractPptx(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  const out: string[] = [];
  for (const name of slideNames) {
    const xml = await zip.file(name)!.async("string");
    const paragraphs = xml.split(/<\/a:p>/).map((p) => {
      const runs = [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
      return runs.join("");
    });
    const text = paragraphs.map((t) => t.trim()).filter(Boolean).join("\n");
    const n = name.match(/\d+/)![0];
    if (text) out.push(`Slide ${n}\n${text}`);
    const notesName = `ppt/notesSlides/notesSlide${n}.xml`;
    const notes = zip.file(notesName);
    if (notes) {
      const nxml = await notes.async("string");
      const ntext = [...nxml.matchAll(/<a:t>([^<]*)<\/a:t>/g)]
        .map((m) => m[1])
        .join(" ")
        .trim();
      if (ntext && !/^\d+$/.test(ntext)) out.push(`Notes for slide ${n}\n${ntext}`);
    }
  }
  return out.join("\n\n");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Send the file as form data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That file is over 15 MB. Trim it or paste the text." }, { status: 413 });
  }
  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    let text = "";
    if (name.endsWith(".pdf")) text = await extractPdf(buf);
    else if (name.endsWith(".docx")) text = await extractDocx(buf);
    else if (name.endsWith(".pptx")) text = decodeEntities(await extractPptx(buf));
    else if (name.endsWith(".txt") || name.endsWith(".md")) text = buf.toString("utf8");
    else {
      return NextResponse.json(
        { error: "Upload a PDF, Word (.docx), PowerPoint (.pptx), text or Markdown file." },
        { status: 415 }
      );
    }
    text = text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!text) {
      return NextResponse.json(
        { error: "No readable text found in that file. If it is a scanned PDF, paste the text instead." },
        { status: 422 }
      );
    }
    const truncated = text.length > MAX_CHARS;
    return NextResponse.json({
      text: truncated ? text.slice(0, MAX_CHARS) : text,
      truncated,
      chars: text.length,
      name: file.name,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/extract]", message);
    return NextResponse.json({ error: "Could not read that file. " + message }, { status: 500 });
  }
}
