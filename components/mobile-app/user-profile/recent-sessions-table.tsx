import {
  formatDurationSeconds,
  formatSessionFocus,
} from "@/lib/mobile/user-profile/presentation";
import type { MobileUserProfileRecentSession } from "@/lib/mobile/user-profile/types";

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

function formatSessionDate(value: string): string {
  return DATE_FORMAT.format(new Date(`${value}T12:00:00+02:00`));
}

function formatStartedAt(value: string | null): string {
  return value ? TIME_FORMAT.format(new Date(value)) : "Start not recorded";
}

export function RecentSessionsTable({
  sessions,
}: {
  sessions: MobileUserProfileRecentSession[];
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-4">
        <h2 className="font-bold text-slate-900">Recent sessions</h2>
        <p className="mt-1 text-xs text-slate-500">
          Latest {sessions.length.toLocaleString("en-ZA")} of up to 20 session
          records. This table is capped and is not the lifetime total.
        </p>
      </div>
      {sessions.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">
          No session records yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Focus</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((session, index) => (
                <tr
                  key={`${session.session_date}:${session.started_at ?? "unknown"}:${index}`}
                  className="align-top hover:bg-slate-50/80"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                    {formatSessionDate(session.session_date)}
                    <span className="mt-0.5 block text-xs font-normal tabular-nums text-slate-400">
                      {formatStartedAt(session.started_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {session.group_name ?? "Group not recorded"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatSessionFocus(
                      session.letters_focused,
                      session.blend_categories
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">
                    {session.present_attendees.toLocaleString("en-ZA")} present
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-slate-800">
                    {formatDurationSeconds(session.duration_seconds)}
                  </td>
                  <td className="max-w-72 px-4 py-3 text-slate-600">
                    {session.notes ?? "—"}
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
