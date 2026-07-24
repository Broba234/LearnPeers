import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

/** Detect country from request headers or an explicit override. Returns ISO 3166-1 alpha-2. */
function detectCountry(request: NextRequest, countryOverride?: string): string {
  if (typeof countryOverride === "string" && /^[A-Z]{2}$/i.test(countryOverride)) {
    return countryOverride.toUpperCase();
  }
  const vercelCountry = request.headers.get("x-vercel-ip-country");
  if (vercelCountry && /^[A-Z]{2}$/.test(vercelCountry)) return vercelCountry;
  const cfCountry = request.headers.get("cf-ipcountry");
  if (cfCountry && cfCountry !== "XX" && /^[A-Z]{2}$/.test(cfCountry)) return cfCountry;
  // Canada-native for now: connected accounts must support CAD payouts, so when
  // geolocation is unknown, default to CA rather than US.
  return "CA";
}

/**
 * Returns an Account Session client_secret for embedded Connect onboarding.
 * Creates the tutor's Express account on first call if one doesn't exist yet.
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
    }

    const { user, res } = await requireUser();
    if (res) return res;

    const body = await request.json().catch(() => ({}));

    // Identity comes from the session, never the request body — this binds a
    // Stripe Express account to the CALLER only.
    const profile = await prisma.profiles.findUnique({ where: { id: user.id } });
    if (!profile?.email) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    const email = profile.email;

    let accountId = profile.stripe_account_id;

    if (!accountId) {
      const country = detectCountry(request, body?.country);
      const account = await stripe.accounts.create({
        type: "express",
        country,
        email,
        // Tutors are individuals earning income through the platform. Pre-fill
        // the business details every tutor shares so Stripe skips the
        // industry / website / product-description / business-type screens —
        // they're only ever asked for identity + bank.
        business_type: "individual",
        business_profile: {
          mcc: "8299", // Educational services
          product_description:
            "One-on-one peer tutoring sessions booked through LearnPeers.",
          url: "https://learnpeers.com",
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      await prisma.profiles.update({
        where: { id: user.id },
        data: { stripe_account_id: accountId },
      });
    }

    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: { enabled: true },
      },
    });

    return NextResponse.json({
      clientSecret: accountSession.client_secret,
      accountId,
    });
  } catch (error: unknown) {
    console.error("[Stripe Connect] account-session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
