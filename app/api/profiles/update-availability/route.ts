import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";

/**
 * Toggle the tutor's live "Available Now" presence.
 *
 * This is a pure manual switch, fully independent of the tutor's schedule:
 * turning it ON makes them connectable right now; turning it OFF takes them
 * offline immediately. The calendar/schedule is only used for booking ahead.
 *
 * Identity is derived from the session cookie — never trusted from the body.
 */
export async function PATCH(req: Request) {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { isAvailableNow } = await req.json();
    if (typeof isAvailableNow !== "boolean") {
      return NextResponse.json(
        { error: "isAvailableNow must be a boolean" },
        { status: 400 }
      );
    }

    const updated = await prisma.profiles.update({
      where: { id: user.id },
      data: {
        isAvailableNow,
        // Stamp a fresh heartbeat when going online so the tutor shows up as
        // live immediately; clear it when going offline.
        last_active_at: isAvailableNow ? new Date() : null,
      },
      select: { id: true, email: true, isAvailableNow: true, last_active_at: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[AVAILABILITY_UPDATE] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
