"use client";

import { useState } from "react";
import type { GroupSummary } from "@/lib/pm/types";
import { LETTER_SEQUENCES, DEFAULT_LANGUAGE } from "@/lib/pm/constants";

interface Props {
  groups: GroupSummary[];
}

function gradeColor(grade: string): string {
  switch (grade) {
    case "Grade R":
      return "bg-blue-500";
    case "Grade 1":
      return "bg-green-500";
    case "Grade 2":
      return "bg-purple-500";
    case "Grade 3":
      return "bg-orange-500";
    case "ECD":
      return "bg-pink-500";
    default:
      return "bg-slate-400";
  }
}

function gradeBorderColor(grade: string): string {
  switch (grade) {
    case "Grade R":
      return "border-l-blue-500";
    case "Grade 1":
      return "border-l-green-500";
    case "Grade 2":
      return "border-l-purple-500";
    case "Grade 3":
      return "border-l-orange-500";
    case "ECD":
      return "border-l-pink-500";
    default:
      return "border-l-slate-400";
  }
}

export function ProgressOverview({ groups }: Props) {
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Only show letter-phase groups
  const letterGroups = groups.filter((g) => g.phase === "letters");

  const grades = ["all", ...Array.from(new Set(letterGroups.map((g) => g.grade).filter(Boolean))).sort()];

  const filtered = letterGroups.filter((g) => {
    if (filterGrade !== "all" && g.grade !== filterGrade) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        g.program_name.toLowerCase().includes(q) ||
        g.ea_name.toLowerCase().includes(q) ||
        g.class_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group by school → EA
  const bySchool = new Map<string, GroupSummary[]>();
  for (const g of filtered) {
    const list = bySchool.get(g.program_name) || [];
    list.push(g);
    bySchool.set(g.program_name, list);
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">Letter Progress Overview</p>
          <p className="text-xs text-slate-500">
            {filtered.length} letter-phase groups ({letterGroups.length - filtered.length} filtered out)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1"
          >
            {grades.map((g) => (
              <option key={g} value={g}>
                {g === "all" ? "All Grades" : g}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search school/EA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1 w-44"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-slate-400">
          No letter-phase groups found
        </div>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {Array.from(bySchool.entries()).map(([school, schoolGroups]) => (
            <div key={school}>
              <p className="text-xs font-semibold text-slate-600 mb-1">{school}</p>
              <div className="space-y-1">
                {schoolGroups.map((g) => (
                  <div
                    key={`${g.program_name}-${g.class_name}`}
                    className={`flex items-center gap-2 border-l-2 ${gradeBorderColor(g.grade)} pl-2 py-0.5`}
                  >
                    <span className="text-[10px] text-slate-500 w-24 truncate" title={g.ea_name}>
                      {g.ea_name}
                    </span>
                    <span className="text-[10px] text-slate-400 w-28 truncate" title={g.class_name}>
                      {g.class_name}
                    </span>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 bg-slate-100 rounded-full h-4 relative overflow-hidden">
                        <div
                          className={`h-full rounded-full ${gradeColor(g.grade)} opacity-80`}
                          style={{ width: `${Math.max(g.progress_pct, 2)}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-slate-700">
                          {g.current_letter ? g.current_letter.toUpperCase() : "—"} ({Math.round(g.progress_pct)}%)
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 w-12 text-right">
                      {g.avg_sessions_per_week.toFixed(1)}/wk
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Letter sequence reference — show languages present in current data */}
      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
        {(() => {
          const langs = Array.from(new Set(filtered.map((g) => g.language || DEFAULT_LANGUAGE)));
          return langs.map((lang) => {
            const seq = LETTER_SEQUENCES[lang] || LETTER_SEQUENCES[DEFAULT_LANGUAGE];
            return (
              <div key={lang}>
                <p className="text-[10px] text-slate-400 mb-0.5">{lang} ({seq.length} letters):</p>
                <div className="flex flex-wrap gap-0.5">
                  {seq.map((letter, i) => (
                    <span
                      key={`${lang}-${i}`}
                      className="text-[9px] w-4 h-4 flex items-center justify-center rounded bg-slate-50 text-slate-500 font-mono"
                      title={`${lang} position ${i + 1}`}
                    >
                      {letter}
                    </span>
                  ))}
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
