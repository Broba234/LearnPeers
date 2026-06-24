/**
 * Single source of truth for LearnPeers marketplace economics.
 *
 * A session has a tutor-set base `amount` (in dollars). The booking is a Stripe
 * destination charge with an application fee:
 *   - the student is charged   base * (1 + STUDENT_FEE_PERCENT)        (1.05x)
 *   - Stripe transfers to tutor base * (1 + STUDENT_FEE_PERCENT) - fee = 0.95x
 *   - the platform keeps        application_fee = base * PLATFORM_FEE_PERCENT (0.10x)
 *
 * So PLATFORM_FEE_PERCENT (10%) is the platform's *total* take of the base
 * price: ~5% is sourced from the student markup and ~5% from a reduced tutor
 * payout. The student fee is NOT additive to platform revenue on top of the
 * application fee — it is the mechanism funding half of it.
 *
 *   GMV (student charge) = amount * (1 + STUDENT_FEE_PERCENT)
 *   tutor payout         = amount * (1 + STUDENT_FEE_PERCENT - PLATFORM_FEE_PERCENT)
 *   platform revenue     = amount * PLATFORM_FEE_PERCENT          (the application fee)
 *
 * NOTE: platform revenue here is *gross* of Stripe processing fees, refunds and
 * disputes. For figures net of those, use the Stripe reconciliation layer
 * (lib/stripe-financials.ts). Keep these constants in sync with the Stripe
 * PaymentIntent creation route.
 */
export const STUDENT_FEE_PERCENT = 0.05;
export const PLATFORM_FEE_PERCENT = 0.1;

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
