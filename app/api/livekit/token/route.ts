import { NextRequest } from "next/server";
export const runtime = "nodejs";
import { AccessToken } from "livekit-server-sdk";
import { getAuthedUser } from "@/lib/api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A LiveKit join token is only issued once the session is actually open:
// the tutor has accepted (instant) or payment has flipped it to accepted
// (booked). This is the real door — without it, a `pending`/unpaid session
// is joinable by anyone who knows the room name.
const ENTERABLE = new Set(["accepted", "in_progress"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { room, name } = await req.json();
    if (!room || typeof room !== "string") {
      return json({ error: "Missing room" }, 400);
    }

    // Identity comes from the auth cookie, never from the request body.
    const user = await getAuthedUser();
    if (!user) {
      return json({ error: "Not authenticated" }, 401);
    }

    // Rooms are named `session-<uuid>`. Resolve it and verify the caller may
    // actually join: they must be a participant AND the session must be open.
    const sessionId = room.replace(/^session-/, "");
    if (!UUID_RE.test(sessionId)) {
      return json({ error: "Invalid room" }, 400);
    }

    const supabase = createSupabaseAdminClient();
    const { data: session } = await supabase
      .from("Sessions")
      .select("id, status, tutor_id, student_id")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return json({ error: "Session not found" }, 404);
    }
    const isParticipant =
      session.tutor_id === user.id || session.student_id === user.id;
    if (!isParticipant) {
      return json({ error: "You are not a participant of this session" }, 403);
    }
    if (!ENTERABLE.has(session.status)) {
      // pending → not accepted/paid yet; completed/declined/cancelled → over.
      return json(
        { error: "This session is not open to join yet", status: session.status },
        403,
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;
    if (!apiKey || !apiSecret) {
      console.error("Missing LiveKit credentials");
      return json({ error: "Missing LiveKit credentials" }, 500);
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: typeof name === "string" && name.trim() ? name.trim() : undefined,
    });

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return json({ token, serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL });
  } catch (error) {
    console.error("=== LiveKit Token API Error ===", error);
    return json(
      {
        error: "Failed to generate token",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
}
