"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export default function ShareButton({ name, className = "" }: { name: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = `${name} on LearnPeers`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `Check out ${name}, a grade-verified tutor on LearnPeers`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* user cancelled share — no-op */
    }
  };

  return (
    <button
      onClick={onShare}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] ${className}`}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
