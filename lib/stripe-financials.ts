import "server-only";
import { unstable_cache } from "next/cache";
import { stripe } from "@/lib/stripe";
import { CACHE_TTL_SECONDS, type Range } from "@/lib/analytics";

/**
 * Reconciled financials straight from the Stripe ledger — the source of truth
 * for money actually moved, as opposed to the booking-derived figures in
 * lib/analytics.ts.
 *
 * Bookings are destination charges on the platform account, so the platform's
 * balance transactions contain: `charge` (full student payment + Stripe fee),
 * `transfer` (to the tutor's connected account), `refund`, dispute
 * `adjustment`s, and `payout` (to the platform bank). Net platform revenue is
 * the sum of every balance-transaction `net` except payouts (which just move
 * already-earned money to the bank).
 *
 * Amounts from Stripe are in cents; everything returned here is in dollars.
 */

const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90, "12mo": 365 };

// Safety cap so a huge ledger can never hang a page load.
const MAX_TXNS = 5000;

export interface StripeFinancials {
  configured: boolean;
  error?: string;
  range: Range;
  grossVolume: number; // student payments processed (charges)
  netRevenue: number; // platform kept, net of Stripe fees / refunds / disputes
  stripeFees: number;
  refunds: number;
  refundCount: number;
  disputes: number; // disputed amount in the window
  disputeCount: number;
  tutorTransfers: number; // sent to tutor connected accounts
  payoutsPaid: number; // moved to the platform bank in the window
  txnCount: number;
  balanceAvailable: number; // current, not window-bound
  balancePending: number; // current, not window-bound
  recentPayouts: { amount: number; status: string; arrival: string | null }[];
}

function empty(range: Range, patch: Partial<StripeFinancials> = {}): StripeFinancials {
  return {
    configured: false,
    range,
    grossVolume: 0,
    netRevenue: 0,
    stripeFees: 0,
    refunds: 0,
    refundCount: 0,
    disputes: 0,
    disputeCount: 0,
    tutorTransfers: 0,
    payoutsPaid: 0,
    txnCount: 0,
    balanceAvailable: 0,
    balancePending: 0,
    recentPayouts: [],
    ...patch,
  };
}

async function _stripeFinancials(range: Range): Promise<StripeFinancials> {
  if (!stripe) return empty(range);

  const gte = Math.floor((Date.now() - RANGE_DAYS[range] * 86400_000) / 1000);

  try {
    let grossVolume = 0;
    let stripeFees = 0;
    let refunds = 0;
    let refundCount = 0;
    let tutorTransfers = 0;
    let payoutsPaid = 0;
    let netRevenue = 0;
    let txnCount = 0;

    for await (const tx of stripe.balanceTransactions.list({ created: { gte }, limit: 100 })) {
      txnCount++;
      const amt = tx.amount / 100;
      const fee = tx.fee / 100;
      const net = tx.net / 100;

      switch (tx.type) {
        case "charge":
        case "payment":
          grossVolume += amt;
          stripeFees += fee;
          break;
        case "refund":
        case "payment_refund":
          refunds += -amt; // amount is negative for refunds
          refundCount++;
          break;
        case "transfer":
        case "payment_failure_refund":
          if (tx.type === "transfer") tutorTransfers += -amt;
          break;
        case "payout":
        case "payout_cancel":
        case "payout_failure":
          payoutsPaid += -amt; // outgoing payout amounts are negative
          break;
      }

      // Net revenue = everything the platform earned and keeps, excluding the
      // mechanical movement of funds to the bank.
      if (tx.type !== "payout" && tx.type !== "payout_cancel" && tx.type !== "payout_failure") {
        netRevenue += net;
      }

      if (txnCount >= MAX_TXNS) break;
    }

    // Disputes in the window (also reflected in balance-txn nets; surfaced
    // separately for visibility).
    let disputes = 0;
    let disputeCount = 0;
    try {
      for await (const d of stripe.disputes.list({ created: { gte }, limit: 100 })) {
        disputes += d.amount / 100;
        disputeCount++;
        if (disputeCount >= 500) break;
      }
    } catch {
      // disputes are non-critical; ignore
    }

    // Current balance + recent payouts (point-in-time, not window-bound).
    let balanceAvailable = 0;
    let balancePending = 0;
    const recentPayouts: StripeFinancials["recentPayouts"] = [];
    try {
      const balance = await stripe.balance.retrieve();
      balanceAvailable = balance.available.reduce((s, b) => s + b.amount, 0) / 100;
      balancePending = balance.pending.reduce((s, b) => s + b.amount, 0) / 100;
      const payouts = await stripe.payouts.list({ limit: 5 });
      for (const p of payouts.data) {
        recentPayouts.push({
          amount: p.amount / 100,
          status: p.status,
          arrival: p.arrival_date ? new Date(p.arrival_date * 1000).toISOString().slice(0, 10) : null,
        });
      }
    } catch {
      // balance/payouts are non-critical
    }

    return {
      configured: true,
      range,
      grossVolume,
      netRevenue,
      stripeFees,
      refunds,
      refundCount,
      disputes,
      disputeCount,
      tutorTransfers,
      payoutsPaid,
      txnCount,
      balanceAvailable,
      balancePending,
      recentPayouts,
    };
  } catch (err: any) {
    return empty(range, { configured: true, error: err?.message ?? "Stripe request failed" });
  }
}

export const getStripeFinancials = unstable_cache(
  (range: Range) => _stripeFinancials(range),
  ["stripe-financials"],
  { revalidate: CACHE_TTL_SECONDS }
);
