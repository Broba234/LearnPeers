import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { notifySessionStatusChanged } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userId } = await req.json();
    if (!sessionId || !userId) {
      return NextResponse.json({ error: "sessionId and userId required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: session, error: fetchError } = await supabase
      .from("Sessions")
      .select("id, status, tutor_id, student_id, amount")
      .eq("id", sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.tutor_id !== userId && session.student_id !== userId) {
      return NextResponse.json({ error: "Not authorized to cancel this session" }, { status: 403 });
    }

    if (["completed", "cancelled"].includes(session.status)) {
      return NextResponse.json({ error: "Session cannot be cancelled in its current state" }, { status: 400 });
    }

    // Attempt Stripe refund by searching for the payment intent via metadata
    if (stripe && session.amount) {
      try {
        const results = await stripe.paymentIntents.search({
          query: `metadata['session_id']:'${sessionId}'`,
          limit: 1,
        });
        const pi = results.data[0];
        if (pi && pi.status === "succeeded") {
          await stripe.refunds.create({ payment_intent: pi.id });
        }
      } catch (stripeErr: any) {
        // Non-fatal: log and continue with status update
        console.error("[booking/cancel] Stripe refund failed:", stripeErr.message);
      }
    }

    await supabase.from("Sessions").update({ status: "cancelled" }).eq("id", sessionId);

    const [tutor, student] = await Promise.all([
      prisma.profiles.findUnique({ where: { id: session.tutor_id }, select: { name: true } }),
      prisma.profiles.findUnique({ where: { id: session.student_id }, select: { name: true } }),
    ]);

    await notifySessionStatusChanged(supabase, {
      sessionId,
      status: "cancelled",
      tutorId: session.tutor_id,
      studentId: session.student_id,
      actorUserId: userId,
      tutorName: tutor?.name ?? "Tutor",
      studentName: student?.name ?? "Student",
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[booking/cancel] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
