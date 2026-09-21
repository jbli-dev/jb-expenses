import type { Report } from "@/lib/reports";
import { formatCurrency } from "@/lib/utils";

function periodNoun(period: Report["period"]): string {
  if (period === "weekly") return "this week";
  if (period === "monthly") return "this month";
  return "this year";
}

export default function SummaryCards({ report }: { report: Report }) {
  const cards = [
    {
      label: "Total spent",
      value: formatCurrency(report.total),
      sub: periodNoun(report.period),
    },
    {
      label: "Transactions",
      value: String(report.count),
      sub: "including recurring",
    },
    {
      label: "Average",
      value: formatCurrency(report.average),
      sub: report.averageLabel,
    },
    {
      label: "Top category",
      value: report.topCategory ?? "—",
      sub: report.topCategory ? "biggest spend" : "no data yet",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="card p-5">
          <p className="stat-label">{card.label}</p>
          <p className="stat-value">{card.value}</p>
          <p className="stat-sub">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
