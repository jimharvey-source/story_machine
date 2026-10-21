import { NextResponse } from "next/server";
import { z } from "zod";
import { currentProfile, isUnlimited } from "@/lib/access";
import { readImage } from "@/lib/anthropic";
import { ipHash } from "@/lib/guest";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Photos and screenshots (21 October 2026): the browser shrinks the picture and sends it here; Claude writes out
// what is in it; the words go back into the notes box. The picture is not stored anywhere.
// Each read costs about a cent, so there are daily ceilings, counted in story.photo_reads.
const PER_ACCOUNT = 30;
const PER_UNLIMITED = 100;
const PER_IP_SIGNED_OUT = 10;
const MAX_BASE64 = 4_000_000; // Vercel refuses bodies over 4.5 MB; the browser sends about 0.5 MB.

const Body = z.object({
  image: z.string().min(100).max(MAX_BASE64),
  mediaType: z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"]),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "That picture is too large to send. Try a smaller one." }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "That picture could not be read. Save it as a JPEG or PNG and try again." }, { status: 400 });
  }

  const profile = await currentProfile();
  const ip = await ipHash();
  const admin = supabaseAdmin();
  const since = new Date(Date.now() - 86400000).toISOString();
  if (profile) {
    const { count } = await admin.from("photo_reads").select("id", { count: "exact", head: true }).eq("user_id", profile.id).gte("created_at", since);
    const ceiling = isUnlimited(profile) ? PER_UNLIMITED : PER_ACCOUNT;
    if ((count ?? 0) >= ceiling) {
      return NextResponse.json({ error: `That is ${ceiling} pictures today, the most we read in a day. Paste the text instead, or come back tomorrow.`, code: "limit" }, { status: 429 });
    }
  } else if (ip) {
    const { count } = await admin.from("photo_reads").select("id", { count: "exact", head: true }).is("user_id", null).eq("ip_hash", ip).gte("created_at", since);
    if ((count ?? 0) >= PER_IP_SIGNED_OUT) {
      return NextResponse.json({ error: "Sign in to read more pictures today. Your first story is free.", code: "signin" }, { status: 429 });
    }
  }

  try {
    const text = await readImage(parsed.data.image, parsed.data.mediaType);
    await admin.from("photo_reads").insert({ user_id: profile?.id ?? null, ip_hash: ip });
    if (!text || text === "NOTHING") {
      return NextResponse.json({ error: "There are no words or figures in that picture that we can read. Try a sharper photo, or type the notes." }, { status: 422 });
    }
    return NextResponse.json({ text });
  } catch (e) {
    console.error("[api/photo]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "We could not read that picture just now. Try again in a moment." }, { status: 502 });
  }
}
