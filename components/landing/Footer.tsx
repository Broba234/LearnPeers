import Link from "next/link";
import Image from "next/image";
import { FaLinkedin, FaTwitter, FaInstagram, FaEnvelope, FaMapMarkerAlt } from "react-icons/fa";
import { ArrowRight } from "lucide-react";
import { NodeConstellation } from "./NodeDecor";

const QUICK_LINKS = [
  { label: "Home", href: "/" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Find tutors", href: "/home/student/explore" },
  { label: "Teach & earn", href: "/auth/register?role=tutor" },
  { label: "FAQ", href: "/#faq" },
];

const LEGAL_LINKS = [
  { label: "Terms of Service", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Cookie Policy", href: "#" },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-white">
      {/* soft node accent */}
      <NodeConstellation
        tone="light"
        className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rotate-[12deg] opacity-[0.08] blur-[3px]"
      />

      <div className="relative container mx-auto px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Company */}
          <div className="space-y-5 sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image
                src="/learnpeers-logo-white.png"
                alt="LearnPeers"
                width={170}
                height={57}
                className="h-7 w-auto"
              />
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-200 ring-1 ring-white/15">
                Beta
              </span>
            </Link>
            <p className="max-w-md text-sm leading-relaxed text-white/60">
              The peer tutoring marketplace where students book live help from other
              students — and get paid to teach what they know.
            </p>
            <div className="flex gap-3 pt-1">
              {[FaLinkedin, FaTwitter, FaInstagram, FaEnvelope].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 transition hover:bg-brand-600 hover:text-white"
                  aria-label="Social link"
                >
                  <Icon className="text-base" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="mb-5 border-l-2 border-brand-500 pl-3 text-sm font-semibold uppercase tracking-wider text-white">
              Explore
            </h3>
            <ul className="space-y-3">
              {QUICK_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="group flex items-center text-sm text-white/60 transition hover:text-brand-300"
                  >
                    <span className="mr-2.5 h-1.5 w-1.5 rounded-full bg-brand-500 opacity-0 transition-opacity group-hover:opacity-100" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-5 border-l-2 border-brand-500 pl-3 text-sm font-semibold uppercase tracking-wider text-white">
              Legal
            </h3>
            <ul className="space-y-3">
              {LEGAL_LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-white/60 transition hover:text-brand-300">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + CTA */}
          <div>
            <h3 className="mb-5 border-l-2 border-brand-500 pl-3 text-sm font-semibold uppercase tracking-wider text-white">
              Get in touch
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-white/60">
                <FaEnvelope className="shrink-0 text-brand-400" />
                <a href="mailto:hello@learnpeers.com" className="break-all hover:text-brand-300">
                  hello@learnpeers.com
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm text-white/60">
                <FaMapMarkerAlt className="shrink-0 text-brand-400" />
                Ontario, Canada
              </li>
            </ul>

            <div className="mt-6">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                Join the beta <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-10 border-t border-white/10" />

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
          <p className="text-sm text-white/40">
            &copy; {new Date().getFullYear()} <span className="font-semibold text-white/70">LearnPeers</span>. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href="#" className="text-sm text-white/40 transition hover:text-white">Terms</Link>
            <Link href="#" className="text-sm text-white/40 transition hover:text-white">Privacy</Link>
            <Link href="/#contact" className="text-sm text-white/40 transition hover:text-white">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
