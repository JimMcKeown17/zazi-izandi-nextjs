import { HowToReadPanel } from "@/components/mobile-app/user-health/how-to-read-panel";
import { UserHealthBoard } from "@/components/mobile-app/user-health/user-health-board";
import { UserHealthPageContent } from "@/components/mobile-app/user-health/user-health-page-content";
import { getMobileUserHealth } from "@/lib/mobile/api";
import {
  firstUserHealthParam,
  parseUserHealthDays,
} from "@/lib/mobile/user-health/page-state";
import type {
  UserHealthPredicate,
  UserHealthSortKey,
} from "@/lib/mobile/user-health/presentation";
import type {
  MobileUserDataExpectation,
} from "@/lib/mobile/user-health/types";
import {
  hasPartBCapability,
  type WaveSelection,
} from "@/lib/mobile/user-health/wave";

interface UserHealthPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
const SORT_KEYS = ["urgency", "last_activity", "name", "school"] as const;

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
): MobileUserDataExpectation | "all" {
  return (COHORTS as readonly string[]).includes(value ?? "")
    ? (value as (typeof COHORTS)[number])
    : "all";
}

function parseSort(value: string | undefined): UserHealthSortKey {
  return (SORT_KEYS as readonly string[]).includes(value ?? "")
    ? (value as UserHealthSortKey)
    : "urgency";
}

function parseWave(
  value: string | undefined,
  waveOptionIds: readonly string[]
): WaveSelection {
  if (!value) return "all";
  if (value === "none") return "none";
  return waveOptionIds.includes(value) ? value : "all";
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
  const days = parseUserHealthDays(firstUserHealthParam(params.days));
  const rawSchoolId = firstUserHealthParam(params.school_id) || null;
  const healthResult = await getMobileUserHealth({ days, schoolId: rawSchoolId });

  let healthSuccess: React.ReactNode = null;
  if (healthResult.ok) {
    const { data } = healthResult;
    const lifetimeEvidence = hasPartBCapability(data);
    const waveOptions = data.wave_options ?? [];
    const initialPredicate = parsePredicate(
      firstUserHealthParam(params.state),
      lifetimeEvidence
    );
    const initialCohort = parseCohort(firstUserHealthParam(params.cohort));
    const initialSort = parseSort(firstUserHealthParam(params.sort));
    const initialWave = lifetimeEvidence
      ? parseWave(
          firstUserHealthParam(params.wave),
          waveOptions.map((option) => option.id)
        )
      : "all";
    const selectedSchool = data.school_options.find(
      (school) => school.id === data.applied_filters.school_id
    );

    healthSuccess = (
      <div data-testid="mobile-user-health-report-success" className="space-y-4">
        <p className="text-right text-xs text-slate-400">
          User Health generated {GENERATED_FORMAT.format(new Date(data.generated_at))} SAST
        </p>
        <UserHealthBoard
          key={`${data.days}|${data.applied_filters.school_id ?? ""}|${initialPredicate}|${initialCohort}|${initialSort}|${firstUserHealthParam(params.q) ?? ""}|${initialWave}|${lifetimeEvidence}`}
          users={data.users}
          days={data.days}
          generatedAt={data.generated_at}
          schoolId={data.applied_filters.school_id}
          schoolName={selectedSchool?.name ?? null}
          schoolOptions={data.school_options}
          initialQuery={firstUserHealthParam(params.q) ?? ""}
          initialPredicate={initialPredicate}
          initialCohort={initialCohort}
          initialSort={initialSort}
          waveOptions={waveOptions}
          initialWave={initialWave}
          lifetimeEvidence={lifetimeEvidence}
        />
        <HowToReadPanel lifetimeEvidence={lifetimeEvidence} days={data.days} />
      </div>
    );
  }

  return (
    <UserHealthPageContent
      healthResult={healthResult}
      healthSuccess={healthSuccess}
    />
  );
}
