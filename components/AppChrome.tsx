"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logout } from "@/app/actions/auth";

export interface SessionUser {
  name: string | null;
  email: string;
  image: string | null;
}

interface AppChromeProps {
  user: SessionUser | null;
  children: ReactNode;
}

export default function AppChrome({ user, children }: AppChromeProps) {
  const pathname = usePathname();

  // The print view and login page are standalone pages: no app chrome.
  if (pathname === "/print" || pathname === "/login") {
    return <>{children}</>;
  }

  const initial = (user?.name ?? user?.email ?? "?").charAt(0).toUpperCase();

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

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <form action={logout} className="flex items-center gap-2">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                      {initial}
                    </span>
                  )}
                  <span className="hidden max-w-[12rem] truncate text-sm font-medium text-slate-700 sm:block">
                    {user.name ?? user.email}
                  </span>
                  <button type="submit" className="btn-ghost">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link href="/login" className="btn-ghost">
                Sign in
              </Link>
            )}
          </div>
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
