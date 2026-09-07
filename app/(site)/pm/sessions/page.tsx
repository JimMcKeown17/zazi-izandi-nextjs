import { getSessionsActivity } from "@/lib/pm/api";
import { parseCohort, getCohortLabel } from "@/lib/pm/cohorts";
import { SessionsTrendChart } from "@/components/pm/sessions/sessions-trend-chart";
import { EAHeatmap } from "@/components/pm/sessions/ea-heatmap";
import { SessionDistribution } from "@/components/pm/sessions/session-distribution";
import { SessionsSchoolTable } from "@/components/pm/sessions/sessions-school-table";
import { AlertTriangle } from "lucide-react";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SessionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const cohort = parseCohort(params.cohort as string | undefined);
  const cohortLabel = getCohortLabel(cohort);

  const { data, isLive } = await getSessionsActivity(30, cohort);

  const totalSessions = data.daily_trend.reduce((sum, d) => sum + d.total, 0);
  const totalEAs = data.ea_heatmap.eas.length;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {!isLive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-amber-800">
            <span className="font-semibold">Session data unavailable.</span>{" "}
            The sessions activity API is not responding. Data shown below may be empty.
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Sessions</h1>
        <p className="text-sm text-slate-500">
          {cohortLabel} — {totalSessions.toLocaleString()} sessions from {totalEAs} EAs (last 30 days)
        </p>
      </div>

      {/* Row 1: Trend chart + distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <SessionsTrendChart data={data.daily_trend} />
        </div>
        <div className="lg:col-span-2">
          <SessionDistribution data={data.distribution} />
        </div>
      </div>

      {/* Row 2: EA Heatmap */}
      <EAHeatmap dates={data.ea_heatmap.dates} eas={data.ea_heatmap.eas} />

      {/* Row 3: School summary table */}
      <SessionsSchoolTable schools={data.school_summary} />
    </div>
  );
}
