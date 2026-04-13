import { AlertTriangle } from "lucide-react";
import type { EaChild } from "@/lib/ea/types";

const LOW_ATTENDANCE_THRESHOLD = 0.5;
const STALE_ATTENDANCE_GAP_DAYS = 7;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(d);
}

function daysBetween(later: string | null, earlier: string | null): number | null {
  if (!later || !earlier) return null;
  const a = new Date(later);
  const b = new Date(earlier);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function isAtRisk(
  child: EaChild,
  mostRecentSessionDate: string | null,
): boolean {
  if (child.sessions_total === 0) return true;
  if (child.attendance_rate < LOW_ATTENDANCE_THRESHOLD) return true;
  const gap = daysBetween(mostRecentSessionDate, child.last_attended);
  if (gap !== null && gap > STALE_ATTENDANCE_GAP_DAYS) return true;
  return false;
}

function ChildRow({ child, atRisk }: { child: EaChild; atRisk: boolean }) {
  const pct = Math.round(child.attendance_rate * 100);
  const teachingKnown =
    child.alignment?.flag_teaching_known &&
    (child.alignment?.teaching_known_letters.length ?? 0) > 0;
  const hasGaps =
    child.alignment?.flag_skipping_needed &&
    (child.alignment?.letters_skipped.length ?? 0) > 0;

  return (
    <li className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {atRisk ? (
            <AlertTriangle
              className="h-3.5 w-3.5 shrink-0 text-amber-500"
              aria-label="Low attendance"
            />
          ) : null}
          <span className="truncate text-sm font-medium text-slate-900">
            {child.name || `Child #${child.participant_id}`}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          {child.sessions_total === 0 ? (
            <span>Not yet attended</span>
          ) : (
            <span>
              {child.sessions_attended}/{child.sessions_total} sessions ·{" "}
              Last seen {formatDate(child.last_attended)}
            </span>
          )}
        </div>
        {teachingKnown || hasGaps ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {hasGaps ? (
              <span className="inline-flex items-center rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                Programme letters not yet taught:{" "}
                {child.alignment!.letters_skipped.join(", ")}
              </span>
            ) : null}
            {teachingKnown ? (
              <span className="inline-flex items-center rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                Knew at baseline:{" "}
                {child.alignment!.teaching_known_letters.join(", ")}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        {child.sessions_total === 0 ? (
          <span className="text-xs text-slate-400">—</span>
        ) : (
          <span
            className={`text-sm font-semibold ${
              atRisk ? "text-amber-700" : "text-slate-700"
            }`}
          >
            {pct}%
          </span>
        )}
      </div>
    </li>
  );
}

interface ChildrenListProps {
  items: EaChild[];
  mostRecentSessionDate: string | null;
}

export function ChildrenList({
  items,
  mostRecentSessionDate,
}: ChildrenListProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Children</h2>
        <p className="mt-2 text-xs text-slate-500">
          No children yet. They&apos;ll appear here once they join your group.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Children</h2>
        <span className="text-[10px] text-slate-400">Sorted by attendance</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((c) => {
          const atRisk = isAtRisk(c, mostRecentSessionDate);
          return <ChildRow key={c.participant_id} child={c} atRisk={atRisk} />;
        })}
      </ul>
    </section>
  );
}
