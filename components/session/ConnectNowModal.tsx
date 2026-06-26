"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Zap, X } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

interface ConnectTutor {
  id: string;
  name?: string;
  avatar?: string;
  subjects?: { id?: string; name?: string; code?: string }[];
}

type Phase = "confirm" | "ringing" | "declined";

// Give up ringing after this long with no answer, so the student isn't left
// spinning forever on a request the tutor never picks up.
const RING_TIMEOUT_MS = 60_000;

export default function ConnectNowModal({
  tutor,
  isOpen,
  onClose,
}: {
  tutor: ConnectTutor | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("confirm");
  const [topic, setTopic] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const subjectOptions = (tutor?.subjects || [])
    .filter((s) => s.id)
    .map((s) => ({ value: s.id as string, label: s.code ? `${s.name} (${s.code})` : s.name || "Subject" }));

  // Reset when opening for a new tutor.
  useEffect(() => {
    if (isOpen) {
      setPhase("confirm");
      setTopic("");
      setSubjectId(subjectOptions[0]?.value || "");
      setSessionId(null);
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tutor?.id]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  // Retire the request server-side so the tutor's ring clears too.
  const cancelRequest = useCallback((id: string) => {
    fetch("/api/sessions/update-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id, status: "cancelled" }),
    }).catch(() => {});
  }, []);

  // Poll the request's status while ringing; auto-route into the room on accept.
  useEffect(() => {
    if (phase !== "ringing" || !sessionId) return;
    const tick = async () => {
      try {
        const res = await fetch(`/api/sessions/status?sessionId=${encodeURIComponent(sessionId)}`);
        if (!res.ok) return;
        const { session } = await res.json();
        if (session.status === "in_progress" || session.status === "accepted") {
          stopPolling();
          // Close the (global, layout-level) modal as we route in, so its
          // ringing overlay doesn't linger on top of the session room.
          onClose();
          router.push(`/home/session/${sessionId}`);
        } else if (session.status === "declined" || session.status === "cancelled") {
          stopPolling();
          setPhase("declined");
        }
      } catch {
        /* ignore */
      }
    };
    tick();
    pollRef.current = setInterval(tick, 2500);

    // Realtime: the instant the tutor accepts/declines this exact session row,
    // re-check status and route into the room — no waiting for the next poll.
    // The 2.5s interval remains as a fallback, so this is strictly additive.
    const channel = supabase
      .channel(`connect-now:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "Sessions", filter: `id=eq.${sessionId}` },
        () => tick()
      )
      .subscribe();

    // Stop ringing and fail gracefully if no one picks up in time.
    const timeout = setTimeout(() => {
      stopPolling();
      cancelRequest(sessionId);
      setPhase("declined");
    }, RING_TIMEOUT_MS);
    return () => {
      stopPolling();
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [phase, sessionId, router, stopPolling, cancelRequest, onClose]);

  // Never render over a live session room (the modal is mounted globally in the
  // home layout, so without this it can linger on top of the room after routing).
  if (!isOpen || !tutor || pathname?.startsWith("/home/session/")) return null;

  const tutorName = tutor.name || "this tutor";

  const handleConnect = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/sessions/instant-authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorId: tutor.id, subjectId: subjectId || undefined, topic: topic.trim() || undefined }),
      });
      const data = await res.json();
      if (res.status === 402 && data.needsCard) {
        toast.error("Add a payment method to connect instantly.");
        onClose();
        router.push("/home/student/settings");
        return;
      }
      if (!res.ok) {
        toast.error(data.error || "Could not reach this tutor.");
        if (data.code === "TUTOR_OFFLINE") onClose();
        return;
      }
      setSessionId(data.sessionId);
      setPhase("ringing");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    stopPolling();
    if (sessionId) cancelRequest(sessionId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden">
        {phase === "confirm" && (
          <>
            <div className="px-6 pt-6 pb-5 text-center border-b border-slate-100">
              <div className="flex items-center justify-center gap-1.5 text-emerald-600 text-xs font-semibold uppercase tracking-widest mb-3">
                <Zap className="w-3.5 h-3.5" /> Connect now
              </div>
              <div className="relative inline-flex">
                <img
                  src={tutor.avatar || "/default-avatar.png"}
                  alt={tutorName}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-200 bg-slate-100"
                />
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-3">Start a live session with {tutorName}</h3>
              <p className="text-sm text-slate-500 mt-1">They're online now. We'll ring them and drop you both into the room.</p>
            </div>
            <div className="p-5 space-y-3">
              {subjectOptions.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Subject</label>
                  <SearchableSelect
                    value={subjectId}
                    onChange={(v) => setSubjectId(v || "")}
                    options={subjectOptions}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  What do you need help with? <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Quadratic equations"
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={submitting}
                  className="flex-[1.4] inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60"
                >
                  <Zap className="w-4 h-4" /> {submitting ? "Requesting…" : "Connect now"}
                </button>
              </div>
              <p className="text-center text-[11px] text-slate-400">We authorize your saved card to connect and only charge it after your session.</p>
            </div>
          </>
        )}

        {phase === "ringing" && (
          <div className="px-6 py-10 text-center">
            <div className="relative inline-flex items-center justify-center mb-6">
              <span className="absolute w-28 h-28 rounded-full bg-emerald-400/20 animate-ping" />
              <span className="absolute w-24 h-24 rounded-full bg-emerald-400/30 animate-ping [animation-delay:200ms]" />
              <img
                src={tutor.avatar || "/default-avatar.png"}
                alt={tutorName}
                className="relative w-20 h-20 rounded-full object-cover ring-4 ring-emerald-100 bg-slate-100"
              />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Connecting you with {tutorName}…</h3>
            <p className="text-sm text-slate-500 mt-1">Waiting for them to accept. This usually takes a few seconds.</p>
            <div className="flex justify-center gap-1.5 mt-5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]" />
            </div>
            <button
              onClick={handleCancel}
              className="mt-7 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 font-medium transition-colors"
            >
              <X className="w-4 h-4" /> Cancel request
            </button>
          </div>
        )}

        {phase === "declined" && (
          <div className="px-6 py-10 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <X className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">{tutorName} couldn't take it right now</h3>
            <p className="text-sm text-slate-500 mt-1">No worries — you can try another available tutor or book a time that works.</p>
            <button
              onClick={onClose}
              className="mt-6 w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              Find another tutor
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
