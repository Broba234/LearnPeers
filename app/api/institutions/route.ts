import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const institutions = await prisma.institutions.findMany({
      orderBy: [{ country: 'asc' }, { name: 'asc' }],
    });
    return Response.json(institutions);
  } catch (error: any) {
    return Response.json({ error: 'Internal Server Error', details: error?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, abbreviation, country, province } = await req.json();
    if (!name?.trim()) return Response.json({ error: 'Name is required' }, { status: 400 });

    const institution = await prisma.institutions.create({
      data: {
        name: name.trim(),
        abbreviation: abbreviation?.trim() || null,
        country: country?.trim() || 'Canada',
        province: province?.trim() || null,
      },
    });
    return Response.json(institution);
  } catch (error: any) {
    return Response.json({ error: 'Internal Server Error', details: error?.message }, { status: 500 });
  }
}
