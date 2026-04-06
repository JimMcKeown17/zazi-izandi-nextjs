import { getGroups2026 } from "@/lib/pm/api";
import { parseCohort, filterGroupsByCohort, getCohortLabel } from "@/lib/pm/cohorts";
import { FlagSummaryCards } from "@/components/pm/quality-flags/flag-summary-cards";
import { FlaggedItemsTable } from "@/components/pm/quality-flags/flagged-items-table";
import { AlertTriangle } from "lucide-react";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function QualityFlagsPage({ searchParams }: Props) {
  const params = await searchParams;
  const cohort = parseCohort(params.cohort as string | undefined);
  const cohortLabel = getCohortLabel(cohort);

  const { data, isLive } = await getGroups2026();

  const filteredGroups = filterGroupsByCohort(data.groups, cohort);

  const totalFlags = filteredGroups.reduce((sum, g) => {
    return (
      sum +
      [g.flags.same_letter_group, g.flags.moving_too_fast, g.flags.ghost_group, g.flags.stagnation, g.flags.curriculum_gaps].filter(Boolean).length
    );
  }, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {!isLive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-amber-800">
            <span className="font-semibold">Group data unavailable.</span>{" "}
            The groups API is not responding. Flag data below may be empty.
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Quality Flags</h1>
        <p className="text-sm text-slate-500">
          {cohortLabel} — {totalFlags} active flags across {filteredGroups.length} groups
        </p>
      </div>

      {/* Flag summary cards */}
      <FlagSummaryCards groups={filteredGroups} />

      {/* Flagged items table */}
      <FlaggedItemsTable groups={filteredGroups} />
    </div>
  );
}
