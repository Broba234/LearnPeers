import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Returns the authenticated Supabase user for the current request (derived from
 * the session cookie), or null. Profiles.id === auth user id, so the returned
 * `user.id` is also the profile id used as tutor_id/student_id.
 *
 * Never trust a user/profile id sent in the request body for authorization —
 * use this instead.
 */
export async function getAuthedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

/**
 * API-route guard. Returns the authenticated user, or a ready-to-return 401
 * response. Derive identity from `user.id` (=== Profiles.id) / `user.email`
 * (unique) — never from a client-supplied id/email in the query or body.
 *
 *   const { user, res } = await requireUser();
 *   if (res) return res; // 401
 *   // ...use user.id / user.email
 */
export async function requireUser(): Promise<
  { user: User; res: null } | { user: null; res: NextResponse }
> {
  const user = await getAuthedUser();
  if (!user) {
    return { user: null, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, res: null };
}
