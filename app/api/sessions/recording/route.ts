import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAuthedUser } from "@/lib/api-auth";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Safeguarding: the student and admins keep access to a session's recording +
// transcript, but the tutor's access expires shortly after the session ends.
// Tutors are (often older) university students and the learners are minors, so
// they have no ongoing need to hold a child's session footage.
const TUTOR_ACCESS_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Participant-guarded session recording + transcript. Recordings are retained
 * for safeguarding and are reviewable only by the session's tutor, student, or
 * an admin.
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

    const supabase = createSupabaseAdminClient();

    const { data: session } = await supabase
      .from("Sessions")
      .select(
        `id, status, topic, duration, date, created_at, tutor_id, student_id,
         tutor:tutor_id ( id, name, avatar ),
         student:student_id ( id, name, avatar )`
      )
      .eq("id", sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Only the participants (or an admin) may review a recording.
    let isAdmin = false;
    if (session.tutor_id !== user.id && session.student_id !== user.id) {
      const { data: prof } = await supabase
        .from("Profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      isAdmin = prof?.role === "admin";
      if (!isAdmin) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
    }

    const { data: recording } = await supabase
      .from("SessionRecordings")
      .select("recording_url, poster_url, duration_seconds, transcript, retention_until, created_at")
      .eq("session_id", sessionId)
      .single();

    if (!recording) {
      return NextResponse.json({ error: "No recording for this session" }, { status: 404 });
    }

    const viewerRole =
      session.tutor_id === user.id ? "tutor" : session.student_id === user.id ? "student" : "admin";

    // Tutor access expires ~1h after the session ended. We use the recording's
    // created_at (egress finishes ~when the session ends) as the reference, so
    // the cutoff tracks the real end rather than the scheduled time.
    if (viewerRole === "tutor" && recording.created_at) {
      const endedAt = new Date(recording.created_at).getTime();
      if (Number.isFinite(endedAt) && Date.now() - endedAt > TUTOR_ACCESS_WINDOW_MS) {
        return NextResponse.json(
          {
            error: "expired",
            message:
              "For student safety, tutor access to session recordings expires one hour after the session ends.",
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      session,
      recording,
      viewerRole,
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
