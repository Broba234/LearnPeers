import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/serverAuth";

// Saved tutors (favorites). Stored in public."SavedTutors" — not on the Prisma
// client, so accessed via raw SQL. Identity is derived from the session.
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.$queryRaw<{ tutor_id: string }[]>`
    SELECT tutor_id FROM public."SavedTutors" WHERE student_id = ${user.id}::uuid`;
  return NextResponse.json({ ids: rows.map((r) => r.tutor_id) });
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const tutorId = body?.tutorId;
  if (!tutorId || typeof tutorId !== "string") {
    return NextResponse.json({ error: "tutorId required" }, { status: 400 });
  }
  const existing = await prisma.$queryRaw<{ one: number }[]>`
    SELECT 1 AS one FROM public."SavedTutors"
     WHERE student_id = ${user.id}::uuid AND tutor_id = ${tutorId}::uuid LIMIT 1`;
  if (existing.length > 0) {
    await prisma.$executeRaw`
      DELETE FROM public."SavedTutors"
       WHERE student_id = ${user.id}::uuid AND tutor_id = ${tutorId}::uuid`;
    return NextResponse.json({ saved: false });
  }
  await prisma.$executeRaw`
    INSERT INTO public."SavedTutors" (student_id, tutor_id)
    VALUES (${user.id}::uuid, ${tutorId}::uuid) ON CONFLICT DO NOTHING`;
  return NextResponse.json({ saved: true });
}
