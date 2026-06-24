import React from "react";
import { formatDelta } from "./format";

interface KpiCardProps {
  label: string;
  value: string;
  deltaPct?: number | null;
  /** Secondary line under the value, e.g. "vs prev period" or a sub-stat. */
  hint?: string;
  /** Higher deltaPct is worse (e.g. cancellation rate). Flips colours. */
  invertDelta?: boolean;
  icon?: React.ReactNode;
}

const TONE_CLASSES: Record<string, string> = {
  up: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20",
  down: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
  flat: "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800",
  new: "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20",
};

export default function KpiCard({ label, value, deltaPct, hint, invertDelta, icon }: KpiCardProps) {
  const showDelta = deltaPct !== undefined;
  let delta = showDelta ? formatDelta(deltaPct ?? null) : null;
  if (delta && invertDelta) {
    if (delta.tone === "up") delta = { ...delta, tone: "down" };
    else if (delta.tone === "down") delta = { ...delta, tone: "up" };
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        {icon && <span className="text-gray-300 dark:text-gray-600">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
        {delta && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${TONE_CLASSES[delta.tone]}`}>
            {delta.tone === "up" && "▲"}
            {delta.tone === "down" && "▼"}
            {delta.label}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
  );
}
