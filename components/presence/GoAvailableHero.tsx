"use client";

import { useEffect, useState } from "react";
import { Zap, Radio } from "lucide-react";
import { usePresence } from "./PresenceProvider";

function useElapsed(since: number | null) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!since) return;
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [since]);
  if (!since) return null;
  const mins = Math.floor((Date.now() - since) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function GoAvailableHero() {
  const presence = usePresence();
  const isAvailableNow = presence?.isAvailableNow ?? false;
  const onlineSince = presence?.onlineSince ?? null;
  const elapsed = useElapsed(isAvailableNow ? onlineSince : null);

  if (!presence?.isTutor) return null;
  const { toggling, toggle } = presence;

  if (isAvailableNow) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-6 shadow-lg shadow-emerald-200">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -right-2 top-10 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </span>
              <p className="text-sm font-semibold text-white uppercase tracking-widest">You're live</p>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5">Students can connect with you right now</h2>
            <p className="text-sm text-emerald-50/90 mt-1">
              {elapsed ? `Online for ${elapsed} · ` : ""}Incoming requests will ring on any screen.
            </p>
          </div>
          <button
            onClick={toggle}
            disabled={toggling}
            className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold backdrop-blur-sm border border-white/30 transition-colors disabled:opacity-60"
          >
            {toggling ? "…" : "Go offline"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6">
      <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/[0.03]" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-slate-500" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Offline</p>
          </div>
          <h2 className="text-xl font-bold text-white mt-1.5">Go available for live sessions</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-md">
            Appear as <span className="text-slate-200 font-medium">online now</span> so students can connect instantly — independent of your schedule. Your calendar still handles bookings ahead of time.
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={toggling}
          className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-colors disabled:opacity-60"
        >
          <Zap className="w-4 h-4" />
          {toggling ? "…" : "Go Available"}
        </button>
      </div>
    </div>
  );
}
