import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function DELETE(req: NextRequest) {
  try {
    const { user, res } = await requireUser();
    if (res) return res;

    const { eventId } = await req.json();

    if (!eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }

    // Only delete the slot if it belongs to the caller (ownership enforced in WHERE).
    const { count } = await prisma.tutorAvailability.deleteMany({
      where: { id: eventId, tutor_id: user.id },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[TA_DELETE] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}