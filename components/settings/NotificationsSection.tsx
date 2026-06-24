"use client";

import { useEffect, useState } from "react";
import { Bell, Mail, School, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import SettingsCard from "./SettingsCard";

type Prefs = {
  enabled: boolean;
  target: string;
  accountEmail: string;
  schoolEmail: string | null;
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-brand-600" : "bg-slate-300 dark:bg-ink-700"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function NotificationsSection({ role }: { role?: string }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profiles/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPrefs(d))
      .catch(() => {});
  }, []);

  const save = async (next: Partial<Pick<Prefs, "enabled" | "target">>) => {
    if (!prefs) return;
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    setSaving(true);
    try {
      const res = await fetch("/api/profiles/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: merged.enabled, target: merged.target }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Couldn't save — try again");
    } finally {
      setSaving(false);
    }
  };

  if (!prefs) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const isTutor = role?.toLowerCase() === "tutor";
  // Routing only matters for tutors who have a verified school email.
  const canRoute = isTutor && !!prefs.schoolEmail;

  const options = [
    { value: "account", label: "Personal email", sub: prefs.accountEmail, icon: <Mail className="h-4 w-4" /> },
    { value: "school", label: "School email", sub: prefs.schoolEmail || "", icon: <School className="h-4 w-4" /> },
    { value: "both", label: "Both", sub: "Send to both addresses", icon: <Bell className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-5">
      <SettingsCard
        title="Notifications"
        description={
          isTutor
            ? "Get an email when a student requests a session with you."
            : "Get an email about your sessions and requests."
        }
      >
        <label className="flex cursor-pointer items-center justify-between gap-4 py-1">
          <span className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
            <Bell className="h-4 w-4 text-slate-400" />
            {isTutor ? "Email me about session requests" : "Email me about my sessions"}
          </span>
          <Toggle checked={prefs.enabled} onChange={(v) => save({ enabled: v })} />
        </label>
      </SettingsCard>

      {prefs.enabled && (
        <SettingsCard
          title="Where should we send them?"
          description={canRoute ? "Choose which inbox gets your notifications." : undefined}
        >
          {canRoute ? (
            <div className="space-y-2">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => save({ target: opt.value })}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    prefs.target === opt.value
                      ? "border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/30"
                      : "border-slate-200 hover:bg-slate-50 dark:border-ink-700 dark:hover:bg-ink-800"
                  }`}
                >
                  <span className="text-slate-400">{opt.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                      {opt.label}
                    </span>
                    {opt.sub && (
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                        {opt.sub}
                      </span>
                    )}
                  </span>
                  {prefs.target === opt.value && <Check className="h-4 w-4 text-brand-600" />}
                </button>
              ))}
            </div>
          ) : (
            <p className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Mail className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                Sent to{" "}
                <strong className="text-slate-700 dark:text-slate-200">{prefs.accountEmail}</strong>.
                {isTutor && " Verify your school email on your profile to route notifications there."}
              </span>
            </p>
          )}
        </SettingsCard>
      )}

      {saving && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </p>
      )}
    </div>
  );
}
