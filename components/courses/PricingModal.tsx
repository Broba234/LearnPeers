"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CourseAsset } from "./types";

interface Row { duration: number; price: string }

export default function PricingModal({
  asset,
  onClose,
  onDone,
}: {
  asset: CourseAsset;
  onClose: () => void;
  onDone: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([
    { duration: asset.duration_1 ?? 0.5, price: asset.price_1 ? String(asset.price_1) : "" },
    { duration: asset.duration_2 ?? 1, price: asset.price_2 ? String(asset.price_2) : "" },
    { duration: asset.duration_3 ?? 1.5, price: asset.price_3 ? String(asset.price_3) : "" },
  ]);
  const [saving, setSaving] = useState(false);
  const code = asset.subject.code || asset.institution_course?.code || "";
  const isLive = asset.status === "live";

  const setPrice = (i: number, v: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, price: v.replace(/[^0-9.]/g, "") } : row)));
  const setDur = (i: number, v: number) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, duration: v } : row)));

  const save = async () => {
    if (rows.some((r) => !r.price || Number(r.price) <= 0)) {
      toast.error("Set a price for all three session lengths");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/courses/go-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_asset_id: asset.id,
          duration_1: rows[0].duration, price_1: Number(rows[0].price),
          duration_2: rows[1].duration, price_2: Number(rows[1].price),
          duration_3: rows[2].duration, price_3: Number(rows[2].price),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't save pricing");
        setSaving(false);
        return;
      }
      toast.success(data.live ? (isLive ? "Pricing updated" : "You're live — students can book this now") : data.message || "Pricing saved");
      onDone();
    } catch {
      toast.error("Couldn't save pricing");
      setSaving(false);
    }
  };

  const durOptions = [0.5, 1, 1.5, 2];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-6"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-md bg-ink-900 text-white">{code}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <h2 className="text-lg font-semibold text-slate-900">{isLive ? "Edit pricing" : "Set pricing & go live"}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{asset.subject.name}</p>
        <p className="text-xs text-slate-400 mt-2">Price three session lengths. Going live publishes this course to students and makes it bookable.</p>

        <div className="mt-5 space-y-2.5">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
              <select
                value={row.duration}
                onChange={(e) => setDur(i, Number(e.target.value))}
                className="text-sm font-medium text-slate-700 bg-transparent focus:outline-none"
              >
                {durOptions.map((d) => (
                  <option key={d} value={d}>{d}h</option>
                ))}
              </select>
              <div className="flex-1 flex items-center gap-1 justify-end">
                <span className="text-slate-400 text-sm">$</span>
                <input
                  value={row.price}
                  onChange={(e) => setPrice(i, e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="w-24 text-right rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                <span className="text-slate-400 text-xs">/ session</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-6 w-full px-4 py-3 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : isLive ? "Save pricing" : "Go live →"}
        </button>
      </motion.div>
    </div>
  );
}
