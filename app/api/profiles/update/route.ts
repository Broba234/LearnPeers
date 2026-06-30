import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/api-auth';

export async function PUT(request: NextRequest) {
  try {
    // Edits the CALLER's own profile — identity from the session, not body.email.
    const { user, res } = await requireUser();
    if (res) return res;

    const body = await request.json();
    const { name, phone, bio, avatar, institution_id } = body;

    const fullName = name?.trim();
      const updatedProfile = await prisma.profiles.update({
        where: { id: user.id },
        data: {
          ...(fullName ? { name: fullName } : {}),
          phone: phone || null,
          bio: bio || null,
          ...(avatar !== undefined ? { avatar } : {}),
          ...(institution_id !== undefined ? { institution_id: institution_id || null } : {}),
        },
      });


    return new Response(JSON.stringify(updatedProfile), { status: 200 });
  } catch (error: any) {
    console.error('[PROFILE_UPDATE] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      details: error?.message || error
    }), { status: 500 });
  }
}