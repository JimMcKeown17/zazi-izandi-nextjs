import type { AssessmentsSummaryResponse } from "@/lib/pm/types";
import { KPICard } from "@/components/pm/shared/kpi-card";

interface AssessmentKPIsProps {
  data: AssessmentsSummaryResponse;
}

function getBenchmarkLabel(grade: string): string {
  if (grade === "Grade 1" || grade === "Grade 2") return "at 40+ letters correct";
  if (grade === "Grade R") return "at 10+ letters correct";
  return "at grade benchmark";
}

export function AssessmentKPIs({ data }: AssessmentKPIsProps) {
  const { overview, selected_grade } = data;
  const benchmarkLabel = getBenchmarkLabel(selected_grade);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <KPICard
        label="Children Assessed"
        value={overview.total_assessed.toLocaleString()}
        subtitle={`${data.by_language.map((l) => `${l.count.toLocaleString()} ${l.language}`).join(" · ")}`}
        borderColor="border-l-blue-500"
      />
      <KPICard
        label="Avg Letters Correct"
        value={overview.avg_lcpm.toFixed(1)}
        subtitle={`Words: ${overview.avg_wcpm.toFixed(1)} · Non-words: ${overview.avg_nonwords.toFixed(1)}`}
        borderColor="border-l-purple-500"
      />
      <KPICard
        label="Zero Letter Knowledge"
        value={`${overview.pct_zero_letters.toFixed(1)}%`}
        subtitle="children scoring 0 letters correct"
        borderColor={overview.pct_zero_letters > 30 ? "border-l-red-500" : "border-l-amber-500"}
      />
      <KPICard
        label="At Benchmark"
        value={`${overview.pct_at_benchmark.toFixed(1)}%`}
        subtitle={benchmarkLabel}
        borderColor={overview.pct_at_benchmark >= 20 ? "border-l-green-500" : "border-l-amber-500"}
      />
      <KPICard
        label="Completion Rate"
        value={`${overview.completion_rate.toFixed(1)}%`}
        subtitle={`Stop rule: ${overview.stop_rule_rate.toFixed(1)}%`}
        borderColor="border-l-cyan-500"
      />
    </div>
  );
}
