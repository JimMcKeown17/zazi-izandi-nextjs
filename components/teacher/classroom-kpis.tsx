import type { ClassroomSummary } from "@/lib/teacher/types";

interface Props {
  summary: ClassroomSummary;
}

function KpiCard({
  label,
  value,
  subtitle,
  borderColor,
}: {
  label: string;
  value: string;
  subtitle?: string;
  borderColor: string;
}) {
  return (
    <div
      className={`rounded-md bg-white p-3 md:p-4 border-l-4 ${borderColor}`}
    >
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl md:text-2xl font-bold leading-none text-slate-900">
        {value}
      </div>
      {subtitle && (
        <div className="mt-1 text-[10px] text-slate-500">{subtitle}</div>
      )}
    </div>
  );
}

export function ClassroomKPIs({ summary }: Props) {
  const { assessed_count, children_count, benchmark_threshold, grade } =
    summary;
  const pendingCount = children_count - assessed_count;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KpiCard
        label="Hitting benchmark"
        value={`${summary.pct_hitting_benchmark}%`}
        subtitle={`${Math.round((summary.pct_hitting_benchmark / 100) * assessed_count)} of ${assessed_count} · ≥${benchmark_threshold} LPM (${grade.replace("Grade ", "G")})`}
        borderColor="border-green-500"
      />
      <KpiCard
        label="Zero-letter learners"
        value={`${summary.pct_zero_letter}%`}
        subtitle={`${Math.round((summary.pct_zero_letter / 100) * assessed_count)} of ${assessed_count}`}
        borderColor="border-red-500"
      />
      <KpiCard
        label="Avg LPM"
        value={`${summary.avg_lpm}`}
        subtitle={summary.assessment_date_label}
        borderColor="border-slate-400"
      />
      <KpiCard
        label="Assessed"
        value={`${assessed_count}/${children_count}`}
        subtitle={
          pendingCount > 0
            ? `${Math.round((assessed_count / children_count) * 100)}% · ${pendingCount} pending`
            : "100%"
        }
        borderColor="border-slate-400"
      />
    </div>
  );
}
