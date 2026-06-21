// Social proof, powered by REAL data (no hardcoded numbers). Server component:
// queries the live DB at request time and degrades gracefully if it's empty or
// unreachable, so the marketing page never breaks on a cold marketplace.
import { prisma } from '@/lib/prisma';
import { normalizeGrade, type GradeScale } from '@/lib/courses';
import { BadgeCheck, ShieldCheck, Star, GraduationCap } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Featured = {
  id: string;
  name: string;
  avatar: string | null;
  rating: number | null;
  school: string | null;
  course: { code: string | null; grade: string | null } | null;
  sessions: number;
};
type Quote = { comment: string; rating: number; student: string; course: string | null };

async function getData() {
  const [uniCount, reviewAgg, tutorRows, reviewRows] = await Promise.all([
    prisma.institutions.count({ where: { type: 'university' } }),
    prisma.courseReviews.aggregate({ _count: { _all: true }, _avg: { rating: true } }),
    prisma.profiles.findMany({
      where: { role: 'tutor', rating: { not: null } },
      orderBy: { rating: 'desc' },
      take: 4,
      select: {
        id: true, name: true, avatar: true, rating: true,
        Institutions: { select: { name: true, abbreviation: true } },
        ProfileInstitutions: {
          where: { status: 'verified' },
          take: 1,
          select: { Institutions: { select: { name: true, abbreviation: true } } },
        },
        CourseAssets: {
          where: { status: 'live', grade_value: { not: null } },
          orderBy: { xp: 'desc' },
          take: 1,
          select: { grade_value: true, grade_scale: true, sessions_count: true, Subjects: { select: { code: true } } },
        },
      },
    }),
    prisma.courseReviews.findMany({
      where: { comment: { not: null } },
      orderBy: { created_at: 'desc' },
      take: 8,
      select: {
        rating: true, comment: true,
        Profiles_student: { select: { name: true } },
        CourseAssets: { select: { Subjects: { select: { code: true } } } },
      },
    }),
  ]);

  const tutors: Featured[] = tutorRows.map((t) => {
    const ca = t.CourseAssets[0];
    const grade = ca?.grade_value && ca?.grade_scale
      ? normalizeGrade(ca.grade_scale as GradeScale, ca.grade_value).label : null;
    const vs = t.ProfileInstitutions[0]?.Institutions || t.Institutions;
    return {
      id: t.id, name: t.name || 'Tutor', avatar: t.avatar, rating: t.rating,
      school: vs?.abbreviation || vs?.name || null,
      course: ca ? { code: ca.Subjects?.code ?? null, grade } : null,
      sessions: ca?.sessions_count ?? 0,
    };
  });

  const quotes: Quote[] = reviewRows
    .filter((r) => r.comment && r.comment.length > 24)
    .slice(0, 3)
    .map((r) => ({
      comment: r.comment!, rating: r.rating,
      student: (r.Profiles_student?.name || 'Student').split(' ')[0],
      course: r.CourseAssets?.Subjects?.code ?? null,
    }));

  return {
    uniCount,
    reviewCount: reviewAgg._count._all,
    avgRating: reviewAgg._avg.rating,
    tutors,
    quotes,
  };
}

export default async function SocialProof() {
  let data;
  try {
    data = await getData();
  } catch {
    return null; // never break the landing on a DB hiccup
  }
  const { uniCount, reviewCount, avgRating, tutors, quotes } = data;
  // Nothing meaningful to show yet → hide the band entirely.
  if (tutors.length === 0 && quotes.length === 0) return null;

  const stats = [
    { value: uniCount > 0 ? `${uniCount}` : '—', label: 'Ontario universities', icon: GraduationCap },
    { value: 'Grade-verified', label: 'every tutor, by transcript', icon: ShieldCheck },
    {
      value: avgRating ? `${avgRating.toFixed(1)}★` : 'New',
      label: reviewCount > 0 ? `from ${reviewCount} student reviews` : 'be the first to review',
      icon: Star,
    },
    { value: '1-on-1', label: 'live video & whiteboard', icon: BadgeCheck },
  ];

  return (
    <section className="relative overflow-hidden bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Why students trust it</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Real peers. Verified grades.
          </h2>
          <p className="mt-3 text-pretty text-base text-ink-500">
            Every tutor proves they aced your exact course — with a real transcript, not a claim.
          </p>
        </div>

        {/* Stat strip */}
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-ink-100 bg-gradient-to-b from-white to-brand-50/30 p-4 text-center">
              <s.icon className="mx-auto h-5 w-5 text-brand-600" />
              <div className="mt-2 text-xl font-extrabold tracking-tight text-ink-900">{s.value}</div>
              <div className="mt-0.5 text-xs leading-tight text-ink-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Featured verified tutors */}
        {tutors.length > 0 && (
          <div className="mt-12">
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-ink-400">
              Verified student tutors
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tutors.map((t) => (
                <div key={t.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.avatar || ''} alt={t.name} className="h-11 w-11 rounded-full bg-slate-100 object-cover ring-1 ring-slate-100" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">{t.name}</p>
                      {t.school && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <BadgeCheck className="h-3 w-3" /> {t.school}
                        </span>
                      )}
                    </div>
                  </div>
                  {t.course?.code && t.course?.grade && (
                    <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-900 ring-1 ring-emerald-100">
                      <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                      <span>
                        Aced <span className="font-mono font-semibold">{t.course.code}</span> · <span className="font-bold">{t.course.grade}</span>
                      </span>
                    </div>
                  )}
                  <div className="mt-2.5 flex items-center gap-2 text-xs text-ink-400">
                    {t.rating != null && (
                      <span className="inline-flex items-center gap-1 font-semibold text-ink-700">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {t.rating.toFixed(2)}
                      </span>
                    )}
                    {t.sessions > 0 && <span>· {t.sessions} sessions</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review quotes */}
        {quotes.length > 0 && (
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {quotes.map((q, i) => (
              <figure key={i} className="rounded-2xl border border-ink-100 bg-slate-50 p-5">
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className={`h-3.5 w-3.5 ${j < q.rating ? 'fill-amber-400' : 'text-slate-200'}`} />
                  ))}
                </div>
                <blockquote className="mt-3 text-sm leading-relaxed text-ink-700">&ldquo;{q.comment}&rdquo;</blockquote>
                <figcaption className="mt-3 text-xs font-medium text-ink-400">
                  {q.student}{q.course ? ` · ${q.course}` : ''}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
