import { requireAdminPage } from "@/lib/admin-access";
import { getFinancials, isRange, rangeLabel, type Range } from "@/lib/analytics";
import { getStripeFinancials } from "@/lib/stripe-financials";
import { STUDENT_FEE_PERCENT, PLATFORM_FEE_PERCENT } from "@/lib/billing";
import PageHeader from "@/components/admin/dashboard/PageHeader";
import KpiCard from "@/components/admin/dashboard/KpiCard";
import ChartCard from "@/components/admin/dashboard/ChartCard";
import { TrendChart, SimpleBarChart, PALETTE } from "@/components/admin/dashboard/charts";
import { formatCurrency, formatNumber, formatPct } from "@/components/admin/dashboard/format";

export const dynamic = "force-dynamic";

const TUTOR_FEE_PERCENT = PLATFORM_FEE_PERCENT - STUDENT_FEE_PERCENT; // ~5% from the tutor side

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminPage("financials");
  const sp = await searchParams;
  const range: Range = isRange(sp.range) ? sp.range : "30d";
  const [f, stripeData] = await Promise.all([getFinancials(range), getStripeFinancials(range)]);

  return (
    <div>
      <PageHeader title="Financials" subtitle={`Recognized on completed sessions · ${rangeLabel(range)}`} range={range} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Net revenue" value={formatCurrency(f.netRevenue.value)} deltaPct={f.netRevenue.deltaPct} hint={`${formatPct(f.takeRatePct)} take of GMV`} />
        <KpiCard label="GMV" value={formatCurrency(f.gmv.value)} deltaPct={f.gmv.deltaPct} hint="Total student spend" />
        <KpiCard label="Tutor payouts" value={formatCurrency(f.tutorPayouts.value)} deltaPct={f.tutorPayouts.deltaPct} hint={`${formatPct((1 + STUDENT_FEE_PERCENT - PLATFORM_FEE_PERCENT) * 100, 0)} of base price`} />
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
            format="currencyCompact"
          />
        </ChartCard>

        <ChartCard title="How the take rate works" subtitle={`Platform keeps ${formatPct(PLATFORM_FEE_PERCENT * 100, 0)} of base`}>
          <div className="space-y-4 pt-2">
            <FeeBar label="From student markup" pct={STUDENT_FEE_PERCENT * 100} color={PALETTE.violet} />
            <FeeBar label="From tutor payout" pct={TUTOR_FEE_PERCENT * 100} color={PALETTE.sky} />
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <Row label="Platform take of base" value={formatPct(PLATFORM_FEE_PERCENT * 100, 0)} />
              <Row label="Effective take of GMV" value={formatPct(f.takeRatePct)} strong />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              Booked figures are recognized when a session completes and are gross of Stripe fees,
              refunds and disputes. See the reconciliation below for actual cash.
            </p>
          </div>
        </ChartCard>
      </div>

      {/* Stripe reconciliation */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Stripe reconciliation</h2>
          <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Actual cash</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Money actually moved in Stripe over {rangeLabel(range).toLowerCase()} — collected at booking, net of fees, refunds and disputes.
        </p>

        {!stripeData.configured ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-sm text-gray-500 dark:text-gray-400">
            Stripe isn’t configured in this environment, so live reconciliation is unavailable. The booked figures above are derived from session prices.
          </div>
        ) : stripeData.error ? (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-6 text-sm text-amber-700 dark:text-amber-400">
            Couldn’t reach Stripe: {stripeData.error}. Showing booked figures only.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Gross processed" value={formatCurrency(stripeData.grossVolume)} hint={`${formatNumber(stripeData.txnCount)} ledger entries`} />
              <KpiCard label="Net revenue (actual)" value={formatCurrency(stripeData.netRevenue)} hint="After Stripe fees, refunds, disputes" />
              <KpiCard label="Stripe fees" value={formatCurrency(stripeData.stripeFees)} hint="Processing cost" />
              <KpiCard label="Tutor transfers" value={formatCurrency(stripeData.tutorTransfers)} hint="Sent to connected accounts" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <ChartCard title="Reconciliation" subtitle="Booked vs collected" className="lg:col-span-2">
                <div className="space-y-2 pt-1">
                  <Row label="Booked net revenue (completed sessions)" value={formatCurrency(f.netRevenue.value)} />
                  <Row label="Gross processed (Stripe)" value={formatCurrency(stripeData.grossVolume)} />
                  <Row label="− Stripe processing fees" value={`(${formatCurrency(stripeData.stripeFees)})`} />
                  <Row label={`− Refunds (${stripeData.refundCount})`} value={`(${formatCurrency(stripeData.refunds)})`} />
                  <Row label={`− Disputes (${stripeData.disputeCount})`} value={`(${formatCurrency(stripeData.disputes)})`} />
                  <Row label="− Tutor transfers" value={`(${formatCurrency(stripeData.tutorTransfers)})`} />
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <Row label="Net revenue (actual cash kept)" value={formatCurrency(stripeData.netRevenue)} strong />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 pt-2 leading-relaxed">
                    Booked revenue is recognized on session completion; Stripe cash is collected at booking — so the two
                    legitimately differ by timing as well as by fees and refunds.
                  </p>
                </div>
              </ChartCard>

              <ChartCard title="Payout balance" subtitle="Current Stripe balance">
                <div className="space-y-3 pt-1">
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 px-4 py-3">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Available</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stripeData.balanceAvailable)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 px-4 py-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Pending</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stripeData.balancePending)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Recent payouts</p>
                    {stripeData.recentPayouts.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500">No payouts yet.</p>
                    ) : (
                      <ul className="space-y-1">
                        {stripeData.recentPayouts.map((p, i) => (
                          <li key={i} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-300">{formatCurrency(p.amount)}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">{p.status}{p.arrival ? ` · ${p.arrival}` : ""}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </ChartCard>
            </div>
          </>
        )}
      </div>

      {/* Subject breakdown (booked) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
        <ChartCard title="Revenue by subject" subtitle="Top earners this period (booked)">
          {f.bySubject.length === 0 ? (
            <Empty text="No completed sessions in this period." />
          ) : (
            <SimpleBarChart
              data={f.bySubject.map((s) => ({ name: s.name, revenue: Math.round(s.revenue) }))}
              xKey="name"
              horizontal
              height={Math.max(220, f.bySubject.length * 36)}
              bars={[{ key: "revenue", label: "Net revenue", color: PALETTE.brand }]}
              format="currencyCompact"
            />
          )}
        </ChartCard>

        <ChartCard title="Subject breakdown" subtitle="Revenue & volume (booked)">
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
        <div className="h-full rounded-full" style={{ width: `${Math.min(pct * 6, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={strong ? "font-semibold text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-bold text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>{value}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500">{text}</div>;
}
