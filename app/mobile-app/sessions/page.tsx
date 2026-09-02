import { EAHeatmap } from "@/components/pm/sessions/ea-heatmap";
import { SessionDistribution } from "@/components/pm/sessions/session-distribution";
import { SessionsSchoolTable } from "@/components/pm/sessions/sessions-school-table";
import { SessionsTrendChart } from "@/components/pm/sessions/sessions-trend-chart";
import { SessionFilters } from "@/components/mobile-app/sessions/session-filters";
import { SessionSummaryTiles } from "@/components/mobile-app/sessions/session-summary-tiles";
import { SessionsPageContent } from "@/components/mobile-app/sessions/sessions-page-content";
import { SessionExportsPanel } from "@/components/mobile-app/sessions/session-exports-panel";
import {
  getMobileSessionReviewFlags,
  getMobileSessionsActivity,
} from "@/lib/mobile/api";
import { requireMobileSessionsSession } from "@/lib/mobile/auth";
import { hasCapability } from "@/lib/mobile/capabilities";
import { getSastToday } from "@/lib/mobile/session-exports/date-range";
import {
  toHeatmapDisplayRows,
  toSchoolSummaryDisplayRows,
} from "@/lib/mobile/presentation";

interface SessionsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseDays(value: string | undefined): number {
  if (!value) return 30;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 90 ? parsed : 30;
}

export default async function MobileSessionsPage({
  searchParams,
}: SessionsPageProps) {
  const [params, session] = await Promise.all([
    searchParams,
    requireMobileSessionsSession(),
  ]);
  const days = parseDays(firstValue(params.days));
  const schoolId = firstValue(params.school_id) || null;
  const rawSchoolType = firstValue(params.school_type);
  const schoolType =
    rawSchoolType === "ecd" || rawSchoolType === "primary" ? rawSchoolType : null;
  const [result, reviewFlags] = await Promise.all([
    getMobileSessionsActivity({ days, schoolId, schoolType }),
    getMobileSessionReviewFlags({ schoolId, schoolType }),
  ]);
  const exportPanel = hasCapability(session.role, "mobile.csv.export") ? (
    <SessionExportsPanel
      today={getSastToday()}
      schoolId={schoolId}
      schoolType={schoolType}
    />
  ) : null;

  if (!result.ok) {
    return (
      <SessionsPageContent
        result={result}
        reviewFlags={reviewFlags}
        exportPanel={exportPanel}
      />
    );
  }

  const { data } = result;
  const selectedSchool = data.school_options.find(
    (school) => school.id === data.applied_filters.school_id
  );

  return (
    <SessionsPageContent
      result={result}
      reviewFlags={reviewFlags}
      exportPanel={exportPanel}
    >
      <SessionFilters
        days={data.days}
        selectedSchoolId={data.applied_filters.school_id}
        selectedSchoolType={data.applied_filters.school_type ?? null}
        schoolOptions={data.school_options}
      />

      {selectedSchool ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Filtered by current school: <strong>{selectedSchool.name}</strong>
        </div>
      ) : null}

      <SessionSummaryTiles data={data} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SessionsTrendChart
            data={data.daily_trend}
            subtitle="Daily sessions by current roster-school type. Other includes unattributed or unrecognized types."
            otherLabel="Other / unattributed"
          />
        </div>
        <div className="lg:col-span-2">
          <SessionDistribution data={data.distribution} />
        </div>
      </div>

      <EAHeatmap
        dates={data.ea_heatmap.dates}
        eas={toHeatmapDisplayRows(data.ea_heatmap.eas)}
        schoolColumnLabel="Current school"
        subtitle="Latest weekdays; Total covers the full window and school is the current roster assignment"
        profileLinkEnabled={hasCapability(
          session.role,
          "mobile.user_health.read"
        )}
      />

      <SessionsSchoolTable
        schools={toSchoolSummaryDisplayRows(data.school_summary)}
        title="Current-school session summary"
        subtitle="Current roster grouping — not historical attribution"
        schoolColumnLabel="Current school"
        activeEasLabel="EAs with sessions"
      />
    </SessionsPageContent>
  );
}
