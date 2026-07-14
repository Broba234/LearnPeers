import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/api-auth';

export async function PUT(request: NextRequest) {
  try {
    // Edits the CALLER's own profile — identity from the session, not body.email.
    const { user, res } = await requireUser();
    if (res) return res;

    const body = await request.json();
    const { education } = body;

    const result = await prisma.profiles.update({
      where: { id: user.id },
      data: {
        education: education || null,
      },
    });
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error: any) {
    console.error('[PROFILE_UPDATE] Error:', error);

    return new Response(JSON.stringify({
      error: 'Internal Server Error',
    }), { status: 500 });
  }
}