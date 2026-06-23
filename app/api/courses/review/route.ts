import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";
import { tierForXp, XP, recomputeOverallRating } from "@/lib/courses";
import { createNotification } from "@/lib/notifications";

// A student leaves a per-course review. This is the compounding event:
// it updates the course's rating + count, awards XP (which can bump its tier),
// folds a completed session's earnings into the asset, and re-rolls the tutor's
// overall rating. One review per (session, student).
export async function POST(req: Request) {
  try {
    const user = await getAuthedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { course_asset_id, tutor_id, subject_id, session_id } = body;
    const rating = Math.round(Number(body.rating));
    const comment = (body.comment ?? "").toString().trim() || null;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
    }

    // Resolve the asset either directly or via (tutor, subject).
    const asset = course_asset_id
      ? await prisma.courseAssets.findUnique({ where: { id: course_asset_id } })
      : tutor_id && subject_id
      ? await prisma.courseAssets.findUnique({ where: { tutor_id_subject_id: { tutor_id, subject_id } } })
      : null;
    if (!asset) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    if (asset.tutor_id === user.id) {
      return NextResponse.json({ error: "You can't review your own course" }, { status: 400 });
    }

    // Guard against duplicate reviews for the same session.
    if (session_id) {
      const dup = await prisma.courseReviews.findFirst({
        where: { session_id, student_id: user.id },
        select: { id: true },
      });
      if (dup) return NextResponse.json({ error: "You already reviewed this session" }, { status: 409 });
    }

    await prisma.courseReviews.create({
      data: {
        course_asset_id: asset.id,
        tutor_id: asset.tutor_id,
        student_id: user.id,
        session_id: session_id ?? null,
        rating,
        comment,
      },
    });

    // Recompute this course's rating from all its reviews.
    const agg = await prisma.courseReviews.aggregate({
      where: { course_asset_id: asset.id },
      _avg: { rating: true },
      _count: true,
    });
    const newRating = Math.round((agg._avg.rating ?? rating) * 100) / 100;
    const newCount = agg._count;

    // XP: the review itself, plus the session if one is attached.
    let xp = asset.xp + XP.review(rating);
    let sessions_count = asset.sessions_count;
    let total_earnings = asset.total_earnings;
    if (session_id) {
      xp += XP.session;
      sessions_count += 1;
      // The public "Sessions" table isn't exposed on the Prisma client (its name
      // collides with Supabase's auth `sessions`), so read the amount via raw SQL.
      const rows = await prisma.$queryRaw<{ amount: number | null }[]>`
        SELECT amount FROM public."Sessions" WHERE id = ${session_id}::uuid LIMIT 1
      `;
      const amount = rows[0]?.amount;
      if (amount) total_earnings += amount;
    }

    await prisma.courseAssets.update({
      where: { id: asset.id },
      data: {
        rating: newRating,
        rating_count: newCount,
        xp,
        tier: tierForXp(xp),
        sessions_count,
        total_earnings,
      },
    });

    const overall = await recomputeOverallRating(asset.tutor_id);

    // Notify the tutor that their standing moved.
    try {
      const admin = createSupabaseAdminClient();
      const subj = await prisma.subjects.findUnique({ where: { id: asset.subject_id }, select: { code: true, name: true } });
      await createNotification(admin, {
        userId: asset.tutor_id,
        type: "course_review",
        title: `New ${rating}★ review`,
        body: `Your ${subj?.code || subj?.name || "course"} standing was updated — now ${newRating}★ over ${newCount} review${newCount === 1 ? "" : "s"}.`,
        actorId: user.id,
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      course: { id: asset.id, rating: newRating, rating_count: newCount, tier: tierForXp(xp), xp },
      overallRating: overall,
    });
  } catch (e: any) {
    console.error("[COURSES_REVIEW]", e);
    return NextResponse.json({ error: "Internal Server Error", details: e?.message }, { status: 500 });
  }
}
