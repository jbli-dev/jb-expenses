"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Frequency } from "@/generated/prisma/enums";

export interface ExpenseFormState {
  error: string | null;
}

const FREQUENCIES = new Set<string>(Object.values(Frequency));

interface ExpenseFormData {
  title: string;
  amount: number;
  category: string | null;
  date: Date;
  frequency: Frequency | null;
}

type ParsedExpenseForm = ExpenseFormData | { error: string };

function parseExpenseForm(formData: FormData): ParsedExpenseForm {
  const title = String(formData.get("title") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const dateRaw = String(formData.get("date") ?? "").trim();
  const type = String(formData.get("type") ?? "once");
  const frequencyRaw = String(formData.get("frequency") ?? "").trim();

  if (!title) {
    return { error: "Please enter a title." };
  }

  const amount = Number.parseFloat(amountRaw);
  if (!amountRaw || Number.isNaN(amount) || amount <= 0) {
    return { error: "Please enter an amount greater than zero." };
  }

  const date = new Date(`${dateRaw}T00:00:00`);
  if (!dateRaw || Number.isNaN(date.getTime())) {
    return { error: "Please choose a valid date." };
  }

  let frequency: Frequency | null = null;
  if (type === "recurring") {
    if (!FREQUENCIES.has(frequencyRaw)) {
      return { error: "Please choose how often this expense repeats." };
    }
    frequency = frequencyRaw as Frequency;
  }

  return { title, amount, category, date, frequency };
}

export async function createExpense(
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const parsed = parseExpenseForm(formData);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  await prisma.expense.create({
    data: parsed,
  });

  revalidatePath("/");
  redirect("/");
}

function safeRedirect(value: FormDataEntryValue | null): string {
  const target = String(value ?? "").trim();
  if (target.startsWith("/") && !target.startsWith("//")) {
    return target;
  }
  return "/";
}

export async function updateExpense(
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { error: "Expense not found." };
  }

  const parsed = parseExpenseForm(formData);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  await prisma.expense.update({
    where: { id },
    data: parsed,
  }).catch(() => null);

  revalidatePath("/");
  redirect(safeRedirect(formData.get("returnTo")));
}

export async function deleteExpense(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await prisma.expense
    .delete({ where: { id } })
    .catch(() => undefined);

  revalidatePath("/");
}
