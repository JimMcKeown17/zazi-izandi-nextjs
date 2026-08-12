"use client";

import { useMemo, useState } from "react";

import { buildEaClockRollups } from "@/lib/mobile/time-entries/rollup";
import type { MobileTimeEntryRow } from "@/lib/mobile/time-entries/types";
import { cn } from "@/lib/utils";
import { ClockEntriesTable } from "./clock-entries-table";
import { EaRollupTable } from "./ea-rollup-table";

type LedgerView = "shifts" | "ea";

function syncUrl(next: { q: string; view: LedgerView }) {
  const url = new URL(window.location.href);
  if (next.q === "") url.searchParams.delete("q");
  else url.searchParams.set("q", next.q);
  if (next.view === "shifts") url.searchParams.delete("view");
  else url.searchParams.set("view", next.view);
  window.history.replaceState(null, "", url.toString());
}

export function AttendanceLedger({
  entries,
  days,
  schoolId,
  initialQuery = "",
  initialView = "shifts",
  userHealthLinksEnabled = false,
}: {
  entries: MobileTimeEntryRow[];
  days: number;
  schoolId: string | null;
  initialQuery?: string;
  initialView?: LedgerView;
  userHealthLinksEnabled?: boolean;
}) {
  const [view, setView] = useState<LedgerView>(initialView);
  const [query, setQuery] = useState(initialQuery);
  const needle = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      needle.length === 0
        ? entries
        : entries.filter(
            (entry) =>
              entry.ea_name.toLowerCase().includes(needle) ||
              entry.current_school.toLowerCase().includes(needle) ||
              entry.user_id.toLowerCase() === needle
          ),
    [entries, needle]
  );
  const rollups = useMemo(() => buildEaClockRollups(filtered), [filtered]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
          {(
            [
              ["shifts", "By shift"],
              ["ea", "By EA"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setView(value);
                syncUrl({ q: query, view: value });
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold",
                view === value
                  ? "bg-primary text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="sm:w-72">
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              syncUrl({ q: event.target.value, view });
            }}
            placeholder="Search EA or school"
            aria-label="Search EA or school"
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Search narrows the ledger and per-EA view; it does not change the
            summary tiles above{" "}
            <strong>or the CSV export, which always covers the full window and
            school scope, including GPS coordinates</strong>.
          </p>
        </div>
      </div>
      {view === "shifts" ? (
        <ClockEntriesTable
          entries={filtered}
          days={days}
          schoolId={schoolId}
          userHealthLinksEnabled={userHealthLinksEnabled}
        />
      ) : (
        <EaRollupTable
          rollups={rollups}
          days={days}
          schoolId={schoolId}
          userHealthLinksEnabled={userHealthLinksEnabled}
        />
      )}
    </div>
  );
}
