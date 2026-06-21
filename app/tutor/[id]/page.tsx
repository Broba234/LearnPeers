import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  BadgeCheck, ShieldCheck, Star, ArrowLeft, GraduationCap, Clock, Trophy,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  normalizeGrade, levelForXp, tierForXp, TIERS, type GradeScale,
} from "@/lib/courses";
import Avatar from "@/components/ui/Avatar";
import ShareButton from "@/components/tutor/ShareButton";

export const dynamic = "force-dynamic";

const LEAGUE: Record<string, { label: string; cls: string }> = {
  bronze: { label: "Bronze", cls: "bg-amber-100 text-amber-700" },
  silver: { label: "Silver", cls: "bg-slate-200 text-slate-600" },
  gold: { label: "Gold", cls: "bg-yellow-100 text-yellow-700" },
  platinum: { label: "Platinum", cls: "bg-teal-100 text-teal-700" },
  diamond: { label: "Diamond", cls: "bg-blue-100 text-blue-700" },
};

async function getTutor(id: string) {
  const p = await prisma.profiles.findUnique({
    where: { id },
    select: {
      id: true, name: true, avatar: true, bio: true, education: true, rating: true, role: true,
      Institutions: { select: { name: true, abbreviation: true, city: true } },
      ProfileInstitutions: {
        where: { status: "verified" },
        take: 1,
        select: { kind: true, Institutions: { select: { name: true, abbreviation: true } } },
      },
      CourseAssets: {
        where: { status: { in: ["live", "verified"] } },
        orderBy: { xp: "desc" },
        select: {
          id: true, status: true, grade_value: true, grade_scale: true, verified_at: true,
          rating: true, rating_count: true, sessions_count: true, xp: true, tier: true,
          price_1: true, price_2: true, price_3: true,
          Subjects: { select: { code: true, name: true, category: true } },
          CourseReviews: {
            orderBy: { created_at: "desc" },
            take: 3,
            select: {
              rating: true, comment: true, created_at: true,
              Profiles_student: { select: { name: true, avatar: true } },
            },
          },
        },
      },
    },
  });
  if (!p || p.role !== "tutor") return null;
  return p;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  let p;
  try {
    p = await getTutor(id);
  } catch {
    p = null;
  }
  if (!p) return { title: "Tutor" };
  const ca = p.CourseAssets.find((c) => c.status === "live" && c.grade_value) || p.CourseAssets[0];
  const grade =
    ca?.grade_value && ca?.grade_scale ? normalizeGrade(ca.grade_scale as GradeScale, ca.grade_value).label : null;
  const school = p.ProfileInstitutions[0]?.Institutions?.abbreviation || p.Institutions?.abbreviation || p.Institutions?.name;
  const code = ca?.Subjects?.code;
  const title = `${p.name}${code ? ` — verified ${code} tutor` : " — peer tutor"}`;
  const description =
    `${code && grade ? `Aced ${code} (${grade})` : "Grade-verified peer tutor"}${school ? ` at ${school}` : ""}.` +
    `${p.rating ? ` Rated ${p.rating.toFixed(2)}★.` : ""} Book a live 1-on-1 session on LearnPeers.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile", images: p.avatar ? [{ url: p.avatar }] : undefined },
    twitter: { card: "summary", title, description },
  };
}

export default async function TutorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getTutor(id);
  if (!p) notFound();

  const live = p.CourseAssets.filter((c) => c.status === "live");
  const courses = live.length ? live : p.CourseAssets;

  const totalXp = p.CourseAssets.reduce((s, c) => s + c.xp, 0);
  const totalSessions = p.CourseAssets.reduce((s, c) => s + c.sessions_count, 0);
  const totalReviews = p.CourseAssets.reduce((s, c) => s + c.rating_count, 0);
  const level = levelForXp(totalXp);
  const leagueKey = tierForXp(totalXp);
  const league = LEAGUE[leagueKey] || LEAGUE.bronze;

  const school = p.ProfileInstitutions[0]?.Institutions || p.Institutions;
  const verified = !!p.ProfileInstitutions[0];

  const withGrade = courses
    .map((c) => ({
      ...c,
      g: c.grade_value && c.grade_scale ? normalizeGrade(c.grade_scale as GradeScale, c.grade_value) : null,
    }))
    .sort((a, b) => (b.g?.mastery ?? 0) - (a.g?.mastery ?? 0));
  const top = withGrade.find((c) => c.g);

  const allReviews = p.CourseAssets.flatMap((c) =>
    c.CourseReviews.map((r) => ({ ...r, code: c.Subjects?.code ?? null }))
  ).slice(0, 6);

  const startingPrice = Math.min(
    ...courses.flatMap((c) => [c.price_1, c.price_2, c.price_3].filter((x): x is number => typeof x === "number" && x > 0))
  );
  const fromPrice = Number.isFinite(startingPrice) ? startingPrice : null;

  return (
    <div className="min-h-screen bg-[#FAFAF9] pb-28">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/home/student/explore" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Explore
          </Link>
          <Link href="/" className="text-sm font-bold tracking-tight text-brand-700">LearnPeers</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900 p-6 text-white shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar src={p.avatar} name={p.name} rounded="rounded-2xl" className="h-20 w-20 flex-shrink-0 text-2xl ring-2 ring-white/20" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{p.name}</h1>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${league.cls}`}>
                  <Trophy className="h-3 w-3" /> {league.label} · Lv {level.level}
                </span>
              </div>
              {p.education && <p className="mt-1 text-sm text-white/70">{p.education.replace(/^"|"$/g, "")}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {school && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${verified ? "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/30" : "bg-white/10 text-white/80"}`}>
                    {verified ? <BadgeCheck className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
                    {verified ? "Verified" : ""} {school.abbreviation || school.name} {verified ? "student" : ""}
                  </span>
                )}
                {p.rating != null && (
                  <span className="inline-flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                    <span className="font-semibold">{p.rating.toFixed(2)}</span>
                    <span className="text-white/50">· {totalReviews} reviews</span>
                  </span>
                )}
                {totalSessions > 0 && <span className="text-sm text-white/60">· {totalSessions} sessions</span>}
              </div>
            </div>
          </div>

          {top?.g && (
            <div className="relative mt-5 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/10">
              <ShieldCheck className="h-4 w-4 flex-shrink-0 text-emerald-300" />
              <p className="text-sm">
                Aced <span className="font-mono font-semibold">{top.Subjects?.code}</span> — <span className="font-bold">{top.g.label}</span>
                <span className="text-white/50"> · grade verified by transcript</span>
              </p>
            </div>
          )}

          {/* Level progress */}
          <div className="relative mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs text-white/60">
              <span>Level {level.level}</span>
              <span>{totalXp.toLocaleString()} XP · {level.toNext} to next</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-200" style={{ width: `${level.progress}%` }} />
            </div>
          </div>
        </section>

        {/* About */}
        {p.bio && (
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">About</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.bio}</p>
          </section>
        )}

        {/* Verified courses */}
        {withGrade.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Verified courses
            </h2>
            <div className="space-y-3">
              {withGrade.map((c) => (
                <div key={c.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900">{c.Subjects?.code}</span>
                        {c.g && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                            <BadgeCheck className="h-3 w-3" /> {c.g.label}
                          </span>
                        )}
                        {c.status === "verified" && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">not yet bookable</span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{c.Subjects?.name}</p>
                    </div>
                    {c.price_2 ? (
                      <div className="flex-shrink-0 text-right">
                        <span className="text-[11px] text-slate-400">from</span>
                        <div className="text-sm font-semibold text-slate-900">${[c.price_1, c.price_2, c.price_3].filter((x): x is number => typeof x === "number" && x > 0).reduce((a, b) => Math.min(a, b))}<span className="text-xs font-normal text-slate-400">/hr</span></div>
                      </div>
                    ) : null}
                  </div>
                  {/* mastery bar */}
                  {c.g && (
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${c.g.mastery}%` }} />
                    </div>
                  )}
                  <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-400">
                    {c.rating_count > 0 && (
                      <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {c.rating.toFixed(1)} ({c.rating_count})
                      </span>
                    )}
                    {c.sessions_count > 0 && (
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {c.sessions_count} sessions</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        {allReviews.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-900">What students say</h2>
            <div className="space-y-3">
              {allReviews.map((r, i) => (
                <figure key={i} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Avatar src={r.Profiles_student?.avatar} name={r.Profiles_student?.name} className="h-8 w-8 text-xs" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{(r.Profiles_student?.name || "Student").split(" ")[0]}</p>
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star key={j} className={`h-3 w-3 ${j < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                          ))}
                        </div>
                        {r.code && <span className="font-mono text-[11px] text-slate-400">{r.code}</span>}
                      </div>
                    </div>
                  </div>
                  {r.comment && <blockquote className="mt-2.5 text-sm leading-relaxed text-slate-600">&ldquo;{r.comment}&rdquo;</blockquote>}
                </figure>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="hidden sm:block">
            {fromPrice != null && (
              <div className="text-sm">
                <span className="text-slate-400">from </span>
                <span className="font-bold text-slate-900">${fromPrice}</span>
                <span className="text-slate-400">/hr</span>
              </div>
            )}
          </div>
          <Link
            href={`/home/student/explore?tutor=${p.id}`}
            className="flex-1 rounded-xl bg-brand-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.99]"
          >
            Book a session
          </Link>
          <ShareButton name={p.name || "this tutor"} />
        </div>
      </div>
    </div>
  );
}
