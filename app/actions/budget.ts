"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { toMonthKey } from "@/lib/dates";

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

  // Budgets are stored per calendar month, so updating the current month
  // never changes the budget recorded for any other month.
  const month = toMonthKey(new Date());

  await prisma.budget.upsert({
    where: { month },
    update: { amount },
    create: { month, amount },
  });

  revalidatePath("/");
  return { error: null };
}
