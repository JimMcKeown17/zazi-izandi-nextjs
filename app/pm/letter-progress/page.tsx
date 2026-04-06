import { getGroups2026 } from "@/lib/pm/api";
import { parseCohort, filterGroupsByCohort, getCohortLabel } from "@/lib/pm/cohorts";
import { ProgressOverview } from "@/components/pm/letter-progress/progress-overview";
import { GradeProgressChart } from "@/components/pm/letter-progress/grade-progress-chart";
import { GroupDetailTable } from "@/components/pm/letter-progress/group-detail-table";
import { AlertTriangle } from "lucide-react";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LetterProgressPage({ searchParams }: Props) {
  const params = await searchParams;
  const cohort = parseCohort(params.cohort as string | undefined);
  const cohortLabel = getCohortLabel(cohort);

  const { data, isLive } = await getGroups2026();

  const filteredGroups = filterGroupsByCohort(data.groups, cohort);

  const letterCount = filteredGroups.filter((g) => g.phase === "letters").length;
  const blendingCount = filteredGroups.filter((g) => g.phase === "blending").length;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {!isLive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-amber-800">
            <span className="font-semibold">Group data unavailable.</span>{" "}
            The groups API is not responding. Content below may be empty.
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Letter Progress</h1>
        <p className="text-sm text-slate-500">
          {cohortLabel} — {filteredGroups.length} groups ({letterCount} letters, {blendingCount} blending)
        </p>
      </div>

      {/* Row 1: Progress overview + Grade chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ProgressOverview groups={filteredGroups} />
        </div>
        <div className="lg:col-span-2">
          <GradeProgressChart groups={filteredGroups} />
        </div>
      </div>

      {/* Row 2: Group detail table */}
      <GroupDetailTable groups={filteredGroups} />
    </div>
  );
}
