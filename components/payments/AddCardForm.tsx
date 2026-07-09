"use client";

import React, { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

/**
 * Save-a-card form shared by Settings, onboarding and anywhere else a student
 * sets up their payment method. Fetches its own SetupIntent, confirms it
 * (including any 3-D Secure challenge, inline), then persists the resulting
 * PaymentMethod via /api/stripe/payment-method so the card shows up as
 * "Visa •••• 4242" everywhere without a Stripe round-trip.
 */
export default function AddCardForm({
  onSaved,
  onCancel,
  submitLabel = "Save card",
}: {
  onSaved: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stripe/setup-intent", { method: "POST" });
        const data = await res.json();
        if (!res.ok || !data.clientSecret) {
          throw new Error(data.error || "Payments are not available right now.");
        }
        if (!cancelled) setClientSecret(data.clientSecret);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Payments are not available right now.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stripePromise) {
    return <p className="text-sm text-slate-500">Payments are not configured.</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!clientSecret) {
    return (
      <div className="flex h-20 items-center gap-2 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Preparing secure form…</span>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: "stripe", variables: { borderRadius: "12px" } } }}
    >
      <InnerCardForm onSaved={onSaved} onCancel={onCancel} submitLabel={submitLabel} />
    </Elements>
  );
}

function InnerCardForm({
  onSaved,
  onCancel,
  submitLabel,
}: {
  onSaved: () => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    setErr(null);
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });
      if (error) {
        setErr(error.message || "Could not save card");
        return;
      }
      if (setupIntent?.status !== "succeeded" || !setupIntent.payment_method) {
        setErr(
          "Your bank didn't finish verifying the card. Please try again, or use a different card."
        );
        return;
      }
      const pmId =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method.id;
      const res = await fetch("/api/stripe/payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || "Card verified but could not be saved. Please try again.");
        return;
      }
      onSaved();
    } catch (e) {
      console.error("[AddCardForm] error:", e);
      setErr("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !stripe}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-60"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
