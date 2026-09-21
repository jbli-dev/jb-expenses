import { Suspense } from "react";
import { buildReport, getExpenseCategories, getCategoryTotals, getRecurringCharges } from "@/lib/reports";
import { buildYearEndForecast } from "@/lib/forecast";
import { buildUpcomingBilling } from "@/lib/billing";
import { getMonthlyBudget, getMonthlySpending } from "@/lib/budget";
import { isPeriod, parseISODate, toMonthKey, type Period } from "@/lib/dates";
import PeriodSelector from "@/components/dashboard/PeriodSelector";
import SummaryCards from "@/components/dashboard/SummaryCards";
import MonthlyBudget from "@/components/dashboard/MonthlyBudget";
import YearEndForecast from "@/components/dashboard/YearEndForecast";
import SpendingChart from "@/components/dashboard/SpendingChart";
import UpcomingBillingCard from "@/components/dashboard/UpcomingBilling";
import ExpenseList from "@/components/dashboard/ExpenseList";

interface DashboardPageProps {
  searchParams: Promise<{
    period?: string;
    date?: string;
    category?: string | string[];
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const period: Period = isPeriod(params.period) ? params.period : "weekly";
  const anchor = parseISODate(params.date);
  const selectedCategories = Array.isArray(params.category)
    ? params.category
    : typeof params.category === "string"
      ? [params.category]
      : [];
  const categoryFilter = selectedCategories.length > 0 ? selectedCategories : undefined;
  // The budget card is month-based: it follows the selected month in the
  // monthly view and otherwise reflects the current calendar month.
  const budgetMonth = period === "monthly" ? anchor : new Date();
  const canEditBudget = toMonthKey(budgetMonth) === toMonthKey(new Date());
  const [
    report,
    forecast,
    categories,
    billing,
    categoryTotals,
    budget,
    monthlySpending,
    recurringCharges,
  ] = await Promise.all([
    buildReport(period, anchor, categoryFilter),
    buildYearEndForecast(anchor),
    getExpenseCategories(),
    buildUpcomingBilling(),
    getCategoryTotals(period, anchor),
    getMonthlyBudget(budgetMonth),
    getMonthlySpending(budgetMonth),
    getRecurringCharges(),
  ]);
  const categoriesWithTotals = categories.map((category) => ({
    ...category,
    total: categoryTotals.get(category.value) ?? 0,
  }));
  const selectedCategoryLabels = selectedCategories.map(
    (value) => categories.find((category) => category.value === value)?.label ?? value,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">{report.label}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="w-full max-w-md">
          <MonthlyBudget budget={budget} spending={monthlySpending} editable={canEditBudget} />
        </div>
        <UpcomingBillingCard billing={billing} />
      </div>

      <Suspense
        fallback={<div className="h-11 w-full max-w-md rounded-lg bg-slate-100 animate-pulse" />}
      >
        <PeriodSelector />
      </Suspense>

      <SummaryCards report={report} recurringCharges={recurringCharges} />
      <YearEndForecast forecast={forecast} />
      <Suspense fallback={<div className="card h-72 animate-pulse" />}>
        <SpendingChart
          report={report}
          categories={categoriesWithTotals}
          selected={selectedCategories}
        />
      </Suspense>
      <ExpenseList
        report={report}
        period={period}
        anchor={anchor}
        selectedCategories={selectedCategoryLabels}
      />
    </div>
  );
}
