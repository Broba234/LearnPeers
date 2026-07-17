import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/api-auth';

export async function PUT(request: NextRequest) {
  try {
    // Edits the CALLER's own profile (incl. is_tutor / hourlyRate) — identity
    // from the session, not body.email.
    const { user, res } = await requireUser();
    if (res) return res;

    const body = await request.json();
    const { firstName, lastName, name, phone, bio, subjects, education, experience, is_tutor } = body;

    // Use name if provided, otherwise combine first and last name
    const fullName = name || `${firstName || ''} ${lastName || ''}`.trim();

    // Start a transaction to handle the profile update and subject relationships
    const result = await prisma.$transaction(async (tx:any) => {
      // Update the main profile
      const updatedProfile = await tx.profiles.update({
        where: { id: user.id },
        data: {
          name: fullName,
          phone: phone || null,
          bio: bio || null,
          hourlyRate: null,
          is_tutor: is_tutor,
          education: education || null,
          experience: experience || null,
        },
      });

      return updatedProfile;
    });

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error: any) {
    console.error('[PROFILE_UPDATE] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
    }), { status: 500 });
  }
}