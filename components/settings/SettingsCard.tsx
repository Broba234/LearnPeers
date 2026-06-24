import type { ReactNode } from "react";

/**
 * Consistent, fully dark-aware card shell for Settings sections. Keeps the
 * light/dark surface tokens in one place so every section matches.
 */
export default function SettingsCard({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-ink-800 dark:bg-ink-900 ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-ink-800">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}
