import type { GroupSummary } from "@/lib/pm/types";
import { Users, BarChart3, AlertTriangle, SkipForward } from "lucide-react";

interface Props {
  letterGroups: GroupSummary[];
  assessedGroups: GroupSummary[];
}

export function AlignmentKpis({ letterGroups, assessedGroups }: Props) {
  const totalGroups = letterGroups.length;
  const assessedCount = assessedGroups.length;
  const coveragePct = totalGroups > 0 ? Math.round((assessedCount / totalGroups) * 100) : 0;

  const avgAlignment = assessedGroups.length > 0
    ? Math.round(
        assessedGroups.reduce((sum, g) => sum + (g.alignment_avg_score ?? 0), 0) / assessedGroups.length
      )
    : 0;

  const teachingKnownCount = letterGroups.filter((g) => g.flags.teaching_known).length;
  const skippingNeededCount = letterGroups.filter((g) => g.flags.skipping_needed).length;

  const cards = [
    {
      label: "Groups Assessed",
      value: `${assessedCount} / ${totalGroups}`,
      sub: `${coveragePct}% coverage`,
      icon: <Users className="h-4 w-4" />,
      color: "border-l-primary",
    },
    {
      label: "Avg Alignment",
      value: `${avgAlignment}%`,
      sub: "across assessed children",
      icon: <BarChart3 className="h-4 w-4" />,
      color: avgAlignment >= 70 ? "border-l-green-500" : avgAlignment >= 50 ? "border-l-amber-500" : "border-l-red-500",
    },
    {
      label: "Teaching Known",
      value: String(teachingKnownCount),
      sub: "groups with over-teaching",
      icon: <AlertTriangle className="h-4 w-4" />,
      color: "border-l-amber-500",
    },
    {
      label: "Skipping Needed",
      value: String(skippingNeededCount),
      sub: "groups with skipped letters",
      icon: <SkipForward className="h-4 w-4" />,
      color: "border-l-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-white rounded-lg shadow-sm p-3 border-l-3 ${card.color}`}
        >
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            {card.icon}
            <span className="text-xs">{card.label}</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{card.value}</p>
          <p className="text-[10px] text-slate-400">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
