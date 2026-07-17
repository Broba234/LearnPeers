import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";

// The catalog that powers the unlock tree: every course grouped by category and
// ordered by grade, annotated with whether the tutor already owns it.
export async function GET() {
  try {
    const user = await getAuthedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [subjects, owned] = await Promise.all([
      prisma.subjects.findMany({
        select: { id: true, name: true, code: true, grade: true, category: true },
        orderBy: [{ category: "asc" }, { grade: "asc" }, { name: "asc" }],
      }),
      prisma.courseAssets.findMany({
        where: { tutor_id: user.id },
        select: { subject_id: true, status: true },
      }),
    ]);

    const ownedMap: Record<string, string> = {};
    for (const o of owned) ownedMap[o.subject_id] = o.status;

    // Group into category trees
    const byCategory = new Map<string, any[]>();
    for (const s of subjects) {
      const cat = s.category || "Other";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push({ ...s, owned: ownedMap[s.id] ?? null });
    }

    const tree = Array.from(byCategory.entries())
      .map(([category, courses]) => ({
        category,
        courses,
        ownedCount: courses.filter((c) => c.owned).length,
        total: courses.length,
      }))
      .sort((a, b) => b.ownedCount - a.ownedCount || a.category.localeCompare(b.category));

    return NextResponse.json({ tree });
  } catch (e: any) {
    console.error("[COURSES_CATALOG]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
