'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const NAV = [
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'For tutors', href: '/#features' },
  { label: 'FAQ', href: '/#faq' },
];

function Wordmark({ className = 'h-7' }: { className?: string }) {
  return (
    <span className="flex items-center gap-2">
      <Image
        src="/learnpeers-logo-trimmed.png"
        alt="LearnPeers"
        width={297}
        height={100}
        priority
        className={`${className} w-auto`}
      />
      <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-700 ring-1 ring-brand-200">
        Beta
      </span>
    </span>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileOpen]);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-x-0 top-0 z-[999] px-4 pt-4"
      >
        <div
          className={`mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300 sm:px-5 ${
            scrolled
              ? 'border border-ink-100 bg-white/85 shadow-lg shadow-ink-900/5 backdrop-blur-xl'
              : 'border border-transparent bg-white/40 backdrop-blur-md'
          }`}
        >
          <Link href="/" className="shrink-0 transition hover:opacity-90">
            <Wordmark />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-600 transition hover:bg-brand-50 hover:text-brand-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-ink-700 transition hover:text-brand-700 sm:block"
            >
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="hidden rounded-full bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/25 transition hover:brightness-105 active:scale-[0.98] sm:block"
            >
              Get started
            </Link>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-full p-2 text-ink-700 transition hover:bg-brand-50 md:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <motion.div
        initial={false}
        animate={mobileOpen ? { opacity: 1, pointerEvents: 'auto' } : { opacity: 0, pointerEvents: 'none' }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[998] bg-ink-900/30 backdrop-blur-sm md:hidden"
        onClick={() => setMobileOpen(false)}
      />
      <motion.div
        initial={false}
        animate={mobileOpen ? { x: 0 } : { x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 z-[999] flex h-full w-72 flex-col gap-1 bg-white p-6 pt-20 shadow-2xl md:hidden"
      >
        {NAV.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className="rounded-xl px-4 py-3 text-base font-medium text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
          >
            {item.label}
          </Link>
        ))}
        <div className="mt-4 flex flex-col gap-2 border-t border-ink-100 pt-4">
          <Link
            href="/auth/login"
            onClick={() => setMobileOpen(false)}
            className="rounded-xl px-4 py-3 text-center text-base font-semibold text-ink-700 ring-1 ring-ink-200 transition hover:bg-slate-50"
          >
            Log in
          </Link>
          <Link
            href="/auth/register"
            onClick={() => setMobileOpen(false)}
            className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-3 text-center text-base font-semibold text-white"
          >
            Get started
          </Link>
        </div>
      </motion.div>
    </>
  );
}
