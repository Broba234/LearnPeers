import { requireAdminPage } from "@/lib/admin-access";
import { isRange, rangeLabel, type Range } from "@/lib/analytics";
import { getOnboarding, type RoleFunnel } from "@/lib/onboarding";
import PageHeader from "@/components/admin/dashboard/PageHeader";
import KpiCard from "@/components/admin/dashboard/KpiCard";
import ChartCard from "@/components/admin/dashboard/ChartCard";
import { formatNumber, formatPct } from "@/components/admin/dashboard/format";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminPage("onboarding");
  const sp = await searchParams;
  const range: Range = isRange(sp.range) ? sp.range : "30d";
  const data = await getOnboarding(range);

  return (
    <div>
      <PageHeader
        title="Onboarding"
        subtitle={`Signup → activation funnel · new users from ${rangeLabel(range).toLowerCase()}`}
        range={range}
      />
      <div className="space-y-8">
        <FunnelSection funnel={data.tutor} accent="brand" />
        <FunnelSection funnel={data.student} accent="emerald" />
      </div>
    </div>
  );
}

function FunnelSection({ funnel, accent }: { funnel: RoleFunnel; accent: "brand" | "emerald" }) {
  const title = funnel.role === "tutor" ? "Tutors" : "Students";
  const barColor = accent === "brand" ? "bg-brand-500" : "bg-emerald-500";
  const signups = funnel.signups;

  return (
    <section>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 capitalize">{title}</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard label="New signups" value={formatNumber(funnel.signups)} hint={rangeLabelHint(funnel.role)} />
        <KpiCard label="Completed" value={formatNumber(funnel.completed)} hint={`${formatPct(funnel.completionRatePct)} completion`} />
        <KpiCard label="In progress" value={formatNumber(funnel.inProgress)} hint="Not finished yet" />
        <KpiCard label="Stalled" value={formatNumber(funnel.stalled)} invertDelta hint="In progress > 24h" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Funnel" subtitle="Reach & drop-off per step" className="lg:col-span-2">
          {signups === 0 ? (
            <Empty text="No new signups of this type in this period." />
          ) : (
            <div className="space-y-3 pt-1">
              {funnel.steps.map((s, i) => {
                const pctOfSignups = signups ? (s.reached / signups) * 100 : 0;
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">
                        <span className="text-gray-400 dark:text-gray-500 tabular-nums mr-2">{i + 1}.</span>
                        {s.label}
                      </span>
                      <span className="flex items-center gap-3">
                        {i > 0 && (
                          <span className={`text-xs font-medium ${s.conversionFromPrev >= 80 ? "text-emerald-600 dark:text-emerald-400" : s.conversionFromPrev >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                            {formatPct(s.conversionFromPrev, 0)}
                          </span>
                        )}
                        <span className="font-semibold text-gray-900 dark:text-white tabular-nums w-8 text-right">{formatNumber(s.reached)}</span>
                      </span>
                    </div>
                    <div className="h-6 rounded-md bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div className={`h-full ${barColor} rounded-md transition-all`} style={{ width: `${Math.max(pctOfSignups, s.reached > 0 ? 3 : 0)}%` }} />
                    </div>
                    {s.dropoff > 0 && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        ▼ {formatNumber(s.dropoff)} stuck here ({formatPct((s.dropoff / signups) * 100, 0)} of signups)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Where users are now" subtitle="Incomplete users by current step">
          {funnel.current.length === 0 ? (
            <Empty text={funnel.inProgress === 0 ? "Everyone who signed up finished." : "No users in progress."} />
          ) : (
            <ul className="space-y-2 pt-1">
              {funnel.current.map((c) => (
                <li key={c.key} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-800 px-4 py-2.5">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{c.label}</span>
                  <span className="inline-flex items-center justify-center min-w-7 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-900 dark:text-white">
                    {c.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </section>
  );
}

function rangeLabelHint(role: string) {
  return role === "tutor" ? "Tutor accounts" : "Student accounts";
}

function Empty({ text }: { text: string }) {
  return <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500 text-center px-6">{text}</div>;
}
