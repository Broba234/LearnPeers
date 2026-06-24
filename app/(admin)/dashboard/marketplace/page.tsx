import { requireAdminPage } from "@/lib/admin-access";
import { getMarketplace, isRange, rangeLabel, type Range } from "@/lib/analytics";
import PageHeader from "@/components/admin/dashboard/PageHeader";
import KpiCard from "@/components/admin/dashboard/KpiCard";
import ChartCard from "@/components/admin/dashboard/ChartCard";
import { SimpleBarChart, PALETTE } from "@/components/admin/dashboard/charts";
import { formatNumber, formatPct } from "@/components/admin/dashboard/format";

export const dynamic = "force-dynamic";

const FUNNEL_ORDER = ["pending", "accepted", "in_progress", "active", "completed", "cancelled", "declined"];
const FUNNEL_COLORS: Record<string, string> = {
  pending: PALETTE.amber,
  accepted: PALETTE.sky,
  in_progress: PALETTE.violet,
  active: PALETTE.violet,
  completed: PALETTE.emerald,
  cancelled: PALETTE.rose,
  declined: PALETTE.slate,
};

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminPage("marketplace");
  const sp = await searchParams;
  const range: Range = isRange(sp.range) ? sp.range : "30d";
  const m = await getMarketplace(range);

  const funnelData = FUNNEL_ORDER.filter((s) => m.funnel.some((f) => f.status === s)).map((s) => ({
    label: s.replace("_", " "),
    count: m.funnel.find((f) => f.status === s)?.count ?? 0,
    color: FUNNEL_COLORS[s] ?? PALETTE.slate,
  }));

  const unmet = m.supplyDemand.filter((s) => s.unmet);

  return (
    <div>
      <PageHeader title="Marketplace" subtitle={`Liquidity & matching · ${rangeLabel(range)}`} range={range} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Session requests" value={formatNumber(m.requests.value)} deltaPct={m.requests.deltaPct} hint="All bookings created" />
        <KpiCard label="Completion rate" value={formatPct(m.completedRate)} hint="Requests that completed" />
        <KpiCard label="Instant fill rate" value={formatPct(m.instantFillRate)} hint="Instant requests answered" />
        <KpiCard label="Utilization" value={m.utilization.toFixed(1)} hint="Completed / active tutor" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <KpiCard label="Active tutors" value={formatNumber(m.activeTutors.value)} deltaPct={m.activeTutors.deltaPct} hint="With a completed session" />
        <KpiCard label="Active students" value={formatNumber(m.activeStudents.value)} deltaPct={m.activeStudents.deltaPct} hint="With a completed session" />
        <KpiCard label="Unmet subjects" value={formatNumber(unmet.length)} invertDelta hint="Demand, zero live tutors" />
        <KpiCard label="Liquidity ratio" value={m.activeTutors.value ? (m.activeStudents.value / m.activeTutors.value).toFixed(1) : "—"} hint="Students per tutor" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <ChartCard title="Booking funnel" subtitle="By status this period">
          {funnelData.length === 0 ? (
            <Empty text="No bookings in this period." />
          ) : (
            <div className="[&_.recharts-cartesian-axis-tick_text]:capitalize">
              <SimpleBarChart data={funnelData} xKey="label" bars={[{ key: "count", label: "Sessions", color: PALETTE.brand }]} valueFormatter={(n) => formatNumber(n)} />
            </div>
          )}
        </ChartCard>

        <ChartCard title="Unmet demand" subtitle="Subjects with bookings but no live tutors">
          {unmet.length === 0 ? (
            <Empty text="No supply gaps — every subject with demand has a live tutor." />
          ) : (
            <ul className="space-y-2">
              {unmet.map((s) => (
                <li key={s.subject} className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 px-4 py-2.5">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{s.subject}</span>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{s.demand} request{s.demand === 1 ? "" : "s"}, 0 tutors</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      <div className="mt-4">
        <ChartCard title="Supply vs demand by subject" subtitle="Live tutors against booking demand">
          {m.supplyDemand.length === 0 ? (
            <Empty text="No subject activity in this period." />
          ) : (
            <SimpleBarChart
              data={m.supplyDemand.map((s) => ({ name: s.subject, Demand: s.demand, "Live tutors": s.liveTutors }))}
              xKey="name"
              horizontal
              height={Math.max(240, m.supplyDemand.length * 38)}
              bars={[
                { key: "Demand", label: "Demand", color: PALETTE.brand },
                { key: "Live tutors", label: "Live tutors", color: PALETTE.emerald },
              ]}
              valueFormatter={(n) => formatNumber(n)}
            />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500 text-center px-6">{text}</div>;
}
