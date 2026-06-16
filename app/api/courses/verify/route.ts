import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/serverAuth";
import { normalizeGrade, type GradeScale } from "@/lib/courses";
import { createNotification } from "@/lib/notifications";

const BUCKET = "grade-proofs";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

// Submit a grade to REQUEST the right to tutor a course.
// A transcript/report card is REQUIRED — it creates a `pending` request that an
// admin reviews and approves (see /api/admin/course-approvals). Nothing is
// auto-approved here and no XP is awarded until an admin approves.
// - Below the bar -> `rejected` immediately (retryable), so admins only see
//   legitimate requests.
// - Meets the bar -> `pending`, proof stored privately, admins notified.
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Attach your transcript or report card to request verification." },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const course_asset_id = String(form.get("course_asset_id") || "");
    const grade_value = String(form.get("grade_value") || "");
    const grade_scale = String(form.get("grade_scale") || "");
    const proof = (form.get("proof") as File) || null;

    if (!course_asset_id || !grade_value || !grade_scale) {
      return NextResponse.json({ error: "course_asset_id, grade_value and grade_scale are required" }, { status: 400 });
    }
    if (!proof || typeof proof !== "object" || proof.size === 0) {
      return NextResponse.json(
        { error: "Upload your transcript or report card — verification is reviewed by an admin." },
        { status: 400 }
      );
    }

    const asset = await prisma.courseAssets.findUnique({ where: { id: course_asset_id } });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    if (asset.tutor_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (asset.status === "live" || asset.status === "verified") {
      return NextResponse.json({ error: "This course is already verified." }, { status: 400 });
    }

    const g = normalizeGrade(grade_scale as GradeScale, grade_value);
    if (!g.valid) {
      return NextResponse.json({ error: "That grade doesn't look right for the selected scale." }, { status: 400 });
    }

    // Below the bar — can't tutor this course. Rejected immediately, no admin needed.
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

    // Validate + store the proof in the private bucket (admins review via signed URLs).
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

    // Create the pending request — awaiting admin approval. No XP yet.
    await prisma.courseAssets.update({
      where: { id: asset.id },
      data: {
        status: "pending",
        grade_value,
        grade_scale,
        grade_proof_url: path,
        verification_method: "document",
        verified_at: null,
        rejected_reason: null,
      },
    });

    // Notify all admins that there's a request to review.
    try {
      const admins = await prisma.profiles.findMany({ where: { role: "admin" }, select: { id: true } });
      const subj = await prisma.subjects.findUnique({ where: { id: asset.subject_id }, select: { code: true, name: true } });
      const tutor = await prisma.profiles.findUnique({ where: { id: user.id }, select: { name: true } });
      for (const a of admins) {
        await createNotification(admin, {
          userId: a.id,
          type: "course_verification_request",
          title: "Course verification request",
          body: `${tutor?.name || "A tutor"} requested verification for ${subj?.code || subj?.name || "a course"} (grade ${g.label}).`,
          actorId: user.id,
        });
      }
    } catch (e) {
      console.error("[COURSES_VERIFY] admin notify failed:", e);
    }

    return NextResponse.json({ asset: { id: asset.id, status: "pending", grade_label: g.label }, qualifies: true, pending: true });
  } catch (e: any) {
    console.error("[COURSES_VERIFY]", e);
    return NextResponse.json({ error: "Internal Server Error", details: e?.message }, { status: 500 });
  }
}
