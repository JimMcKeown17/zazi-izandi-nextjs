import { HowToReadPanel } from "@/components/mobile-app/user-health/how-to-read-panel";
import { SyncIncidentFilters } from "@/components/mobile-app/sync-incidents/sync-incident-filters";
import { SyncIncidentPager } from "@/components/mobile-app/sync-incidents/sync-incident-pager";
import { UserHealthBoard } from "@/components/mobile-app/user-health/user-health-board";
import { UserHealthFilters } from "@/components/mobile-app/user-health/user-health-filters";
import { UserHealthPageContent } from "@/components/mobile-app/user-health/user-health-page-content";
import { UserHealthSummary } from "@/components/mobile-app/user-health/user-health-summary";
import {
  getMobileSyncIncidents,
  getMobileUserHealth,
} from "@/lib/mobile/api";
import type {
  MobileSyncIncidentKind,
  MobileSyncIncidentsResult,
} from "@/lib/mobile/sync-incidents/types";
import {
  buildDeviceVersionBreakdown,
  splitVersionBreakdown,
} from "@/lib/mobile/user-health/devices";
import type { UserHealthPredicate } from "@/lib/mobile/user-health/presentation";
import type { MobileUserHealthRow } from "@/lib/mobile/user-health/types";
import {
  hasPartBCapability,
  type WaveSelection,
} from "@/lib/mobile/user-health/wave";

interface UserHealthPageProps {
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

const PREDICATES = [
  "all",
  "has_blockers",
  "active",
  "activated",
  "quiet",
  "reached",
  "not_started",
] as const;
const COHORTS = ["all", "seeded", "self_setup", "unknown"] as const;
const INCIDENT_KINDS = [
  "support_root",
  "integrity_aggregate",
  "queue_overflow",
] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DESCRIPTOR_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;

function parsePredicate(
  value: string | undefined,
  lifetimeEvidence: boolean
): UserHealthPredicate {
  if (!lifetimeEvidence && (value === "activated" || value === "quiet")) {
    return "all";
  }
  return (PREDICATES as readonly string[]).includes(value ?? "")
    ? (value as UserHealthPredicate)
    : "all";
}

function parseCohort(
  value: string | undefined
): MobileUserHealthRow["data"]["expectation"] | "all" {
  return (COHORTS as readonly string[]).includes(value ?? "")
    ? (value as (typeof COHORTS)[number])
    : "all";
}

function parseWave(
  value: string | undefined,
  waveOptionIds: readonly string[]
): WaveSelection {
  if (!value) return "all";
  if (value === "none") return "none";
  return waveOptionIds.includes(value) ? value : "all";
}

function parseIncidentKind(
  value: string | undefined
): MobileSyncIncidentKind | null | undefined {
  if (!value) return null;
  return (INCIDENT_KINDS as readonly string[]).includes(value)
    ? (value as MobileSyncIncidentKind)
    : undefined;
}

const GENERATED_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function MobileUserHealthPage({
  searchParams,
}: UserHealthPageProps) {
  const params = await searchParams;
  const days = parseDays(firstValue(params.days));
  const rawSchoolId = firstValue(params.school_id) || null;
  const schoolIdIsValid = rawSchoolId === null || UUID_PATTERN.test(rawSchoolId);
  const schoolId = schoolIdIsValid ? rawSchoolId : null;
  const incidentKind = parseIncidentKind(firstValue(params.incident_kind));
  const rawDescriptorKey = firstValue(params.descriptor_key) || null;
  const descriptorKeyIsValid =
    rawDescriptorKey === null || DESCRIPTOR_PATTERN.test(rawDescriptorKey);
  const descriptorKey = descriptorKeyIsValid ? rawDescriptorKey : null;
  const invalidIncidentFilters =
    !schoolIdIsValid || incidentKind === undefined || !descriptorKeyIsValid;

  const initialQuery = firstValue(params.q) ?? "";
  const initialPredicateValue = firstValue(params.state);
  const initialWaveValue = firstValue(params.wave);
  const initialCohort = parseCohort(firstValue(params.cohort));

  const invalidFiltersResult: MobileSyncIncidentsResult = {
    ok: false,
    status: 400,
    kind: "invalid_filters",
    message: "The selected sync-incident filters are invalid.",
  };
  const [healthResult, incidentResult] = await Promise.all([
    getMobileUserHealth({ days, schoolId: rawSchoolId }),
    invalidIncidentFilters
      ? Promise.resolve(invalidFiltersResult)
      : getMobileSyncIncidents({
          days,
          schoolId,
          incidentKind,
          descriptorKey,
          limit: 50,
          cursor: null,
        }),
  ]);

  let healthSuccess: React.ReactNode = null;
  if (healthResult.ok) {
    const { data } = healthResult;
    const lifetimeEvidence = hasPartBCapability(data);
    const initialPredicate = parsePredicate(
      initialPredicateValue,
      lifetimeEvidence
    );
    const waveOptions = data.wave_options ?? [];
    const initialWave = lifetimeEvidence
      ? parseWave(
          initialWaveValue,
          waveOptions.map((option) => option.id)
        )
      : "all";
    const selectedSchool = data.school_options.find(
      (school) => school.id === data.applied_filters.school_id
    );
    const deviceVersionBreakdown = buildDeviceVersionBreakdown(data.users);
    const {
      top: topDeviceVersions,
      remainderVersions,
      remainderCount,
    } = splitVersionBreakdown(deviceVersionBreakdown, 6);

    healthSuccess = (
      <section
        data-testid="mobile-user-health-report-success"
        className="space-y-4"
      >
        <p className="text-right text-xs text-slate-400">
          User Health generated {GENERATED_FORMAT.format(new Date(data.generated_at))} SAST
        </p>

        <UserHealthFilters
          key={`${data.days}|${data.applied_filters.school_id ?? ""}`}
          days={data.days}
          selectedSchoolId={data.applied_filters.school_id}
          schoolOptions={data.school_options}
        />

        {selectedSchool ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Filtered by current school: <strong>{selectedSchool.name}</strong>
          </div>
        ) : null}

        <UserHealthSummary data={data} />

        <UserHealthBoard
          key={`${data.days}|${data.applied_filters.school_id ?? ""}|${initialPredicate}|${initialCohort}|${initialQuery}|${initialWave}|${lifetimeEvidence}`}
          users={data.users}
          days={data.days}
          generatedAt={data.generated_at}
          schoolId={data.applied_filters.school_id}
          schoolName={selectedSchool?.name ?? null}
          initialQuery={initialQuery}
          initialPredicate={initialPredicate}
          initialCohort={initialCohort}
          waveOptions={waveOptions}
          initialWave={initialWave}
          lifetimeEvidence={lifetimeEvidence}
        />

        <HowToReadPanel lifetimeEvidence={lifetimeEvidence} days={data.days} />

        <section className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className="text-xs font-semibold text-slate-900">
              Top app versions in the field
            </h2>
            {deviceVersionBreakdown.length > 0 ? (
              <ul className="flex flex-wrap items-center gap-1.5 text-xs text-slate-700">
                {topDeviceVersions.map((row) => (
                  <li
                    key={row.label}
                    className="rounded bg-slate-50 px-1.5 py-0.5 tabular-nums"
                  >
                    {row.label} — {row.count}
                  </li>
                ))}
                {remainderVersions > 0 ? (
                  <li className="rounded bg-slate-50 px-1.5 py-0.5 text-slate-500 tabular-nums">
                    +{remainderVersions} more versions · {remainderCount} devices
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No registered devices yet.</p>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            Registered devices only — a rollout risk signal, not an install census.
          </p>
        </section>
      </section>
    );
  }

  const incidentFiltersSlot = (
    <SyncIncidentFilters
      key={`${incidentKind ?? ""}|${descriptorKey ?? ""}`}
      incidentKind={incidentKind ?? null}
      descriptorKey={descriptorKey}
    />
  );
  const incidentPagerSlot =
    incidentResult.ok && incidentResult.data.next_cursor !== null ? (
      <SyncIncidentPager
        key={`${days}|${schoolId ?? ""}|${incidentKind ?? ""}|${descriptorKey ?? ""}`}
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
    <UserHealthPageContent
      healthResult={healthResult}
      incidentResult={incidentResult}
      healthSuccess={healthSuccess}
      incidentFiltersSlot={incidentFiltersSlot}
      incidentPagerSlot={incidentPagerSlot}
    />
  );
}
