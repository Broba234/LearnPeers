import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/api-auth';

function convertTimeStringToDate(timeString: string) {
  // HH:mm or HH:mm:ss -> Date with only the time portion (UTC)
  const timeParts = timeString.split(':');
  const hours = parseInt(timeParts[0]);
  const minutes = parseInt(timeParts[1]);
  const seconds = timeParts[2] ? parseInt(timeParts[2]) : 0;
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
}

export async function PUT(request: NextRequest) {
  try {
    const { user, res } = await requireUser();
    if (res) return res;

    const body = await request.json();
    const { eventId, updatedData } = body;

    if (!eventId || !updatedData) {
      return new Response(JSON.stringify({ error: 'eventId and updatedData are required' }), { status: 400 });
    }

    const existingEvent = await prisma.tutorAvailability.findUnique({
      where: { id: eventId },
      select: { tutor_id: true },
    });
    if (!existingEvent) {
      return new Response(JSON.stringify({ error: 'Event not found' }), { status: 404 });
    }
    // Only the slot's owner may modify it.
    if (existingEvent.tutor_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    // Use pre-computed UTC dates from client when available, fall back to date+time strings
    const startDate = updatedData.start
      ? new Date(updatedData.start)
      : new Date(`${updatedData.date}T${updatedData.startTime}:00Z`);
    const endDate = updatedData.end
      ? new Date(updatedData.end)
      : new Date(`${updatedData.endDate}T${updatedData.endTime}:00Z`);

    const startTimeStr = updatedData.startTime || '00:00';
    const endTimeStr = updatedData.endTime || '00:00';
    const updateData: any = {
      duration_1: updatedData.duration_1,
      duration_2: updatedData.duration_2,
      duration_3: updatedData.duration_3,
      timezone: updatedData.timezone || "UTC",
      start_time: convertTimeStringToDate(startTimeStr),
      end_time: convertTimeStringToDate(endTimeStr),
      start_date: startDate,
      end_date: endDate,
      updated_at: new Date(),
    };

    const result = await prisma.tutorAvailability.update({
      where: { id: eventId },
      data: updateData,
    });

    return new Response(JSON.stringify({ success: true, event: result }), { status: 200 });
  } catch (error: any) {
    console.error('[TUTOR_AVAILABILITY_UPDATE] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
    }), { status: 500 });
  }
}