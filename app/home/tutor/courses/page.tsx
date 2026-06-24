"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { supabase } from "@/lib/supabase/client";
import StandingHeader from "@/components/courses/StandingHeader";
import CourseAssetCard from "@/components/courses/CourseAssetCard";
import CourseTree from "@/components/courses/CourseTree";
import VerifyGradeModal from "@/components/courses/VerifyGradeModal";
import PricingModal from "@/components/courses/PricingModal";
import ReviewsModal from "@/components/courses/ReviewsModal";
import { Portfolio, CatalogTree, CourseAsset, CatalogCourse } from "@/components/courses/types";
import StripeReminderBanner from "@/components/stripe/StripeReminderBanner";

const GROUPS: { key: string; title: string; statuses: string[]; blurb: string }[] = [
  { key: "live", title: "Live & earning", statuses: ["live"], blurb: "Published and bookable by students." },
  { key: "ready", title: "Ready to go live", statuses: ["verified"], blurb: "Verified — set a price to publish." },
  { key: "locked", title: "Locked", statuses: ["claimed", "pending", "rejected"], blurb: "Verify your grade to unlock the right to tutor." },
];

export default function TutorCourses() {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [tree, setTree] = useState<CatalogTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"portfolio" | "tree">("portfolio");

  const [verifyAsset, setVerifyAsset] = useState<CourseAsset | null>(null);
  const [pricingAsset, setPricingAsset] = useState<CourseAsset | null>(null);
  const [reviewsAsset, setReviewsAsset] = useState<CourseAsset | null>(null);
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(async () => {
    const [pRes, cRes] = await Promise.all([
      fetch("/api/courses/portfolio"),
      fetch("/api/courses/catalog"),
    ]);
    if (pRes.ok) setPortfolio(await pRes.json());
    if (cRes.ok) setTree((await cRes.json()).tree);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      await load();
      setLoading(false);
    })();
  }, [router, load]);

  const findAssetBySubject = (subjectId: string) =>
    portfolio?.assets.find((a) => a.subject.id === subjectId) || null;

  const openActionFor = (asset: CourseAsset) => {
    if (asset.status === "verified" || asset.status === "live") setPricingAsset(asset);
    else setVerifyAsset(asset);
  };

  const handleNodeClick = async (course: CatalogCourse) => {
    if (course.owned) {
      const asset = findAssetBySubject(course.id);
      if (asset) { setTab("portfolio"); openActionFor(asset); }
      return;
    }
    // claim it, then jump straight into verification
    setClaiming(true);
    try {
      const res = await fetch("/api/courses/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_id: course.id }),
      });
      if (!res.ok) { toast.error("Couldn't add that course"); return; }
      await load();
      toast.success(`${course.code || course.name} added to your portfolio`);
    } finally {
      setClaiming(false);
    }
  };

  // After load(), if we just claimed and want to verify, the user can click the card.
  // For a smoother flow we open verify right after claim using a fresh fetch:
  const claimAndVerify = async (course: CatalogCourse) => {
    setClaiming(true);
    try {
      const res = await fetch("/api/courses/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_id: course.id }),
      });
      if (!res.ok) { toast.error("Couldn't add that course"); return; }
      const pRes = await fetch("/api/courses/portfolio");
      if (pRes.ok) {
        const fresh: Portfolio = await pRes.json();
        setPortfolio(fresh);
        const asset = fresh.assets.find((a) => a.subject.id === course.id);
        await fetch("/api/courses/catalog").then((r) => r.ok && r.json().then((d) => setTree(d.tree)));
        setTab("portfolio");
        if (asset) setVerifyAsset(asset);
      }
    } finally {
      setClaiming(false);
    }
  };

  const handleUnclaim = async (asset: CourseAsset) => {
    const r = await Swal.fire({
      title: "Remove this course?",
      text: `${asset.subject.code || asset.subject.name} will be removed from your portfolio.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Remove",
    });
    if (!r.isConfirmed) return;
    const res = await fetch("/api/courses/unclaim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_asset_id: asset.id }),
    });
    if (res.ok) { toast.success("Removed"); await load(); }
    else toast.error("Couldn't remove");
  };

  const handleUnpublish = async (asset: CourseAsset) => {
    const res = await fetch("/api/courses/unpublish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_asset_id: asset.id }),
    });
    if (res.ok) { toast.success("Taken offline"); await load(); }
    else toast.error("Couldn't take offline");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400">Loading your portfolio…</div>
      </div>
    );
  }

  const assets = portfolio?.assets || [];
  const hasAssets = assets.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Nag tutors who skipped Stripe during onboarding */}
        <StripeReminderBanner />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Courses</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Your portfolio of owned, income-producing course-assets. Verify a grade to unlock the right to tutor — reviews compound your standing.
          </p>
        </div>

        {/* Standing */}
        {portfolio && (
          <StandingHeader standing={portfolio.standing} name={portfolio.profile.name} avatar={portfolio.profile.avatar} />
        )}

        {/* Tabs */}
        <div className="mt-6 flex items-center gap-1 bg-white border border-slate-100 rounded-2xl p-1 w-fit shadow-sm">
          <button
            onClick={() => setTab("portfolio")}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${tab === "portfolio" ? "bg-ink-900 text-white" : "text-slate-500 hover:text-slate-800"}`}
          >
            My portfolio {hasAssets && <span className="opacity-60">· {assets.length}</span>}
          </button>
          <button
            onClick={() => setTab("tree")}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${tab === "tree" ? "bg-ink-900 text-white" : "text-slate-500 hover:text-slate-800"}`}
          >
            Browse the tree
          </button>
        </div>

        <div>
          {tab === "portfolio" ? (
            <motion.div key="portfolio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
              {!hasAssets ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">Build your portfolio</h3>
                  <p className="text-sm text-slate-400 mt-1 mb-4">Place your first course, verify the grade, and unlock the right to tutor it.</p>
                  <button onClick={() => setTab("tree")} className="px-4 py-2 text-sm font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700">Browse the tree →</button>
                </div>
              ) : (
                <div className="space-y-8">
                  {GROUPS.map((group) => {
                    const items = assets.filter((a) => group.statuses.includes(a.status));
                    if (items.length === 0) return null;
                    return (
                      <div key={group.key}>
                        <div className="flex items-baseline gap-2 mb-3">
                          <h2 className="text-sm font-semibold text-slate-900">{group.title}</h2>
                          <span className="text-xs text-slate-400">{items.length}</span>
                          <span className="text-xs text-slate-400 hidden sm:inline">· {group.blurb}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {items.map((a) => (
                            <CourseAssetCard
                              key={a.id}
                              asset={a}
                              onVerify={setVerifyAsset}
                              onGoLive={setPricingAsset}
                              onUnclaim={handleUnclaim}
                              onUnpublish={handleUnpublish}
                              onReviews={setReviewsAsset}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={() => setTab("tree")} className="text-sm font-medium text-brand-600 hover:text-brand-700">+ Add more courses from the tree</button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="tree" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
              <div className="mb-3 flex items-center gap-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Live</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand-600" /> Verified</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Locked</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border border-dashed border-slate-400" /> Tap to claim</span>
                {claiming && <span className="text-brand-600">Adding…</span>}
              </div>
              <CourseTree tree={tree} onNodeClick={(c) => (c.owned ? handleNodeClick(c) : claimAndVerify(c))} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Modals */}
      {verifyAsset && (
        <VerifyGradeModal
          asset={verifyAsset}
          onClose={() => setVerifyAsset(null)}
          onDone={async () => { setVerifyAsset(null); await load(); }}
        />
      )}
      {pricingAsset && (
        <PricingModal
          asset={pricingAsset}
          onClose={() => setPricingAsset(null)}
          onDone={async () => { setPricingAsset(null); await load(); }}
        />
      )}
      {reviewsAsset && <ReviewsModal asset={reviewsAsset} onClose={() => setReviewsAsset(null)} />}
    </div>
  );
}
