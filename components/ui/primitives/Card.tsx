"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Adds hover elevation + cursor for clickable cards. */
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
};

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
} as const;

/**
 * Elevated surface used for the app's many white panels/cards.
 * Standardizes radius (2xl), border (ink-100), and shadow.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, interactive, padding = "md", ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "bg-surface rounded-2xl border border-ink-100 shadow-sm",
        interactive &&
          "transition-shadow hover:shadow-md hover:border-ink-200 cursor-pointer",
        PADDING[padding],
        className
      )}
      {...props}
    />
  );
});

export default Card;
