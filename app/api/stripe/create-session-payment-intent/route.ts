import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";
import { createClient } from "@supabase/supabase-js";
import { notifySessionCreated } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// 5% from student (charged on top) + 5% from tutor (deducted from payout) = 10% gross
const STUDENT_FEE_PERCENT = 0.05;
const PLATFORM_FEE_PERCENT = 0.10;

/** Map a session duration (hours) to the tutor's matching price column. */
function priceForDuration(
  pos: { price_1: number | null; price_2: number | null; price_3: number | null },
  duration: number
): number | null {
  if (duration === 0.5) return pos.price_1;
  if (duration === 1) return pos.price_2;
  if (duration === 1.5) return pos.price_3;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Identity comes from the session cookie, never the request body.
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const studentId = user.id;

    const body = await request.json();
    const {
      tutorId,
      start_time,
      duration,
      topic,
      notes,
      date,
      subjectId,
    } = body;

    const durationNum = Number(duration);
    if (!tutorId || !subjectId || ![0.5, 1, 1.5].includes(durationNum)) {
      return NextResponse.json(
        { error: "Missing/invalid fields: tutorId, subjectId, duration" },
        { status: 400 }
      );
    }

    // Server-side price: look up the tutor's configured price for this subject
    // and duration. NEVER trust a client-supplied amount.
    const pos = await prisma.profilesOnSubjects.findUnique({
      where: { profile_id_subject_id: { profile_id: tutorId, subject_id: subjectId } },
      select: { price_1: true, price_2: true, price_3: true },
    });
    const amount = pos ? priceForDuration(pos, durationNum) : null;
    if (amount == null || !(amount > 0)) {
      return NextResponse.json(
        { error: "This tutor has no price set for the selected subject/duration." },
        { status: 400 }
      );
    }

    // Get tutor's Stripe Connect account
    const tutorProfile = await prisma.profiles.findUnique({
      where: { id: tutorId },
      select: { stripe_account_id: true, name: true },
    });

    // Create the booking up front so it always exists regardless of whether
    // payment can be collected right now.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: session, error: sessionError } = await supabase
      .from("Sessions")
      .insert({
        tutor_id: tutorId,
        student_id: studentId,
        subject_id: subjectId || null,
        start_time: start_time || null,
        duration: duration ?? null,
        topic: topic || null,
        notes: notes || null,
        date: date || new Date().toISOString().split('T')[0],
        amount: Number(amount),
        status: "pending",
      })
      .select()
      .single();

    if (sessionError) {
      console.error("[create-session-payment-intent] Session error:", sessionError);
      return NextResponse.json(
        { error: "Failed to create session", details: sessionError.message },
        { status: 500 }
      );
    }

    // Always let the tutor know a request came in.
    const { data: studentProfile } = await supabase
      .from("Profiles")
      .select("name")
      .eq("id", studentId)
      .single();
    await notifySessionCreated(supabase, {
      tutorId,
      studentId,
      studentName: studentProfile?.name || "A student",
      topic: topic || undefined,
      sessionId: session.id,
    });

    // Can we actually charge right now? Requires Stripe configured AND the tutor
    // onboarded with an active transfers capability. If not, we gracefully fall
    // back to a no-payment booking (payments aren't wired up yet) so the whole
    // flow is usable end-to-end. The real charge path below stays intact for
    // when keys + Connect onboarding are live.
    let canCharge = false;
    if (stripe && tutorProfile?.stripe_account_id) {
      try {
        const account = await stripe.accounts.retrieve(tutorProfile.stripe_account_id);
        canCharge = account.capabilities?.transfers === "active";
      } catch (e) {
        canCharge = false;
      }
    }

    if (!canCharge) {
      return NextResponse.json({
        skipPayment: true,
        sessionId: session.id,
        amount: Number(amount),
        reason: !stripe
          ? "payments_not_configured"
          : "tutor_not_onboarded",
      });
    }

    // Student pays session price + 5% fee on top; tutor nets 95% of base price
    const baseCents = Math.round(Number(amount) * 100);
    const amountCents = Math.round(baseCents * (1 + STUDENT_FEE_PERCENT));
    const applicationFeeCents = Math.round(baseCents * PLATFORM_FEE_PERCENT);

    const paymentIntent = await stripe!.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      application_fee_amount: applicationFeeCents,
      transfer_data: {
        destination: tutorProfile!.stripe_account_id!,
      },
      metadata: {
        session_id: session.id,
        tutor_id: tutorId,
        student_id: studentId,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("[create-session-payment-intent] Error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
