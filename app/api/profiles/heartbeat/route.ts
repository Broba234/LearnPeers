import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";

/**
 * Keepalive ping sent by an "Available Now" tutor's app every ~45s. Refreshes
 * `last_active_at` so the tutor keeps showing as live. When the app closes the
 * pings stop and the tutor drops offline on their own (see lib/presence).
 *
 * Body: { online?: boolean }. Passing online:false (e.g. on tab close /
 * sendBeacon) takes the tutor offline right away.
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let online = true;
    try {
      const body = await req.json();
      if (body && typeof body.online === "boolean") online = body.online;
    } catch {
      // empty body (e.g. sendBeacon) → treat as keepalive
    }

    await prisma.profiles.update({
      where: { id: user.id },
      data: online
        ? { last_active_at: new Date() }
        : { isAvailableNow: false, last_active_at: null },
    });

    return NextResponse.json({ ok: true, online });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
