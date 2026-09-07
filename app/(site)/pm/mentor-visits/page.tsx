import { getMentorVisitsSummary } from "@/lib/pm/api";
import { VisitKPIs } from "@/components/pm/mentor-visits/visit-kpis";
import { VisitsOverTime } from "@/components/pm/mentor-visits/visits-over-time";
import { ComplianceChecks } from "@/components/pm/mentor-visits/compliance-checks";
import { QualityRatings } from "@/components/pm/mentor-visits/quality-ratings";
import { MentorSummaryTable } from "@/components/pm/mentor-visits/mentor-summary-table";
import { CoverageGaps } from "@/components/pm/mentor-visits/coverage-gaps";
import { AlertTriangle } from "lucide-react";

export default async function MentorVisitsPage() {
  const { data, isLive } = await getMentorVisitsSummary();

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {!isLive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-amber-800">
            <span className="font-semibold">Mentor visit data unavailable.</span>{" "}
            The mentor visits API is not responding. Data shown below may be empty.
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-slate-900">Mentor Visits</h1>
        <p className="text-sm text-slate-500">
          {data.overview.total_visits} visits by {data.overview.unique_mentors} mentors across {data.overview.schools_visited} schools
        </p>
      </div>

      <VisitKPIs data={data} />
      <VisitsOverTime data={data.visits_over_time} />
      <QualityRatings ratings={data.quality_ratings} />
      <MentorSummaryTable data={data.by_mentor} />
      <ComplianceChecks compliance={data.compliance} flaggedEAs={data.flagged_eas} />
      <CoverageGaps data={data.coverage} />
    </div>
  );
}
