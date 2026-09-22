import { prisma } from "@/lib/prisma";
import type { Frequency } from "@/generated/prisma/enums";
import { resolveAmount } from "@/lib/recurring";
import {
  formatRangeLabel,
  generateOccurrences,
  getPeriodRange,
  startOfDay,
  type Period,
} from "@/lib/dates";

/** Sentinel value used in the URL to represent expenses without a category. */
export const UNCATEGORIZED_CATEGORY = "__uncategorized__";

export interface CategoryOption {
  value: string;
  label: string;
  total?: number;
}

/** A recurring expense normalized to its equivalent monthly charge. */
export interface RecurringCharge {
  id: string;
  title: string;
  category: string | null;
  amount: number;
  frequency: Frequency;
  monthlyCharge: number;
}

export interface ReportOccurrence {
  id: string;
  title: string;
  category: string | null;
  amount: number;
  date: Date;
  frequency: Frequency | null;
}

export interface Bucket {
  key: string;
  label: string;
  total: number;
  /** Spend that has actually occurred (on or before today). */
  actual: number;
  /** Projected spend that is still in the future. */
  estimated: number;
}

export interface Report {
  period: Period;
  start: Date;
  end: Date;
  label: string;
  total: number;
  /** Spend that has actually occurred on or before today. */
  actual: number;
  count: number;
  average: number;
  averageLabel: string;
  /** Total spend from recurring expenses within the period. */
  recurring: number;
  /** Recurring spend that has actually occurred on or before today. */
  actualRecurring: number;
  topCategory: string | null;
  buckets: Bucket[];
  occurrences: ReportOccurrence[];
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DAY_MS = 86_400_000;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildBuckets(period: Period, start: Date, end: Date): Bucket[] {
  if (period === "weekly") {
    return WEEKDAY_LABELS.map((label, i) => ({ key: `w${i}`, label, total: 0, actual: 0, estimated: 0 }));
  }

  if (period === "monthly") {
    const daysInMonth = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      key: `d${i}`,
      label: String(i + 1),
      total: 0,
      actual: 0,
      estimated: 0,
    }));
  }

  return MONTH_LABELS.map((label, i) => ({ key: `m${i}`, label, total: 0, actual: 0, estimated: 0 }));
}

function bucketIndex(period: Period, date: Date, start: Date): number {
  if (period === "weekly") {
    return Math.floor((startOfDay(date).getTime() - start.getTime()) / DAY_MS);
  }
  if (period === "monthly") {
    return date.getDate() - 1;
  }
  return date.getMonth();
}

function categoriesWhere(
  categories?: string[],
): { OR: Array<{ category: string | null }> } | undefined {
  if (!categories || categories.length === 0) return undefined;
  return {
    OR: categories.map((category) =>
      category === UNCATEGORIZED_CATEGORY ? { category: null } : { category },
    ),
  };
}

async function collectOccurrences(
  period: Period,
  anchor: Date,
  categories?: string[],
): Promise<ReportOccurrence[]> {
  const { start, end } = getPeriodRange(period, anchor);

  const [oneTime, recurring] = await Promise.all([
    prisma.expense.findMany({
      where: { frequency: null, date: { gte: start, lt: end }, ...categoriesWhere(categories) },
      orderBy: { date: "asc" },
    }),
    prisma.expense.findMany({
      where: { frequency: { not: null }, ...categoriesWhere(categories) },
      include: { amounts: { orderBy: { effectiveFrom: "asc" } } },
      orderBy: { date: "asc" },
    }),
  ]);

  const occurrences: ReportOccurrence[] = [];

  for (const expense of oneTime) {
    occurrences.push({
      id: expense.id,
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      frequency: expense.frequency,
    });
  }

  for (const expense of recurring) {
    if (!expense.frequency) continue;
    // Generate occurrences only from the item's start date forward, so a newly
    // added recurring item doesn't appear in periods before it was created.
    for (const date of generateOccurrences(expense.date, expense.frequency, start, end)) {
      occurrences.push({
        id: expense.id,
        title: expense.title,
        category: expense.category,
        amount: resolveAmount(expense.amounts, date),
        date,
        frequency: expense.frequency,
      });
    }
  }

  occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
  return occurrences;
}

export async function buildReport(
  period: Period,
  anchor: Date,
  categories?: string[],
): Promise<Report> {
  const { start, end } = getPeriodRange(period, anchor);
  const occurrences = await collectOccurrences(period, anchor, categories);
  const buckets = buildBuckets(period, start, end);

  let total = 0;
  let actual = 0;
  let recurring = 0;
  let actualRecurring = 0;
  const categoryTotals = new Map<string, number>();
  const today = startOfDay(new Date());

  for (const occurrence of occurrences) {
    total += occurrence.amount;

    if (occurrence.date.getTime() <= today.getTime()) {
      actual += occurrence.amount;
    }

    if (occurrence.frequency) {
      recurring += occurrence.amount;
      if (occurrence.date.getTime() <= today.getTime()) {
        actualRecurring += occurrence.amount;
      }
    }

    const category = occurrence.category ?? "Other";
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + occurrence.amount);

    const index = bucketIndex(period, occurrence.date, start);
    if (index >= 0 && index < buckets.length) {
      const bucket = buckets[index];
      if (occurrence.date.getTime() > today.getTime()) {
        bucket.estimated = round2(bucket.estimated + occurrence.amount);
      } else {
        bucket.actual = round2(bucket.actual + occurrence.amount);
      }
      bucket.total = round2(bucket.total + occurrence.amount);
    }
  }

  total = round2(total);
  actual = round2(actual);
  recurring = round2(recurring);
  actualRecurring = round2(actualRecurring);

  let topCategory: string | null = null;
  let topAmount = 0;
  for (const [category, amount] of categoryTotals) {
    if (amount > topAmount) {
      topAmount = amount;
      topCategory = category;
    }
  }

  let average: number;
  let averageLabel: string;
  if (period === "yearly") {
    average = round2(total / 12);
    averageLabel = "avg / month";
  } else {
    const days = Math.round((end.getTime() - start.getTime()) / DAY_MS);
    average = round2(total / days);
    averageLabel = "avg / day";
  }

  return {
    period,
    start,
    end,
    label: formatRangeLabel(period, start, end),
    total,
    actual,
    count: occurrences.length,
    average,
    averageLabel,
    recurring,
    actualRecurring,
    topCategory,
    buckets,
    occurrences,
  };
}

/** Returns the distinct categories used by any expense, for the filter menu. */
export async function getExpenseCategories(): Promise<CategoryOption[]> {
  const rows = await prisma.expense.findMany({
    select: { category: true },
    distinct: ["category"],
  });

  const options: CategoryOption[] = [];
  let hasUncategorized = false;

  for (const row of rows) {
    if (row.category === null) {
      hasUncategorized = true;
    } else {
      options.push({ value: row.category, label: row.category });
    }
  }

  if (hasUncategorized) {
    options.push({ value: UNCATEGORIZED_CATEGORY, label: "Uncategorized" });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

/** Returns per-category totals for the period, independent of the active filter. */
export async function getCategoryTotals(
  period: Period,
  anchor: Date,
): Promise<Map<string, number>> {
  const occurrences = await collectOccurrences(period, anchor);
  const totals = new Map<string, number>();

  for (const occurrence of occurrences) {
    const key = occurrence.category ?? UNCATEGORIZED_CATEGORY;
    totals.set(key, round2((totals.get(key) ?? 0) + occurrence.amount));
  }

  return totals;
}

/** Normalizes a recurring expense's amount to an equivalent monthly charge. */
function monthlyCharge(amount: number, frequency: Frequency): number {
  switch (frequency) {
    case "DAILY":
      return round2((amount * 365) / 12);
    case "WEEKLY":
      return round2((amount * 52) / 12);
    case "YEARLY":
      return round2(amount / 12);
    default:
      return round2(amount);
  }
}

/** Lists every recurring expense along with its equivalent monthly charge. */
export async function getRecurringCharges(): Promise<RecurringCharge[]> {
  const recurring = await prisma.expense.findMany({
    where: { frequency: { not: null } },
    include: { amounts: { orderBy: { effectiveFrom: "asc" } } },
    orderBy: { title: "asc" },
  });

  return recurring.flatMap((expense) => {
    if (!expense.frequency) return [];
    const amount = resolveAmount(expense.amounts, new Date());
    return [
      {
        id: expense.id,
        title: expense.title,
        category: expense.category,
        amount,
        frequency: expense.frequency,
        monthlyCharge: monthlyCharge(amount, expense.frequency),
      },
    ];
  });
}
