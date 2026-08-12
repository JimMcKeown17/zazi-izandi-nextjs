import { Radio } from "lucide-react";

import { getEmploymentStatusDisplay } from "@/lib/mobile/presentation";
import { formatDuration } from "@/lib/mobile/time-entries/presentation";
import type { EaClockRollup } from "@/lib/mobile/time-entries/rollup";

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

function EmploymentBadge({ status }: { status: string | null }) {
  const display = getEmploymentStatusDisplay(status);
  if (!display || display.kind === "active") return null;
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      {display.label}
    </span>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
      <Radio className="h-3 w-3" /> Live
    </span>
  );
}

function formatAverage(minutes: number | null): string {
  return minutes === null ? "—" : formatDuration(minutes);
}

function formatAutomatic(rollup: EaClockRollup): string {
  if (rollup.automatic_rate === null) {
    return rollup.automatic_clock_outs.toLocaleString("en-ZA");
  }
  return `${rollup.automatic_clock_outs.toLocaleString("en-ZA")} (${Math.round(
    rollup.automatic_rate * 100
  )}%)`;
}

function LastClockIn({ value }: { value: string }) {
  const clockIn = new Date(value);
  return (
    <>
      <span>{DATE_FORMAT.format(clockIn)}</span>
      <span className="block text-xs text-slate-400">
        {TIME_FORMAT.format(clockIn)}
      </span>
    </>
  );
}

export function EaRollupTable({ rollups }: { rollups: EaClockRollup[] }) {
  if (rollups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="font-semibold text-slate-800">
          No EAs match this search.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-bold text-slate-900">EA attendance</h2>
          <p className="mt-1 text-xs text-slate-500">
            One row per EA across the selected reporting window.
          </p>
        </div>
        <p className="text-xs font-medium tabular-nums text-slate-500">
          {rollups.length.toLocaleString("en-ZA")} EA
          {rollups.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500">
              <th className="px-4 py-3">EA</th>
              <th className="px-4 py-3">Days clocked</th>
              <th className="px-4 py-3">Completed shifts</th>
              <th className="px-4 py-3">Recorded hours</th>
              <th className="px-4 py-3">Avg shift</th>
              <th className="px-4 py-3">Auto clock-outs</th>
              <th className="px-4 py-3">Last clock-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rollups.map((rollup) => (
              <tr key={rollup.user_id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {rollup.ea_name}
                    </span>
                    <EmploymentBadge status={rollup.employment_status} />
                    {rollup.open_now ? <LiveBadge /> : null}
                  </div>
                  <p className="mt-1 max-w-56 text-xs text-slate-500">
                    {rollup.current_school} · current school
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-slate-900">
                  {rollup.days_clocked.toLocaleString("en-ZA")}
                </td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">
                  {rollup.completed_entries.toLocaleString("en-ZA")}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-slate-900">
                  {formatDuration(rollup.total_completed_minutes)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">
                  {formatAverage(rollup.average_shift_minutes)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">
                  {formatAutomatic(rollup)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                  <LastClockIn value={rollup.last_clock_in_at} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 lg:hidden">
        {rollups.map((rollup) => (
          <article key={rollup.user_id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900">{rollup.ea_name}</h3>
                  <EmploymentBadge status={rollup.employment_status} />
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {rollup.current_school} · current school
                </p>
              </div>
              {rollup.open_now ? <LiveBadge /> : null}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-slate-50 p-3 text-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Days clocked
                </p>
                <p className="mt-1 font-semibold tabular-nums text-slate-900">
                  {rollup.days_clocked.toLocaleString("en-ZA")}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Completed shifts
                </p>
                <p className="mt-1 font-medium tabular-nums text-slate-800">
                  {rollup.completed_entries.toLocaleString("en-ZA")}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Recorded hours
                </p>
                <p className="mt-1 font-semibold tabular-nums text-slate-900">
                  {formatDuration(rollup.total_completed_minutes)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Avg shift
                </p>
                <p className="mt-1 font-medium tabular-nums text-slate-800">
                  {formatAverage(rollup.average_shift_minutes)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Auto clock-outs
                </p>
                <p className="mt-1 font-medium tabular-nums text-slate-800">
                  {formatAutomatic(rollup)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Last clock-in
                </p>
                <p className="mt-1 font-medium text-slate-800">
                  <LastClockIn value={rollup.last_clock_in_at} />
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
