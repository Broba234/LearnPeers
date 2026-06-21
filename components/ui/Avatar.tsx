"use client";

import { useState } from "react";

// Branded avatar with a graceful initials fallback when the image is missing or
// fails to load (no dependency on a /default-avatar.png asset).
export default function Avatar({
  src,
  name,
  className = "",
  rounded = "rounded-full",
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials =
    (name || "?")
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 font-semibold text-white ${rounded} ${className}`}
        aria-label={name || "avatar"}
      >
        {initials}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name || "avatar"}
      onError={() => setFailed(true)}
      className={`bg-slate-100 object-cover ${rounded} ${className}`}
    />
  );
}
