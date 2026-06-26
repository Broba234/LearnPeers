"use client";

import React, { useCallback, useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { CreditCard, Trash2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

function CardForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    setErr(null);
    const { error } = await stripe.confirmSetup({ elements, redirect: "if_required" });
    setSaving(false);
    if (error) {
      setErr(error.message || "Could not save card");
      return;
    }
    toast.success("Card saved");
    onSaved();
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
          {saving ? "Saving…" : "Save card"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function PaymentMethodSection() {
  const [card, setCard] = useState<SavedCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/stripe/payment-method");
      const data = await res.json();
      setCard(data.card ?? null);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startAdd = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/stripe/setup-intent", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) throw new Error(data.error || "Could not start");
      setClientSecret(data.clientSecret);
    } catch (e: any) {
      toast.error(e?.message || "Payments are not available right now.");
    } finally {
      setStarting(false);
    }
  };

  const remove = async () => {
    await fetch("/api/stripe/payment-method", { method: "DELETE" });
    setCard(null);
    refresh();
  };

  return (
    <div className="max-w-xl">
      <div className="mb-1 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-brand-600" />
        <h2 className="text-base font-medium text-slate-900">Payment method</h2>
      </div>
      <p className="mb-5 text-sm text-slate-500">
        Save a card so you can connect to a tutor instantly. We place a hold when you connect and
        only charge it after your session.
      </p>

      {loading ? (
        <div className="flex h-20 items-center text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : clientSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
          <CardForm
            onSaved={() => {
              setClientSecret(null);
              refresh();
            }}
            onCancel={() => setClientSecret(null)}
          />
        </Elements>
      ) : card ? (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-12 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold uppercase text-slate-600">
              {card.brand}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">•••• {card.last4}</p>
              <p className="text-xs text-slate-400">
                Expires {String(card.expMonth).padStart(2, "0")}/{card.expYear}
              </p>
            </div>
          </div>
          <button
            onClick={remove}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        </div>
      ) : (
        <button
          onClick={startAdd}
          disabled={starting || !stripePromise}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:border-brand-400 hover:text-brand-700 disabled:opacity-60"
        >
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {stripePromise ? "Add a card" : "Payments not configured"}
        </button>
      )}
    </div>
  );
}
