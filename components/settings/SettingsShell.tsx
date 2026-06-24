"use client";

import { useCallback, useSyncExternalStore, type ReactNode } from "react";

export type SettingsTab = {
  id: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
};

// Same-document signal that the active tab changed (history.replaceState alone
// doesn't notify anyone).
const TAB_EVENT = "settingstabchange";

function readTab(tabs: SettingsTab[]): string {
  const requested = new URLSearchParams(window.location.search).get("tab");
  if (requested && tabs.some((t) => t.id === requested)) return requested;
  return tabs[0]?.id ?? "";
}

/**
 * Tabbed Settings layout. Fully themed for light/dark. The active tab is driven
 * by the URL (?tab=…) so links like /home/tutor/settings?tab=profile deep-link
 * correctly. Reading it through useSyncExternalStore keeps SSR (always the first
 * tab) and client hydration in agreement — the URL tab is reconciled right after
 * hydration with no mismatch — and avoids pulling in useSearchParams (which would
 * force a Suspense boundary).
 */
export default function SettingsShell({ tabs }: { tabs: SettingsTab[] }) {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener("popstate", onChange);
    window.addEventListener(TAB_EVENT, onChange);
    return () => {
      window.removeEventListener("popstate", onChange);
      window.removeEventListener(TAB_EVENT, onChange);
    };
  }, []);

  const active = useSyncExternalStore(
    subscribe,
    () => readTab(tabs),
    () => tabs[0]?.id ?? "",
  );

  const select = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url.toString());
    window.dispatchEvent(new Event(TAB_EVENT));
  };

  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-ink-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Settings</h1>
          <p className="mt-0.5 text-sm text-slate-400 dark:text-slate-500">
            Manage your profile, appearance, and account.
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-[12rem_1fr] lg:gap-8">
          {/* Section nav — horizontal on mobile, vertical rail on desktop */}
          <nav
            aria-label="Settings sections"
            className="mb-6 flex gap-1 overflow-x-auto scrollbar-hide lg:mb-0 lg:flex-col lg:overflow-visible"
          >
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab?.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => select(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex flex-shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-ink-800 dark:hover:text-slate-200"
                  }`}
                >
                  <span className="flex-shrink-0">{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Active section */}
          <div className="min-w-0">{activeTab?.content}</div>
        </div>
      </div>
    </div>
  );
}
