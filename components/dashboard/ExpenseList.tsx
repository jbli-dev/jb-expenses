import Link from "next/link";
import type { Report } from "@/lib/reports";
import { formatCurrency } from "@/lib/utils";
import { startOfDay, toISODate, type Period } from "@/lib/dates";
import { deleteExpense } from "@/app/actions/expenses";
import { CalendarIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

const MAX_ITEMS = 50;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function listPhrase(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

function periodPhrase(period: Period, anchor: Date): string {
  if (period === "monthly") {
    const fmt = new Intl.DateTimeFormat("en-US", { month: "long" });
    return `in ${fmt.format(anchor)}`;
  }
  if (period === "yearly") {
    return `in ${anchor.getFullYear()}`;
  }
  const monday = startOfDay(new Date(anchor));
  const offset = (monday.getDay() + 6) % 7; // 0 = Monday
  monday.setDate(monday.getDate() - offset);
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  return `in the week of ${fmt.format(monday)}`;
}

function emptyStateMessage(period: Period, anchor: Date, categories: string[]): string {
  const categoryPhrase = categories.length > 0 ? ` for ${listPhrase(categories)}` : "";
  return `No expenses ${periodPhrase(period, anchor)}${categoryPhrase}.`;
}

export default function ExpenseList({
  report,
  period,
  anchor,
  selectedCategories,
}: {
  report: Report;
  period: Period;
  anchor: Date;
  selectedCategories: string[];
}) {
  const totalCount = report.occurrences.length;
  const today = startOfDay(new Date()).getTime();
  const items = report.occurrences.slice(0, MAX_ITEMS);

  const viewQuery = new URLSearchParams();
  if (period !== "weekly") viewQuery.set("period", period);
  viewQuery.set("date", toISODate(anchor));
  const viewQueryString = viewQuery.toString();

  if (items.length === 0) {
    return (
      <section className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
        <span className="empty-icon">
          <PlusIcon className="h-6 w-6" />
        </span>
        <h2 className="section-title">
          {emptyStateMessage(period, anchor, selectedCategories)}
        </h2>
        <p className="text-sm text-slate-500">Add your first expense to start tracking.</p>
        <Link href="/expenses/new" className="btn-primary mt-2">
          Add your first expense
        </Link>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="section-title">Expenses</h2>
        <span className="text-xs text-slate-400">{totalCount} total</span>
      </div>

      <ul className="divide-y divide-slate-100">
        {items.map((item, index) => {
          const isUpcoming = item.date.getTime() > today;
          return (
          <li key={`${item.id}-${index}`} className="flex items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-medium ${isUpcoming ? "text-slate-500" : "text-slate-900"}`}>
                {item.title}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span>{dateFormatter.format(item.date)}</span>
                {item.frequency && (
                  <span
                    className="inline-flex text-slate-400"
                    title={`${FREQUENCY_LABELS[item.frequency]} · recurring`}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span className="sr-only">{FREQUENCY_LABELS[item.frequency]} · recurring</span>
                  </span>
                )}
                {item.category && <span className="badge badge-category">{item.category}</span>}
              </p>
            </div>

            <span className={`whitespace-nowrap text-sm font-semibold ${isUpcoming ? "text-slate-400" : "text-slate-900"}`}>
              {formatCurrency(item.amount)}
            </span>

            <Link
              href={`/expenses/${item.id}/edit?${viewQueryString}`}
              className="btn-icon"
              aria-label={`Edit ${item.title}`}
              title="Edit this expense"
            >
              <PencilIcon />
            </Link>

            <form action={deleteExpense}>
              <input type="hidden" name="id" value={item.id} />
              <button
                type="submit"
                className="btn-icon"
                aria-label={`Delete ${item.title}`}
                title={
                  item.frequency
                    ? "Delete this recurring expense (removes the whole series)"
                    : "Delete this expense"
                }
              >
                <TrashIcon />
              </button>
            </form>
          </li>
          );
        })}
      </ul>

      {totalCount > MAX_ITEMS && (
        <p className="border-t border-slate-100 px-5 py-3 text-center text-xs text-slate-400">
          Showing {MAX_ITEMS} of {totalCount} entries
        </p>
      )}
    </section>
  );
}
