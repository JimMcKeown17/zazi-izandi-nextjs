import { Activity, CircleAlert, PauseCircle, ScanSearch } from "lucide-react";

import { formatCoverage } from "@/lib/mobile/programme-fidelity/presentation";
import type { ProgrammeFidelityResponse } from "@/lib/mobile/programme-fidelity/types";

const TILES = [
  {
    key: "groups_needing_attention" as const,
    label: "Current groups needing a check",
    Icon: CircleAlert,
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    key: "active_groups" as const,
    label: "Current groups with sessions",
    Icon: Activity,
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    key: "inactive_groups" as const,
    label: "Current groups without sessions",
    Icon: PauseCircle,
    color: "text-rose-700 bg-rose-50 border-rose-200",
  },
] as const;

export function FidelitySummaryTiles({
  aggregates,
}: {
  aggregates: ProgrammeFidelityResponse["aggregates"];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {TILES.map(({ key, label, Icon, color }) => (
        <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className={`inline-flex rounded-lg border p-2 ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{aggregates[key]}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{label}</p>
        </div>
      ))}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="inline-flex rounded-lg border border-blue-200 bg-blue-50 p-2 text-primary">
          <ScanSearch className="h-4 w-4" />
        </div>
        <p className="mt-3 text-2xl font-bold text-slate-900">
          {formatCoverage(aggregates.tracker_coverage)}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Letter tracker coverage · {aggregates.tracker_started_count}/{aggregates.tracker_roster_size} current learners started
        </p>
      </div>
    </div>
  );
}
