import "server-only";
import { unstable_cache } from "next/cache";
import moment from "moment-timezone";
import { Prisma } from "@/prisma/generated";
import { prisma } from "@/lib/prisma";
import { gmv, platformRevenue, tutorPayout, TAKE_RATE_OF_GMV } from "@/lib/billing";

/**
 * Server-side analytics for the BI dashboard.
 *
 * All money is derived from completed sessions' base `amount` using the
 * marketplace economics in lib/billing.ts. The public Sessions table collides
 * with the auth `sessions` model on the Prisma client, so we query via
 * $queryRaw against explicitly-quoted tables. Counts are cast to ::int and sums
 * to ::float so results are plain JSON (cacheable / no BigInt).
 *
 * Reporting timezone is fixed to America/Toronto (the marketplace is Ontario-
 * curriculum). Change REPORTING_TZ to re-bucket every day/week/month boundary.
 */

export const REPORTING_TZ = "America/Toronto";
export const CACHE_TTL_SECONDS = 300;

export type Range = "7d" | "30d" | "90d" | "12mo";

interface RangeSpec {
  days: number;
  granularity: "day" | "week" | "month";
  /** moment unit used to step buckets when gap-filling. */
  step: "day" | "week" | "month";
  label: string;
}

const RANGES: Record<Range, RangeSpec> = {
  "7d": { days: 7, granularity: "day", step: "day", label: "Last 7 days" },
  "30d": { days: 30, granularity: "day", step: "day", label: "Last 30 days" },
  "90d": { days: 90, granularity: "week", step: "week", label: "Last 90 days" },
  "12mo": { days: 365, granularity: "month", step: "month", label: "Last 12 months" },
};

export function isRange(v: string | undefined): v is Range {
  return v === "7d" || v === "30d" || v === "90d" || v === "12mo";
}

export function rangeLabel(range: Range): string {
  return RANGES[range].label;
}

interface TimeWindow {
  start: Date;
  prevStart: Date;
  end: Date;
  spec: RangeSpec;
}

function windowFor(range: Range): TimeWindow {
  const spec = RANGES[range];
  const end = new Date();
  const start = new Date(end.getTime() - spec.days * 24 * 60 * 60 * 1000);
  const prevStart = new Date(start.getTime() - spec.days * 24 * 60 * 60 * 1000);
  return { start, prevStart, end, spec };
}

/** Percentage change from prev → cur; null when there's no baseline. */
function pctDelta(cur: number, prev: number): number | null {
  if (!prev) return cur ? null : 0; // null = "new" (no prior baseline)
  return ((cur - prev) / prev) * 100;
}

export interface SeriesPoint {
  date: string; // ISO date (bucket start, in reporting TZ)
  [metric: string]: number | string;
}

/**
 * Gap-fill a sparse bucket map into a dense, ordered series across the window.
 * `rows` is keyed by ISO bucket-start date.
 */
function fillSeries(
  win: TimeWindow,
  rows: Map<string, Record<string, number>>,
  metrics: string[]
): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  let cursor = moment.tz(win.start, REPORTING_TZ).startOf(win.spec.step);
  const last = moment.tz(win.end, REPORTING_TZ).startOf(win.spec.step);
  while (cursor.isSameOrBefore(last)) {
    const key = cursor.format("YYYY-MM-DD");
    const found = rows.get(key) ?? {};
    const point: SeriesPoint = { date: key };
    for (const m of metrics) point[m] = found[m] ?? 0;
    out.push(point);
    cursor = cursor.add(1, win.spec.step);
  }
  return out;
}

/** Normalize a DB bucket timestamp to the reporting-TZ ISO date key. */
function bucketKey(bucket: Date | string): string {
  return moment.tz(bucket, REPORTING_TZ).format("YYYY-MM-DD");
}

// ---------------------------------------------------------------------------
// Financials
// ---------------------------------------------------------------------------

export interface Kpi {
  value: number;
  prev: number;
  deltaPct: number | null;
}

export interface FinancialsData {
  range: Range;
  gmv: Kpi;
  netRevenue: Kpi;
  tutorPayouts: Kpi;
  completedSessions: Kpi;
  takeRatePct: number;
  arppu: number; // avg net revenue per paying student
  series: SeriesPoint[]; // { date, gmv, revenue, payouts }
  bySubject: { name: string; category: string | null; revenue: number; sessions: number }[];
}

async function _financials(range: Range): Promise<FinancialsData> {
  const win = windowFor(range);

  const totals = await prisma.$queryRaw<
    { cur_amount: number; cur_sessions: number; prev_amount: number; prev_sessions: number; payers: number }[]
  >(Prisma.sql`
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE created_at >= ${win.start}), 0)::float AS cur_amount,
      COUNT(*) FILTER (WHERE created_at >= ${win.start})::int AS cur_sessions,
      COALESCE(SUM(amount) FILTER (WHERE created_at >= ${win.prevStart} AND created_at < ${win.start}), 0)::float AS prev_amount,
      COUNT(*) FILTER (WHERE created_at >= ${win.prevStart} AND created_at < ${win.start})::int AS prev_sessions,
      COUNT(DISTINCT student_id) FILTER (WHERE created_at >= ${win.start})::int AS payers
    FROM "public"."Sessions"
    WHERE status = 'completed' AND created_at >= ${win.prevStart}
  `);
  const t = totals[0] ?? { cur_amount: 0, cur_sessions: 0, prev_amount: 0, prev_sessions: 0, payers: 0 };

  const seriesRows = await prisma.$queryRaw<{ bucket: Date; amount: number }[]>(Prisma.sql`
    SELECT date_trunc(${win.spec.granularity}, created_at AT TIME ZONE ${REPORTING_TZ}) AS bucket,
           COALESCE(SUM(amount), 0)::float AS amount
    FROM "public"."Sessions"
    WHERE status = 'completed' AND created_at >= ${win.start}
    GROUP BY 1 ORDER BY 1
  `);
  const map = new Map<string, Record<string, number>>();
  for (const r of seriesRows) {
    const amt = r.amount ?? 0;
    map.set(bucketKey(r.bucket), {
      gmv: gmv(amt),
      revenue: platformRevenue(amt),
      payouts: tutorPayout(amt),
    });
  }
  const series = fillSeries(win, map, ["gmv", "revenue", "payouts"]);

  const bySubjectRows = await prisma.$queryRaw<
    { name: string | null; category: string | null; amount: number; sessions: number }[]
  >(Prisma.sql`
    SELECT s.name, s.category,
           COALESCE(SUM(se.amount), 0)::float AS amount,
           COUNT(*)::int AS sessions
    FROM "public"."Sessions" se
    LEFT JOIN "public"."Subjects" s ON s.id = se.subject_id
    WHERE se.status = 'completed' AND se.created_at >= ${win.start}
    GROUP BY s.name, s.category
    ORDER BY amount DESC
    LIMIT 8
  `);

  const curGmv = gmv(t.cur_amount);
  const prevGmv = gmv(t.prev_amount);
  const curRev = platformRevenue(t.cur_amount);
  const prevRev = platformRevenue(t.prev_amount);
  const curPay = tutorPayout(t.cur_amount);
  const prevPay = tutorPayout(t.prev_amount);

  return {
    range,
    gmv: { value: curGmv, prev: prevGmv, deltaPct: pctDelta(curGmv, prevGmv) },
    netRevenue: { value: curRev, prev: prevRev, deltaPct: pctDelta(curRev, prevRev) },
    tutorPayouts: { value: curPay, prev: prevPay, deltaPct: pctDelta(curPay, prevPay) },
    completedSessions: {
      value: t.cur_sessions,
      prev: t.prev_sessions,
      deltaPct: pctDelta(t.cur_sessions, t.prev_sessions),
    },
    takeRatePct: TAKE_RATE_OF_GMV * 100,
    arppu: t.payers ? curRev / t.payers : 0,
    series,
    bySubject: bySubjectRows.map((r) => ({
      name: r.name ?? "Unmapped",
      category: r.category,
      revenue: platformRevenue(r.amount ?? 0),
      sessions: r.sessions,
    })),
  };
}

// ---------------------------------------------------------------------------
// Marketplace liquidity
// ---------------------------------------------------------------------------

export interface MarketplaceData {
  range: Range;
  requests: Kpi; // all sessions created in window
  completedRate: number; // completed / requests
  instantFillRate: number; // instant requests that reached accepted/in_progress/completed
  activeTutors: Kpi;
  activeStudents: Kpi;
  utilization: number; // completed sessions per active tutor
  funnel: { status: string; count: number }[];
  supplyDemand: {
    subject: string;
    demand: number;
    liveTutors: number;
    unmet: boolean;
  }[];
}

async function _marketplace(range: Range): Promise<MarketplaceData> {
  const win = windowFor(range);

  const funnelRows = await prisma.$queryRaw<{ status: string; count: number }[]>(Prisma.sql`
    SELECT status, COUNT(*)::int AS count
    FROM "public"."Sessions"
    WHERE created_at >= ${win.start}
    GROUP BY status
  `);
  const funnel = funnelRows.map((r) => ({ status: r.status, count: r.count }));
  const statusCount = (s: string) => funnel.find((f) => f.status === s)?.count ?? 0;
  const totalRequests = funnel.reduce((a, b) => a + b.count, 0);
  const completed = statusCount("completed");

  const prevReqRow = await prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
    SELECT COUNT(*)::int AS count FROM "public"."Sessions"
    WHERE created_at >= ${win.prevStart} AND created_at < ${win.start}
  `);
  const prevRequests = prevReqRow[0]?.count ?? 0;

  const instantRows = await prisma.$queryRaw<{ status: string; count: number }[]>(Prisma.sql`
    SELECT status, COUNT(*)::int AS count
    FROM "public"."Sessions"
    WHERE is_instant = true AND created_at >= ${win.start}
    GROUP BY status
  `);
  const instantTotal = instantRows.reduce((a, b) => a + b.count, 0);
  const instantFilled = instantRows
    .filter((r) => ["accepted", "in_progress", "completed", "active"].includes(r.status))
    .reduce((a, b) => a + b.count, 0);

  const active = await prisma.$queryRaw<
    { cur_tutors: number; cur_students: number; prev_tutors: number; prev_students: number }[]
  >(Prisma.sql`
    SELECT
      COUNT(DISTINCT tutor_id) FILTER (WHERE created_at >= ${win.start})::int AS cur_tutors,
      COUNT(DISTINCT student_id) FILTER (WHERE created_at >= ${win.start})::int AS cur_students,
      COUNT(DISTINCT tutor_id) FILTER (WHERE created_at >= ${win.prevStart} AND created_at < ${win.start})::int AS prev_tutors,
      COUNT(DISTINCT student_id) FILTER (WHERE created_at >= ${win.prevStart} AND created_at < ${win.start})::int AS prev_students
    FROM "public"."Sessions"
    WHERE status = 'completed' AND created_at >= ${win.prevStart}
  `);
  const a = active[0] ?? { cur_tutors: 0, cur_students: 0, prev_tutors: 0, prev_students: 0 };

  // Supply (live course assets per subject) vs demand (sessions per subject).
  const sdRows = await prisma.$queryRaw<
    { subject: string | null; demand: number; live_tutors: number }[]
  >(Prisma.sql`
    SELECT s.name AS subject,
      COALESCE(d.demand, 0)::int AS demand,
      COUNT(ca.id) FILTER (WHERE ca.status = 'live')::int AS live_tutors
    FROM "public"."Subjects" s
    LEFT JOIN "public"."CourseAssets" ca ON ca.subject_id = s.id
    LEFT JOIN (
      SELECT subject_id, COUNT(*)::int AS demand
      FROM "public"."Sessions"
      WHERE created_at >= ${win.start} AND subject_id IS NOT NULL
      GROUP BY subject_id
    ) d ON d.subject_id = s.id
    GROUP BY s.name, d.demand
    HAVING COALESCE(d.demand, 0) > 0 OR COUNT(ca.id) FILTER (WHERE ca.status = 'live') > 0
    ORDER BY demand DESC, live_tutors DESC
    LIMIT 12
  `);

  return {
    range,
    requests: { value: totalRequests, prev: prevRequests, deltaPct: pctDelta(totalRequests, prevRequests) },
    completedRate: totalRequests ? (completed / totalRequests) * 100 : 0,
    instantFillRate: instantTotal ? (instantFilled / instantTotal) * 100 : 0,
    activeTutors: { value: a.cur_tutors, prev: a.prev_tutors, deltaPct: pctDelta(a.cur_tutors, a.prev_tutors) },
    activeStudents: { value: a.cur_students, prev: a.prev_students, deltaPct: pctDelta(a.cur_students, a.prev_students) },
    utilization: a.cur_tutors ? completed / a.cur_tutors : 0,
    funnel,
    supplyDemand: sdRows.map((r) => ({
      subject: r.subject ?? "Unmapped",
      demand: r.demand,
      liveTutors: r.live_tutors,
      unmet: r.demand > 0 && r.live_tutors === 0,
    })),
  };
}

// ---------------------------------------------------------------------------
// Growth
// ---------------------------------------------------------------------------

export interface GrowthData {
  range: Range;
  newTutors: Kpi;
  newStudents: Kpi;
  totalUsers: number;
  activationPct: number; // students created in window with >=1 session
  series: SeriesPoint[]; // { date, tutors, students }
}

async function _growth(range: Range): Promise<GrowthData> {
  const win = windowFor(range);

  const totals = await prisma.$queryRaw<{ role: string | null; cur: number; prev: number }[]>(Prisma.sql`
    SELECT role,
      COUNT(*) FILTER (WHERE created_at >= ${win.start})::int AS cur,
      COUNT(*) FILTER (WHERE created_at >= ${win.prevStart} AND created_at < ${win.start})::int AS prev
    FROM "public"."Profiles"
    WHERE created_at >= ${win.prevStart}
    GROUP BY role
  `);
  const roleKpi = (role: string) => {
    const row = totals.find((r) => r.role === role);
    return { value: row?.cur ?? 0, prev: row?.prev ?? 0, deltaPct: pctDelta(row?.cur ?? 0, row?.prev ?? 0) };
  };

  const totalRow = await prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
    SELECT COUNT(*)::int AS count FROM "public"."Profiles" WHERE role IN ('student','tutor')
  `);

  const seriesRows = await prisma.$queryRaw<{ bucket: Date; role: string | null; count: number }[]>(Prisma.sql`
    SELECT date_trunc(${win.spec.granularity}, created_at AT TIME ZONE ${REPORTING_TZ}) AS bucket,
           role, COUNT(*)::int AS count
    FROM "public"."Profiles"
    WHERE created_at >= ${win.start} AND role IN ('student','tutor')
    GROUP BY 1, 2 ORDER BY 1
  `);
  const map = new Map<string, Record<string, number>>();
  for (const r of seriesRows) {
    const key = bucketKey(r.bucket);
    const cur = map.get(key) ?? {};
    if (r.role === "tutor") cur.tutors = (cur.tutors ?? 0) + r.count;
    if (r.role === "student") cur.students = (cur.students ?? 0) + r.count;
    map.set(key, cur);
  }
  const series = fillSeries(win, map, ["tutors", "students"]);

  const activation = await prisma.$queryRaw<{ total: number; activated: number }[]>(Prisma.sql`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM "public"."Sessions" se WHERE se.student_id = p.id
      ))::int AS activated
    FROM "public"."Profiles" p
    WHERE p.role = 'student' AND p.created_at >= ${win.start}
  `);
  const act = activation[0] ?? { total: 0, activated: 0 };

  return {
    range,
    newTutors: roleKpi("tutor"),
    newStudents: roleKpi("student"),
    totalUsers: totalRow[0]?.count ?? 0,
    activationPct: act.total ? (act.activated / act.total) * 100 : 0,
    series,
  };
}

// ---------------------------------------------------------------------------
// Quality & retention
// ---------------------------------------------------------------------------

export interface QualityData {
  range: Range;
  avgRating: number;
  reviewCount: number;
  repeatRatePct: number; // students with >=2 completed sessions / students with >=1
  tutorRetentionPct: number; // tutors active both this and prev window
  distribution: { rating: number; count: number }[]; // 1..5
}

async function _quality(range: Range): Promise<QualityData> {
  const win = windowFor(range);

  const avgRow = await prisma.$queryRaw<{ avg: number | null; count: number }[]>(Prisma.sql`
    SELECT AVG(rating)::float AS avg, COUNT(*)::int AS count
    FROM "public"."CourseReviews"
    WHERE created_at >= ${win.start}
  `);
  const distRows = await prisma.$queryRaw<{ rating: number; count: number }[]>(Prisma.sql`
    SELECT rating, COUNT(*)::int AS count
    FROM "public"."CourseReviews"
    WHERE created_at >= ${win.start}
    GROUP BY rating
  `);
  const distribution = [1, 2, 3, 4, 5].map((r) => ({
    rating: r,
    count: distRows.find((d) => d.rating === r)?.count ?? 0,
  }));

  const repeatRow = await prisma.$queryRaw<{ with_session: number; repeat: number }[]>(Prisma.sql`
    SELECT
      COUNT(*) FILTER (WHERE c >= 1)::int AS with_session,
      COUNT(*) FILTER (WHERE c >= 2)::int AS repeat
    FROM (
      SELECT student_id, COUNT(*)::int AS c
      FROM "public"."Sessions"
      WHERE status = 'completed'
      GROUP BY student_id
    ) t
  `);
  const rep = repeatRow[0] ?? { with_session: 0, repeat: 0 };

  const retRow = await prisma.$queryRaw<{ prev_active: number; retained: number }[]>(Prisma.sql`
    WITH prev AS (
      SELECT DISTINCT tutor_id FROM "public"."Sessions"
      WHERE status = 'completed' AND created_at >= ${win.prevStart} AND created_at < ${win.start}
    ), cur AS (
      SELECT DISTINCT tutor_id FROM "public"."Sessions"
      WHERE status = 'completed' AND created_at >= ${win.start}
    )
    SELECT (SELECT COUNT(*)::int FROM prev) AS prev_active,
           (SELECT COUNT(*)::int FROM prev WHERE tutor_id IN (SELECT tutor_id FROM cur)) AS retained
  `);
  const ret = retRow[0] ?? { prev_active: 0, retained: 0 };

  return {
    range,
    avgRating: avgRow[0]?.avg ?? 0,
    reviewCount: avgRow[0]?.count ?? 0,
    repeatRatePct: rep.with_session ? (rep.repeat / rep.with_session) * 100 : 0,
    tutorRetentionPct: ret.prev_active ? (ret.retained / ret.prev_active) * 100 : 0,
    distribution,
  };
}

// ---------------------------------------------------------------------------
// Cached public API
// ---------------------------------------------------------------------------

const cached = <T>(fn: (r: Range) => Promise<T>, key: string) =>
  unstable_cache((range: Range) => fn(range), [key], { revalidate: CACHE_TTL_SECONDS });

export const getFinancials = cached(_financials, "financials");
export const getMarketplace = cached(_marketplace, "marketplace");
export const getGrowth = cached(_growth, "growth");
export const getQuality = cached(_quality, "quality");

export interface OverviewData {
  range: Range;
  financials: FinancialsData;
  marketplace: MarketplaceData;
  growth: GrowthData;
  quality: QualityData;
}

export async function getOverview(range: Range): Promise<OverviewData> {
  // Run sequentially, not Promise.all: the production DB pool is capped at
  // connection_limit=1, so fanning out four multi-query domains at once causes
  // P2024 pool-timeout errors. Each call is cached (5-min TTL), so the
  // sequential cost is paid at most once per window.
  const financials = await getFinancials(range);
  const marketplace = await getMarketplace(range);
  const growth = await getGrowth(range);
  const quality = await getQuality(range);
  return { range, financials, marketplace, growth, quality };
}
