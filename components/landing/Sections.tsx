import Link from 'next/link';
import {
  Search,
  CalendarCheck,
  MonitorPlay,
  Video,
  PenLine,
  ShieldCheck,
  Wallet,
  Clock,
  Users,
  BadgeCheck,
  ArrowRight,
} from 'lucide-react';
import ParallaxNodes, { type ParallaxItem } from './ParallaxNodes';

const FEATURE_NODES: ParallaxItem[] = [
  { className: 'absolute -left-14 top-10 h-44 w-44 rotate-[-10deg] opacity-[0.13] blur-[4px]', travel: 70 },
  { className: 'absolute -right-12 bottom-8 h-52 w-52 rotate-[12deg] opacity-[0.11] blur-[5px]', travel: 95 },
];

const CTA_NODES: ParallaxItem[] = [
  { className: 'absolute -left-10 -top-8 h-44 w-44 rotate-[-12deg] opacity-20 blur-[3px]', tone: 'light', travel: 55 },
  { className: 'absolute -bottom-10 -right-8 h-52 w-52 rotate-[14deg] opacity-[0.18] blur-[4px]', tone: 'light', travel: 80 },
];

/* ----------------------------- How it works ----------------------------- */

const STEPS = [
  {
    icon: Search,
    title: 'Find your tutor',
    body: 'Browse peer tutors by subject, rate, rating, and availability. See who knows the material inside out.',
  },
  {
    icon: CalendarCheck,
    title: 'Book a session',
    body: 'Pick a time that works — or start instantly with tutors who are available right now. Pay securely upfront.',
  },
  {
    icon: MonitorPlay,
    title: 'Learn live',
    body: 'Meet over live video with a shared whiteboard and screen share. Leave the session actually understanding it.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            From stuck to &ldquo;ohhhhhh, I get it&rdquo;
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="group relative rounded-3xl border border-ink-100 bg-gradient-to-b from-white to-brand-50/30 p-7 transition hover:border-brand-200 hover:shadow-lg hover:shadow-brand-600/5"
            >
              <span className="absolute right-6 top-6 text-5xl font-extrabold text-ink-100 transition group-hover:text-brand-100">
                {i + 1}
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-600/25">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Features ------------------------------- */

const STUDENT_FEATURES = [
  { icon: Video, title: 'Built-for-tutoring video', body: 'Crisp live video designed around learning, not generic meetings.' },
  { icon: PenLine, title: 'Shared whiteboard', body: 'Work through problems together in real time with a collaborative canvas.' },
  { icon: Clock, title: 'Available now', body: 'Catch tutors who are online and ready to start this minute.' },
  { icon: ShieldCheck, title: 'Pay securely', body: 'Payments are held and processed safely through the platform.' },
];

const TUTOR_FEATURES = [
  { icon: Wallet, title: 'Get paid out', body: 'Connect payouts with Stripe and earn from the subjects you know best.' },
  { icon: BadgeCheck, title: 'You set the terms', body: 'Choose your subjects, your rates, and your availability.' },
  { icon: Users, title: 'Reach students', body: 'Get discovered by students searching for exactly what you teach.' },
];

export function Features() {
  return (
    <section id="features" className="relative overflow-hidden bg-slate-50 py-20 sm:py-28">
      <ParallaxNodes items={FEATURE_NODES} />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
          {/* Students */}
          <div className="rounded-3xl border border-ink-100 bg-white p-8 sm:p-10">
            <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              For students
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              Real help from people who just learned it
            </h2>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              {STUDENT_FEATURES.map((f) => (
                <div key={f.title} className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink-900">{f.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-500">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/home/student/explore"
              className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Explore tutors <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Tutors */}
          <div className="rounded-3xl border border-ink-800 bg-gradient-to-br from-ink-900 to-ink-800 p-8 text-white sm:p-10">
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-200">
              For tutors
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Turn what you know into income
            </h2>
            <div className="mt-7 grid gap-5">
              {TUTOR_FEATURES.map((f) => (
                <div key={f.title} className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-300">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/60">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/auth/register?role=tutor"
              className="mt-8 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
            >
              Start tutoring <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- FAQ ---------------------------------- */

const FAQS = [
  {
    q: 'What is LearnPeers?',
    a: 'LearnPeers is a peer-to-peer tutoring marketplace. Students book live one-on-one sessions with top student tutors over video, with a shared whiteboard, screen share, and secure in-platform payments.',
  },
  {
    q: 'How much does it cost?',
    a: 'Each tutor sets their own hourly rate, so pricing varies by subject and tutor. You see the exact price before you book, and payment is handled securely through the platform.',
  },
  {
    q: 'Who are the tutors?',
    a: 'Tutors are students who excel in the subjects they teach. You can browse their profiles, subjects, rates, and ratings before booking a session.',
  },
  {
    q: 'How do sessions work?',
    a: 'Sessions run live in your browser — no downloads. You get built-for-tutoring video, a collaborative whiteboard, and screen sharing so you can actually work through the material together.',
  },
  {
    q: 'Can I become a tutor?',
    a: 'Yes. Create a tutor profile, choose your subjects, set your rates and availability, connect payouts with Stripe, and start running paid live sessions.',
  },
  {
    q: 'Is LearnPeers free to join?',
    a: 'Creating an account is free. You only pay when you book a session with a tutor. LearnPeers is currently in beta.',
  },
];

export function Faq() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <section id="faq" className="bg-white py-20 sm:py-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Questions, answered
          </h2>
        </div>

        <div className="mt-10 divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100">
          {FAQS.map((f) => (
            <details key={f.q} className="group bg-white open:bg-brand-50/20">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left text-base font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="px-6 pb-5 text-sm leading-relaxed text-ink-500">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- CTA band ------------------------------- */

export function CtaBand() {
  return (
    <section className="bg-slate-50 px-5 py-16 sm:px-8 sm:py-20">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-8 py-14 text-center shadow-xl shadow-brand-600/20 sm:px-14">
        <ParallaxNodes items={CTA_NODES} />
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(at 20% 20%, rgba(255,255,255,0.25) 0px, transparent 40%),
              radial-gradient(at 80% 80%, rgba(36,48,54,0.4) 0px, transparent 45%)`,
          }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" /> Beta access open
          </span>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to learn from your peers?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Join the beta today — find a tutor in minutes or start earning by teaching what
            you know.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/register?role=student"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50 active:scale-[0.98] sm:w-auto sm:text-base"
            >
              Get started free <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/auth/register?role=tutor"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-white/40 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-[0.98] sm:w-auto sm:text-base"
            >
              Become a tutor
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
