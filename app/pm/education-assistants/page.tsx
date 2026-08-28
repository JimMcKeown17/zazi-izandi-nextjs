import { Suspense } from "react";
import { LockKeyhole, LoaderCircle } from "lucide-react";

import { HistoricalTeamPactSection } from "@/components/pm/education-assistants/historical-teampact-section";
import { RecentTeachingSection } from "@/components/pm/education-assistants/recent-teaching-section";
import { SectionErrorBoundary } from "@/components/pm/education-assistants/section-error-boundary";
import { getAuthenticatedMobileSession } from "@/lib/mobile/auth";
import { hasCapability } from "@/lib/mobile/capabilities";
import { getCohortLabel, parseCohort } from "@/lib/pm/cohorts";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function SectionLoading({ label, height }: { label: string; height: string }) {
  return (
    <div
      className={`${height} flex items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <LoaderCircle
          className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span>{label}</span>
      </div>
    </div>
  );
}

export default async function EducationAssistantsPage({ searchParams }: Props) {
  const [params, session] = await Promise.all([
    searchParams,
    getAuthenticatedMobileSession(),
  ]);
  const cohort = parseCohort(
    typeof params.cohort === "string" ? params.cohort : undefined
  );
  const cohortLabel = getCohortLabel(cohort);
  const canReadRecentTeaching = hasCapability(
    session.role,
    "mobile.sessions.read"
  );

  return (
    <div className="mx-auto max-w-[100rem] space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Teaching Overview</h1>
        <p className="mt-1 text-sm text-slate-600">
          {cohortLabel} · recent teaching evidence and a separate historical view
        </p>
      </header>

      {canReadRecentTeaching ? (
        <SectionErrorBoundary
          sectionName="Recent teaching data"
          resetKey={`recent-${cohort}`}
        >
          <Suspense
            fallback={
              <SectionLoading
                label="Loading recent mobile teaching data…"
                height="min-h-[28rem]"
              />
            }
          >
            <RecentTeachingSection cohort={cohort} cohortLabel={cohortLabel} />
          </Suspense>
        </SectionErrorBoundary>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-start gap-3 text-sm text-slate-700">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-slate-900">Recent teaching data is restricted</h2>
              <p className="mt-1 leading-relaxed">
                This operational coaching view is available to programme staff. The historical
                programme view remains available below.
              </p>
            </div>
          </div>
        </section>
      )}

      <SectionErrorBoundary
        sectionName="Historical TeamPact view"
        resetKey={`historical-${cohort}`}
      >
        <Suspense
          fallback={
            <SectionLoading
              label="Loading the historical TeamPact view…"
              height="min-h-28"
            />
          }
        >
          <HistoricalTeamPactSection
            cohort={cohort}
            cohortLabel={cohortLabel}
            defaultOpen={!canReadRecentTeaching}
          />
        </Suspense>
      </SectionErrorBoundary>
    </div>
  );
}
