import { NextResponse } from "next/server";
import { currentProfile, logGeneration } from "@/lib/access";
import { ExtractError, MAX_CHARS, extractFromFile } from "@/lib/extractText";

export const runtime = "nodejs";
export const maxDuration = 60;

// The page now reads files in the browser and sends nothing here. This route stays for any old page
// still open in a tab. Vercel functions accept request bodies up to 4.5 MB.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  // Read the body before any early answer: replying while the upload is still arriving breaks the browser's fetch.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Send the file as form data" }, { status: 400 });
  }
  const profile = await currentProfile();
  if (profile) await logGeneration(profile.id, "extract");
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That file is over 4 MB. Reload the page and upload it again." }, { status: 413 });
  }
  try {
    const buf = await file.arrayBuffer();
    if (file.name.toLowerCase().endsWith(".docx")) {
      // On the server, mammoth's Node build takes a Buffer.
      const mammoth = await import("mammoth");
      const text = ((await mammoth.extractRawText({ buffer: Buffer.from(buf) })).value ?? "").trim();
      if (!text) throw new ExtractError("No readable text found in that file. Paste the text instead.");
      return NextResponse.json({ text: text.slice(0, MAX_CHARS), truncated: text.length > MAX_CHARS, chars: text.length, name: file.name });
    }
    return NextResponse.json(await extractFromFile(file.name, buf));
  } catch (e) {
    if (e instanceof ExtractError) return NextResponse.json({ error: e.message }, { status: 422 });
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/extract]", message);
    return NextResponse.json({ error: "Could not read that file. " + message }, { status: 500 });
  }
}
