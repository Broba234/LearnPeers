import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/serverAuth";

const BUCKET = "enrollment-proofs";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const KINDS = ["current_university", "current_high_school", "former_high_school"];

// Uploads a proof-of-enrollment document (private bucket) and marks the
// matching affiliation pending review.
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const kind = String(form.get("kind") || "");

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!KINDS.includes(kind)) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "Use a PDF, JPG, PNG or WebP file" }, { status: 400 });
    }

    const affiliation = await prisma.profileInstitutions.findUnique({
      where: { profile_id_kind: { profile_id: user.id, kind } },
    });
    if (!affiliation) {
      return NextResponse.json(
        { error: "Declare the school first, then upload your proof of enrollment" },
        { status: 400 }
      );
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Private bucket — documents are sensitive; admin reviews via signed URLs
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET)) {
      await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_BYTES });
    }

    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
    if (uploadError) {
      console.error("[EDUCATION] proof upload failed:", uploadError);
      return NextResponse.json({ error: "Upload failed, try again" }, { status: 500 });
    }

    const updated = await prisma.profileInstitutions.update({
      where: { id: affiliation.id },
      data: {
        document_url: `${BUCKET}/${path}`,
        // School-email verification outranks a pending document review
        status: affiliation.status === "verified" ? "verified" : "pending",
        verification_method: affiliation.status === "verified" ? affiliation.verification_method : "document",
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ ok: true, affiliation: updated });
  } catch (error) {
    console.error("[EDUCATION] proof-upload failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
