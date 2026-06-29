"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CourseAsset, GRADE_SCALES } from "./types";

function defaultScale(category: string | null): string {
  if (category === "AP") return "ap";
  if (category === "IB") return "ib";
  return "percentage";
}

export default function VerifyGradeModal({
  asset,
  onClose,
  onDone,
}: {
  asset: CourseAsset;
  onClose: () => void;
  onDone: () => void;
}) {
  const [scale, setScale] = useState(asset.grade_scale || defaultScale(asset.subject.category));
  const [value, setValue] = useState(asset.grade_value || "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | { qualifies: boolean; verified?: boolean; label?: string; reason?: string }>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // DEMO MODE: verify instantly with no transcript upload. Remove
  // NEXT_PUBLIC_DEMO_MODE to roll back. Force-disabled on the production
  // deployment regardless of the flag (VERCEL_ENV guard).
  const DEMO_MODE =
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
    process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";

  const scaleMeta = GRADE_SCALES.find((g) => g.value === scale)!;
  const code = asset.subject.code || asset.institution_course?.code || "";

  const submit = async () => {
    if (!value.trim()) {
      toast.error("Enter your grade first");
      return;
    }
    if (!DEMO_MODE && !file) {
      toast.error("Upload your transcript or report card — verification is reviewed by an admin");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("course_asset_id", asset.id);
      fd.append("grade_value", value.trim());
      fd.append("grade_scale", scale);
      if (file) fd.append("proof", file);
      const res = await fetch("/api/courses/verify", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't submit — try again");
        setSubmitting(false);
        return;
      }
      if (data.qualifies) {
        // qualifying grade -> pending admin review (or instantly verified in demo mode)
        setResult({ qualifies: true, verified: !!data.verified, label: data.asset?.grade_label });
      } else {
        setResult({ qualifies: false, reason: data.asset?.rejected_reason || "Grade below the bar to tutor this course." });
      }
    } catch {
      toast.error("Couldn't submit — try again");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden"
      >
        <div>
          {!result ? (
            <motion.div key="form" className="p-6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-md bg-ink-900 text-white">{code}</span>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Request verification</h2>
              <p className="text-sm text-slate-500 mt-0.5">{asset.subject.name}</p>
              <p className="text-xs text-slate-400 mt-2">
                {DEMO_MODE
                  ? "Enter your grade — in demo mode it's verified instantly, no transcript needed."
                  : "Enter your grade and upload your transcript or report card. An admin reviews it, and once approved you unlock the right to tutor this course."}
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Grade scale</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {GRADE_SCALES.map((g) => (
                      <button
                        key={g.value}
                        onClick={() => setScale(g.value)}
                        className={`px-2 py-2 rounded-xl text-xs font-medium border transition-colors ${
                          scale === g.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Your grade</label>
                  <input
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={scaleMeta.placeholder}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">{scaleMeta.hint}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Transcript / report card {DEMO_MODE ? <span className="text-slate-400">(optional in demo)</span> : <span className="text-rose-400">*</span>}</label>
                  <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className={`w-full flex items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-sm transition-colors ${file ? "border-brand-300 bg-brand-50/40 text-slate-700" : "border-slate-300 text-slate-500 hover:bg-slate-50"}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.9A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    {file ? <span className="truncate">{file.name}</span> : "Upload transcript / report card"}
                  </button>
                  <p className="text-[11px] text-slate-400 mt-1">Private — only reviewed by an admin. PDF, JPG, PNG or WebP.</p>
                </div>
              </div>

              <button
                onClick={submit}
                disabled={submitting}
                className="mt-6 w-full px-4 py-3 text-sm font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Submitting…" : "Submit for review"}
              </button>
            </motion.div>
          ) : result.qualifies ? (
            <motion.div key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 14 }}
                className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center ${result.verified ? "bg-green-100" : "bg-amber-100"}`}
              >
                {result.verified ? (
                  <svg className="w-9 h-9 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-9 h-9 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
              </motion.div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{result.verified ? "Verified" : "Submitted for review"}</h2>
              <p className="text-sm text-slate-500 mt-1">
                {result.verified
                  ? <>{code} is verified{result.label ? ` (grade ${result.label})` : ""}. You can set a price and go live now.</>
                  : <>{code} is in the admin review queue{result.label ? ` (grade ${result.label})` : ""}. You'll be notified once it's approved — then you can set a price and go live.</>}
              </p>
              <span className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${result.verified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${result.verified ? "bg-green-500" : "bg-amber-400 animate-pulse"}`} /> {result.verified ? "Verified" : "Pending approval"}
              </span>
              <button onClick={onDone} className="mt-6 w-full px-4 py-3 text-sm font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors">
                Got it
              </button>
            </motion.div>
          ) : (
            <motion.div key="no" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center">
                <svg className="w-9 h-9 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Not quite there</h2>
              <p className="text-sm text-slate-500 mt-1">{result.reason}</p>
              <div className="mt-6 flex gap-2">
                <button onClick={onDone} className="flex-1 px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">Close</button>
                <button onClick={() => { setResult(null); setSubmitting(false); }} className="flex-1 px-4 py-3 text-sm font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700">Try again</button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
