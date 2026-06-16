// Shared types for the tutor course-asset portfolio.

export type CourseStatus = "claimed" | "pending" | "verified" | "live" | "rejected";

export interface CourseReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  student_name: string;
  student_avatar: string | null;
}

export interface CourseAsset {
  id: string;
  status: CourseStatus;
  subject: { id: string; name: string; code: string | null; grade: number | null; category: string | null };
  institution_course: { id: string; code: string; name: string | null } | null;
  grade_value: string | null;
  grade_scale: string | null;
  grade_label: string | null;
  mastery: number | null;
  grade_proof_url: string | null;
  verification_method: string | null;
  verified_at: string | null;
  rejected_reason: string | null;
  rating: number;
  rating_count: number;
  xp: number;
  tier: string;
  next_tier: { key: string; label: string; min: number } | null;
  sessions_count: number;
  total_earnings: number;
  price_1: number | null;
  price_2: number | null;
  price_3: number | null;
  duration_1: number | null;
  duration_2: number | null;
  duration_3: number | null;
  reviews: CourseReview[];
  updated_at: string;
}

export interface Standing {
  overallRating: number | null;
  totalXp: number;
  level: { level: number; intoLevel: number; perLevel: number; toNext: number; progress: number };
  league: string;
  portfolioValue: number;
  totalSessions: number;
  totalReviews: number;
  counts: { total: number; claimed: number; pending: number; verified: number; live: number; rejected: number };
}

export interface Portfolio {
  profile: { id: string; name: string | null; email: string; avatar: string | null; rating: number | null };
  assets: CourseAsset[];
  standing: Standing;
}

export interface CatalogCourse {
  id: string;
  name: string;
  code: string | null;
  grade: number | null;
  category: string | null;
  owned: CourseStatus | null;
}

export interface CatalogTree {
  category: string;
  courses: CatalogCourse[];
  ownedCount: number;
  total: number;
}

// ---- presentation helpers ----

export const STATUS_META: Record<
  CourseStatus,
  { label: string; dot: string; text: string; ring: string; chipBg: string; chipText: string }
> = {
  claimed: { label: "Locked", dot: "bg-slate-400", text: "text-slate-500", ring: "border-slate-200 border-dashed", chipBg: "bg-slate-100", chipText: "text-slate-500" },
  pending: { label: "In review", dot: "bg-amber-400", text: "text-amber-600", ring: "border-amber-200", chipBg: "bg-amber-50", chipText: "text-amber-700" },
  verified: { label: "Verified", dot: "bg-brand-500", text: "text-brand-700", ring: "border-brand-200", chipBg: "bg-brand-50", chipText: "text-brand-700" },
  live: { label: "Live", dot: "bg-emerald-500", text: "text-emerald-700", ring: "border-emerald-200", chipBg: "bg-emerald-50", chipText: "text-emerald-700" },
  rejected: { label: "Below bar", dot: "bg-rose-400", text: "text-rose-600", ring: "border-rose-200", chipBg: "bg-rose-50", chipText: "text-rose-700" },
};

export const TIER_META: Record<string, { label: string; bg: string; text: string; ring: string }> = {
  bronze: { label: "Bronze", bg: "bg-amber-100", text: "text-amber-800", ring: "ring-amber-200" },
  silver: { label: "Silver", bg: "bg-slate-100", text: "text-slate-600", ring: "ring-slate-200" },
  gold: { label: "Gold", bg: "bg-yellow-100", text: "text-yellow-800", ring: "ring-yellow-300" },
  platinum: { label: "Platinum", bg: "bg-cyan-100", text: "text-cyan-800", ring: "ring-cyan-200" },
  diamond: { label: "Diamond", bg: "bg-brand-100", text: "text-brand-800", ring: "ring-brand-300" },
};

export const GRADE_SCALES: { value: string; label: string; placeholder: string; hint: string }[] = [
  { value: "percentage", label: "Percentage", placeholder: "e.g. 92", hint: "Bar to tutor: ≥ 75%" },
  { value: "letter", label: "Letter", placeholder: "e.g. A-", hint: "Bar to tutor: ≥ B-" },
  { value: "gpa", label: "GPA (4.0)", placeholder: "e.g. 3.8", hint: "Bar to tutor: ≥ 3.0" },
  { value: "ib", label: "IB (1–7)", placeholder: "e.g. 6", hint: "Bar to tutor: ≥ 5" },
  { value: "ap", label: "AP (1–5)", placeholder: "e.g. 5", hint: "Bar to tutor: ≥ 4" },
];

export function stars(rating: number): string {
  const full = Math.round(rating);
  return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
}
