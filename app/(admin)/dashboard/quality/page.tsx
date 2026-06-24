import { requireAdminPage } from "@/lib/admin-access";
import { getQuality, isRange, rangeLabel, type Range } from "@/lib/analytics";
import PageHeader from "@/components/admin/dashboard/PageHeader";
import KpiCard from "@/components/admin/dashboard/KpiCard";
import ChartCard from "@/components/admin/dashboard/ChartCard";
import { CategoryBarChart, PALETTE } from "@/components/admin/dashboard/charts";
import { formatNumber, formatPct } from "@/components/admin/dashboard/format";

export const dynamic = "force-dynamic";

export default async function QualityPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminPage("quality");
  const sp = await searchParams;
  const range: Range = isRange(sp.range) ? sp.range : "30d";
  const q = await getQuality(range);

  const distData = q.distribution.map((d) => ({
    label: `${d.rating}★`,
    count: d.count,
    color: d.rating >= 4 ? PALETTE.emerald : d.rating === 3 ? PALETTE.amber : PALETTE.rose,
  }));
  const hasReviews = q.reviewCount > 0;

  return (
    <div>
      <PageHeader title="Quality & retention" subtitle={`Satisfaction & loyalty · ${rangeLabel(range)}`} range={range} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Avg rating" value={q.avgRating ? q.avgRating.toFixed(2) : "—"} hint={`${formatNumber(q.reviewCount)} reviews`} />
        <KpiCard label="Repeat rate" value={formatPct(q.repeatRatePct)} hint="Students with 2+ sessions" />
        <KpiCard label="Tutor retention" value={formatPct(q.tutorRetentionPct)} hint="Active vs prior period" />
        <KpiCard label="Reviews" value={formatNumber(q.reviewCount)} hint="Submitted this period" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <ChartCard title="Rating distribution" subtitle="Reviews this period">
          {hasReviews ? (
            <CategoryBarChart data={distData} height={260} />
          ) : (
            <Empty text="No reviews submitted in this period." />
          )}
        </ChartCard>

        <ChartCard title="Loyalty" subtitle="What keeps the marketplace sticky">
          <div className="space-y-5 pt-2">
            <Gauge label="Repeat booking rate" pct={q.repeatRatePct} color={PALETTE.brand} caption="Students returning for a 2nd+ session" />
            <Gauge label="Tutor retention" pct={q.tutorRetentionPct} color={PALETTE.emerald} caption="Tutors active this period who were also active last period" />
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed pt-2">
              Repeat rate is computed across all completed sessions to date; retention compares the
              current window against the immediately preceding one.
            </p>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function Gauge({ label, pct, color, caption }: { label: string; pct: number; color: string; caption: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 dark:text-gray-300">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-white">{formatPct(pct)}</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{caption}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex items-center justify-center h-60 text-sm text-gray-400 dark:text-gray-500">{text}</div>;
}
