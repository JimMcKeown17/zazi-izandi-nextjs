"use client";

import type { ClassroomSummary, ClassroomChild } from "@/lib/teacher/types";
import { getLpmBand, LPM_BAND_COLORS } from "@/lib/teacher/constants";

interface Props {
  summary: ClassroomSummary;
}

function ChildBar({
  child,
  maxLpm,
  benchmark,
}: {
  child: ClassroomChild;
  maxLpm: number;
  benchmark: number;
}) {
  const lpm = child.letters_total_correct ?? 0;
  const band = getLpmBand(lpm, benchmark);
  const color = LPM_BAND_COLORS[band];
  const barPct = maxLpm > 0 ? (lpm / maxLpm) * 100 : 0;
  const benchmarkPct = maxLpm > 0 ? (benchmark / maxLpm) * 100 : 0;

  return (
    <>
      {/* Desktop: name | bar | score in a row */}
      <div className="hidden sm:grid grid-cols-[100px_1fr_36px] gap-2 items-center py-1 text-xs">
        <div className="text-right text-slate-700 truncate">{child.name}</div>
        <div className="relative h-2.5 rounded bg-slate-100">
          <div
            className="absolute left-0 top-0 h-full rounded"
            style={{ width: `${barPct}%`, backgroundColor: color.fill }}
          />
          <div
            className="absolute top-[-4px] bottom-[-4px] w-px bg-slate-500"
            style={{ left: `${Math.min(benchmarkPct, 100)}%` }}
          />
        </div>
        <div className="font-semibold text-right">{lpm}</div>
      </div>

      {/* Mobile: name + score above, bar below */}
      <div className="sm:hidden py-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-700 truncate max-w-[65%]">
            {child.name}
          </span>
          <span className="font-semibold">{lpm}</span>
        </div>
        <div className="relative h-2 rounded bg-slate-100">
          <div
            className="absolute left-0 top-0 h-full rounded"
            style={{ width: `${barPct}%`, backgroundColor: color.fill }}
          />
          <div
            className="absolute top-[-3px] bottom-[-3px] w-px bg-slate-500"
            style={{ left: `${Math.min(benchmarkPct, 100)}%` }}
          />
        </div>
      </div>
    </>
  );
}

export function ClassroomChildrenChart({ summary }: Props) {
  const { children, benchmark_threshold, assessed_count } = summary;

  const assessed = children
    .filter((c) => c.letters_total_correct !== null)
    .sort(
      (a, b) => (b.letters_total_correct ?? 0) - (a.letters_total_correct ?? 0)
    );

  const unassessedCount = children.length - assessed.length;
  const maxLpm = Math.max(
    benchmark_threshold,
    ...assessed.map((c) => c.letters_total_correct ?? 0)
  );

  if (assessed.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Children — letters per minute
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          No assessment data available yet.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Children — letters per minute
        </h2>
        <span className="text-[10px] text-slate-400">▼ sorted by score</span>
      </div>

      <div>
        {assessed.map((child) => (
          <ChildBar
            key={child.participant_id}
            child={child}
            maxLpm={maxLpm}
            benchmark={benchmark_threshold}
          />
        ))}
      </div>

      {unassessedCount > 0 && (
        <p className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center">
          + {unassessedCount} not yet assessed
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="font-semibold">▐</span> Benchmark at{" "}
          {benchmark_threshold} LPM
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: LPM_BAND_COLORS.met.fill }}
          />
          Met
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: LPM_BAND_COLORS.approaching.fill }}
          />
          Approaching
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: LPM_BAND_COLORS.low.fill }}
          />
          0–9
        </span>
      </div>
    </section>
  );
}
