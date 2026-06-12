"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Modal from "@/components/Modal/Modal";
import SetupWizard from "@/components/ui/SetupWizard";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type Stats = {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  totalEarnings: number;
  rating: number;
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
  status: SessionStatus;
  duration: number;
};

export default function TutorHome() {
  const [stats, setStats] = useState<Stats>({
    totalSessions: 0,
    completedSessions: 0,
    upcomingSessions: 0,
    totalEarnings: 0,
    rating: 0,
  });
  const [isAvailableNow, setIsAvailableNow] = useState(false);
  const [freshAvailability, setFreshAvailability] = useState(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const router = useRouter();
  const [userId, setUserId] = useState<string>("");

  const handleStartInstant = useCallback(async (sessionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await fetch("/api/sessions/update-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, status: "in_progress", userId: user.id }),
      });
      router.push(`/home/session/${sessionId}`);
    } catch (err) {
      console.error("Failed to start session:", err);
    }
  }, [router]);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setIsLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        const profileRes = await fetch(
          `/api/profiles/get-full?email=${encodeURIComponent(user.email!)}`
        );
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setIsAvailableNow(profile.isAvailableNow || false);
          setFreshAvailability(profile.profile_setup || false);
          setStripeAccountId(profile.stripe_account_id || null);
          setIsLoading(false);
        } else {
        }
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setSessionsLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setSessions([]);
          setSessionsLoading(false);
          return;
        }

        const res = await fetch(
          `/api/sessions/tutor?tutorId=${encodeURIComponent(user.id)}`
        );

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.sessions)) {
            const nonCompleted = data.sessions.filter(
              (session: any) => session.status !== "completed"
            );

            const formattedSessions: Session[] = nonCompleted.map(
              (session: any) => {
                const sessionDate = new Date(session.created_at);
                return {
                  id: session.id,
                  studentName: session.student?.name || "Student",
                  studentAvatar: session.student?.avatar || undefined,
                  subject: session.topic || "General Session",
                  date: sessionDate.toISOString().split("T")[0],
                  startTime: sessionDate.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  status: session.status as SessionStatus,
                  duration: session.duration || 60,
                };
              }
            );

            setSessions(formattedSessions);
            setStats((prev) => ({
              ...prev,
              totalSessions: data.sessions.length,
              completedSessions: data.sessions.filter(
                (s: any) => s.status === "completed"
              ).length,
              upcomingSessions: formattedSessions.length,
            }));
          } else {
            setSessions([]);
          }
        } else {
          setSessions([]);
        }
      } catch (error) {
        setSessions([]);
      } finally {
        setSessionsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const handleAvailabilityToggle = async () => {
    setIsToggling(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.error("No user session");
        return;
      }

      const response = await fetch("/api/profiles/update-availability", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isAvailableNow: !isAvailableNow,
          userEmail: session.user.email,
        }),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setIsAvailableNow(updatedProfile.isAvailableNow);
      } else {
        const errorText = await response.text();
        let message = "Failed to update availability";
        try {
          const parsed = JSON.parse(errorText);
          message = parsed.error || message;
        } catch {}
        toast.error(message);
      }
    } catch (error) {
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading || freshAvailability == null) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center">
        <div className="text-sm text-slate-400">Loading...</div>
      </div>
    );
  }
  if (!freshAvailability) {
    return (
      <>
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
      </>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const instantSessions = sessions.filter(
    (s) => (s.status === "pending" || s.status === "accepted") && s.date === today
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">Manage your sessions and availability</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAvailabilityToggle}
              disabled={isLoading || isToggling}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                isAvailableNow
                  ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isToggling ? (
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <span className={`w-2 h-2 rounded-full ${isAvailableNow ? "bg-green-500" : "bg-slate-400"}`} />
              )}
              {isToggling ? "Updating..." : isAvailableNow ? "Available" : "Offline"}
            </button>
            <Link
              href="/home/tutor/availability"
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
            >
              Availability
            </Link>
          </div>
        </div>

        {/* Stripe onboarding banner */}
        {!stripeAccountId && (
          <div className="mb-6 flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-amber-800 font-medium flex-1">Complete your payout setup to accept session payments.</p>
            <Link href="/home/tutor/profile" className="flex-shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-colors">
              Set up payouts
            </Link>
          </div>
        )}

        {/* LIVE REQUESTS — Uber-style dominant card */}
        {instantSessions.length > 0 && (
          <div className="mb-6 bg-slate-900 rounded-2xl p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Live Requests</p>
            <div className="space-y-3">
              {instantSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={session.studentAvatar || "/default-avatar.png"}
                      alt={session.studentName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-slate-700 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-white truncate">{session.studentName}</p>
                      <p className="text-sm text-slate-400 truncate">{session.subject}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartInstant(session.id)}
                    className="flex-shrink-0 px-5 py-2.5 bg-white text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    Start Session →
                  </button>
                </div>
              ))}
            </div>
          </div>
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
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Earnings</p>
            <p className="text-3xl font-bold text-slate-300 mt-2">$—</p>
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
              <p className="text-sm text-slate-400 text-center py-4">Loading...</p>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-slate-500">No upcoming sessions</p>
                <p className="text-xs text-slate-400 mt-1">Students will appear here when they book with you.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={session.studentAvatar || "/default-avatar.png"}
                        alt={session.studentName}
                        className="w-8 h-8 rounded-full object-cover bg-slate-100 flex-shrink-0"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{session.studentName}</p>
                        <p className="text-xs text-slate-400">{session.subject}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{session.date}</p>
                      <p className="text-xs text-slate-400">{session.startTime}</p>
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
