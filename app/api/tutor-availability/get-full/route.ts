import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email parameter is required' }), { status: 400 });
    }
    const profile = await prisma.profiles.findUnique({
      where: { email },
      select: { id: true }
    });
    const resolvedTutorId = profile?.id ?? '';
    const subjects = await prisma.profilesOnSubjects.findMany({
      where: { profile_id: resolvedTutorId },
      select: { subject_id: true }
    })
const availability = await prisma.tutorAvailability.findMany({
  where: { 
    tutor_id: resolvedTutorId, 
    subject_id: { in: subjects.map(s => s.subject_id) },
    is_active: true
  },
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
  orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
});
    if (!profile || !availability) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
    }

    return new Response(JSON.stringify(availability), { status: 200 });
  } catch (error: any) {
    console.error('[PROFILE_GET_FULL] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
    }), { status: 500 });
  }
} 