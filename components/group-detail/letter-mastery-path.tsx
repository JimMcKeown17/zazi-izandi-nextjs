import type { EaLetterMastery } from "@/lib/ea/types";

function cellStyle(
  mastery_pct: number,
  hasAssessments: boolean,
): string {
  // No baseline assessments exist for this group — every cell is grey
  // regardless of session activity. The dots and the explainer text
  // above the grid carry the meaning instead.
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
  if (count === 0) return <div className="mt-1 h-1.5" aria-hidden="true" />;
  if (count <= 9) {
    return (
      <div className="mt-1 flex h-1.5 items-center justify-center gap-0.5">
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
    <div className="mt-1 text-[9px] font-semibold text-blue-600">
      × {count}
    </div>
  );
}

interface LetterMasteryPathProps {
  letters: EaLetterMastery[];
}

export function LetterMasteryPath({ letters }: LetterMasteryPathProps) {
  // Defensive guard for malformed responses; the Django contract guarantees
  // a full language sequence here (Task 1 fix).
  if (letters.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Letter progress</h2>
        <p className="mt-2 text-xs text-slate-500">
          Letter progress data unavailable.
        </p>
      </section>
    );
  }

  // After Task 1's denominator fix, `children_total` is the count of children
  // with ChildLetterAlignment2026 rows for this group. It's the same value
  // across every letter in the array. children_total === 0 is the reliable
  // "no baseline assessments exist" signal — much cleaner than the old
  // `mastery_pct > 0` heuristic, which could not distinguish "no assessments"
  // from "assessments exist but nobody mastered anything yet".
  const childrenAssessed = letters[0].children_total;
  const hasAssessments = childrenAssessed > 0;
  const anySessions = letters.some((l) => l.sessions_taught > 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Letter progress
        </h2>
        <span className="text-[10px] text-slate-400">
          Pedagogical sequence
        </span>
      </div>

      {!hasAssessments && anySessions ? (
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          Your kids haven&apos;t taken their baseline assessments yet, so we
          can&apos;t show what they knew when you started. The dots below show
          the sessions you&apos;ve taught so far.
        </p>
      ) : null}

      {!hasAssessments && !anySessions ? (
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          Letter progress will appear here once your group starts sessions and
          completes their baseline assessments.
        </p>
      ) : null}

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
        {letters.map((l) => (
          <div
            key={l.letter}
            className={`flex flex-col items-center rounded-md border px-1 py-2 ${cellStyle(
              l.mastery_pct,
              hasAssessments,
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
          Most knew at baseline (&gt;70%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm border border-amber-300 bg-amber-100" />
          Some knew at baseline (30–70%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm border border-red-300 bg-red-100" />
          Few knew at baseline (&lt;30%)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm border border-slate-200 bg-slate-50" />
          Not assessed
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1 w-1 rounded-full bg-blue-500" />
          = 1 session taught
        </span>
      </div>

      {hasAssessments ? (
        <p className="mt-2 text-[10px] italic text-slate-400">
          Percentages reflect the {childrenAssessed}{" "}
          {childrenAssessed === 1 ? "child" : "children"} with completed
          baseline assessments. Children without a baseline assessment are
          not included in the percentages.
        </p>
      ) : null}
    </section>
  );
}
