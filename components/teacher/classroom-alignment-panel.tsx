import type { ClassroomSummary } from "@/lib/teacher/types";

interface Props {
  summary: ClassroomSummary;
}

function scoreBand(score: number): {
  bg: string;
  border: string;
  text: string;
  label: string;
} {
  if (score >= 80)
    return {
      bg: "bg-green-50",
      border: "border-green-500",
      text: "text-green-800",
      label: "On track",
    };
  if (score >= 60)
    return {
      bg: "bg-amber-50",
      border: "border-amber-500",
      text: "text-amber-800",
      label: "Mostly on track",
    };
  return {
    bg: "bg-red-50",
    border: "border-red-500",
    text: "text-red-800",
    label: "Needs attention",
  };
}

export function ClassroomAlignmentPanel({ summary }: Props) {
  const { alignment } = summary;

  if (!alignment || (alignment.letters_on_target === 0 && alignment.letters_skipped === 0 && alignment.letters_teaching_known === 0)) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Teaching alignment
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          Alignment data is not yet available for this classroom.
        </p>
      </section>
    );
  }

  const band = scoreBand(alignment.score);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">
        Teaching alignment
      </h2>
      <p className="mt-1 mb-4 text-xs text-slate-500">
        Whether your EA is teaching the right letters in the right order —
        based on what each child knew at their most recent assessment.
      </p>

      <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
        {/* Big score */}
        <div
          className={`${band.bg} border-l-4 ${band.border} rounded-md px-4 py-3 text-center min-w-[90px]`}
        >
          <div className={`text-[10px] uppercase tracking-wide ${band.text}`}>
            Alignment
          </div>
          <div className={`text-3xl font-extrabold leading-none ${band.text}`}>
            {alignment.score}%
          </div>
          <div className={`mt-1 text-[10px] ${band.text}`}>{band.label}</div>
        </div>

        {/* Breakdown */}
        <div className="text-xs space-y-1">
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-700">✓ Letters taught correctly</span>
            <span className="font-semibold text-green-700">
              {alignment.letters_on_target}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-700">⚠ Letters skipped (needed)</span>
            <span className="font-semibold text-red-700">
              {alignment.letters_skipped}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-700">
              ⚠ Letters taught children already knew
            </span>
            <span className="font-semibold text-red-700">
              {alignment.letters_teaching_known}
            </span>
          </div>
        </div>
      </div>

      {/* Conditional flag callout */}
      {(alignment.flag_skipping_needed || alignment.flag_teaching_known) && (
        <div className="mt-4 rounded-md border-l-3 border-red-400 bg-red-50 px-3 py-2 text-xs text-red-800">
          <strong>Flag:</strong>{" "}
          {alignment.flag_skipping_needed &&
            `${alignment.letters_skipped} needed letter${alignment.letters_skipped !== 1 ? "s were" : " was"} skipped in recent sessions.`}{" "}
          {alignment.flag_teaching_known &&
            `${alignment.letters_teaching_known} letter${alignment.letters_teaching_known !== 1 ? "s" : ""} taught that children already knew.`}{" "}
          Worth a conversation with your EA.
        </div>
      )}
    </section>
  );
}
