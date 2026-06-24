"use client";

import SettingsCard from "./SettingsCard";
import ThemeToggle from "./ThemeToggle";

export default function AppearanceSection() {
  return (
    <div className="space-y-5">
      <SettingsCard title="Theme" description="Choose how LearnPeers looks on this device.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <p className="font-medium text-slate-900 dark:text-slate-100">Appearance</p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              “System” follows your device’s light/dark setting automatically.
            </p>
          </div>
          <ThemeToggle />
        </div>
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-400 dark:bg-ink-800 dark:text-slate-400">
          This preference is saved on this device only. Dark mode is rolling out across the app —
          Settings is fully themed today and other pages are following.
        </p>
      </SettingsCard>
    </div>
  );
}
