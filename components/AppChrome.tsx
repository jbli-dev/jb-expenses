"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PlusIcon } from "@/components/icons";

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // The print view is a standalone, print-optimized page: no app chrome.
  if (pathname === "/print") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="brand-mark">$</span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              Expense Tracker
            </span>
          </Link>
          <Link href="/expenses/new" className="btn-primary">
            <PlusIcon />
            Add expense
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t border-slate-200 py-6 print:hidden">
        <p className="text-center text-xs text-slate-400">
          Expense Tracker — your money, made visible.
        </p>
      </footer>
    </div>
  );
}
