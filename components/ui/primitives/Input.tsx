"use client";

import React from "react";
import { cn } from "@/lib/utils";

const FIELD_BASE =
  "w-full bg-white border border-ink-200 rounded-xl px-4 py-3 text-ink-900 placeholder-ink-400 transition-all focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:opacity-60 disabled:bg-ink-50";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          FIELD_BASE,
          invalid && "border-red-400 focus:border-red-500 focus:ring-red-100",
          className
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
    );
  }
);

export type TextareaProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    invalid?: boolean;
  };

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          FIELD_BASE,
          "resize-y min-h-[96px]",
          invalid && "border-red-400 focus:border-red-500 focus:ring-red-100",
          className
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
    );
  }
);

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  function Label({ className, ...props }, ref) {
    return (
      <label
        ref={ref}
        className={cn(
          "block text-sm font-medium text-ink-700 mb-1.5",
          className
        )}
        {...props}
      />
    );
  }
);

export default Input;
