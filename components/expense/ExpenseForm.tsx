"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createExpense, updateExpense, type ExpenseFormState } from "@/app/actions/expenses";

const CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Entertainment",
  "Health",
  "Shopping",
  "Travel",
  "Education",
  "Other",
];

const initialFormState: ExpenseFormState = { error: null };

function todayLocalISO(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export interface ExpenseFormValues {
  id?: string;
  title: string;
  amount: number;
  category: string | null;
  /** ISO date string (yyyy-mm-dd). */
  date: string;
  /** Recurring frequency, or null for one-time expenses. */
  frequency: string | null;
}

export default function ExpenseForm({
  expense,
  returnTo,
}: {
  expense?: ExpenseFormValues;
  returnTo?: string;
}) {
  const isEditing = Boolean(expense);
  const action = isEditing ? updateExpense : createExpense;
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [type, setType] = useState<"once" | "recurring">(
    expense?.frequency ? "recurring" : "once",
  );

  const cancelHref = returnTo ?? "/";

  return (
    <form action={formAction} className="space-y-6">
      {expense?.id && <input type="hidden" name="id" value={expense.id} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      {state.error && (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="title" className="label">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            className="input"
            placeholder="e.g. Groceries"
            defaultValue={expense?.title ?? ""}
            required
          />
        </div>

        <div>
          <label htmlFor="amount" className="label">
            Amount
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            className="input"
            placeholder="0.00"
            defaultValue={expense ? String(expense.amount) : ""}
            required
          />
        </div>

        <div>
          <label htmlFor="date" className="label">
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={expense?.date ?? todayLocalISO()}
            className="input"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="category" className="label">
            Category <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="category"
            name="category"
            type="text"
            list="category-options"
            className="input"
            placeholder="e.g. Food"
            defaultValue={expense?.category ?? ""}
          />
          <datalist id="category-options">
            {CATEGORIES.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </div>
      </div>

      <fieldset>
        <legend className="label">Type</legend>
        <div className="segmented-control w-fit">
          <button
            type="button"
            className={type === "once" ? "segment segment-active" : "segment"}
            aria-pressed={type === "once"}
            onClick={() => setType("once")}
          >
            One-time
          </button>
          <button
            type="button"
            className={type === "recurring" ? "segment segment-active" : "segment"}
            aria-pressed={type === "recurring"}
            onClick={() => setType("recurring")}
          >
            Recurring
          </button>
        </div>
        <input type="hidden" name="type" value={type} />
      </fieldset>

      {type === "recurring" && (
        <div>
          <label htmlFor="frequency" className="label">
            Repeats every
          </label>
          <select
            id="frequency"
            name="frequency"
            className="input"
            defaultValue={expense?.frequency ?? "MONTHLY"}
          >
            <option value="DAILY">Day</option>
            <option value="WEEKLY">Week</option>
            <option value="MONTHLY">Month</option>
            <option value="YEARLY">Year</option>
          </select>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : isEditing ? "Save changes" : "Save expense"}
        </button>
        <Link href={cancelHref} className="btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
