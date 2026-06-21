import { prisma } from "@/lib/prisma";
import { isTutorLive } from "@/lib/presence";
import { normalizeGrade, type GradeScale } from "@/lib/courses";

function isSlotActiveToday(
  slot: { start_date: Date | null; end_date: Date | null },
  today: Date
) {
  if (!slot.start_date || !slot.end_date) return false;
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const todayEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
    999
  );

  return slot.start_date <= todayEnd && slot.end_date >= todayStart;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filterAvailable = searchParams.get('availableNow') === 'true';

    // scope=mine: match institution_course_id (exact institution match)
    // scope=equivalent: match subject_id (canonical — any institution)
    const subjectId = searchParams.get('subjectId');
    const institutionCourseId = searchParams.get('institutionCourseId');
    const scope = searchParams.get('scope') || 'equivalent'; // 'mine' | 'equivalent'

    const subjectFilter = subjectId
      ? scope === 'mine' && institutionCourseId
        ? { subjects: { some: { institution_course_id: institutionCourseId } } }
        : { subjects: { some: { subject_id: subjectId } } }
      : {};

    const tutors = await prisma.profiles.findMany({
      where: { role: "tutor", ...subjectFilter },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        isAvailableNow: true,
        last_active_at: true,
        rating: true,
        education: true,
        institution_id: true,
        Institutions: { select: { id: true, name: true, abbreviation: true } },
        subjects: {
          select: {
            duration_1: true,
            duration_2: true,
            duration_3: true,
            price_1: true,
            price_2: true,
            price_3: true,
            institution_course_id: true,
            InstitutionCourses: {
              select: {
                id: true, code: true, name: true,
                Institutions: { select: { id: true, name: true, abbreviation: true } },
              }
            },
            Subjects: {
              select: { id: true, name: true, code: true, grade: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
    
    const tutorIds = tutors.map(t => t.id);

    // ── Trust layer: pull verification + gamification from CourseAssets ──
    // Explore reads bookable listings (ProfilesOnSubjects), but the *proof* a
    // student cares about — the verified grade, mastery %, session count and
    // per-course rating — lives on CourseAssets. Join them here so the card can
    // lead with "✓ 97% in MCV4U" instead of a generic subject chip.
    const courseAssets = await prisma.courseAssets.findMany({
      where: { tutor_id: { in: tutorIds } },
      select: {
        tutor_id: true, subject_id: true, status: true,
        grade_value: true, grade_scale: true, verified_at: true,
        rating: true, rating_count: true, sessions_count: true, tier: true,
      },
    });
    const assetMap = new Map<string, (typeof courseAssets)[number]>();
    const tutorAgg = new Map<string, { sessions: number; reviews: number; verified: number; topMastery: number }>();
    for (const a of courseAssets) {
      assetMap.set(`${a.tutor_id}_${a.subject_id}`, a);
      const agg = tutorAgg.get(a.tutor_id) || { sessions: 0, reviews: 0, verified: 0, topMastery: 0 };
      agg.sessions += a.sessions_count || 0;
      agg.reviews += a.rating_count || 0;
      if (a.verified_at) agg.verified += 1;
      if (a.grade_value && a.grade_scale) {
        const m = normalizeGrade(a.grade_scale as GradeScale, a.grade_value).mastery;
        if (m > agg.topMastery) agg.topMastery = m;
      }
      tutorAgg.set(a.tutor_id, agg);
    }

    // Verified school enrollment → "✓ Verified <School> student" badge.
    const verifiedInsts = await prisma.profileInstitutions.findMany({
      where: {
        profile_id: { in: tutorIds },
        status: "verified",
        kind: { in: ["current_university", "current_high_school"] },
      },
      select: { profile_id: true, kind: true, Institutions: { select: { name: true, abbreviation: true } } },
    });
    const verifiedSchoolMap = new Map<string, { name: string | null; abbreviation: string | null; kind: string }>();
    for (const pi of verifiedInsts) {
      if (!verifiedSchoolMap.has(pi.profile_id)) {
        verifiedSchoolMap.set(pi.profile_id, {
          name: pi.Institutions?.name ?? null,
          abbreviation: pi.Institutions?.abbreviation ?? null,
          kind: pi.kind,
        });
      }
    }

    // Fetch active slots
    const slots = await prisma.tutorAvailability.findMany({
      where: {
        tutor_id: { in: tutorIds },
        is_active: true
      },
      select: {
        tutor_id: true,
        subject_id: true,
        start_time: true,
        end_time: true,
        start_date: true,
        end_date: true,
        timezone: true,
      },
    });
    
    // Group slots by tutor id for quick lookup later
    const slotsByTutorId = new Map<
      string,
      Array<{
        subject_id: string | null;
        start_time: Date | null;
        end_time: Date | null;
        start_date: Date | null;
        end_date: Date | null;
        timezone: string | null;
      }>
    >();

    for (const slot of slots) {
      if (!slotsByTutorId.has(slot.tutor_id)) {
        slotsByTutorId.set(slot.tutor_id, []);
      }
      slotsByTutorId.get(slot.tutor_id)!.push({
        subject_id: slot.subject_id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        start_date: slot.start_date,
        end_date: slot.end_date,
        timezone: slot.timezone,
      });
    }

    // Derive primary timezone per tutor (most common timezone across their slots)
    const timezonByTutorId = new Map<string, string>();
    for (const [tutorId, tutorSlots] of slotsByTutorId) {
      const tzCounts = new Map<string, number>();
      for (const s of tutorSlots) {
        const tz = s.timezone || "UTC";
        tzCounts.set(tz, (tzCounts.get(tz) || 0) + 1);
      }
      let bestTz = "UTC";
      let bestCount = 0;
      for (const [tz, count] of tzCounts) {
        if (count > bestCount) {
          bestTz = tz;
          bestCount = count;
        }
      }
      timezonByTutorId.set(tutorId, bestTz);
    }
    
    // Process tutors with availability check
    const tutorsWithDerived = tutors.map((t) => {
      const subjects = t.subjects.map((ps: any) => {
        const subjId = ps.Subjects?.id;
        const asset = subjId ? assetMap.get(`${t.id}_${subjId}`) : undefined;
        const grade =
          asset?.grade_value && asset?.grade_scale
            ? normalizeGrade(asset.grade_scale as GradeScale, asset.grade_value)
            : null;
        return {
          ...ps.Subjects,
          // course code: prefer the institution-specific code, fall back to canonical
          code: ps.InstitutionCourses?.code || ps.Subjects?.code || null,
          institution_course_id: ps.institution_course_id ?? null,
          duration_1: ps.duration_1,
          duration_2: ps.duration_2,
          duration_3: ps.duration_3,
          price_1: ps.price_1,
          price_2: ps.price_2,
          price_3: ps.price_3,
          // trust layer
          verified: !!asset?.verified_at,
          grade_label: grade?.label ?? null,
          mastery: grade?.mastery ?? null,
          sessions_count: asset?.sessions_count ?? 0,
          course_rating: asset?.rating ?? null,
          course_rating_count: asset?.rating_count ?? 0,
          tier: asset?.tier ?? null,
        };
      });
      const tutorSlots = slotsByTutorId.get(t.id) || [];

      const today = new Date();

      // Filter slots to only include those active today (used for booking-ahead
      // hints + the calendar, NOT for live presence).
      const todaysSlots = tutorSlots.filter((slot) =>
        isSlotActiveToday(slot, today)
      );

      // "Live now" is driven purely by the manual Available Now toggle + a fresh
      // heartbeat — independent of the tutor's schedule.
      const derivedActiveNow = isTutorLive(t.isAvailableNow, t.last_active_at);

      const agg = tutorAgg.get(t.id);
      // Tutor's best verified course (highest mastery) — the headline proof.
      const topCourse = subjects
        .filter((s: any) => s.verified && s.mastery != null)
        .sort((a: any, b: any) => (b.mastery ?? 0) - (a.mastery ?? 0))[0] || null;

      return {
        ...t,
        subjects,
        derivedActiveNow,
        timezone: timezonByTutorId.get(t.id) || "UTC",
        availableSlots: todaysSlots, // Return only today's slots instead of all slots
        // ── trust layer (tutor level) ──
        verifiedSchool: verifiedSchoolMap.get(t.id) || null,
        schoolName: t.Institutions?.name || null,
        schoolAbbr: t.Institutions?.abbreviation || null,
        totalSessions: agg?.sessions || 0,
        totalReviews: agg?.reviews || 0,
        verifiedCount: agg?.verified || 0,
        topCourse: topCourse
          ? { code: topCourse.code, name: topCourse.name, grade_label: topCourse.grade_label, mastery: topCourse.mastery }
          : null,
      };
    });

    // Default ordering: live tutors first, then the most credible (rating →
    // reviews → verified courses). The client can re-sort on demand.
    tutorsWithDerived.sort((a, b) => {
      if (Number(b.derivedActiveNow) !== Number(a.derivedActiveNow))
        return Number(b.derivedActiveNow) - Number(a.derivedActiveNow);
      if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
      if (b.totalReviews !== a.totalReviews) return b.totalReviews - a.totalReviews;
      return b.verifiedCount - a.verifiedCount;
    });

    const finalList = filterAvailable
      ? tutorsWithDerived.filter(t => t.derivedActiveNow)
      : tutorsWithDerived;
    
    return Response.json({ tutors: finalList });
  } catch (error) {
    console.error('Error fetching tutors:', error);
    return Response.json({ error: 'Failed to fetch tutors', tutors: [] }, { status: 500 });
  }
}