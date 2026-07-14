import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-access";

// Bulk import courses into a curriculum. Accepts a JSON array (or { courses: [] })
// of { code, name, grade?, category? }. Upserts by (curriculum, code).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Admin-only: bulk-mutates the global course catalog.
    const { res } = await requireAdminApi("curricula");
    if (res) return res;

    const { id } = await params;
    const body = await req.json();
    const courses = Array.isArray(body) ? body : body.courses;
    if (!Array.isArray(courses) || courses.length === 0) {
      return Response.json({ error: "Provide a non-empty array of courses" }, { status: 400 });
    }
    const curriculum = await prisma.curricula.findUnique({ where: { id } });
    if (!curriculum) return Response.json({ error: "Curriculum not found" }, { status: 404 });

    const existing = await prisma.subjects.findMany({
      where: { curriculum_id: id },
      select: { id: true, code: true },
    });
    const byCode = new Map(existing.map((s) => [s.code, s.id]));

    const results = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };
    for (const c of courses) {
      const code = c.code?.trim()?.toUpperCase();
      const name = c.name?.trim();
      if (!code || !name) {
        results.skipped++;
        results.errors.push(`Missing code or name: ${JSON.stringify(c).slice(0, 60)}`);
        continue;
      }
      const grade = c.grade != null && c.grade !== "" ? Number(c.grade) : null;
      const category = c.category?.trim() || null;
      try {
        const existingId = byCode.get(code);
        if (existingId) {
          await prisma.subjects.update({ where: { id: existingId }, data: { name, grade, category, curriculum_id: id } });
          results.updated++;
        } else {
          const row = await prisma.subjects.create({ data: { code, name, grade, category, curriculum_id: id } });
          byCode.set(code, row.id);
          results.created++;
        }
      } catch (err: any) {
        results.skipped++;
        results.errors.push(`${code}: ${err?.message}`);
      }
    }
    return Response.json(results);
  } catch (error: any) {
    console.error('[CURRICULA_COURSES_BULK_POST]', error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
