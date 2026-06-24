import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";
import { getPendingLegalDocs } from "@/lib/legal";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

/**
 * Record the current user's acceptance of the documents they are being gated on.
 * The set of documents is recomputed server-side — the client cannot mark
 * itself as having accepted something it wasn't actually shown.
 *
 * Each acceptance is written once (unique on profile + document) with the IP and
 * user-agent captured, forming a permanent audit record.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthedUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { id: true, is_owner: true },
    });
    if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });
    if (profile.is_owner) return NextResponse.json({ ok: true, accepted: 0 });

    // Optional allowlist of specific document ids; default to everything pending.
    const body = await req.json().catch(() => ({}));
    const onlyIds: string[] | null = Array.isArray(body?.documentIds)
      ? body.documentIds.filter((x: unknown): x is string => typeof x === "string")
      : null;

    const pending = await getPendingLegalDocs(profile.id);
    const toAccept = onlyIds ? pending.filter((d) => onlyIds.includes(d.id)) : pending;
    if (toAccept.length === 0) return NextResponse.json({ ok: true, accepted: 0 });

    const ip = clientIp(req);
    const userAgent = req.headers.get("user-agent")?.slice(0, 1000) ?? null;

    // Idempotent: a duplicate (profile, document) is ignored rather than erroring.
    const result = await prisma.legalAcceptances.createMany({
      data: toAccept.map((d) => ({
        profile_id: profile.id,
        document_id: d.id,
        document_type: d.type,
        document_version: d.version,
        ip_address: ip,
        user_agent: userAgent,
        method: "login_gate",
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ ok: true, accepted: result.count });
  } catch (error) {
    console.error("[LEGAL] accept failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
