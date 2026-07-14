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
      select: { role: true }
    });

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
    }

    return new Response(JSON.stringify(profile), { status: 200 });
  } catch (error: any) {
    console.error('[PROFILE_GET] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
    }), { status: 500 });
  }
} 