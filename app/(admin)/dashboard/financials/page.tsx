import { requireAdminPage } from "@/lib/admin-access";
import { getFinancials, isRange, rangeLabel, type Range } from "@/lib/analytics";
import { STUDENT_FEE_PERCENT, PLATFORM_FEE_PERCENT } from "@/lib/billing";
import PageHeader from "@/components/admin/dashboard/PageHeader";
import KpiCard from "@/components/admin/dashboard/KpiCard";
import ChartCard from "@/components/admin/dashboard/ChartCard";
import { TrendChart, SimpleBarChart, PALETTE } from "@/components/admin/dashboard/charts";
import { formatCurrency, formatNumber, formatPct } from "@/components/admin/dashboard/format";

export const dynamic = "force-dynamic";

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminPage("financials");
  const sp = await searchParams;
  const range: Range = isRange(sp.range) ? sp.range : "30d";
  const f = await getFinancials(range);

  return (
    <div>
      <PageHeader title="Financials" subtitle={`Realized from completed sessions · ${rangeLabel(range)}`} range={range} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Net revenue" value={formatCurrency(f.netRevenue.value)} deltaPct={f.netRevenue.deltaPct} hint={`${formatPct(f.takeRatePct)} take of GMV`} />
        <KpiCard label="GMV" value={formatCurrency(f.gmv.value)} deltaPct={f.gmv.deltaPct} hint="Total student spend" />
        <KpiCard label="Tutor payouts" value={formatCurrency(f.tutorPayouts.value)} deltaPct={f.tutorPayouts.deltaPct} hint={`${formatPct((1 - PLATFORM_FEE_PERCENT) * 100, 0)} of base`} />
        <KpiCard label="ARPPU" value={formatCurrency(f.arppu)} hint="Revenue / paying student" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title="Revenue, GMV & payouts" subtitle={rangeLabel(range)} className="lg:col-span-2">
          <TrendChart
            data={f.series}
            height={300}
            series={[
              { key: "gmv", label: "GMV", color: PALETTE.slate },
              { key: "payouts", label: "Tutor payouts", color: PALETTE.sky },
              { key: "revenue", label: "Net revenue", color: PALETTE.brand },
            ]}
            valueFormatter={(n) => formatCurrency(n, { compact: true })}
          />
        </ChartCard>

        <ChartCard title="Revenue mix" subtitle="How the take rate is built">
          <div className="space-y-4 pt-2">
            <FeeBar label="Platform fee (tutor side)" pct={PLATFORM_FEE_PERCENT * 100} color={PALETTE.brand} />
            <FeeBar label="Student convenience fee" pct={STUDENT_FEE_PERCENT * 100} color={PALETTE.violet} />
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Effective take of GMV</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatPct(f.takeRatePct)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              Figures are derived from completed-session base amounts. Stripe-level refunds,
              disputes and payout timing are not yet reconciled here.
            </p>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <ChartCard title="Revenue by subject" subtitle="Top earners this period">
          {f.bySubject.length === 0 ? (
            <Empty text="No completed sessions in this period." />
          ) : (
            <SimpleBarChart
              data={f.bySubject.map((s) => ({ name: s.name, revenue: Math.round(s.revenue) }))}
              xKey="name"
              horizontal
              height={Math.max(220, f.bySubject.length * 36)}
              bars={[{ key: "revenue", label: "Net revenue", color: PALETTE.brand }]}
              valueFormatter={(n) => formatCurrency(n, { compact: true })}
            />
          )}
        </ChartCard>

        <ChartCard title="Subject breakdown" subtitle="Revenue & volume">
          {f.bySubject.length === 0 ? (
            <Empty text="No completed sessions in this period." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    <th className="py-2 pr-4 font-medium">Subject</th>
                    <th className="py-2 px-4 font-medium">Category</th>
                    <th className="py-2 px-4 font-medium text-right">Sessions</th>
                    <th className="py-2 pl-4 font-medium text-right">Net revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {f.bySubject.map((s) => (
                    <tr key={s.name}>
                      <td className="py-2 pr-4 text-gray-900 dark:text-white">{s.name}</td>
                      <td className="py-2 px-4 text-gray-500 dark:text-gray-400">{s.category ?? "—"}</td>
                      <td className="py-2 px-4 text-right tabular-nums text-gray-700 dark:text-gray-300">{formatNumber(s.sessions)}</td>
                      <td className="py-2 pl-4 text-right tabular-nums font-medium text-gray-900 dark:text-white">{formatCurrency(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function FeeBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 dark:text-gray-300">{label}</span>
        <span className="font-medium text-gray-900 dark:text-white">{formatPct(pct, 0)}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(pct * 4, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500">{text}</div>;
}
