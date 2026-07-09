import { stripe } from "@/lib/stripe";
import { getAuthedUser } from "@/lib/api-auth";
import { getOrCreateStripeCustomer } from "@/lib/payment-methods";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Start saving a card on file for the student (set-and-forget payments and
 * the gas-station hold both charge against it later). Creates/loads their
 * Stripe Customer and returns a SetupIntent client secret for Stripe Elements.
 * After the client confirms the SetupIntent, it POSTs the resulting
 * PaymentMethod id to /api/stripe/payment-method to persist the display info.
 */
export async function POST() {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const customerId = await getOrCreateStripeCustomer(stripe, user.id, user.email);

    const si = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
    });

    return NextResponse.json({ clientSecret: si.client_secret });
  } catch (e) {
    console.error("[setup-intent] error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
