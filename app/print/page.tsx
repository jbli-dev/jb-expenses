import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildReport, getExpenseCategories } from "@/lib/reports";
import { isPeriod, parseISODate, type Period } from "@/lib/dates";
import { formatCurrency } from "@/lib/utils";
import PrintToolbar from "@/components/print/PrintToolbar";

export const metadata: Metadata = {
  title: "Print report",
};

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

const occurrenceFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const generatedFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function bucketNoun(period: Period): string {
  return period === "yearly" ? "month" : "day";
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </h2>
  );
}

function SummaryItem({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="break-inside-avoid rounded-lg border border-slate-200 p-3 print:rounded-none">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-slate-900">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-400">{sub}</p> : null}
    </div>
  );
}

interface PrintPageProps {
  searchParams: Promise<{
    period?: string;
    date?: string;
    category?: string | string[];
  }>;
}

export default async function PrintPage({ searchParams }: PrintPageProps) {
  const params = await searchParams;
  const period: Period = isPeriod(params.period) ? params.period : "weekly";
  const anchor = parseISODate(params.date);
  const selectedCategories = Array.isArray(params.category)
    ? params.category
    : typeof params.category === "string"
      ? [params.category]
      : [];
  const categoryFilter = selectedCategories.length > 0 ? selectedCategories : undefined;

  const [report, categoryOptions] = await Promise.all([
    buildReport(period, anchor, categoryFilter),
    getExpenseCategories(),
  ]);

  const selectedCategoryLabels = selectedCategories.map(
    (value) => categoryOptions.find((category) => category.value === value)?.label ?? value,
  );

  // Derive category totals from the report's own occurrences so the printed
  // breakdown always matches the active filter and the period total.
  const categoryTotals = new Map<string, number>();
  for (const occurrence of report.occurrences) {
    const name = occurrence.category ?? "Uncategorized";
    categoryTotals.set(name, round2((categoryTotals.get(name) ?? 0) + occurrence.amount));
  }
  const categoryRows = [...categoryTotals.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  // Only show days/months that actually had spending.
  const activeBuckets = report.buckets.filter((bucket) => bucket.total > 0);

  const generated = generatedFormatter.format(new Date());

  return (
    <div className="flex min-h-full flex-col bg-slate-50 print:bg-white">
      <PrintToolbar />

      <article className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 print:max-w-none print:px-0 print:py-0">
        <header className="break-inside-avoid border-b border-slate-200 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expense report</h1>
          <p className="mt-1 text-sm text-slate-500">{report.label}</p>
          <p className="mt-1 text-xs text-slate-400">
            Generated {generated}
            {selectedCategoryLabels.length > 0 && (
              <> · filtered to {selectedCategoryLabels.join(", ")}</>
            )}
          </p>
        </header>

        <section className="mt-6 break-inside-avoid">
          <SectionTitle>Summary</SectionTitle>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-5">
            <SummaryItem label="Total spent" value={formatCurrency(report.total)} />
            <SummaryItem label="Transactions" value={String(report.count)} />
            <SummaryItem
              label="Average"
              value={formatCurrency(report.average)}
              sub={report.averageLabel}
            />
            <SummaryItem
              label="Recurring"
              value={formatCurrency(report.recurring)}
              sub="this period"
            />
            <SummaryItem label="Top category" value={report.topCategory ?? "—"} />
          </div>
        </section>

        <section className="mt-8 break-inside-avoid">
          <SectionTitle>Spending by category</SectionTitle>
          {categoryRows.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No expenses in this period.</p>
          ) : (
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4 font-medium">Category</th>
                  <th className="py-2 pr-4 text-right font-medium">Amount</th>
                  <th className="py-2 text-right font-medium">% of total</th>
                </tr>
              </thead>
              <tbody>
                {categoryRows.map((category) => (
                  <tr
                    key={category.name}
                    className="break-inside-avoid border-b border-slate-200"
                  >
                    <td className="py-2 pr-4 font-medium text-slate-900">{category.name}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-slate-900">
                      {formatCurrency(category.total)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-500">
                      {report.total > 0
                        ? `${((category.total / report.total) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 font-semibold text-slate-900">
                  <td className="py-2 pr-4">Total</td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {formatCurrency(report.total)}
                  </td>
                  <td className="py-2 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          )}
        </section>

        <section className="mt-8 break-inside-avoid">
          <SectionTitle>Spending by {bucketNoun(period)}</SectionTitle>
          {activeBuckets.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No spending in this period.</p>
          ) : (
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4 font-medium capitalize">{bucketNoun(period)}</th>
                  <th className="py-2 pr-4 text-right font-medium">Actual</th>
                  <th className="py-2 pr-4 text-right font-medium">Estimated</th>
                  <th className="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {activeBuckets.map((bucket) => (
                  <tr key={bucket.key} className="break-inside-avoid border-b border-slate-200">
                    <td className="py-1.5 pr-4 font-medium text-slate-900">{bucket.label}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums text-slate-500">
                      {formatCurrency(bucket.actual)}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums text-slate-500">
                      {formatCurrency(bucket.estimated)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums font-medium text-slate-900">
                      {formatCurrency(bucket.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="mt-8">
          <SectionTitle>Expenses</SectionTitle>
          {report.occurrences.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No expenses in this period.</p>
          ) : (
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Title</th>
                  <th className="py-2 pr-4 font-medium">Category</th>
                  <th className="py-2 pr-4 font-medium">Frequency</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {report.occurrences.map((occurrence, index) => (
                  <tr
                    key={`${occurrence.id}-${index}`}
                    className="break-inside-avoid border-b border-slate-200"
                  >
                    <td className="whitespace-nowrap py-2 pr-4 text-slate-500">
                      {occurrenceFormatter.format(occurrence.date)}
                    </td>
                    <td className="py-2 pr-4 font-medium text-slate-900">{occurrence.title}</td>
                    <td className="py-2 pr-4 text-slate-500">
                      {occurrence.category ?? "Uncategorized"}
                    </td>
                    <td className="py-2 pr-4 text-slate-500">
                      {occurrence.frequency
                        ? FREQUENCY_LABELS[occurrence.frequency] ?? occurrence.frequency
                        : "One-time"}
                    </td>
                    <td className="whitespace-nowrap py-2 text-right tabular-nums font-medium text-slate-900">
                      {formatCurrency(occurrence.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 font-semibold text-slate-900">
                  <td className="py-2 pr-4" colSpan={4}>
                    Total
                  </td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums">
                    {formatCurrency(report.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </section>

        <footer className="mt-8 break-inside-avoid border-t border-slate-200 pt-4 text-xs text-slate-400">
          <p>
            {report.count} transaction{report.count === 1 ? "" : "s"} · {report.label} ·
            generated {generated}
          </p>
        </footer>
      </article>
    </div>
  );
}
