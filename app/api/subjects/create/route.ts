import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
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
      details: error?.message || error
    }), { status: 500 });
  }
} 