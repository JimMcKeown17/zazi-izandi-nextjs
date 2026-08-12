import { AlertTriangle } from "lucide-react";

import { HowToReadPanel } from "@/components/mobile-app/user-health/how-to-read-panel";
import { UserHealthBoard } from "@/components/mobile-app/user-health/user-health-board";
import { UserHealthFilters } from "@/components/mobile-app/user-health/user-health-filters";
import { UserHealthFunnel } from "@/components/mobile-app/user-health/user-health-funnel";
import { UserHealthSummary } from "@/components/mobile-app/user-health/user-health-summary";
import { getMobileUserHealth } from "@/lib/mobile/api";
import {
  buildDeviceVersionBreakdown,
  splitVersionBreakdown,
} from "@/lib/mobile/user-health/devices";
import { buildFunnelCounts } from "@/lib/mobile/user-health/funnel";
import type { UserHealthPredicate } from "@/lib/mobile/user-health/presentation";
import type { MobileUserHealthRow } from "@/lib/mobile/user-health/types";

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
  "reached",
  "not_started",
] as const;
const COHORTS = ["all", "seeded", "self_setup", "unknown"] as const;

function parsePredicate(value: string | undefined): UserHealthPredicate {
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
  const schoolId = firstValue(params.school_id) || null;
  const initialQuery = firstValue(params.q) ?? "";
  const initialPredicate = parsePredicate(firstValue(params.state));
  const initialCohort = parseCohort(firstValue(params.cohort));
  const result = await getMobileUserHealth({ days, schoolId });

  if (!result.ok) {
    return (
      <div
        data-testid="mobile-user-health-report-error"
        className="mx-auto max-w-[96rem] space-y-4"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Mobile app operations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">User health</h1>
          <p className="mt-1 text-sm text-slate-500">
            Onboarding, data readiness, and app-usage evidence for EAs.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="font-semibold">User health board unavailable</p>
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
  const funnelCounts = buildFunnelCounts(data.users);
  const deviceVersionBreakdown = buildDeviceVersionBreakdown(data.users);
  const {
    top: topDeviceVersions,
    remainderVersions,
    remainderCount,
  } = splitVersionBreakdown(deviceVersionBreakdown, 6);

  return (
    <div
      data-testid="mobile-user-health-report-success"
      className="mx-auto max-w-[96rem] space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Mobile app operations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">User health</h1>
          <p className="mt-1 max-w-4xl text-sm leading-relaxed text-slate-500">
            Row-level onboarding evidence coverage for EA identity, Auth
            readiness, server-data readiness, and real mobile-app activity.
          </p>
        </div>
        <p className="shrink-0 text-xs text-slate-400">
          Generated {GENERATED_FORMAT.format(new Date(data.generated_at))} SAST
        </p>
      </div>

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

      <UserHealthFunnel counts={funnelCounts} days={data.days} />

      <HowToReadPanel />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">
          Top app versions in the field
        </h2>
        {deviceVersionBreakdown.length > 0 ? (
          <ul className="mt-3 divide-y divide-slate-100 text-sm text-slate-700">
            {topDeviceVersions.map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between gap-4 py-2 first:pt-0"
              >
                <span className="break-words">{row.label}</span>
                <span className="shrink-0 tabular-nums">— {row.count}</span>
              </li>
            ))}
            {remainderVersions > 0 ? (
              <li className="py-2 text-slate-500">
                +{remainderVersions} more versions · {remainderCount} devices
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No registered devices yet.
          </p>
        )}
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Registered devices only — a rollout risk signal, not an install census.
        </p>
      </section>

      <UserHealthBoard
        key={`${data.days}|${data.applied_filters.school_id ?? ""}|${initialPredicate}|${initialCohort}|${initialQuery}`}
        users={data.users}
        days={data.days}
        generatedAt={data.generated_at}
        schoolId={data.applied_filters.school_id}
        schoolName={selectedSchool?.name ?? null}
        initialQuery={initialQuery}
        initialPredicate={initialPredicate}
        initialCohort={initialCohort}
      />

    </div>
  );
}
