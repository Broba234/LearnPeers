"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Modal from "@/components/Modal/Modal";
import SetupWizard from "@/components/ui/SetupWizard";
import LearnPeersLoader from "@/components/ui/LearnPeersLoader";
import GoAvailableHero from "@/components/presence/GoAvailableHero";
import { AnimatePresence } from "framer-motion";

type Stats = {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
};

type SessionStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "in_progress"
  | "completed"
  | "cancelled";

type Session = {
  id: string;
  studentName: string;
  studentAvatar?: string;
  subject: string;
  date: string;
  startTime: string;
  startsAt: number | null;
  status: SessionStatus;
  isInstant: boolean;
  duration: number;
};

function parseStartsAt(date?: string, startTime?: string): number | null {
  if (!date) return null;
  try {
    const t = startTime || "00:00:00";
    const d = new Date(`${date}T${t}`);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  } catch {
    return null;
  }
}

export default function TutorHome() {
  const [stats, setStats] = useState<Stats>({
    totalSessions: 0,
    completedSessions: 0,
    upcomingSessions: 0,
  });
  const [freshAvailability, setFreshAvailability] = useState<boolean | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const router = useRouter();

  // Tick so "ready to start" buttons appear when a scheduled time arrives.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const handleStart = useCallback(async (sessionId: string) => {
    try {
      await fetch("/api/sessions/update-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, status: "in_progress" }),
      });
      router.push(`/home/session/${sessionId}`);
    } catch (err) {
      console.error("Failed to start session:", err);
    }
  }, [router]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        // Tolerate the just-registered race: confirm a local session before
        // giving up so a fresh sign-up lands in onboarding.
        let user = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) { user = session.user; break; }
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        if (!user) return;
        const profileRes = await fetch(
          `/api/profiles/get-full?email=${encodeURIComponent(user.email!)}`
        );
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setFreshAvailability(profile.profile_setup || false);
          setStripeAccountId(profile.stripe_account_id || null);
        }
      } catch {
        /* ignore */
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSessions([]);
        return;
      }
      const res = await fetch(`/api/sessions/tutor?tutorId=${encodeURIComponent(user.id)}`);
      if (!res.ok) {
        setSessions([]);
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        const formatted: Session[] = data.sessions.map((s: any) => ({
          id: s.id,
          studentName: s.student?.name || "Student",
          studentAvatar: s.student?.avatar || undefined,
          subject: s.topic || "General Session",
          date: s.date || new Date(s.created_at).toISOString().split("T")[0],
          startTime: s.start_time || "",
          startsAt: parseStartsAt(s.date, s.start_time),
          status: s.status as SessionStatus,
          isInstant: !!s.is_instant,
          duration: s.duration || 1,
        }));
        setSessions(formatted);
        setStats({
          totalSessions: data.sessions.length,
          completedSessions: data.sessions.filter((s: any) => s.status === "completed").length,
          upcomingSessions: formatted.filter((s: any) => s.status === "accepted").length,
        });
      } else {
        setSessions([]);
      }
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    setSessionsLoading(true);
    fetchSessions();
    const t = setInterval(fetchSessions, 8000);
    return () => clearInterval(t);
  }, [fetchSessions]);

  if (isLoading || freshAvailability == null) {
    return <LearnPeersLoader fullScreen />;
  }
  if (!freshAvailability) {
    return (
      <AnimatePresence>
        <Modal
          isOpen={true}
          onClose={() => {}}
          transition="fade"
          overclass="justify-center overflow-y-auto w-full items-center p-2 lg:p-4"
          innerclass="max-h-screen min-h-[600px]"
        >
          <SetupWizard />
        </Modal>
      </AnimatePresence>
    );
  }

  // In-progress sessions to rejoin.
  const liveNow = sessions.filter((s) => s.status === "in_progress");
  // Accepted sessions whose scheduled time has arrived (or instant accepted).
  const readyToStart = sessions.filter(
    (s) => s.status === "accepted" && (s.isInstant || (s.startsAt != null && s.startsAt <= now + 5 * 60 * 1000))
  );
  // Upcoming = accepted, still in the future.
  const upcoming = sessions
    .filter((s) => s.status === "accepted" && s.startsAt != null && s.startsAt > now + 5 * 60 * 1000)
    .sort((a, b) => (a.startsAt || 0) - (b.startsAt || 0));
  const pendingCount = sessions.filter((s) => s.status === "pending").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 lg:pt-16">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">Go live for instant sessions or manage your schedule</p>
          </div>
          <Link
            href="/home/tutor/availability"
            className="self-start px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            Edit schedule
          </Link>
        </div>

        {/* Go Available hero */}
        <div className="mb-6">
          <GoAvailableHero />
        </div>

        {/* Stripe onboarding banner */}
        {!stripeAccountId && (
          <div className="mb-6 flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-amber-800 font-medium flex-1">Complete your payout setup to get paid for sessions.</p>
            <Link href="/home/tutor/profile" className="flex-shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-colors">
              Set up payouts
            </Link>
          </div>
        )}

        {/* Live now — rejoin */}
        {liveNow.length > 0 && (
          <div className="mb-6 bg-emerald-600 rounded-2xl p-5">
            <p className="text-xs font-semibold text-emerald-100 uppercase tracking-widest mb-3">In session</p>
            <div className="space-y-3">
              {liveNow.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={s.studentAvatar || "/default-avatar.png"} alt={s.studentName} className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-white truncate">{s.studentName}</p>
                      <p className="text-sm text-emerald-100 truncate">{s.subject}</p>
                    </div>
                  </div>
                  <Link href={`/home/session/${s.id}`} className="flex-shrink-0 px-5 py-2.5 bg-white text-emerald-700 text-sm font-bold rounded-xl hover:bg-emerald-50 transition-colors">
                    Rejoin →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ready to start */}
        {readyToStart.length > 0 && (
          <div className="mb-6 bg-slate-900 rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Ready to start</p>
            <div className="space-y-3">
              {readyToStart.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={s.studentAvatar || "/default-avatar.png"} alt={s.studentName} className="w-10 h-10 rounded-full object-cover border-2 border-slate-700 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-white truncate">{s.studentName}</p>
                      <p className="text-sm text-slate-400 truncate">{s.subject}{s.startTime ? ` · ${s.startTime.slice(0, 5)}` : ""}</p>
                    </div>
                  </div>
                  <button onClick={() => handleStart(s.id)} className="flex-shrink-0 px-5 py-2.5 bg-white text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-100 transition-colors">
                    Start →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending requests nudge */}
        {pendingCount > 0 && (
          <Link href="/home/tutor/sessions" className="mb-6 flex items-center justify-between gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl hover:bg-amber-100 transition-colors">
            <p className="text-sm text-amber-800 font-medium">
              You have {pendingCount} session request{pendingCount !== 1 ? "s" : ""} awaiting your response.
            </p>
            <span className="flex-shrink-0 text-xs font-semibold text-amber-700">Review →</span>
          </Link>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Total Sessions</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalSessions}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Completed</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats.completedSessions}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Upcoming</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats.upcomingSessions}</p>
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Upcoming Sessions</h3>
            <Link href="/home/tutor/sessions" className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors">
              View all
            </Link>
          </div>
          <div className="px-5 py-4">
            {sessionsLoading ? (
              <div className="flex justify-center py-4"><LearnPeersLoader size={72} /></div>
            ) : upcoming.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-slate-500">No upcoming sessions</p>
                <p className="text-xs text-slate-400 mt-1">Go available above, or students will book your scheduled times.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {upcoming.slice(0, 5).map((session) => (
                  <div key={session.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <img src={session.studentAvatar || "/default-avatar.png"} alt={session.studentName} className="w-8 h-8 rounded-full object-cover bg-slate-100 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{session.studentName}</p>
                        <p className="text-xs text-slate-400">{session.subject}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{session.date}</p>
                      <p className="text-xs text-slate-400">{session.startTime ? session.startTime.slice(0, 5) : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
