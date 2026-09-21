import type { YearEndForecast } from "@/lib/forecast";
import { formatCurrency } from "@/lib/utils";

function InlineStat({
  label,
  value,
  title,
  emphasized = false,
}: {
  label: string;
  value: number;
  title?: string;
  emphasized?: boolean;
}) {
  return (
    <div className="min-w-0" title={title}>
      <p className="stat-label">{label}</p>
      <p
        className={`mt-0.5 whitespace-nowrap ${
          emphasized
            ? "text-xl font-bold tracking-tight text-slate-900"
            : "text-sm font-semibold text-slate-900"
        }`}
      >
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
      <div className="flex flex-col gap-3 border-l-4 border-indigo-500 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5 sm:py-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 sm:justify-start sm:gap-3">
            <h2 className="section-title">Year-end projection</h2>
            <span className="text-xs font-medium text-indigo-600">
              {remainingDays > 0
                ? `${remainingDays} day${remainingDays === 1 ? "" : "s"} left in ${year}`
                : `${year} is over`}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200/70">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <InlineStat
            label="Recurring"
            value={recurringTotal}
            title="Scheduled bills & subscriptions"
          />
          <InlineStat label="Variable" value={estimatedTotal} title={estimateHint} />
          <InlineStat
            label="Projected total by Dec 31"
            value={projectedTotal}
            emphasized
            title="Recurring expenses are counted exactly from their schedule; variable spending is estimated from your recent pace."
          />
        </div>
      </div>
    </section>
  );
}
