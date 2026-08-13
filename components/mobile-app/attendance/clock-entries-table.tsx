"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Radio } from "lucide-react";

import { getEmploymentStatusDisplay } from "@/lib/mobile/presentation";
import {
  formatDuration,
  getTimeEntryState,
} from "@/lib/mobile/time-entries/presentation";
import type { MobileTimeEntryRow } from "@/lib/mobile/time-entries/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;
const DATE_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const TIME_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function EntryBadge({ entry }: { entry: MobileTimeEntryRow }) {
  const state = getTimeEntryState(entry);
  if (state === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <Radio className="h-3 w-3" /> Live
      </span>
    );
  }
  if (state === "automatic") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
        <AlertTriangle className="h-3 w-3" /> Automatic
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      <Check className="h-3 w-3" /> Complete
    </span>
  );
}

function EmploymentBadge({ status }: { status: string | null }) {
  const display = getEmploymentStatusDisplay(status);
  if (!display || display.kind === "active") return null;
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      {display.label}
    </span>
  );
}

function formatTime(value: string | null): string {
  return value ? TIME_FORMAT.format(new Date(value)) : "Clocked in now";
}

function Duration({ entry }: { entry: MobileTimeEntryRow }) {
  return entry.duration_minutes === null ? (
    <span className="font-medium text-emerald-700">In progress</span>
  ) : (
    <span className="font-semibold tabular-nums text-slate-900">
      {formatDuration(entry.duration_minutes)}
    </span>
  );
}

export function ClockEntriesTable({
  entries,
  userHealthLinksEnabled = false,
}: {
  entries: MobileTimeEntryRow[];
  userHealthLinksEnabled?: boolean;
}) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visibleEntries = entries.slice(start, start + PAGE_SIZE);

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="font-semibold text-slate-800">No clock entries found</p>
        <p className="mt-1 text-sm text-slate-500">
          Try a longer reporting window or clear the current-school filter.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-bold text-slate-900">Clock ledger</h2>
          <p className="mt-1 text-xs text-slate-500">
            Times are shown in South Africa time. Each row is one recorded shift.
          </p>
        </div>
        <p className="text-xs font-medium tabular-nums text-slate-500">
          {start + 1}–{Math.min(start + PAGE_SIZE, entries.length)} of{" "}
          {entries.length.toLocaleString("en-ZA")}
        </p>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[940px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">EA</th>
              <th className="px-4 py-3">Current school</th>
              <th className="px-4 py-3">Clock in</th>
              <th className="px-4 py-3">Clock out</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-50/80">
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {DATE_FORMAT.format(new Date(entry.sign_in_time))}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {userHealthLinksEnabled ? (
                        <Link
                          href={`/mobile-app/users/${entry.user_id}`}
                          className="hover:underline"
                        >
                          {entry.ea_name}
                        </Link>
                      ) : (
                        entry.ea_name
                      )}
                    </span>
                    <EmploymentBadge status={entry.employment_status} />
                  </div>
                </td>
                <td className="max-w-56 px-4 py-3 text-slate-600">
                  {entry.current_school}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-slate-800">
                  {formatTime(entry.sign_in_time)}
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-4 py-3 tabular-nums",
                    entry.is_active ? "font-medium text-emerald-700" : "text-slate-700"
                  )}
                >
                  {formatTime(entry.sign_out_time)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Duration entry={entry} />
                </td>
                <td className="px-4 py-3">
                  <EntryBadge entry={entry} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 lg:hidden">
        {visibleEntries.map((entry) => (
          <article key={entry.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900">
                    {userHealthLinksEnabled ? (
                      <Link
                        href={`/mobile-app/users/${entry.user_id}`}
                        className="hover:underline"
                      >
                        {entry.ea_name}
                      </Link>
                    ) : (
                      entry.ea_name
                    )}
                  </h3>
                  <EmploymentBadge status={entry.employment_status} />
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {entry.current_school} · current school
                </p>
              </div>
              <EntryBadge entry={entry} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-slate-50 p-3 text-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Date
                </p>
                <p className="mt-1 font-medium text-slate-800">
                  {DATE_FORMAT.format(new Date(entry.sign_in_time))}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Duration
                </p>
                <p className="mt-1"><Duration entry={entry} /></p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Clock in
                </p>
                <p className="mt-1 font-medium tabular-nums text-slate-800">
                  {formatTime(entry.sign_in_time)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Clock out
                </p>
                <p
                  className={cn(
                    "mt-1 tabular-nums",
                    entry.is_active ? "font-semibold text-emerald-700" : "font-medium text-slate-800"
                  )}
                >
                  {formatTime(entry.sign_out_time)}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={safePage === 1}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </button>
          <span className="text-xs font-medium text-slate-500">
            Page {safePage} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            disabled={safePage === pageCount}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
