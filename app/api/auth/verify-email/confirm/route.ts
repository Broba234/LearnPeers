import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";
import { sendWelcomeEmail } from "@/lib/email";

const MAX_ATTEMPTS = 6;

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// Confirms a 6-digit account-email code. On success: flips email_verified and
// sends the welcome email (from hello@) — the welcome is the post-verify reward.
export async function POST(req: Request) {
  try {
    const user = await getAuthedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { email_verified: true, name: true },
    });
    if (profile?.email_verified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const record = await prisma.emailVerifications.findFirst({
      where: { profile_id: user.id, consumed_at: null, expires_at: { gt: new Date() } },
      orderBy: { created_at: "desc" },
    });
    if (!record) {
      return NextResponse.json(
        { error: "That code expired. Request a new one." },
        { status: 400 }
      );
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Too many wrong attempts. Request a new code." },
        { status: 429 }
      );
    }

    if (record.code_hash !== hashCode(code.trim())) {
      await prisma.emailVerifications.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json({ error: "Incorrect code. Try again." }, { status: 400 });
    }

    // Correct: consume the code and mark the profile verified.
    await prisma.emailVerifications.update({
      where: { id: record.id },
      data: { consumed_at: new Date() },
    });
    await prisma.profiles.update({
      where: { id: user.id },
      data: { email_verified: true, email_verified_at: new Date() },
    });

    // Welcome from hello@ — non-fatal, must never fail the verification.
    try {
      const firstName = profile?.name ? String(profile.name).trim().split(/\s+/)[0] : undefined;
      if (user.email) await sendWelcomeEmail(user.email, firstName);
    } catch (e) {
      console.warn("[AUTH] welcome email skipped:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[AUTH] verify-email confirm failed:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
