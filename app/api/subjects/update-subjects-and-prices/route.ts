import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';

// Tutor onboarding — pricing step (step 4).
// Stores the desired pricing on each claimed CourseAsset. The course stays
// LOCKED (greyed) until its grade is verified — pricing here just pre-fills the
// "go live" form so a verified course can publish in one tap. We never write
// ProfilesOnSubjects (the bookable listings) here.
export async function PUT(request: NextRequest) {
  try {
    // Edits the CALLER's own course pricing — identity from the session.
    const { user, res } = await requireUser();
    if (res) return res;

    const body = await request.json();
    const { subjects } = body;

    const profile = { id: user.id };

    if (!subjects || !Array.isArray(subjects)) {
      return NextResponse.json({ error: 'Subjects must be provided as an array' }, { status: 400 });
    }

    const valid = subjects.filter((s: any) => s?.id?.trim());
    if (valid.length === 0) {
      return NextResponse.json({ error: 'No valid subjects provided' }, { status: 400 });
    }

    await Promise.all(
      valid.map((s: any) => {
        const subject_id = s.id.trim();
        const data = {
          price_1: Number(s.price_1) || 0,
          price_2: Number(s.price_2) || 0,
          price_3: Number(s.price_3) || 0,
          duration_1: Number(s.duration_1) || 0.5,
          duration_2: Number(s.duration_2) || 1,
          duration_3: Number(s.duration_3) || 1.5,
        };
        return prisma.courseAssets.upsert({
          where: { tutor_id_subject_id: { tutor_id: profile.id, subject_id } },
          update: data,
          create: { tutor_id: profile.id, subject_id, status: 'claimed', ...data },
        });
      })
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[SUBJECTS_UPDATE] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
