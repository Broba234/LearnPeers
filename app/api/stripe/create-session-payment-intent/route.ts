import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { notifySessionCreated } from "@/lib/notifications";
import { computeCharge } from "@/lib/billing";
import { getOrCreateStripeCustomer } from "@/lib/payment-methods";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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

/**
 * Can we actually collect a payment for this tutor right now? Requires Stripe
 * configured AND the tutor onboarded with an active transfers capability.
 */
async function tutorCanCharge(stripeAccountId: string | null | undefined): Promise<boolean> {
  if (!stripe || !stripeAccountId) return false;
  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);
    return account.capabilities?.transfers === "active";
  } catch {
    return false;
  }
}

/**
 * Preflight for the booking modal: is this tutor payable? Lets the client show
 * the right step-2 (card entry / saved-card one-tap) — or skip payment UI
 * entirely — before anything is created. Advisory only; POST re-checks.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const tutorId = request.nextUrl.searchParams.get("tutorId");
    if (!tutorId) {
      return NextResponse.json({ error: "tutorId is required" }, { status: 400 });
    }
    const tutorProfile = await prisma.profiles.findUnique({
      where: { id: tutorId },
      select: { stripe_account_id: true },
    });
    const canCharge = await tutorCanCharge(tutorProfile?.stripe_account_id);
    return NextResponse.json({ canCharge });
  } catch (error) {
    console.error("[create-session-payment-intent GET] Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * Book a session. Payment comes FIRST: when the tutor is payable, the session
 * is created as an `awaiting_payment` draft that is invisible to the tutor and
 * triggers no notification — the tutor only learns about the request once the
 * charge succeeds (see lib/session-payment.ts). Three payment shapes:
 *
 *  - paymentMethodId set → one-tap saved card: create AND confirm the
 *    destination-charge PaymentIntent server-side (on-session, so a 3-D Secure
 *    challenge comes back as `requires_action` for the client to present).
 *  - otherwise → new card: create an unconfirmed PaymentIntent for the
 *    PaymentElement; with saveCard the card is attached to the student's
 *    Stripe Customer for future one-tap bookings (setup_future_usage).
 *  - tutor not payable → graceful fallback identical to the old flow: the
 *    booking is created `pending` and the tutor IS notified immediately,
 *    because no payment will ever be collected for it.
 */
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
      paymentMethodId,
      saveCard,
      mode,
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

    const tutorProfile = await prisma.profiles.findUnique({
      where: { id: tutorId },
      select: { stripe_account_id: true, name: true },
    });
    const canCharge = await tutorCanCharge(tutorProfile?.stripe_account_id);

    const supabase = createSupabaseAdminClient();
    const sessionRow = {
      tutor_id: tutorId,
      student_id: studentId,
      subject_id: subjectId || null,
      start_time: start_time || null,
      duration: duration ?? null,
      topic: topic || null,
      notes: notes || null,
      date: date || new Date().toISOString().split('T')[0],
      amount: Number(amount),
    };

    // Payments aren't collectable (Stripe not wired / tutor not onboarded) —
    // book without payment so the flow stays usable end-to-end. This is the
    // ONE path where the tutor is notified without a charge: there isn't one.
    if (!canCharge) {
      const { data: session, error: sessionError } = await supabase
        .from("Sessions")
        .insert({ ...sessionRow, status: "pending" })
        .select()
        .single();
      if (sessionError) {
        console.error("[create-session-payment-intent] Session error:", sessionError);
        return NextResponse.json(
          { error: "Failed to create session", details: sessionError.message },
          { status: 500 }
        );
      }

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

      return NextResponse.json({
        skipPayment: true,
        sessionId: session.id,
        amount: Number(amount),
        reason: !stripe ? "payments_not_configured" : "tutor_not_onboarded",
      });
    }

    // The client believed this tutor wasn't payable (stale preflight) but they
    // are — tell it to run the real payment flow instead of booking for free.
    if (mode === "no_payment") {
      return NextResponse.json({ requiresPayment: true }, { status: 409 });
    }

    // Saved-card path: the card must be one the student saved (server-side
    // ownership check against our table — never trust a bare pm_… id).
    let savedCard: { id: string } | null = null;
    let customerId: string | null = null;
    if (paymentMethodId) {
      if (typeof paymentMethodId !== "string" || !/^pm_[A-Za-z0-9]+$/.test(paymentMethodId)) {
        return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
      }
      savedCard = await prisma.studentPaymentMethods.findFirst({
        where: { id: paymentMethodId, profile_id: studentId },
        select: { id: true },
      });
      const profile = await prisma.profiles.findUnique({
        where: { id: studentId },
        select: { stripe_customer_id: true },
      });
      customerId = profile?.stripe_customer_id ?? null;
      if (!savedCard || !customerId) {
        return NextResponse.json(
          { error: "That saved card is no longer available. Please add a card and try again.", cardGone: true },
          { status: 400 }
        );
      }
    } else if (saveCard) {
      // New card the student wants to keep: attach it to their Customer.
      customerId = await getOrCreateStripeCustomer(stripe!, studentId, user.email);
    }

    // Draft booking: invisible to the tutor (listing routes exclude
    // awaiting_payment) and un-notified until the payment succeeds.
    const { data: session, error: sessionError } = await supabase
      .from("Sessions")
      .insert({ ...sessionRow, status: "awaiting_payment" })
      .select()
      .single();
    if (sessionError) {
      console.error("[create-session-payment-intent] Session error:", sessionError);
      return NextResponse.json(
        { error: "Failed to create session", details: sessionError.message },
        { status: 500 }
      );
    }

    // Student pays base + 5% service fee + half the Stripe processing fee;
    // the tutor's payout is reduced by 5% + the other half of the Stripe fee.
    // The application fee is grossed up by the full Stripe fee so the platform
    // still nets exactly 10% of base once Stripe takes its cut. See lib/billing.
    const charge = computeCharge(Number(amount));
    const intentBase: Stripe.PaymentIntentCreateParams = {
      amount: charge.amountCents,
      currency: "cad",
      // Cards only (incl. Apple/Google Pay): matches the card-mode
      // PaymentElement and lets the saved-card path confirm without a
      // return_url — 3-D Secure surfaces inline via next_action instead.
      payment_method_types: ["card"],
      application_fee_amount: charge.applicationFeeCents,
      transfer_data: {
        destination: tutorProfile!.stripe_account_id!,
      },
      metadata: {
        session_id: session.id,
        tutor_id: tutorId,
        student_id: studentId,
      },
    };

    if (savedCard && customerId) {
      // One tap: confirm immediately, on-session (the student is present, so
      // the bank can demand 3-D Secure and we can show it inline).
      try {
        const paymentIntent = await stripe!.paymentIntents.create({
          ...intentBase,
          customer: customerId,
          payment_method: savedCard.id,
          confirm: true,
        });
        return NextResponse.json({
          sessionId: session.id,
          breakdown: charge,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          clientSecret: paymentIntent.client_secret,
        });
      } catch (err) {
        // Hard decline → retire the draft so it can't linger half-charged.
        await supabase
          .from("Sessions")
          .update({ status: "cancelled" })
          .eq("id", session.id)
          .eq("status", "awaiting_payment");
        if (err instanceof Stripe.errors.StripeCardError) {
          return NextResponse.json(
            { error: err.message || "Your card was declined.", declined: true },
            { status: 402 }
          );
        }
        throw err;
      }
    }

    // New-card path: the PaymentElement confirms this client-side.
    const paymentIntent = await stripe!.paymentIntents.create({
      ...intentBase,
      ...(customerId
        ? { customer: customerId, setup_future_usage: "off_session" as const }
        : {}),
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      sessionId: session.id,
      breakdown: charge,
    });
  } catch (error) {
    console.error("[create-session-payment-intent] Error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
