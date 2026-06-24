import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";

const TARGETS = ["account", "school", "both"];

// Read the current user's notification preferences (+ the addresses available).
export async function GET() {
  try {
    const user = await getAuthedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        notify_email_enabled: true,
        notify_email_target: true,
        ProfileInstitutions: {
          where: { kind: "current_university", status: "verified" },
          select: { verified_email: true },
          take: 1,
        },
      },
    });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    return NextResponse.json({
      enabled: profile.notify_email_enabled,
      target: profile.notify_email_target,
      accountEmail: profile.email,
      schoolEmail: profile.ProfileInstitutions[0]?.verified_email ?? null,
    });
  } catch (error) {
    console.error("[notifications] GET failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Update the toggle + routing target.
export async function PUT(req: Request) {
  try {
    const user = await getAuthedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { enabled, target } = await req.json();
    if (typeof enabled !== "boolean" || !TARGETS.includes(target)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await prisma.profiles.update({
      where: { id: user.id },
      data: { notify_email_enabled: enabled, notify_email_target: target },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[notifications] PUT failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
