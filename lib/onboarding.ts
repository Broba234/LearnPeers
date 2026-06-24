import "server-only";
import { unstable_cache } from "next/cache";
import { Prisma } from "@/prisma/generated";
import { prisma } from "@/lib/prisma";
import { CACHE_TTL_SECONDS, type Range } from "@/lib/analytics";

/**
 * Onboarding funnel analytics, derived from canonical tables (no separate event
 * log needed for v1): a user's furthest step is reconstructed from what they've
 * actually saved — email verification, education declaration, profile info,
 * subjects, pricing, Stripe, and the profile_setup completion flag.
 *
 * This powers the Onboarding dashboard: where every signup currently sits, the
 * step-by-step drop-off, and who has stalled.
 */

const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90, "12mo": 365 };

export interface OnboardingStep {
  key: string;
  label: string;
  reached: number; // users who got at least this far
  conversionFromPrev: number; // % of the previous step that reached this one
  dropoff: number; // users whose furthest step is exactly this one (and not done)
}

export interface RoleFunnel {
  role: "tutor" | "student";
  signups: number;
  completed: number;
  completionRatePct: number;
  inProgress: number;
  stalled: number; // in progress and signed up > 24h ago
  steps: OnboardingStep[];
  current: { key: string; label: string; count: number }[]; // where incomplete users sit now
}

export interface OnboardingData {
  range: Range;
  tutor: RoleFunnel;
  student: RoleFunnel;
}

interface StepDef {
  key: string;
  label: string;
  predicate: (f: UserFlags) => boolean;
}

interface UserFlags {
  role: string;
  emailVerified: boolean;
  hasEducation: boolean;
  hasBio: boolean;
  hasSubjects: boolean;
  hasPricing: boolean;
  hasStripe: boolean;
  done: boolean;
}

const TUTOR_STEPS: StepDef[] = [
  { key: "signup", label: "Signed up", predicate: () => true },
  { key: "verify_email", label: "Verified email", predicate: (f) => f.emailVerified },
  { key: "education", label: "Verified school", predicate: (f) => f.hasEducation },
  { key: "profile", label: "Added profile info", predicate: (f) => f.hasBio },
  { key: "subjects", label: "Picked subjects", predicate: (f) => f.hasSubjects },
  { key: "pricing", label: "Set pricing", predicate: (f) => f.hasPricing },
  { key: "payments", label: "Connected Stripe", predicate: (f) => f.hasStripe },
  { key: "done", label: "Completed", predicate: (f) => f.done },
];

const STUDENT_STEPS: StepDef[] = [
  { key: "signup", label: "Signed up", predicate: () => true },
  { key: "verify_email", label: "Verified email", predicate: (f) => f.emailVerified },
  { key: "education", label: "Added school", predicate: (f) => f.hasEducation },
  { key: "interests", label: "Picked subjects", predicate: (f) => f.hasSubjects },
  { key: "done", label: "Completed", predicate: (f) => f.done },
];

/** Furthest step index a user reached. `done` implies the last index. */
function furthestIndex(steps: StepDef[], f: UserFlags): number {
  if (f.done) return steps.length - 1;
  let idx = 0;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].predicate(f)) idx = i;
  }
  return idx;
}

function buildFunnel(role: "tutor" | "student", steps: StepDef[], users: UserFlags[]): RoleFunnel {
  const signups = users.length;
  const lastIdx = steps.length - 1;

  // reached[i] = users whose furthest >= i
  const reached = new Array(steps.length).fill(0);
  const stuckAt = new Array(steps.length).fill(0); // furthest === i and not done
  const currentBucket = new Array(steps.length).fill(0); // first unmet step for incomplete users

  let completed = 0;
  for (const u of users) {
    const fi = furthestIndex(steps, u);
    if (u.done) completed++;
    for (let i = 0; i <= fi; i++) reached[i]++;
    if (!u.done) {
      stuckAt[fi]++;
      const next = Math.min(fi + 1, lastIdx);
      currentBucket[next]++;
    }
  }

  const stepRows: OnboardingStep[] = steps.map((s, i) => ({
    key: s.key,
    label: s.label,
    reached: reached[i],
    conversionFromPrev: i === 0 ? 100 : reached[i - 1] ? (reached[i] / reached[i - 1]) * 100 : 0,
    dropoff: i === lastIdx ? 0 : stuckAt[i],
  }));

  const inProgress = signups - completed;
  const current = steps
    .map((s, i) => ({ key: s.key, label: s.label, count: currentBucket[i] }))
    .filter((c) => c.count > 0 && c.key !== "signup");

  return {
    role,
    signups,
    completed,
    completionRatePct: signups ? (completed / signups) * 100 : 0,
    inProgress,
    stalled: 0, // filled by caller (needs created_at)
    steps: stepRows,
    current,
  };
}

interface UserRow extends UserFlags {
  id: string;
  created_at: Date;
}

async function _onboarding(range: Range): Promise<OnboardingData> {
  const start = new Date(Date.now() - RANGE_DAYS[range] * 86400_000);
  const dayAgo = new Date(Date.now() - 86400_000);

  const rows = await prisma.$queryRaw<
    {
      id: string;
      role: string;
      created_at: Date;
      email_verified: boolean;
      has_bio: boolean;
      has_stripe: boolean;
      done: boolean;
      has_education: boolean;
      has_subjects: boolean;
      has_pricing: boolean;
    }[]
  >(Prisma.sql`
    SELECT
      p.id,
      p.role,
      p.created_at,
      COALESCE(p.email_verified, false) AS email_verified,
      (p.bio IS NOT NULL AND length(btrim(p.bio)) > 0) AS has_bio,
      (p.stripe_account_id IS NOT NULL) AS has_stripe,
      COALESCE(p.profile_setup, false) AS done,
      EXISTS (SELECT 1 FROM "public"."ProfileInstitutions" pi WHERE pi.profile_id = p.id) AS has_education,
      EXISTS (SELECT 1 FROM "public"."ProfilesOnSubjects" pos WHERE pos.profile_id = p.id) AS has_subjects,
      EXISTS (SELECT 1 FROM "public"."ProfilesOnSubjects" pos WHERE pos.profile_id = p.id AND COALESCE(pos.price_1, 0) > 0) AS has_pricing
    FROM "public"."Profiles" p
    WHERE p.role IN ('student', 'tutor') AND p.created_at >= ${start}
  `);

  const users: UserRow[] = rows.map((r) => ({
    id: r.id,
    role: r.role,
    created_at: r.created_at,
    emailVerified: r.email_verified,
    hasEducation: r.has_education,
    hasBio: r.has_bio,
    hasSubjects: r.has_subjects,
    hasPricing: r.has_pricing,
    hasStripe: r.has_stripe,
    done: r.done,
  }));

  const tutors = users.filter((u) => u.role === "tutor");
  const students = users.filter((u) => u.role === "student");

  const tutorFunnel = buildFunnel("tutor", TUTOR_STEPS, tutors);
  const studentFunnel = buildFunnel("student", STUDENT_STEPS, students);

  tutorFunnel.stalled = tutors.filter((u) => !u.done && u.created_at < dayAgo).length;
  studentFunnel.stalled = students.filter((u) => !u.done && u.created_at < dayAgo).length;

  return { range, tutor: tutorFunnel, student: studentFunnel };
}

export const getOnboarding = unstable_cache((range: Range) => _onboarding(range), ["onboarding"], {
  revalidate: CACHE_TTL_SECONDS,
});
