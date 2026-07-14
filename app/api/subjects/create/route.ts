import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin-access';

export async function POST(req: Request) {
  try {
    // Admin-only: mutates the global subject catalog.
    const { res } = await requireAdminApi('subjects');
    if (res) return res;

    const { category, grade, name,code } = await req.json();

    const subject = await prisma.subjects.create({
      data: {
        category: category,
        grade: grade,
        name: name,
        code: code
      }
    });

    return new Response(JSON.stringify(subject), { status: 200 });
  } catch (error: any) {
    console.error('[SUBJECTS_CREATE] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
    }), { status: 500 });
  }
} 