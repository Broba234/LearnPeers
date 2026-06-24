import { prisma } from '@/lib/prisma';
import { getAdminContext } from '@/lib/admin-access';

export async function GET() {
  // Gate behind the "users" admin permission — this returns PII for every
  // student and tutor and must never be public.
  const ctx = await getAdminContext();
  if (!ctx || !ctx.can('users')) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  try {
    const users = await prisma.profiles.findMany({
      where: { role: { in: ['student', 'tutor'] } },
      orderBy: [{ created_at: 'desc' }],
    });

    return new Response(JSON.stringify(users), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      details: error?.message || error,
    }), { status: 500 });
  }
}
