"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import LiveKitRoom from "@/components/LiveKitRoom";
import { toast } from "sonner";

export default function SessionRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params?.id;

  const [identity, setIdentity] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("User");
  const [role, setRole] = useState<"tutor" | "student" | "admin" | "">("");
  const [otherParty, setOtherParty] = useState<{ name?: string | null; avatar?: string | null } | null>(null);
  const [topic, setTopic] = useState<string>("");
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }
        setIdentity(user.id);

        // Verify the caller actually belongs to this session (and grab context).
        const statusRes = await fetch(`/api/sessions/status?sessionId=${encodeURIComponent(sessionId!)}`);
        if (statusRes.status === 403 || statusRes.status === 404) {
          setDenied(true);
          toast.error("You don't have access to this session.");
          setTimeout(() => router.push("/home"), 1500);
          return;
        }
        let viewerRole: "tutor" | "student" = "student";
        if (statusRes.ok) {
          const { session, viewerRole: vr } = await statusRes.json();
          viewerRole = vr;
          setTopic(session.topic || "");
          setOtherParty(vr === "tutor" ? session.student : session.tutor);
        }

        const res = await fetch(`/api/profiles/get-full?email=${encodeURIComponent(user.email!)}`);
        if (res.ok) {
          const profile = await res.json();
          setDisplayName(profile.name || user.email?.split("@")[0] || "User");
          setRole((profile.role || viewerRole) as any);
        } else {
          setDisplayName(user.email?.split("@")[0] || "User");
          setRole(viewerRole);
        }
        setReady(true);
      } catch (e) {
        router.push("/auth/login");
      }
    };
    if (sessionId) init();
  }, [router, sessionId]);

  if (!sessionId) return null;

  if (denied) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-lg font-semibold">Access denied</p>
          <p className="text-sm text-white/60 mt-1">Returning you home…</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center text-center">
          <div className="relative inline-flex items-center justify-center mb-5">
            <span className="absolute w-20 h-20 rounded-full bg-emerald-400/20 animate-ping" />
            <img
              src={otherParty?.avatar || "/default-avatar.png"}
              alt=""
              className="relative w-16 h-16 rounded-full object-cover ring-2 ring-emerald-400/50 bg-slate-800"
            />
          </div>
          <p className="text-base font-semibold">
            Joining {otherParty?.name ? `your session with ${otherParty.name}` : "your session"}…
          </p>
          {topic && <p className="text-sm text-white/50 mt-1">{topic}</p>}
        </div>
      </div>
    );
  }

  const roomName = `session-${sessionId}`;

  return (
    <LiveKitRoom
      roomName={roomName}
      userIdentity={identity}
      userName={displayName}
      userRole={(role === "tutor" ? "tutor" : "student") as any}
      onDisconnect={async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }
        // Only the tutor formally completes the session and updates backend status.
        if (role === "tutor") {
          const res = await fetch(`/api/sessions/update-status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, status: 'completed' }),
          });
          if (!res.ok) {
            console.error('Failed to update session status');
          }
        }
        router.push(`/home/${role || "student"}`);
      }}
      isOpen={true}
    />
  );
}
