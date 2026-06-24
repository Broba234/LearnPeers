/**
 * Single source of truth for LearnPeers marketplace economics.
 *
 * A session has a tutor-set base `amount` (in dollars). On top of that:
 *   - the student pays an extra STUDENT_FEE_PERCENT (convenience fee)
 *   - the platform collects PLATFORM_FEE_PERCENT from the tutor side as a
 *     Stripe application fee.
 *
 * So for a base `amount`:
 *   GMV (what the student is charged) = amount * (1 + STUDENT_FEE_PERCENT)
 *   tutor payout                      = amount * (1 - PLATFORM_FEE_PERCENT)
 *   platform net revenue              = amount * (STUDENT_FEE_PERCENT + PLATFORM_FEE_PERCENT)
 *
 * Keep these in sync with the Stripe PaymentIntent creation route.
 */
export const STUDENT_FEE_PERCENT = 0.05;
export const PLATFORM_FEE_PERCENT = 0.1;

/** Gross marketplace value: the total the student is charged for a base amount. */
export function gmv(amount: number): number {
  return amount * (1 + STUDENT_FEE_PERCENT);
}

/** What the tutor receives after the platform fee. */
export function tutorPayout(amount: number): number {
  return amount * (1 - PLATFORM_FEE_PERCENT);
}

/** Platform net revenue (student fee + platform fee) for a base amount. */
export function platformRevenue(amount: number): number {
  return amount * (STUDENT_FEE_PERCENT + PLATFORM_FEE_PERCENT);
}

/** Take rate as a share of GMV (≈ 14.3% with the defaults above). */
export const TAKE_RATE_OF_GMV =
  (STUDENT_FEE_PERCENT + PLATFORM_FEE_PERCENT) / (1 + STUDENT_FEE_PERCENT);
