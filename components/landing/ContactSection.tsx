"use client";
import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { LuMail, LuMapPin, LuClock, LuSend, LuLoader, LuCircleCheck } from "react-icons/lu";
import ParallaxNodes, { type ParallaxItem } from "./ParallaxNodes";

const CONTACT_NODES: ParallaxItem[] = [
  { className: "absolute -left-12 top-12 h-44 w-44 rotate-[-10deg] opacity-[0.12] blur-[4px]", travel: 70 },
  { className: "absolute -right-10 bottom-10 h-52 w-52 rotate-[12deg] opacity-[0.1] blur-[5px]", travel: 95 },
];

export default function ContactSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Something went wrong");
      }
      setSubmitted(true);
      setForm({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
  };

  const contactInfo = [
    {
      icon: LuMail,
      label: "Email",
      value: "hello@learnpeers.com",
      href: "mailto:hello@learnpeers.com",
    },
    { icon: LuMapPin, label: "Location", value: "Ontario, Canada" },
    { icon: LuClock, label: "Response time", value: "Within 1–2 days" },
  ];

  const inputClass =
    "h-11 w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder-ink-400 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <section
      ref={ref}
      id="contact"
      className="relative overflow-hidden bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
    >
      <ParallaxNodes items={CONTACT_NODES} />
      <div className="relative mx-auto max-w-6xl">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Contact</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Get in touch
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-500">
            A question about the beta, a bug, or a partnership idea? Send it over — every
            message reaches the team directly.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-5"
        >
          {/* Form */}
          <motion.form
            variants={itemVariants}
            onSubmit={handleSubmit}
            className="rounded-3xl border border-ink-100 bg-white p-7 shadow-sm sm:p-9 lg:col-span-3"
          >
            <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink-700">
                  Your name
                </label>
                <input id="name" name="name" type="text" required value={form.name} onChange={handleChange} placeholder="Jordan Lee" className={inputClass} />
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-700">
                  Email address
                </label>
                <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} placeholder="you@example.com" className={inputClass} />
              </div>
            </div>

            <div className="mb-5">
              <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-ink-700">
                Subject
              </label>
              <input id="subject" name="subject" type="text" required value={form.subject} onChange={handleChange} placeholder="How can we help?" className={inputClass} />
            </div>

            <div className="mb-6">
              <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-ink-700">
                Message
              </label>
              <textarea id="message" name="message" rows={5} required value={form.message} onChange={handleChange} placeholder="Tell us more…" className={`${inputClass} h-auto resize-none`} />
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {submitted && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <LuCircleCheck className="h-4 w-4" />
                Message sent! We&apos;ll get back to you soon.
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-7 py-3 font-semibold text-white shadow-sm shadow-brand-600/25 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  Sending…
                  <LuLoader className="h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  Send message
                  <LuSend className="h-4 w-4" />
                </>
              )}
            </button>
          </motion.form>

          {/* Info + beta card */}
          <motion.div variants={itemVariants} className="flex flex-col gap-4 lg:col-span-2">
            {contactInfo.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink-900">{item.label}</h3>
                  {item.href ? (
                    <a href={item.href} className="text-sm text-ink-500 transition hover:text-brand-700">
                      {item.value}
                    </a>
                  ) : (
                    <p className="text-sm text-ink-500">{item.value}</p>
                  )}
                </div>
              </div>
            ))}

            <div className="flex-1 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 p-6 text-white shadow-md">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-white" /> In beta
              </span>
              <h3 className="mt-3 text-lg font-bold">Your feedback shapes what we build</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/75">
                Found a rough edge? Use the feedback button in the corner — it goes straight
                to the team while we&apos;re testing.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
