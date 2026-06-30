import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-access";

const KINDS = ["provincial_secondary", "ib", "ap", "university"];

// Lists curricula with course counts + their province/institution name.
export async function GET() {
  try {
    const curricula = await prisma.curricula.findMany({
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      include: {
        Provinces: { select: { id: true, code: true, name: true } },
        Institutions: { select: { id: true, name: true, abbreviation: true } },
        _count: { select: { Subjects: true } },
      },
    });
    return Response.json(
      curricula.map((c) => ({
        id: c.id,
        name: c.name,
        kind: c.kind,
        province: c.Provinces,
        institution: c.Institutions,
        courseCount: c._count.Subjects,
      }))
    );
  } catch (error: any) {
    return Response.json({ error: "Internal Server Error", details: error?.message }, { status: 500 });
  }
}

// Creates a curriculum (provincial_secondary | ib | ap | university).
export async function POST(req: Request) {
  try {
    // Admin-only: mutates the global curriculum catalog (GET stays public).
    const { res } = await requireAdminApi("curricula");
    if (res) return res;

    const { name, kind, province_id, institution_id } = await req.json();
    if (!name?.trim() || !KINDS.includes(kind)) {
      return Response.json({ error: "name and a valid kind are required" }, { status: 400 });
    }
    if (kind === "provincial_secondary" && !province_id) {
      return Response.json({ error: "provincial_secondary curricula need a province" }, { status: 400 });
    }
    if (kind === "university" && !institution_id) {
      return Response.json({ error: "university curricula need an institution" }, { status: 400 });
    }

    const curriculum = await prisma.curricula.create({
      data: {
        name: name.trim(),
        kind,
        province_id: kind === "provincial_secondary" ? province_id : null,
        institution_id: kind === "university" ? institution_id : null,
      },
    });
    return Response.json(curriculum);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return Response.json({ error: "A curriculum of this kind already exists for that province/institution" }, { status: 409 });
    }
    return Response.json({ error: "Internal Server Error", details: error?.message }, { status: 500 });
  }
}
