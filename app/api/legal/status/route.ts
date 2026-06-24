import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";
import { getPendingLegalDocs } from "@/lib/legal";

export const dynamic = "force-dynamic";

/**
 * What the current user still needs to sign. Polled by the TermsGate on every
 * authenticated page load. Owners are never gated.
 */
export async function GET() {
  try {
    const user = await getAuthedUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { id: true, is_owner: true },
    });
    if (!profile) return NextResponse.json({ needsAcceptance: false, pending: [] });
    if (profile.is_owner) return NextResponse.json({ needsAcceptance: false, pending: [] });

    const pending = await getPendingLegalDocs(profile.id);
    return NextResponse.json({ needsAcceptance: pending.length > 0, pending });
  } catch (error) {
    console.error("[LEGAL] status failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
