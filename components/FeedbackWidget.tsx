'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, X, Send, Check, Loader2 } from 'lucide-react';

// Routes where the widget is hidden to avoid covering critical controls
// (the live session room is a fullscreen workspace).
const HIDDEN_PREFIXES = ['/home/session'];

export default function FeedbackWidget() {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  const submit = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, page: pathname }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('sent');
      setMessage('');
      // Auto-close shortly after the success state shows.
      setTimeout(() => {
        setOpen(false);
        setTimeout(() => setStatus('idle'), 300);
      }, 1600);
    } catch {
      setStatus('error');
    }
  }, [message, status, pathname]);

  if (hidden) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[1000] print:hidden sm:bottom-6 sm:right-6">
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 ring-1 ring-black/5"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-brand-700 to-brand-600 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Send feedback</span>
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Beta
                </span>
              </div>
              <button
                type="button"
                aria-label="Close feedback"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              {status === 'sent' ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-800">Thanks for the feedback!</p>
                  <p className="text-xs text-slate-500">It helps us improve LearnPeers.</p>
                </div>
              ) : (
                <>
                  <p className="mb-2 text-xs leading-relaxed text-slate-500">
                    We&apos;re in beta — tell us what&apos;s broken, confusing, or missing.
                  </p>
                  <textarea
                    autoFocus
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (status === 'error') setStatus('idle');
                    }}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
                    }}
                    rows={4}
                    maxLength={5000}
                    placeholder="Your feedback…"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
                  />
                  {status === 'error' && (
                    <p className="mt-1.5 text-xs text-red-500">
                      Something went wrong. Please try again.
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      Linked to your account if signed in.
                    </span>
                    <button
                      type="button"
                      onClick={submit}
                      disabled={!message.trim() || status === 'sending'}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-700 to-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {status === 'sending' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Send
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="fab"
            type="button"
            aria-label="Send feedback"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-700 to-brand-600 py-3 pl-3.5 pr-3.5 text-white shadow-lg shadow-brand-600/25 ring-1 ring-white/20 transition hover:pr-4 hover:shadow-xl hover:shadow-brand-600/30 sm:pr-4"
          >
            <MessageSquarePlus className="h-5 w-5 shrink-0" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-300 group-hover:max-w-[80px] group-hover:opacity-100">
              Feedback
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
