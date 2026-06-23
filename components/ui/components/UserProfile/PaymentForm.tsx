"use client";

import React, { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

export function PaymentForm({
  sessionId,
  amount,
  tutorName,
  onSuccess,
  onBack,
}: {
  sessionId: string;
  amount: number;
  tutorName: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      const returnUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}?sessionId=${sessionId}`
          : "";

      const { error: submitError, paymentIntent } =
        await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: returnUrl,
            receipt_email: undefined,
            payment_method_data: {
              billing_details: {
                address: { country: "US" },
              },
            },
          },
          redirect: "if_required",
        });

      if (submitError) {
        setError(submitError.message || "Payment failed");
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        const res = await fetch("/api/sessions/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, paymentIntentId: paymentIntent.id }),
        });
        if (res.ok) {
          onSuccess();
        } else {
          const data = await res.json();
          setError(data.error || "Failed to confirm session");
        }
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="p-4 bg-brand-50 rounded-xl space-y-1.5 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Session price</span>
          <span className="text-gray-800">${amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Platform fee (5%)</span>
          <span className="text-gray-800">+${(amount * 0.05).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center border-t border-brand-200 pt-1.5">
          <span className="font-semibold text-gray-800">Total charged</span>
          <span className="font-bold text-brand-700">${(amount * 1.05).toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-500 pt-0.5">
          {tutorName} receives ${(amount * 0.95).toFixed(2)} (5% platform fee deducted from payout)
        </p>
      </div>

      <div className="min-h-[200px]">
        <PaymentElement options={{ layout: "tabs" }} onReady={() => setElementReady(true)} />
      </div>

      {error && (
        <div className="p-3 bg-red-50 rounded-lg text-red-700 text-sm">
          {error}
        </div>
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
          type="submit"
          disabled={!stripe || !elementReady || loading}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Processing…" : "Pay now"}
        </button>
      </div>
    </form>
  );
}
