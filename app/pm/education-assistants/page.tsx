import { getEAPerformance } from "@/lib/pm/api";
import { parseCohort, getCohortLabel } from "@/lib/pm/cohorts";
import { KPICard } from "@/components/pm/shared/kpi-card";
import { EAScatterChart } from "@/components/pm/education-assistants/ea-scatter-chart";
import { AlertTriangle } from "lucide-react";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EducationAssistantsPage({
  searchParams,
}: Props) {
  const params = await searchParams;
  const cohort = parseCohort(params.cohort as string | undefined);
  const cohortLabel = getCohortLabel(cohort);

  const { data, isLive } = await getEAPerformance(cohort);
  const { summary } = data;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {!isLive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-amber-800">
            <span className="font-semibold">
              EA performance data unavailable.
            </span>{" "}
            The EA performance API is not responding. Data shown below may be
            empty.
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Education Assistants
        </h1>
        <p className="text-sm text-slate-500">
          {cohortLabel} — {summary.total_eas} EAs with letters groups
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="EAs Plotted"
          value={summary.total_eas}
          subtitle="with letters groups"
          borderColor="border-l-primary"
        />
        <KPICard
          label="Top Right"
          value={
            summary.total_eas > 0
              ? `${Math.round(
                  (summary.quadrant_counts.top_right / summary.total_eas) * 100
                )}%`
              : "—"
          }
          subtitle={`${summary.quadrant_counts.top_right} of ${summary.total_eas} high quality + dosage`}
          borderColor="border-l-green-500"
        />
        <KPICard
          label="Avg Sessions/Day"
          value={summary.avg_sessions_per_programme_day}
          subtitle="programme average"
          borderColor="border-l-amber-500"
        />
        <KPICard
          label="Avg Alignment"
          value={`${summary.avg_alignment_score}%`}
          subtitle="letters groups only"
          borderColor="border-l-violet-500"
        />
      </div>

      {/* Scatter chart + detail panel */}
      <EAScatterChart eas={data.eas} />
    </div>
  );
}
