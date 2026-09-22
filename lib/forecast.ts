import { prisma } from "@/lib/prisma";
import { generateOccurrences, startOfDay } from "@/lib/dates";
import { resolveAmount } from "@/lib/recurring";

const DAY_MS = 86_400_000;

/** How many recent days of one-time spending feed the daily burn-rate estimate. */
const LOOKBACK_DAYS = 30;

export interface YearEndForecast {
  /** Calendar year the forecast runs to (the year of `asOf`). */
  year: number;
  /** Date the forecast is computed from (local midnight). */
  asOf: Date;
  /** Exclusive end of the forecast window (Jan 1 of the next year). */
  yearEnd: Date;
  /** Calendar days from `asOf` through Dec 31, inclusive. */
  remainingDays: number;
  /** Exact future spend from recurring expenses in the remaining window. */
  recurringTotal: number;
  /** Number of recurring occurrences projected. */
  recurringCount: number;
  /** Projected variable (one-time) spend for the remaining window. */
  estimatedTotal: number;
  /** Projected total spend by year end. */
  projectedTotal: number;
  /** Average one-time spend per day used for the estimate. */
  dailyRate: number;
  /** Average one-time spend per week used for the estimate. */
  weeklyRate: number;
  /** Number of history days the estimate is averaged over. */
  lookbackDays: number;
  /** Number of one-time expenses in the lookback window. */
  oneTimeSampleCount: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/**
 * Forecasts total spending from the anchor date through the end of its
 * calendar year.
 *
 * - Recurring expenses are projected exactly from their frequency.
 * - Variable (one-time) expenses are estimated by taking the average daily
 *   spend over the trailing lookback window and multiplying by days left.
 */
export async function buildYearEndForecast(anchor: Date): Promise<YearEndForecast> {
  const asOf = startOfDay(anchor);
  const year = asOf.getFullYear();
  const yearEnd = new Date(year + 1, 0, 1); // exclusive

  const remainingDays = Math.max(0, daysBetween(asOf, yearEnd));

  // Exact recurring projection for [asOf, yearEnd).
  const recurring = await prisma.expense.findMany({
    where: { frequency: { not: null }, date: { lt: yearEnd } },
    include: { amounts: { orderBy: { effectiveFrom: "asc" } } },
  });

  let recurringTotal = 0;
  let recurringCount = 0;

  for (const expense of recurring) {
    if (!expense.frequency) continue;
    const occurrences = generateOccurrences(expense.date, expense.frequency, asOf, yearEnd);
    recurringCount += occurrences.length;
    for (const date of occurrences) {
      recurringTotal += resolveAmount(expense.amounts, date);
    }
  }

  // Estimated variable spending from one-time history (dates before `asOf`).
  const oneTime = await prisma.expense.findMany({
    where: { frequency: null, date: { lt: asOf } },
    orderBy: { date: "asc" },
  });

  let estimatedTotal = 0;
  let dailyRate = 0;
  let lookbackDays = 0;
  let oneTimeSampleCount = 0;

  if (oneTime.length > 0 && remainingDays > 0) {
    const firstDate = oneTime[0].date;
    // Don't average over days before tracking started. The window ends just
    // before `asOf`, so measure the number of completed tracking days.
    const elapsedDays = Math.max(1, daysBetween(firstDate, asOf));
    lookbackDays = Math.min(LOOKBACK_DAYS, elapsedDays);

    const windowStart = new Date(asOf);
    windowStart.setDate(windowStart.getDate() - lookbackDays);

    const inWindow = oneTime.filter((expense) => expense.date >= windowStart && expense.date < asOf);
    oneTimeSampleCount = inWindow.length;

    const windowTotal = inWindow.reduce((sum, expense) => sum + expense.amount, 0);
    dailyRate = windowTotal / lookbackDays;
    estimatedTotal = dailyRate * remainingDays;
  }

  return {
    year,
    asOf,
    yearEnd,
    remainingDays,
    recurringTotal: round2(recurringTotal),
    recurringCount,
    estimatedTotal: round2(estimatedTotal),
    projectedTotal: round2(recurringTotal + estimatedTotal),
    dailyRate: round2(dailyRate),
    weeklyRate: round2(dailyRate * 7),
    lookbackDays,
    oneTimeSampleCount,
  };
}
