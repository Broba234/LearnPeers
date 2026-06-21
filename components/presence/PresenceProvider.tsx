"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/presence";

interface PresenceValue {
  /** Whether this user is a tutor (presence only applies to tutors). */
  isTutor: boolean;
  /** Live "Available Now" intent. While true + app open, a heartbeat keeps them online. */
  isAvailableNow: boolean;
  toggling: boolean;
  loaded: boolean;
  /** When they went live (for "online for Xm"). */
  onlineSince: number | null;
  toggle: () => Promise<void>;
  setAvailable: (next: boolean) => Promise<void>;
}

const PresenceContext = createContext<PresenceValue | undefined>(undefined);

export function usePresence() {
  return useContext(PresenceContext);
}

export function PresenceProvider({
  role,
  children,
}: {
  role: string;
  children: ReactNode;
}) {
  const isTutor = (role || "").toLowerCase() === "tutor";
  const [isAvailableNow, setIsAvailableNow] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [onlineSince, setOnlineSince] = useState<number | null>(null);

  // Load initial presence state.
  useEffect(() => {
    if (!isTutor) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user?.email) return;
        const res = await fetch(
          `/api/profiles/get-full?email=${encodeURIComponent(user.email)}`
        );
        if (res.ok && !cancelled) {
          const profile = await res.json();
          const live = !!profile.isAvailableNow;
          setIsAvailableNow(live);
          if (live) setOnlineSince(Date.now());
        }
      } catch {
        /* non-fatal */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTutor]);

  // Heartbeat: while live + app open, ping so we keep showing as online.
  const beatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!isTutor || !isAvailableNow) return;

    const beat = () => {
      fetch("/api/profiles/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ online: true }),
        keepalive: true,
      }).catch(() => {});
    };
    beat();
    beatRef.current = setInterval(beat, HEARTBEAT_INTERVAL_MS);

    // Best-effort: go offline when the tab actually closes.
    const goOfflineBeacon = () => {
      try {
        navigator.sendBeacon(
          "/api/profiles/heartbeat",
          new Blob([JSON.stringify({ online: false })], { type: "application/json" })
        );
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pagehide", goOfflineBeacon);

    return () => {
      if (beatRef.current) clearInterval(beatRef.current);
      window.removeEventListener("pagehide", goOfflineBeacon);
    };
  }, [isTutor, isAvailableNow]);

  const setAvailable = useCallback(
    async (next: boolean) => {
      if (!isTutor) return;
      setToggling(true);
      // optimistic
      setIsAvailableNow(next);
      setOnlineSince(next ? Date.now() : null);
      try {
        const res = await fetch("/api/profiles/update-availability", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isAvailableNow: next }),
        });
        if (!res.ok) {
          throw new Error((await res.json().catch(() => ({})))?.error || "Failed");
        }
        const data = await res.json();
        setIsAvailableNow(!!data.isAvailableNow);
        if (next) toast.success("You're live — students can connect with you now.");
        else toast("You're offline.");
      } catch (e: any) {
        // revert
        setIsAvailableNow(!next);
        setOnlineSince(!next ? Date.now() : null);
        toast.error(e?.message || "Could not update availability");
      } finally {
        setToggling(false);
      }
    },
    [isTutor]
  );

  const toggle = useCallback(() => setAvailable(!isAvailableNow), [isAvailableNow, setAvailable]);

  return (
    <PresenceContext.Provider
      value={{ isTutor, isAvailableNow, toggling, loaded, onlineSince, toggle, setAvailable }}
    >
      {children}
    </PresenceContext.Provider>
  );
}
