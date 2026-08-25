import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  DatabaseZap,
  Info,
} from "lucide-react";

import { FidelityExportButton } from "./fidelity-export-button";
import { FidelityFilters } from "./fidelity-filters";
import { FidelityMobileCards } from "./fidelity-mobile-cards";
import { FidelitySummaryTiles } from "./fidelity-summary-tiles";
import { FidelityTable } from "./fidelity-table";
import { buildProgrammeFidelityCsv } from "@/lib/mobile/programme-fidelity/export";
import type {
  ProgrammeFidelityExpansion,
  ProgrammeFidelityFilters as Filters,
  ProgrammeFidelityResponse,
  ProgrammeFidelityResult,
  ProgrammeFidelitySessionResponse,
} from "@/lib/mobile/programme-fidelity/types";

const DATE_TIME = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  dateStyle: "medium",
  timeStyle: "short",
});

function FreshnessFacts({ data }: { data: ProgrammeFidelityResponse }) {
  return (
    <>
      <span className={data.freshness.is_stale ? "font-semibold text-amber-800" : undefined}>
        Snapshot status: {data.freshness.is_stale ? "stale — latest completed data retained" : "current"}
      </span>
      <span>Source snapshot: {DATE_TIME.format(new Date(data.freshness.source_generated_at))} SAST</span>
      <span>Local calculation: {DATE_TIME.format(new Date(data.freshness.compute_completed_at))} SAST</span>
      <span>Ledger installed: {DATE_TIME.format(new Date(data.alignment_availability.ledger_installed_at))} SAST</span>
      <span>
        Last complete event boundary: {data.alignment_availability.last_complete_event_run_finished_at ? DATE_TIME.format(new Date(data.alignment_availability.last_complete_event_run_finished_at)) : "not yet available"}
      </span>
      <span>Alignment scored through: {data.alignment_scored_through_date ?? "not yet available"}</span>
      {data.freshness.last_failed_at ? (
        <span className="font-semibold text-amber-800">
          Latest failed attempt: {DATE_TIME.format(new Date(data.freshness.last_failed_at))} SAST
        </span>
      ) : null}
    </>
  );
}

function FreshnessBanner({ data }: { data: ProgrammeFidelityResponse }) {
  const causalAvailable = data.alignment_availability.status !== "not_yet_available";
  const stale = data.freshness.is_stale;
  const bannerClass = stale
    ? "border-amber-300 bg-amber-50"
    : causalAvailable
      ? "border-emerald-200 bg-emerald-50"
      : "border-blue-200 bg-blue-50";
  const iconClass = stale
    ? "text-amber-700"
    : causalAvailable
      ? "text-emerald-700"
      : "text-primary";
  return (
    <div className={`rounded-xl border p-4 ${bannerClass}`}>
      <div className="flex items-start gap-3">
        <DatabaseZap className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} />
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">
            {stale ? "Latest completed mobile guidance is stale" : "Current mobile guidance is live"} through {data.activity_through_date ?? "an unavailable date"}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            {data.alignment_availability.message}
          </p>
          <div className="mt-3 hidden flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 sm:flex">
            <FreshnessFacts data={data} />
          </div>
          <details className="mt-3 text-xs text-slate-600 sm:hidden">
            <summary className="cursor-pointer font-semibold text-primary">Snapshot and history boundaries</summary>
            <div className="mt-2 grid gap-1 border-t border-blue-200 pt-2">
              <FreshnessFacts data={data} />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

export function FidelityPageContent({
  result,
  sessionsResult,
  filters,
  expansion,
}: {
  result: ProgrammeFidelityResult<ProgrammeFidelityResponse>;
  sessionsResult: ProgrammeFidelityResult<ProgrammeFidelitySessionResponse> | null;
  filters: Filters;
  expansion: ProgrammeFidelityExpansion | null;
}) {
  return (
    <div className="mx-auto max-w-[100rem] space-y-4" data-testid="programme-fidelity-page">
      <header className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Mobile app operations</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Programme fidelity</h1>
          <p className="mt-1 max-w-4xl text-sm leading-relaxed text-slate-600">
            See which EA/group needs a mentor check now, using recent mobile sessions and the current letter tracker.
          </p>
        </div>
        <div className="hidden items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600 sm:flex">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            This is the live operational coaching queue. The <Link href="/pm" className="font-semibold text-primary hover:underline">Programme Management dashboard <ArrowUpRight className="inline h-3 w-3" /></Link> remains the macro TeamPact and annual programme overview.
          </p>
        </div>
        <Link
          href="/pm"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline sm:hidden"
        >
          How this differs from Programme Management <ArrowUpRight className="h-3 w-3" />
        </Link>
      </header>

      {!result.ok ? (
        <div role="alert" data-testid="programme-fidelity-error" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <h2 className="font-semibold">Programme fidelity unavailable</h2>
            <p className="mt-1">{result.message}</p>
            <p className="mt-2 text-xs text-red-600">Status {result.status}</p>
          </div>
        </div>
      ) : (
        <div data-testid="programme-fidelity-success" className="space-y-4">
          <FreshnessBanner data={result.data} />
          <FidelityFilters
            filters={filters}
            options={result.data.filter_options}
            causalAvailable={result.data.alignment_availability.status !== "not_yet_available"}
          />
          <FidelitySummaryTiles aggregates={result.data.aggregates} />

          {result.data.data_quality.unattributed_session_count > 0 ? (
            <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {result.data.data_quality.unattributed_session_count} recent session{result.data.data_quality.unattributed_session_count === 1 ? " is" : "s are"} not attributable to one group because attendee group evidence is incomplete. No partial group claim was made.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">EA/group coaching queue</h2>
              <p className="mt-1 text-xs text-slate-500">
                {result.data.rows.length} row{result.data.rows.length === 1 ? "" : "s"}; current-state attention appears first. This is not an EA ranking.
              </p>
            </div>
            <FidelityExportButton
              csv={buildProgrammeFidelityCsv(result.data.rows)}
              dateStamp={result.data.activity_through_date ?? "current"}
            />
          </div>

          {result.data.rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-600">
              No EA/group rows match these filters. Causal-only filters remain empty until historical alignment is available.
            </div>
          ) : (
            <>
              <FidelityTable rows={result.data.rows} filters={filters} expansion={expansion} sessionsResult={sessionsResult} />
              <FidelityMobileCards rows={result.data.rows} filters={filters} expansion={expansion} sessionsResult={sessionsResult} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
