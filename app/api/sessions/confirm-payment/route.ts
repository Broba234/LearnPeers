import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { stripe } from "@/lib/stripe";
import { getAuthedUser } from "@/lib/api-auth";
import { finalizePaidSession } from "@/lib/session-payment";
import { syncSavedPaymentMethodFromIntent } from "@/lib/payment-methods";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Marks an awaiting_payment (draft) session accepted — but ONLY after verifying
 * a real succeeded payment exists for it. This is a UX accelerator; the Stripe
 * webhook (signature-verified) is the source of truth and does the same
 * transition. Notifying the tutor happens inside finalizePaidSession, gated on
 * winning the status flip, so webhook + client can't double-notify.
 *
 * Hardened: requires auth, the caller must be the session's student, and a
 * succeeded PaymentIntent for this session must exist. Without these checks
 * anyone could flip a session to "accepted" without paying.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { sessionId, paymentIntentId } = await request.json();
    if (!sessionId || !UUID_RE.test(sessionId)) {
      return NextResponse.json({ error: "Valid sessionId is required" }, { status: 400 });
    }
    if (typeof paymentIntentId !== "string" || !/^pi_[A-Za-z0-9_]+$/.test(paymentIntentId)) {
      return NextResponse.json({ error: "Valid paymentIntentId is required" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: session } = await supabase
      .from("Sessions")
      .select("id, status, student_id")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.student_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (!["awaiting_payment", "pending"].includes(session.status)) {
      // Already handled (e.g. by the webhook) — treat as success, idempotent.
      return NextResponse.json({ success: true, status: session.status });
    }

    // Verify a real payment succeeded before accepting. Retrieve the specific
    // PaymentIntent by id (instant, no search-index lag). It's unforgeable: the
    // PI's metadata.session_id is set server-side at creation, so it must match
    // this session — and we already verified the session belongs to the caller.
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (
      !pi ||
      pi.status !== "succeeded" ||
      pi.metadata?.session_id !== sessionId
    ) {
      return NextResponse.json(
        { error: "Payment not confirmed for this session" },
        { status: 402 }
      );
    }

    await finalizePaidSession(supabase, pi);
    // If the student asked to keep this card, mirror it for one-tap next time.
    await syncSavedPaymentMethodFromIntent(stripe, pi);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[confirm-payment] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
