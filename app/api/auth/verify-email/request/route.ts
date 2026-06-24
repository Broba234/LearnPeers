import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";
import { sendAccountVerificationEmail } from "@/lib/email";

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_CODES_PER_HOUR = 5;

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// Sends a 6-digit code to the user's account email to confirm ownership.
export async function POST() {
  try {
    const user = await getAuthedUser();
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Already verified — nothing to do.
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { email_verified: true },
    });
    if (profile?.email_verified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const recentCount = await prisma.emailVerifications.count({
      where: { profile_id: user.id, created_at: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recentCount >= MAX_CODES_PER_HOUR) {
      return NextResponse.json(
        { error: "Too many codes requested. Try again in an hour." },
        { status: 429 }
      );
    }

    const code = String(crypto.randomInt(100000, 1000000));
    await prisma.emailVerifications.create({
      data: {
        profile_id: user.id,
        email: user.email,
        code_hash: hashCode(code),
        expires_at: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    const sent = await sendAccountVerificationEmail(user.email, code);
    return NextResponse.json({ ok: true, devCode: sent.devCode });
  } catch (error: any) {
    console.error("[AUTH] verify-email request failed:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
