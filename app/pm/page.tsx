import { getProgrammeOverview, getSchoolPerformanceRows } from "@/lib/pm/api";
import { parseCohort, filterSchoolsByCohort } from "@/lib/pm/cohorts";
import type { ProgrammeKPIs } from "@/lib/pm/types";
import type { SchoolPerformanceRow } from "@/lib/pm/types";
import { ProgrammeContextBar } from "@/components/pm/layout/programme-context-bar";
import { OverviewKPIs } from "@/components/pm/overview/overview-kpis";
import { SessionsChart } from "@/components/pm/overview/sessions-chart";
import { DosageDistribution } from "@/components/pm/overview/dosage-distribution";
import { SchoolTable } from "@/components/pm/overview/school-table";
import { AlertTriangle } from "lucide-react";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function recomputeKPIs(
  baseKPIs: ProgrammeKPIs,
  filteredSchools: SchoolPerformanceRow[]
): ProgrammeKPIs {
  const totalSchools = filteredSchools.length;
  const totalSchoolsPrimary = filteredSchools.filter(
    (s) => s.school_type !== "ECD" && s.school_type !== "ecd"
  ).length;
  const totalSchoolsEcd = filteredSchools.filter(
    (s) => s.school_type === "ECD" || s.school_type === "ecd"
  ).length;
  const totalEas = filteredSchools.reduce((sum, s) => sum + s.ea_count, 0);
  const totalChildren = filteredSchools.reduce((sum, s) => sum + s.children_count, 0);
  const totalSessionsWeek = filteredSchools.reduce((sum, s) => sum + s.sessions_this_week, 0);
  const totalSessionsMonth = filteredSchools.reduce((sum, s) => sum + s.sessions_this_month, 0);
  const totalSessionsAllTime = filteredSchools.reduce((sum, s) => sum + s.total_sessions, 0);
  const activeFlags = filteredSchools.reduce((sum, s) => sum + s.flags_count, 0);

  const totalGroups = filteredSchools.reduce((sum, s) => sum + s.groups_count, 0);
  const weightedDosage =
    totalGroups > 0
      ? filteredSchools.reduce(
          (sum, s) => sum + s.avg_sessions_per_group_per_week * s.groups_count,
          0
        ) / totalGroups
      : 0;

  return {
    ...baseKPIs,
    total_schools: totalSchools,
    total_schools_primary: totalSchoolsPrimary,
    total_schools_ecd: totalSchoolsEcd,
    total_eas: totalEas,
    total_children: totalChildren,
    total_sessions_this_week: totalSessionsWeek,
    total_sessions_this_month: totalSessionsMonth,
    total_sessions_all_time: totalSessionsAllTime,
    active_flags: activeFlags,
    weighted_dosage: Math.round(weightedDosage * 10) / 10,
  };
}

export default async function PMOverviewPage({ searchParams }: Props) {
  const params = await searchParams;
  const cohort = parseCohort(params.cohort as string | undefined);

  const [overviewResult, schoolsResult] = await Promise.all([
    getProgrammeOverview(cohort),
    getSchoolPerformanceRows(),
  ]);

  const overview = overviewResult.data;
  const allSchools = schoolsResult.data;
  const filteredSchools = filterSchoolsByCohort(allSchools, cohort);
  const filteredKPIs = recomputeKPIs(overview.kpis, filteredSchools);
  const filteredOverview = { ...overview, kpis: filteredKPIs };

  // Determine data source status
  const overviewIsLive = overviewResult.isLive;
  const schoolsIsLive = schoolsResult.isLive;
  const hasMockData = !overviewIsLive || !schoolsIsLive;

  const { data_health } = overview;
  const lastSyncDate = data_health.last_sync
    ? new Date(data_health.last_sync).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Mock data warning banner */}
      {hasMockData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-amber-800">
            <span className="font-semibold">Some data is unavailable.</span>{" "}
            {!overviewIsLive && !schoolsIsLive
              ? "The API is unavailable — data shown below may be empty or incomplete."
              : !overviewIsLive
                ? "Programme overview API unavailable — KPI targets, health signal, and charts may be empty. School table data is live."
                : "School data API unavailable — school table may be empty."}
          </div>
        </div>
      )}

      {/* Layer 0: Programme context bar */}
      <ProgrammeContextBar data={overview} />

      {/* Layer 1: KPI cards */}
      <OverviewKPIs data={filteredOverview} />

      {/* Layer 2: Charts — 5:3 ratio on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <SessionsChart data={overview.sessions_time_series} />
        </div>
        <div className="lg:col-span-2">
          <DosageDistribution data={overview.dosage_distribution} />
        </div>
      </div>

      {/* Layer 3: School performance table */}
      <SchoolTable schools={filteredSchools} cohort={cohort} />

      {/* Layer 4: Data health panel */}
      <details className="bg-white rounded-lg shadow-sm text-xs">
        <summary className="px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none list-none flex items-center justify-between">
          <span>Data Health</span>
          <span className="text-slate-400 font-normal">▸</span>
        </summary>
        <div className="px-4 pb-4 pt-2 border-t border-slate-100">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-slate-400 uppercase tracking-wide mb-0.5">Freshness</p>
              <p className="text-slate-800 font-semibold">
                {data_health.freshness_hours < 1
                  ? "< 1h ago"
                  : data_health.freshness_hours < 24
                  ? `${Math.round(data_health.freshness_hours)}h ago`
                  : `${Math.round(data_health.freshness_hours / 24)}d ago`}
              </p>
            </div>
            <div>
              <p className="text-slate-400 uppercase tracking-wide mb-0.5">Last Sync</p>
              <p className="text-slate-800 font-semibold">{lastSyncDate}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase tracking-wide mb-0.5">Join Match Rate</p>
              <p className="text-slate-800 font-semibold">
                {Math.round(data_health.join_match_rate * 100)}%
              </p>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
