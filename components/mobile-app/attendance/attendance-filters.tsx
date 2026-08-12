"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { MobileSchoolOption } from "@/lib/mobile/types";
import { TimeEntryExportButton } from "./time-entry-export-button";

const DAY_OPTIONS = [7, 14, 30, 60, 90] as const;

export function AttendanceFilters({
  days,
  selectedSchoolId,
  schoolOptions,
  canExport,
}: {
  days: number;
  selectedSchoolId: string | null;
  schoolOptions: MobileSchoolOption[];
  canExport: boolean;
}) {
  const router = useRouter();
  const [pendingDays, setPendingDays] = useState(String(days));
  const [pendingSchoolId, setPendingSchoolId] = useState(selectedSchoolId ?? "");
  const hasCustomDays = !DAY_OPTIONS.some((option) => String(option) === pendingDays);

  function navigateMerged(updates: Record<string, string | null>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    router.push(`/mobile-app/attendance?${params.toString()}`);
  }

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          navigateMerged({ days: pendingDays, school_id: pendingSchoolId || null });
        }}
        className="grid gap-3 sm:grid-cols-[10rem_minmax(15rem,1fr)_auto_auto] sm:items-end"
      >
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Reporting window
          <select
            name="days"
            value={pendingDays}
            onChange={(event) => setPendingDays(event.target.value)}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {hasCustomDays ? <option value={pendingDays}>{pendingDays} days</option> : null}
            {DAY_OPTIONS.map((option) => (
              <option key={option} value={String(option)}>
                Last {option} days
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Current school
          <select
            name="school_id"
            value={pendingSchoolId}
            onChange={(event) => setPendingSchoolId(event.target.value)}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All current schools</option>
            {schoolOptions.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2"
        >
          Apply filters
        </button>

        {selectedSchoolId ? (
          <button
            type="button"
            onClick={() => {
              setPendingSchoolId("");
              navigateMerged({ school_id: null });
            }}
            className="flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Clear school
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
      </form>

      {canExport ? (
        <div>
          <TimeEntryExportButton days={days} schoolId={selectedSchoolId} />
          <p className="mt-1 max-w-64 text-xs leading-relaxed text-slate-500">
            Exports every entry in the selected window and school — including
            GPS coordinates. On-page search does not narrow it.
          </p>
        </div>
      ) : (
        <p className="max-w-64 text-xs leading-relaxed text-slate-500">
          CSV export is restricted because it includes clock-location data.
        </p>
      )}
    </div>
  );
}
