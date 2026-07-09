"use client";

import React, { useState } from "react";
import type { Stripe } from "@stripe/stripe-js";
import type { ChargeBreakdown } from "@/lib/billing";
import {
  type SavedCard,
  formatCardLabel,
  formatCardExpiry,
} from "@/components/payments/cardDisplay";

/** Booking endpoint response for a server-confirmed saved-card charge. */
interface SavedCardChargeResponse {
  sessionId?: string;
  paymentIntentId?: string;
  status?: string;
  clientSecret?: string;
  skipPayment?: boolean;
  error?: string;
  cardGone?: boolean;
}

/**
 * One-tap checkout with a saved card: "Pay $X with Visa •••• 4242". A single
 * "Confirm & Pay" creates AND confirms the destination-charge PaymentIntent
 * server-side; if the bank demands 3-D Secure the challenge is presented
 * inline via stripe.handleNextAction, and the booking only completes once it
 * succeeds. "Change" reveals the student's other saved cards and an escape
 * hatch to a new card.
 */
export function SavedCardCheckout({
  cards,
  breakdown,
  tutorName,
  stripePromise,
  createAndConfirm,
  onSuccess,
  onSkipPayment,
  onUseNewCard,
  onBack,
  onProcessingChange,
}: {
  cards: SavedCard[];
  breakdown: ChargeBreakdown;
  tutorName: string;
  stripePromise: Promise<Stripe | null>;
  /** POSTs the booking with the chosen saved card; server confirms the charge. */
  createAndConfirm: (paymentMethodId: string) => Promise<SavedCardChargeResponse>;
  onSuccess: (sessionId: string) => void;
  onSkipPayment: () => void;
  onUseNewCard: () => void;
  onBack: () => void;
  onProcessingChange?: (processing: boolean) => void;
}) {
  const defaultCard = cards.find((c) => c.isDefault) ?? cards[0];
  const [selectedId, setSelectedId] = useState<string>(defaultCard.id);
  const [choosing, setChoosing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = cards.find((c) => c.id === selectedId) ?? defaultCard;

  const setProcessing = (p: boolean) => {
    setLoading(p);
    onProcessingChange?.(p);
  };

  const finalizeOnServer = async (sessionId: string, paymentIntentId: string) => {
    const res = await fetch("/api/sessions/confirm-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, paymentIntentId }),
    });
    if (res.ok) {
      onSuccess(sessionId);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to confirm session");
    }
  };

  const pay = async () => {
    setProcessing(true);
    setError(null);
    try {
      const data = await createAndConfirm(selected.id);
      if (data.error) {
        setError(
          data.cardGone
            ? "That saved card is no longer available — please use a different card."
            : data.error
        );
        return;
      }
      if (data.skipPayment) {
        onSkipPayment();
        return;
      }
      if (!data.sessionId || !data.paymentIntentId) {
        setError("We couldn't start the payment. Please try again.");
        return;
      }

      let status = data.status;

      // The bank wants 3-D Secure: present the challenge inline. The modal is
      // locked (onProcessingChange) for the duration so a stray close can't
      // tear down the authentication mid-flight.
      if (status === "requires_action" && data.clientSecret) {
        const stripe = await stripePromise;
        if (!stripe) {
          setError("Payments are not available right now.");
          return;
        }
        const { error: actionError, paymentIntent } = await stripe.handleNextAction({
          clientSecret: data.clientSecret,
        });
        if (actionError) {
          setError(
            actionError.message ||
              "Your bank didn't finish authenticating the card (3-D Secure). " +
                "Please try again, or use a different card — some prepaid cards can't complete this step."
          );
          return;
        }
        status = paymentIntent?.status;
      }

      switch (status) {
        case "succeeded":
          await finalizeOnServer(data.sessionId, data.paymentIntentId);
          break;
        case "processing":
          // Async settlement — treat as booked; the webhook finalizes.
          onSuccess(data.sessionId);
          break;
        case "requires_action":
        case "requires_payment_method":
          setError(
            "Your bank didn't finish authenticating the card (3-D Secure). " +
              "Please try again, or use a different card — some prepaid cards can't complete this step."
          );
          break;
        default:
          setError(
            `Payment couldn't be completed (status: ${status}). Please try again.`
          );
      }
    } catch (err) {
      console.error("Saved-card payment error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-4 bg-brand-50 rounded-xl space-y-1.5 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Session price</span>
          <span className="text-gray-800">${breakdown.base.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Service fee (5%)</span>
          <span className="text-gray-800">+${breakdown.serviceFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Processing fee (your half)</span>
          <span className="text-gray-800">+${breakdown.studentStripeShare.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center border-t border-brand-200 pt-1.5">
          <span className="font-semibold text-gray-800">Total charged</span>
          <span className="font-bold text-brand-700">${breakdown.studentTotal.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-500 pt-0.5">
          {tutorName} receives ${breakdown.tutorPayout.toFixed(2)} — the 5% service
          fee and the other half of the payment processing fee
          (${breakdown.tutorStripeShare.toFixed(2)}) are deducted from their payout.
        </p>
      </div>

      {/* Payment method summary / picker */}
      {!choosing ? (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
          <div className="text-sm">
            <p className="font-medium text-gray-900">
              Pay ${breakdown.studentTotal.toFixed(2)} with {formatCardLabel(selected)}
            </p>
            <p className="text-xs text-gray-400">Expires {formatCardExpiry(selected)}</p>
          </div>
          <button
            type="button"
            onClick={() => setChoosing(true)}
            disabled={loading}
            className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-2 space-y-1">
          {cards.map((card) => (
            <label
              key={card.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer text-sm ${
                selectedId === card.id ? "bg-brand-50" : "hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="saved-card"
                checked={selectedId === card.id}
                onChange={() => {
                  setSelectedId(card.id);
                  setChoosing(false);
                }}
                className="h-4 w-4 border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="font-medium text-gray-900">{formatCardLabel(card)}</span>
              <span className="text-xs text-gray-400">exp {formatCardExpiry(card)}</span>
              {card.isDefault && (
                <span className="ml-auto rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                  Default
                </span>
              )}
            </label>
          ))}
          <button
            type="button"
            onClick={onUseNewCard}
            disabled={loading}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-brand-600 hover:bg-gray-50 disabled:opacity-50"
          >
            + Use a new card
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={pay}
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Processing…" : "Confirm & Pay"}
        </button>
      </div>
    </div>
  );
}
