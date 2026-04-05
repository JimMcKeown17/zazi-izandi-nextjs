import type { SchoolDetailResponse } from "@/lib/pm/types";
import { KPICard } from "@/components/pm/shared/kpi-card";
import { getDosageLevel, DOSAGE_COLORS } from "@/lib/pm/constants";

interface SchoolDetailHeaderProps {
  school: SchoolDetailResponse;
}

export function SchoolDetailHeader({ school }: SchoolDetailHeaderProps) {
  const dosageLevel = getDosageLevel(school.avg_sessions_per_group_per_week);
  const dosageColors = DOSAGE_COLORS[dosageLevel];

  return (
    <div className="space-y-4">
      {/* School identity */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{school.school_name}</h1>
        <p className="text-sm text-slate-500 capitalize mt-0.5">{school.school_type}</p>
      </div>

      {/* 6 KPI cards: 2 cols mobile / 3 cols md / 6 cols lg */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          label="EAs"
          value={school.ea_count}
          borderColor="border-l-primary"
        />
        <KPICard
          label="Children"
          value={school.children_count.toLocaleString()}
          borderColor="border-l-primary"
        />
        <KPICard
          label="Groups"
          value={school.groups_count}
          borderColor="border-l-primary"
        />
        <KPICard
          label="Total Sessions"
          value={school.total_sessions.toLocaleString()}
          borderColor="border-l-primary"
        />
        <KPICard
          label="Dosage"
          value={school.avg_sessions_per_group_per_week.toFixed(1)}
          subtitle={dosageColors.label}
          borderColor={`border-l-[${dosageColors.fill}]`}
        />
        <KPICard
          label="Flags"
          value={school.flags.length}
          borderColor={school.flags.length > 0 ? "border-l-red-500" : "border-l-slate-300"}
        />
      </div>
    </div>
  );
}
