import { prisma } from "@/lib/prisma";
import { generateOccurrences, startOfDay, toISODate } from "@/lib/dates";
import { resolveAmount } from "@/lib/recurring";
import type { Frequency } from "@/generated/prisma/enums";

/** A single upcoming recurring charge within the current month. */
export interface UpcomingBill {
  id: string;
  title: string;
  category: string | null;
  amount: number;
  /** Next due date (yyyy-mm-dd). */
  date: string;
  frequency: Frequency;
}

export interface UpcomingBilling {
  /** Human label for the current calendar month, e.g. "September 2026". */
  monthLabel: string;
  bills: UpcomingBill[];
  total: number;
  count: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Lists the next due occurrence of each recurring expense that falls within
 * the current calendar month (from today through the end of the month).
 */
export async function buildUpcomingBilling(asOf: Date = new Date()): Promise<UpcomingBilling> {
  const today = startOfDay(asOf);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const recurring = await prisma.expense.findMany({
    where: { frequency: { not: null }, date: { lt: monthEnd } },
    include: { amounts: { orderBy: { effectiveFrom: "asc" } } },
    orderBy: { date: "asc" },
  });

  const bills: UpcomingBill[] = [];

  for (const expense of recurring) {
    if (!expense.frequency) continue;
    const next = generateOccurrences(expense.date, expense.frequency, today, monthEnd)[0];
    if (!next) continue;
    bills.push({
      id: expense.id,
      title: expense.title,
      category: expense.category,
      amount: resolveAmount(expense.amounts, next),
      date: toISODate(next),
      frequency: expense.frequency,
    });
  }

  bills.sort((a, b) => a.date.localeCompare(b.date));

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(today);

  return {
    monthLabel,
    bills,
    total: round2(bills.reduce((sum, bill) => sum + bill.amount, 0)),
    count: bills.length,
  };
}
