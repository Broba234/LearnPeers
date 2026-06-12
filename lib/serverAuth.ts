import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Resolves the authenticated Supabase user from the request cookies.
// Returns null when there is no valid session — callers must 401.
export async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Route handlers don't need to refresh cookies here.
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
