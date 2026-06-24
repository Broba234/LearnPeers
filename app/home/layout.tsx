"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import HomeSidebar from "@/components/ui/components/DashboardSidebar";
import LearnPeersLoader from "@/components/ui/LearnPeersLoader";
import TutorProfileBubble from "@/components/ui/components/UserProfile/TutorProfileBubble";
import { PresenceProvider } from "@/components/presence/PresenceProvider";
import PresencePill from "@/components/presence/PresencePill";
import IncomingRequestOverlay from "@/components/session/IncomingRequestOverlay";
import ConnectNowModal from "@/components/session/ConnectNowModal";
import NotificationDropdown from "@/components/ui/components/header/NotificationDropdown";
import BottomNav from "@/components/ui/BottomNav";
import AccountEmailGate from "@/components/auth/AccountEmailGate";
import TermsGate from "@/components/legal/TermsGate";


import { TutorProfileModalContext } from "@/components/ui/components/common/TutorProfileModalContext";
import { toast } from "sonner";

export default function HomeLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<any>(null);
  const [fullTutorProfile, setFullTutorProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Booking modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingTutor, setBookingTutor] = useState<any>(null);
  const [bookingTopic, setBookingTopic] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Connect-now (instant live session) modal state
  const [connectNowOpen, setConnectNowOpen] = useState(false);
  const [connectTutor, setConnectTutor] = useState<any>(null);

  const openConnectNow = (tutor: any) => {
    setConnectTutor(tutor);
    setConnectNowOpen(true);
  };

  const openTutorProfileModal = async (tutor: any) => {
    setProfileModalOpen(true);
    setSelectedTutor(tutor);
    setProfileLoading(true);
    setFullTutorProfile(null);
    try {
      if (!tutor?.email) {
        setFullTutorProfile(tutor);
        setProfileLoading(false);
        return;
      }
      const url = `/api/profiles/get-full?email=${encodeURIComponent(tutor.email)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFullTutorProfile({
          ...data,
          availableSlots: data.availableSlots ?? tutor.availableSlots,
        });
      } else {
        setFullTutorProfile(tutor);
      }
    } catch (e) {
      setFullTutorProfile(tutor);
    }
    setProfileLoading(false);
  };

  const handleBookSession = (tutor: any) => {
    setProfileModalOpen(false); // Close profile modal
    setBookingTutor(tutor);
    setBookingModalOpen(true);
    
    // Pre-fill topic with tutor's subjects if available
    if (tutor.subjects && tutor.subjects.length > 0) {
      setBookingTopic(`Help with ${tutor.subjects[0].name}`);
    } else {
      setBookingTopic("");
    }
    setBookingNotes("");
  };

  const cancelBooking = () => {
    setBookingModalOpen(false);
    setBookingTutor(null);
    setBookingTopic("");
    setBookingNotes("");
  };

  // Handle Stripe 3DS payment return
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const paymentIntent = params.get("payment_intent");
    const redirectStatus = params.get("redirect_status");
    if (paymentIntent && redirectStatus === "succeeded") {
      fetch("/api/stripe/complete-payment-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_intent_id: paymentIntent }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            toast.success("Payment successful! Your session has been booked.");
          } else {
            toast.error(data.error || "Payment confirmation failed.");
          }
        })
        .catch(() => toast.error("Failed to confirm payment."))
        .finally(() => {
          window.history.replaceState({}, "", window.location.pathname);
        });
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // A just-registered user can land here a beat before the auth session is
        // readable. Poll the local session (no network round-trip) briefly so a
        // fresh sign-up flows into onboarding instead of bouncing to /auth/login.
        let user = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) { user = session.user; break; }
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        if (!user) {
          router.push("/auth/login");
          return;
        }
        // The profile row is created during registration; under connection-pool
        // read-after-write lag the first read can 404, so retry before bouncing.
        let profileRes = await fetch(`/api/profiles/get?email=${encodeURIComponent(user.email!)}`);
        for (let attempt = 0; attempt < 3 && profileRes.status === 404; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 800));
          profileRes = await fetch(`/api/profiles/get?email=${encodeURIComponent(user.email!)}`);
        }
        if (!profileRes.ok) {
          router.push("/auth/login");
          return;
        }
        const profile = await profileRes.json();
        const fullProfileRes = await fetch(`/api/profiles/get-full?email=${encodeURIComponent(user.email!)}`);
        if (fullProfileRes.ok) {
          const fullProfile = await fullProfileRes.json();
          setUserName(fullProfile.name || user.email?.split('@')[0] || "User");
        } else {
          setUserName(user.email?.split('@')[0] || "User");
        }
        setUserRole(profile.role);
        setUserId(user.id); // Store the user ID
        setLoading(false);
      } catch (error) {
        router.push("/auth/login");
      }
    };
    fetchProfile();
  }, [router]);

  if (loading) {
    return <LearnPeersLoader fullScreen />;
  }
  if (!userRole || !userName) {
    return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
          <div className="text-sm text-slate-400">Redirecting...</div>
        </div>
    );
  }

  return (
    <PresenceProvider role={userRole}>
    <TutorProfileModalContext.Provider value={{ openTutorProfileModal, openConnectNow }}>
      <>
        <TermsGate />
        {/* Mobile top bar */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/10 backdrop-blur-md border-b border-white/20 px-4 py-3 flex items-center justify-between" style={{
          boxShadow: '0 8px 32px 0 rgba(31,38,135,0.25)'
        }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-brand-400 to-brand-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="text-white font-semibold tracking-tight">LearnPeers</div>
          </div>
          <div className="flex items-center gap-2">
            <PresencePill />
            <NotificationDropdown />
            <button
              aria-label="Open sidebar menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(v => !v)}
              className="inline-flex flex-col items-center justify-center w-9 h-9 rounded-full bg-white/80 border border-white/40 shadow hover:bg-white"
            >
              <span className="block w-5 h-0.5 bg-gray-800" />
              <span className="block w-5 h-0.5 bg-gray-800 mt-1.5" />
              <span className="block w-5 h-0.5 bg-gray-800 mt-1.5" />
            </button>
          </div>
        </div>

        {/* Desktop global cluster: presence toggle + notifications, fixed top-right */}
        <div className="hidden lg:flex items-center gap-3 fixed top-4 right-5 z-40">
          <PresencePill />
          <NotificationDropdown />
        </div>

        <div className="flex h-screen pt-14 lg:pt-0 bg-slate-50">
          {/* Sidebar: desktop */}
          <div className="hidden lg:block">
            <HomeSidebar userRole={userRole} userName={userName} />
          </div>
          <main className="flex-1 overflow-y-auto relative">
            <div className="pb-20 lg:pb-0">
              <AccountEmailGate />
              {children}
            </div>
          </main>
        </div>

        {/* Mobile bottom tab bar */}
        <BottomNav role={userRole} />

        {/* Sidebar drawer: mobile */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute top-0 left-0 h-full w-64 max-w-[85vw] shadow-2xl">
              <HomeSidebar userRole={userRole} userName={userName} />
            </div>
          </div>
        )}
        {/* Modal overlay is now outside the flex container, so sidebar is never blurred */}
        {profileModalOpen && (
          profileLoading ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="text-white text-xl font-bold">Loading profile...</div>
            </div>
          ) : (
            <TutorProfileBubble
              tutor={selectedTutor || fullTutorProfile}
              userId={userId}
              isOpen={profileModalOpen}
              onClose={() => setProfileModalOpen(false)}
              onBookSession={handleBookSession}
              onConnectNow={(t: any) => { setProfileModalOpen(false); openConnectNow(t); }}
            />
          )
        )}

        {/* Global tutor incoming-call ring */}
        <IncomingRequestOverlay enabled={userRole?.toLowerCase() === "tutor"} />

        {/* Student connect-now (instant live session) */}
        <ConnectNowModal
          tutor={connectTutor}
          isOpen={connectNowOpen}
          onClose={() => { setConnectNowOpen(false); setConnectTutor(null); }}
        />
      </>
    </TutorProfileModalContext.Provider>
    </PresenceProvider>
  );
}
