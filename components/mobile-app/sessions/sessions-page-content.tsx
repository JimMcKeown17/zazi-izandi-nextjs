import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { SessionReviewAlerts } from "@/components/mobile-app/sessions/session-review-alerts";
import type {
  MobileSessionReviewFlagsResult,
  MobileSessionsActivityResult,
} from "@/lib/mobile/response";

export function SessionsPageContent({
  result,
  reviewFlags,
  exportPanel,
  children,
}: {
  result: MobileSessionsActivityResult;
  reviewFlags: MobileSessionReviewFlagsResult;
  exportPanel?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      data-testid={
        result.ok
          ? "mobile-sessions-report-success"
          : "mobile-sessions-report-error"
      }
      className="mx-auto max-w-7xl space-y-4"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Mobile app reporting
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Sessions</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
          Teaching activity uploaded by the Zazi iZandi mobile app. School
          groupings use each EA&apos;s <strong>current roster school</strong>, not
          historical session-time attribution.
        </p>
      </header>

      <SessionReviewAlerts result={reviewFlags} />

      {exportPanel}

      {result.ok ? (
        children
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="font-semibold">Session report unavailable</p>
            <p className="mt-1">{result.message}</p>
            <p className="mt-2 text-xs text-red-600">Status {result.status}</p>
          </div>
        </div>
      )}
    </div>
  );
}
