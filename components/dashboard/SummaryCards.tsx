import type { RecurringCharge, Report } from "@/lib/reports";
import { formatCurrency } from "@/lib/utils";
import RecurringSpendingCard from "./RecurringSpendingCard";

function periodNoun(period: Report["period"]): string {
  if (period === "weekly") return "this week";
  if (period === "monthly") return "this month";
  return "this year";
}

export default function SummaryCards({
  report,
  recurringCharges,
}: {
  report: Report;
  recurringCharges: RecurringCharge[];
}) {
  const topCategory = report.topCategory;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="card p-5">
        <p className="stat-label">Total spent</p>
        <p className="stat-value">{formatCurrency(report.total)}</p>
        <p className="stat-sub">{periodNoun(report.period)}</p>
      </div>
      <div className="card p-5">
        <p className="stat-label">Transactions</p>
        <p className="stat-value">{String(report.count)}</p>
        <p className="stat-sub">including recurring</p>
      </div>
      <div className="card p-5">
        <p className="stat-label">Average</p>
        <p className="stat-value">{formatCurrency(report.average)}</p>
        <p className="stat-sub">{report.averageLabel}</p>
      </div>
      <RecurringSpendingCard value={formatCurrency(report.recurring)} charges={recurringCharges} />
      <div className="card p-5">
        <p className="stat-label">Top category</p>
        <p className="stat-value">{topCategory ?? "—"}</p>
        <p className="stat-sub">{topCategory ? "biggest spend" : "no data yet"}</p>
      </div>
    </div>
  );
}
