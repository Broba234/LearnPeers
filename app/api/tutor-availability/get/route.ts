import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toTimeString(date: Date): string {
  // Convert Date (TIME) to HH:mm based on UTC to avoid timezone drift
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const tutorId = searchParams.get('tutorId');

    if (!email && !tutorId) {
      return NextResponse.json({ error: 'email or tutorId is required' }, { status: 400 });
    }

    let resolvedTutorId = tutorId ?? '';
    if (!resolvedTutorId && email) {
      const profile = await prisma.profiles.findUnique({ where: { email }, select: { id: true } });
      if (!profile) return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
      resolvedTutorId = profile.id;
    }

  const slots = await prisma.tutorAvailability.findMany({
  where: { 
    tutor_id: resolvedTutorId, 
    is_active: true, 
    end_date: { not: null },
    start_date: { not: null }
  },
  include: {
    profileSubject: {
      select: {
        profile_id: true,
        subject_id: true,
        duration_1: true,
        duration_2: true,
        duration_3: true,
        price_1: true,
        price_2: true,
        price_3: true,
      }
    }
  },
      orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
    });


     return new Response(JSON.stringify(slots), { status: 200 });
  } catch (error: any) {
    console.error('[TA_GET] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

