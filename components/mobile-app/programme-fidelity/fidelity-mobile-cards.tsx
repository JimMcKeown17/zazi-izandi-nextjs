import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

import {
  FidelityAlignment,
  FidelityCurrentGuidance,
  FidelityOwnership,
} from "./fidelity-table";
import { FidelityReason } from "./fidelity-reason";
import { FidelitySessionDetails } from "./fidelity-session-details";
import {
  buildProgrammeFidelityHref,
  formatCoverage,
} from "@/lib/mobile/programme-fidelity/presentation";
import type {
  ProgrammeFidelityExpansion,
  ProgrammeFidelityFilters,
  ProgrammeFidelityResult,
  ProgrammeFidelityRow,
  ProgrammeFidelitySessionResponse,
} from "@/lib/mobile/programme-fidelity/types";

export function FidelityMobileCards({
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
    <div className="grid gap-3 lg:hidden">
      {rows.map((row) => {
        const expanded = expansion?.groupId === row.group_id && expansion.eaUserId === row.ea_user_id;
        return (
          <article
            key={`${row.group_id}-${row.ea_user_id}`}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm [contain-intrinsic-size:auto_34rem] [content-visibility:auto]"
          >
            <div className="min-w-0">
              <h2 className="break-words font-bold text-slate-900">{row.ea_display_name}</h2>
              <p className="mt-1 break-words text-sm text-slate-700">{row.group_name}</p>
              <p className="mt-1 break-words text-xs text-slate-500">{row.school_name ?? "School not attributed"}</p>
              <div className="mt-2">
                <FidelityOwnership row={row} />
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-lg border border-slate-100 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Current letter guidance</p>
                <FidelityCurrentGuidance row={row} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Mobile sessions</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{row.recent_session_count}</p>
                  <p className="text-xs text-slate-500">Last: {row.last_session_date ?? "None"}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Tracker</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{row.is_current_owner ? formatCoverage(row.tracker_coverage) : "—"}</p>
                  <p className="text-xs text-slate-500">{row.is_current_owner ? `${row.started_count}/${row.roster_size} started` : "No current letter guidance"}</p>
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Historical alignment</p>
                <FidelityAlignment row={row} />
              </div>
              <FidelityReason row={row} />
            </div>

            <Link
              href={buildProgrammeFidelityHref(filters, expanded ? null : { groupId: row.group_id, eaUserId: row.ea_user_id })}
              aria-expanded={expanded}
              className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700"
            >
              {expanded ? "Close session details" : "Show session details"}
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Link>
            {expanded ? <div className="mt-3"><FidelitySessionDetails result={sessionsResult} /></div> : null}
          </article>
        );
      })}
    </div>
  );
}
