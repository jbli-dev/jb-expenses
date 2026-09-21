import type { YearEndForecast } from "@/lib/forecast";
import { formatCurrency } from "@/lib/utils";

function BreakdownRow({
  label,
  hint,
  value,
}: {
  label: string;
  hint: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p>
      </div>
      <p className="whitespace-nowrap text-sm font-semibold text-slate-900">
        {formatCurrency(value)}
      </p>
    </div>
  );
}

export default function YearEndForecast({ forecast }: { forecast: YearEndForecast }) {
  const {
    year,
    remainingDays,
    recurringTotal,
    estimatedTotal,
    projectedTotal,
    dailyRate,
    weeklyRate,
    lookbackDays,
    oneTimeSampleCount,
  } = forecast;

  const daysInYear =
    (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
  const elapsed = Math.max(0, daysInYear - remainingDays);
  const progress = Math.min(100, Math.round((elapsed / daysInYear) * 100));

  const estimateHint =
    oneTimeSampleCount > 0
      ? `≈ ${formatCurrency(dailyRate)}/day · ${formatCurrency(weeklyRate)}/week over last ${lookbackDays} days`
      : "No one-time history yet to estimate from";

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-indigo-50/50 to-white px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="section-title">Year-end projection</h2>
          <span className="text-xs font-medium text-indigo-600">
            {remainingDays > 0
              ? `${remainingDays} day${remainingDays === 1 ? "" : "s"} left in ${year}`
              : `${year} is over`}
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div>
          <p className="stat-label">Projected total by Dec 31</p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900">
            {formatCurrency(projectedTotal)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Recurring expenses are counted exactly from their schedule; variable
            spending is estimated from your recent pace.
          </p>
        </div>

        <div className="space-y-2.5">
          <BreakdownRow
            label="Recurring expenses"
            hint="Scheduled bills & subscriptions"
            value={recurringTotal}
          />
          <BreakdownRow label="Variable expenses" hint={estimateHint} value={estimatedTotal} />
          <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-4 pt-3">
            <p className="text-sm font-semibold text-slate-900">Projected total</p>
            <p className="whitespace-nowrap text-base font-bold text-slate-900">
              {formatCurrency(projectedTotal)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
