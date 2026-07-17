import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";
import { unpublishListing } from "@/lib/courses";

// Take a live course offline without giving up the asset: it drops out of the
// bookable listings but keeps its grade, rating, XP and tier. Reverts to `verified`.
export async function POST(req: Request) {
  try {
    const user = await getAuthedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { course_asset_id } = await req.json();
    if (!course_asset_id) return NextResponse.json({ error: "course_asset_id is required" }, { status: 400 });

    const asset = await prisma.courseAssets.findUnique({ where: { id: course_asset_id } });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    if (asset.tutor_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await unpublishListing(asset.tutor_id, asset.subject_id);
    await prisma.courseAssets.update({
      where: { id: asset.id },
      data: { status: asset.verified_at ? "verified" : "claimed" },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[COURSES_UNPUBLISH]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
