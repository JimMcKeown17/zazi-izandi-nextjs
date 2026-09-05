import { AlertTriangle, LockKeyhole, RefreshCw } from "lucide-react";

import { TeachingOverviewContent } from "@/components/pm/education-assistants/teaching-overview-content";
import { getAuthenticatedMobileSession } from "@/lib/mobile/auth";
import { fetchProgrammeFidelityWithToken } from "@/lib/mobile/programme-fidelity/server-fetch";
import type { ProgrammeFidelityFailureKind } from "@/lib/mobile/programme-fidelity/types";
import {
  filterProgrammeFidelityRowsByCohort,
  type Cohort,
} from "@/lib/pm/cohorts";
import { buildTeachingOverviewPortfolios } from "@/lib/pm/teaching-overview";

function RecentTeachingFailure({
  kind,
  message,
}: {
  kind: ProgrammeFidelityFailureKind | "token_unavailable";
  message?: string;
}) {
  const restricted = kind === "not_authorized";
  const needsAuthentication = kind === "not_authenticated" || kind === "token_unavailable";
  const Icon = restricted ? LockKeyhole : needsAuthentication ? RefreshCw : AlertTriangle;
  const title = restricted
    ? "Recent teaching data is restricted"
    : needsAuthentication
      ? "Recent teaching data needs a fresh sign-in"
      : kind === "not_computed"
        ? "Recent teaching data has not been calculated yet"
        : "Recent teaching data is temporarily unavailable";
  return (
    <section
      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 shadow-sm"
      role="alert"
      data-testid="recent-teaching-unavailable"
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 leading-relaxed">
            {message ?? "Refresh the page to try this recent view again. The historical view below remains independent."}
          </p>
        </div>
      </div>
    </section>
  );
}

export async function RecentTeachingSection({
  cohort,
  cohortLabel,
}: {
  cohort: Cohort;
  cohortLabel: string;
}) {
  const session = await getAuthenticatedMobileSession();
  let token: string | null = null;
  try {
    token = await session.getToken();
  } catch {
    return <RecentTeachingFailure kind="token_unavailable" />;
  }
  if (!token) return <RecentTeachingFailure kind="token_unavailable" />;

  const result = await fetchProgrammeFidelityWithToken(token, {
    schoolId: null,
    eaUserId: null,
    attention: "all",
  });
  if (!result.ok) {
    return <RecentTeachingFailure kind={result.kind} message={result.message} />;
  }

  const filtered = filterProgrammeFidelityRowsByCohort(result.data.rows, cohort);
  const portfolios = buildTeachingOverviewPortfolios(
    filtered.rows,
    result.data.schema_version
  );
  return (
    <TeachingOverviewContent
      data={result.data}
      portfolios={portfolios}
      cohortLabel={cohortLabel}
      exclusionCounts={filtered.exclusionCounts}
    />
  );
}
