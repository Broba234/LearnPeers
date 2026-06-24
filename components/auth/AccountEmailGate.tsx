"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, X, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

// Soft gate: a non-blocking banner that nags unverified users to confirm their
// account email, plus a 6-digit code modal. The code is sent at signup; this
// lets them enter it (or resend). On success the welcome email fires server-side.
export default function AccountEmailGate() {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(true); // assume verified until known (no flash)
  const [email, setEmail] = useState("");

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [requestedOnce, setRequestedOnce] = useState(false);

  useEffect(() => {
    fetch("/api/auth/verify-email/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setVerified(Boolean(d.verified));
          setEmail(d.email || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Resend cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const requestCode = useCallback(async () => {
    setSending(true);
    setError("");
    setDevCode(null);
    try {
      const res = await fetch("/api/auth/verify-email/request", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send the code");
      if (data.alreadyVerified) {
        setVerified(true);
        setOpen(false);
        return;
      }
      if (data.devCode) setDevCode(data.devCode);
      setCooldown(30);
      setRequestedOnce(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }, []);

  const openModal = () => {
    setOpen(true);
    setError("");
    // Don't auto-send here — signup already emailed a code. Auto-sending a second
    // one creates a newer code the user hasn't received yet, which (with the old
    // newest-only matching) made their valid code look wrong. They can Resend.
  };

  const confirmCode = useCallback(
    async (value: string) => {
      setVerifying(true);
      setError("");
      try {
        const res = await fetch("/api/auth/verify-email/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: value.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Verification failed");
        setVerified(true);
        setOpen(false);
        toast.success("Email verified — you're all set.");
      } catch (e: any) {
        setError(e.message);
        setCode("");
      } finally {
        setVerifying(false);
      }
    },
    []
  );

  // Auto-submit once six digits are entered.
  useEffect(() => {
    if (code.length === 6 && !verifying) confirmCode(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (loading || verified) return null;

  return (
    <>
      <div className="mx-4 mt-4 lg:mx-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <Mail className="w-4 h-4 text-amber-700" />
          </span>
          <p className="text-sm text-amber-900 truncate">
            <span className="font-semibold">Verify your email</span>
            <span className="hidden sm:inline text-amber-700">
              {" "}— confirm {email || "your address"} so we know it's really you.
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="flex-shrink-0 px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors"
        >
          Enter code
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl relative"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-ink-400 hover:bg-ink-50"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-brand-600" />
              </div>
              <h2 className="text-xl font-bold text-ink-900 mb-1">Confirm your email</h2>
              <p className="text-sm text-ink-500 mb-5">
                {sending ? (
                  "Sending a code…"
                ) : (
                  <>
                    Enter the 6-digit code we sent to{" "}
                    <strong className="text-ink-700">{email}</strong>.
                  </>
                )}
              </p>

              {devCode && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                  Dev mode (no email provider) — your code is <strong>{devCode}</strong>
                </p>
              )}

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full bg-white border-2 border-ink-200 px-4 py-3 rounded-xl text-center tracking-[0.6em] font-semibold text-2xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
              />

              {error && (
                <div className="mt-3 text-red-600 text-sm bg-red-50 border border-red-100 py-2 px-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={() => confirmCode(code)}
                disabled={verifying || code.length !== 6}
                className="mt-5 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Verify email
              </button>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={requestCode}
                  disabled={sending || cooldown > 0}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:text-ink-300 disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
