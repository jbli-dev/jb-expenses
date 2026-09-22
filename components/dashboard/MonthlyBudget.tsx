"use client";

import { useActionState, useState } from "react";
import { setBudget, type BudgetFormState } from "@/app/actions/budget";
import { formatCurrency } from "@/lib/utils";
import { formatMonthLabel } from "@/lib/dates";
import { GearIcon } from "@/components/icons";

interface MonthlyBudgetProps {
  budget: number | null;
  spending: number;
  /** The "YYYY-MM" month this budget applies to. */
  month: string;
  /** Whether the budget can be edited (current and upcoming months). */
  editable?: boolean;
  /** Whether `month` is the current calendar month. */
  isCurrentMonth?: boolean;
}

const initialFormState: BudgetFormState = { error: null };

export default function MonthlyBudget({
  budget,
  spending,
  month,
  editable = true,
  isCurrentMonth = true,
}: MonthlyBudgetProps) {
  const [state, formAction, pending] = useActionState(setBudget, initialFormState);
  const [editing, setEditing] = useState(false);

  const hasBudget = budget !== null;
  const overBudget = hasBudget && spending > budget;
  const nearBudget = hasBudget && !overBudget && spending > budget * 0.9;
  const remaining = hasBudget ? budget - spending : 0;

  return (
    <section className="card p-4">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="stat-label">Monthly budget</p>
          {!isCurrentMonth && (
            <p className="text-[11px] font-medium text-slate-400">{formatMonthLabel(month)}</p>
          )}
          <p className="mt-0.5 text-base font-bold tracking-tight text-slate-900">
            {hasBudget ? formatCurrency(budget) : "Not set"}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="stat-label">{isCurrentMonth ? "Spent this month" : "Spent"}</p>
          <p
            className={`mt-0.5 text-base font-bold tracking-tight ${
              overBudget
                ? "text-rose-600"
                : nearBudget
                  ? "text-orange-500"
                  : "text-slate-900"
            }`}
          >
            {formatCurrency(spending)}
          </p>
        </div>

        {editable && (
          <button
            type="button"
            className="btn-icon"
            aria-expanded={editing}
            aria-label="Update monthly budget"
            title="Update monthly budget"
            onClick={() => setEditing((value) => !value)}
          >
            <GearIcon />
          </button>
        )}
      </div>

      {hasBudget && (
        <p
          className={`mt-1.5 text-xs font-medium ${
            overBudget ? "text-rose-600" : "text-slate-500"
          }`}
        >
          {overBudget
            ? `${formatCurrency(Math.abs(remaining))} over budget`
            : `${formatCurrency(remaining)} remaining`}
        </p>
      )}

      {editing && (
        <form action={formAction} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input type="hidden" name="month" value={month} />
          <label htmlFor="budget-amount" className="label sr-only">
            Monthly budget amount
          </label>
          <input
            id="budget-amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            className="input sm:w-36"
            placeholder="0.00"
            defaultValue={hasBudget ? budget : ""}
            required
          />
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save budget"}
          </button>
        </form>
      )}

      {editing && state.error && (
        <p className="mt-2 text-xs text-rose-600">{state.error}</p>
      )}
    </section>
  );
}
