"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Video, BookOpen, User, CalendarClock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Item = { label: string; href: string; icon: LucideIcon };

// Mobile-native bottom tab bar (iOS pattern). Desktop uses the sidebar.
export default function BottomNav({ role }: { role: string }) {
  const pathname = usePathname();
  const r = (role || "student").toLowerCase();

  const items: Item[] =
    r === "tutor"
      ? [
          { label: "Home", href: "/home/tutor", icon: Home },
          { label: "Requests", href: "/home/tutor/sessions", icon: CalendarClock },
          { label: "Courses", href: "/home/tutor/courses", icon: BookOpen },
          { label: "Profile", href: "/home/tutor/profile", icon: User },
        ]
      : [
          { label: "Home", href: "/home/student", icon: Home },
          { label: "Explore", href: "/home/student/explore", icon: Search },
          { label: "Sessions", href: "/home/student/sessions", icon: Video },
          { label: "Profile", href: "/home/student/profile", icon: User },
        ];

  const isActive = (href: string) => {
    const base = `/home/${r}`;
    if (href === base) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex flex-1 flex-col items-center gap-0.5 py-2 pt-2.5"
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-600" />
              )}
              <item.icon
                className={`h-[22px] w-[22px] transition-colors ${
                  active ? "text-brand-600" : "text-slate-400 group-active:text-slate-600"
                }`}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  active ? "text-brand-600" : "text-slate-400"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
