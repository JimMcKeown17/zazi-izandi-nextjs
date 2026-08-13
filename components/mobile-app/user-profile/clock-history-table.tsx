import { AlertTriangle, Radio } from "lucide-react";

import { formatDurationMinutes } from "@/lib/mobile/user-profile/presentation";
import type { MobileUserProfileClockEntry } from "@/lib/mobile/user-profile/types";

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

function formatLocalDate(value: string): string {
  return DATE_FORMAT.format(new Date(`${value}T12:00:00+02:00`));
}

function formatTime(value: string | null): string {
  return value ? TIME_FORMAT.format(new Date(value)) : "Open now";
}

function EntryMarkers({ entry }: { entry: MobileUserProfileClockEntry }) {
  if (entry.is_active) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <Radio className="h-3 w-3" /> Active
      </span>
    );
  }
  if (entry.auto_clocked_out) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
        <AlertTriangle className="h-3 w-3" /> Automatic clock-out
      </span>
    );
  }
  return <span className="text-xs font-medium text-slate-500">Complete</span>;
}

export function ClockHistoryTable({
  entries,
}: {
  entries: MobileUserProfileClockEntry[];
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-4">
        <h2 className="font-bold text-slate-900">Clock history</h2>
        <p className="mt-1 text-xs text-slate-500">
          Latest {entries.length.toLocaleString("en-ZA")} of up to 100 clock
          entries, shown in South Africa time. This table is capped and is not
          the lifetime total.
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">
          No clock entries yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Clock in</th>
                <th className="px-4 py-3">Clock out</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <tr
                  key={entry.sign_in_time}
                  className="hover:bg-slate-50/80"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                    {formatLocalDate(entry.local_date)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-slate-800">
                    {formatTime(entry.sign_in_time)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">
                    {formatTime(entry.sign_out_time)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-slate-900">
                    {entry.is_active
                      ? "In progress"
                      : formatDurationMinutes(entry.duration_minutes)}
                  </td>
                  <td className="px-4 py-3">
                    <EntryMarkers entry={entry} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
