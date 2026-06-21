import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { createClient } from "@supabase/supabase-js";
import { getAuthedUser } from "@/lib/api-auth";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Lightweight, participant-guarded session lookup. Used by the "Connecting…"
 * ringing modal (student) and the room lobby to poll status and render the
 * other party / topic. Only the session's tutor or student may read it.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId || !UUID_RE.test(sessionId)) {
      return NextResponse.json({ error: "Valid sessionId is required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: session } = await supabase
      .from("Sessions")
      .select(
        `id, status, is_instant, topic, duration, date, start_time, tutor_id, student_id,
         tutor:tutor_id ( id, name, avatar ),
         student:student_id ( id, name, avatar )`
      )
      .eq("id", sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.tutor_id !== user.id && session.student_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      session,
      viewerRole: session.tutor_id === user.id ? "tutor" : "student",
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
