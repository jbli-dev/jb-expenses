"use client";

import { useActionState, useState } from "react";
import { setBudget, type BudgetFormState } from "@/app/actions/budget";
import { formatCurrency } from "@/lib/utils";
import { GearIcon } from "@/components/icons";

interface MonthlyBudgetProps {
  budget: number | null;
  spending: number;
  /** Whether the budget can be edited (only the current month). */
  editable?: boolean;
}

const initialFormState: BudgetFormState = { error: null };

export default function MonthlyBudget({ budget, spending, editable = true }: MonthlyBudgetProps) {
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
          <p className="mt-0.5 text-base font-bold tracking-tight text-slate-900">
            {hasBudget ? formatCurrency(budget) : "Not set"}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="stat-label">{editable ? "Spent this month" : "Spent"}</p>
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
