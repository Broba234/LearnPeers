"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  hasNotification?: boolean;
  soon?: boolean;
}

interface HomeSidebarProps {
  userRole: string;
  userName: string;
}

type TierKey = "bronze" | "silver" | "gold" | "platinum" | "diamond";

interface Standing {
  totalXp: number;
  league: TierKey;
  level: { level: number; progress: number; toNext: number };
  overallRating: number | null;
  totalSessions: number;
}

const TIER_STYLES: Record<TierKey, { label: string; pill: string; bar: string; glow: string }> = {
  bronze:   { label: "Bronze",   pill: "bg-amber-100 text-amber-700",   bar: "bg-amber-400",   glow: "shadow-amber-200" },
  silver:   { label: "Silver",   pill: "bg-slate-100 text-slate-500",   bar: "bg-slate-400",   glow: "shadow-slate-200" },
  gold:     { label: "Gold",     pill: "bg-yellow-100 text-yellow-700", bar: "bg-yellow-400",  glow: "shadow-yellow-200" },
  platinum: { label: "Platinum", pill: "bg-teal-100 text-teal-700",     bar: "bg-teal-400",    glow: "shadow-teal-200" },
  diamond:  { label: "Diamond",  pill: "bg-blue-100 text-blue-700",     bar: "bg-blue-500",    glow: "shadow-blue-200" },
};

export default function HomeSidebar({ userRole, userName }: HomeSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [standing, setStanding] = useState<Standing | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close the user popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch standing for tutors
  useEffect(() => {
    if (userRole.toLowerCase() !== "tutor") return;
    fetch("/api/courses/portfolio")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.standing) setStanding(data.standing);
      })
      .catch(() => {});
  }, [userRole]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const getNavItems = (): NavItem[] => {
    const commonItems = [
      {
        label: "Overview",
        href: `/home/${userRole.toLowerCase()}`,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
    ];

    const roleSpecificItems: { [key: string]: NavItem[] } = {
      student: [
        {
          label: "Explore",
          href: "/home/student/explore",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          ),
        },
        {
          label: "Sessions",
          href: "/home/student/sessions",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          label: "Profile",
          href: "/home/student/profile",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
        },
        {
          label: "My Courses",
          href: "/home/student/courses",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          label: "Assignments",
          href: "/home/student/assignments",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          ),
          soon: true,
        },
      ],
      tutor: [
        {
          label: "Sessions",
          href: "/home/tutor/sessions",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          label: "Courses",
          href: "/home/tutor/courses",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          label: "Availability",
          href: "/home/tutor/availability",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          label: "Profile",
          href: "/home/tutor/profile",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
        },
        {
          label: "Earnings",
          href: "/home/tutor/earnings",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
      admin: [
        {
          label: "Users",
          href: "/home/admin/users",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          label: "Courses",
          href: "/home/admin/courses",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          label: "Settings",
          href: "/home/admin/settings",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
      ],
    };

    return [...commonItems, ...(roleSpecificItems[userRole.toLowerCase()] || [])];
  };

  const navItems = getNavItems();
  const activeItems = navItems.filter(i => !i.soon);
  const soonItems = navItems.filter(i => i.soon);

  const tierStyle = standing ? TIER_STYLES[standing.league] : null;

  return (
    <div className={`flex flex-col h-screen bg-white border-r border-slate-100 transition-all duration-300 ease-in-out ${isCollapsed ? "w-16" : "w-56"}`}>

      {/* ── Profile card (top) ── */}
      <div className={`relative border-b border-slate-100 flex-shrink-0 ${isCollapsed ? "px-2 py-3" : "px-3 pt-4 pb-3"}`}>
        {/* Collapse toggle — top-right corner */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-3 right-2 w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors z-10"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        {/* User trigger (opens sign-out popup) */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
            title={isCollapsed ? userName : undefined}
            className={`w-full rounded-xl transition-colors hover:bg-slate-50 ${isCollapsed ? "flex justify-center py-1" : "flex items-center gap-2.5 px-2 py-1.5 text-left"}`}
          >
            {/* Avatar */}
            <div className={`rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold flex-shrink-0 ${isCollapsed ? "w-8 h-8 text-sm" : "w-9 h-9 text-sm"}`}>
              {userName.charAt(0).toUpperCase()}
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate leading-tight">{userName}</p>
                <p className="text-xs text-slate-400 capitalize">{userRole}</p>
              </div>
            )}
          </button>

          {/* Sign-out popup — opens downward */}
          {isUserMenuOpen && (
            <div
              role="menu"
              className={`absolute top-full mt-1.5 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg z-50 ${isCollapsed ? "left-0" : "left-0 right-0"}`}
            >
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900 truncate">{userName}</p>
                <p className="text-xs text-slate-400 capitalize">{userRole}</p>
              </div>
              <button
                onClick={handleSignOut}
                role="menuitem"
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>

        {/* Tier / level card — tutor only, expanded only */}
        {!isCollapsed && standing && tierStyle && (
          <div className={`mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${tierStyle.pill}`}>
                {tierStyle.label}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Lv {standing.level.level}
              </span>
            </div>
            {/* XP progress bar */}
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${tierStyle.bar}`}
                style={{ width: `${standing.level.progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-slate-400">{standing.totalXp} XP</span>
              <span className="text-[10px] text-slate-400">{standing.level.toNext} to next</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-0.5">
        {!isCollapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Menu</p>
        )}

        {activeItems.map((item) => {
          const isActive =
            item.href === `/home/${userRole.toLowerCase()}`
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors relative ${
                isActive
                  ? "bg-brand-50 text-brand-600 font-medium"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!isCollapsed && <span>{item.label}</span>}
              {!isCollapsed && item.hasNotification && userRole === "tutor" && (
                <span className="ml-auto w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Link>
          );
        })}

        {soonItems.length > 0 && (
          <>
            {!isCollapsed && (
              <p className="px-3 pt-4 pb-2 text-[10px] font-semibold text-slate-300 uppercase tracking-widest">Coming soon</p>
            )}
            {isCollapsed && <div className="my-2 mx-3 h-px bg-slate-100" />}
            {soonItems.map((item) => (
              <div
                key={item.href}
                title={isCollapsed ? `${item.label} (soon)` : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-300 cursor-default select-none ${isCollapsed ? "justify-center" : ""}`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!isCollapsed && (
                  <>
                    <span>{item.label}</span>
                    <span className="ml-auto text-[10px] font-medium text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded-md">soon</span>
                  </>
                )}
              </div>
            ))}
          </>
        )}
      </nav>

      {/* ── Logo (bottom) ── */}
      <div className="px-3 py-3 border-t border-slate-100 flex-shrink-0">
        {!isCollapsed ? (
          <Link href={`/home/${userRole.toLowerCase()}`} aria-label="LearnPeers home">
            <Image
              src="/learnpeers-logo-trimmed.png"
              alt="LearnPeers"
              width={297}
              height={100}
              className="h-5 w-auto opacity-60 hover:opacity-90 transition-opacity"
            />
          </Link>
        ) : (
          <div className="flex justify-center">
            <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">LP</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
