import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/api-auth';

export async function GET() {
  try {
    // Returns the CALLER's own subject listings — identity from the session.
    const { user, res } = await requireUser();
    if (res) return res;

    const subjects = await prisma.profilesOnSubjects.findMany({
      where: { profile_id: user.id },
      select: {
        subject_id: true,
        profile_id: true,
        price_1: true,
        price_2: true,
        price_3: true,
        duration_1: true,
        duration_2: true,
        duration_3: true,
        created_at: true,
        updated_at: true,
        Subjects: {
          select: {
            name: true,
            code: true,
            grade: true,
            category: true,
            created_at: true,
            updated_at: true,
          }
        }
      }
    });
    return NextResponse.json(subjects, { status: 200 });
  } catch (error: any) {
    console.error('[TUTOR_SUBJECTS] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}