import type { Report } from "@/lib/reports";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";
import CategoryFilter, { type CategoryFilterOption } from "./CategoryFilter";

const CHART_WIDTH = 720;
const CHART_HEIGHT = 240;
const PAD_TOP = 18;
const PAD_BOTTOM = 30;
const PAD_X = 10;

export default function SpendingChart({
  report,
  categories,
  selected,
}: {
  report: Report;
  categories: CategoryFilterOption[];
  selected: string[];
}) {
  const { buckets } = report;
  const max = Math.max(...buckets.map((b) => b.total), 0);

  const chartWidth = CHART_WIDTH - PAD_X * 2;
  const chartHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const slot = chartWidth / buckets.length;
  const barWidth = Math.min(slot * 0.62, 40);
  const showValues = buckets.length <= 16;
  // Show every label so the monthly view lists all dates.
  const labelStep = 1;

  return (
    <section className="card p-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="section-title">Spending</h2>
        <span className="text-sm text-slate-500">Total {formatCurrency(report.total)}</span>
      </div>

      <div className="mb-5">
        <CategoryFilter categories={categories} />
      </div>

      {max === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          {selected.length === 0
            ? "No spending recorded in this period yet."
            : "No spending matches the selected categories in this period."}
        </p>
      ) : (
        <>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Spending chart for ${report.label}`}
      >
        <defs>
          <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <pattern
            id="bar-hatch"
            width="7"
            height="7"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="7" height="7" fill="#e0e7ff" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="#818cf8" strokeWidth="2" />
          </pattern>
        </defs>

        {buckets.map((bucket, i) => {
          const x = PAD_X + i * slot + (slot - barWidth) / 2;
          const height = bucket.total === 0 ? 0 : Math.max((bucket.total / max) * chartHeight, 2);
          const y = PAD_TOP + (chartHeight - height);
          const ratio =
            bucket.total === 0 ? 0 : Math.min(1, Math.max(0, bucket.actual / bucket.total));
          const actualHeight = height * ratio;
          const estimatedHeight = height - actualHeight;
          const showLabel = i % labelStep === 0;

          return (
            <g key={bucket.key}>
              <clipPath id={`bar-clip-${bucket.key}`}>
                <rect x={x} y={y} width={barWidth} height={height} rx={6} />
              </clipPath>
              <rect
                className="chart-bar-track"
                x={x}
                y={PAD_TOP}
                width={barWidth}
                height={chartHeight}
                rx={6}
              />
              {height > 0 && (
                <g clipPath={`url(#bar-clip-${bucket.key})`}>
                  {estimatedHeight > 0 && (
                    <rect
                      className="chart-bar-estimated"
                      x={x}
                      y={y}
                      width={barWidth}
                      height={estimatedHeight}
                      fill="url(#bar-hatch)"
                    >
                      <title>{`${bucket.label} · estimated: ${formatCurrency(bucket.estimated)}`}</title>
                    </rect>
                  )}
                  {actualHeight > 0 && (
                    <rect
                      className="chart-bar"
                      x={x}
                      y={y + estimatedHeight}
                      width={barWidth}
                      height={actualHeight}
                      fill="url(#bar-gradient)"
                    >
                      <title>{`${bucket.label} · actual: ${formatCurrency(bucket.actual)}`}</title>
                    </rect>
                  )}
                </g>
              )}
              {showValues && height > 0 && (
                <text className="chart-value" x={x + barWidth / 2} y={y - 5} textAnchor="middle">
                  {formatCompactCurrency(bucket.total)}
                </text>
              )}
              {showLabel && (
                <text
                  className="chart-axis"
                  x={x + barWidth / 2}
                  y={CHART_HEIGHT - 10}
                  textAnchor="middle"
                >
                  {bucket.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex items-center justify-end gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-gradient-to-b from-indigo-400 to-indigo-600" aria-hidden="true" />
          Actual
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="chart-legend-hatch h-3 w-3 rounded-[3px]" aria-hidden="true" />
          Estimated
        </span>
      </div>
        </>
      )}
    </section>
  );
}
