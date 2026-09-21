"use client";

import { useState } from "react";
import type { UpcomingBilling } from "@/lib/billing";
import { formatCurrency } from "@/lib/utils";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/icons";

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const MAX_BILLS = 5;

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(`${iso}T00:00:00`));
}

export default function UpcomingBillingCard({ billing }: { billing: UpcomingBilling }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        aria-controls="upcoming-bills-panel"
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:max-w-sm"
      >
        <span className="text-sm font-semibold text-slate-900">
          View upcoming bills ·{" "}
          <span className="font-bold text-indigo-600">{formatCurrency(billing.total)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
          {billing.monthLabel}
          <ChevronDownIcon className="h-4 w-4" />
        </span>
      </button>
    );
  }

  const { monthLabel, bills, total, count } = billing;
  const shown = bills.slice(0, MAX_BILLS);

  return (
    <section id="upcoming-bills-panel" className="card w-full p-4 sm:p-5 lg:max-w-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="section-title">Upcoming bills</h2>
          <p className="mt-0.5 text-xs text-slate-500">{monthLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-expanded={true}
          aria-controls="upcoming-bills-panel"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Hide
          <ChevronUpIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {bills.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No recurring bills due for the rest of {monthLabel}.
        </p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-slate-100">
            {shown.map((bill) => (
              <li
                key={`${bill.id}-${bill.date}`}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{bill.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span>{FREQUENCY_LABELS[bill.frequency] ?? bill.frequency}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDate(bill.date)}</span>
                    {bill.category && (
                      <span className="badge badge-category">{bill.category}</span>
                    )}
                  </p>
                </div>
                <span className="whitespace-nowrap text-sm font-semibold text-slate-900">
                  {formatCurrency(bill.amount)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-sm font-semibold text-slate-900">
              Total due
              {count > MAX_BILLS && (
                <span className="ml-1.5 text-xs font-normal text-slate-400">
                  incl. {count - MAX_BILLS} more
                </span>
              )}
            </p>
            <p className="whitespace-nowrap text-base font-bold text-slate-900">
              {formatCurrency(total)}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
