import type { ClassroomSummary } from "@/lib/teacher/types";

function cellStyle(mastery_pct: number, hasAssessments: boolean): string {
  if (!hasAssessments) {
    return "bg-slate-50 border-slate-200 text-slate-600";
  }
  if (mastery_pct >= 70) {
    return "bg-green-100 border-green-300 text-green-900";
  }
  if (mastery_pct >= 30) {
    return "bg-amber-100 border-amber-300 text-amber-900";
  }
  return "bg-red-100 border-red-300 text-red-900";
}

function SessionDots({ count }: { count: number }) {
  if (count === 0) return <div className="mt-1 h-1.5 print:hidden" aria-hidden="true" />;
  if (count <= 9) {
    return (
      <div className="mt-1 flex h-1.5 items-center justify-center gap-0.5 print:hidden">
        {Array.from({ length: count }).map((_, i) => (
          <span
            key={i}
            className="block h-1 w-1 rounded-full bg-blue-500"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }
  return (
    <div className="mt-1 text-[9px] font-semibold text-blue-600 print:hidden">×{count}</div>
  );
}

interface Props {
  summary: ClassroomSummary;
}

export function ClassroomLetterGrid({ summary }: Props) {
  const { letter_grid, assessed_count } = summary;

  if (letter_grid.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Letters My Class Knows
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          Letter progress data unavailable.
        </p>
      </section>
    );
  }

  const hasAssessments = assessed_count > 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Letters My Class Knows
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Average share of children who got each letter correct.
          </p>
        </div>
        <span className="text-[10px] text-slate-400 print:hidden">
          Pedagogical sequence →
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
        {letter_grid.map((l) => (
          <div
            key={l.letter}
            className={`flex flex-col items-center rounded-md border px-1 py-2 ${cellStyle(
              l.mastery_pct,
              hasAssessments
            )}`}
          >
            <div className="text-[10px] leading-none">
              {hasAssessments ? `${l.mastery_pct}%` : " "}
            </div>
            <div className="mt-1 text-lg font-bold leading-none">
              {l.letter}
            </div>
            <SessionDots count={l.sessions_taught} />
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm border border-green-300 bg-green-100" />
          Most knew (&gt;70%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm border border-amber-300 bg-amber-100" />
          Some knew (30–70%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm border border-red-300 bg-red-100" />
          Few knew (&lt;30%)
        </span>
        <span className="flex items-center gap-1 print:hidden">
          <span className="inline-block h-1 w-1 rounded-full bg-blue-500" />
          = 1 session taught
        </span>
      </div>

      {hasAssessments && (
        <p className="mt-2 text-[10px] italic text-slate-400">
          Class averages based on the {assessed_count}{" "}
          {assessed_count === 1 ? "child" : "children"} with completed
          assessments ({summary.assessment_date_label}).
        </p>
      )}
    </section>
  );
}
