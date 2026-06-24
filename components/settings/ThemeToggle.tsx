"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  getStoredTheme,
  setTheme,
  watchSystemTheme,
  THEME_EVENT,
  type ThemeChoice,
} from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

// Read the stored choice via an external store so server and client agree during
// hydration (server snapshot is "system"), then reconcile to the real value —
// no hydration mismatch, no setState-in-effect.
function subscribe(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export default function ThemeToggle() {
  const choice = useSyncExternalStore<ThemeChoice>(
    subscribe,
    getStoredTheme,
    () => "system",
  );

  // Keep the <html> class in sync with the OS while the user is on "system".
  useEffect(() => watchSystemTheme(), []);

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-ink-700 dark:bg-ink-800"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = choice === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-white text-brand-600 shadow-sm dark:bg-ink-950 dark:text-brand-300"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
