import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-access";

// Lists the courses (Subjects) in a curriculum.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const courses = await prisma.subjects.findMany({
      where: { curriculum_id: id },
      orderBy: [{ category: "asc" }, { grade: "asc" }, { code: "asc" }],
      select: { id: true, code: true, name: true, grade: true, category: true },
    });
    return Response.json(courses);
  } catch (error: any) {
    console.error('[CURRICULA_COURSES_GET]', error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Adds a single course to a curriculum.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Admin-only: mutates the global course catalog (GET stays public).
    const { res } = await requireAdminApi("curricula");
    if (res) return res;

    const { id } = await params;
    const { code, name, grade, category } = await req.json();
    if (!code?.trim() || !name?.trim()) {
      return Response.json({ error: "code and name are required" }, { status: 400 });
    }
    const curriculum = await prisma.curricula.findUnique({ where: { id } });
    if (!curriculum) return Response.json({ error: "Curriculum not found" }, { status: 404 });

    const normalizedCode = code.trim().toUpperCase();
    const existing = await prisma.subjects.findFirst({ where: { code: normalizedCode, curriculum_id: id } });
    if (existing) {
      return Response.json({ error: "That course code already exists in this curriculum" }, { status: 409 });
    }

    const course = await prisma.subjects.create({
      data: {
        code: normalizedCode,
        name: name.trim(),
        grade: grade != null && grade !== "" ? Number(grade) : null,
        category: category?.trim() || null,
        curriculum_id: id,
      },
      select: { id: true, code: true, name: true, grade: true, category: true },
    });
    return Response.json(course);
  } catch (error: any) {
    console.error('[CURRICULA_COURSES_POST]', error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
