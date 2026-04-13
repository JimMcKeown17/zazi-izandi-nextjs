import { Calendar, ChevronDown } from "lucide-react";
import type { EaSession } from "@/lib/ea/types";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Johannesburg",
  }).format(d);
}

function SessionRow({ session }: { session: EaSession }) {
  return (
    <li className="border-b border-slate-100 py-3 last:border-b-0">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 marker:hidden [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-900">
              <Calendar
                className="h-3 w-3 text-slate-400"
                aria-hidden="true"
              />
              {formatDate(session.date)}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {session.letters_taught.length > 0
                ? `Letters: ${session.letters_taught.join(", ")}`
                : "No letters recorded"}
              {" · "}
              {session.attendance_count}/{session.attendance_total} present
            </div>
            {session.notes ? (
              <p className="mt-1 text-xs italic leading-relaxed text-slate-600">
                {session.notes}
              </p>
            ) : null}
          </div>
          <ChevronDown
            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <ul className="mt-2 ml-5 space-y-1">
          {session.attendees.map((a) => (
            <li
              key={a.participant_id}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  a.present ? "bg-green-500" : "bg-slate-300"
                }`}
                aria-hidden="true"
              />
              <span
                className={
                  a.present ? "text-slate-700" : "text-slate-400 line-through"
                }
              >
                {a.name || `Child #${a.participant_id}`}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

interface RecentSessionsProps {
  sessions: EaSession[];
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  if (sessions.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Recent sessions</h2>
        <p className="mt-2 text-xs text-slate-500">
          No sessions recorded yet.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Recent sessions
        </h2>
        <span className="text-[10px] text-slate-400">
          Last {sessions.length}
        </span>
      </div>
      <ul>
        {sessions.map((s) => (
          <SessionRow key={s.session_id} session={s} />
        ))}
      </ul>
    </section>
  );
}
