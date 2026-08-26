import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Fragment } from "react";

import { FidelityReason } from "./fidelity-reason";
import { FidelitySessionDetails } from "./fidelity-session-details";
import {
  buildProgrammeFidelityHref,
  describeCurrentAdvice,
  formatCoverage,
} from "@/lib/mobile/programme-fidelity/presentation";
import type {
  ProgrammeFidelityExpansion,
  ProgrammeFidelityFilters,
  ProgrammeFidelityResult,
  ProgrammeFidelityRow,
  ProgrammeFidelitySessionResponse,
} from "@/lib/mobile/programme-fidelity/types";

export function FidelityOwnership({ row }: { row: ProgrammeFidelityRow }) {
  return row.is_current_owner ? (
    <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
      Current owner
    </span>
  ) : (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
      Historical activity · no current guidance
    </span>
  );
}

export function FidelityCurrentGuidance({ row }: { row: ProgrammeFidelityRow }) {
  return (
    <div>
      {row.is_current_owner && row.introduce_letters?.length ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {row.introduce_letters.map((letter) => (
            <span key={letter} className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              {letter}
            </span>
          ))}
        </div>
      ) : null}
      <p className="text-xs leading-relaxed text-slate-600">{describeCurrentAdvice(row)}</p>
    </div>
  );
}

export function FidelityAlignment({ row }: { row: ProgrammeFidelityRow }) {
  const statusLabel = {
    not_yet_available: "Not yet available",
    no_eligible_sessions: "No eligible sessions",
    partial: "Partial causal window",
    scored: "Full causal window",
  }[row.alignment_status];
  if (row.alignment_status === "not_yet_available") {
    return (
      <div className="text-xs text-slate-500">
        <p className="font-semibold text-slate-600">{statusLabel}</p>
        <p className="mt-1">Historical alignment not calculated</p>
      </div>
    );
  }
  if (row.score === null) {
    return (
      <div className="text-xs text-slate-500">
        <p className="font-semibold text-slate-600">{statusLabel}</p>
        <p className="mt-1">Not enough causal evidence</p>
        <p className="mt-1">{row.aligned_count} aligned · {row.below_count} below · {row.above_count} above · {row.unscored_count} unscored</p>
      </div>
    );
  }
  return (
    <div className="text-xs text-slate-600">
      <p className="mb-1 font-semibold text-slate-600">{statusLabel}</p>
      <strong className="text-base text-slate-900">{row.score.toFixed(1)}%</strong>
      <p className="mt-1">{row.aligned_count} aligned · {row.below_count} below · {row.above_count} above · {row.unscored_count} unscored</p>
    </div>
  );
}

export function FidelityTable({
  rows,
  filters,
  expansion,
  sessionsResult,
}: {
  rows: ProgrammeFidelityRow[];
  filters: ProgrammeFidelityFilters;
  expansion: ProgrammeFidelityExpansion | null;
  sessionsResult: ProgrammeFidelityResult<ProgrammeFidelitySessionResponse> | null;
}) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[70rem] border-collapse text-left">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">EA and group</th>
              <th className="px-4 py-3">Current letter guidance</th>
              <th className="px-4 py-3">Recent mobile activity</th>
              <th className="px-4 py-3">Tracker coverage</th>
              <th className="px-4 py-3">Historical alignment</th>
              <th className="px-4 py-3">Why check</th>
              <th className="px-4 py-3"><span className="sr-only">Details</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const expanded = expansion?.groupId === row.group_id && expansion.eaUserId === row.ea_user_id;
              return (
                <Fragment key={`${row.group_id}-${row.ea_user_id}`}>
                <tr className="align-top">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{row.ea_display_name}</p>
                    <p className="mt-1 text-sm text-slate-700">{row.group_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.school_name ?? "School not attributed"}</p>
                    <div className="mt-2"><FidelityOwnership row={row} /></div>
                  </td>
                  <td className="max-w-60 px-4 py-4"><FidelityCurrentGuidance row={row} /></td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    <strong>{row.recent_session_count}</strong> sessions
                    <p className="mt-1 text-xs text-slate-500">Last: {row.last_session_date ?? "None in window"}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {row.is_current_owner ? (
                      <><strong>{formatCoverage(row.tracker_coverage)}</strong><p className="mt-1 text-xs text-slate-500">{row.started_count}/{row.roster_size} started</p></>
                    ) : <span className="text-xs text-slate-500">Current letter tracker is unavailable for this historical row</span>}
                  </td>
                  <td className="max-w-48 px-4 py-4"><FidelityAlignment row={row} /></td>
                  <td className="max-w-80 px-4 py-4"><FidelityReason row={row} /></td>
                  <td className="px-4 py-4">
                    <Link
                      href={buildProgrammeFidelityHref(filters, expanded ? null : { groupId: row.group_id, eaUserId: row.ea_user_id })}
                      aria-expanded={expanded}
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {expanded ? "Close" : "Sessions"}
                      {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Link>
                  </td>
                </tr>
                {expanded ? (
                  <tr>
                    <td colSpan={7} className="bg-slate-50 px-4 py-4">
                      <FidelitySessionDetails result={sessionsResult} />
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
