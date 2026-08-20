import { AlertTriangle } from "lucide-react";

import { formatSastTimestamp } from "@/lib/mobile/sync-incidents/presentation";
import {
  SESSION_REVIEW_ALERTS_UNAVAILABLE,
  SESSION_REVIEW_REASON_COPY,
} from "@/lib/mobile/session-review-copy";
import type { MobileSessionReviewFlagsResult } from "@/lib/mobile/response";

export const SESSION_REVIEW_ALERTS_VISIBLE_LIMIT = 8;

function formatSessionWhen(flag: {
  session_date: string;
  started_at: string | null;
  ended_at: string | null;
}): string {
  if (flag.started_at) {
    const start = formatSastTimestamp(flag.started_at);
    return flag.ended_at
      ? `${start} – ${formatSastTimestamp(flag.ended_at)}`
      : start;
  }
  return new Date(`${flag.session_date}T00:00:00`).toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SessionReviewAlerts({
  result,
}: {
  result: MobileSessionReviewFlagsResult;
}) {
  if (!result.ok) {
    const duplicateUnavailableCopy =
      result.message === SESSION_REVIEW_ALERTS_UNAVAILABLE;
    return (
      <div
        data-testid="mobile-session-review-unavailable"
        className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950"
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold">{SESSION_REVIEW_ALERTS_UNAVAILABLE}</p>
          {duplicateUnavailableCopy ? null : (
            <p className="mt-1 text-amber-800">{result.message}</p>
          )}
        </div>
      </div>
    );
  }

  const { count, flags } = result.data;
  if (count === 0 && flags.length === 0) {
    return null;
  }

  const visibleFlags = flags.slice(0, SESSION_REVIEW_ALERTS_VISIBLE_LIMIT);
  const truncated = count > visibleFlags.length;

  return (
    <section
      data-testid="mobile-session-review-alerts"
      className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4"
    >
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Session review alerts
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {count === 1
            ? "1 session includes a child held by another education assistant at the same school."
            : `${count} sessions include a child held by another education assistant at the same school.`}
        </p>
        {truncated ? (
          <p
            data-testid="mobile-session-review-truncated"
            className="mt-1 text-sm text-slate-600"
          >
            Showing {visibleFlags.length} of {count}.
          </p>
        ) : null}
      </div>
      <ul className="space-y-3">
        {visibleFlags.map((flag) => (
          <li
            key={`${flag.session_id}-${flag.child_id}`}
            className="rounded-lg border border-amber-100 bg-white px-3 py-3 text-sm"
          >
            <p className="font-medium text-slate-900">
              {flag.child_first_name} {flag.child_last_name}
            </p>
            <p className="mt-1 text-slate-600">
              {formatSessionWhen(flag)} · {flag.school_name} · submitted by{" "}
              {flag.submitting_ea_name}
            </p>
            <p className="mt-2 text-slate-700">
              {SESSION_REVIEW_REASON_COPY[flag.reason_code]}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
