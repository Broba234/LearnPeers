import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/serverAuth";
import { sendSchoolVerificationEmail } from "@/lib/email";

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_CODES_PER_HOUR = 5;

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// Sends a 6-digit code to a university email to verify enrollment.
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { institutionId, email } = await req.json();
    if (!institutionId || !email) {
      return NextResponse.json({ error: "institutionId and email are required" }, { status: 400 });
    }

    const institution = await prisma.institutions.findUnique({ where: { id: institutionId } });
    if (!institution || institution.type !== "university") {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    const normalized = String(email).trim().toLowerCase();
    const domain = normalized.split("@")[1];
    const domainOk =
      domain &&
      institution.email_domains.some((d) => domain === d || domain.endsWith("." + d));
    if (!domainOk) {
      return NextResponse.json(
        {
          error: `That doesn't look like a ${institution.abbreviation || institution.name} email. Use your @${institution.email_domains[0]} address.`,
        },
        { status: 400 }
      );
    }

    const recentCount = await prisma.schoolEmailVerifications.count({
      where: { profile_id: user.id, created_at: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recentCount >= MAX_CODES_PER_HOUR) {
      return NextResponse.json(
        { error: "Too many verification attempts. Try again in an hour." },
        { status: 429 }
      );
    }

    const code = String(crypto.randomInt(100000, 1000000));
    await prisma.schoolEmailVerifications.create({
      data: {
        profile_id: user.id,
        institution_id: institution.id,
        email: normalized,
        code_hash: hashCode(code),
        expires_at: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    // Record the declared affiliation as pending until the code is confirmed
    await prisma.profileInstitutions.upsert({
      where: { profile_id_kind: { profile_id: user.id, kind: "current_university" } },
      create: {
        profile_id: user.id,
        kind: "current_university",
        institution_id: institution.id,
        status: "pending",
        verification_method: "school_email",
      },
      update: {
        institution_id: institution.id,
        status: "pending",
        verification_method: "school_email",
        verified_email: null,
        updated_at: new Date(),
      },
    });

    const sent = await sendSchoolVerificationEmail(normalized, code, institution.name);

    return NextResponse.json({ ok: true, devCode: sent.devCode });
  } catch (error: any) {
    console.error("[EDUCATION] verify-email request failed:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
