import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { UserHealthTabs } from "@/components/mobile-app/user-health/user-health-tabs";
import type { MobileUserHealthResult } from "@/lib/mobile/user-health/response";

export function UserHealthHeader({
  active,
}: {
  active: "overview" | "sync-diagnostics";
}) {
  return (
    <header className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Mobile app operations
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">User health</h1>
        <p className="mt-1 max-w-4xl text-sm leading-relaxed text-slate-500">
          Adoption, recent real work, and actionable access or setup blockers for EAs.
        </p>
      </div>
      <UserHealthTabs active={active} />
    </header>
  );
}

export function UserHealthPageContent({
  healthResult,
  healthSuccess,
}: {
  healthResult: MobileUserHealthResult;
  healthSuccess: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[96rem] space-y-4">
      <UserHealthHeader active="overview" />
      {healthResult.ok ? (
        healthSuccess
      ) : (
        <div
          role="alert"
          data-testid="mobile-user-health-report-error"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <h2 className="font-semibold">User health board unavailable</h2>
            <p className="mt-1">{healthResult.message}</p>
            <p className="mt-2 text-xs text-red-600">Status {healthResult.status}</p>
          </div>
        </div>
      )}
    </div>
  );
}
