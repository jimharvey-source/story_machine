import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Per-request client that reads the signed-in user's session from cookies. */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(URL, PUBLISHABLE, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a server component: cookies are read-only there. Route handlers can set them.
        }
      },
    },
  });
}

type Admin = ReturnType<typeof makeAdmin>;
function makeAdmin(key: string) {
  return createClient(URL, key, { db: { schema: "story" }, auth: { persistSession: false } });
}
let admin: Admin | null = null;
/** Service-role client for the `story` schema. Server only. Bypasses row level security. */
export function supabaseAdmin(): Admin {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  if (!admin) admin = makeAdmin(key);
  return admin;
}
