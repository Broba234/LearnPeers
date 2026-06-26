// Gas-station card holds for instant sessions: authorize a ceiling up front,
// then at the end either capture (if the session actually ran ~the agreed
// time) or release the hold (no charge). All helpers no-op gracefully if
// Stripe isn't configured, mirroring the rest of the integration.
import { stripe } from "@/lib/stripe";

// A session must run at least this long (and at least half the agreed time)
// before the held amount is captured. Otherwise the hold is released — this is
// the "mechanical" confirm/deny the product wants; disputes are handled later.
const MIN_RAN_MINUTES = 5;

const cancelable = new Set([
  "requires_capture",
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
]);

/** Release a hold without charging (decline / cancel / no-show). Idempotent. */
export async function releaseHold(paymentIntentId?: string | null): Promise<void> {
  if (!stripe || !paymentIntentId) return;
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (cancelable.has(pi.status)) {
      await stripe.paymentIntents.cancel(paymentIntentId);
    }
  } catch (e) {
    console.error("[payments] releaseHold failed:", e instanceof Error ? e.message : e);
  }
}

/**
 * Settle a hold at session end: capture the authorized amount if the session
 * ran long enough, otherwise release it. Idempotent — only acts while the PI
 * is still `requires_capture`, so it's safe if both participants trigger it.
 */
export async function settleHold(opts: {
  paymentIntentId?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  agreedMinutes: number;
}): Promise<"captured" | "released" | "skipped" | "error"> {
  if (!stripe || !opts.paymentIntentId) return "skipped";
  try {
    const pi = await stripe.paymentIntents.retrieve(opts.paymentIntentId);
    if (pi.status !== "requires_capture") return "skipped";

    const start = opts.startedAt ? new Date(opts.startedAt).getTime() : null;
    const end = opts.endedAt ? new Date(opts.endedAt).getTime() : Date.now();
    const elapsedMin = start ? (end - start) / 60000 : 0;
    const threshold = Math.max(MIN_RAN_MINUTES, (opts.agreedMinutes || 0) * 0.5);

    if (elapsedMin >= threshold) {
      await stripe.paymentIntents.capture(opts.paymentIntentId);
      return "captured";
    }
    await stripe.paymentIntents.cancel(opts.paymentIntentId);
    return "released";
  } catch (e) {
    console.error("[payments] settleHold failed:", e instanceof Error ? e.message : e);
    return "error";
  }
}
