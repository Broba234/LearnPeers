"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "brand"
  | "neutral"
  | "success"
  | "warning"
  | "danger";

const TONES: Record<BadgeTone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
  success: "bg-green-50 text-green-700 ring-green-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  danger: "bg-red-50 text-red-700 ring-red-100",
};

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  /** Show a small leading status dot (useful for live/available states). */
  dot?: boolean;
};

/** Small pill for statuses, tags, and labels (e.g. "BETA", session status). */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge({ className, tone = "neutral", dot, children, ...props }, ref) {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
          TONES[tone],
          className
        )}
        {...props}
      >
        {dot && (
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
        )}
        {children}
      </span>
    );
  }
);

export default Badge;
