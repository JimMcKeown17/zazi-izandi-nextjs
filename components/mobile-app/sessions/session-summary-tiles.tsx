import { KPICard } from "@/components/pm/shared/kpi-card";
import type { MobileSessionsActivityResponse } from "@/lib/mobile/types";

export function SessionSummaryTiles({
  data,
}: {
  data: MobileSessionsActivityResponse;
}) {
  const totalSessions = data.daily_trend.reduce(
    (sum, point) => sum + point.total,
    0
  );
  const easWithSessions = data.ea_heatmap.eas.filter(
    (ea) => ea.total_sessions > 0
  ).length;
  const presentAttendances = data.ea_heatmap.eas.reduce(
    (sum, ea) => sum + ea.present_attendees,
    0
  );
  const unattributedSessions =
    data.school_summary.find((school) => school.school_id === null)
      ?.total_sessions ?? 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KPICard
        label="Teaching sessions"
        value={totalSessions.toLocaleString("en-ZA")}
        subtitle={`Across the full ${data.days}-day reporting window`}
      />
      <KPICard
        label="EAs with sessions"
        value={easWithSessions}
        subtitle={`${data.ea_heatmap.eas.length} EAs included in the report`}
        borderColor="border-l-green-500"
      />
      <KPICard
        label="Present attendances"
        value={presentAttendances.toLocaleString("en-ZA")}
        subtitle="Present learner records across teaching sessions"
        borderColor="border-l-violet-500"
      />
      <KPICard
        label="Unattributed sessions"
        value={unattributedSessions.toLocaleString("en-ZA")}
        subtitle="EAs without a current roster school"
        borderColor={
          unattributedSessions > 0 ? "border-l-amber-500" : "border-l-slate-300"
        }
      />
    </div>
  );
}
