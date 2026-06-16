"use client";

import { motion } from "framer-motion";
import { CourseAsset, STATUS_META, TIER_META, stars } from "./types";

const VERIF_LABEL: Record<string, string> = {
  self_attested: "Self-attested",
  document: "Document-verified",
  school_email: "School-verified",
  transcript: "Transcript-verified",
};

export default function CourseAssetCard({
  asset,
  onVerify,
  onGoLive,
  onUnclaim,
  onUnpublish,
  onReviews,
}: {
  asset: CourseAsset;
  onVerify: (a: CourseAsset) => void;
  onGoLive: (a: CourseAsset) => void;
  onUnclaim: (a: CourseAsset) => void;
  onUnpublish: (a: CourseAsset) => void;
  onReviews: (a: CourseAsset) => void;
}) {
  const s = STATUS_META[asset.status];
  const tier = TIER_META[asset.tier] || TIER_META.bronze;
  const locked = asset.status === "claimed" || asset.status === "rejected";
  const code = asset.subject.code || asset.institution_course?.code || "—";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border ${s.ring} bg-white shadow-sm overflow-hidden ${
        locked ? "opacity-95" : ""
      }`}
    >
      {asset.status === "live" && <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-300" />}
      {asset.status === "verified" && <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 to-brand-300" />}

      <div className="p-5">
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-md ${locked ? "bg-slate-100 text-slate-500" : "bg-ink-900 text-white"}`}>
                {code}
              </span>
              {asset.subject.grade ? (
                <span className="text-[11px] text-slate-400">Grade {asset.subject.grade}</span>
              ) : (
                <span className="text-[11px] text-slate-400">{asset.subject.category}</span>
              )}
            </div>
            <h3 className={`mt-1.5 text-sm font-semibold leading-snug ${locked ? "text-slate-500" : "text-slate-900"}`}>
              {asset.subject.name}
            </h3>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 ${s.chipBg} ${s.chipText}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${asset.status === "pending" ? "animate-pulse" : ""}`} />
            {s.label}
          </span>
        </div>

        {/* grade + verification */}
        {asset.grade_label && (asset.status === "verified" || asset.status === "live") && (
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">
              <svg className="w-3.5 h-3.5 text-brand-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.1 3.1 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" /></svg>
              Grade {asset.grade_label}
            </span>
            {asset.mastery != null && (
              <span className="text-[11px] text-slate-400">{asset.mastery}% mastery</span>
            )}
            {asset.verification_method && (
              <span className="text-[11px] text-slate-400">· {VERIF_LABEL[asset.verification_method] || asset.verification_method}</span>
            )}
          </div>
        )}

        {/* rejected reason */}
        {asset.status === "rejected" && asset.rejected_reason && (
          <p className="mt-3 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1.5">{asset.rejected_reason}</p>
        )}

        {/* locked hint */}
        {asset.status === "claimed" && (
          <p className="mt-3 text-xs text-slate-400">Locked — verify your grade to unlock the right to tutor this course.</p>
        )}

        {/* pending hint */}
        {asset.status === "pending" && (
          <p className="mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
            Submitted for review{asset.grade_label ? ` · grade ${asset.grade_label}` : ""}. An admin is reviewing your transcript.
          </p>
        )}

        {/* standing row (rating + tier + xp) */}
        {(asset.rating_count > 0 || asset.xp > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {asset.rating_count > 0 ? (
              <button onClick={() => onReviews(asset)} className="inline-flex items-center gap-1 text-xs hover:underline">
                <span className="text-amber-500">{stars(asset.rating)}</span>
                <span className="font-medium text-slate-700">{asset.rating.toFixed(1)}</span>
                <span className="text-slate-400">({asset.rating_count})</span>
              </button>
            ) : (
              !locked && <span className="text-[11px] text-slate-400">No reviews yet</span>
            )}
            {asset.xp > 0 && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${tier.bg} ${tier.text} ${tier.ring}`}>
                {tier.label} · {asset.xp} XP
              </span>
            )}
          </div>
        )}

        {/* tier progress */}
        {asset.next_tier && asset.xp > 0 && (
          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-400"
                style={{ width: `${Math.min(100, Math.round((asset.xp / asset.next_tier.min) * 100))}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{asset.next_tier.min - asset.xp} XP to {asset.next_tier.label}</p>
          </div>
        )}

        {/* live metrics */}
        {asset.status === "live" && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 py-2">
              <p className="text-sm font-semibold text-slate-900">${asset.price_2 ?? "—"}</p>
              <p className="text-[10px] text-slate-400">/ {asset.duration_2 ?? 1}h</p>
            </div>
            <div className="rounded-xl bg-slate-50 py-2">
              <p className="text-sm font-semibold text-slate-900">{asset.sessions_count}</p>
              <p className="text-[10px] text-slate-400">sessions</p>
            </div>
            <div className="rounded-xl bg-emerald-50 py-2">
              <p className="text-sm font-semibold text-emerald-700">${Math.round(asset.total_earnings)}</p>
              <p className="text-[10px] text-emerald-600/70">earned</p>
            </div>
          </div>
        )}

        {/* actions */}
        <div className="mt-4 flex items-center gap-2">
          {(asset.status === "claimed" || asset.status === "rejected") && (
            <button
              onClick={() => onVerify(asset)}
              className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              {asset.status === "rejected" ? "Try another grade" : "Verify grade →"}
            </button>
          )}
          {asset.status === "pending" && (
            <div className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl bg-amber-50 text-amber-700 text-center inline-flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Awaiting approval
            </div>
          )}
          {asset.status === "verified" && (
            <button
              onClick={() => onGoLive(asset)}
              className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              Set pricing & go live →
            </button>
          )}
          {asset.status === "live" && (
            <>
              <button
                onClick={() => onGoLive(asset)}
                className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Edit pricing
              </button>
              <button
                onClick={() => onUnpublish(asset)}
                title="Take offline"
                className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Pause
              </button>
            </>
          )}
          {(locked || asset.status === "pending") && (
            <button
              onClick={() => onUnclaim(asset)}
              title={asset.status === "pending" ? "Withdraw request" : "Remove from portfolio"}
              className="px-2.5 py-2 text-xs font-medium rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-rose-500 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
