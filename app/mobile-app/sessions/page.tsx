import { AlertTriangle } from "lucide-react";

import { EAHeatmap } from "@/components/pm/sessions/ea-heatmap";
import { SessionDistribution } from "@/components/pm/sessions/session-distribution";
import { SessionsSchoolTable } from "@/components/pm/sessions/sessions-school-table";
import { SessionsTrendChart } from "@/components/pm/sessions/sessions-trend-chart";
import { SessionFilters } from "@/components/mobile-app/sessions/session-filters";
import { SessionReviewAlerts } from "@/components/mobile-app/sessions/session-review-alerts";
import { SessionSummaryTiles } from "@/components/mobile-app/sessions/session-summary-tiles";
import {
  getMobileSessionReviewFlags,
  getMobileSessionsActivity,
} from "@/lib/mobile/api";
import { requireMobileSessionsSession } from "@/lib/mobile/auth";
import { hasCapability } from "@/lib/mobile/capabilities";
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
  const [result, reviewFlags] = await Promise.all([
    getMobileSessionsActivity({ days, schoolId }),
    getMobileSessionReviewFlags({ schoolId }),
  ]);

  if (!result.ok) {
    return (
      <div
        data-testid="mobile-sessions-report-error"
        className="mx-auto max-w-7xl space-y-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sessions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Teaching activity uploaded by the Zazi iZandi mobile app.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="font-semibold">Session report unavailable</p>
            <p className="mt-1">{result.message}</p>
            <p className="mt-2 text-xs text-red-600">Status {result.status}</p>
          </div>
        </div>
      </div>
    );
  }

  const { data } = result;
  const selectedSchool = data.school_options.find(
    (school) => school.id === data.applied_filters.school_id
  );

  return (
    <div
      data-testid="mobile-sessions-report-success"
      className="mx-auto max-w-7xl space-y-4"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Mobile app reporting
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Sessions</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
          Teaching activity uploaded by the Zazi iZandi mobile app. School
          groupings use each EA&apos;s <strong>current roster school</strong>, not
          historical session-time attribution.
        </p>
      </div>

      <SessionReviewAlerts result={reviewFlags} />

      <SessionFilters
        days={data.days}
        selectedSchoolId={data.applied_filters.school_id}
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
        exportFilenamePrefix="zazi-ea-activity"
      />

      <SessionsSchoolTable
        schools={toSchoolSummaryDisplayRows(data.school_summary)}
        title="Current-school session summary"
        subtitle="Current roster grouping — not historical attribution"
        schoolColumnLabel="Current school"
        activeEasLabel="EAs with sessions"
      />
    </div>
  );
}
