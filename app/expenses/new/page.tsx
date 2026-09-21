import Link from "next/link";
import ExpenseForm from "@/components/expense/ExpenseForm";
import { ChevronLeftIcon } from "@/components/icons";

export default function NewExpensePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/" className="btn-ghost">
        <ChevronLeftIcon />
        Back to dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add expense</h1>
        <p className="text-sm text-slate-500">Record a one-time or recurring expense.</p>
      </div>

      <div className="card p-6">
        <ExpenseForm />
      </div>
    </div>
  );
}
