import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Connect status (incl. stripe_account_id) is the caller's own — identity
    // from the session, never a client-supplied email.
    const { user, res } = await requireUser();
    if (res) return res;

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { stripe_account_id: true },
    });

    const accountId = profile?.stripe_account_id ?? null;
    const connected = Boolean(accountId);

    // Inspect the Stripe account to derive three distinct states. We surface
    // "submitted but still verifying" separately so the UI can stop showing
    // the bare "Connect" screen to a tutor who just finished verification —
    // otherwise it looks like nothing happened and they re-submit in a loop.
    let onboardingComplete = false;
    let detailsSubmitted = false;
    let needsAction = false;
    if (connected && stripe && accountId) {
      try {
        const account = await stripe.accounts.retrieve(accountId);
        detailsSubmitted = Boolean(account.details_submitted);
        onboardingComplete =
          account.capabilities?.transfers === "active" &&
          detailsSubmitted &&
          Boolean(account.payouts_enabled);

        // Details are in but Stripe still wants something from the tutor (a
        // bank account, an extra document) — distinct from passively verifying.
        const req = account.requirements;
        const due =
          (req?.currently_due?.length ?? 0) + (req?.past_due?.length ?? 0);
        needsAction = detailsSubmitted && !onboardingComplete && due > 0;
      } catch (e) {
        console.error("[Stripe Connect] status retrieve error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        connected,
        onboardingComplete,
        // True once the tutor has submitted everything, even if Stripe is still
        // verifying (payouts not yet enabled). Drives the "verifying" state.
        detailsSubmitted,
        // True when Stripe needs more from the tutor to finish (resume needed).
        needsAction,
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
