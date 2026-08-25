import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

import { recentSessionsHref } from "@/lib/mobile/programme-fidelity/presentation";
import type { ProgrammeFidelityRow } from "@/lib/mobile/programme-fidelity/types";

export function FidelityReason({ row }: { row: ProgrammeFidelityRow }) {
  const quiet = row.primary_reason === "NO_IMMEDIATE_FLAG";
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-start gap-2">
        {quiet ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
        )}
        <div>
          <p className="font-semibold text-slate-800">{row.reason.title}</p>
          <p className="mt-1 leading-relaxed text-slate-600">{row.reason.observation}</p>
        </div>
      </div>
      <div className="rounded-lg bg-slate-50 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Next mentor check
        </p>
        <p className="mt-1 leading-relaxed text-slate-700">{row.reason.recommended_check}</p>
        {row.primary_reason === "NO_RECENT_MOBILE_SESSION" ? (
          <Link
            href={recentSessionsHref(row)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Open the 14-day sessions page <ArrowUpRight className="h-3 w-3" />
          </Link>
        ) : null}
      </div>
      {row.supporting_reasons.length ? (
        <ul className="space-y-1 text-xs text-slate-500">
          {row.supporting_reasons.map((reason) => (
            <li key={reason.code}>Also check: {reason.observation}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
