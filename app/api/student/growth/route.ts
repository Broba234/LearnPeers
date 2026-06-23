import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";
import { normalizeGrade, type GradeScale } from "@/lib/courses";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Student growth-loop data: referral code + count, saved tutors (enriched), and
// a weekly learning streak derived from completed sessions.
export async function GET() {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = user.id;

  const [profRows, referredRows, savedRows, sessionRows] = await Promise.all([
    prisma.$queryRaw<{ referral_code: string | null }[]>`
      SELECT referral_code FROM public."Profiles" WHERE id = ${id}::uuid`,
    prisma.$queryRaw<{ c: number }[]>`
      SELECT count(*)::int AS c FROM public."Profiles" WHERE referred_by = ${id}::uuid`,
    prisma.$queryRaw<
      { id: string; name: string | null; avatar: string | null; rating: number | null; school: string | null; top_code: string | null; grade_value: string | null; grade_scale: string | null }[]
    >`
      SELECT p.id, p.name, p.avatar, p.rating,
             COALESCE(vi.abbr, ip.abbreviation, ip.name) AS school,
             tc.code AS top_code, tc.grade_value, tc.grade_scale
        FROM public."SavedTutors" st
        JOIN public."Profiles" p ON p.id = st.tutor_id
        LEFT JOIN public."Institutions" ip ON ip.id = p.institution_id
        LEFT JOIN LATERAL (
          SELECT i.abbreviation AS abbr FROM public."ProfileInstitutions" pi
          JOIN public."Institutions" i ON i.id = pi.institution_id
          WHERE pi.profile_id = p.id AND pi.status = 'verified' LIMIT 1
        ) vi ON true
        LEFT JOIN LATERAL (
          SELECT s.code, ca.grade_value, ca.grade_scale FROM public."CourseAssets" ca
          JOIN public."Subjects" s ON s.id = ca.subject_id
          WHERE ca.tutor_id = p.id AND ca.status = 'live' AND ca.grade_value IS NOT NULL
          ORDER BY ca.xp DESC LIMIT 1
        ) tc ON true
       WHERE st.student_id = ${id}::uuid
       ORDER BY st.created_at DESC`,
    prisma.$queryRaw<{ created_at: Date }[]>`
      SELECT created_at FROM public."Sessions"
       WHERE student_id = ${id}::uuid AND status = 'completed'`,
  ]);

  const referralCode = profRows[0]?.referral_code ?? null;
  const referredCount = Number(referredRows[0]?.c ?? 0);

  const saved = savedRows.map((r) => {
    const grade =
      r.grade_value && r.grade_scale ? normalizeGrade(r.grade_scale as GradeScale, r.grade_value).label : null;
    return {
      id: r.id,
      name: r.name,
      avatar: r.avatar,
      rating: r.rating,
      school: r.school,
      topCode: r.top_code,
      topGrade: grade,
    };
  });

  // Weekly streak: consecutive weeks (incl. a one-week grace) with ≥1 completed session.
  const weeks = new Set(sessionRows.map((s) => Math.floor(new Date(s.created_at).getTime() / WEEK_MS)));
  const current = Math.floor(Date.now() / WEEK_MS);
  let w: number | null = weeks.has(current) ? current : weeks.has(current - 1) ? current - 1 : null;
  let streakWeeks = 0;
  while (w !== null && weeks.has(w)) {
    streakWeeks++;
    w--;
  }

  return NextResponse.json({ referralCode, referredCount, saved, savedCount: saved.length, streakWeeks });
}
