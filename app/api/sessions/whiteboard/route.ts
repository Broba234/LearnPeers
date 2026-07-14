import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser } from "@/lib/api-auth";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Persist + restore the session whiteboard so it survives a refresh/reconnect
 * and remains as study notes afterwards. Participant-guarded (the service-role
 * client bypasses RLS, so membership is checked here explicitly).
 */
async function guard(sessionId: string | null) {
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return { error: NextResponse.json({ error: "Valid sessionId required" }, { status: 400 }) };
  }
  const user = await getAuthedUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  const supabase = createSupabaseAdminClient();
  const { data: session } = await supabase
    .from("Sessions")
    .select("id, tutor_id, student_id")
    .eq("id", sessionId)
    .single();
  if (!session) {
    return { error: NextResponse.json({ error: "Session not found" }, { status: 404 }) };
  }
  if (session.tutor_id !== user.id && session.student_id !== user.id) {
    return { error: NextResponse.json({ error: "Not authorized" }, { status: 403 }) };
  }
  return { supabase };
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    const g = await guard(sessionId);
    if (g.error) return g.error;

    const { data } = await g.supabase!
      .from("SessionWhiteboards")
      .select("scene, updated_at")
      .eq("session_id", sessionId)
      .maybeSingle();

    return NextResponse.json({ scene: data?.scene ?? null, updatedAt: data?.updated_at ?? null });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId: string | null = body?.sessionId ?? null;
    const g = await guard(sessionId);
    if (g.error) return g.error;

    const scene = body?.scene;
    if (scene == null || typeof scene !== "object") {
      return NextResponse.json({ error: "scene object required" }, { status: 400 });
    }

    const { error } = await g.supabase!
      .from("SessionWhiteboards")
      .upsert(
        { session_id: sessionId, scene, updated_at: new Date().toISOString() },
        { onConflict: "session_id" }
      );
    if (error) {
      console.error("[WHITEBOARD_SAVE]", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
