"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import LearnPeersLoader from "@/components/ui/LearnPeersLoader";

type EarningsSession = {
  id: string;
  status: string;
  amount: number;
  topic: string | null;
  duration: number | null;
  date: string | null;
  created_at: string;
  student: { id: string; name: string; avatar: string | null } | null;
};

type EarningsData = {
  totalEarned: number;
  totalPending: number;
  stripeAvailable: number;
  stripePending: number;
  loginUrl: string | null;
  sessions: EarningsSession[];
};

function fmt(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function statusBadge(status: string) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      Pending
    </span>
  );
}

export default function EarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res = await fetch(`/api/earnings?tutorId=${encodeURIComponent(user.id)}`);
      if (res.ok) setData(await res.json());
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <LearnPeersLoader fullScreen />;
  }

  const sessions = data?.sessions ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Earnings</h1>
            <p className="text-sm text-slate-400 mt-0.5">Your revenue after the 5% platform fee</p>
          </div>
          {data?.loginUrl && (
            <a
              href={data.loginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Stripe Dashboard
            </a>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Total Earned</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{fmt(data?.totalEarned ?? 0)}</p>
            <p className="text-xs text-slate-400 mt-1">from completed sessions</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Pending</p>
            <p className="text-3xl font-bold text-amber-500 mt-2">{fmt(data?.totalPending ?? 0)}</p>
            <p className="text-xs text-slate-400 mt-1">sessions in progress</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Available</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{fmt(data?.stripeAvailable ?? 0)}</p>
            <p className="text-xs text-slate-400 mt-1">ready for payout</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">In Transit</p>
            <p className="text-3xl font-bold text-slate-500 mt-2">{fmt(data?.stripePending ?? 0)}</p>
            <p className="text-xs text-slate-400 mt-1">arriving in 2–7 days</p>
          </div>
        </div>

        {/* Session history */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Session History</h3>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-slate-500">No earnings yet</p>
              <p className="text-xs text-slate-400 mt-1">Completed sessions will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {/* Table header — hidden on mobile */}
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-widest">
                <span>Student / Subject</span>
                <span className="text-right">Duration</span>
                <span className="text-right">Your Take</span>
                <span className="text-right">Status</span>
              </div>

              {sessions.map((session) => {
                const take = Math.round(Number(session.amount) * 0.95 * 100) / 100;
                const displayDate = session.date
                  ? new Date(session.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : new Date(session.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                const durationLabel = session.duration
                  ? `${session.duration}h`
                  : "—";

                return (
                  <div
                    key={session.id}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-4 items-center px-5 py-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={session.student?.avatar || "/default-avatar.png"}
                        alt={session.student?.name ?? "Student"}
                        className="w-8 h-8 rounded-full object-cover bg-slate-100 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {session.student?.name ?? "Student"}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {session.topic || "General Session"} · {displayDate}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 text-right">{durationLabel}</p>
                    <p className="text-sm font-semibold text-slate-900 text-right">{fmt(take)}</p>
                    <div className="flex justify-end">{statusBadge(session.status)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* No payout account */}
        {!data?.loginUrl && sessions.length > 0 && (
          <div className="mt-4 flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-amber-800 font-medium flex-1">Complete Stripe onboarding to unlock payouts.</p>
            <Link href="/home/tutor/profile" className="flex-shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-colors">
              Set up payouts
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
