import { getAssessmentsSummary } from "@/lib/pm/api";
import { AssessmentKPIs } from "@/components/pm/assessments/assessment-kpis";
import { CohortComparison } from "@/components/pm/assessments/cohort-comparison";
import { ScoreDistribution } from "@/components/pm/assessments/score-distribution";
import { SchoolComparison } from "@/components/pm/assessments/school-comparison";
import { LanguageGradeBreakdown } from "@/components/pm/assessments/language-grade-breakdown";
import { AlertTriangle } from "lucide-react";

export default async function AssessmentsPage() {
  const { data, isLive } = await getAssessmentsSummary();

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {!isLive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-amber-800">
            <span className="font-semibold">Assessment data unavailable.</span>{" "}
            The assessments API is not responding. Data shown below may be empty.
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-slate-900">Assessments</h1>
        <p className="text-sm text-slate-500">
          Baseline EGRA scores — {data.overview.total_assessed.toLocaleString()} children assessed
        </p>
      </div>

      <AssessmentKPIs data={data} />

      <CohortComparison data={data.by_cohort} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ScoreDistribution data={data.score_distribution} />
        <LanguageGradeBreakdown data={data} />
      </div>

      <SchoolComparison data={data.by_school} />
    </div>
  );
}
