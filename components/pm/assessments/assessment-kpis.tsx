import type { AssessmentsSummaryResponse } from "@/lib/pm/types";
import { KPICard } from "@/components/pm/shared/kpi-card";

interface AssessmentKPIsProps {
  data: AssessmentsSummaryResponse;
}

export function AssessmentKPIs({ data }: AssessmentKPIsProps) {
  const { overview } = data;

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
        label="At Benchmark (Gr 1)"
        value={`${overview.pct_at_benchmark_gr1.toFixed(1)}%`}
        subtitle="Grade 1 children at 40+ letters correct"
        borderColor={overview.pct_at_benchmark_gr1 >= 20 ? "border-l-green-500" : "border-l-amber-500"}
      />
      <KPICard
        label="At Benchmark (Gr R)"
        value={`${overview.pct_at_benchmark_grR.toFixed(1)}%`}
        subtitle="Grade R children at 10+ letters correct"
        borderColor={overview.pct_at_benchmark_grR >= 30 ? "border-l-green-500" : "border-l-amber-500"}
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
