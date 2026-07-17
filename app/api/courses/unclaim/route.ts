import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";
import { unpublishListing } from "@/lib/courses";

// Remove a course-asset from your portfolio. Also pulls it from the bookable
// listings (ProfilesOnSubjects) if it was live. Reviews cascade-delete with it.
export async function POST(req: Request) {
  try {
    const user = await getAuthedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { course_asset_id } = await req.json();
    if (!course_asset_id) return NextResponse.json({ error: "course_asset_id is required" }, { status: 400 });

    const asset = await prisma.courseAssets.findUnique({
      where: { id: course_asset_id },
      select: { id: true, tutor_id: true, subject_id: true },
    });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    if (asset.tutor_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await unpublishListing(asset.tutor_id, asset.subject_id);
    await prisma.courseAssets.delete({ where: { id: asset.id } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[COURSES_UNCLAIM]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
