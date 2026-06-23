import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { WebhookReceiver, EgressStatus } from "livekit-server-sdk";
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { publicUrlForKey } from "@/lib/recording";
import { isTranscriptionConfigured, transcribeRecording } from "@/lib/transcription";

/**
 * LiveKit Egress webhook. When a session recording finishes, persist its
 * storage URL + duration onto the SessionRecordings row and (if configured)
 * transcribe it. Signature-verified, so it lives in proxy.ts PUBLIC_API.
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "LiveKit not configured" }, { status: 200 });
  }

  let event;
  try {
    const body = await request.text();
    const authHeader = request.headers.get("Authorization") || undefined;
    event = await new WebhookReceiver(apiKey, apiSecret).receive(body, authHeader);
  } catch (e) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // We only act on terminal egress events.
  if (event.event !== "egress_ended" || !event.egressInfo) {
    return NextResponse.json({ received: true });
  }

  const supabase = createSupabaseAdminClient();

  const info = event.egressInfo;
  const egressId = info.egressId;

  try {
    if (info.status === EgressStatus.EGRESS_FAILED) {
      await supabase
        .from("SessionRecordings")
        .update({ status: "failed", error: info.error || "Egress failed" })
        .eq("egress_id", egressId);
      return NextResponse.json({ received: true });
    }

    const file = info.fileResults?.[0];
    if (!file) {
      return NextResponse.json({ received: true });
    }

    const url =
      file.location && /^https?:\/\//.test(file.location)
        ? file.location
        : publicUrlForKey(file.filename);
    const durationSec =
      Number(file.duration) > 0
        ? Math.round(Number(file.duration) / 1e9)
        : info.startedAt && info.endedAt
          ? Math.round(Number(info.endedAt - info.startedAt) / 1e9)
          : null;

    await supabase
      .from("SessionRecordings")
      .update({
        recording_url: url,
        duration_seconds: durationSec,
        status: isTranscriptionConfigured() ? "transcribing" : "ready",
      })
      .eq("egress_id", egressId);

    // Transcribe (best-effort) using the session participants for speaker labels.
    if (isTranscriptionConfigured()) {
      const sessionId = (info.roomName || "").replace(/^session-/, "");
      const { data: session } = await supabase
        .from("Sessions")
        .select("tutor:tutor_id(name), student:student_id(name)")
        .eq("id", sessionId)
        .single();
      const segments = await transcribeRecording({
        fileUrl: url,
        tutorName: (session as any)?.tutor?.name,
        studentName: (session as any)?.student?.name,
      });
      await supabase
        .from("SessionRecordings")
        .update({ transcript: segments, status: "ready" })
        .eq("egress_id", egressId);
    }
  } catch (e) {
    console.error("[egress-webhook] persist failed:", e instanceof Error ? e.message : e);
  }

  // Always 2xx so LiveKit doesn't retry a processed event.
  return NextResponse.json({ received: true });
}
