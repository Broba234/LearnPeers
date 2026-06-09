import { prisma } from "@/lib/prisma";

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
      const subjects = t.subjects.map((ps: any) => ({
        ...ps.Subjects,
        duration_1: ps.duration_1,
        duration_2: ps.duration_2,
        duration_3: ps.duration_3,
        price_1: ps.price_1,
        price_2: ps.price_2,
        price_3: ps.price_3,
      }));
      const tutorSlots = slotsByTutorId.get(t.id) || [];

      const today = new Date();

      // Filter slots to only include those active today
      const todaysSlots = tutorSlots.filter((slot) =>
        isSlotActiveToday(slot, today)
      );
      const hasSlotToday = todaysSlots.length > 0;

      // Only use slot-based availability
      const derivedActiveNow = hasSlotToday;

      return {
        ...t,
        subjects,
        derivedActiveNow,
        timezone: timezonByTutorId.get(t.id) || "UTC",
        availableSlots: todaysSlots // Return only today's slots instead of all slots
      };
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