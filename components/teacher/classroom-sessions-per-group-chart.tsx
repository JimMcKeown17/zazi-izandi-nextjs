"use client";

import type { ClassroomSummary } from "@/lib/teacher/types";

interface GroupSession {
  group_name: string;
  total_sessions: number;
}

interface Props {
  summary: ClassroomSummary;
  groups: GroupSession[];
}

export function ClassroomSessionsPerGroupChart({ groups }: Props) {
  if (groups.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Sessions per group
        </h2>
        <p className="mt-2 text-xs text-slate-500">No group data available.</p>
      </section>
    );
  }

  const sorted = [...groups].sort(
    (a, b) => a.total_sessions - b.total_sessions
  );
  const maxSessions = Math.max(...sorted.map((g) => g.total_sessions), 1);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Sessions per group
        </h2>
        <span className="text-[10px] text-slate-400">▲ fewest first</span>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Is your EA giving equal time to every group?
      </p>

      <div>
        {sorted.map((g) => {
          const pct = (g.total_sessions / maxSessions) * 100;
          const color =
            pct < 33 ? "#ef4444" : pct < 66 ? "#f59e0b" : "#10b981";
          return (
            <div key={g.group_name}>
              {/* Desktop */}
              <div className="hidden sm:grid grid-cols-[120px_1fr_30px] gap-2 items-center py-1 text-xs">
                <div className="text-right text-slate-700 truncate">
                  {g.group_name}
                </div>
                <div className="h-2.5 rounded bg-slate-100">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <div className="font-semibold text-right">
                  {g.total_sessions}
                </div>
              </div>
              {/* Mobile */}
              <div className="sm:hidden py-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 truncate max-w-[70%]">
                    {g.group_name}
                  </span>
                  <span className="font-semibold">{g.total_sessions}</span>
                </div>
                <div className="h-2 rounded bg-slate-100">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] text-slate-400">
        {groups.length} groups · totals since programme start
      </p>
    </section>
  );
}
