import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client authenticated with the service-role key.
 *
 * This BYPASSES Row Level Security — never import it into a client component or
 * expose it to the browser. Use it inside API route handlers and server-side
 * utilities for privileged DB writes, storage operations, and admin reads.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
