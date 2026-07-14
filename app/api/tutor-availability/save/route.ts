import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";


// Build a Date from date (YYYY-MM-DD) and time (HH:mm) in local time to preserve wall clock

// For @db.Time fields we can still store as UTC time-only
function toTimeDate(time: string): Date {
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hh, mm, 0, 0));
}

export async function POST(req: Request) {
  try {
    // Availability slots are created for the CALLER — tutor id from the session.
    const { user, res } = await requireUser();
    if (res) return res;

    const { newEvent } = await req.json();

    if (!newEvent) {
      return NextResponse.json({ error: "newEvent is required" }, { status: 400 });
    }

    const resolvedTutorId = user.id;
// Use the pre-computed UTC ISO dates from the client (already timezone-correct)
// newEvent.start / newEvent.end are ISO strings created in the user's browser timezone
const tz = newEvent.timezone || "UTC";
const startDate = newEvent.start ? new Date(newEvent.start) : new Date(`${newEvent.startDate}T${newEvent.start_time}:00Z`);
const endDate = newEvent.end ? new Date(newEvent.end) : new Date(`${newEvent.endDate}T${newEvent.end_time}:00Z`);

        if (newEvent.subject_id.trim()) {
        await prisma.tutorAvailability.create({
          data: {
            tutor_id: resolvedTutorId,
            subject_id: newEvent.subject_id.trim(),
            subject: newEvent.title,
            timezone: tz,
            duration_1: newEvent.duration_1,
            duration_2: newEvent.duration_2,
            duration_3: newEvent.duration_3,
            start_time: toTimeDate(newEvent.start_time),
            end_time: toTimeDate(newEvent.end_time),
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            ...(newEvent.day_of_week !== undefined && newEvent.day_of_week !== null
              ? { day_of_week: newEvent.day_of_week }
              : {}),
          }
        });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[TA_SAVE] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}