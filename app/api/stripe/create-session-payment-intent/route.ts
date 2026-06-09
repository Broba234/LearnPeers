import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// 5% from student (charged on top) + 5% from tutor (deducted from payout) = 10% gross
const STUDENT_FEE_PERCENT = 0.05;
const PLATFORM_FEE_PERCENT = 0.10;

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      tutorId,
      studentId,
      amount,
      start_time,
      duration,
      topic,
      notes,
      date,
      subjectId,
    } = body;

    if (!tutorId || !studentId || amount == null || amount <= 0) {
      return NextResponse.json(
        { error: "Missing required fields: tutorId, studentId, amount" },
        { status: 400 }
      );
    }

    // Get tutor's Stripe Connect account
    const tutorProfile = await prisma.profiles.findUnique({
      where: { id: tutorId },
      select: { stripe_account_id: true, name: true },
    });

    if (!tutorProfile?.stripe_account_id) {
      return NextResponse.json(
        {
          error:
            "This tutor has not connected their Stripe account yet. They cannot accept payments.",
        },
        { status: 400 }
      );
    }

    // Verify tutor's Stripe account can receive transfers (transfers capability must be active)
    const account = await stripe.accounts.retrieve(tutorProfile.stripe_account_id);
    const transfersCap = account.capabilities?.transfers;
    if (transfersCap !== "active") {
      return NextResponse.json(
        {
          error:
            "This tutor's Stripe account is not fully set up to receive payments. They need to complete their Stripe Connect onboarding.",
          details:
            transfersCap === "pending"
              ? "Stripe is still reviewing their account."
              : "The transfers capability is not enabled.",
        },
        { status: 400 }
      );
    }

    // Create session in Supabase (status: pending)
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

    // Student pays session price + 5% fee on top; tutor nets 95% of base price
    const baseCents = Math.round(Number(amount) * 100);
    const amountCents = Math.round(baseCents * (1 + STUDENT_FEE_PERCENT));
    const applicationFeeCents = Math.round(baseCents * PLATFORM_FEE_PERCENT);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      application_fee_amount: applicationFeeCents,
      transfer_data: {
        destination: tutorProfile.stripe_account_id,
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
