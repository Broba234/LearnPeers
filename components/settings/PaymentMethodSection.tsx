"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CreditCard, Trash2, Loader2, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import AddCardForm from "@/components/payments/AddCardForm";
import {
  type SavedCard,
  formatCardBrand,
  formatCardExpiry,
} from "@/components/payments/cardDisplay";

/**
 * Settings → Payment methods: the primary home for set-and-forget cards.
 * Lists every saved card, lets the student add more, remove one, and choose
 * the default used for one-tap booking.
 */
export default function PaymentMethodSection() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/stripe/payment-method");
      const data = await res.json();
      setCards(Array.isArray(data.cards) ? data.cards : []);
    } catch {
      /* keep whatever we had */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = async (card: SavedCard) => {
    setBusyId(card.id);
    try {
      const res = await fetch("/api/stripe/payment-method", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: card.id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Card removed");
      await refresh();
    } catch {
      toast.error("Could not remove the card. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const makeDefault = async (card: SavedCard) => {
    setBusyId(card.id);
    try {
      const res = await fetch("/api/stripe/payment-method", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: card.id }),
      });
      if (!res.ok) throw new Error();
      await refresh();
    } catch {
      toast.error("Could not update your default card.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="mb-1 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-brand-600" />
        <h2 className="text-base font-medium text-slate-900">Payment methods</h2>
      </div>
      <p className="mb-5 text-sm text-slate-500">
        Save a card once and book any tutor in one tap. Your default card is only
        charged when you book a session.
      </p>

      {loading ? (
        <div className="flex h-20 items-center text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-12 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-600">
                  {formatCardBrand(card.brand)}
                </div>
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    •••• {card.last4}
                    {card.isDefault && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">Expires {formatCardExpiry(card)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!card.isDefault && (
                  <button
                    onClick={() => makeDefault(card)}
                    disabled={busyId !== null}
                    title="Use this card for one-tap booking"
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50 hover:text-brand-700 disabled:opacity-50"
                  >
                    {busyId === card.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Star className="h-4 w-4" />
                    )}
                    Set default
                  </button>
                )}
                <button
                  onClick={() => remove(card)}
                  disabled={busyId !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50 hover:text-red-600 disabled:opacity-50"
                >
                  {busyId === card.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Remove
                </button>
              </div>
            </div>
          ))}

          {adding ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <AddCardForm
                onSaved={() => {
                  setAdding(false);
                  toast.success("Card saved");
                  refresh();
                }}
                onCancel={() => setAdding(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:border-brand-400 hover:text-brand-700"
            >
              <Plus className="h-4 w-4" />
              {cards.length > 0 ? "Add another card" : "Add a card"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
