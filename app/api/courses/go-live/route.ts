import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";
import { tierForXp, XP, publishListing } from "@/lib/courses";

// Set pricing and publish a course to the bookable listings.
// - verified -> live (+go-live XP, mirrored into ProfilesOnSubjects)
// - live     -> price update (re-published, no double XP)
// - claimed/rejected -> pricing is stored but the course stays locked until the
//   grade is verified ("Verify your grade to go live").
export async function POST(req: Request) {
  try {
    const user = await getAuthedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { course_asset_id } = body;
    if (!course_asset_id) return NextResponse.json({ error: "course_asset_id is required" }, { status: 400 });

    const asset = await prisma.courseAssets.findUnique({ where: { id: course_asset_id } });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    if (asset.tutor_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const num = (v: any, fallback: number | null = null) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    const price_1 = num(body.price_1, asset.price_1);
    const price_2 = num(body.price_2, asset.price_2);
    const price_3 = num(body.price_3, asset.price_3);
    const duration_1 = num(body.duration_1, asset.duration_1 ?? 0.5)!;
    const duration_2 = num(body.duration_2, asset.duration_2 ?? 1)!;
    const duration_3 = num(body.duration_3, asset.duration_3 ?? 1.5)!;

    if (!price_1 || !price_2 || !price_3) {
      return NextResponse.json({ error: "Set a price for all three session lengths." }, { status: 400 });
    }

    const canGoLive = asset.status === "verified" || asset.status === "live";
    const wasLive = asset.status === "live";
    let xp = asset.xp;
    if (canGoLive && !wasLive) xp += XP.goLive;

    const updated = await prisma.courseAssets.update({
      where: { id: asset.id },
      data: {
        price_1, price_2, price_3,
        duration_1, duration_2, duration_3,
        status: canGoLive ? "live" : asset.status,
        xp,
        tier: tierForXp(xp),
      },
    });

    if (canGoLive) {
      await publishListing({
        tutor_id: updated.tutor_id,
        subject_id: updated.subject_id,
        institution_course_id: updated.institution_course_id,
        price_1, price_2, price_3, duration_1, duration_2, duration_3,
      });
    }

    return NextResponse.json({
      ok: true,
      live: canGoLive,
      asset: { id: updated.id, status: updated.status, xp: updated.xp, tier: updated.tier, xpGained: xp - asset.xp },
      message: canGoLive ? null : "Pricing saved. Verify your grade to go live.",
    });
  } catch (e: any) {
    console.error("[COURSES_GO_LIVE]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
