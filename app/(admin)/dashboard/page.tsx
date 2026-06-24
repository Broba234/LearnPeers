import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-access";
import { getOverview, isRange, rangeLabel, type Range } from "@/lib/analytics";
import PageHeader from "@/components/admin/dashboard/PageHeader";
import KpiCard from "@/components/admin/dashboard/KpiCard";
import ChartCard from "@/components/admin/dashboard/ChartCard";
import { TrendChart, PALETTE } from "@/components/admin/dashboard/charts";
import { formatCurrency, formatNumber, formatPct } from "@/components/admin/dashboard/format";

export const dynamic = "force-dynamic";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const ctx = await requireAdminPage("overview");
  const sp = await searchParams;
  const range: Range = isRange(sp.range) ? sp.range : "30d";
  const data = await getOverview(range);
  const { financials: f, marketplace: m, growth: g, quality: q } = data;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${(ctx.name ?? "there").split(" ")[0]}`}
        subtitle={`Marketplace health · ${rangeLabel(range)}`}
        range={range}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Net revenue" value={formatCurrency(f.netRevenue.value, { compact: true })} deltaPct={f.netRevenue.deltaPct} hint={`${formatPct(f.takeRatePct)} take of GMV`} />
        <KpiCard label="GMV" value={formatCurrency(f.gmv.value, { compact: true })} deltaPct={f.gmv.deltaPct} hint="Total student spend" />
        <KpiCard label="Completed sessions" value={formatNumber(f.completedSessions.value)} deltaPct={f.completedSessions.deltaPct} hint={`${formatPct(m.completedRate)} of requests`} />
        <KpiCard label="Active tutors" value={formatNumber(m.activeTutors.value)} deltaPct={m.activeTutors.deltaPct} hint={`${m.utilization.toFixed(1)} sessions / tutor`} />
        <KpiCard label="New signups" value={formatNumber(g.newTutors.value + g.newStudents.value)} deltaPct={null} hint={`${formatNumber(g.newTutors.value)} tutors · ${formatNumber(g.newStudents.value)} students`} />
        <KpiCard label="Avg rating" value={q.avgRating ? q.avgRating.toFixed(2) : "—"} hint={`${formatNumber(q.reviewCount)} reviews`} />
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title="Revenue & GMV" subtitle={rangeLabel(range)} className="lg:col-span-2">
          <TrendChart
            data={f.series}
            series={[
              { key: "gmv", label: "GMV", color: PALETTE.slate },
              { key: "revenue", label: "Net revenue", color: PALETTE.brand },
            ]}
            format="currencyCompact"
          />
        </ChartCard>
        <ChartCard title="New signups" subtitle="Tutors vs students">
          <TrendChart
            data={g.series}
            series={[
              { key: "students", label: "Students", color: PALETTE.emerald },
              { key: "tutors", label: "Tutors", color: PALETTE.violet },
            ]}
            stacked
            format="number"
          />
        </ChartCard>
      </div>

      {/* Health strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <KpiCard label="Instant fill rate" value={formatPct(m.instantFillRate)} hint="Instant requests answered" />
        <KpiCard label="Activation" value={formatPct(g.activationPct)} hint="New students who booked" />
        <KpiCard label="Repeat rate" value={formatPct(q.repeatRatePct)} hint="Students with 2+ sessions" />
        <KpiCard label="Tutor retention" value={formatPct(q.tutorRetentionPct)} hint="Active vs prior period" />
      </div>

      {/* Unmet demand callout + deep links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title="Supply vs demand" subtitle="Top subjects this period" className="lg:col-span-2">
          {m.supplyDemand.length === 0 ? (
            <EmptyHint text="No booking activity in this period yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    <th className="py-2 pr-4 font-medium">Subject</th>
                    <th className="py-2 px-4 font-medium text-right">Demand</th>
                    <th className="py-2 px-4 font-medium text-right">Live tutors</th>
                    <th className="py-2 pl-4 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {m.supplyDemand.slice(0, 6).map((r) => (
                    <tr key={r.subject}>
                      <td className="py-2 pr-4 text-gray-900 dark:text-white">{r.subject}</td>
                      <td className="py-2 px-4 text-right tabular-nums text-gray-700 dark:text-gray-300">{r.demand}</td>
                      <td className="py-2 px-4 text-right tabular-nums text-gray-700 dark:text-gray-300">{r.liveTutors}</td>
                      <td className="py-2 pl-4 text-right">
                        {r.unmet ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">Unmet</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Covered</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Dive deeper" subtitle="Detailed reports">
          <div className="flex flex-col gap-2">
            {[
              { href: "/dashboard/financials", label: "Financials", desc: "Revenue, take rate, payouts" },
              { href: "/dashboard/marketplace", label: "Marketplace", desc: "Liquidity & supply/demand" },
              { href: "/dashboard/growth", label: "Growth", desc: "Signups & activation" },
              { href: "/dashboard/quality", label: "Quality", desc: "Ratings & retention" },
            ]
              .filter((l) => ctx.allowedPages.has(l.href.split("/").pop()!))
              .map((l) => (
                <Link key={l.href} href={`${l.href}?range=${range}`} className="group flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 px-4 py-3 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50/40 dark:hover:bg-brand-900/10 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{l.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{l.desc}</p>
                  </div>
                  <span className="text-gray-300 group-hover:text-brand-500">→</span>
                </Link>
              ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500">
      {text}
    </div>
  );
}
