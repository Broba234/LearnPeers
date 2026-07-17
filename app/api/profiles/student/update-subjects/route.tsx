import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/api-auth';

export async function PUT(request: NextRequest) {
  try {
    // Edits the CALLER's own (student) subject listings — identity from the session.
    const { user, res } = await requireUser();
    if (res) return res;

    const body = await request.json();
    const { subjects } = body;

      const profile = { id: user.id };

      if (subjects && Array.isArray(subjects)) {
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
    console.error('[STUDENT_UPDATE_SUBJECTS]', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
    }), { status: 500 });
  }
}