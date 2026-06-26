import { stripe } from "@/lib/stripe";
import { getAuthedUser } from "@/lib/api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Start saving a card on file for the student (the gas-station model holds
 * against this card later). Creates/loads a Stripe Customer, persists its id on
 * the profile, and returns a SetupIntent client secret for Stripe Elements.
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

    const supabase = createSupabaseAdminClient();
    const { data: profile } = await supabase
      .from("Profiles")
      .select("stripe_customer_id, name")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: profile?.name || undefined,
        metadata: { profile_id: user.id },
      });
      customerId = customer.id;
      await supabase.from("Profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

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
