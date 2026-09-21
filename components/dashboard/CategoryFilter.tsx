"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

export interface CategoryFilterOption {
  value: string;
  label: string;
  total?: number;
}

export default function CategoryFilter({
  categories,
}: {
  categories: CategoryFilterOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.getAll("category");

  function apply(next: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    for (const value of next) params.append("category", value);
    router.push(`/?${params.toString()}`);
  }

  function toggle(value: string) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    apply(next);
  }

  function toggleAll() {
    apply([]);
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2" role="group" aria-label="Filter by category">
      <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-100">
        <input
          type="checkbox"
          className="h-4 w-4 accent-indigo-600"
          checked={selected.length === 0}
          onChange={toggleAll}
        />
        All
      </label>

      {categories.map((category) => {
        const checked = selected.includes(category.value);
        return (
          <label
            key={category.value}
            className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
              checked
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <input
              type="checkbox"
              className="h-4 w-4 accent-indigo-600"
              checked={checked}
              onChange={() => toggle(category.value)}
            />
            <span className="flex items-baseline gap-1.5">
              <span>{category.label}</span>
              <span className="text-xs opacity-60">· {formatCurrency(category.total ?? 0)}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
