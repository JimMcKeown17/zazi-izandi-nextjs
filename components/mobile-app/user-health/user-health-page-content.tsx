import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { SyncIncidentAlerts } from "@/components/mobile-app/sync-incidents/sync-incident-alerts";
import type { MobileSyncIncidentsResult } from "@/lib/mobile/sync-incidents/types";
import type { MobileUserHealthResult } from "@/lib/mobile/user-health/response";

export function UserHealthPageContent({
  healthResult,
  incidentResult,
  healthSuccess,
  incidentFiltersSlot,
  incidentPagerSlot,
}: {
  healthResult: MobileUserHealthResult;
  incidentResult: MobileSyncIncidentsResult;
  healthSuccess: ReactNode;
  incidentFiltersSlot?: ReactNode;
  incidentPagerSlot?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[96rem] space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Mobile app operations
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">User health</h1>
        <p className="mt-1 max-w-4xl text-sm leading-relaxed text-slate-500">
          Onboarding, data readiness, app-usage evidence, and historical sync
          receipts for EAs.
        </p>
      </header>

      <SyncIncidentAlerts
        result={incidentResult}
        filtersSlot={incidentFiltersSlot}
        pagerSlot={incidentPagerSlot}
      />

      {healthResult.ok ? (
        healthSuccess
      ) : (
        <section
          data-testid="mobile-user-health-report-error"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <h2 className="font-semibold">User health board unavailable</h2>
            <p className="mt-1">{healthResult.message}</p>
            <p className="mt-2 text-xs text-red-600">
              Status {healthResult.status}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
