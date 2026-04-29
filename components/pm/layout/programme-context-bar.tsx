import type { ProgrammeOverviewResponse } from "@/lib/pm/types";
import { HealthBadge } from "@/components/pm/shared/health-badge";

interface ProgrammeContextBarProps {
  data: ProgrammeOverviewResponse;
}

function formatRelativeTime(hours: number): string {
  if (hours < 1) return "< 1h ago";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ProgrammeContextBar({ data }: ProgrammeContextBarProps) {
  const { programme, data_health, health } = data;
  const weekProgress = programme.teaching_total_weeks > 0
    ? Math.min((programme.teaching_week / programme.teaching_total_weeks) * 100, 100)
    : 0;

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
      {/* Left: programme year + week progress */}
      <div className="flex items-center gap-4 min-w-0">
        <span className="text-accent-yellow font-bold text-sm shrink-0">
          {programme.year} Programme
        </span>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-slate-300 text-xs whitespace-nowrap">
            Teaching Week {programme.teaching_week} of {programme.teaching_total_weeks}
          </span>

          {/* Mini progress bar — 64px wide */}
          <div className="w-16 h-1.5 rounded-full bg-slate-600 shrink-0">
            <div
              className="h-1.5 rounded-full bg-accent-yellow transition-all"
              style={{ width: `${weekProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Right: data freshness + health badge */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-slate-400 text-xs whitespace-nowrap">
          {data_health.last_sync
            ? <>Data as of {formatDate(data_health.last_sync)} &middot; {formatRelativeTime(data_health.freshness_hours)}</>
            : "No data available"}
        </span>

        <HealthBadge health={health} />
      </div>
    </div>
  );
}
