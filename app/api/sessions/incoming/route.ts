import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { createClient } from "@supabase/supabase-js";
import { getAuthedUser } from "@/lib/api-auth";

/**
 * The authed tutor's live, on-demand requests waiting for a response — powers
 * the global incoming-call ring overlay. Only returns pending instant sessions
 * created recently (stale ones are dropped so a ring doesn't haunt forever).
 */
const MAX_AGE_MS = 5 * 60 * 1000; // ignore instant requests older than 5 min

export async function GET() {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: sessions } = await supabase
      .from("Sessions")
      .select(
        `id, topic, amount, duration, created_at, status, is_instant,
         student:student_id ( id, name, avatar )`
      )
      .eq("tutor_id", user.id)
      .eq("is_instant", true)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    const cutoff = Date.now() - MAX_AGE_MS;
    const fresh = (sessions || []).filter(
      (s: any) => new Date(s.created_at).getTime() >= cutoff
    );

    return NextResponse.json({ success: true, requests: fresh });
  } catch (err) {
    return NextResponse.json({ error: "Server error", requests: [] }, { status: 500 });
  }
}
