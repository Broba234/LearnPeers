"use client";

import { usePresence } from "./PresenceProvider";

/**
 * Compact global Available-Now toggle, shown top-right on every screen so a
 * tutor can go live (or offline) from anywhere — like a rideshare "Go online".
 */
export default function PresencePill() {
  const presence = usePresence();
  if (!presence?.isTutor || !presence.loaded) return null;

  const { isAvailableNow, toggling, toggle } = presence;

  return (
    <button
      onClick={toggle}
      disabled={toggling}
      title={isAvailableNow ? "You're live — tap to go offline" : "Go available for live sessions"}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold shadow-sm backdrop-blur transition-colors disabled:opacity-60 ${
        isAvailableNow
          ? "bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-600"
          : "bg-white/90 text-slate-600 border-slate-200 hover:bg-white"
      }`}
    >
      <span className="relative flex h-2.5 w-2.5">
        {isAvailableNow && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
            isAvailableNow ? "bg-white" : "bg-slate-300"
          }`}
        />
      </span>
      {toggling ? "…" : isAvailableNow ? "Available now" : "Go available"}
    </button>
  );
}
