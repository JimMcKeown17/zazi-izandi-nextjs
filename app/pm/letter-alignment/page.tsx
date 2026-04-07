import { getGroups2026 } from "@/lib/pm/api";
import { parseCohort, filterGroupsByCohort, getCohortLabel } from "@/lib/pm/cohorts";
import { AlertTriangle, Info } from "lucide-react";
import { AlignmentKpis } from "@/components/pm/letter-alignment/alignment-kpis";
import { AlignmentGroupTable } from "@/components/pm/letter-alignment/alignment-group-table";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LetterAlignmentPage({ searchParams }: Props) {
  const params = await searchParams;
  const cohort = parseCohort(params.cohort as string | undefined);
  const cohortLabel = getCohortLabel(cohort);

  const { data, isLive } = await getGroups2026();
  const filteredGroups = filterGroupsByCohort(data.groups, cohort);

  // Only letter-phase groups with assessment data
  const letterGroups = filteredGroups.filter((g) => g.phase === "letters");
  const assessedGroups = letterGroups.filter((g) => (g.children_assessed ?? 0) > 0);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {!isLive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-amber-800">
            <span className="font-semibold">Group data unavailable.</span>{" "}
            The groups API is not responding. Alignment data below may be empty.
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Letter Alignment</h1>
        <p className="text-sm text-slate-500">
          {cohortLabel} — Are EAs teaching the right letters for each child?
        </p>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-3 text-sm">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-blue-800">
          <span className="font-semibold">How alignment works:</span>{" "}
          Each child&apos;s baseline assessment tells us which letters they already know.
          We compare that to what their EA is teaching in sessions.{" "}
          <span className="font-medium text-red-700">Red (skipped)</span> = letters the child needs but
          the EA moved past.{" "}
          <span className="font-medium text-amber-700">Amber (teaching known)</span> = letters the child
          already mastered but are still being taught. Click a group row to see the per-child heatmap.
        </div>
      </div>

      {/* KPI cards */}
      <AlignmentKpis
        letterGroups={letterGroups}
        assessedGroups={assessedGroups}
      />

      {/* Group table with expandable child heatmap */}
      <AlignmentGroupTable groups={letterGroups} />
    </div>
  );
}
