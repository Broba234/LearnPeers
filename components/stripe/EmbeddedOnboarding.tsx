"use client";

import { useCallback, useEffect, useState } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js";

interface EmbeddedOnboardingProps {
  email: string;
  /** ISO 3166-1 alpha-2 country override for first-time account creation. */
  country?: string;
  /** Called when the tutor finishes (or exits) the onboarding flow. */
  onExit: () => void;
  onClose: () => void;
}

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export default function EmbeddedOnboarding({
  email,
  country,
  onExit,
  onClose,
}: EmbeddedOnboardingProps) {
  const [connectInstance, setConnectInstance] = useState<ReturnType<
    typeof loadConnectAndInitialize
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/stripe/connect/account-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, country }),
    });
    const data = await res.json();
    if (!res.ok || !data.clientSecret) {
      throw new Error(data.error || "Failed to start onboarding");
    }
    return data.clientSecret as string;
  }, [email, country]);

  useEffect(() => {
    if (!publishableKey) {
      setError("Stripe is not configured.");
      return;
    }
    try {
      const instance = loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret,
        appearance: {
          variables: {
            colorPrimary: "#0077be", // LearnPeers brand azure
            colorText: "#243036", // ink-900
            fontFamily:
              "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            borderRadius: "12px",
          },
        },
      });
      setConnectInstance(instance);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to initialize Stripe");
    }
  }, [fetchClientSecret]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Set up payouts</h2>
            <p className="text-xs text-slate-500">
              Securely connect your bank to receive payments
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {error ? (
            <div className="p-4 bg-red-50 rounded-lg text-red-700 text-sm">{error}</div>
          ) : connectInstance ? (
            <ConnectComponentsProvider connectInstance={connectInstance}>
              <ConnectAccountOnboarding onExit={onExit} />
            </ConnectComponentsProvider>
          ) : (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <span className="ml-2 text-sm text-slate-500">Loading…</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
