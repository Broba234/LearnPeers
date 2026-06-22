// Live session recording via LiveKit Room Composite Egress → S3-compatible
// storage. Everything here is OPTIONAL and env-gated: if recording storage
// isn't configured, the helpers no-op so the session flow is never blocked
// (same "degrade gracefully" convention the Stripe integration uses).
//
// To enable, set in the environment:
//   RECORDINGS_S3_BUCKET, RECORDINGS_S3_ACCESS_KEY, RECORDINGS_S3_SECRET
//   RECORDINGS_S3_REGION            (default us-east-1)
//   RECORDINGS_S3_ENDPOINT          (e.g. Supabase Storage S3 endpoint; optional for AWS)
//   RECORDINGS_S3_FORCE_PATH_STYLE  ("true" for Supabase/MinIO/R2)
//   RECORDINGS_PUBLIC_BASE_URL      (public base used to build the playback URL; optional)
//   RECORDINGS_RETENTION_YEARS      (default 7)
import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
} from "livekit-server-sdk";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function isRecordingConfigured(): boolean {
  return Boolean(
    process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET &&
      process.env.NEXT_PUBLIC_LIVEKIT_URL &&
      process.env.RECORDINGS_S3_BUCKET &&
      process.env.RECORDINGS_S3_ACCESS_KEY &&
      process.env.RECORDINGS_S3_SECRET
  );
}

function httpHost(): string {
  return (process.env.NEXT_PUBLIC_LIVEKIT_URL || "")
    .replace(/^wss:/, "https:")
    .replace(/^ws:/, "http:");
}

function svc(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function egress(): EgressClient {
  return new EgressClient(
    httpHost(),
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );
}

/** Build a playback URL from the stored object key. */
export function publicUrlForKey(key: string): string {
  const base = process.env.RECORDINGS_PUBLIC_BASE_URL;
  if (base) return `${base.replace(/\/$/, "")}/${key}`;
  const endpoint = process.env.RECORDINGS_S3_ENDPOINT;
  const bucket = process.env.RECORDINGS_S3_BUCKET!;
  if (endpoint) return `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
  const region = process.env.RECORDINGS_S3_REGION || "us-east-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function s3Output(key: string): EncodedFileOutput {
  return new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: key,
    disableManifest: true,
    output: {
      case: "s3",
      value: new S3Upload({
        accessKey: process.env.RECORDINGS_S3_ACCESS_KEY!,
        secret: process.env.RECORDINGS_S3_SECRET!,
        bucket: process.env.RECORDINGS_S3_BUCKET!,
        region: process.env.RECORDINGS_S3_REGION || "us-east-1",
        endpoint: process.env.RECORDINGS_S3_ENDPOINT || "",
        forcePathStyle: process.env.RECORDINGS_S3_FORCE_PATH_STYLE === "true",
      }),
    },
  });
}

/**
 * Start recording a session room. Idempotent per session. Returns the egress
 * id, or null when recording isn't configured. Never throws to the caller.
 */
export async function startSessionRecording(sessionId: string): Promise<string | null> {
  if (!isRecordingConfigured()) return null;
  try {
    const supabase = svc();
    const { data: existing } = await supabase
      .from("SessionRecordings")
      .select("egress_id,status")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (existing && (existing.status === "recording" || existing.status === "processing")) {
      return existing.egress_id ?? null;
    }

    const key = `recordings/${sessionId}/${Date.now()}.mp4`;
    const info = await egress().startRoomCompositeEgress(
      `session-${sessionId}`,
      s3Output(key),
      { layout: "speaker" }
    );

    const years = Number(process.env.RECORDINGS_RETENTION_YEARS || "7");
    const retention = new Date();
    retention.setFullYear(retention.getFullYear() + (Number.isFinite(years) ? years : 7));

    await supabase.from("SessionRecordings").upsert(
      {
        session_id: sessionId,
        egress_id: info.egressId,
        status: "recording",
        recording_started_at: new Date().toISOString(),
        transcript: [],
        retention_until: retention.toISOString().slice(0, 10),
      },
      { onConflict: "session_id" }
    );

    return info.egressId;
  } catch (e) {
    console.error("[recording] start failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Stop recording a session room. No-op if nothing is recording. Never throws. */
export async function stopSessionRecording(sessionId: string): Promise<void> {
  if (!isRecordingConfigured()) return;
  try {
    const supabase = svc();
    const { data: rec } = await supabase
      .from("SessionRecordings")
      .select("egress_id,status")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (!rec?.egress_id || rec.status !== "recording") return;

    try {
      await egress().stopEgress(rec.egress_id);
    } catch {
      // Already ended — the egress webhook will reconcile the final state.
    }
    await supabase
      .from("SessionRecordings")
      .update({ status: "processing" })
      .eq("session_id", sessionId);
  } catch (e) {
    console.error("[recording] stop failed:", e instanceof Error ? e.message : e);
  }
}
