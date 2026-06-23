import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";
import { normalizeGrade, tierForXp, XP, publishListing, type GradeScale } from "@/lib/courses";
import { createNotification } from "@/lib/notifications";

const BUCKET = "grade-proofs";

async function requireAdmin() {
  const user = await getAuthedUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 };
  const profile = await prisma.profiles.findUnique({ where: { id: user.id }, select: { role: true } });
  if (profile?.role !== "admin") return { error: "Forbidden" as const, status: 403 };
  return { user };
}

// GET — pending course-verification requests for the admin queue, each with a
// short-lived signed URL to view the uploaded transcript.
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const rows = await prisma.courseAssets.findMany({
    where: { status: "pending" },
    orderBy: { updated_at: "asc" },
    include: {
      Subjects: { select: { code: true, name: true, grade: true, category: true } },
      Profiles: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });

  const admin = createSupabaseAdminClient();

  const requests = await Promise.all(
    rows.map(async (a) => {
      let proof_url: string | null = null;
      if (a.grade_proof_url) {
        const { data } = await admin.storage.from(BUCKET).createSignedUrl(a.grade_proof_url, 60 * 30);
        proof_url = data?.signedUrl ?? null;
      }
      const g = a.grade_value && a.grade_scale ? normalizeGrade(a.grade_scale as GradeScale, a.grade_value) : null;
      return {
        id: a.id,
        tutor: a.Profiles,
        subject: a.Subjects,
        grade_value: a.grade_value,
        grade_scale: a.grade_scale,
        grade_label: g?.label ?? a.grade_value,
        mastery: g?.mastery ?? null,
        priced: (a.price_1 ?? 0) > 0 && (a.price_2 ?? 0) > 0 && (a.price_3 ?? 0) > 0,
        proof_url,
        submitted_at: a.updated_at,
      };
    })
  );

  return NextResponse.json({ requests });
}

// POST — approve or reject a request. { course_asset_id, action: 'approve'|'reject', reason? }
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { course_asset_id, action, reason } = await req.json();
  if (!course_asset_id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "course_asset_id and a valid action are required" }, { status: 400 });
  }

  const asset = await prisma.courseAssets.findUnique({ where: { id: course_asset_id } });
  if (!asset) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (asset.status !== "pending") return NextResponse.json({ error: "This request is no longer pending" }, { status: 409 });

  const admin = createSupabaseAdminClient();
  const subj = await prisma.subjects.findUnique({ where: { id: asset.subject_id }, select: { code: true, name: true } });
  const label = subj?.code || subj?.name || "your course";

  if (action === "reject") {
    await prisma.courseAssets.update({
      where: { id: asset.id },
      data: { status: "rejected", rejected_reason: reason?.trim() || "Verification could not be confirmed from the document provided." },
    });
    await createNotification(admin, {
      userId: asset.tutor_id,
      type: "course_verification_rejected",
      title: "Verification not approved",
      body: `Your verification for ${label} wasn't approved. ${reason?.trim() || ""}`.trim(),
    });
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // Approve: verified (+XP). Auto-go-live if the course already has pricing.
  const priced = (asset.price_1 ?? 0) > 0 && (asset.price_2 ?? 0) > 0 && (asset.price_3 ?? 0) > 0;
  let xp = asset.xp + XP.verify + (priced ? XP.goLive : 0);

  const updated = await prisma.courseAssets.update({
    where: { id: asset.id },
    data: {
      status: priced ? "live" : "verified",
      verification_method: "document",
      verified_at: new Date(),
      rejected_reason: null,
      xp,
      tier: tierForXp(xp),
    },
  });

  if (priced) {
    await publishListing({
      tutor_id: updated.tutor_id,
      subject_id: updated.subject_id,
      institution_course_id: updated.institution_course_id,
      price_1: updated.price_1, price_2: updated.price_2, price_3: updated.price_3,
      duration_1: updated.duration_1, duration_2: updated.duration_2, duration_3: updated.duration_3,
    });
  }

  await createNotification(admin, {
    userId: asset.tutor_id,
    type: "course_verification_approved",
    title: "Verified — you're cleared to tutor",
    body: priced
      ? `${label} is verified and live. Students can book it now (+${XP.verify + XP.goLive} XP).`
      : `${label} is verified. Set a price to go live (+${XP.verify} XP).`,
  });

  return NextResponse.json({ ok: true, status: updated.status, live: priced });
}
