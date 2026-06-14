import { NextResponse } from "next/server";
import { Prisma } from "@/prisma/generated";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { id, email, name, role, profile_setup } = body;

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
