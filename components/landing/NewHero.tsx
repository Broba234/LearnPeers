'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Users,
  GraduationCap,
  ArrowRight,
  Video,
  Wallet,
  MonitorPlay,
} from 'lucide-react';
import StudentIllustration from './illustrations/StudentIllustration';
import TutorIllustration from './illustrations/TutorIllustration';

const linkPrimaryStudent =
  'group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20 transition hover:shadow-xl hover:shadow-blue-500/30 hover:brightness-[1.03] active:scale-[0.98] sm:text-base';
const linkSecondaryStudent =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white/90 px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition hover:border-blue-300 hover:bg-white hover:shadow-md active:scale-[0.98] sm:text-base';
const linkPrimaryTutor =
  'group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-purple-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 ring-1 ring-white/20 transition hover:shadow-xl hover:shadow-violet-500/30 hover:brightness-[1.03] active:scale-[0.98] sm:text-base';
const linkSecondaryTutor =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white/90 px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition hover:border-violet-300 hover:bg-white hover:shadow-md active:scale-[0.98] sm:text-base';

export default function NewHero() {
  const [activeSection, setActiveSection] = useState<'student' | 'tutor'>('student');

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSection((prev) => (prev === 'student' ? 'tutor' : 'student'));
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  const handleSectionChange = (section: 'student' | 'tutor') => {
    if (section !== activeSection) {
      setActiveSection(section);
    }
  };

  return (
    <section className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-slate-50 via-[#f0f6ff] to-[#e8efff]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(at 0% 0%, rgb(147 197 253 / 0.45) 0px, transparent 50%),
            radial-gradient(at 100% 20%, rgb(196 181 253 / 0.35) 0px, transparent 45%),
            radial-gradient(at 50% 100%, rgb(186 230 253 / 0.25) 0px, transparent 55%)`,
        }}
      />
      <div className="absolute -top-10 left-0 h-[280px] w-[280px] opacity-40 sm:-top-16 sm:h-[400px] sm:w-[400px] md:h-[500px] md:w-[500px] lg:h-[600px] lg:w-[600px]">
        <svg viewBox="0 0 400 400" fill="none" className="h-full w-full blur-[1px]">
          <circle cx="200" cy="200" r="180" fill="url(#leftBlob)" />
          <defs>
            <radialGradient id="leftBlob" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#dbeafe" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>
      <div className="absolute top-0 bottom-0 -right-[60px] z-0 h-full w-[200px] opacity-25 sm:-right-[80px] sm:w-[350px] md:-right-[90px] md:w-[450px] lg:-right-[110px] lg:w-[600px]">
        <svg viewBox="0 0 400 600" fill="none" className="h-full w-full">
          <ellipse cx="250" cy="300" rx="200" ry="280" fill="url(#rightBlob)" />
          <defs>
            <radialGradient id="rightBlob" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a5b4fc" />
              <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          initial={false}
          animate={{ opacity: activeSection === 'student' ? 1 : 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-0 bg-gradient-to-br from-sky-100/50 via-transparent to-blue-50/30"
        />
        <motion.div
          initial={false}
          animate={{ opacity: activeSection === 'tutor' ? 1 : 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-0 bg-gradient-to-br from-violet-100/45 via-transparent to-fuchsia-50/25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/78 to-white/35" />
      </div>

      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-row gap-1 rounded-full border border-white/70 bg-white/55 p-2 shadow-lg shadow-slate-900/5 backdrop-blur-md lg:bottom-auto lg:left-auto lg:right-8 lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-0 lg:flex-col lg:gap-1">
        <button
          type="button"
          aria-label="Show student view"
          onClick={() => handleSectionChange('student')}
          className={`relative h-3.5 w-3.5 rounded-full transition-all duration-300 ${
            activeSection === 'student'
              ? 'scale-110 bg-blue-600 shadow-md shadow-blue-500/50 ring-2 ring-white'
              : 'bg-slate-300/90 hover:bg-slate-400'
          }`}
        />
        <button
          type="button"
          aria-label="Show tutor view"
          onClick={() => handleSectionChange('tutor')}
          className={`relative h-3.5 w-3.5 rounded-full transition-all duration-300 ${
            activeSection === 'tutor'
              ? 'scale-110 bg-purple-600 shadow-md shadow-purple-500/50 ring-2 ring-white'
              : 'bg-slate-300/90 hover:bg-slate-400'
          }`}
        />
      </div>

      <div className="relative z-10 container mx-auto flex min-h-[100dvh] items-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-0">
        <div className="grid w-full grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-14">
          <AnimatePresence mode="wait">
            {activeSection === 'student' && (
              <motion.div
                key="student"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.7, ease: 'easeInOut' }}
                className="mt-20 flex flex-col justify-center space-y-4 sm:space-y-6 md:mt-0 lg:space-y-8"
              >
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl lg:leading-[1.1]"
                >
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 bg-clip-text text-transparent drop-shadow-sm">
                    Learn faster
                  </span>
                  <br />
                  <span className="text-slate-800">from peer tutors</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg"
                >
                  Book one-on-one sessions with students who know the material inside out. Meet
                  over live video with a shared whiteboard and screen share, and pay securely
                  through the platform—whether you are prepping for exams or filling gaps in a
                  course.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <Link href="/home/student/explore" className={linkPrimaryStudent}>
                    Find peer tutors
                    <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link href="/auth/register?role=student" className={linkSecondaryStudent}>
                    Create an account
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="flex flex-wrap items-stretch gap-3 pt-2 sm:gap-4 lg:gap-4"
                >
                  <div className="flex min-w-[140px] flex-1 items-start gap-3 rounded-2xl border border-blue-100/80 bg-white/75 px-4 py-3.5 shadow-sm shadow-blue-900/5 backdrop-blur-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Peer-to-peer</div>
                      <div className="text-sm text-slate-600">Learn from other students</div>
                    </div>
                  </div>
                  <div className="flex min-w-[140px] flex-1 items-start gap-3 rounded-2xl border border-blue-100/80 bg-white/75 px-4 py-3.5 shadow-sm shadow-blue-900/5 backdrop-blur-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Video className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Live sessions</div>
                      <div className="text-sm text-slate-600">Video built for tutoring</div>
                    </div>
                  </div>
                  <div className="flex min-w-[140px] flex-1 items-start gap-3 rounded-2xl border border-blue-100/80 bg-white/75 px-4 py-3.5 shadow-sm shadow-blue-900/5 backdrop-blur-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">By subject</div>
                      <div className="text-sm text-slate-600">Browse rates & availability</div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {activeSection === 'tutor' && (
              <motion.div
                key="tutor"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.7, ease: 'easeInOut' }}
                className="mt-20 flex flex-col justify-center space-y-4 sm:space-y-6 md:mt-0 lg:space-y-8"
              >
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl lg:leading-[1.1]"
                >
                  <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-purple-500 bg-clip-text text-transparent drop-shadow-sm">
                    Monetize your knowledge
                  </span>
                  <br />
                  <span className="text-slate-800">teach other students</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg"
                >
                  Offer the subjects you are strongest in as paid sessions. Set your availability
                  and rates, connect payouts, and run live lessons with the same video and
                  whiteboard tools your students use—built for a student-to-student marketplace.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <Link href="/home/tutor/profile" className={linkPrimaryTutor}>
                    Set up your tutor profile
                    <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link href="/auth/register?role=tutor" className={linkSecondaryTutor}>
                    Create an account
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-4"
                >
                  <div className="rounded-2xl border border-violet-100/90 bg-gradient-to-br from-white to-violet-50/40 p-4 shadow-md shadow-violet-900/5 transition hover:shadow-lg">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100/80 text-violet-600">
                      <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>
                    <div className="text-sm font-semibold text-slate-800 sm:text-base">
                      Your schedule
                    </div>
                    <div className="text-xs text-slate-600 sm:text-sm">Offer slots that fit you</div>
                  </div>
                  <div className="rounded-2xl border border-violet-100/90 bg-gradient-to-br from-white to-violet-50/40 p-4 shadow-md shadow-violet-900/5 transition hover:shadow-lg">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100/80 text-violet-600">
                      <MonitorPlay className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>
                    <div className="text-sm font-semibold text-slate-800 sm:text-base">
                      Live video & board
                    </div>
                    <div className="text-xs text-slate-600 sm:text-sm">Teach sessions in-browser</div>
                  </div>
                  <div className="rounded-2xl border border-violet-100/90 bg-gradient-to-br from-white to-violet-50/40 p-4 shadow-md shadow-violet-900/5 transition hover:shadow-lg sm:col-span-2 md:col-span-1">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100/80 text-violet-600">
                      <Wallet className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>
                    <div className="text-sm font-semibold text-slate-800 sm:text-base">
                      Paid out securely
                    </div>
                    <div className="text-xs text-slate-600 sm:text-sm">Stripe Connect payouts</div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative lg:col-span-1">
            <div className="pointer-events-none absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-blue-200/20 via-indigo-100/10 to-violet-200/20 blur-3xl lg:-inset-8" />
            <div className="relative h-[220px] w-full sm:h-[300px] md:h-[400px] lg:h-[600px]">
              <div className="absolute inset-0 rounded-[2rem] ring-1 ring-white/60 lg:rounded-[2.5rem]" />
              <motion.div
                initial={{ opacity: 1, scale: 1, x: 0 }}
                animate={{
                  scale: activeSection === 'student' ? 1 : 0.9,
                  opacity: activeSection === 'student' ? 1 : 0,
                  x: activeSection === 'student' ? 0 : -50,
                }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <StudentIllustration />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: 50 }}
                animate={{
                  scale: activeSection === 'tutor' ? 1 : 0.9,
                  opacity: activeSection === 'tutor' ? 1 : 0,
                  x: activeSection === 'tutor' ? 0 : 50,
                }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <TutorIllustration />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
