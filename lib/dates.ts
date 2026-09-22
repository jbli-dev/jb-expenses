import type { Frequency } from "@/generated/prisma/enums";

export type Period = "weekly" | "monthly" | "yearly";

export const PERIODS: readonly Period[] = ["weekly", "monthly", "yearly"];

export interface PeriodRange {
  /** Inclusive start of the period (local midnight). */
  start: Date;
  /** Exclusive end of the period. */
  end: Date;
}

export function isPeriod(value: string | null | undefined): value is Period {
  return value === "weekly" || value === "monthly" || value === "yearly";
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Formats a date as a "YYYY-MM" month key, used to key monthly budgets. */
export function toMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(value: string | null | undefined): Date {
  if (value) {
    const d = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return startOfDay(new Date());
}

export function getPeriodRange(period: Period, anchor: Date): PeriodRange {
  const start = startOfDay(anchor);
  let end: Date;

  if (period === "weekly") {
    const offset = (start.getDay() + 6) % 7; // 0 = Monday
    start.setDate(start.getDate() - offset);
    end = new Date(start);
    end.setDate(end.getDate() + 7);
  } else if (period === "monthly") {
    start.setDate(1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  } else {
    start.setMonth(0, 1);
    end = new Date(start.getFullYear() + 1, 0, 1);
  }

  return { start, end };
}

export function shiftAnchor(anchor: Date, period: Period, direction: -1 | 1): Date {
  const d = startOfDay(anchor);
  if (period === "weekly") {
    d.setDate(d.getDate() + 7 * direction);
  } else if (period === "monthly") {
    d.setDate(1);
    d.setMonth(d.getMonth() + direction);
  } else {
    d.setMonth(0, 1);
    d.setFullYear(d.getFullYear() + direction);
  }
  return d;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function addInterval(date: Date, frequency: Frequency): Date {
  const d = new Date(date);

  switch (frequency) {
    case "DAILY":
      d.setDate(d.getDate() + 1);
      break;
    case "WEEKLY":
      d.setDate(d.getDate() + 7);
      break;
    case "MONTHLY": {
      const day = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, lastDay));
      break;
    }
    case "YEARLY": {
      const month = d.getMonth();
      const day = d.getDate();
      const nextYear = d.getFullYear() + 1;
      if (month === 1 && day === 29 && !isLeapYear(nextYear)) {
        d.setFullYear(nextYear);
        d.setMonth(1);
        d.setDate(28);
      } else {
        d.setFullYear(nextYear);
      }
      break;
    }
  }

  return d;
}

/**
 * Generates occurrences of a recurring expense from its `startDate` forward,
 * clipped to `[rangeStart, rangeEnd)`. Occurrences never extend before
 * `startDate`, so an item only appears from the date it was created onward.
 */
export function generateOccurrences(
  startDate: Date,
  frequency: Frequency,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  const occurrences: Date[] = [];
  let current = new Date(startDate);
  let guard = 0;

  // Advance to the first occurrence at or after `rangeStart` when the item
  // started before the viewing period.
  while (current < rangeStart && guard < 100_000) {
    const next = addInterval(current, frequency);
    if (next.getTime() <= current.getTime()) break;
    current = next;
    guard += 1;
  }

  while (current < rangeEnd && guard < 100_000) {
    occurrences.push(new Date(current));
    const next = addInterval(current, frequency);
    if (next.getTime() <= current.getTime()) break;
    current = next;
    guard += 1;
  }

  return occurrences;
}

export function formatRangeLabel(period: Period, start: Date, end: Date): string {
  if (period === "yearly") {
    return String(start.getFullYear());
  }

  const lastDay = new Date(end);
  lastDay.setDate(lastDay.getDate() - 1);

  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const fmtWithYear = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (start.getFullYear() === lastDay.getFullYear()) {
    return `${fmt.format(start)} – ${fmt.format(lastDay)}, ${start.getFullYear()}`;
  }
  return `${fmtWithYear.format(start)} – ${fmtWithYear.format(lastDay)}`;
}
