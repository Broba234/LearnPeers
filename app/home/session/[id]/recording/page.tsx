"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import LearnPeersLoader from "@/components/ui/LearnPeersLoader";
import {
  ArrowLeft, Play, Volume2, Maximize2, Settings2,
  Search, ShieldCheck, Lock, Captions, Sparkles, Calendar, Clock,
} from "lucide-react";

type Segment = { at: number; role: "tutor" | "student"; name: string; text: string };
type Party = { id: string; name: string | null; avatar: string | null };

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Avatar({ name, src, className = "" }: { name?: string | null; src?: string | null; className?: string }) {
  if (src) return <img src={src} alt={name || ""} className={`object-cover bg-slate-100 ${className}`} />;
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className={`flex items-center justify-center bg-brand-100 text-brand-700 font-semibold ${className}`}>
      {initial}
    </div>
  );
}

export default function RecordingReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [session, setSession] = useState<any>(null);
  const [recording, setRecording] = useState<any>(null);
  const [query, setQuery] = useState("");
  // The placeholder frame (shown when there's no playable recording_url yet)
  // has no real playback, so the playhead stays at 0 rather than faking a
  // mid-session position.
  const currentTime = 0;

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const res = await fetch(`/api/sessions/recording?sessionId=${encodeURIComponent(sessionId)}`);
        if (!res.ok) {
          setError(res.status === 403 ? "You don't have access to this recording." : "Recording not found.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setSession(data.session);
        setRecording(data.recording);
      } catch {
        setError("Something went wrong loading the recording.");
      }
      setLoading(false);
    })();
  }, [sessionId]);

  const segments: Segment[] = recording?.transcript ?? [];
  const duration = recording?.duration_seconds ?? 0;
  const progressPct = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  const activeIdx = useMemo(() => {
    let idx = 0;
    segments.forEach((s, i) => { if (s.at <= currentTime) idx = i; });
    return idx;
  }, [segments]);

  const filtered = useMemo(() => {
    if (!query.trim()) return segments.map((s, i) => ({ s, i }));
    const q = query.toLowerCase();
    return segments.map((s, i) => ({ s, i })).filter(({ s }) => s.text.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
  }, [segments, query]);

  const retention = recording?.retention_until
    ? new Date(recording.retention_until).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;
  const dateLabel = session?.date
    ? new Date(session.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";
  const durLabel = session?.duration === 0.5 ? "30 min" : session?.duration === 1.5 ? "90 min" : "60 min";

  if (loading) {
    return <LearnPeersLoader fullScreen label="Loading recording…" />;
  }
  if (error) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center gap-3">
        <p className="text-slate-700 font-medium">{error}</p>
        <button onClick={() => router.push("/home/student/sessions")} className="text-sm text-brand-600 font-medium hover:text-brand-700">
          ← Back to sessions
        </button>
      </div>
    );
  }

  const tutor: Party = session.tutor;
  const student: Party = session.student;

  // A real, playable recording vs. the demo poster fallback.
  const hasVideo = typeof recording.recording_url === "string" && /^https?:\/\//.test(recording.recording_url);
  const status: string = recording.status || "ready";
  const processing = ["recording", "processing", "transcribing"].includes(status);
  const failed = status === "failed";
  const hasTranscript = segments.length > 0;

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:pt-14">
        {/* Breadcrumb / back */}
        <Link href="/home/student/sessions" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-5">
          <ArrowLeft className="w-4 h-4" /> Back to sessions
        </Link>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-semibold border border-rose-100">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Recorded
              </span>
              {hasTranscript ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                  <Captions className="w-3.5 h-3.5" /> Transcribed
                </span>
              ) : processing ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Processing
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">{session.topic || "Session recording"}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" />{dateLabel}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" />{durLabel}</span>
            </div>
          </div>

          {/* Participants */}
          <div className="flex items-center gap-4">
            {[tutor, student].map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Avatar name={p?.name} src={p?.avatar} className="w-9 h-9 rounded-full" />
                <div className="leading-tight">
                  <p className="text-sm font-medium text-slate-800">{p?.name}</p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">{i === 0 ? "Tutor" : "Student"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6 items-start">
          {/* ── Recording player ── */}
          <div>
            {hasVideo ? (
              // Real recording → native player.
              <video
                src={recording.recording_url}
                poster={recording.poster_url || undefined}
                controls
                playsInline
                className="w-full aspect-video rounded-2xl border border-slate-200 bg-slate-900 shadow-sm object-contain"
              />
            ) : (
              // Demo / placeholder frame with a styled control bar.
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm">
                <img src={recording.poster_url || "/demo/recording-poster.png"} alt="Session recording" className="w-full aspect-video object-cover object-top" />
                {processing ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/70 text-white">
                    <span className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <p className="text-sm font-medium">
                      {status === "transcribing" ? "Transcribing recording…" : "Processing recording…"}
                    </p>
                  </div>
                ) : (
                  // No playable recording_url and nothing is processing — there is
                  // no video to control, so don't render a play button that would
                  // silently do nothing when clicked.
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/70 text-white text-center px-6">
                    <p className="text-sm font-medium">
                      {failed
                        ? "This recording couldn't be processed."
                        : "Recording unavailable for this session."}
                    </p>
                    {failed && (
                      <p className="text-xs text-white/70 max-w-xs">
                        The transcript below (if any) is still available. Contact support if you need this recording.
                      </p>
                    )}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-10 bg-gradient-to-t from-black/70 to-transparent">
                  <div className="h-1.5 w-full rounded-full bg-white/25 overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full relative" style={{ width: `${progressPct}%` }}>
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full bg-white shadow" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2.5 text-white">
                    <div className="flex items-center gap-3">
                      <Play className="w-4 h-4" />
                      <Volume2 className="w-4 h-4 opacity-90" />
                      <span className="text-xs font-medium tabular-nums">{fmt(currentTime)} / {fmt(duration)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/90">
                      <span className="text-xs font-semibold">1×</span>
                      <Captions className="w-4 h-4" />
                      <Settings2 className="w-4 h-4" />
                      <Maximize2 className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Safeguarding / retention banner */}
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div className="text-sm">
                  <p className="font-semibold text-slate-800">Retained for safeguarding</p>
                  <p className="text-slate-500 mt-0.5">
                    Every session is recorded and transcribed automatically. Kept until{" "}
                    <span className="font-medium text-slate-700">{retention || "—"}</span> and reviewable by both
                    participants and platform safety admins.
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Encrypted at rest</span>
                    <span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Auto-transcribed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Transcript ── */}
          <div className="rounded-2xl border border-slate-200 bg-white flex flex-col max-h-[640px]">
            <div className="px-4 pt-4 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">Transcript</h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                  <Sparkles className="w-3.5 h-3.5" /> Auto-generated
                </span>
              </div>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search the transcript"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            <div className="overflow-y-auto px-2 py-2">
              {filtered.map(({ s, i }) => {
                const isActive = i === activeIdx && !query;
                const isTutor = s.role === "tutor";
                return (
                  <div
                    key={i}
                    className={`flex gap-3 rounded-xl px-2.5 py-2.5 transition-colors ${isActive ? "bg-brand-50/70 ring-1 ring-brand-100" : "hover:bg-slate-50"}`}
                  >
                    <span className={`mt-0.5 text-[11px] font-semibold tabular-nums ${isActive ? "text-brand-600" : "text-slate-400"} w-9 flex-shrink-0`}>
                      {fmt(s.at)}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold mb-0.5 ${isTutor ? "text-brand-700" : "text-slate-700"}`}>
                        {s.name}
                        {isTutor && <span className="ml-1.5 align-middle text-[10px] font-medium text-brand-400 uppercase tracking-wide">Tutor</span>}
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed">{s.text}</p>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && query && (
                <p className="text-center text-sm text-slate-400 py-10">No lines match “{query}”.</p>
              )}
              {!hasTranscript && !query && (
                <p className="text-center text-sm text-slate-400 py-10">
                  {processing ? "Transcript will appear here once processing finishes." : "No transcript available for this session."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
