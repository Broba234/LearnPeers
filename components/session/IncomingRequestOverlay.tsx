"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Zap, Phone, X } from "lucide-react";

interface IncomingRequest {
  id: string;
  topic: string | null;
  amount: number | null;
  duration: number | null;
  created_at: string;
  student: { id: string; name: string | null; avatar: string | null } | null;
}

/**
 * Global "incoming call" overlay for tutors. Polls for live (instant) session
 * requests and rings on any screen with Accept & Start / Decline — the
 * industry-standard on-demand request experience.
 */
export default function IncomingRequestOverlay({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [request, setRequest] = useState<IncomingRequest | null>(null);
  const [acting, setActing] = useState(false);
  const handledIds = useRef<Set<string>>(new Set());
  const lastRingId = useRef<string | null>(null);

  const inRoom = pathname?.startsWith("/home/session/");

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions/incoming");
      if (!res.ok) return;
      const data = await res.json();
      const next: IncomingRequest | undefined = (data.requests || []).find(
        (r: IncomingRequest) => !handledIds.current.has(r.id)
      );
      setRequest(next || null);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    poll();
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, [enabled, poll]);

  // Ring (sound + vibration) when a new request appears.
  useEffect(() => {
    if (!request || inRoom) return;
    if (lastRingId.current === request.id) return;
    lastRingId.current = request.id;
    try {
      navigator.vibrate?.([200, 100, 200]);
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch {
      /* autoplay blocked — fine */
    }
  }, [request, inRoom]);

  const respond = async (status: "in_progress" | "declined") => {
    if (!request) return;
    setActing(true);
    handledIds.current.add(request.id);
    try {
      const res = await fetch("/api/sessions/update-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: request.id, status }),
      });
      if (res.ok && status === "in_progress") {
        router.push(`/home/session/${request.id}`);
      }
      setRequest(null);
    } catch {
      handledIds.current.delete(request.id);
    } finally {
      setActing(false);
    }
  };

  if (!enabled || !request || inRoom) return null;

  const studentName = request.student?.name || "A student";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden animate-[ringIn_0.25s_ease-out]">
        <style>{`@keyframes ringIn{from{transform:translateY(12px) scale(.98);opacity:0}to{transform:none;opacity:1}}`}</style>
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 px-6 pt-7 pb-6 text-center">
          <div className="flex items-center justify-center gap-1.5 text-white/90 text-xs font-semibold uppercase tracking-widest mb-4">
            <Zap className="w-3.5 h-3.5" /> Live session request
          </div>
          <div className="relative inline-flex">
            <span className="absolute inset-0 rounded-full bg-white/40 animate-ping" />
            <img
              src={request.student?.avatar || "/default-avatar.png"}
              alt={studentName}
              className="relative w-20 h-20 rounded-full object-cover ring-4 ring-white/60 bg-white"
            />
          </div>
          <h3 className="text-xl font-bold text-white mt-4">{studentName}</h3>
          <p className="text-emerald-50/90 text-sm mt-0.5">
            {request.topic || "wants to connect now"}
            {request.amount != null && request.amount > 0 ? ` · $${request.amount.toFixed(0)}` : ""}
          </p>
        </div>

        <div className="p-5 flex items-center gap-3">
          <button
            onClick={() => respond("declined")}
            disabled={acting}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors disabled:opacity-60"
          >
            <X className="w-4 h-4" /> Decline
          </button>
          <button
            onClick={() => respond("in_progress")}
            disabled={acting}
            className="flex-[1.4] inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60"
          >
            <Phone className="w-4 h-4" /> {acting ? "Connecting…" : "Accept & Start"}
          </button>
        </div>
      </div>
    </div>
  );
}
