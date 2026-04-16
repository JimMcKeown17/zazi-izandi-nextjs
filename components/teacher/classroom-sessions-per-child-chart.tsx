"use client";

import type { ClassroomSummary, ClassroomChild } from "@/lib/teacher/types";

interface Props {
  summary: ClassroomSummary;
}

function ChildSessionBar({
  child,
  maxSessions,
}: {
  child: ClassroomChild;
  maxSessions: number;
}) {
  const sessions = child.sessions_attended;
  const pct = maxSessions > 0 ? (sessions / maxSessions) * 100 : 0;
  const color = pct < 33 ? "#ef4444" : pct < 66 ? "#f59e0b" : "#10b981";

  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:grid grid-cols-[100px_1fr_30px] gap-2 items-center py-1 text-xs">
        <div className="text-right text-slate-700 truncate">{child.name}</div>
        <div className="h-2.5 rounded bg-slate-100">
          <div
            className="h-full rounded"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <div className="font-semibold text-right">{sessions}</div>
      </div>
      {/* Mobile */}
      <div className="sm:hidden py-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-700 truncate max-w-[65%]">
            {child.name}
          </span>
          <span className="font-semibold">{sessions}</span>
        </div>
        <div className="h-2 rounded bg-slate-100">
          <div
            className="h-full rounded"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </>
  );
}

export function ClassroomSessionsPerChildChart({ summary }: Props) {
  const { children } = summary;

  const sorted = [...children].sort(
    (a, b) => a.sessions_attended - b.sessions_attended
  );
  const maxSessions = Math.max(...sorted.map((c) => c.sessions_attended), 1);

  if (sorted.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Sessions per child
        </h2>
        <p className="mt-2 text-xs text-slate-500">No children data yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Sessions per child
        </h2>
        <span className="text-[10px] text-slate-400">▲ fewest first</span>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Every child should be getting instruction. Total sessions attended since
        programme start — children who joined late may show lower counts.
      </p>

      <div>
        {sorted.map((child) => (
          <ChildSessionBar
            key={child.participant_id}
            child={child}
            maxSessions={maxSessions}
          />
        ))}
      </div>

      <p className="mt-2 text-[10px] text-slate-400 text-center">
        All {children.length} children shown
      </p>
    </section>
  );
}
