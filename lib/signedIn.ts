import { cookies } from "next/headers";

/**
 * True when the visitor has a Supabase sign-in cookie. Used only to choose button wording ("Go to my stories"
 * instead of "Build your first story") and to hide the free-story line from returning users (John, draft 9).
 */
export async function isSignedIn(): Promise<boolean> {
  const jar = await cookies();
  return jar.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}
