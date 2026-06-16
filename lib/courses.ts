// Course-asset gamification engine.
// Pure scoring helpers (grades, XP, tiers, standing) + a few Prisma-backed
// mutators that keep the portfolio, the bookable listing, and the tutor's
// overall standing in sync. Imported by every /api/courses route.
import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ *
 * Course-asset states (the unlock funnel)
 * ------------------------------------------------------------------ */
export type CourseStatus =
  | "claimed" // placed on the tree, greyed/locked — picked in onboarding or added later
  | "pending" // grade submitted, awaiting review (reserved for manual document review)
  | "verified" // grade verified, right-to-tutor unlocked — needs pricing to go live
  | "live" // verified + priced + published — bookable, income-producing
  | "rejected"; // grade below the bar to tutor this course

/* ------------------------------------------------------------------ *
 * Grades — normalize any scale to a 0-100 mastery score + a qualifies flag.
 * "Qualifying" is the bar that unlocks the right to tutor the course.
 * ------------------------------------------------------------------ */
export type GradeScale = "percentage" | "letter" | "gpa" | "ib" | "ap";

const LETTER_TO_PCT: Record<string, number> = {
  "A+": 97, A: 93, "A-": 90,
  "B+": 87, B: 83, "B-": 80,
  "C+": 77, C: 73, "C-": 70,
  "D+": 67, D: 63, "D-": 60,
  F: 45,
};

// The bar to tutor — proficiency, not just a pass.
export const QUALIFY = {
  percentage: 75, // ≥ 75%
  letter: 80, // ≥ B- (mastery-normalized)
  gpa: 3.0, // ≥ 3.0 / 4.0
  ib: 5, // ≥ 5 / 7
  ap: 4, // ≥ 4 / 5
};

export function normalizeGrade(
  scale: GradeScale,
  raw: string | number
): { mastery: number; qualifies: boolean; label: string; valid: boolean } {
  const str = String(raw ?? "").trim();
  if (!str) return { mastery: 0, qualifies: false, label: "", valid: false };

  switch (scale) {
    case "percentage": {
      const v = parseFloat(str.replace("%", ""));
      if (isNaN(v) || v < 0 || v > 100) return { mastery: 0, qualifies: false, label: str, valid: false };
      return { mastery: Math.round(v), qualifies: v >= QUALIFY.percentage, label: `${Math.round(v)}%`, valid: true };
    }
    case "letter": {
      const key = str.toUpperCase();
      const pct = LETTER_TO_PCT[key];
      if (pct == null) return { mastery: 0, qualifies: false, label: str, valid: false };
      return { mastery: pct, qualifies: pct >= QUALIFY.letter, label: key, valid: true };
    }
    case "gpa": {
      const v = parseFloat(str);
      if (isNaN(v) || v < 0 || v > 4.5) return { mastery: 0, qualifies: false, label: str, valid: false };
      return { mastery: Math.round((v / 4.0) * 100), qualifies: v >= QUALIFY.gpa, label: `${v.toFixed(1)} GPA`, valid: true };
    }
    case "ib": {
      const v = parseFloat(str);
      if (isNaN(v) || v < 1 || v > 7) return { mastery: 0, qualifies: false, label: str, valid: false };
      return { mastery: Math.round((v / 7) * 100), qualifies: v >= QUALIFY.ib, label: `${v}/7 IB`, valid: true };
    }
    case "ap": {
      const v = parseFloat(str);
      if (isNaN(v) || v < 1 || v > 5) return { mastery: 0, qualifies: false, label: str, valid: false };
      return { mastery: Math.round((v / 5) * 100), qualifies: v >= QUALIFY.ap, label: `${v}/5 AP`, valid: true };
    }
    default:
      return { mastery: 0, qualifies: false, label: str, valid: false };
  }
}

/* ------------------------------------------------------------------ *
 * XP — what each action is worth.
 * ------------------------------------------------------------------ */
export const XP = {
  verify: 120, // verifying the grade — the unlock
  goLive: 60, // publishing a price, making it bookable
  session: 20, // each completed session on this course
  review: (rating: number) => Math.max(0, Math.round(rating)) * 12, // 5★ = 60, 1★ = 12
};

/* ------------------------------------------------------------------ *
 * Tiers — per-course league, climbs with XP (Duolingo-style).
 * ------------------------------------------------------------------ */
export const TIERS = [
  { key: "bronze", label: "Bronze", min: 0 },
  { key: "silver", label: "Silver", min: 250 },
  { key: "gold", label: "Gold", min: 600 },
  { key: "platinum", label: "Platinum", min: 1200 },
  { key: "diamond", label: "Diamond", min: 2500 },
] as const;

export function tierForXp(xp: number): string {
  let key = "bronze";
  for (const t of TIERS) if (xp >= t.min) key = t.key;
  return key;
}

export function nextTier(xp: number): { key: string; label: string; min: number } | null {
  for (const t of TIERS) if (xp < t.min) return { key: t.key, label: t.label, min: t.min };
  return null; // already diamond
}

/* ------------------------------------------------------------------ *
 * Portfolio level — overall standing across all course-assets.
 * ------------------------------------------------------------------ */
const XP_PER_LEVEL = 500;

export function levelForXp(totalXp: number) {
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const floor = (level - 1) * XP_PER_LEVEL;
  const ceil = level * XP_PER_LEVEL;
  return {
    level,
    intoLevel: totalXp - floor,
    perLevel: XP_PER_LEVEL,
    toNext: ceil - totalXp,
    progress: Math.round(((totalXp - floor) / XP_PER_LEVEL) * 100),
  };
}

/* ------------------------------------------------------------------ *
 * Prisma-backed mutators
 * ------------------------------------------------------------------ */

// Mirror a live course-asset into ProfilesOnSubjects so the existing booking,
// explore and availability machinery can read it. PoS = published listings.
export async function publishListing(asset: {
  tutor_id: string;
  subject_id: string;
  institution_course_id: string | null;
  price_1: number | null;
  price_2: number | null;
  price_3: number | null;
  duration_1: number | null;
  duration_2: number | null;
  duration_3: number | null;
}) {
  await prisma.profilesOnSubjects.upsert({
    where: { profile_id_subject_id: { profile_id: asset.tutor_id, subject_id: asset.subject_id } },
    update: {
      institution_course_id: asset.institution_course_id ?? null,
      price_1: asset.price_1 ?? 0,
      price_2: asset.price_2 ?? 0,
      price_3: asset.price_3 ?? 0,
      duration_1: asset.duration_1 ?? 0.5,
      duration_2: asset.duration_2 ?? 1,
      duration_3: asset.duration_3 ?? 1.5,
    },
    create: {
      profile_id: asset.tutor_id,
      subject_id: asset.subject_id,
      institution_course_id: asset.institution_course_id ?? null,
      price_1: asset.price_1 ?? 0,
      price_2: asset.price_2 ?? 0,
      price_3: asset.price_3 ?? 0,
      duration_1: asset.duration_1 ?? 0.5,
      duration_2: asset.duration_2 ?? 1,
      duration_3: asset.duration_3 ?? 1.5,
    },
  });
}

// Remove a course from the bookable listings (e.g. unclaimed or pulled offline).
export async function unpublishListing(tutorId: string, subjectId: string) {
  await prisma.profilesOnSubjects.deleteMany({
    where: { profile_id: tutorId, subject_id: subjectId },
  });
}

// Recompute a tutor's overall rating from their course-assets:
// rating_count-weighted average across courses that have at least one review.
export async function recomputeOverallRating(tutorId: string) {
  const assets = await prisma.courseAssets.findMany({
    where: { tutor_id: tutorId, rating_count: { gt: 0 } },
    select: { rating: true, rating_count: true },
  });
  let weighted = 0;
  let count = 0;
  for (const a of assets) {
    weighted += a.rating * a.rating_count;
    count += a.rating_count;
  }
  const overall = count > 0 ? Math.round((weighted / count) * 100) / 100 : null;
  await prisma.profiles.update({ where: { id: tutorId }, data: { rating: overall } });
  return overall;
}
