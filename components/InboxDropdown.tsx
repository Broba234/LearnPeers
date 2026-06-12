'use client';

import React, { useState, useEffect } from 'react';

interface SessionRequest {
  id: string;
  studentName: string;
  studentAvatar?: string;
  subject: string;
  requestedAt: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
}

interface InboxDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const InboxDropdown: React.FC<InboxDropdownProps> = ({ isOpen, onClose }) => {
  const [requests, setRequests] = useState<SessionRequest[]>([]);

  useEffect(() => {
    // Mock data - in real app, fetch from API
    const mockRequests: SessionRequest[] = [
      {
        id: '1',
        studentName: 'Alice Johnson',
        studentAvatar: '/avatar1.jpg',
        subject: 'Mathematics',
        requestedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        status: 'pending',
        message: 'Hi! I need help with calculus derivatives. Are you available for a session?'
      },
      {
        id: '2',
        studentName: 'Bob Smith',
        studentAvatar: '/avatar2.jpg',
        subject: 'Physics',
        requestedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        status: 'pending',
        message: 'Need help with quantum mechanics homework. Can we schedule a session?'
      },
      {
        id: '3',
        studentName: 'Carol Davis',
        studentAvatar: '/avatar3.jpg',
        subject: 'Chemistry',
        requestedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        status: 'accepted'
      }
    ];
    setRequests(mockRequests);
  }, []);

  const handleAcceptRequest = (requestId: string) => {
    setRequests(prev => 
      prev.map(req => 
        req.id === requestId ? { ...req, status: 'accepted' } : req
      )
    );
  };

  const handleDeclineRequest = (requestId: string) => {
    setRequests(prev => 
      prev.map(req => 
        req.id === requestId ? { ...req, status: 'declined' } : req
      )
    );
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const hasNewRequests = pendingRequests.length > 0;

  if (!isOpen) return null;

  return (
    <div className="absolute top-full right-0 mt-2 w-96 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 z-50" style={{ boxShadow: '0 8px 32px 0 rgba(31,38,135,0.37)' }}>
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Session Requests</h3>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {hasNewRequests && (
          <p className="text-sm text-brand-400 mt-1">
            {pendingRequests.length} new request{pendingRequests.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {requests.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p>No session requests</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {requests.map((request) => (
              <div key={request.id} className="p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-start gap-3">
                  <img
                    src={request.studentAvatar || "/default-avatar.png"}
                    alt={request.studentName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-white truncate">{request.studentName}</h4>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                        {formatTimeAgo(request.requestedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-brand-400 mb-1">{request.subject}</p>
                    {request.message && (
                      <p className="text-sm text-gray-300 mb-3 line-clamp-2">{request.message}</p>
                    )}
                    
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(request.id)}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    
                    {request.status === 'accepted' && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-green-400">✓ Accepted</span>
                        <button className="px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg transition-colors">
                          Start Session
                        </button>
                      </div>
                    )}
                    
                    {request.status === 'declined' && (
                      <span className="text-sm text-red-400">✗ Declined</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hasNewRequests && (
        <div className="p-4 border-t border-white/10">
          <button className="w-full py-2 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors text-sm">
            View All Requests
          </button>
        </div>
      )}
    </div>
  );
};

export default InboxDropdown; 