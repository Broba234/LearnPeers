"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, LogOut, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import SettingsCard from "./SettingsCard";

export default function AccountSection({ email, role }: { email?: string; role?: string }) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : "—";

  return (
    <div className="space-y-5">
      <SettingsCard title="Account" description="The login tied to this account.">
        <dl className="divide-y divide-slate-100 dark:divide-ink-800">
          <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
            <dt className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Mail className="h-4 w-4" /> Email
            </dt>
            <dd className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {email || "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
            <dt className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4" /> Role
            </dt>
            <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">{roleLabel}</dd>
          </div>
        </dl>
      </SettingsCard>

      <SettingsCard title="Security">
        <Link
          href="/auth/update-password"
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:border-ink-700 dark:text-slate-200 dark:hover:bg-ink-800"
        >
          <span className="flex items-center gap-2.5">
            <KeyRound className="h-4 w-4 text-slate-400 dark:text-slate-500" /> Change password
          </span>
          <span className="text-slate-300 dark:text-slate-600">→</span>
        </Link>
      </SettingsCard>

      <button
        onClick={handleSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}
