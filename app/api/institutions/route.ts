import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin-access';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const province_id = searchParams.get('province_id');
    const board_id = searchParams.get('board_id');
    const institutions = await prisma.institutions.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(province_id ? { province_id } : {}),
        ...(board_id ? { board_id } : {}),
      },
      orderBy: [{ country: 'asc' }, { name: 'asc' }],
      include: { Provinces: { select: { id: true, code: true, name: true } } },
    });
    return Response.json(institutions);
  } catch (error: any) {
    console.error('[INSTITUTIONS_GET]', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

const ALLOWED_TYPES = ['university', 'high_school', 'school_board'];

export async function POST(req: Request) {
  try {
    // Admin-only: creates global institution records (GET stays public).
    const { res } = await requireAdminApi('institutions');
    if (res) return res;

    const { name, abbreviation, country, province_id, type, city, email_domains } = await req.json();
    if (!name?.trim()) return Response.json({ error: 'Name is required' }, { status: 400 });

    // Derive the legacy province text from the province FK for back-compat
    let provinceName: string | null = null;
    if (province_id) {
      const prov = await prisma.provinces.findUnique({ where: { id: province_id }, select: { name: true } });
      provinceName = prov?.name ?? null;
    }

    const resolvedType = ALLOWED_TYPES.includes(type) ? type : 'high_school';

    const institution = await prisma.institutions.create({
      data: {
        name: name.trim(),
        abbreviation: abbreviation?.trim() || null,
        country: country?.trim() || 'Canada',
        province: provinceName,
        province_id: province_id || null,
        type: resolvedType,
        city: city?.trim() || null,
        email_domains: Array.isArray(email_domains)
          ? email_domains.map((d: string) => d.trim().toLowerCase()).filter(Boolean)
          : [],
      },
    });

    // Universities get their own curriculum so admins can attach a course catalog
    if (resolvedType === 'university') {
      await prisma.curricula.create({
        data: { name: `${institution.name} Courses`, kind: 'university', institution_id: institution.id },
      });
    }

    return Response.json(institution);
  } catch (error: any) {
    console.error('[INSTITUTIONS_POST]', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
