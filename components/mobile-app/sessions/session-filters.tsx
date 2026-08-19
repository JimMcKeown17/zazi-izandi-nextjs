import Link from "next/link";

import type { MobileSchoolOption } from "@/lib/mobile/types";

const WINDOW_OPTIONS = [
  { value: 1, label: "Today" },
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 60, label: "Last 60 days" },
  { value: 90, label: "Last 90 days" },
] as const;

interface SessionFiltersProps {
  days: number;
  selectedSchoolId: string | null;
  selectedSchoolType: string | null;
  schoolOptions: MobileSchoolOption[];
}

export function SessionFilters({
  days,
  selectedSchoolId,
  selectedSchoolType,
  schoolOptions,
}: SessionFiltersProps) {
  const hasCustomDays = !WINDOW_OPTIONS.some((option) => option.value === days);

  return (
    <form
      action="/mobile-app/sessions"
      method="get"
      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[10rem_minmax(12rem,1fr)_9rem_auto_auto] sm:items-end"
    >
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Reporting window
        <select
          name="days"
          defaultValue={String(days)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {hasCustomDays ? <option value={days}>{days} days</option> : null}
          {WINDOW_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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

      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        School type
        <select
          name="school_type"
          defaultValue={selectedSchoolType ?? ""}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All school types</option>
          <option value="primary">Primary</option>
          <option value="ecd">ECD</option>
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
          href={`/mobile-app/sessions?days=${days}${
            selectedSchoolType ? `&school_type=${selectedSchoolType}` : ""
          }`}
          className="flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          Clear school
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </form>
  );
}
