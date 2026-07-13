import { useMemo } from "react";
import Link from "next/link";
import { Star, Clock, BadgeCheck, ShieldCheck, Zap, Heart } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import type { Tutor } from "../types";
import { countTimeSlots, getStartingPrice } from "../utils";
import { SchoolBadge } from "./SchoolBadge";

export const TutorCard = ({
  tutor,
  onConnectNow,
  saved,
  onToggleSave,
}: {
  tutor: Tutor;
  onConnectNow?: (tutor: Tutor) => void;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
}) => {
  const slotsToday = useMemo(
    () => countTimeSlots(Array.isArray(tutor.availableSlots) ? tutor.availableSlots : []),
    [tutor.availableSlots]
  );

  const startingPrice = useMemo(() => getStartingPrice(tutor.subjects ?? []), [tutor.subjects]);

  // Verified courses, headlined by mastery — the peer-proof that beats Wyzant.
  const verifiedSubjects = useMemo(
    () =>
      (tutor.subjects ?? [])
        .filter((s) => s.verified && s.grade_label)
        .sort((a, b) => (b.mastery ?? 0) - (a.mastery ?? 0)),
    [tutor.subjects]
  );
  const sessions = tutor.totalSessions ?? 0;
  const reviews = tutor.totalReviews ?? 0;

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-200 transition-all duration-200 overflow-hidden">
      <div className="p-5">
        {/* Top row: avatar + name + price */}
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <Avatar src={tutor.avatar} name={tutor.name} className="w-14 h-14 ring-1 ring-slate-100" />
            {tutor.derivedActiveNow && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{tutor.name}</h3>
                  {tutor.derivedActiveNow && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 flex-shrink-0">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Online
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <SchoolBadge tutor={tutor} />
                </div>
              </div>
              {startingPrice !== null && (
                <div className="flex-shrink-0 text-right">
                  <span className="text-[11px] text-slate-400">from</span>
                  <div>
                    <span className="text-sm font-semibold text-slate-900">${startingPrice.toFixed(0)}</span>
                    <span className="text-xs text-slate-400">/hr</span>
                  </div>
                </div>
              )}
            </div>

            {/* Proof row: rating · reviews · sessions */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              {typeof tutor.rating === "number" ? (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-semibold text-slate-700">{tutor.rating.toFixed(2)}</span>
                  {reviews > 0 && <span className="text-xs text-slate-400">({reviews})</span>}
                </div>
              ) : (
                <span className="text-xs text-slate-300">New tutor</span>
              )}
              {sessions > 0 && (
                <span className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{sessions}</span> sessions
                </span>
              )}
              {slotsToday > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs font-medium">{slotsToday} slots today</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Headline proof — the single best course, front and center */}
        {tutor.topCourse?.grade_label && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
            <ShieldCheck className="h-4 w-4 flex-shrink-0 text-emerald-600" />
            <p className="text-xs text-emerald-900">
              Aced{" "}
              <span className="font-mono font-semibold">{tutor.topCourse.code}</span>
              {" — "}
              <span className="font-bold">{tutor.topCourse.grade_label}</span>
              <span className="text-emerald-700/70"> · grade verified</span>
            </p>
          </div>
        )}

        {/* Verified course chips (code + grade) */}
        {verifiedSubjects.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {verifiedSubjects.slice(0, 4).map((s, idx) => (
              <span
                key={idx}
                title={s.name}
                className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-100"
              >
                <span className="font-mono font-semibold text-slate-800">{s.code}</span>
                <span className="inline-flex items-center gap-0.5 text-emerald-600">
                  <BadgeCheck className="h-3 w-3" />
                  {s.grade_label}
                </span>
              </span>
            ))}
            {verifiedSubjects.length > 4 && (
              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-400 ring-1 ring-slate-100">
                +{verifiedSubjects.length - 4}
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(tutor.subjects ?? []).slice(0, 3).map((s, idx) => (
              <span key={idx} className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-full">
                {s.code ? <span className="font-mono text-brand-700">{s.code}</span> : s.name}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 flex items-center gap-2">
          {onToggleSave && (
            <button
              onClick={() => onToggleSave(tutor.id)}
              aria-label={saved ? "Remove from saved" : "Save tutor"}
              aria-pressed={saved}
              className={`flex items-center justify-center w-10 py-2.5 rounded-xl border transition-colors ${
                saved
                  ? "border-rose-200 bg-rose-50 text-rose-500"
                  : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-rose-400"
              }`}
            >
              <Heart className={`w-4 h-4 ${saved ? "fill-rose-500" : ""}`} />
            </button>
          )}
          <Link
            href={`/tutor/${tutor.id}`}
            className="flex-1 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors text-center"
          >
            View profile
          </Link>
          {tutor.derivedActiveNow && onConnectNow && (
            <button
              onClick={() => onConnectNow(tutor)}
              title="Start a live session now"
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
