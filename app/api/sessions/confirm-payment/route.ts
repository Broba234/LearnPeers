import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { getAuthedUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Marks a pending session accepted — but ONLY after verifying a real succeeded
 * payment exists for it. This is a UX accelerator; the Stripe webhook
 * (signature-verified) is the source of truth and does the same transition.
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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
    if (session.status !== "pending") {
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

    const { data, error } = await supabase
      .from("Sessions")
      .update({ status: "accepted" })
      .eq("id", sessionId)
      .eq("status", "pending")
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to confirm session", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, session: data });
  } catch (err) {
    console.error("[confirm-payment] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
