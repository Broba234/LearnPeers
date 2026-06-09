import { prisma } from '@/lib/prisma';

// Bulk import endpoint for scraping university course catalogs
// POST body: { institution_id, courses: [{ subject_id, code, name, description }] }
export async function POST(req: Request) {
  try {
    const { institution_id, courses } = await req.json();

    if (!institution_id) return Response.json({ error: 'institution_id is required' }, { status: 400 });
    if (!Array.isArray(courses) || courses.length === 0) {
      return Response.json({ error: 'courses array is required' }, { status: 400 });
    }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const c of courses) {
      if (!c.subject_id || !c.code?.trim()) {
        results.errors.push(`Skipped: missing subject_id or code for "${c.code}"`);
        results.skipped++;
        continue;
      }
      try {
        await prisma.institutionCourses.upsert({
          where: { institution_id_code: { institution_id, code: c.code.trim().toUpperCase() } },
          create: {
            institution_id,
            subject_id: c.subject_id,
            code: c.code.trim().toUpperCase(),
            name: c.name?.trim() || null,
            description: c.description?.trim() || null,
          },
          update: {
            subject_id: c.subject_id,
            name: c.name?.trim() || null,
            description: c.description?.trim() || null,
          },
        });
        results.created++;
      } catch (err: any) {
        results.errors.push(`${c.code}: ${err?.message}`);
        results.skipped++;
      }
    }

    return Response.json(results);
  } catch (error: any) {
    return Response.json({ error: 'Internal Server Error', details: error?.message }, { status: 500 });
  }
}
