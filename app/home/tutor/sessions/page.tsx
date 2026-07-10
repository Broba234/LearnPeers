'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import LearnPeersLoader from '@/components/ui/LearnPeersLoader';
import { tutorNet } from '@/lib/billing';

interface SessionRequest {
  id: string;
  studentName: string;
  studentAvatar?: string;
  subject: string;
  start_time: string;
  duration: number;
  date: string;
  requestedAt: string;
  amount: number | null;
  status: 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled';
  message?: string;
  isInstant: boolean;
}

export default function InboxPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<SessionRequest[]>([]);
  const [filter, setFilter] = useState<'pending' | 'upcoming' | 'completed'>('pending');
  const [userInfo, setUserInfo] = useState<{ identity: string; name: string } | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Tick every 30s so the "Start Session" button appears in real-time
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const isSessionReady = (request: SessionRequest): boolean => {
    try {
      return now >= new Date(`${request.date}T${request.start_time}`);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const profileRes = await fetch(`/api/profiles/get-full?email=${encodeURIComponent(user.email!)}`);
          if (profileRes.ok) {
            const profile = await profileRes.json();
            setUserInfo({ identity: user.id, name: profile.name || 'Tutor' });
            setUserId(user.id);
          }
        }
      } catch (error) {
        console.error('Error getting user info:', error);
      }
    };
    getCurrentUser();
  }, []);

  const fetchSessions = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/tutor?tutorId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.sessions) {
          const formattedRequests: SessionRequest[] = data.sessions.map((session: any) => ({
            id: session.id,
            studentName: session.student?.name || 'Student',
            studentAvatar: session.student?.avatar || undefined,
            subject: session.topic || 'General Session',
            start_time: session.start_time,
            duration: session.duration,
            date: session.date,
            requestedAt: session.created_at,
            amount: session.amount ?? null,
            status: session.status,
            message: session.notes || undefined,
            isInstant: !!session.is_instant,
          }));
          setRequests(formattedRequests);
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  const [acting, setActing] = useState<string | null>(null);

  const patchStatus = async (sessionId: string, status: string) => {
    const res = await fetch('/api/sessions/update-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, status }),
    });
    return res.ok;
  };

  const handleStartSession = async (request: SessionRequest) => {
    if (!userInfo) return;
    try {
      if (!(await patchStatus(request.id, 'in_progress'))) return;
      router.push(`/home/session/${request.id}`);
      setRequests(prev => prev.map(req => req.id === request.id ? { ...req, status: 'in_progress' } : req));
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  // Accept a request. Instant requests jump straight into the room; scheduled
  // ones move to "accepted" and start when their time arrives.
  const handleAccept = async (request: SessionRequest) => {
    setActing(request.id);
    try {
      if (request.isInstant) {
        if (await patchStatus(request.id, 'in_progress')) {
          router.push(`/home/session/${request.id}`);
        }
      } else {
        if (await patchStatus(request.id, 'accepted')) {
          setRequests(prev => prev.map(req => req.id === request.id ? { ...req, status: 'accepted' } : req));
          setFilter('upcoming');
        }
      }
    } finally {
      setActing(null);
    }
  };

  const handleDecline = async (request: SessionRequest) => {
    setActing(request.id);
    try {
      if (await patchStatus(request.id, 'declined')) {
        setRequests(prev => prev.map(req => req.id === request.id ? { ...req, status: 'declined' } : req));
      }
    } finally {
      setActing(null);
    }
  };

  // ── Helpers ──────────────────────────────────────────────

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (dur: number) => {
    if (dur === 0.5) return '30 min';
    if (dur === 1) return '1 hr';
    if (dur === 1.5) return '1.5 hrs';
    return `${dur} hrs`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60_000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    pending:     { label: 'Pending',     bg: 'bg-amber-50  border-amber-200', text: 'text-amber-700',  dot: 'bg-amber-400' },
    accepted:    { label: 'Accepted',    bg: 'bg-brand-50   border-brand-200',  text: 'text-brand-700',   dot: 'bg-brand-400' },
    in_progress: { label: 'In Progress', bg: 'bg-green-50  border-green-200', text: 'text-green-700',  dot: 'bg-green-400' },
    completed:   { label: 'Completed',   bg: 'bg-gray-50   border-gray-200',  text: 'text-gray-600',   dot: 'bg-gray-400' },
    declined:    { label: 'Declined',    bg: 'bg-red-50    border-red-200',   text: 'text-red-700',    dot: 'bg-red-400' },
    cancelled:   { label: 'Cancelled',   bg: 'bg-gray-50   border-gray-200',  text: 'text-gray-500',   dot: 'bg-gray-400' },
  };

  const isUpcoming = (r: SessionRequest) =>
    r.status === 'accepted' && now < new Date(`${r.date}T${r.start_time}`);

  const isPending = (r: SessionRequest) => r.status === 'pending';

  const filteredRequests = requests.filter(req => {
    if (filter === 'pending') return isPending(req);
    if (filter === 'upcoming') return isUpcoming(req);
    return req.status === 'completed';
  });

  const pendingCount = requests.filter(r => isPending(r)).length;
  const upcomingCount = requests.filter(r => isUpcoming(r)).length;
  const completedCount = requests.filter(r => r.status === 'completed').length;

  // ── Earnings sum from completed sessions (tutor payout, not the gross price) ─
  const totalEarnings = requests
    .filter(r => r.status === 'completed' && r.amount)
    .reduce((sum, r) => sum + tutorNet(r.amount ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 lg:pt-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Sessions</h1>
            <p className="text-sm text-slate-400 mt-0.5">Manage your tutoring sessions</p>
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

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Upcoming',  value: upcomingCount,                    color: 'text-brand-600' },
            { label: 'Pending',   value: pendingCount,                     color: 'text-amber-500' },
            { label: 'Completed', value: completedCount,                   color: 'text-green-600' },
            { label: 'Earnings',  value: `$${totalEarnings.toFixed(0)}`,   color: 'text-green-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tab filters */}
        <div className="flex border-b border-slate-100 mb-6">
          {(['pending', 'upcoming', 'completed'] as const).map(opt => {
            const count = opt === 'upcoming' ? upcomingCount : opt === 'pending' ? pendingCount : completedCount;
            const labels: Record<string, string> = { pending: 'Requests', upcoming: 'Upcoming', completed: 'Completed' };
            return (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  filter === opt
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {labels[opt]}
                <span className="ml-1.5 text-xs text-slate-400">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Session list */}
        {loading && requests.length === 0 ? (
          <div className="flex justify-center py-16">
            <LearnPeersLoader size={96} label="Loading sessions…" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-900 mb-1">No {filter} sessions</p>
            <p className="text-xs text-slate-400">Sessions will appear here once they match this filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => {
              const sc = statusConfig[request.status] ?? statusConfig.pending;
              const ready = isSessionReady(request);
              return (
                <div
                  key={request.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                >
                  <div className="p-5">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          <img
                            src={request.studentAvatar || '/default-avatar.png'}
                            alt={request.studentName}
                            className="w-10 h-10 rounded-full object-cover bg-slate-100"
                          />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${sc.dot}`} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900 truncate">{request.studentName}</h3>
                          <p className="text-xs text-slate-500 truncate">{request.subject}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {request.amount != null && (
                          <span className="text-sm font-semibold text-slate-900">${request.amount.toFixed(0)}</span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          <span className={`text-xs font-medium ${sc.text}`}>{sc.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Info row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-3">
                      <span>{formatDate(request.date)}</span>
                      <span>·</span>
                      <span>{request.start_time}</span>
                      <span>·</span>
                      <span>{formatDuration(request.duration)}</span>
                      <span>·</span>
                      <span>Requested {formatTimeAgo(request.requestedAt)}</span>
                    </div>

                    {/* Student note */}
                    {request.message && (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 mb-3">
                        <p className="text-xs text-slate-600 leading-relaxed">&ldquo;{request.message}&rdquo;</p>
                      </div>
                    )}

                    {/* Action */}
                    {request.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDecline(request)}
                          disabled={acting === request.id}
                          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleAccept(request)}
                          disabled={acting === request.id}
                          className={`flex-[1.6] py-2.5 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                            request.isInstant ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-brand-600 hover:bg-brand-700'
                          }`}
                        >
                          {acting === request.id ? '…' : request.isInstant ? 'Accept & Start →' : 'Accept request'}
                        </button>
                      </div>
                    ) : (request.status === 'accepted' || request.status === 'in_progress') && ready ? (
                      <button
                        onClick={() => handleStartSession(request)}
                        disabled={!userInfo}
                        className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {request.status === 'in_progress' ? 'Rejoin Session' : 'Start Session'}
                      </button>
                    ) : request.status === 'accepted' ? (
                      <p className="text-center text-xs text-slate-400 py-1">Starts at {request.start_time?.slice(0, 5)}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredRequests.length > 0 && (
          <p className="text-center text-xs text-slate-400 mt-6">
            {filteredRequests.length} session{filteredRequests.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
