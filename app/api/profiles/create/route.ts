import { NextResponse } from "next/server";
import { Prisma } from "@/prisma/generated";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { id, email, name, role, profile_setup, ref } = body;

    if (!id || !email || !name || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Public sign-up may only create students or tutors. Privileged roles
    // (e.g. admin) must never be self-assignable from a client request.
    if (role !== "student" && role !== "tutor") {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Idempotent on the auth user id: a retried registration, or a sign-up
    // against an email that already has an account (Supabase returns the
    // existing user without erroring), must not blow up with a 500. If a
    // profile already exists for this id, return it untouched.
    const existing = await prisma.profiles.findUnique({ where: { id } });
    if (existing) {
      return NextResponse.json(existing);
    }

    const profile = await prisma.profiles.create({
      data: {
        id,
        email,
        name,
        role,
        profile_setup: profile_setup ?? false
      }
    });

    // Growth loop: assign a referral code, and credit the referrer when the
    // sign-up came from a shared invite link (?ref=CODE). Non-fatal — referral
    // bookkeeping must never break account creation. (These columns live
    // outside the Prisma client, so they're written via raw SQL.)
    try {
      const base = String(name).replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 6) || "PEER";
      const code = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
      let referrerId: string | null = null;
      if (ref && typeof ref === "string") {
        const rows = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM public."Profiles" WHERE referral_code = ${ref} LIMIT 1`;
        if (rows[0]?.id && rows[0].id !== id) referrerId = rows[0].id;
      }
      await prisma.$executeRaw`
        UPDATE public."Profiles"
           SET referral_code = COALESCE(referral_code, ${code}),
               referred_by = COALESCE(referred_by, ${referrerId}::uuid)
         WHERE id = ${id}::uuid`;
    } catch (e) {
      console.warn("[API] referral assignment skipped:", e);
    }

    return NextResponse.json(profile);

  } catch (error) {
    // A unique violation here means the account already exists (id or email).
    // Surface a clean 409 so the client can prompt the user to log in instead
    // of showing a raw "Internal Server Error".
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "An account with this email already exists. Try logging in instead." },
          { status: 409 }
        );
      }
      // P2003: the id has no matching auth user — a malformed/expired sign-up.
      if (error.code === "P2003") {
        return NextResponse.json(
          { error: "Could not create your profile. Please try signing up again." },
          { status: 400 }
        );
      }
    }

    console.error("[API] Profile creation failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}
