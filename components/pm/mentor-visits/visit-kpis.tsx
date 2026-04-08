import type { MentorVisitsSummaryResponse } from "@/lib/pm/types";
import { KPICard } from "@/components/pm/shared/kpi-card";

interface VisitKPIsProps {
  data: MentorVisitsSummaryResponse;
}

export function VisitKPIs({ data }: VisitKPIsProps) {
  const { overview, coverage } = data;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KPICard label="Total Visits" value={overview.total_visits} borderColor="border-l-blue-500" />
      <KPICard label="Mentors Active" value={overview.unique_mentors} borderColor="border-l-purple-500" />
      <KPICard
        label="Schools Visited"
        value={overview.schools_visited}
        subtitle={`of ${coverage.total_schools} total`}
        borderColor="border-l-cyan-500"
      />
      <KPICard label="EAs Observed" value={overview.eas_observed} borderColor="border-l-green-500" />
    </div>
  );
}
