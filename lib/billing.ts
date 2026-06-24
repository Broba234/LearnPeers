/**
 * Single source of truth for LearnPeers marketplace economics.
 *
 * A session has a tutor-set base `amount` (in dollars). The booking is a Stripe
 * destination charge with an application fee. On top of the base price:
 *   - the student is charged a 5% service fee (STUDENT_FEE_PERCENT)
 *   - the tutor's payout is reduced by 5% (the rest of PLATFORM_FEE_PERCENT)
 * so the platform's take is PLATFORM_FEE_PERCENT (10%) of the base price, with
 * ~half sourced from the student markup and ~half from the reduced tutor payout.
 *
 * Stripe's per-transaction processing fee (STRIPE_PERCENT_FEE + STRIPE_FIXED_FEE)
 * is *surcharged*: it is passed straight through to the two parties, split 50/50,
 * rather than absorbed by the platform. Concretely:
 *   - the student is charged an extra  stripeFee / 2  on top of their total
 *   - the tutor's payout is reduced by  stripeFee / 2
 *   - the application fee is grossed up by the full stripeFee, so once Stripe
 *     deducts its fee the platform still nets exactly PLATFORM_FEE_PERCENT of base
 *
 * Because the surcharge only adds half the fee to the charged amount, the final
 * amount is grossed up so that Stripe's fee (which it computes on the full
 * charged amount) is still fully covered — see computeCharge().
 *
 * Use computeCharge() for anything that touches real money or is shown to a user;
 * the percentage helpers below are kept for aggregate BI where the fixed-fee
 * component is second-order.
 *
 * NOTE: figures from the percentage helpers are *gross* of refunds and disputes.
 * For actual cash kept, use the Stripe reconciliation layer
 * (lib/stripe-financials.ts). Keep these constants in sync with the Stripe
 * PaymentIntent creation route.
 */
export const STUDENT_FEE_PERCENT = 0.05;
export const PLATFORM_FEE_PERCENT = 0.1;

/**
 * Stripe Canadian domestic card processing pricing (2.9% + C$0.30). All charges
 * are in CAD for Canadian cards. Surcharged and split 50/50 between the student
 * and the tutor so the platform's take is net of processing cost. (International
 * cards cost Stripe more; revisit if/when we accept them.)
 */
export const STRIPE_PERCENT_FEE = 0.029;
export const STRIPE_FIXED_FEE = 0.3;

/** Gross marketplace value: the total the student is charged for a base amount. */
export function gmv(amount: number): number {
  return amount * (1 + STUDENT_FEE_PERCENT);
}

/** What the tutor receives after the platform's application fee. */
export function tutorPayout(amount: number): number {
  return amount * (1 + STUDENT_FEE_PERCENT - PLATFORM_FEE_PERCENT);
}

/** Platform gross revenue (the application fee) for a base amount. */
export function platformRevenue(amount: number): number {
  return amount * PLATFORM_FEE_PERCENT;
}

/** Take rate as a share of GMV (≈ 9.5% with the defaults above). */
export const TAKE_RATE_OF_GMV = PLATFORM_FEE_PERCENT / (1 + STUDENT_FEE_PERCENT);

/** Exact, cent-accurate breakdown of a single booking's money flow. */
export interface ChargeBreakdown {
  /** Tutor-set session price. */
  base: number;
  /** 5% service fee charged to the student on top of the base price. */
  serviceFee: number;
  /** Estimated total Stripe processing fee, surcharged to the two parties. */
  stripeFee: number;
  /** Student's half of the Stripe fee, added on top of their charge. */
  studentStripeShare: number;
  /** Tutor's half of the Stripe fee, deducted from their payout. */
  tutorStripeShare: number;
  /** Total amount charged to the student's card. */
  studentTotal: number;
  /** Amount transferred to the tutor's connected account. */
  tutorPayout: number;
  /** Platform application fee taken from the charge (includes the full Stripe fee). */
  applicationFee: number;
  /** Platform take after Stripe deducts its fee — equals base * PLATFORM_FEE_PERCENT. */
  platformNet: number;
  /** Integer cents for the Stripe PaymentIntent `amount`. */
  amountCents: number;
  /** Integer cents for the Stripe PaymentIntent `application_fee_amount`. */
  applicationFeeCents: number;
}

/**
 * Compute the full money breakdown for a booking of `base` dollars, with Stripe
 * processing fees surcharged and split 50/50 between the student and the tutor.
 *
 * All arithmetic is in integer cents so the displayed numbers match exactly what
 * Stripe charges and transfers. The two Stripe shares always sum to the full
 * estimated fee, so the platform recoups it in full and nets PLATFORM_FEE_PERCENT
 * of the base price.
 */
export function computeCharge(base: number): ChargeBreakdown {
  const baseCents = Math.round(base * 100);
  const serviceFeeCents = Math.round(baseCents * STUDENT_FEE_PERCENT);
  const platformTakeCents = Math.round(baseCents * PLATFORM_FEE_PERCENT);
  const fixedFeeCents = Math.round(STRIPE_FIXED_FEE * 100);

  // Amount charged before the Stripe surcharge: base price + the service fee.
  const preFeeCents = baseCents + serviceFeeCents;

  // Only half the Stripe fee is added to the student's side, yet Stripe charges
  // its fee on the full amount. Gross up so the final amount still covers it:
  //   A = preFee + (p·A + c)/2   ⇒   A = (preFee + c/2) / (1 − p/2)
  const amountCents = Math.round(
    (preFeeCents + fixedFeeCents / 2) / (1 - STRIPE_PERCENT_FEE / 2)
  );

  // Stripe's fee on the amount we actually charge.
  const stripeFeeCents = Math.round(STRIPE_PERCENT_FEE * amountCents + fixedFeeCents);

  // The student's share is whatever we added on top of the pre-fee amount; the
  // tutor covers the remainder so the two shares sum to the full Stripe fee.
  const studentStripeShareCents = amountCents - preFeeCents;
  const tutorStripeShareCents = stripeFeeCents - studentStripeShareCents;

  const tutorPayoutCents =
    baseCents + serviceFeeCents - platformTakeCents - tutorStripeShareCents;
  const applicationFeeCents = amountCents - tutorPayoutCents;

  return {
    base: baseCents / 100,
    serviceFee: serviceFeeCents / 100,
    stripeFee: stripeFeeCents / 100,
    studentStripeShare: studentStripeShareCents / 100,
    tutorStripeShare: tutorStripeShareCents / 100,
    studentTotal: amountCents / 100,
    tutorPayout: tutorPayoutCents / 100,
    applicationFee: applicationFeeCents / 100,
    platformNet: platformTakeCents / 100,
    amountCents,
    applicationFeeCents,
  };
}

/** Surcharge-aware tutor payout (base economics minus the tutor's Stripe share). */
export function tutorNet(base: number): number {
  return computeCharge(base).tutorPayout;
}
