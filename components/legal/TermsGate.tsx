"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { ShieldCheck, Loader2, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface PendingDoc {
  id: string;
  type: string;
  version: number;
  title: string;
  content: string;
  summary: string | null;
  effective_date: string | null;
}

/**
 * Blocking "sign the terms" gate. Mounted on every authenticated surface. While
 * the current user has unaccepted, acceptance-required legal documents, it
 * overlays the app with a modal they must read and accept (or sign out) before
 * continuing. Owners are never gated (the status endpoint short-circuits them).
 */
export default function TermsGate() {
  const [docs, setDocs] = useState<PendingDoc[] | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/legal/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active) return;
        setDocs(d?.needsAcceptance ? (d.pending as PendingDoc[]) : []);
      })
      .catch(() => active && setDocs([]));
    return () => {
      active = false;
    };
  }, []);

  // If the content is short enough to need no scrolling, treat it as read.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.clientHeight < 24) setScrolledToEnd(true);
  }, [docs]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setScrolledToEnd(true);
  }, []);

  const accept = useCallback(async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/legal/accept", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not record your acceptance.");
      setDocs([]); // dismiss the gate
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, []);

  const declineAndSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.assign("/auth/login");
    }
  }, []);

  // Nothing pending (or still loading) → render nothing.
  if (!docs || docs.length === 0) return null;

  const multiple = docs.length > 1;
  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Review and accept our terms"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-900/70 backdrop-blur-sm p-3 sm:p-6"
    >
      <div className="flex w-full max-w-2xl max-h-[92vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-ink-100 px-6 py-5">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-ink-900">
              {multiple ? "Review our updated terms" : docs[0].title}
            </h2>
            <p className="text-sm text-ink-500">
              Please read and accept {multiple ? "these documents" : "this"} to continue using LearnPeers.
            </p>
          </div>
        </div>

        {/* Scrollable document body */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto px-6 py-5"
        >
          {docs.map((doc, i) => (
            <article key={doc.id} className={i > 0 ? "mt-10 border-t border-ink-100 pt-8" : ""}>
              {multiple && (
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
                  <FileText className="h-3.5 w-3.5" />
                  {doc.title}
                </div>
              )}
              <div className="mb-4 text-xs text-ink-400">
                Version {doc.version}
                {fmtDate(doc.effective_date) ? ` · Effective ${fmtDate(doc.effective_date)}` : ""}
              </div>
              <div
                className="legal-prose text-sm leading-relaxed text-ink-700 [&_a]:text-brand-600 [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-ink-900 [&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-ink-900 [&_li]:mb-1 [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-ink-900 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 first:[&_h2]:mt-0"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(doc.content) }}
              />
            </article>
          ))}
        </div>

        {/* Footer / acceptance controls */}
        <div className="border-t border-ink-100 bg-ink-50/50 px-6 py-4">
          {error && (
            <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={agreed}
              disabled={!scrolledToEnd}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
            />
            <span>
              I have read and agree to the {multiple ? "documents" : docs[0].title} above
              {!scrolledToEnd && (
                <span className="ml-1 text-ink-400">— scroll to the end to enable.</span>
              )}
            </span>
          </label>

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={declineAndSignOut}
              className="text-sm font-medium text-ink-500 hover:text-ink-700"
            >
              Decline &amp; sign out
            </button>
            <button
              type="button"
              onClick={accept}
              disabled={!agreed || submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Agree &amp; continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
