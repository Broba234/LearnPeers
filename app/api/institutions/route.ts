import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const institutions = await prisma.institutions.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ country: 'asc' }, { name: 'asc' }],
    });
    return Response.json(institutions);
  } catch (error: any) {
    return Response.json({ error: 'Internal Server Error', details: error?.message }, { status: 500 });
  }
}

const ALLOWED_TYPES = ['university', 'high_school', 'school_board'];

export async function POST(req: Request) {
  try {
    const { name, abbreviation, country, province, type, city } = await req.json();
    if (!name?.trim()) return Response.json({ error: 'Name is required' }, { status: 400 });

    const institution = await prisma.institutions.create({
      data: {
        name: name.trim(),
        abbreviation: abbreviation?.trim() || null,
        country: country?.trim() || 'Canada',
        province: province?.trim() || null,
        type: ALLOWED_TYPES.includes(type) ? type : 'high_school',
        city: city?.trim() || null,
      },
    });
    return Response.json(institution);
  } catch (error: any) {
    return Response.json({ error: 'Internal Server Error', details: error?.message }, { status: 500 });
  }
}
