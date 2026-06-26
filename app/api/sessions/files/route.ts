import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser } from "@/lib/api-auth";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The in-session file drive. Files are uploaded to storage client-side; this
 * route records/lists their metadata. Participant-guarded (service-role client
 * bypasses RLS, so membership is enforced here).
 */
async function guard(sessionId: string | null) {
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return { error: NextResponse.json({ error: "Valid sessionId required" }, { status: 400 }) };
  }
  const user = await getAuthedUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const supabase = createSupabaseAdminClient();
  const { data: session } = await supabase
    .from("Sessions")
    .select("id, tutor_id, student_id")
    .eq("id", sessionId)
    .single();
  if (!session) return { error: NextResponse.json({ error: "Session not found" }, { status: 404 }) };
  if (session.tutor_id !== user.id && session.student_id !== user.id) {
    return { error: NextResponse.json({ error: "Not authorized" }, { status: 403 }) };
  }
  return { supabase, userId: user.id };
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    const g = await guard(sessionId);
    if (g.error) return g.error;
    const { data } = await g.supabase!
      .from("SessionFiles")
      .select("id, name, type, size, url, storage_path, shared, uploader_id, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    return NextResponse.json({ files: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const g = await guard(body?.sessionId ?? null);
    if (g.error) return g.error;

    const { name, type, size, url, storagePath, shared } = body || {};
    if (!name || !storagePath) {
      return NextResponse.json({ error: "name and storagePath required" }, { status: 400 });
    }
    const { data, error } = await g.supabase!
      .from("SessionFiles")
      .insert({
        session_id: body.sessionId,
        uploader_id: g.userId,
        name,
        type: type ?? null,
        size: typeof size === "number" ? size : null,
        url: url ?? null,
        storage_path: storagePath,
        shared: Boolean(shared),
      })
      .select("id, name, type, size, url, storage_path, shared, uploader_id, created_at")
      .single();
    if (error) {
      return NextResponse.json({ error: "Failed to record file", details: error.message }, { status: 500 });
    }
    return NextResponse.json({ file: data });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
