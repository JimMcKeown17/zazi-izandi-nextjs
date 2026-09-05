import { AlertTriangle, CalendarRange } from "lucide-react";

import type {
  ProgrammeFidelityResult,
  ProgrammeFidelitySessionResponse,
} from "@/lib/mobile/programme-fidelity/types";

const STATUS_COPY = {
  pre_ledger: {
    label: "Before evidence ledger",
    detail: "This session predates causal mobile history, so it cannot be aligned retrospectively.",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  not_yet_available: {
    label: "Historical alignment not calculated",
    detail: "The session is visible, but no completed causal boundary was available for this publication.",
    className: "border-blue-200 bg-blue-50 text-blue-800",
  },
  pending_settlement: {
    label: "Pending evidence settlement",
    detail: "This same-day session is deliberately outside the completed causal boundary.",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  evaluated: {
    label: "Evaluated against historical evidence",
    detail: "The causal engine reconstructed the group frontier and classified each focused letter.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
} as const;

const REASON_COPY = {
  PRE_LEDGER_NO_CAUSAL_HISTORY: "The session happened before the evidence ledger was installed.",
  ALIGNMENT_NOT_YET_AVAILABLE: "Historical evidence had not yet been calculated for this session.",
  PENDING_EVIDENCE_SETTLEMENT: "The evidence window deliberately stops before this session.",
  UNKNOWN_LANGUAGE: "The group's language does not map to a supported letter sequence.",
  UNKNOWN_ASSESSMENT_FORM: "Historical assessment evidence could not be scored from a known or self-describing form.",
  SOURCE_DATA_INCOMPLETE: "Historical source evidence was incomplete for this session.",
  INVALID_SESSION_LETTERS: "The focused-letter detail was missing or malformed.",
  MASTERY_SEMANTICS_UNVERIFIED: "Older tracker instructions used ambiguous wording, so manual marks could not safely support this historical classification.",
  LOW_TRACKER_COVERAGE: "Low tracker coverage meant the app-equivalent frontier was not reliable enough to classify teaching.",
  EMPTY_ROSTER: "No historical roster was available for this session and group.",
} as const;

const BAND_CLASS = {
  aligned: "border-emerald-200 bg-emerald-50 text-emerald-800",
  below: "border-blue-200 bg-blue-50 text-blue-800",
  above: "border-rose-200 bg-rose-50 text-rose-800",
  unscored: "border-slate-200 bg-slate-50 text-slate-700",
  pending: "border-amber-200 bg-amber-50 text-amber-800",
} as const;

export function FidelitySessionDetails({
  result,
}: {
  result: ProgrammeFidelityResult<ProgrammeFidelitySessionResponse> | null;
}) {
  if (!result) return null;
  if (!result.ok) {
    return (
      <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{result.message}</span>
      </div>
    );
  }

  const { applied_filters: applied, sessions } = result.data;
  return (
    <div data-testid="programme-fidelity-session-details" className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-inner">
      <div className="flex items-start gap-2 text-sm text-slate-700">
        <CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p>
            Activity window: <strong>{applied.activity_date_from}</strong> to <strong>{applied.activity_date_to}</strong>
          </p>
          <p className="mt-1">
            Alignment window: <strong>{applied.alignment_date_from}</strong> to <strong>{applied.alignment_date_to}</strong>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Details use their bounded union, {applied.union_date_from} to {applied.union_date_to}; this is not one 15-day score window.
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-600">
          No session explanations are available for this EA/group pair in the bounded union.
        </p>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {sessions.map((session) => {
            const status = STATUS_COPY[session.alignment_status];
            const evaluatedUnscored =
              session.alignment_status === "evaluated" && session.reason_code !== null;
            const semanticUnverified =
              session.reason_code === "MASTERY_SEMANTICS_UNVERIFIED";
            const hasHistoricalEvidence =
              session.alignment_status === "evaluated" &&
              session.historical_roster_size !== null &&
              session.historical_started_count !== null &&
              session.history_quality !== null &&
              session.clock_quality_counts !== null;
            const articleClass = semanticUnverified
              ? "border-blue-200 bg-blue-50 text-blue-900"
              : evaluatedUnscored
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : status.className;
            return (
              <article key={session.session_id} className={`rounded-lg border p-3 ${articleClass}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{session.session_date}</p>
                  <span className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                    {semanticUnverified
                      ? "Mastery meaning unverified"
                      : evaluatedUnscored
                        ? "Evaluated — not scorable"
                        : status.label}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed opacity-90">
                  {semanticUnverified
                    ? "Older tracker instructions used ambiguous wording, so the historical frontier and score were withheld."
                    : evaluatedUnscored
                      ? "The session was evaluated, but the available evidence did not support a letter-alignment classification."
                    : status.detail}
                </p>
                {session.reason_code ? (
                  <p className="mt-2 rounded-md border border-current/15 bg-white/60 px-2 py-1.5 text-xs">
                    <strong>{session.reason_code === "LOW_TRACKER_COVERAGE" ? "Low tracker coverage" : "Why not scored"}:</strong>{" "}
                    {REASON_COPY[session.reason_code]}
                  </p>
                ) : null}
                {session.letters.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {session.letters.map((item, index) => (
                      <span key={`${item.letter}-${index}`} className={`rounded-md border px-2 py-1 text-xs font-semibold ${BAND_CLASS[item.band]}`}>
                        {item.letter} · {item.band}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs font-medium">No valid focused-letter detail was published.</p>
                )}
                {session.alignment_status === "evaluated" && session.historical_frontier ? (
                  <p className="mt-3 text-xs">
                    Historical frontier: <strong>{session.historical_frontier.join(", ") || "none"}</strong>
                  </p>
                ) : null}
                {hasHistoricalEvidence ? (
                  <div className="mt-3 space-y-1 border-t border-current/15 pt-2 text-xs">
                    <p>
                      {semanticUnverified ? "Assessment evidence at session" : "Evidence at session"}: <strong>{session.historical_started_count} of {session.historical_roster_size}</strong> learners had {semanticUnverified ? "assessment-supported letter evidence" : "letter evidence"}.
                    </p>
                    {session.clock_quality_counts ? (
                      <p>
                        Evidence clocks: client <strong>{session.clock_quality_counts.client}</strong> · server <strong>{session.clock_quality_counts.server}</strong> · install baseline <strong>{session.clock_quality_counts.bootstrap}</strong>.
                      </p>
                    ) : null}
                    <p>
                      {session.history_quality === "bootstrap_influenced"
                        ? "History quality: includes install baseline evidence; exact pre-install timing is limited."
                        : "History quality: reconstructed from post-install causal evidence."}
                    </p>
                  </div>
                ) : null}
                {session.session_time_quality === "date_fallback" ? (
                  <p className="mt-2 text-[11px] opacity-80">
                    Session time used a date fallback, so same-day ordering is less precise.
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
