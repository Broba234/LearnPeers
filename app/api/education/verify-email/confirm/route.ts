import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/serverAuth";

const MAX_ATTEMPTS = 5;

// Confirms a school-email verification code and marks the affiliation verified.
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { code } = await req.json();
    if (!code || !/^\d{6}$/.test(String(code))) {
      return NextResponse.json({ error: "Enter the 6-digit code from your email" }, { status: 400 });
    }

    const verification = await prisma.schoolEmailVerifications.findFirst({
      where: { profile_id: user.id, consumed_at: null, expires_at: { gt: new Date() } },
      orderBy: { created_at: "desc" },
    });
    if (!verification) {
      return NextResponse.json({ error: "No active code. Request a new one." }, { status: 400 });
    }
    if (verification.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: "Too many wrong attempts. Request a new code." }, { status: 429 });
    }

    const hash = crypto.createHash("sha256").update(String(code)).digest("hex");
    if (hash !== verification.code_hash) {
      await prisma.schoolEmailVerifications.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json({ error: "Incorrect code. Check your email and try again." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.schoolEmailVerifications.update({
        where: { id: verification.id },
        data: { consumed_at: new Date() },
      }),
      prisma.profileInstitutions.upsert({
        where: { profile_id_kind: { profile_id: user.id, kind: "current_university" } },
        create: {
          profile_id: user.id,
          kind: "current_university",
          institution_id: verification.institution_id,
          status: "verified",
          verification_method: "school_email",
          verified_email: verification.email,
        },
        update: {
          institution_id: verification.institution_id,
          status: "verified",
          verification_method: "school_email",
          verified_email: verification.email,
          updated_at: new Date(),
        },
      }),
      // Keep the legacy single-institution pointer in sync for existing queries
      prisma.profiles.update({
        where: { id: user.id },
        data: { institution_id: verification.institution_id },
      }),
    ]);

    const institution = await prisma.institutions.findUnique({
      where: { id: verification.institution_id },
      select: { id: true, name: true, abbreviation: true },
    });

    return NextResponse.json({ ok: true, verified: true, institution });
  } catch (error) {
    console.error("[EDUCATION] verify-email confirm failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
