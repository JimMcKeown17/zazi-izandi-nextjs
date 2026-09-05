"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenCheck,
  ChevronDown,
  ChevronUp,
  Clock3,
  Info,
  Users,
} from "lucide-react";

import { TeachingOverviewChart } from "@/components/pm/education-assistants/teaching-overview-chart";
import type {
  ProgrammeFidelityResponse,
  ProgrammeFidelityRow,
} from "@/lib/mobile/programme-fidelity/types";
import type { TeachingOverviewPortfolio } from "@/lib/pm/teaching-overview";

const DATE_TIME = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  dateStyle: "medium",
  timeStyle: "short",
});

const percent = (value: number | null, digits = 0): string =>
  value === null ? "—" : `${value.toFixed(digits)}%`;

const coverage = (value: number | null): string =>
  value === null ? "—" : `${(value * 100).toFixed(0)}%`;

const shiftIsoDate = (value: string, days: number): string => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

function SummaryTile({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>
    </div>
  );
}

function reasonLabel(reason: ProgrammeFidelityRow["primary_reason"]): string {
  return {
    TEACHING_AHEAD_OF_FRONTIER: "Ahead of recorded progress",
    RECENT_ACTIVITY_UNSCORABLE: "Evidence check needed",
    NO_RECENT_MOBILE_SESSION: "No recent mobile session",
    CURRENT_TRACKER_COVERAGE_LOW: "Low tracker completion",
    BOOTSTRAP_HISTORY_LIMITED: "Some historical timing is less certain",
    UNKNOWN_LANGUAGE: "Language mapping needs attention",
    UNKNOWN_ASSESSMENT_FORM: "Assessment form needs attention",
    INVALID_SESSION_LETTERS: "Focused-letter record needs attention",
    SOURCE_DATA_INCOMPLETE: "Source information is incomplete",
    NO_IMMEDIATE_FLAG: "No immediate group flag",
  }[reason];
}

function groupLetterFocus(group: ProgrammeFidelityRow): string {
  if (!("letter_focus" in group)) return "Not calculated for this run";
  if (group.letter_focus === null) return "Not enough reliable evidence yet";
  return group.letter_focus.score === null
    ? "No usable sessions yet"
    : `${group.letter_focus.score.toFixed(1)}% across ${group.letter_focus.eligible_session_count} scorable sessions`;
}

function PortfolioLetterFocus({ portfolio }: { portfolio: TeachingOverviewPortfolio }) {
  if (portfolio.letterFocusAvailability === "not_calculated_for_run") {
    return <span className="font-medium text-slate-600">Not calculated for this run</span>;
  }
  if (portfolio.letterFocusAvailability === "not_enough_reliable_evidence") {
    return <span className="font-medium text-slate-600">Not enough reliable evidence yet</span>;
  }
  if (portfolio.letterFocusScore === null) {
    return <span className="font-medium text-slate-600">No usable groups yet</span>;
  }
  return (
    <div>
      <p className="font-bold tabular-nums text-slate-900">
        {percent(portfolio.letterFocusScore, 1)}
      </p>
      <p className="text-xs text-slate-500">
        {portfolio.usableGroupCount} of {portfolio.currentGroupCount} groups · {portfolio.eligibleSessionCount} scorable sessions
      </p>
    </div>
  );
}

function EvidenceLinks({ portfolio }: { portfolio: TeachingOverviewPortfolio }) {
  const base = `/mobile-app/programme-fidelity?ea_user_id=${encodeURIComponent(portfolio.eaUserId)}`;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
      <Link href={base} className="text-primary hover:underline">
        Open all groups <ArrowUpRight className="inline h-3 w-3" aria-hidden="true" />
      </Link>
      <Link href={`${base}&attention=above`} className="text-primary hover:underline">
        Ahead evidence <ArrowUpRight className="inline h-3 w-3" aria-hidden="true" />
      </Link>
      <Link href={`${base}&attention=unscored`} className="text-primary hover:underline">
        Evidence checks <ArrowUpRight className="inline h-3 w-3" aria-hidden="true" />
      </Link>
      <Link href={`${base}&attention=inactive`} className="text-primary hover:underline">
        Inactive groups <ArrowUpRight className="inline h-3 w-3" aria-hidden="true" />
      </Link>
    </div>
  );
}

function GroupEvidence({ group }: { group: ProgrammeFidelityRow }) {
  const tracker =
    group.started_count === null || group.roster_size === null
      ? "Current tracker denominator unavailable"
      : `${group.started_count} of ${group.roster_size} learners started`;
  const detailUrl =
    `/mobile-app/programme-fidelity?ea_user_id=${encodeURIComponent(group.ea_user_id)}` +
    `&expanded_group_id=${encodeURIComponent(group.group_id)}` +
    `&expanded_ea_user_id=${encodeURIComponent(group.ea_user_id)}`;
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-slate-900">{group.group_name}</h4>
          <p className="text-xs text-slate-500">{group.school_name ?? "School not attributed"}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
          {reasonLabel(group.primary_reason)}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-slate-500">Recent sessions</dt><dd className="font-semibold">{group.recent_session_count}</dd></div>
        <div><dt className="text-slate-500">Tracker</dt><dd className="font-semibold">{tracker}</dd></div>
        <div><dt className="text-slate-500">Letter Focus</dt><dd className="font-semibold">{groupLetterFocus(group)}</dd></div>
        <div><dt className="text-slate-500">Ahead evidence</dt><dd className="font-semibold">{group.above_count === null ? "Not available" : `${group.above_count} letter instances`}</dd></div>
      </dl>
      <Link href={detailUrl} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
        Open group and session evidence <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
      </Link>
    </article>
  );
}

function PortfolioExpansion({ portfolio }: { portfolio: TeachingOverviewPortfolio }) {
  return (
    <div className="space-y-3 border-t border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <p><span className="font-semibold">{portfolio.lowTrackerGroupCount} of {portfolio.currentGroupCount}</span> groups have low tracker completion</p>
        <p><span className="font-semibold">{portfolio.aheadEvidenceGroupCount} of {portfolio.currentGroupCount}</span> groups contain ahead evidence</p>
        <p><span className="font-semibold">{portfolio.inactiveGroupCount} of {portfolio.currentGroupCount}</span> groups have no recent session</p>
        <p>
          <span className="font-semibold">
            {portfolio.recentUnscorableGroupCount === null ? "Not calculated" : `${portfolio.recentUnscorableGroupCount} of ${portfolio.currentGroupCount}`}
          </span>{" "}
          groups need an evidence check
        </p>
      </div>
      <EvidenceLinks portfolio={portfolio} />
      <div className="grid gap-3 lg:grid-cols-2">
        {portfolio.groups.map((group) => <GroupEvidence key={group.group_id} group={group} />)}
      </div>
    </div>
  );
}

export function TeachingOverviewContent({
  data,
  portfolios,
  cohortLabel,
  exclusionCounts,
}: {
  data: ProgrammeFidelityResponse;
  portfolios: TeachingOverviewPortfolio[];
  cohortLabel: string;
  exclusionCounts: {
    missingSchoolEvidence: number;
    unrecognizedSchoolEvidence: number;
  };
}) {
  const [selectedEaId, setSelectedEaId] = useState<string | null>(null);
  const [expandedEaId, setExpandedEaId] = useState<string | null>(null);
  const totals = useMemo(() => ({
    groups: portfolios.reduce((sum, value) => sum + value.currentGroupCount, 0),
    inactive: portfolios.reduce((sum, value) => sum + value.inactiveGroupCount, 0),
    roster: portfolios.reduce((sum, value) => sum + value.rosterSize, 0),
    started: portfolios.reduce((sum, value) => sum + value.trackerStartedCount, 0),
    ahead: portfolios.reduce((sum, value) => sum + value.aheadEvidenceGroupCount, 0),
    usable: portfolios.reduce((sum, value) => sum + (value.usableGroupCount ?? 0), 0),
  }), [portfolios]);
  const activityStart = data.rows[0]?.activity_date_from ?? null;
  const candidateStart = activityStart ? shiftIsoDate(activityStart, -1) : null;
  const ledgerDate = data.alignment_availability.ledger_installed_at.slice(0, 10);
  const evidenceStart = candidateStart && ledgerDate > candidateStart ? ledgerDate : candidateStart;
  const exclusions = exclusionCounts.missingSchoolEvidence + exclusionCounts.unrecognizedSchoolEvidence;
  const v2Unavailable = data.schema_version === 2 && data.alignment_availability.status === "not_yet_available";
  const availabilityTitle = data.schema_version === 1
    ? "Letter Focus was not calculated for this run"
    : v2Unavailable
      ? "Not enough reliable evidence yet"
      : data.alignment_availability.status === "partial"
        ? "Letter Focus uses a partial evidence window"
        : "Letter Focus evidence is available";

  return (
    <section className="space-y-4" aria-labelledby="recent-teaching-heading" data-testid="recent-teaching-content">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Recent mobile data</p>
            <h2 id="recent-teaching-heading" className="mt-1 text-lg font-bold text-slate-900">EA teaching patterns</h2>
            <p className="mt-1 text-sm text-slate-700">
              {cohortLabel} · activity {activityStart ?? "date unavailable"} to {data.activity_through_date ?? "date unavailable"}
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p className={data.freshness.is_stale ? "font-semibold text-amber-800" : "font-semibold text-emerald-800"}>
              {data.freshness.is_stale ? "Latest completed data is stale" : "Latest completed data"}
            </p>
            <p>{DATE_TIME.format(new Date(data.freshness.compute_completed_at))} SAST</p>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
          <div>
            <p className="font-semibold">{availabilityTitle}</p>
            <p className="mt-0.5 text-xs leading-relaxed">
              {data.schema_version === 1 || v2Unavailable
                ? data.alignment_availability.message
                : `Settled teaching evidence runs from ${evidenceStart ?? "an unavailable start"} through ${data.alignment_scored_through_date ?? "an unavailable end"}. Activity on ${data.activity_through_date ?? "the newest day"} is newer and is not yet included in Letter Focus.`}
            </p>
          </div>
        </div>
        {exclusions > 0 ? (
          <p className="mt-3 text-xs font-medium text-amber-900" role="status">
            {exclusions} current {exclusions === 1 ? "group was" : "groups were"} excluded from this cohort because school evidence was {exclusionCounts.missingSchoolEvidence > 0 ? "missing or " : ""}not recognized.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <SummaryTile label="Current EAs" value={portfolios.length} detail={`${cohortLabel} portfolios`} icon={Users} />
        <SummaryTile label="Current groups" value={totals.groups} detail="owned by the EAs shown" icon={Users} />
        <SummaryTile label="No recent session" value={totals.inactive} detail={`${totals.inactive} of ${totals.groups} current groups`} icon={Clock3} />
        <SummaryTile label="Tracker started" value={`${totals.started}/${totals.roster}`} detail={totals.roster > 0 ? coverage(totals.started / totals.roster) : "No current learners"} icon={BookOpenCheck} />
        <SummaryTile label="Ahead evidence" value={totals.ahead} detail="current groups with recorded evidence" icon={BookOpenCheck} />
        <SummaryTile
          label="Usable Letter Focus"
          value={data.schema_version === 1 || v2Unavailable ? "—" : totals.usable}
          detail={data.schema_version === 1 ? "Not calculated for this run" : v2Unavailable ? "Not enough reliable evidence yet" : `${totals.usable} of ${totals.groups} groups`}
          icon={BookOpenCheck}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Recent sessions and Letter Focus</h3>
            <p className="mt-1 text-xs text-slate-500">Select a blue point to highlight its EA portfolio below. Grey, unplottable EAs remain in the list.</p>
          </div>
          <details className="max-w-xl rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <summary className="cursor-pointer font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary">What is Letter Focus Score?</summary>
            <p className="mt-2 leading-relaxed">
              Shows whether recent lessons focused on letters children were ready to learn or needed to review, rather than letters ahead of recorded progress. Each session and each current group count equally. Review helps, but multiple review letters in the same session add credit only once. This does not measure overall teaching quality or whether a group is progressing quickly.
            </p>
          </details>
        </div>
        <TeachingOverviewChart portfolios={portfolios} selectedEaId={selectedEaId} onSelect={setSelectedEaId} />
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900">EA portfolios</h3>
        {portfolios.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">No current EA groups match this cohort.</div>
        ) : null}

        <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">EA and schools</th><th className="px-4 py-3">Current groups</th><th className="px-4 py-3">Tracker</th><th className="px-4 py-3">Patterns</th><th className="px-4 py-3">Letter Focus</th><th className="px-4 py-3"><span className="sr-only">Details</span></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {portfolios.map((portfolio) => {
                const expanded = portfolio.eaUserId === expandedEaId;
                const selected = portfolio.eaUserId === selectedEaId;
                const evidenceId = `ea-evidence-${portfolio.eaUserId}`;
                return (
                  <Fragment key={portfolio.eaUserId}>
                    <tr className={selected ? "bg-blue-50" : "bg-white"}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{portfolio.eaDisplayName}</p>
                        <p className="text-xs text-slate-500">{portfolio.schoolLabels.join(", ") || "School not attributed"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{portfolio.currentGroupCount}</p>
                        <p className="text-xs text-slate-500">{portfolio.totalRecentSessions} recent sessions · {portfolio.averageRecentSessionsPerGroup.toFixed(1)} per group</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{portfolio.trackerStartedCount}/{portfolio.rosterSize}</p>
                        <p className="text-xs text-slate-500">{coverage(portfolio.trackerCoverage)}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        <p>{portfolio.lowTrackerGroupCount} of {portfolio.currentGroupCount} low tracker</p>
                        <p>{portfolio.aheadEvidenceGroupCount} of {portfolio.currentGroupCount} ahead evidence</p>
                        <p>{portfolio.inactiveGroupCount} of {portfolio.currentGroupCount} no recent session</p>
                      </td>
                      <td className="px-4 py-3"><PortfolioLetterFocus portfolio={portfolio} /></td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEaId(portfolio.eaUserId);
                            setExpandedEaId(expanded ? null : portfolio.eaUserId);
                          }}
                          aria-expanded={expanded}
                          aria-controls={evidenceId}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {expanded ? "Hide" : "Inspect"}
                          {expanded
                            ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                            : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
                        </button>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr id={evidenceId} className={selected ? "bg-blue-50" : "bg-white"}>
                        <td colSpan={6} className="p-0">
                          <PortfolioExpansion portfolio={portfolio} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {portfolios.map((portfolio) => {
            const expanded = portfolio.eaUserId === expandedEaId;
            const selected = portfolio.eaUserId === selectedEaId;
            return (
              <article key={portfolio.eaUserId} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${selected ? "border-blue-400 ring-1 ring-blue-300" : "border-slate-200"}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3"><div><h4 className="font-semibold text-slate-900">{portfolio.eaDisplayName}</h4><p className="text-xs text-slate-500">{portfolio.schoolLabels.join(", ") || "School not attributed"}</p></div><PortfolioLetterFocus portfolio={portfolio} /></div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-500">Groups / sessions</dt><dd className="font-semibold">{portfolio.currentGroupCount} / {portfolio.totalRecentSessions}</dd></div><div><dt className="text-slate-500">Tracker started</dt><dd className="font-semibold">{portfolio.trackerStartedCount}/{portfolio.rosterSize} · {coverage(portfolio.trackerCoverage)}</dd></div><div><dt className="text-slate-500">Ahead evidence</dt><dd className="font-semibold">{portfolio.aheadEvidenceGroupCount} of {portfolio.currentGroupCount} groups</dd></div><div><dt className="text-slate-500">No recent session</dt><dd className="font-semibold">{portfolio.inactiveGroupCount} of {portfolio.currentGroupCount} groups</dd></div></dl>
                  <button type="button" onClick={() => { setSelectedEaId(portfolio.eaUserId); setExpandedEaId(expanded ? null : portfolio.eaUserId); }} aria-expanded={expanded} className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary">{expanded ? "Hide group evidence" : "Inspect group evidence"}{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>
                </div>
                {expanded ? <PortfolioExpansion portfolio={portfolio} /> : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
