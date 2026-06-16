import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email parameter is required" }),
        { status: 400 }
      );
    }

    const profile = await prisma.profiles.findUnique({
      where: { email },
      select: { stripe_account_id: true },
    });

    const accountId = profile?.stripe_account_id ?? null;
    const connected = Boolean(accountId);

    // Determine real onboarding completeness by inspecting the Stripe account.
    let onboardingComplete = false;
    if (connected && stripe && accountId) {
      try {
        const account = await stripe.accounts.retrieve(accountId);
        onboardingComplete =
          account.capabilities?.transfers === "active" &&
          Boolean(account.details_submitted) &&
          Boolean(account.payouts_enabled);
      } catch (e) {
        console.error("[Stripe Connect] status retrieve error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        connected,
        onboardingComplete,
        stripe_account_id: accountId,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[Stripe Connect] status error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
