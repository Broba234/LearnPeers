import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";

// Lightweight check the AccountEmailGate polls to decide whether to nag.
export async function GET() {
  try {
    const user = await getAuthedUser();
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { email_verified: true },
    });
    return NextResponse.json({ verified: Boolean(profile?.email_verified), email: user.email });
  } catch (error) {
    console.error("[AUTH] verify-email status failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
