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
  const [result, setResult] = useState<null | { qualifies: boolean; live?: boolean; xpGained?: number; label?: string; reason?: string }>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const scaleMeta = GRADE_SCALES.find((g) => g.value === scale)!;
  const code = asset.subject.code || asset.institution_course?.code || "";

  const submit = async () => {
    if (!value.trim()) {
      toast.error("Enter your grade first");
      return;
    }
    setSubmitting(true);
    try {
      let res: Response;
      if (file) {
        const fd = new FormData();
        fd.append("course_asset_id", asset.id);
        fd.append("grade_value", value.trim());
        fd.append("grade_scale", scale);
        fd.append("proof", file);
        res = await fetch("/api/courses/verify", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/courses/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course_asset_id: asset.id, grade_value: value.trim(), grade_scale: scale }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't verify — try again");
        setSubmitting(false);
        return;
      }
      if (data.qualifies) {
        setResult({ qualifies: true, live: data.live, xpGained: data.asset?.xpGained, label: data.asset?.grade_label });
      } else {
        setResult({ qualifies: false, reason: data.asset?.rejected_reason || "Grade below the bar to tutor this course." });
      }
    } catch {
      toast.error("Couldn't verify — try again");
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
              <h2 className="text-lg font-semibold text-slate-900">Verify your grade</h2>
              <p className="text-sm text-slate-500 mt-0.5">{asset.subject.name}</p>
              <p className="text-xs text-slate-400 mt-2">
                A qualifying grade unlocks the right to tutor this course. Attach a transcript to earn the document-verified badge — it builds trust and ranks you higher.
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
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Proof (optional)</label>
                  <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.9A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    {file ? <span className="text-slate-700 truncate">{file.name}</span> : "Upload transcript / report card"}
                  </button>
                </div>
              </div>

              <button
                onClick={submit}
                disabled={submitting}
                className="mt-6 w-full px-4 py-3 text-sm font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Verifying…" : "Verify & unlock"}
              </button>
            </motion.div>
          ) : result.qualifies ? (
            <motion.div key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 14 }}
                className="mx-auto w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center"
              >
                <svg className="w-9 h-9 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </motion.div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{result.live ? "Live & earning!" : "Unlocked!"}</h2>
              <p className="text-sm text-slate-500 mt-1">
                {result.live
                  ? `${code} is verified and published — students can book it now.`
                  : `${code} is verified. Set a price to go live and start earning.`}
              </p>
              {result.xpGained ? (
                <span className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-brand-50 text-brand-700">
                  +{result.xpGained} XP
                </span>
              ) : null}
              <button onClick={onDone} className="mt-6 w-full px-4 py-3 text-sm font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors">
                {result.live ? "Done" : "Continue"}
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
