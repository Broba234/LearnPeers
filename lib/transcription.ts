// Speech-to-text for finished session recordings. Optional + env-gated:
//   DEEPGRAM_API_KEY  → Deepgram (preferred: diarization → real speaker labels)
//   OPENAI_API_KEY    → Whisper  (segment timestamps, no diarization)
// If neither is set, transcription is skipped and the recording stays as-is.
export type TranscriptSegment = {
  at: number; // seconds into the recording
  role: "tutor" | "student" | "speaker";
  name: string;
  text: string;
};

export function isTranscriptionConfigured(): boolean {
  return Boolean(process.env.DEEPGRAM_API_KEY || process.env.OPENAI_API_KEY);
}

export async function transcribeRecording(opts: {
  fileUrl: string;
  tutorName?: string | null;
  studentName?: string | null;
}): Promise<TranscriptSegment[]> {
  try {
    if (process.env.DEEPGRAM_API_KEY) return await transcribeDeepgram(opts);
    if (process.env.OPENAI_API_KEY) return await transcribeWhisper(opts.fileUrl);
  } catch (e) {
    console.error("[transcription] failed:", e instanceof Error ? e.message : e);
  }
  return [];
}

// ── Deepgram (diarized) ──────────────────────────────────────────────────────
async function transcribeDeepgram({
  fileUrl,
  tutorName,
  studentName,
}: {
  fileUrl: string;
  tutorName?: string | null;
  studentName?: string | null;
}): Promise<TranscriptSegment[]> {
  const params = new URLSearchParams({
    model: "nova-2",
    diarize: "true",
    punctuate: "true",
    utterances: "true",
    smart_format: "true",
  });
  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: fileUrl }),
  });
  if (!res.ok) throw new Error(`Deepgram ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const utterances: Array<{ start: number; transcript: string; speaker?: number }> =
    data?.results?.utterances || [];
  if (!utterances.length) return [];

  // Map diarized speaker indices → tutor/student. Heuristic: the participant
  // who speaks the most words is the tutor (explaining), the other the student.
  const words: Record<number, number> = {};
  for (const u of utterances) {
    const s = u.speaker ?? 0;
    words[s] = (words[s] || 0) + (u.transcript?.split(/\s+/).length || 0);
  }
  const ranked = Object.keys(words)
    .map(Number)
    .sort((a, b) => words[b] - words[a]);
  const tutorSpeaker = ranked[0];

  return utterances
    .filter((u) => u.transcript?.trim())
    .map((u) => {
      const isTutor = (u.speaker ?? 0) === tutorSpeaker;
      return {
        at: Math.max(0, Math.round(u.start)),
        role: isTutor ? "tutor" : "student",
        name: (isTutor ? tutorName : studentName) || (isTutor ? "Tutor" : "Student"),
        text: u.transcript.trim(),
      } as TranscriptSegment;
    });
}

// ── OpenAI Whisper (no diarization) ──────────────────────────────────────────
async function transcribeWhisper(fileUrl: string): Promise<TranscriptSegment[]> {
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) throw new Error(`fetch recording ${fileRes.status}`);
  const blob = await fileRes.blob();

  const form = new FormData();
  form.append("file", blob, "session.mp4");
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Whisper ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const segments: Array<{ start: number; text: string }> = data?.segments || [];
  return segments
    .filter((s) => s.text?.trim())
    .map((s) => ({
      at: Math.max(0, Math.round(s.start)),
      role: "speaker" as const,
      name: "Speaker",
      text: s.text.trim(),
    }));
}
