import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight, BadgeCheck, GraduationCap, ShieldCheck, Sparkles, Star,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { normalizeGrade, type GradeScale } from "@/lib/courses";
import Avatar from "@/components/ui/Avatar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse verified tutors — LearnPeers",
  description:
    "University students who aced the exact Grade 11 & 12 courses you're taking now. Browse their verified grades, ratings and prices — no account needed.",
};

async function getTutors() {
  return prisma.profiles.findMany({
    where: {
      role: "tutor",
      CourseAssets: { some: { status: { in: ["live", "verified"] } } },
    },
    select: {
      id: true,
      name: true,
      avatar: true,
      rating: true,
      Institutions: { select: { name: true, abbreviation: true } },
      ProfileInstitutions: {
        where: { status: "verified" },
        take: 1,
        select: { Institutions: { select: { name: true, abbreviation: true } } },
      },
      CourseAssets: {
        where: { status: { in: ["live", "verified"] } },
        orderBy: { xp: "desc" },
        select: {
          grade_value: true,
          grade_scale: true,
          rating_count: true,
          sessions_count: true,
          xp: true,
          price_1: true,
          price_2: true,
          price_3: true,
          Subjects: { select: { code: true } },
        },
      },
    },
    take: 60,
  });
}

export default async function BrowseTutorsPage() {
  const rows = await getTutors();

  const tutors = rows
    .map((p) => {
      const school =
        p.ProfileInstitutions[0]?.Institutions || p.Institutions || null;
      const verified = p.ProfileInstitutions.length > 0;
      const totalXp = p.CourseAssets.reduce((s, c) => s + c.xp, 0);
      const totalReviews = p.CourseAssets.reduce((s, c) => s + c.rating_count, 0);
      const totalSessions = p.CourseAssets.reduce((s, c) => s + c.sessions_count, 0);
      const codes = p.CourseAssets
        .map((c) => c.Subjects?.code)
        .filter((c): c is string => !!c)
        .slice(0, 3);
      const top = p.CourseAssets.find((c) => c.grade_value && c.grade_scale);
      const topGrade = top?.grade_value && top.grade_scale
        ? normalizeGrade(top.grade_scale as GradeScale, top.grade_value)
        : null;
      const prices = p.CourseAssets.flatMap((c) =>
        [c.price_1, c.price_2, c.price_3].filter(
          (x): x is number => typeof x === "number" && x > 0
        )
      );
      const fromPrice = prices.length ? Math.min(...prices) : null;
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        rating: p.rating,
        school,
        verified,
        totalXp,
        totalReviews,
        totalSessions,
        codes,
        topCode: top?.Subjects?.code ?? null,
        topGradeLabel: topGrade?.label ?? null,
        fromPrice,
      };
    })
    .sort((a, b) => b.totalXp - a.totalXp);

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-bold tracking-tight text-brand-700">
            LearnPeers
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Log in
            </Link>
            <Link
              href="/auth/register?role=student"
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <Sparkles className="h-3.5 w-3.5" /> No account needed to browse
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-900">
            Verified tutors, open book
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500 sm:text-base">
            Every tutor is a university student whose course grades are verified by
            transcript. See exactly who they are, what they aced and what they
            charge — then create a free account only when you&apos;re ready to book.
          </p>
        </div>

        {tutors.length === 0 ? (
          <div className="mx-auto max-w-sm py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
              <Sparkles className="h-6 w-6 text-brand-500" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Be first in line</h2>
            <p className="mt-1 text-sm text-slate-400">
              We&apos;re onboarding verified student tutors from across Ontario
              universities right now. Join the beta and we&apos;ll match you the
              moment your course goes live.
            </p>
            <Link
              href="/auth/register?role=student"
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Join the beta <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tutors.map((t) => (
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

        {tutors.length > 0 && (
          <div className="mt-12 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 p-8 text-center text-white shadow-brand">
            <h2 className="text-xl font-bold">Found someone who aced your course?</h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-brand-100">
              Booking takes about a minute — create a free account, pick a time,
              and you&apos;re in a live 1-on-1 room with a shared whiteboard.
            </p>
            <Link
              href="/auth/register?role=student"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 active:scale-[0.98]"
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
