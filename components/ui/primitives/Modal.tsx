"use client";

import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModalSize = "sm" | "md" | "lg" | "xl";

const SIZES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
};

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  size?: ModalSize;
  /** Close when clicking the dimmed backdrop (default true). */
  closeOnOverlay?: boolean;
  /** Show the top-right close button (default true). */
  showClose?: boolean;
  className?: string;
  /** Extra classes for the dimmed overlay. */
  overlayClassName?: string;
};

/**
 * Accessible modal dialog: portal-rendered, Escape-to-close, backdrop click,
 * body scroll lock, and initial focus. Replaces ad-hoc `fixed inset-0` overlays.
 */
export function Modal({
  isOpen,
  onClose,
  children,
  title,
  size = "lg",
  closeOnOverlay = true,
  showClose = true,
  className,
  overlayClassName,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape to close.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Move focus into the dialog on open.
  useEffect(() => {
    if (isOpen) panelRef.current?.focus();
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return ReactDOM.createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4",
        overlayClassName
      )}
      onClick={closeOnOverlay ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-h-[90vh] overflow-y-auto bg-surface rounded-2xl shadow-2xl focus:outline-none",
          SIZES[size],
          className
        )}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3 border-b border-ink-100">
            <h2 className="text-lg font-bold text-ink-900">{title}</h2>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
