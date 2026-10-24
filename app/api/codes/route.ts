import { NextResponse } from "next/server";
import { z } from "zod";
import { currentProfile, signInRequired } from "@/lib/access";
import { changeCode, isCodeAdmin, listCodes, makeCode } from "@/lib/codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Codes page's API. Only the addresses in lib/codes.ts may use it.
async function admin() {
  const p = await currentProfile();
  if (!p) return { error: signInRequired() };
  if (!isCodeAdmin(p.email)) return { error: NextResponse.json({ error: "This page is for the StoryMachine team." }, { status: 403 }) };
  return { p };
}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a join-by date");
const NewCode = z.discriminatedUnion("type", [
  z.object({ type: z.literal("personal"), name: z.string().min(1).max(80), email: z.string().max(200).optional(), until: day }),
  z.object({ type: z.literal("group"), name: z.string().min(1).max(60), slug: z.string().max(40), places: z.number().int(), until: day }),
]);
const Change = z.object({ code: z.string().min(3).max(40), active: z.boolean().optional(), places: z.number().int().optional() });

export async function GET() {
  const a = await admin();
  if (a.error) return a.error;
  return NextResponse.json({ codes: await listCodes() });
}

export async function POST(req: Request) {
  const a = await admin();
  if (a.error) return a.error;
  const parsed = NewCode.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  const r = await makeCode(a.p.email, parsed.data);
  return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: 400 });
}

export async function PATCH(req: Request) {
  const a = await admin();
  if (a.error) return a.error;
  const parsed = Change.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the change." }, { status: 400 });
  const r = await changeCode(parsed.data.code, parsed.data);
  return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: 400 });
}
