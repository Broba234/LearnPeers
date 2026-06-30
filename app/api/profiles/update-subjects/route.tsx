import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/api-auth';

// Tutor onboarding — subject selection (step 3).
// Selected courses become CourseAssets in the `claimed` state: owned but locked
// (greyed) until the grade is verified. They are NOT yet bookable — a course only
// enters ProfilesOnSubjects (the bookable listings) once it goes live.
export async function PUT(request: NextRequest) {
  try {
    // Edits the CALLER's own claimed courses — identity from the session.
    const { user, res } = await requireUser();
    if (res) return res;

    const body = await request.json();
    const { subjects } = body;

    const profile = { id: user.id };

    if (subjects && Array.isArray(subjects)) {
      const selectedIds = subjects
        .map((s: any) => (typeof s === 'string' ? s : s?.id))
        .filter((id: any): id is string => typeof id === 'string' && id.trim().length > 0)
        .map((id: string) => id.trim());

      const existing = await prisma.courseAssets.findMany({
        where: { tutor_id: profile.id },
        select: { id: true, subject_id: true, status: true },
      });
      const existingIds = new Set(existing.map((e) => e.subject_id));

      // Add newly selected courses as claimed (locked) assets.
      const toCreate = selectedIds.filter((id) => !existingIds.has(id));
      if (toCreate.length) {
        await prisma.courseAssets.createMany({
          data: toCreate.map((subject_id) => ({ tutor_id: profile.id, subject_id, status: 'claimed' })),
          skipDuplicates: true,
        });
      }

      // Drop deselected courses — but only ones still locked. Never destroy a
      // course the tutor already verified/published.
      const removable = existing
        .filter((e) => e.status === 'claimed' && !selectedIds.includes(e.subject_id))
        .map((e) => e.id);
      if (removable.length) {
        await prisma.courseAssets.deleteMany({ where: { id: { in: removable } } });
      }
    }

    return new Response(JSON.stringify(profile), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      details: error?.message || error,
    }), { status: 500 });
  }
}
