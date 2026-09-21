"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PERIODS, shiftAnchor, toISODate, type Period } from "@/lib/dates";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PrinterIcon,
} from "@/components/icons";

function parseDate(value: string | null): Date {
  if (value) {
    const d = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export default function PeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const periodParam = searchParams.get("period");
  const period: Period =
    periodParam === "monthly" || periodParam === "yearly" ? periodParam : "weekly";
  const anchor = parseDate(searchParams.get("date"));

  function update(nextPeriod: Period, nextAnchor: Date) {
    const params = new URLSearchParams();
    if (nextPeriod !== "weekly") params.set("period", nextPeriod);
    params.set("date", toISODate(nextAnchor));
    for (const category of searchParams.getAll("category")) {
      params.append("category", category);
    }
    router.push(`/?${params.toString()}`);
  }

  function openPrint() {
    const params = new URLSearchParams();
    if (period !== "weekly") params.set("period", period);
    params.set("date", toISODate(anchor));
    for (const category of searchParams.getAll("category")) {
      params.append("category", category);
    }
    window.open(
      `/print?${params.toString()}`,
      "expense-report-print",
      "width=1024,height=960",
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="segmented-control w-fit" role="tablist" aria-label="Report period">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={p === period}
            className={p === period ? "segment segment-active" : "segment"}
            onClick={() => update(p, anchor)}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="btn-icon"
          aria-label="Previous period"
          onClick={() => update(period, shiftAnchor(anchor, period, -1))}
        >
          <ChevronLeftIcon />
        </button>
        <button type="button" className="btn-ghost" onClick={() => update(period, new Date())}>
          Today
        </button>
        <button
          type="button"
          className="btn-icon"
          aria-label="Next period"
          onClick={() => update(period, shiftAnchor(anchor, period, 1))}
        >
          <ChevronRightIcon />
        </button>
        <button
          type="button"
          className="btn-icon ml-2"
          aria-label="Print report"
          title="Open a print-friendly report"
          onClick={openPrint}
        >
          <PrinterIcon />
        </button>
      </div>
    </div>
  );
}
