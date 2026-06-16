"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Standing, TIER_META, stars } from "./types";

function Stat({ value, label, accent }: { value: React.ReactNode; label: string; accent?: string }) {
  return (
    <div className="flex flex-col">
      <span className={`text-xl font-semibold leading-none ${accent || "text-white"}`}>{value}</span>
      <span className="text-[11px] text-white/60 mt-1">{label}</span>
    </div>
  );
}

export default function StandingHeader({
  standing,
  name,
  avatar,
}: {
  standing: Standing;
  name: string | null;
  avatar: string | null;
}) {
  const league = TIER_META[standing.league] || TIER_META.bronze;
  const lvl = standing.level;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900 text-white shadow-sm">
      {/* glow */}
      <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-brand-400/10 blur-3xl" />

      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
          {/* Identity + standing */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative w-16 h-16 flex-shrink-0">
              <Image
                src={avatar || "/default-avatar.png"}
                alt={name || "Tutor"}
                fill
                className="rounded-2xl object-cover bg-white/10 ring-2 ring-white/20"
              />
              <span className="absolute -bottom-2 -right-2 inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white text-ink-900 text-xs font-bold shadow ring-2 ring-ink-900">
                {lvl.level}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-white/50">Course portfolio</p>
              <h1 className="text-xl font-semibold truncate">{name || "Your courses"}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${league.bg} ${league.text}`}>
                  {league.label} league
                </span>
                {standing.overallRating != null ? (
                  <span className="inline-flex items-center gap-1 text-sm">
                    <span className="text-amber-300 tracking-tight">{stars(standing.overallRating)}</span>
                    <span className="text-white/80 font-medium">{standing.overallRating.toFixed(2)}</span>
                    <span className="text-white/40 text-xs">· {standing.totalReviews} review{standing.totalReviews === 1 ? "" : "s"}</span>
                  </span>
                ) : (
                  <span className="text-xs text-white/40">No reviews yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Level / XP progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs text-white/70 mb-1.5">
              <span className="font-semibold text-white">Level {lvl.level}</span>
              <span>{standing.totalXp.toLocaleString()} XP · {lvl.toNext} to level {lvl.level + 1}</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-200"
                initial={{ width: 0 }}
                animate={{ width: `${lvl.progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div className="mt-7 grid grid-cols-3 sm:grid-cols-5 gap-4 sm:gap-6 border-t border-white/10 pt-5">
          <Stat value={standing.counts.live} label="Live" accent="text-emerald-300" />
          <Stat value={standing.counts.verified} label="Verified" accent="text-brand-200" />
          <Stat value={standing.counts.claimed + standing.counts.rejected} label="Locked" accent="text-white/80" />
          <Stat value={standing.totalSessions} label="Sessions" />
          <Stat value={standing.totalReviews} label="Reviews" />
        </div>
      </div>
    </div>
  );
}
