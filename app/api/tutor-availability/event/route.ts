import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
    }
const availability = await prisma.tutorAvailability.findUnique({
  where: { id },
  include: {
    profileSubject: {
      select: {
        profile_id: true,
        duration_1: true,
        duration_2: true,
        duration_3: true,
        price_1: true,
        price_2: true,
        price_3: true,
        subject_id: true,
        Subjects: {
          select: {
            id: true,
            name: true,
            code: true,
            grade: true,
          }
        }
      }
    }
  },
});
    if (!availability) {
      return new Response(JSON.stringify({ error: 'Event not found' }), { status: 404 });
    }

    // Include subjects in the shape the frontend expects
    const response = {
      ...availability,
      subjects: availability.profileSubject?.Subjects || null,
    };

    return new Response(JSON.stringify(response), { status: 200 });
  } catch (error: any) {
    console.error('[EVENT_GET] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
    }), { status: 500 });
  }
} 