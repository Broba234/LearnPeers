import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";
import { isTutorLive } from "@/lib/presence";
import { createNotification } from "@/lib/notifications";
import { computeCharge } from "@/lib/billing";
import { stripe } from "@/lib/stripe";

/**
 * "Connect now", gas-station style: authorize (hold) the student's saved card
 * before ringing the tutor; the hold is captured/released at session end (see
 * lib/payments). Degrades gracefully — if the platform structurally can't
 * charge (Stripe off, tutor not onboarded, no price), it falls back to the
 * old no-upfront-pay instant request so the product still works. But when it
 * CAN charge and the student has no card, it asks them to add one first.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const studentId = user.id;

    const { tutorId, subjectId, topic } = await request.json();
    if (!tutorId) return NextResponse.json({ error: "Missing tutorId" }, { status: 400 });
    if (tutorId === studentId) {
      return NextResponse.json({ error: "You cannot connect with yourself" }, { status: 400 });
    }

    const tutor = await prisma.profiles.findUnique({
      where: { id: tutorId },
      select: { id: true, name: true, isAvailableNow: true, last_active_at: true, stripe_account_id: true },
    });
    if (!tutor) return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
    if (!isTutorLive(tutor.isAvailableNow, tutor.last_active_at)) {
      return NextResponse.json(
        { error: "This tutor just went offline. Try another available tutor.", code: "TUTOR_OFFLINE" },
        { status: 409 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Reuse an existing fresh request so a double-tap doesn't duplicate.
    const { data: existing } = await supabase
      .from("Sessions")
      .select("id, status")
      .eq("tutor_id", tutorId)
      .eq("student_id", studentId)
      .eq("is_instant", true)
      .in("status", ["pending", "accepted", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ success: true, sessionId: existing.id, status: existing.status, reused: true });
    }

    // Price the instant session at the tutor's 30-min rate.
    let amount: number | null = null;
    if (subjectId) {
      const pos = await prisma.profilesOnSubjects.findUnique({
        where: { profile_id_subject_id: { profile_id: tutorId, subject_id: subjectId } },
        select: { price_1: true },
      });
      amount = pos?.price_1 ?? null;
    }

    // Can the platform actually hold a card right now?
    let canCharge = false;
    if (stripe && tutor.stripe_account_id && amount && amount > 0) {
      try {
        const acct = await stripe.accounts.retrieve(tutor.stripe_account_id);
        canCharge = acct.capabilities?.transfers === "active";
      } catch {
        canCharge = false;
      }
    }

    const now = new Date();
    const baseRow = {
      tutor_id: tutorId,
      student_id: studentId,
      subject_id: subjectId || null,
      topic: topic || "Live session",
      date: now.toISOString().split("T")[0],
      start_time: now.toTimeString().slice(0, 8),
      duration: 0.5,
      amount,
      is_instant: true,
    };

    const notifyTutor = async (sessionId: string) => {
      const { data: sp } = await supabase.from("Profiles").select("name").eq("id", studentId).single();
      await createNotification(supabase, {
        userId: tutorId,
        type: "instant_request",
        title: "⚡ Live session request",
        body: `${sp?.name || "A student"} wants to connect right now${topic ? ` · ${topic}` : ""}.`,
        sessionId,
        actorId: studentId,
      });
    };

    if (canCharge) {
      // Student must have a saved card to be held against.
      const { data: profile } = await supabase
        .from("Profiles")
        .select("stripe_customer_id")
        .eq("id", studentId)
        .single();
      const cid = profile?.stripe_customer_id as string | undefined;
      let pmId: string | undefined;
      if (cid) {
        // Hold against the student's chosen default card; fall back to
        // whatever Stripe has for customers saved before the mirror existed.
        const saved = await prisma.studentPaymentMethods.findFirst({
          where: { profile_id: studentId },
          orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
          select: { id: true },
        });
        pmId = saved?.id;
        if (!pmId) {
          const pms = await stripe!.paymentMethods.list({ customer: cid, type: "card" });
          pmId = pms.data[0]?.id;
        }
      }
      if (!cid || !pmId) {
        return NextResponse.json({ needsCard: true }, { status: 402 });
      }

      // Create the session first so the hold can reference it, then authorize.
      const { data: session, error } = await supabase
        .from("Sessions")
        .insert({ ...baseRow, status: "awaiting_payment" })
        .select()
        .single();
      if (error || !session) {
        return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
      }

      try {
        const charge = computeCharge(Number(amount));
        const pi = await stripe!.paymentIntents.create({
          amount: charge.amountCents,
          currency: "cad",
          customer: cid,
          payment_method: pmId,
          off_session: true,
          confirm: true,
          capture_method: "manual",
          application_fee_amount: charge.applicationFeeCents,
          transfer_data: { destination: tutor.stripe_account_id! },
          metadata: { session_id: session.id, tutor_id: tutorId, student_id: studentId, kind: "instant_hold" },
        });
        if (pi.status !== "requires_capture") {
          await supabase.from("Sessions").update({ status: "cancelled" }).eq("id", session.id);
          return NextResponse.json({ error: "card_not_authorized", needsCard: true }, { status: 402 });
        }
        // Hold placed → ring the tutor.
        await supabase
          .from("Sessions")
          .update({ status: "pending", payment_intent_id: pi.id })
          .eq("id", session.id);
        await notifyTutor(session.id);
        return NextResponse.json({ success: true, sessionId: session.id, status: "pending", held: true });
      } catch (e: any) {
        await supabase.from("Sessions").update({ status: "cancelled" }).eq("id", session.id);
        const needsCard = e?.code === "authentication_required" || e?.code === "card_declined";
        return NextResponse.json(
          { error: needsCard ? "card_not_authorized" : "Could not authorize your card", needsCard: true },
          { status: 402 }
        );
      }
    }

    // Fallback: platform can't charge yet → original no-upfront-pay instant flow.
    const { data: session, error } = await supabase
      .from("Sessions")
      .insert({ ...baseRow, status: "pending" })
      .select()
      .single();
    if (error || !session) {
      return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
    }
    await notifyTutor(session.id);
    return NextResponse.json({ success: true, sessionId: session.id, status: "pending", held: false });
  } catch (err) {
    console.error("[instant-authorize] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
