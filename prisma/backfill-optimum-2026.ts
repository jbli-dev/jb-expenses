import "dotenv/config";
import path from "node:path";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Backfill script: reconcile the "Optimum" recurring expense's 2026 history.
 *
 * The recurring-amount model resolves each occurrence to the latest
 * `RecurringAmount` row whose `effectiveFrom` is on or before the occurrence
 * date. We pin each month boundary to its historical amount:
 *   Jan 1 – $80 (Jan–Jun), Jul 1 – $73.68 (July), Aug 1 – $65 (August),
 *   Sep 1 – the expense's current amount (September onward).
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
      OR: [{ title: { contains: "Optimum" } }, { title: { contains: "optimum" } }],
    },
    include: { amounts: { orderBy: { effectiveFrom: "asc" } } },
  });

  if (expenses.length === 0) {
    console.log("No Optimum expense found; nothing to do.");
    return;
  }

  for (const expense of expenses) {
    // 2026 schedule: Jan–Jun $80, Jul $74.68, Aug $65, Sep onward = current amount.
    const schedule = [
      { amount: 80, date: localDate(2026, 0, 1) },
      { amount: 73.68, date: localDate(2026, 6, 1) },
      { amount: 65, date: localDate(2026, 7, 1) },
      { amount: expense.amount, date: localDate(2026, 8, 1) },
    ];

    const actions: string[] = [];

    for (const entry of schedule) {
      actions.push(...(await clearConflictingAmount(expense.id, entry.date, entry.amount)));
      if (await ensureAmount(expense.id, entry.amount, entry.date)) {
        actions.push(`added $${entry.amount} effective ${entry.date.toISOString()}`);
      }
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
