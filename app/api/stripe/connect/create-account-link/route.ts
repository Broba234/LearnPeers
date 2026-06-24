import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

/** Detect country from request headers or IP geolocation. Returns ISO 3166-1 alpha-2 code. */
async function detectCountry(
  request: NextRequest,
  countryOverride?: string
): Promise<string> {
  // 1. Explicit override from client (e.g. profile, user selection)
  if (typeof countryOverride === "string" && /^[A-Z]{2}$/i.test(countryOverride)) {
    return countryOverride.toUpperCase();
  }

  // 2. Hosting provider headers (no external API call)
  const vercelCountry = request.headers.get("x-vercel-ip-country");
  if (vercelCountry && /^[A-Z]{2}$/.test(vercelCountry)) {
    return vercelCountry;
  }
  const cfCountry = request.headers.get("cf-ipcountry");
  if (cfCountry && cfCountry !== "XX" && /^[A-Z]{2}$/.test(cfCountry)) {
    return cfCountry;
  }

  // 3. IP geolocation fallback
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const clientIp = forwarded?.split(",")[0]?.trim() || undefined;
    const url = clientIp
      ? `https://ipapi.co/${clientIp}/json/`
      : "https://ipapi.co/json/";
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const code = data?.country_code;
      if (typeof code === "string" && /^[A-Z]{2}$/.test(code)) {
        return code;
      }
    }
  } catch {
    // Ignore geolocation errors
  }

  // Canada-native for now: connected accounts must support CAD payouts, so when
  // geolocation is unknown, default to CA rather than US.
  return "CA";
}

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured" }),
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = body?.email;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400 }
      );
    }

    const profile = await prisma.profiles.findUnique({
      where: { email },
    });

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404 }
      );
    }

    let accountId = profile.stripe_account_id;

    if (!accountId) {
      const country = await detectCountry(request, body?.country);
      const account = await stripe.accounts.create({
        type: "express",
        country,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;

    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api/stripe/connect/refresh`,
      return_url: `${baseUrl}/api/stripe/connect/return`,
      type: "account_onboarding",
    });

    await prisma.profiles.update({
      where: { email },
      data: { stripe_account_id: accountId },
    });
    return new Response(
      JSON.stringify({ url: accountLink.url }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[Stripe Connect] create-account-link error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
