"use client";

import type { LetterAlignmentResponse, ChildLetterAlignment } from "@/lib/pm/types";

interface Props {
  data: LetterAlignmentResponse;
}

type CellStatus = "mastered" | "taught_needed" | "not_reached" | "skipped" | "teaching_known";

function getCellStatus(
  letter: string,
  child: ChildLetterAlignment,
  currentTeachingIndex: number,
  letterIndex: Map<string, number>
): CellStatus {
  const masteredSet = new Set(child.letters_mastered);
  const taughtSet = new Set(child.letters_taught);
  const skippedSet = new Set(child.letters_skipped);
  const teachingKnownSet = new Set(child.teaching_known_letters);
  const idx = letterIndex.get(letter) ?? 999;

  if (skippedSet.has(letter)) return "skipped";
  if (teachingKnownSet.has(letter)) return "teaching_known";
  if (masteredSet.has(letter) && !taughtSet.has(letter)) return "mastered";
  if (taughtSet.has(letter)) return "taught_needed";
  if (idx > currentTeachingIndex) return "not_reached";
  return "not_reached";
}

const CELL_STYLES: Record<CellStatus, string> = {
  mastered: "bg-orange-500 text-white",
  taught_needed: "bg-green-500 text-white",
  not_reached: "bg-slate-100 text-slate-300",
  skipped: "bg-red-500 text-white ring-2 ring-red-300",
  teaching_known: "bg-amber-400 text-white border-2 border-amber-600",
};

export function AlignmentHeatmap({ data }: Props) {
  const { group_summary, children } = data;
  const seq = group_summary.letter_sequence;
  const letterIndex = new Map(seq.map((l, i) => [l, i]));
  const currentIdx = group_summary.current_teaching_index;

  if (children.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-slate-400">
        No children with linked assessments in this group.
      </div>
    );
  }

  // Sort children: flagged first, then by alignment score ascending
  const sortedChildren = [...children].sort((a, b) => {
    const aFlagged = a.flag_skipping_needed ? 0 : a.flag_teaching_known ? 1 : 2;
    const bFlagged = b.flag_skipping_needed ? 0 : b.flag_teaching_known ? 1 : 2;
    if (aFlagged !== bFlagged) return aFlagged - bFlagged;
    return a.alignment_score - b.alignment_score;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs font-semibold text-slate-700">
            Children × Letters — {group_summary.language}
          </p>
          <p className="text-[10px] text-slate-500">
            {children.length} children with assessments.
            Letters in {group_summary.language} teaching order ({seq.length} letters).
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-500 inline-block" /> Mastered (assessment)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500 inline-block" /> Being taught (needed)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-slate-100 inline-block border border-slate-200" /> Not yet reached
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500 ring-1 ring-red-300 inline-block" /> Skipped (needed, not taught)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-400 border border-amber-600 inline-block" /> Teaching known (waste)
        </span>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <table className="border-collapse text-[10px] font-mono">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left text-slate-500 font-medium min-w-[100px] sticky left-0 bg-slate-50/95 z-10">
                Child
              </th>
              <th className="px-2 py-1 text-right text-slate-500 font-medium sticky left-[100px] bg-slate-50/95 z-10 min-w-[40px]">
                Score
              </th>
              {seq.map((letter, i) => (
                <th
                  key={`h-${i}`}
                  className={`px-0.5 py-1 text-center text-slate-500 font-normal ${
                    i === currentIdx ? "border-r-2 border-r-slate-400" : ""
                  }`}
                >
                  {letter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedChildren.map((child) => {
              const rowBg = child.flag_skipping_needed
                ? "bg-red-50/40"
                : child.flag_teaching_known
                  ? "bg-amber-50/40"
                  : "";

              return (
                <tr key={child.participant_id} className={rowBg}>
                  <td className={`px-2 py-0.5 font-medium text-slate-700 truncate max-w-[100px] sticky left-0 z-10 ${rowBg || "bg-white"}`}>
                    <span className="flex items-center gap-1">
                      {child.flag_skipping_needed && <span title="Skipping needed letters">⚠️</span>}
                      ID: {child.participant_id}
                    </span>
                  </td>
                  <td className={`px-2 py-0.5 text-right font-medium sticky left-[100px] z-10 ${rowBg || "bg-white"} ${
                    child.alignment_score >= 70 ? "text-green-600" :
                    child.alignment_score >= 50 ? "text-amber-600" : "text-red-600"
                  }`}>
                    {Math.round(child.alignment_score)}%
                  </td>
                  {seq.map((letter, i) => {
                    const status = getCellStatus(letter, child, currentIdx, letterIndex);
                    return (
                      <td
                        key={`${child.participant_id}-${i}`}
                        className={`px-0.5 py-0.5 text-center ${
                          i === currentIdx ? "border-r-2 border-r-slate-400" : ""
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-sm flex items-center justify-center text-[8px] font-bold mx-auto ${CELL_STYLES[status]}`}
                          title={`${letter}: ${status.replace("_", " ")}`}
                        >
                          {status !== "not_reached" ? letter : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Explanatory text */}
      <div className="mt-3 p-2 bg-white rounded border border-slate-200 text-[10px] text-slate-500">
        <strong>Reading this heatmap:</strong>{" "}
        The vertical line shows the group&apos;s current teaching position.{" "}
        <strong className="text-red-600">Red cells</strong> = letters a child needed but the EA moved
        past without teaching.{" "}
        <strong className="text-amber-600">Amber cells</strong> = letters the child already knew but
        are still being taught to the group.
      </div>
    </div>
  );
}
