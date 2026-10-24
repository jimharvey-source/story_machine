import { supabaseAdmin } from "./supabase/server";

// The Codes page (/codes): Jim and John make programme codes without SQL. Open only to these addresses.
// To add someone, add their sign-in address here and push.
const CODE_ADMINS = new Set(["jim@allcow.com", "jim.harvey@themessagebusiness.com", "john.s.zimmer@gmail.com"]);

export function isCodeAdmin(email: string | null | undefined): boolean {
  return Boolean(email && CODE_ADMINS.has(email.trim().toLowerCase()));
}

/** Every code made here gives five stories a person (decided 23 October: priced into training). */
export const STORIES_PER_PERSON = 5;

// Addresses a group may not take: real pages, and words that would confuse.
const RESERVED = new Set([
  "api", "auth", "build", "guide", "join", "codes", "terms", "privacy", "refunds", "about", "admin",
  "login", "signin", "pricing", "help", "story", "stories", "storymachine", "ariadne", "favicon.ico", "icon.svg",
]);

// No 0, O, 1, I or L, so a code read aloud or off a handout cannot be mistaken.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function suffix(): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

function stem(name: string): string {
  const s = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (s || "CODE").slice(0, 14);
}

export function slugError(slug: string): string | null {
  if (!/^[a-z0-9][a-z0-9-]{1,30}$/.test(slug)) return "The address is 2 to 31 lower-case letters, numbers or dashes, for example acme or acme-leaders.";
  if (RESERVED.has(slug)) return "That address is taken by a page on the site. Choose another.";
  return null;
}

export type CodeRow = {
  code: string;
  label: string | null;
  kind: "personal" | "group";
  slug: string | null;
  greeting: string | null;
  places: number | null;
  uses: number;
  storiesEach: number;
  until: string | null;
  active: boolean;
  state: "Open" | "Switched off" | "Closed: date passed" | "Full";
  createdAt: string;
  createdBy: string | null;
  people: Array<{ email: string; stories: number; finished: number; lastStory: string | null }>;
};

/** Every code, newest first, with the people whose account last used it and their stories. */
export async function listCodes(): Promise<CodeRow[]> {
  const admin = supabaseAdmin();
  const { data: codes, error } = await admin
    .from("cohort_codes")
    .select("code, label, slug, greeting, max_uses, uses, active, expires_at, created_at, stories_per_user, created_by")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const list = codes ?? [];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, cohort_code")
    .in("cohort_code", list.map((c) => c.code));
  const ids = (profiles ?? []).map((p) => p.id);
  const { data: stories } = ids.length
    ? await admin.from("stories").select("user_id, created_at, prologue:landing->>prologue").in("user_id", ids)
    : { data: [] as Array<{ user_id: string; created_at: string; prologue: string | null }> };
  const byUser = new Map<string, { stories: number; finished: number; lastStory: string | null }>();
  for (const s of stories ?? []) {
    const u = byUser.get(s.user_id) ?? { stories: 0, finished: 0, lastStory: null };
    u.stories += 1;
    if (s.prologue) u.finished += 1; // Stage 2 done
    if (!u.lastStory || s.created_at > u.lastStory) u.lastStory = s.created_at;
    byUser.set(s.user_id, u);
  }
  const now = Date.now();
  return list.map((c) => ({
    code: c.code,
    label: c.label,
    kind: c.slug || (c.max_uses ?? 0) > 1 ? "group" : "personal",
    slug: c.slug,
    greeting: c.greeting,
    places: c.max_uses,
    uses: c.uses,
    storiesEach: c.stories_per_user,
    until: c.expires_at,
    active: c.active,
    state: !c.active
      ? "Switched off"
      : c.expires_at && new Date(c.expires_at).getTime() <= now
        ? "Closed: date passed"
        : c.max_uses !== null && c.uses >= c.max_uses
          ? "Full"
          : "Open",
    createdAt: c.created_at,
    createdBy: c.created_by ?? null,
    people: (profiles ?? [])
      .filter((p) => p.cohort_code === c.code)
      .map((p) => ({ email: p.email, ...(byUser.get(p.id) ?? { stories: 0, finished: 0, lastStory: null }) })),
  }));
}

type NewCode =
  | { type: "personal"; name: string; email?: string; until: string }
  | { type: "group"; name: string; slug: string; places: number; until: string };

/** Make a code. Returns the code, or a message to show. */
export async function makeCode(by: string, input: NewCode): Promise<{ ok: true; code: string; slug: string | null } | { ok: false; error: string }> {
  const admin = supabaseAdmin();
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Give a name." };
  const end = new Date(`${input.until}T23:59:59Z`);
  const now = Date.now();
  if (Number.isNaN(end.getTime()) || end.getTime() <= now) return { ok: false, error: "The join-by date must be in the future." };
  if (end.getTime() > now + 2 * 366 * 24 * 3600 * 1000) return { ok: false, error: "The join-by date can be up to two years ahead." };

  let slug: string | null = null;
  if (input.type === "group") {
    slug = input.slug.trim().toLowerCase();
    const bad = slugError(slug);
    if (bad) return { ok: false, error: bad };
    const { data: taken } = await admin.from("cohort_codes").select("code").eq("slug", slug).maybeSingle();
    if (taken) return { ok: false, error: `The address /${slug} is already in use. Choose another.` };
    if (!Number.isInteger(input.places) || input.places < 1 || input.places > 500) return { ok: false, error: "Places must be between 1 and 500." };
  }

  const first = name.split(" ")[0];
  const row =
    input.type === "personal"
      ? {
          label: `Personal: ${name}${input.email ? ` (${input.email.trim()})` : ""}`,
          greeting: `Welcome, ${first}.`,
          banner: "Your trial",
          max_uses: 1,
          slug: null,
        }
      : {
          label: `Group: ${name}`,
          greeting: `Welcome to the ${name} programme.`,
          banner: `${name} programme`,
          max_uses: input.places,
          slug,
        };

  // A clash on the code itself is rare; try a fresh suffix a few times.
  for (let i = 0; i < 5; i++) {
    const code = `${stem(name)}-${suffix()}`;
    const { error } = await admin.from("cohort_codes").insert({
      code,
      ...row,
      uses: 0,
      active: true,
      expires_at: end.toISOString(),
      stories_per_user: STORIES_PER_PERSON,
      created_by: by.toLowerCase(),
    });
    if (!error) return { ok: true, code, slug };
    if (!/duplicate|unique/i.test(error.message)) return { ok: false, error: error.message };
    if (/slug/i.test(error.message)) return { ok: false, error: `The address /${slug} is already in use. Choose another.` };
  }
  return { ok: false, error: "Could not make a code. Try again." };
}

/** Switch a code on or off, or change a group's places. */
export async function changeCode(code: string, change: { active?: boolean; places?: number }): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("cohort_codes").select("code, uses, max_uses, slug").eq("code", code).maybeSingle();
  if (!c) return { ok: false, error: "No such code." };
  const patch: { active?: boolean; max_uses?: number } = {};
  if (typeof change.active === "boolean") patch.active = change.active;
  if (typeof change.places === "number") {
    if (!c.slug && (c.max_uses ?? 0) <= 1) return { ok: false, error: "A personal code has one place." };
    if (!Number.isInteger(change.places) || change.places < Math.max(1, c.uses) || change.places > 500) {
      return { ok: false, error: `Places must be at least ${Math.max(1, c.uses)} (the places already used) and at most 500.` };
    }
    patch.max_uses = change.places;
  }
  if (!Object.keys(patch).length) return { ok: false, error: "Nothing to change." };
  const { error } = await admin.from("cohort_codes").update(patch).eq("code", code);
  return error ? { ok: false, error: error.message } : { ok: true };
}
