"use client";

import type { EAPerformanceItem } from "@/lib/pm/types";

// Human-readable flag labels
const FLAG_LABELS: Record<string, string> = {
  same_letter_group: "Same Letter",
  moving_too_fast: "Moving Too Fast",
  ghost_group: "Ghost Group",
  stagnation: "Stagnation",
  curriculum_gaps: "Curriculum Gaps",
  teaching_known: "Teaching Known",
  skipping_needed: "Skipping Needed",
};

interface EADetailPanelProps {
  ea: EAPerformanceItem;
  onClose: () => void;
}

export function EADetailPanel({ ea, onClose }: EADetailPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border-2 border-primary p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{ea.ea_name}</h3>
          <p className="text-sm text-slate-500">{ea.school}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-green-50 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
            {ea.sessions_per_programme_day} sessions/day
          </span>
          {ea.alignment_avg_score !== null && (
            <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
              {ea.alignment_avg_score}% alignment
            </span>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none ml-2"
            aria-label="Close detail panel"
          >
            ×
          </button>
        </div>
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Groups", value: ea.groups_count },
          { label: "Total Sessions", value: ea.total_sessions },
          { label: "Children", value: ea.children_count },
          { label: "Active Flags", value: ea.active_flags_count },
        ].map((stat) => (
          <div
            key={stat.label}
            className="text-center p-3 bg-slate-50 rounded-md"
          >
            <div className="text-xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-xs text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Group breakdown */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Groups
        </h4>
        <div className="space-y-1.5">
          {ea.groups.map((group) => (
            <div
              key={`${group.class_name}-${group.phase}`}
              className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 items-center px-3 py-2 rounded-md text-sm ${
                group.phase === "blending"
                  ? "bg-slate-100 opacity-60"
                  : "bg-slate-50"
              }`}
            >
              <div>
                <span className="font-medium">{group.class_name}</span>
                <span className="text-slate-400 ml-1">· {group.phase}</span>
              </div>
              <div className="text-slate-500">
                {group.children_count} children
              </div>
              <div className="text-slate-500">
                {group.avg_sessions_per_week} sess/wk
              </div>
              <div
                className={
                  group.alignment_avg_score !== null
                    ? group.alignment_avg_score >= 50
                      ? "text-green-600"
                      : "text-amber-600"
                    : "text-slate-400"
                }
              >
                {group.alignment_avg_score !== null
                  ? `${group.alignment_avg_score}%`
                  : "—"}
              </div>
              <div>
                {group.flags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {group.flags.map((flag) => (
                      <span
                        key={flag}
                        className="bg-amber-50 text-amber-700 text-[10px] font-medium px-1.5 py-0.5 rounded"
                      >
                        {FLAG_LABELS[flag] || flag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs">No flags</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
