import { getAssessmentsSummary } from "@/lib/pm/api";
import { AssessmentKPIs } from "@/components/pm/assessments/assessment-kpis";
import { CohortComparison } from "@/components/pm/assessments/cohort-comparison";
import { ScoreDistribution } from "@/components/pm/assessments/score-distribution";
import { SchoolComparison } from "@/components/pm/assessments/school-comparison";
import { LanguageBreakdown } from "@/components/pm/assessments/language-breakdown";
import { GradeFilter } from "@/components/pm/assessments/grade-filter";
import { AlertTriangle } from "lucide-react";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AssessmentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const grade = (params.grade as string) || "Grade 1";

  const { data, isLive } = await getAssessmentsSummary(grade);

  const gradeLabel = grade === "all" ? "All Grades" : grade;

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

      {/* Header + Grade Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Assessments</h1>
          <p className="text-sm text-slate-500">
            Baseline EGRA scores — {gradeLabel} — {data.overview.total_assessed.toLocaleString()} children
          </p>
        </div>
        <GradeFilter
          grades={data.available_grades}
          selected={grade}
        />
      </div>

      <AssessmentKPIs data={data} />

      <CohortComparison data={data.by_cohort} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ScoreDistribution data={data.score_distribution} />
        <LanguageBreakdown data={data.by_language} />
      </div>

      <SchoolComparison data={data.by_school} />
    </div>
  );
}
