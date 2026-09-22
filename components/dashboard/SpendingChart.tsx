"use client";

import { useEffect, useMemo, useState } from "react";
import type { Report, ReportOccurrence } from "@/lib/reports";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";
import { startOfDay, type Period } from "@/lib/dates";
import { CalendarIcon } from "@/components/icons";
import CategoryFilter, { type CategoryFilterOption } from "./CategoryFilter";

const CHART_WIDTH = 720;
const CHART_HEIGHT = 240;
const PAD_TOP = 18;
const PAD_BOTTOM = 30;
const PAD_X = 10;
const DAY_MS = 86_400_000;

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

const itemDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

/** Maps an occurrence to the chart bucket key it contributes to. */
function bucketKeyForOccurrence(period: Period, date: Date, start: Date): string {
  if (period === "weekly") {
    const index = Math.floor((startOfDay(date).getTime() - start.getTime()) / DAY_MS);
    return `w${index}`;
  }
  if (period === "monthly") {
    return `d${date.getDate() - 1}`;
  }
  return `m${date.getMonth()}`;
}

/** Human-readable date label for a bucket, used as the dialog title. */
function bucketDateLabel(period: Period, key: string, start: Date): string {
  const index = Number(key.slice(1));
  if (period === "weekly") {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date);
  }
  if (period === "monthly") {
    const date = new Date(start.getFullYear(), start.getMonth(), index + 1);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  }
  const date = new Date(start.getFullYear(), index, 1);
  return new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
}

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
  const [activeBucket, setActiveBucket] = useState<(typeof buckets)[number] | null>(null);

  const itemsByBucket = useMemo(() => {
    const map = new Map<string, ReportOccurrence[]>();
    const start = startOfDay(new Date(report.start));
    for (const occurrence of report.occurrences) {
      const key = bucketKeyForOccurrence(report.period, new Date(occurrence.date), start);
      const list = map.get(key);
      if (list) {
        list.push(occurrence);
      } else {
        map.set(key, [occurrence]);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return map;
  }, [report]);

  useEffect(() => {
    if (!activeBucket) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveBucket(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeBucket]);

  useEffect(() => {
    if (!activeBucket) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeBucket]);

  const max = Math.max(...buckets.map((b) => b.total), 0);

  const chartWidth = CHART_WIDTH - PAD_X * 2;
  const chartHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const slot = chartWidth / buckets.length;
  const barWidth = Math.min(slot * 0.62, 40);
  const showValues = buckets.length <= 16;
  // Show every label so the monthly view lists all dates.
  const labelStep = 1;

  const activeItems = activeBucket ? (itemsByBucket.get(activeBucket.key) ?? []) : [];
  const today = startOfDay(new Date()).getTime();

  return (
    <>
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
        role="group"
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
          const tooltip = `${bucket.label} · total ${formatCurrency(bucket.total)} · actual ${formatCurrency(bucket.actual)} · estimated ${formatCurrency(bucket.estimated)} · click for details`;

          return (
            <g key={bucket.key} className="chart-column" onClick={() => setActiveBucket(bucket)}>
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
                    />
                  )}
                  {actualHeight > 0 && (
                    <rect
                      className="chart-bar"
                      x={x}
                      y={y + estimatedHeight}
                      width={barWidth}
                      height={actualHeight}
                      fill="url(#bar-gradient)"
                    />
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
              <rect
                className="chart-bar-hitarea"
                x={x}
                y={PAD_TOP}
                width={barWidth}
                height={chartHeight}
                rx={6}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`Show spending details for ${bucketDateLabel(report.period, bucket.key, report.start)}`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveBucket(bucket);
                  }
                }}
              >
                <title>{tooltip}</title>
              </rect>
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

    {activeBucket && (
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
        <div
          className="absolute inset-0 bg-slate-900/40"
          onClick={() => setActiveBucket(null)}
          aria-hidden="true"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Spending on ${bucketDateLabel(report.period, activeBucket.key, report.start)}`}
          className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="min-w-0">
              <h2 className="section-title">
                {bucketDateLabel(report.period, activeBucket.key, report.start)}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {activeItems.length === 0
                  ? "No spending recorded for this date."
                  : `${activeItems.length} ${activeItems.length === 1 ? "item" : "items"} · actual ${formatCurrency(activeBucket.actual)} · estimated ${formatCurrency(activeBucket.estimated)}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-lg font-semibold text-slate-900">
                {formatCurrency(activeBucket.total)}
              </span>
              <button
                type="button"
                onClick={() => setActiveBucket(null)}
                className="btn-icon"
                aria-label="Close dialog"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
          </div>

          {activeItems.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">
              No spending items in this period.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-y-auto">
              {activeItems.map((item, index) => {
                const isUpcoming = new Date(item.date).getTime() > today;
                return (
                  <li key={`${item.id}-${index}`} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span>{itemDateFormatter.format(new Date(item.date))}</span>
                        {item.frequency && (
                          <span
                            className="inline-flex text-slate-400"
                            title={`${FREQUENCY_LABELS[item.frequency]} · recurring`}
                          >
                            <CalendarIcon className="h-3.5 w-3.5" />
                            <span className="sr-only">
                              {FREQUENCY_LABELS[item.frequency]} · recurring
                            </span>
                          </span>
                        )}
                        {item.category && <span className="badge badge-category">{item.category}</span>}
                        {isUpcoming && <span className="badge badge-frequency">Estimated</span>}
                      </p>
                    </div>
                    <span
                      className={`whitespace-nowrap text-sm font-semibold ${isUpcoming ? "text-slate-400" : "text-slate-900"}`}
                    >
                      {formatCurrency(item.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    )}
    </>
  );
}
