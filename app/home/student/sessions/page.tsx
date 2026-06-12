'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LiveKitRoom from '@/components/LiveKitRoom';
import { supabase } from '@/lib/supabaseClient';

interface Session {
  id: string;
  tutorName: string;
  tutorAvatar?: string;
  subject: string;
  date: string;
  start_time: string;
  status: 'active' | 'completed' | 'pending';
  duration: number;
  price: number;
  meetingLink?: string;
  homework?: string;
  progress?: string;
  rating?: number;
}

export default function StudentSessions() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // LiveKit session state
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [currentSessionData, setCurrentSessionData] = useState<{
    roomName: string;
    tutorName: string;
    subject: string;
  } | null>(null);
  const [userInfo, setUserInfo] = useState<{
    identity: string;
    name: string;
  } | null>(null);
  const [userId, setUserId] = useState<string>("");

  // Get current user info for LiveKit
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const profileRes = await fetch(`/api/profiles/get-full?email=${encodeURIComponent(user.email!)}`);
          if (profileRes.ok) {
            const profile = await profileRes.json();

            setUserInfo({
              identity: user.id,
              name: profile.name || 'Student'
            });
            setUserId(user.id);
          } else {
          }
        } else {
        }
      } catch (error) {
      }
    };
    getCurrentUser();
  }, []);

  const fetchSessions = async () => {
    if (!userId || userId.length === 0) {
      return;
    }

    try {
      const res = await fetch(`/api/sessions/student?studentId=${encodeURIComponent(userId)}`);

      if (res.ok) {
        const data = await res.json();

        if (data.success && data.sessions) {
          const formattedSessions: Session[] = data.sessions.map((session: any) => {
            return {
              id: session.id,
              tutorName: session.tutor?.name || 'Tutor',
              tutorAvatar: session.tutor?.avatar || undefined,
              subject: session.topic || 'Session',
              date: session.date || new Date(session.created_at).toISOString().split('T')[0],
              start_time: session.start_time || '',
              status: session.status === 'in_progress' ? 'active' :
                    session.status === 'completed' ? 'completed' : 'pending',
              duration: session.duration || 60,
              price: session.amount || session.tutor?.hourlyRate || 0,
              meetingLink: session.room_name ? `session-${session.id}` : undefined,
              homework: session.homework || undefined,
              progress: session.notes || undefined,
              rating: session.rating || undefined
            };
          });
          setSessions(formattedSessions);
        } else {
          setSessions([]);
        }
      } else {
        const errorData = await res.json();
        setSessions([]);
      }
    } catch (error) {
      setSessions([]);
    }
  };

  useEffect(() => {
    if (!userId || userId.length === 0) {
      return;
    }

    fetchSessions();
    const interval = setInterval(() => {
      fetchSessions();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [userId]);

  const filteredSessions = sessions.filter((session: Session) =>
    filter === 'all' ? true : session.status === filter
  );



  const handleJoinSession = async (session: Session) => {
    if (!userInfo) return;
    router.push(`/home/session/${session.id}`);
  };

  const handleCancelSession = async (sessionId: string) => {
    if (!userId) return;
    try {
      const res = await fetch("/api/booking/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, userId }),
      });
      if (res.ok) {
        fetchSessions();
      }
    } catch (err) {
      console.error("Cancel failed:", err);
    }
  };

  const handleEndSession = () => {
    setIsSessionOpen(false);
    setCurrentSessionData(null);
  };

  const filterOptions = ['all', 'active', 'completed', 'pending'] as const;

  const statusDot: Record<string, string> = {
    active: 'bg-green-500',
    pending: 'bg-brand-400',
    completed: 'bg-slate-300',
  };

  const statusLabel: Record<string, string> = {
    active: 'Live',
    pending: 'Pending',
    completed: 'Completed',
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">My Sessions</h1>
            <p className="text-sm text-slate-400 mt-0.5">Your tutoring history</p>
          </div>
          <button
            onClick={fetchSessions}
            className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Tab filters */}
        <div className="flex border-b border-slate-100 mb-6">
          {filterOptions.map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption as any)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                filter === filterOption
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              {filterOption !== 'all' && (
                <span className="ml-1.5 text-xs text-slate-400">
                  {sessions.filter(s => s.status === filterOption).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sessions */}
        <div className="space-y-3">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-900 mb-1">No sessions yet</p>
              <p className="text-xs text-slate-400">Your sessions will appear here once booked.</p>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                <div className="p-5">
                  {/* Top row */}
                  <div className="flex items-start gap-3">
                    <img
                      src={session.tutorAvatar || "/default-avatar.png"}
                      alt={session.tutorName}
                      className="w-11 h-11 rounded-full object-cover bg-slate-100 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{session.tutorName}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{session.subject}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {session.price > 0 && (
                            <p className="text-sm font-semibold text-slate-900">${session.price}</p>
                          )}
                          <div className="flex items-center gap-1.5 justify-end mt-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDot[session.status] || 'bg-slate-300'}`} />
                            <span className="text-xs text-slate-500">{statusLabel[session.status] || session.status}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5">
                        {session.date}{session.start_time ? ` at ${session.start_time}` : ''} · {session.duration === 0.5 ? "30" : session.duration === 1 ? "60" : "90"} min
                      </p>
                    </div>
                  </div>

                  {/* Homework / progress */}
                  {session.homework && (
                    <div className="mt-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-0.5">Homework</p>
                      <p className="text-xs text-slate-700">{session.homework}</p>
                    </div>
                  )}
                  {session.progress && (
                    <div className="mt-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-0.5">Session Summary</p>
                      <p className="text-xs text-slate-700">{session.progress}</p>
                      {session.rating && (
                        <div className="flex items-center gap-1 mt-1.5">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-sm ${i < session.rating! ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action footer */}
                {session.status === 'active' && (
                  <div className="px-5 pb-5">
                    <button
                      onClick={() => handleJoinSession(session)}
                      disabled={!userInfo}
                      className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      Join Session
                    </button>
                  </div>
                )}
                {session.status === 'pending' && (
                  <div className="px-5 pb-4 flex items-center justify-between">
                    <p className="text-xs text-slate-400">Awaiting confirmation</p>
                    <button
                      onClick={() => handleCancelSession(session.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 
