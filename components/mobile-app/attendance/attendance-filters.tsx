import Link from "next/link";

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
  const hasCustomDays = !DAY_OPTIONS.some((option) => option === days);

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
      <form
        action="/mobile-app/attendance"
        method="get"
        className="grid gap-3 sm:grid-cols-[10rem_minmax(15rem,1fr)_auto_auto] sm:items-end"
      >
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Reporting window
          <select
            name="days"
            defaultValue={String(days)}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {hasCustomDays ? <option value={days}>{days} days</option> : null}
            {DAY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                Last {option} days
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Current school
          <select
            name="school_id"
            defaultValue={selectedSchoolId ?? ""}
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
          <Link
            href={`/mobile-app/attendance?days=${days}`}
            className="flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Clear school
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
      </form>

      {canExport ? (
        <TimeEntryExportButton days={days} schoolId={selectedSchoolId} />
      ) : (
        <p className="max-w-64 text-xs leading-relaxed text-slate-500">
          CSV export is restricted because it includes clock-location data.
        </p>
      )}
    </div>
  );
}
