"use client";

import { useState, type ReactNode } from "react";

export function HistoricalTeamPactDisclosure({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group rounded-xl border border-slate-300 bg-slate-100/70 shadow-sm"
      data-testid="historical-teampact-disclosure"
    >
      <summary className="cursor-pointer list-none rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900">
              Historical TeamPact view — legacy annual measure
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              2026 year to date · select to {open ? "hide" : "show"} the existing annual dashboard
            </p>
          </div>
          <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
            {open ? "Hide" : "Show"}
          </span>
        </div>
      </summary>
      {open ? <div className="border-t border-slate-300 p-4">{children}</div> : null}
    </details>
  );
}
