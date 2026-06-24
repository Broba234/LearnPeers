import { requireAdminPage } from "@/lib/admin-access";
import { getGrowth, isRange, rangeLabel, type Range } from "@/lib/analytics";
import PageHeader from "@/components/admin/dashboard/PageHeader";
import KpiCard from "@/components/admin/dashboard/KpiCard";
import ChartCard from "@/components/admin/dashboard/ChartCard";
import { TrendChart, PALETTE } from "@/components/admin/dashboard/charts";
import { formatNumber, formatPct } from "@/components/admin/dashboard/format";

export const dynamic = "force-dynamic";

export default async function GrowthPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminPage("growth");
  const sp = await searchParams;
  const range: Range = isRange(sp.range) ? sp.range : "30d";
  const g = await getGrowth(range);

  const totalNew = g.newTutors.value + g.newStudents.value;

  return (
    <div>
      <PageHeader title="Growth" subtitle={`Acquisition & activation · ${rangeLabel(range)}`} range={range} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="New signups" value={formatNumber(totalNew)} hint="Tutors + students" />
        <KpiCard label="New students" value={formatNumber(g.newStudents.value)} deltaPct={g.newStudents.deltaPct} />
        <KpiCard label="New tutors" value={formatNumber(g.newTutors.value)} deltaPct={g.newTutors.deltaPct} />
        <KpiCard label="Total users" value={formatNumber(g.totalUsers)} hint="All-time students + tutors" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title="Signups over time" subtitle="Tutors vs students" className="lg:col-span-2">
          <TrendChart
            data={g.series}
            height={300}
            stacked
            series={[
              { key: "students", label: "Students", color: PALETTE.emerald },
              { key: "tutors", label: "Tutors", color: PALETTE.violet },
            ]}
            valueFormatter={(n) => formatNumber(n)}
          />
        </ChartCard>

        <ChartCard title="Activation" subtitle="New students who booked a session">
          <div className="flex flex-col items-center justify-center h-[300px]">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <path className="text-gray-100 dark:text-gray-800" stroke="currentColor" strokeWidth="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-brand-500" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" fill="none" strokeDasharray={`${g.activationPct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatPct(g.activationPct, 0)}</span>
                <span className="text-xs text-gray-400">activated</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center max-w-[16rem]">
              Share of students who signed up this period and have completed at least one booking.
            </p>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
