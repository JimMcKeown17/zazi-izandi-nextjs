import type { ProgrammeOverviewResponse } from "@/lib/pm/types";
import { getDosageLevel, DOSAGE_COLORS } from "@/lib/pm/constants";
import { KPICard } from "@/components/pm/shared/kpi-card";

interface OverviewKPIsProps {
  data: ProgrammeOverviewResponse;
}

function getDosageBorderColor(avg: number): string {
  const level = getDosageLevel(avg);
  return DOSAGE_COLORS[level].border.replace("border-", "border-l-");
}

function getRateBorderColor(rate: number): string {
  if (rate >= 80) return "border-l-green-500";
  if (rate >= 60) return "border-l-amber-500";
  return "border-l-red-500";
}

function getSessionsPerDayBorderColor(rate: number): string {
  if (rate >= 2.5) return "border-l-green-500";
  if (rate >= 1.5) return "border-l-amber-500";
  return "border-l-red-500";
}

function getSessionsPerProgrammeDayBorderColor(rate: number): string {
  if (rate >= 2.0) return "border-l-green-500";
  if (rate >= 1.2) return "border-l-amber-500";
  return "border-l-red-500";
}

export function OverviewKPIs({ data }: OverviewKPIsProps) {
  const { kpis, targets } = data;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Row 1: Aggregate — stable informational numbers ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* 1. Schools */}
        <KPICard
          label="Schools"
          value={kpis.total_schools}
          subtitle={`${kpis.total_schools_primary} Primary · ${kpis.total_schools_ecd} ECD`}
          borderColor="border-l-blue-500"
        />

        {/* 2. EAs & Children */}
        <KPICard
          label="EAs & Children"
          value={kpis.total_eas}
          subtitle={`${kpis.total_children.toLocaleString()} children enrolled`}
          borderColor="border-l-purple-500"
        />

        {/* 3. Sessions This Month */}
        <KPICard
          label="Sessions This Month"
          value={kpis.total_sessions_this_month.toLocaleString()}
          subtitle={`${kpis.total_sessions_this_week.toLocaleString()} this week · ${kpis.total_sessions_all_time.toLocaleString()} all-time`}
          borderColor="border-l-cyan-500"
        />
      </div>

      {/* ── Row 2: Group performance — with targets ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* 4. Weighted Dosage */}
        <KPICard
          label="Weighted Dosage"
          value={kpis.weighted_dosage.toFixed(1)}
          subtitle="sessions / group / week"
          borderColor={getDosageBorderColor(kpis.weighted_dosage)}
          target={{
            value: targets.dosage,
            actual: kpis.weighted_dosage,
            label: `Target: ${targets.dosage} sessions/grp/wk`,
          }}
        />

        {/* 5. On-Track Groups */}
        <KPICard
          label="On-Track Groups"
          value={`${kpis.on_track_group_rate.toFixed(1)}%`}
          subtitle="groups meeting dosage target"
          borderColor={getRateBorderColor(kpis.on_track_group_rate)}
          target={{
            value: targets.on_track_pct,
            actual: kpis.on_track_group_rate,
            label: `Target: ${targets.on_track_pct}%`,
          }}
        />

        {/* 6. Active Flags */}
        <KPICard
          label="Active Flags"
          value={kpis.active_flags}
          subtitle={`${Math.round(kpis.flag_resolution_rate_14d)}% resolution rate (14d)`}
          borderColor="border-l-red-500"
          trend={{
            value: kpis.flags_delta_week,
            label: "from last week",
          }}
          badges={[
            {
              label: `${kpis.flag_lifecycle.new} new`,
              className: "bg-red-50 text-red-700 border border-red-200",
            },
            {
              label: `${kpis.flag_lifecycle.in_progress} in progress`,
              className: "bg-amber-50 text-amber-700 border border-amber-200",
            },
            {
              label: `${kpis.flag_lifecycle.resolved_this_week} resolved`,
              className: "bg-green-50 text-green-700 border border-green-200",
            },
          ]}
        />
      </div>

      {/* ── Row 3: EA performance (new) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* 7. Avg Sessions / Day Worked */}
        <KPICard
          label="Avg Sessions / Day Worked"
          value={kpis.avg_sessions_per_day_worked.toFixed(1)}
          subtitle="on days EAs run sessions"
          borderColor={getSessionsPerDayBorderColor(kpis.avg_sessions_per_day_worked)}
        />

        {/* 8. On-Track EAs */}
        <KPICard
          label="On-Track EAs"
          value={`${kpis.pct_eas_on_track.toFixed(1)}%`}
          subtitle="EAs averaging ≥ 2.5 sessions/day"
          borderColor={getRateBorderColor(kpis.pct_eas_on_track)}
          target={{
            value: targets.on_track_pct,
            actual: kpis.pct_eas_on_track,
            label: `Target: ${targets.on_track_pct}%`,
          }}
        />

        {/* 9. Avg Sessions / Programme Day */}
        <KPICard
          label="Avg Sessions / Programme Day"
          value={kpis.avg_sessions_per_programme_day.toFixed(1)}
          subtitle="across all work days (excl. holidays)"
          borderColor={getSessionsPerProgrammeDayBorderColor(
            kpis.avg_sessions_per_programme_day
          )}
        />
      </div>
    </div>
  );
}
