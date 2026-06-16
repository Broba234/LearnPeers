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
