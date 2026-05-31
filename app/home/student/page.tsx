"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SignUpWizard from "@/components/student/SignUpWizard";
import Modal from "@/components/Modal/Modal";
import { AnimatePresence } from "framer-motion";

type Stats = {
    totalSessions: number;
    completedSessions: number;
    upcomingSessions: number;
    totalSpent: number;
    averageRating: number;
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
    tutorName: string;
    tutorAvatar?: string;
    subject: string;
    date: string;
    startTime: string;
    status: SessionStatus;
    duration: number;
};

const statusConfig: Record<SessionStatus, { label: string; dot: string; text: string }> = {
  pending:    { label: "Pending",     dot: "bg-amber-400",  text: "text-amber-600" },
  accepted:   { label: "Confirmed",   dot: "bg-green-500",  text: "text-green-600" },
  in_progress:{ label: "Live",        dot: "bg-green-500",  text: "text-green-600" },
  completed:  { label: "Completed",   dot: "bg-slate-300",  text: "text-slate-500" },
  declined:   { label: "Declined",    dot: "bg-red-400",    text: "text-red-500"   },
  cancelled:  { label: "Cancelled",   dot: "bg-red-400",    text: "text-red-500"   },
};

export default function StudentHome() {
    const [stats, setStats] = useState<Stats>({
        totalSessions: 0,
        completedSessions: 0,
        upcomingSessions: 0,
        totalSpent: 0,
        averageRating: 0,
    });
    const [profile, setProfile] = useState<any>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchProfile = async () => {
          try {
            const {
              data: { user },
              error: sessionError,
            } = await supabase.auth.getUser();
            if (sessionError || !user) {
              router.push("/auth/login");
              return;
            }
            const profileRes = await fetch(`/api/profiles/get-full?email=${encodeURIComponent(user.email!)}`);
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              setProfile(profileData);
              try {
                setSessionsLoading(true);
                const res = await fetch(`/api/sessions/student?studentId=${encodeURIComponent(profileData.id)}`);
                if (res.ok) {
                  const data = await res.json();
                  if (data.success && Array.isArray(data.sessions)) {
                    const nonCompleted = data.sessions.filter(
                      (session: any) => session.status !== "completed"
                    );
                    const formattedSessions: Session[] = nonCompleted.map((session: any) => {
                      const sessionDate = new Date(session.created_at);
                      return {
                        id: session.id,
                        tutorName: session.tutor?.name || "Tutor",
                        tutorAvatar: session.tutor?.avatar || undefined,
                        subject: session.topic || "Session",
                        date: sessionDate.toISOString().split("T")[0],
                        startTime: sessionDate.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }),
                        status: session.status as SessionStatus,
                        duration: session.duration || 60,
                      };
                    });

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
            }
            setLoading(false);
          } catch (error) {
            setLoading(false);
          }
        };
        fetchProfile();
      }, [router]);

      if (loading) {
        return (
          <div className="flex h-screen items-center justify-center bg-[#FAFAF9]">
            <div className="text-sm text-slate-400">Loading...</div>
          </div>
        );
      }
      if (!profile) {
        return (
          <div className="flex h-screen items-center justify-center bg-[#FAFAF9]">
            <div className="text-sm text-slate-400">No profile found.</div>
          </div>
        );
      }
      if (profile.role !== "student") {
        router.push("/auth/login");
      }
      if (!profile.profile_setup) {
        return (
            <>
         <AnimatePresence>
              <Modal
                isOpen={true}
                onClose={() => {}}
                transition="fade"
                overclass="justify-center overflow-y-auto w-full items-center p-2 lg:p-4"
                innerclass="max-h-screen min-h-[600px] w-full max-w-6xl mx-auto"
              >
                <SignUpWizard />
              </Modal>
          </AnimatePresence>
            </>
          );
      }

    const firstName = profile.name?.split(" ")[0] || "there";

    return (
      <div className="min-h-screen bg-[#FAFAF9]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Hello, {firstName}</h1>
              <p className="text-sm text-slate-400 mt-0.5">Here's what's coming up for you</p>
            </div>
            <Link
              href="/home/student/explore"
              className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Find a Tutor
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Total</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalSessions}</p>
              <p className="text-xs text-slate-400 mt-1">sessions booked</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Completed</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.completedSessions}</p>
              <p className="text-xs text-slate-400 mt-1">sessions done</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Upcoming</p>
              <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.upcomingSessions}</p>
              <p className="text-xs text-slate-400 mt-1">sessions ahead</p>
            </div>
          </div>

          {/* Upcoming Sessions */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Upcoming Sessions</h3>
              <Link href="/home/student/sessions" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                View all
              </Link>
            </div>
            <div className="px-5 py-4">
              {sessionsLoading ? (
                <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
              ) : sessions.length === 0 ? (
                <div className="text-center py-10">
                  <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-slate-500">No upcoming sessions</p>
                  <p className="text-xs text-slate-400 mt-1">Book a session to see it here.</p>
                  <Link href="/home/student/explore" className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-xl hover:bg-indigo-700 transition-colors">
                    Find a Tutor
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sessions.slice(0, 5).map((session) => {
                    const sc = statusConfig[session.status] || statusConfig.pending;
                    return (
                      <div key={session.id} className="flex items-center justify-between py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={session.tutorAvatar || "/default-avatar.png"}
                            alt={session.tutorName}
                            className="w-9 h-9 rounded-full object-cover bg-slate-100 flex-shrink-0"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{session.subject}</p>
                            <p className="text-xs text-slate-400">with {session.tutorName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-slate-500">{session.date}</p>
                            <p className="text-xs text-slate-400">{session.startTime}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                            <span className={`text-xs font-medium ${sc.text}`}>{sc.label}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
}
