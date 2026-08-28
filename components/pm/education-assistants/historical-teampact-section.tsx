import { AlertTriangle, Info } from "lucide-react";

import { EAScatterChart } from "@/components/pm/education-assistants/ea-scatter-chart";
import { HistoricalTeamPactDisclosure } from "@/components/pm/education-assistants/historical-teampact-disclosure";
import { KPICard } from "@/components/pm/shared/kpi-card";
import { getEAPerformance, getEAPerformanceHistory } from "@/lib/pm/api";
import type { Cohort } from "@/lib/pm/cohorts";
import { summarizeImproving } from "@/lib/pm/ea-history-utils";

export async function HistoricalTeamPactSection({
  cohort,
  cohortLabel,
  defaultOpen,
}: {
  cohort: Cohort;
  cohortLabel: string;
  defaultOpen: boolean;
}) {
  const [currentResult, historyResult] = await Promise.all([
    getEAPerformance(cohort),
    getEAPerformanceHistory(cohort),
  ]);
  const { data, isLive } = currentResult;
  const { data: history, isLive: historyIsLive } = historyResult;
  const { summary } = data;
  const improvingSummary = summarizeImproving(history, historyIsLive, "4w");
  const { improving, total: improvingDenominator } = improvingSummary;
  const improvingPct =
    improvingDenominator > 0
      ? Math.round((improving / improvingDenominator) * 100)
      : null;

  return (
    <HistoricalTeamPactDisclosure defaultOpen={defaultOpen}>
      <div className="space-y-4" data-testid="historical-teampact-content">
        <div className="flex items-start gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          <p>
            This historical view uses the legacy TeamPact alignment measure. It is not
            Letter Focus Score, and the two values should not be compared directly.
          </p>
        </div>

        {!isLive ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
            <div className="text-amber-800">
              <span className="font-semibold">EA performance data unavailable.</span>{" "}
              The EA performance API is not responding. Data shown below may be empty.
            </div>
          </div>
        ) : null}
        {isLive && !historyIsLive ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
            <div className="text-amber-800">
              <span className="font-semibold">Trend history is temporarily unavailable.</span>{" "}
              Current EA positions are still shown.
            </div>
          </div>
        ) : null}

        <p className="text-sm text-slate-600">
          {cohortLabel} — {summary.total_eas} EAs with letters groups
        </p>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <KPICard label="EAs Plotted" value={summary.total_eas} subtitle="with letters groups" borderColor="border-l-primary" />
          <KPICard
            label="Top Right"
            value={summary.total_eas > 0 ? `${Math.round((summary.quadrant_counts.top_right / summary.total_eas) * 100)}%` : "—"}
            subtitle={`${summary.quadrant_counts.top_right} of ${summary.total_eas} high quality + dosage`}
            borderColor="border-l-green-500"
          />
          <KPICard
            label="Improving"
            value={improvingPct !== null ? `${improvingPct}%` : "—"}
            subtitle={
              improvingSummary.status === "unavailable"
                ? "trend history unavailable"
                : improvingDenominator > 0
                  ? `${improving} of ${improvingDenominator} trending up over 4w`
                  : "not enough history yet"
            }
            borderColor="border-l-emerald-500"
          />
          <KPICard label="Avg Sessions/Day" value={summary.avg_sessions_per_programme_day} subtitle="programme average" borderColor="border-l-amber-500" />
          <KPICard label="Avg Alignment" value={`${summary.avg_alignment_score}%`} subtitle="letters groups only" borderColor="border-l-violet-500" />
        </div>

        <EAScatterChart eas={data.eas} history={history} historyIsLive={historyIsLive} />
      </div>
    </HistoricalTeamPactDisclosure>
  );
}
