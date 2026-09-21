import Link from "next/link";
import { notFound } from "next/navigation";
import ExpenseForm from "@/components/expense/ExpenseForm";
import { ChevronLeftIcon } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { toISODate } from "@/lib/dates";

function buildReturnTo(
  period: string | undefined,
  date: string | undefined,
): string {
  const params = new URLSearchParams();
  if (period === "monthly" || period === "yearly") {
    params.set("period", period);
  }
  if (date) {
    params.set("date", date);
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default async function EditExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; date?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const expense = await prisma.expense.findUnique({ where: { id } });

  if (!expense) {
    notFound();
  }

  const returnTo = buildReturnTo(query.period, query.date);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={returnTo} className="btn-ghost">
        <ChevronLeftIcon />
        Back to dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit expense</h1>
        <p className="text-sm text-slate-500">Update the details of this expense.</p>
      </div>

      <div className="card p-6">
        <ExpenseForm
          expense={{
            id: expense.id,
            title: expense.title,
            amount: expense.amount,
            category: expense.category,
            date: toISODate(expense.date),
            frequency: expense.frequency,
          }}
          returnTo={returnTo}
        />
      </div>
    </div>
  );
}
