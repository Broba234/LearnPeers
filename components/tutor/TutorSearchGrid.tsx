"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, GraduationCap, Search, ShieldCheck, Star, X } from "lucide-react";
import Avatar from "@/components/ui/Avatar";

export type TutorCard = {
  id: string;
  name: string | null;
  avatar: string | null;
  rating: number | null;
  school: { name: string; abbreviation: string | null } | null;
  verified: boolean;
  totalReviews: number;
  totalSessions: number;
  codes: string[];
  topCode: string | null;
  topGradeLabel: string | null;
  fromPrice: number | null;
};

export default function TutorSearchGrid({ tutors }: { tutors: TutorCard[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tutors;
    return tutors.filter((t) => {
      const haystack = [
        t.name ?? "",
        t.school?.name ?? "",
        t.school?.abbreviation ?? "",
        ...t.codes,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [tutors, query]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by course code (e.g. MCV4U), tutor name, or school…"
          aria-label="Search tutors by course code, name, or school"
          className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-11 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100 sm:text-base"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {query && (
        <p className="mt-3 text-xs font-medium text-slate-400">
          {filtered.length === 0
            ? `No tutors match "${query}" yet`
            : `${filtered.length} tutor${filtered.length === 1 ? "" : "s"} match "${query}"`}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="mx-auto mt-10 max-w-sm py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <Search className="h-6 w-6 text-brand-500" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">No matches yet</h2>
          <p className="mt-1 text-sm text-slate-400">
            We&apos;re onboarding verified student tutors from across Ontario universities
            right now. Try a different course code, or join the beta and we&apos;ll match
            you the moment your course goes live.
          </p>
          <Link
            href="/auth/register?role=student"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Join the beta <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Link
              key={t.id}
              href={`/tutor/${t.id}`}
              className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    src={t.avatar}
                    name={t.name}
                    rounded="rounded-xl"
                    className="h-12 w-12 flex-shrink-0 text-lg"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{t.name}</p>
                    {t.school && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                        {t.verified ? (
                          <BadgeCheck className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                        ) : (
                          <GraduationCap className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                        )}
                        {t.school.abbreviation || t.school.name}
                      </p>
                    )}
                  </div>
                </div>
                {t.fromPrice != null && (
                  <div className="flex-shrink-0 text-right">
                    <span className="text-[11px] text-slate-400">from</span>
                    <div className="text-sm font-semibold text-slate-900">
                      ${t.fromPrice}
                      <span className="text-xs font-normal text-slate-400">/hr</span>
                    </div>
                  </div>
                )}
              </div>

              {t.topCode && t.topGradeLabel && (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800 ring-1 ring-emerald-100">
                  <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                  <span>
                    Aced <span className="font-mono font-semibold">{t.topCode}</span> —{" "}
                    <span className="font-bold">{t.topGradeLabel}</span>
                  </span>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.codes.map((code) => (
                  <span
                    key={code}
                    className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600"
                  >
                    {code}
                  </span>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between pt-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {t.rating != null && (
                    <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {t.rating.toFixed(2)}
                      {t.totalReviews > 0 && <span className="text-slate-400">({t.totalReviews})</span>}
                    </span>
                  )}
                  {t.totalSessions > 0 && <span>{t.totalSessions} sessions</span>}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition group-hover:gap-1.5">
                  View profile <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
