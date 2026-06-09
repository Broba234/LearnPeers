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
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
        bio: true,
        avatar: true,
        phone: true,
        hourlyRate: true,
        isAvailableNow: true,
        availability: true,
        education: true,
        experience: true,
        created_at: true,
        updated_at: true,
        profile_setup: true,
        is_tutor: true,
        stripe_account_id: true,
        institution_id: true,
        Institutions: { select: { id: true, name: true, abbreviation: true } },
        subjects: {
          select: {
            institution_course_id: true,
            price_1: true, price_2: true, price_3: true,
            duration_1: true, duration_2: true, duration_3: true,
            Subjects: { select: { id: true, name: true, code: true, grade: true, category: true } },
            InstitutionCourses: {
              select: {
                id: true, code: true, name: true,
                Institutions: { select: { id: true, name: true, abbreviation: true } },
              }
            }
          }
        }
      }
    });
    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
    }

    const subjects = profile.subjects.map(pivot => ({
      ...pivot.Subjects,
      institution_course_id: pivot.institution_course_id,
      institution_course: pivot.InstitutionCourses,
      price_1: pivot.price_1, price_2: pivot.price_2, price_3: pivot.price_3,
      duration_1: pivot.duration_1, duration_2: pivot.duration_2, duration_3: pivot.duration_3,
    }));

    return new Response(JSON.stringify({ ...profile, subjects }), { status: 200 });
  } catch (error: any) {
    console.error('[PROFILE_GET_FULL] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      details: error?.message || error
    }), { status: 500 });
  }
} 