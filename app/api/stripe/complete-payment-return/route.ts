import { stripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { payment_intent_id } = await request.json();

    if (!payment_intent_id) {
      return NextResponse.json(
        { error: "payment_intent_id is required" },
        { status: 400 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(
      payment_intent_id
    );

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Payment not completed", status: paymentIntent.status },
        { status: 400 }
      );
    }

    const sessionId = paymentIntent.metadata?.session_id;
    if (!sessionId) {
      return NextResponse.json(
        { error: "Session not found in payment" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { error } = await supabase
      .from("Sessions")
      .update({ status: "accepted" })
      .eq("id", sessionId)
      .eq("status", "pending");

    if (error) {
      return NextResponse.json(
        { error: "Failed to confirm session", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, sessionId });
  } catch (err) {
    console.error("[complete-payment-return] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
