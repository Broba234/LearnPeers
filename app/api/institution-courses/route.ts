import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const institution_id = searchParams.get('institution_id');
    const subject_id = searchParams.get('subject_id');

    const courses = await prisma.institutionCourses.findMany({
      where: {
        ...(institution_id ? { institution_id } : {}),
        ...(subject_id ? { subject_id } : {}),
      },
      include: {
        Institutions: { select: { id: true, name: true, abbreviation: true } },
        Subjects: { select: { id: true, name: true, category: true } },
      },
      orderBy: [{ institution_id: 'asc' }, { code: 'asc' }],
    });
    return Response.json(courses);
  } catch (error: any) {
    return Response.json({ error: 'Internal Server Error', details: error?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { institution_id, subject_id, code, name, description } = await req.json();
    if (!institution_id || !subject_id || !code?.trim()) {
      return Response.json({ error: 'institution_id, subject_id, and code are required' }, { status: 400 });
    }

    const course = await prisma.institutionCourses.create({
      data: {
        institution_id,
        subject_id,
        code: code.trim().toUpperCase(),
        name: name?.trim() || null,
        description: description?.trim() || null,
      },
      include: {
        Institutions: { select: { id: true, name: true, abbreviation: true } },
        Subjects: { select: { id: true, name: true, category: true } },
      },
    });
    return Response.json(course);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return Response.json({ error: 'This course code already exists for this institution' }, { status: 409 });
    }
    return Response.json({ error: 'Internal Server Error', details: error?.message }, { status: 500 });
  }
}
