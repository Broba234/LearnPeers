"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { CourseAsset, stars, TIER_META } from "./types";

export default function ReviewsModal({ asset, onClose }: { asset: CourseAsset; onClose: () => void }) {
  const code = asset.subject.code || asset.institution_course?.code || "";
  const tier = TIER_META[asset.tier] || TIER_META.bronze;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        <div className="p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-md bg-ink-900 text-white">{code}</span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">{asset.subject.name}</h2>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-amber-500 text-lg">{stars(asset.rating)}</span>
            <span className="text-sm font-semibold text-slate-900">{asset.rating.toFixed(1)}</span>
            <span className="text-xs text-slate-400">{asset.rating_count} review{asset.rating_count === 1 ? "" : "s"}</span>
            <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${tier.bg} ${tier.text} ${tier.ring}`}>
              {tier.label} · {asset.xp} XP
            </span>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {asset.reviews.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No reviews yet. Each completed session can earn one — they compound your rating, XP and tier.</p>
          ) : (
            asset.reviews.map((r) => (
              <div key={r.id} className="flex gap-3">
                <div className="relative w-9 h-9 flex-shrink-0">
                  <Image src={r.student_avatar || "/default-avatar.png"} alt={r.student_name} fill className="rounded-full object-cover bg-slate-100" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{r.student_name}</span>
                    <span className="text-amber-500 text-xs">{stars(r.rating)}</span>
                  </div>
                  {r.comment && <p className="text-sm text-slate-600 mt-0.5">{r.comment}</p>}
                  <p className="text-[11px] text-slate-400 mt-0.5">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          )}
          {asset.rating_count > asset.reviews.length && (
            <p className="text-xs text-slate-400 text-center">Showing {asset.reviews.length} of {asset.rating_count}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
