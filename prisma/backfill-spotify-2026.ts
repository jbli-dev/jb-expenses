import "dotenv/config";
import path from "node:path";
import { PrismaClient } from "../generated/prisma/client";
import { applyNySalesTax } from "../lib/tax";

/**
 * Backfill script: reconcile the "Spotify" recurring expense's 2026 history.
 *
 * Spotify charges pre-tax amounts with NY sales tax applied on top:
 *   Jan–Feb $19 + tax, Mar onward $21.99 + tax. We move the start date to
 *   Jan 1, 2026 and pin each month boundary to its taxed amount:
 *   Jan 1 – $20.69 (Jan–Feb), Mar 1 – $23.94 (March onward).
 */

function resolveDatasourceUrl(url: string | undefined): string {
  const value = url ?? "";
  if (value.startsWith("file:") && !value.startsWith("file:/")) {
    const relativePath = value.slice("file:".length);
    return `file:${path
      .resolve(process.cwd(), "prisma", relativePath)
      .replace(/\\/g, "/")}`;
  }
  return value;
}

const prisma = new PrismaClient({
  datasourceUrl: resolveDatasourceUrl(process.env.DATABASE_URL),
});

/** Local midnight, matching how the app stores occurrence dates. */
function localDate(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day);
}

/** Returns the local-midnight start of the following day. */
function dayAfter(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Deletes any amount rows on `date`'s local day whose amount differs from
 * `desiredAmount`. Keeps a correct row in place so re-runs stay idempotent.
 */
async function clearConflictingAmount(
  expenseId: string,
  date: Date,
  desiredAmount: number,
): Promise<string[]> {
  const removed: string[] = [];

  const conflicting = await prisma.recurringAmount.findMany({
    where: {
      expenseId,
      effectiveFrom: { gte: date, lt: dayAfter(date) },
      NOT: { amount: desiredAmount },
    },
  });

  for (const row of conflicting) {
    await prisma.recurringAmount.delete({ where: { id: row.id } });
    removed.push(`removed stale $${row.amount} @ ${row.effectiveFrom.toISOString()}`);
  }

  return removed;
}

/** Idempotently add a point-in-time amount, returning true if it was created. */
async function ensureAmount(
  expenseId: string,
  amount: number,
  effectiveFrom: Date,
): Promise<boolean> {
  const existing = await prisma.recurringAmount.findFirst({
    where: {
      expenseId,
      amount,
      effectiveFrom: { gte: effectiveFrom, lt: dayAfter(effectiveFrom) },
    },
  });

  if (existing) return false;

  await prisma.recurringAmount.create({
    data: { expenseId, amount, effectiveFrom },
  });
  return true;
}

async function main() {
  const expenses = await prisma.expense.findMany({
    where: {
      OR: [{ title: { contains: "Spotify" } }, { title: { contains: "spotify" } }],
    },
    include: { amounts: { orderBy: { effectiveFrom: "asc" } } },
  });

  if (expenses.length === 0) {
    console.log("No Spotify expense found; nothing to do.");
    return;
  }

  const startDate = localDate(2026, 0, 1);
  const finalAmount = applyNySalesTax(21.99);

  for (const expense of expenses) {
    // 2026 schedule: Jan–Feb $19 + tax, Mar onward $21.99 + tax.
    const schedule = [
      { amount: applyNySalesTax(19), date: localDate(2026, 0, 1) },
      { amount: finalAmount, date: localDate(2026, 2, 1) },
    ];

    const actions: string[] = [];

    for (const entry of schedule) {
      actions.push(...(await clearConflictingAmount(expense.id, entry.date, entry.amount)));
      if (await ensureAmount(expense.id, entry.amount, entry.date)) {
        actions.push(`added $${entry.amount} effective ${entry.date.toISOString()}`);
      }
    }

    // Drop any rows after the final pinned boundary (e.g. the original
    // "effectiveFrom = expense.date" row) so Mar 1 is the last pin.
    const redundant = await prisma.recurringAmount.findMany({
      where: {
        expenseId: expense.id,
        effectiveFrom: { gte: dayAfter(localDate(2026, 2, 1)) },
      },
    });
    for (const row of redundant) {
      await prisma.recurringAmount.delete({ where: { id: row.id } });
      actions.push(`removed redundant $${row.amount} @ ${row.effectiveFrom.toISOString()}`);
    }

    // Recurring occurrences start at the expense's `date`; move it to Jan 1,
    // 2026 and keep the current amount at the Mar-onward charge.
    if (expense.date.getTime() !== startDate.getTime() || expense.amount !== finalAmount) {
      await prisma.expense.update({
        where: { id: expense.id },
        data: { date: startDate, amount: finalAmount },
      });
      actions.push(`set start date to ${startDate.toISOString()} and amount to $${finalAmount}`);
    }

    console.log(
      `"${expense.title}" (${expense.id}): ${
        actions.length > 0 ? actions.join("; ") : "already up to date"
      }`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
