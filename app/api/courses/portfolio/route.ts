import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/serverAuth";
import {
  normalizeGrade,
  tierForXp,
  nextTier,
  levelForXp,
  TIERS,
  type GradeScale,
} from "@/lib/courses";

// Full course-asset portfolio for the authenticated tutor: every owned asset
// (any state) plus the rolled-up standing — overall rating, level/XP, league,
// portfolio value and the counts that drive the gamified header.
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, avatar: true, rating: true, institution_id: true },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const rows = await prisma.courseAssets.findMany({
      where: { tutor_id: profile.id },
      orderBy: [{ updated_at: "desc" }],
      include: {
        Subjects: { select: { id: true, name: true, code: true, grade: true, category: true } },
        InstitutionCourses: { select: { id: true, code: true, name: true } },
        CourseReviews: {
          orderBy: { created_at: "desc" },
          take: 3,
          select: {
            id: true,
            rating: true,
            comment: true,
            created_at: true,
            Profiles_student: { select: { name: true, avatar: true } },
          },
        },
      },
    });

    const assets = rows.map((a) => {
      const grade =
        a.grade_value && a.grade_scale
          ? normalizeGrade(a.grade_scale as GradeScale, a.grade_value)
          : null;
      const nt = nextTier(a.xp);
      return {
        id: a.id,
        status: a.status,
        subject: a.Subjects,
        institution_course: a.InstitutionCourses,
        grade_value: a.grade_value,
        grade_scale: a.grade_scale,
        grade_label: grade?.label ?? null,
        mastery: grade?.mastery ?? null,
        grade_proof_url: a.grade_proof_url,
        verification_method: a.verification_method,
        verified_at: a.verified_at,
        rejected_reason: a.rejected_reason,
        rating: a.rating,
        rating_count: a.rating_count,
        xp: a.xp,
        tier: tierForXp(a.xp),
        next_tier: nt,
        sessions_count: a.sessions_count,
        total_earnings: a.total_earnings,
        price_1: a.price_1,
        price_2: a.price_2,
        price_3: a.price_3,
        duration_1: a.duration_1,
        duration_2: a.duration_2,
        duration_3: a.duration_3,
        reviews: a.CourseReviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          student_name: r.Profiles_student?.name ?? "Student",
          student_avatar: r.Profiles_student?.avatar ?? null,
        })),
        updated_at: a.updated_at,
      };
    });

    // Standing roll-up
    const totalXp = rows.reduce((s, a) => s + a.xp, 0);
    const portfolioValue = rows.reduce((s, a) => s + (a.total_earnings || 0), 0);
    const totalSessions = rows.reduce((s, a) => s + a.sessions_count, 0);
    const totalReviews = rows.reduce((s, a) => s + a.rating_count, 0);

    // overall rating = rating_count-weighted average across reviewed courses
    let weighted = 0;
    let rc = 0;
    for (const a of rows) {
      if (a.rating_count > 0) {
        weighted += a.rating * a.rating_count;
        rc += a.rating_count;
      }
    }
    const overallRating = rc > 0 ? Math.round((weighted / rc) * 100) / 100 : null;

    const counts = {
      total: rows.length,
      claimed: rows.filter((a) => a.status === "claimed").length,
      pending: rows.filter((a) => a.status === "pending").length,
      verified: rows.filter((a) => a.status === "verified").length,
      live: rows.filter((a) => a.status === "live").length,
      rejected: rows.filter((a) => a.status === "rejected").length,
    };

    const level = levelForXp(totalXp);
    const leagueKey = (() => {
      let key = "bronze";
      for (const t of TIERS) if (totalXp >= t.min) key = t.key;
      return key;
    })();

    return NextResponse.json({
      profile,
      assets,
      standing: {
        overallRating,
        totalXp,
        level,
        league: leagueKey,
        portfolioValue: Math.round(portfolioValue * 100) / 100,
        totalSessions,
        totalReviews,
        counts,
      },
    });
  } catch (e: any) {
    console.error("[COURSES_PORTFOLIO]", e);
    return NextResponse.json({ error: "Internal Server Error", details: e?.message }, { status: 500 });
  }
}
