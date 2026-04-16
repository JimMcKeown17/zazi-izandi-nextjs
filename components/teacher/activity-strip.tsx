import type { ClassroomSummary } from "@/lib/teacher/types";

interface Props {
  summary: ClassroomSummary;
}

export function ActivityStrip({ summary }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-100 px-4 py-2 text-xs text-slate-600">
      <span>
        <strong className="text-slate-900">{summary.total_sessions}</strong>{" "}
        sessions taught
      </span>
      <span>
        <strong className="text-slate-900">
          {Math.round(summary.avg_attendance * 100)}%
        </strong>{" "}
        avg attendance
      </span>
      <span>
        Last session:{" "}
        <strong className="text-slate-900">
          {summary.last_session_date
            ? new Date(summary.last_session_date).toLocaleDateString("en-ZA", {
                month: "short",
                day: "numeric",
              })
            : "—"}
        </strong>
      </span>
    </div>
  );
}
