"use client";

import { useEffect, useState } from "react";
import type { RecurringCharge } from "@/lib/reports";
import { formatCurrency } from "@/lib/utils";

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

export default function RecurringSpendingCard({
  value,
  charges,
}: {
  value: string;
  charges: RecurringCharge[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const total = charges.reduce((sum, charge) => sum + charge.monthlyCharge, 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="card p-5 text-left transition-colors hover:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <p className="stat-label">Recurring spending</p>
        <p className="stat-value">{value}</p>
        <p className="stat-sub">recurrent charges</p>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Recurring spending"
        >
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Recurring spending</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {charges.length} {charges.length === 1 ? "charge" : "charges"} ·{" "}
                  {formatCurrency(total)}/mo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-icon"
                aria-label="Close dialog"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            {charges.length === 0 ? (
              <p className="mt-6 text-center text-sm text-slate-500">
                No recurring expenses yet.
              </p>
            ) : (
              <ul className="mt-4 max-h-80 divide-y divide-slate-100 overflow-y-auto">
                {charges.map((charge) => (
                  <li key={charge.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{charge.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        {charge.category && (
                          <span className="badge badge-category">{charge.category}</span>
                        )}
                        <span>{FREQUENCY_LABELS[charge.frequency] ?? charge.frequency}</span>
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-sm font-semibold text-slate-900">
                      {formatCurrency(charge.monthlyCharge)}
                      <span className="text-xs font-normal text-slate-400">/mo</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
