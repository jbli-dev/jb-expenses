"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseMonthKey, toMonthKey } from "@/lib/dates";

export interface BudgetFormState {
  error: string | null;
}

export async function setBudget(
  _prevState: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = Number.parseFloat(amountRaw);

  if (!amountRaw || Number.isNaN(amount) || amount <= 0) {
    return { error: "Please enter a budget greater than zero." };
  }

  // Budgets are stored per calendar month ("YYYY-MM"), so updating one month
  // never changes the budget recorded for any other month — including upcoming
  // months whose budgets may differ. The form may target a specific month.
  const monthRaw = String(formData.get("month") ?? "").trim();
  const month = monthRaw ? parseMonthKey(monthRaw) : new Date();
  if (!month) {
    return { error: "Invalid month." };
  }
  const monthKey = toMonthKey(month);

  await prisma.budget.upsert({
    where: { month: monthKey },
    update: { amount },
    create: { month: monthKey, amount },
  });

  revalidatePath("/");
  return { error: null };
}
