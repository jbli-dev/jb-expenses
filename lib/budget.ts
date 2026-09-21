import { prisma } from "@/lib/prisma";
import { buildReport } from "@/lib/reports";
import { startOfDay, toMonthKey } from "@/lib/dates";

/** Returns the budget for the given month (defaults to the current month). */
export async function getMonthlyBudget(month: Date = new Date()): Promise<number | null> {
  const budget = await prisma.budget.findUnique({
    where: { month: toMonthKey(month) },
  });
  return budget?.amount ?? null;
}

/** Returns total spending for the given calendar month (defaults to the current month). */
export async function getMonthlySpending(month: Date = new Date()): Promise<number> {
  const report = await buildReport("monthly", startOfDay(month));
  return report.total;
}
