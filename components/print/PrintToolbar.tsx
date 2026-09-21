"use client";

export default function PrintToolbar() {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 print:hidden sm:px-6">
      <p className="text-sm text-slate-500">Print-friendly view of your report</p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-ghost" onClick={() => window.close()}>
          Close
        </button>
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          Print report
        </button>
      </div>
    </div>
  );
}
