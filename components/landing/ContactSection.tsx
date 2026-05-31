"use client";
import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { LuMail, LuMapPin, LuPhone, LuSend, LuLoader, LuCircleCheck } from "react-icons/lu";

export default function ContactSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
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
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const contactInfo = [
    {
      icon: LuMail,
      label: "Email",
      value: "support@learnpeers.com",
      href: "mailto:support@learnpeers.com",
    },
    {
      icon: LuPhone,
      label: "Phone",
      value: "+1 (555) 123-4567",
      href: "tel:+15551234567",
    },
    {
      icon: LuMapPin,
      label: "Location",
      value: "Available Worldwide",
    },
  ];

  return (
    <section
      ref={ref}
      id="contact"
      className="py-28 md:py-[150px] px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-indigo-50"
    >
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Get in Touch
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Have a question, suggestion, or just want to say hello? We&apos;d
            love to hear from you.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-12"
        >
          {/* Contact Form */}
          <motion.form
            variants={itemVariants}
            onSubmit={handleSubmit}
            className="lg:col-span-3 bg-white rounded-ss-[80px] rounded-ee-[80px] p-8 sm:p-10 shadow-lg border border-gray-100"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Your Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="mb-5">
              <label
                htmlFor="subject"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Subject
              </label>
              <input
                id="subject"
                name="subject"
                type="text"
                required
                value={form.subject}
                onChange={handleChange}
                placeholder="How can we help?"
                className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="message"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                value={form.message}
                onChange={handleChange}
                placeholder="Tell us more..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
              />
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {submitted && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm flex items-center gap-2">
                <LuCircleCheck className="h-4 w-4" />
                Message sent successfully! We&apos;ll get back to you soon.
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full px-8 py-3 font-semibold hover:scale-105 shadow-lg transition-all duration-300 disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  Sending...
                  <LuLoader className="h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  Send Message
                  <LuSend className="h-4 w-4" />
                </>
              )}
            </button>
          </motion.form>

          {/* Contact Info Cards */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-2 flex flex-col gap-5"
          >
            {contactInfo.map((item) => (
              <div
                key={item.label}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex items-start gap-4 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
              >
                <div className="p-3 bg-blue-100 rounded-full text-blue-600 shrink-0">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.label}</h3>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <p className="text-gray-600">{item.value}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Extra CTA card */}
            <div className="bg-[#1559C6]/90 rounded-ss-[60px] rounded-ee-[60px] p-8 text-white shadow-xl flex-1 flex flex-col justify-center">
              <h3 className="text-xl font-bold mb-2">Let&apos;s Collaborate</h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                Whether you&apos;re a student looking for guidance or a tutor
                ready to share your expertise — we&apos;re here to help you get
                started.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
