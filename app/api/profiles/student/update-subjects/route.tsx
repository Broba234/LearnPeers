import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email,subjects } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400 });
    }
      const profile = await prisma.profiles.findUnique({
        where: { email },
        select: { id: true }
      });

      if (profile && subjects && Array.isArray(subjects)) {
        await prisma.profilesOnSubjects.deleteMany({ where: { profile_id: profile.id } });

        for (const s of subjects) {
          if (!s) continue;
          // s can be a plain subject_id string or { subject_id, institution_course_id }
          const subject_id = typeof s === 'string' ? s : s.subject_id;
          const institution_course_id = typeof s === 'string' ? null : (s.institution_course_id || null);
          if (!subject_id) continue;
          await prisma.profilesOnSubjects.create({
            data: { profile_id: profile.id, subject_id, institution_course_id },
          });
        }
      }

    return new Response(JSON.stringify(profile), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      details: error?.message || error
    }), { status: 500 });
  }
}