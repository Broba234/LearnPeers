import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/serverAuth";
import {
  normalizeGrade,
  tierForXp,
  XP,
  publishListing,
  type GradeScale,
} from "@/lib/courses";

const BUCKET = "grade-proofs";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

// Submit a grade to unlock the right to tutor a course.
// - Below the bar  -> status `rejected` (retryable), no XP.
// - Meets the bar  -> status `verified` (+XP). If the course is already priced,
//   it auto-goes-live (published to the bookable listings) and earns go-live XP.
// Accepts JSON, or multipart/form-data when a proof document is attached.
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let course_asset_id = "";
    let grade_value = "";
    let grade_scale = "";
    let proof: File | null = null;

    const ct = req.headers.get("content-type") || "";
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      course_asset_id = String(form.get("course_asset_id") || "");
      grade_value = String(form.get("grade_value") || "");
      grade_scale = String(form.get("grade_scale") || "");
      proof = (form.get("proof") as File) || null;
    } else {
      const body = await req.json();
      course_asset_id = body.course_asset_id;
      grade_value = String(body.grade_value ?? "");
      grade_scale = String(body.grade_scale ?? "");
    }

    if (!course_asset_id || !grade_value || !grade_scale) {
      return NextResponse.json({ error: "course_asset_id, grade_value and grade_scale are required" }, { status: 400 });
    }

    const asset = await prisma.courseAssets.findUnique({ where: { id: course_asset_id } });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    if (asset.tutor_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const g = normalizeGrade(grade_scale as GradeScale, grade_value);
    if (!g.valid) {
      return NextResponse.json({ error: "That grade doesn't look right for the selected scale." }, { status: 400 });
    }

    // Below the bar — can't tutor this course (yet). Retryable.
    if (!g.qualifies) {
      const rejected = await prisma.courseAssets.update({
        where: { id: asset.id },
        data: {
          status: "rejected",
          grade_value,
          grade_scale,
          rejected_reason: `Grade below the bar to tutor this course (${g.label}).`,
          verified_at: null,
          verification_method: null,
        },
        select: { id: true, status: true, rejected_reason: true },
      });
      return NextResponse.json({ asset: rejected, qualifies: false });
    }

    // Optional proof upload (private bucket — reviewed via signed URLs).
    let proofUrl = asset.grade_proof_url;
    let method = "self_attested";
    if (proof && typeof proof === "object" && proof.size > 0) {
      if (proof.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
      if (!ALLOWED.includes(proof.type)) return NextResponse.json({ error: "Use a PDF, JPG, PNG or WebP" }, { status: 400 });
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data: buckets } = await admin.storage.listBuckets();
      if (!buckets?.some((b) => b.name === BUCKET)) {
        await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_BYTES });
      }
      const ext = (proof.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${user.id}/${asset.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await admin.storage
        .from(BUCKET)
        .upload(path, Buffer.from(await proof.arrayBuffer()), { contentType: proof.type });
      if (upErr) {
        console.error("[COURSES_VERIFY] proof upload failed:", upErr);
        return NextResponse.json({ error: "Proof upload failed, try again" }, { status: 500 });
      }
      proofUrl = path;
      method = "document";
    }

    const firstVerify = !asset.verified_at; // award verify XP only once
    const priced = (asset.price_1 ?? 0) > 0 && (asset.price_2 ?? 0) > 0 && (asset.price_3 ?? 0) > 0;
    const wasLive = asset.status === "live";

    let xp = asset.xp;
    if (firstVerify) xp += XP.verify;
    const goingLive = priced; // verified + priced -> live
    if (goingLive && !wasLive) xp += XP.goLive;

    const updated = await prisma.courseAssets.update({
      where: { id: asset.id },
      data: {
        status: goingLive ? "live" : "verified",
        grade_value,
        grade_scale,
        grade_proof_url: proofUrl,
        verification_method: method,
        verified_at: new Date(),
        rejected_reason: null,
        xp,
        tier: tierForXp(xp),
      },
    });

    if (goingLive) {
      await publishListing({
        tutor_id: updated.tutor_id,
        subject_id: updated.subject_id,
        institution_course_id: updated.institution_course_id,
        price_1: updated.price_1,
        price_2: updated.price_2,
        price_3: updated.price_3,
        duration_1: updated.duration_1,
        duration_2: updated.duration_2,
        duration_3: updated.duration_3,
      });
    }

    return NextResponse.json({
      asset: {
        id: updated.id,
        status: updated.status,
        grade_label: g.label,
        mastery: g.mastery,
        verification_method: method,
        xp: updated.xp,
        tier: updated.tier,
        xpGained: xp - asset.xp,
      },
      qualifies: true,
      live: goingLive,
    });
  } catch (e: any) {
    console.error("[COURSES_VERIFY]", e);
    return NextResponse.json({ error: "Internal Server Error", details: e?.message }, { status: 500 });
  }
}
