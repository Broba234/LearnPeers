import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Creates a one-time login link for the user's Stripe Express account.
 * Lets them access the Express Dashboard to complete onboarding, update bank details, view payouts, etc.
 */
export async function POST() {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const profile = await prisma.profiles.findUnique({
      where: { email: user.email },
      select: { stripe_account_id: true },
    });

    if (!profile?.stripe_account_id) {
      return NextResponse.json(
        { error: "No Stripe account connected" },
        { status: 400 }
      );
    }

    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    // If onboarding not complete, use account link instead of login link
    if (!account.details_submitted) {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      const accountLink = await stripe.accountLinks.create({
        account: profile.stripe_account_id,
        refresh_url: `${baseUrl}/api/stripe/connect/refresh`,
        return_url: `${baseUrl}/api/stripe/connect/return`,
        type: "account_onboarding",
      });
      return NextResponse.json({ url: accountLink.url });
    }

    const loginLink = await stripe.accounts.createLoginLink(
      profile.stripe_account_id
    );

    return NextResponse.json({ url: loginLink.url });
  } catch (error) {
    console.error("[Stripe Connect] login-link error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
