import { SyncIncidentAlerts } from "@/components/mobile-app/sync-incidents/sync-incident-alerts";
import { SyncIncidentFilters } from "@/components/mobile-app/sync-incidents/sync-incident-filters";
import { SyncIncidentPager } from "@/components/mobile-app/sync-incidents/sync-incident-pager";
import { UserHealthHeader } from "@/components/mobile-app/user-health/user-health-page-content";
import { getMobileSyncIncidents } from "@/lib/mobile/api";
import { requireMobileReportingSession } from "@/lib/mobile/auth";
import { getSyncIncidentPagerKey } from "@/lib/mobile/sync-incidents/pager-state";
import { resolveSyncIncidentPageRequest } from "@/lib/mobile/sync-incidents/page-access";
import type { MobileSyncIncidentKind } from "@/lib/mobile/sync-incidents/types";
import {
  firstUserHealthParam,
  parseUserHealthDays,
} from "@/lib/mobile/user-health/page-state";

interface SyncDiagnosticsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const INCIDENT_KINDS = [
  "support_root",
  "integrity_aggregate",
  "queue_overflow",
] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DESCRIPTOR_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;

function parseIncidentKind(
  value: string | undefined
): MobileSyncIncidentKind | null | undefined {
  if (!value) return null;
  return (INCIDENT_KINDS as readonly string[]).includes(value)
    ? (value as MobileSyncIncidentKind)
    : undefined;
}

export default async function UserHealthSyncDiagnosticsPage({
  searchParams,
}: SyncDiagnosticsPageProps) {
  const params = await searchParams;
  const days = parseUserHealthDays(firstUserHealthParam(params.days));
  const rawSchoolId = firstUserHealthParam(params.school_id) || null;
  const schoolIdIsValid = rawSchoolId === null || UUID_PATTERN.test(rawSchoolId);
  const schoolId = schoolIdIsValid ? rawSchoolId : null;
  const incidentKind = parseIncidentKind(firstUserHealthParam(params.incident_kind));
  const rawDescriptorKey = firstUserHealthParam(params.descriptor_key) || null;
  const descriptorKeyIsValid =
    rawDescriptorKey === null || DESCRIPTOR_PATTERN.test(rawDescriptorKey);
  const descriptorKey = descriptorKeyIsValid ? rawDescriptorKey : null;
  const invalidFilters =
    !schoolIdIsValid || incidentKind === undefined || !descriptorKeyIsValid;

  const session = await requireMobileReportingSession();
  const incidentResult = await resolveSyncIncidentPageRequest(
    session.role,
    invalidFilters,
    () =>
      getMobileSyncIncidents({
        days,
        schoolId,
        incidentKind,
        descriptorKey,
        limit: 50,
        cursor: null,
      })
  );

  const pager =
    incidentResult.ok && incidentResult.data.next_cursor !== null ? (
      <SyncIncidentPager
        key={getSyncIncidentPagerKey(
          {
            days,
            schoolId,
            incidentKind: incidentKind ?? null,
            descriptorKey,
            limit: 50,
          },
          incidentResult.data
        )}
        initialData={incidentResult.data}
        filters={{
          days,
          schoolId,
          incidentKind: incidentKind ?? null,
          descriptorKey,
          limit: 50,
        }}
      />
    ) : null;

  return (
    <div className="mx-auto max-w-[96rem] space-y-4">
      <UserHealthHeader active="sync-diagnostics" />
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        This forensic view covers the last {days} SAST calendar days
        {schoolId ? " for the selected school" : " across all schools"}. It is
        intentionally separate from adoption and recent-activity metrics.
      </div>
      <SyncIncidentAlerts
        result={incidentResult}
        filtersSlot={
          <SyncIncidentFilters
            key={`${incidentKind ?? ""}|${descriptorKey ?? ""}`}
            incidentKind={incidentKind ?? null}
            descriptorKey={descriptorKey}
          />
        }
        pagerSlot={pager}
      />
    </div>
  );
}
