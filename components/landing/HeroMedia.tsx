'use client';

import { useEffect, useState } from 'react';
import { PenLine, Video, Users, Wallet } from 'lucide-react';

/**
 * Hero visual. The branded product mock always renders as the base, so the
 * hero is never blank. If you drop a real clip at `public/hero.webm` or
 * `public/hero.mp4` (e.g. a Higgsfield render), it is detected on mount and
 * overlaid automatically — no code changes needed.
 */
export default function HeroMedia() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const url of ['/hero.webm', '/hero.mp4']) {
        try {
          const res = await fetch(url, { method: 'HEAD' });
          const type = res.headers.get('content-type') || '';
          if (res.ok && type.startsWith('video')) {
            if (!cancelled) setVideoSrc(url);
            return;
          }
        } catch {
          /* ignore — fall through to the mock */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-300/30 via-brand-100/20 to-ink-200/20 blur-3xl" />

      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-2xl shadow-ink-900/10 ring-1 ring-black/5 backdrop-blur">
        {/* base — always present */}
        <ProductMock />

        {/* optional real clip, revealed only once it can actually play */}
        {videoSrc && (
          <video
            key={videoSrc}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              ready ? 'opacity-100' : 'opacity-0'
            }`}
            autoPlay
            muted
            loop
            playsInline
            onCanPlay={() => setReady(true)}
            onError={() => {
              setReady(false);
              setVideoSrc(null);
            }}
          >
            <source src={videoSrc} type={videoSrc.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
          </video>
        )}
      </div>
    </div>
  );
}

/** Branded fallback: a stylised live-session UI echoing the logo's node motif. */
function ProductMock() {
  return (
    <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900 p-5">
      <svg className="pointer-events-none absolute right-6 top-6 h-24 w-24 opacity-60" viewBox="0 0 100 100" fill="none">
        <line x1="20" y1="80" x2="55" y2="45" stroke="#1f9fe0" strokeWidth="2" />
        <line x1="55" y1="45" x2="80" y2="70" stroke="#1f9fe0" strokeWidth="2" />
        <circle cx="20" cy="80" r="6" fill="#1f9fe0" />
        <circle cx="55" cy="45" r="8" fill="#ffffff" />
        <circle cx="80" cy="70" r="6" fill="#1f9fe0" />
      </svg>

      <div className="mb-4 flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-white/20" />
        <span className="h-3 w-3 rounded-full bg-white/20" />
        <span className="h-3 w-3 rounded-full bg-white/20" />
        <span className="ml-3 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/60">
          learnpeers.com/session
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1 space-y-3">
          <div className="relative flex aspect-square items-end justify-start overflow-hidden rounded-xl bg-gradient-to-br from-brand-500/40 to-brand-700/40 p-2 ring-1 ring-white/10">
            <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-[9px] font-medium text-white/80">
              Maya · tutor
            </span>
          </div>
          <div className="relative flex aspect-square items-end justify-start overflow-hidden rounded-xl bg-gradient-to-br from-ink-500/40 to-ink-700/50 p-2 ring-1 ring-white/10">
            <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-[9px] font-medium text-white/80">
              You
            </span>
          </div>
        </div>

        <div className="col-span-2 rounded-xl bg-white/95 p-3 ring-1 ring-white/20">
          <div className="mb-2 flex items-center gap-1.5 text-ink-400">
            <PenLine className="h-3.5 w-3.5" />
            <span className="text-[10px] font-medium">Shared whiteboard</span>
          </div>
          <div className="space-y-2">
            <div className="h-2 w-3/4 rounded-full bg-brand-200" />
            <div className="h-2 w-1/2 rounded-full bg-ink-200" />
            <svg viewBox="0 0 200 80" className="h-16 w-full">
              <path d="M10 60 Q60 10 100 40 T190 30" stroke="#0077be" strokeWidth="3" fill="none" strokeLinecap="round" />
              <circle cx="100" cy="40" r="4" fill="#243036" />
              <circle cx="190" cy="30" r="4" fill="#0077be" />
            </svg>
            <div className="h-2 w-2/3 rounded-full bg-brand-100" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        {[Video, Users, PenLine, Wallet].map((Icon, i) => (
          <div
            key={i}
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              i === 0 ? 'bg-brand-600 text-white' : 'bg-white/10 text-white/70'
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
