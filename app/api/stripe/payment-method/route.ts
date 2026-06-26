import { stripe } from "@/lib/stripe";
import { getAuthedUser } from "@/lib/api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function customerId() {
  const user = await getAuthedUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const supabase = createSupabaseAdminClient();
  const { data: profile } = await supabase
    .from("Profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();
  return { cid: (profile?.stripe_customer_id as string | undefined) ?? null };
}

/** The student's saved card (for the settings UI), or null. */
export async function GET() {
  try {
    if (!stripe) return NextResponse.json({ card: null });
    const r = await customerId();
    if (r.error) return r.error;
    if (!r.cid) return NextResponse.json({ card: null });
    const pms = await stripe.paymentMethods.list({ customer: r.cid, type: "card" });
    const pm = pms.data[0];
    if (!pm?.card) return NextResponse.json({ card: null });
    return NextResponse.json({
      card: {
        id: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      },
    });
  } catch (e) {
    console.error("[payment-method GET] error:", e);
    return NextResponse.json({ card: null });
  }
}

/** Remove the saved card. */
export async function DELETE() {
  try {
    if (!stripe) return NextResponse.json({ success: true });
    const r = await customerId();
    if (r.error) return r.error;
    if (!r.cid) return NextResponse.json({ success: true });
    const pms = await stripe.paymentMethods.list({ customer: r.cid, type: "card" });
    for (const pm of pms.data) {
      await stripe.paymentMethods.detach(pm.id);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[payment-method DELETE] error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
