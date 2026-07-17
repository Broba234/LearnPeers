import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";

// Place a course on your tree. Creates a CourseAsset in the `claimed` state —
// owned but locked (greyed) until the grade is verified. Idempotent: claiming a
// course you already own returns the existing asset untouched.
export async function POST(req: Request) {
  try {
    const user = await getAuthedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { subject_id, institution_course_id } = await req.json();
    if (!subject_id) return NextResponse.json({ error: "subject_id is required" }, { status: 400 });

    const subject = await prisma.subjects.findUnique({ where: { id: subject_id }, select: { id: true } });
    if (!subject) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    const existing = await prisma.courseAssets.findUnique({
      where: { tutor_id_subject_id: { tutor_id: user.id, subject_id } },
      select: { id: true, status: true },
    });
    if (existing) return NextResponse.json({ asset: existing, already: true });

    const asset = await prisma.courseAssets.create({
      data: {
        tutor_id: user.id,
        subject_id,
        institution_course_id: institution_course_id ?? null,
        status: "claimed",
      },
      select: { id: true, status: true },
    });

    return NextResponse.json({ asset });
  } catch (e: any) {
    console.error("[COURSES_CLAIM]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
