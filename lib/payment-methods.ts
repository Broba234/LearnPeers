import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";

/**
 * Saved-card plumbing for set-and-forget payments.
 *
 * Students get a Stripe Customer (Profiles.stripe_customer_id) lazily the
 * first time they save a card or ask to save one during a booking. Cards are
 * attached to that customer via SetupIntent (usage: off_session) or a
 * PaymentIntent's setup_future_usage, and mirrored into StudentPaymentMethods
 * so the UI can render "Visa •••• 4242" without a Stripe round-trip.
 */

/** The wire shape the card UIs consume. */
export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export function toSavedCard(row: {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}): SavedCard {
  return {
    id: row.id,
    brand: row.brand,
    last4: row.last4,
    expMonth: row.exp_month,
    expYear: row.exp_year,
    isDefault: row.is_default,
  };
}

/** List a student's saved cards, default first, newest next. */
export async function listSavedCards(profileId: string): Promise<SavedCard[]> {
  const rows = await prisma.studentPaymentMethods.findMany({
    where: { profile_id: profileId },
    orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
  });
  return rows.map(toSavedCard);
}

/**
 * The student's Stripe Customer id, creating (and persisting) one lazily on
 * first use. `profileId` must come from getAuthedUser, never the client.
 */
export async function getOrCreateStripeCustomer(
  stripe: Stripe,
  profileId: string,
  email?: string | null
): Promise<string> {
  const profile = await prisma.profiles.findUnique({
    where: { id: profileId },
    select: { stripe_customer_id: true, name: true, email: true },
  });
  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: email || profile?.email || undefined,
    name: profile?.name || undefined,
    metadata: { profile_id: profileId },
  });
  await prisma.profiles.update({
    where: { id: profileId },
    data: { stripe_customer_id: customer.id },
  });
  return customer.id;
}

/**
 * Mirror a Stripe card PaymentMethod into StudentPaymentMethods. Idempotent
 * (upsert by pm id). The student's first card — or an explicit request —
 * becomes the default; setting a default clears the previous one.
 */
export async function upsertSavedPaymentMethod(
  profileId: string,
  pm: Stripe.PaymentMethod,
  opts: { makeDefault?: boolean } = {}
): Promise<SavedCard | null> {
  if (!pm.card) return null;

  const otherDefaults = await prisma.studentPaymentMethods.count({
    where: { profile_id: profileId, is_default: true, NOT: { id: pm.id } },
  });
  const makeDefault = opts.makeDefault || otherDefaults === 0;

  const [, row] = await prisma.$transaction([
    prisma.studentPaymentMethods.updateMany({
      where: makeDefault
        ? { profile_id: profileId, is_default: true }
        : { id: "" }, // no-op when not changing the default
      data: { is_default: false },
    }),
    prisma.studentPaymentMethods.upsert({
      where: { id: pm.id },
      create: {
        id: pm.id,
        profile_id: profileId,
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
        is_default: makeDefault,
      },
      update: {
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
        ...(makeDefault ? { is_default: true } : {}),
      },
    }),
  ]);
  return toSavedCard(row);
}

/**
 * After a booking charge that asked to save the card (the PaymentIntent was
 * created with customer + setup_future_usage), persist the card so the next
 * booking is one tap. Called from both the webhook and the client confirm
 * path — the upsert makes double calls harmless. Never throws: card
 * persistence must not break payment confirmation.
 */
export async function syncSavedPaymentMethodFromIntent(
  stripe: Stripe,
  pi: Stripe.PaymentIntent
): Promise<void> {
  try {
    if (!pi.customer || !pi.payment_method || !pi.setup_future_usage) return;
    const profileId = pi.metadata?.student_id;
    if (!profileId) return;
    const pmId =
      typeof pi.payment_method === "string"
        ? pi.payment_method
        : pi.payment_method.id;
    const pm = await stripe.paymentMethods.retrieve(pmId);
    await upsertSavedPaymentMethod(profileId, pm);
  } catch (e) {
    console.error("[payment-methods] failed to persist saved card:", e);
  }
}
