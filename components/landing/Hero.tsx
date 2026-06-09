'use client';

import { useRef } from 'react';
import Link from 'next/link';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from 'framer-motion';
import { ArrowRight, GraduationCap, Sparkles } from 'lucide-react';
import HeroMedia from './HeroMedia';
import ParallaxNodes, { type ParallaxItem } from './ParallaxNodes';

const HERO_NODES: ParallaxItem[] = [
  // left edge — large/soft (far, slow) then smaller (near, fast)
  { className: 'absolute -left-10 top-24 h-56 w-56 rotate-[-14deg] opacity-[0.2] blur-[4px]', travel: 50 },
  { className: 'absolute left-[3%] bottom-16 hidden h-28 w-28 rotate-[18deg] opacity-[0.16] blur-[2px] sm:block', travel: 110 },
  // right edge
  { className: 'absolute -right-12 top-[28%] h-64 w-64 rotate-[10deg] opacity-[0.18] blur-[5px]', travel: 40 },
  { className: 'absolute right-[5%] bottom-24 hidden h-24 w-24 -rotate-[10deg] opacity-[0.16] blur-[2px] md:block', travel: 130 },
];

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.21, 0.5, 0.36, 1] as const },
});

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const smooth = useSpring(scrollYProgress, { stiffness: 55, damping: 22, mass: 0.5 });
  const copyY = useTransform(smooth, [0, 1], [0, -40]);
  const mediaY = useTransform(smooth, [0, 1], [0, -100]);

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden bg-gradient-to-b from-white via-brand-50/40 to-white"
    >
      {/* ambient brand blobs */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage: `radial-gradient(at 12% 8%, rgba(0,119,190,0.14) 0px, transparent 45%),
            radial-gradient(at 88% 0%, rgba(36,48,54,0.10) 0px, transparent 40%),
            radial-gradient(at 50% 100%, rgba(0,119,190,0.08) 0px, transparent 55%)`,
        }}
      />

      <ParallaxNodes items={HERO_NODES} offset={['start start', 'end start']} />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-12 px-5 pb-16 pt-32 sm:px-8 lg:flex-row lg:gap-16 lg:pb-24 lg:pt-40">
        {/* Copy — slower layer */}
        <motion.div
          style={reduce ? undefined : { y: copyY, willChange: 'transform' }}
          className="flex-1 text-center lg:text-left"
        >
          <motion.div {...fade(0)} className="mb-5 flex justify-center lg:justify-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              Now in beta testing - give us feedback!
            </span>
          </motion.div>

          <motion.h1
            {...fade(0.08)}
            className="text-balance text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl lg:text-6xl lg:leading-[1.05]"
          >
            Learn from the student who{' '}
            <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
              aced it
            </span>
            .
          </motion.h1>

          <motion.p
            {...fade(0.16)}
            className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-ink-500 sm:text-lg lg:mx-0"
          >
            Get matched with students a year or two ahead — the ones who scored 90+ in your
            exact course.
          </motion.p>

          <motion.div
            {...fade(0.24)}
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
          >
            <Link
              href="/home/student/explore"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 ring-1 ring-white/20 transition hover:shadow-xl hover:shadow-brand-600/30 hover:brightness-[1.04] active:scale-[0.98] sm:w-auto sm:text-base"
            >
              Find a tutor
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/auth/register?role=tutor"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-ink-200 bg-white px-6 py-3.5 text-sm font-semibold text-ink-800 shadow-sm transition hover:border-brand-300 hover:bg-brand-50/50 active:scale-[0.98] sm:w-auto sm:text-base"
            >
              <GraduationCap className="h-5 w-5 text-brand-600" />
              Become a tutor
            </Link>
          </motion.div>

          <motion.div
            {...fade(0.32)}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-400 lg:justify-start"
          >
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Live 1-on-1 video
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Shared whiteboard
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Secure payments
            </span>
          </motion.div>
        </motion.div>

        {/* Visual — faster layer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.21, 0.5, 0.36, 1] }}
          className="w-full max-w-xl flex-1"
        >
          <motion.div style={reduce ? undefined : { y: mediaY, willChange: 'transform' }}>
            <HeroMedia />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
