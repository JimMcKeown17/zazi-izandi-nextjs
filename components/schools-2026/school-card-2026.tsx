"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  CalendarDays,
  Baby,
  Layers,
  AlertTriangle,
  Activity,
} from "lucide-react";

export interface School2026Data {
  school_name: string;
  school_type: string;
  eas: string[];
  ea_count: number;
  children_count: number;
  groups_count: number;
  sessions_this_week: number;
  sessions_this_month: number;
  total_sessions: number;
  avg_sessions_per_group_per_week: number;
  flags: {
    same_letter_group: { flagged_eas: number; total_eas: number };
    moving_too_fast: { flagged_eas: number; total_eas: number };
  };
  latitude: number | null;
  longitude: number | null;
}

interface SchoolCard2026Props {
  data: School2026Data;
}

function getDosageStyle(avg: number) {
  if (avg >= 3)
    return {
      bg: "bg-gradient-to-br from-green-50 to-emerald-50",
      border: "border-green-500",
      badge: "bg-green-500",
      text: "text-green-700",
      label: "On Track",
    };
  if (avg >= 2)
    return {
      bg: "bg-gradient-to-br from-yellow-50 to-amber-50",
      border: "border-yellow-500",
      badge: "bg-yellow-500",
      text: "text-yellow-700",
      label: "Needs Attention",
    };
  return {
    bg: "bg-gradient-to-br from-red-50 to-rose-50",
    border: "border-red-500",
    badge: "bg-red-500",
    text: "text-red-700",
    label: "Low Dosage",
  };
}

export default function SchoolCard2026({ data }: SchoolCard2026Props) {
  const style = getDosageStyle(data.avg_sessions_per_group_per_week);
  const hasFlags =
    data.flags.same_letter_group.flagged_eas > 0 ||
    data.flags.moving_too_fast.flagged_eas > 0;

  return (
    <Card
      className={`${style.bg} ${style.border} border-l-4 hover:shadow-xl transition-all duration-300 overflow-hidden`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">
              {data.school_name}
            </h3>
            <Badge variant="outline" className="text-xs font-medium">
              {data.school_type}
            </Badge>
          </div>
          <div
            className={`${style.badge} text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm shrink-0 ml-2`}
          >
            {style.label}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
          <Users className="h-4 w-4 shrink-0" />
          <span className="font-medium truncate">
            {data.eas.length <= 3
              ? data.eas.join(", ")
              : `${data.eas.slice(0, 2).join(", ")} +${data.eas.length - 2} more`}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Session Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/70 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">This Week</div>
            <div className="text-2xl font-bold text-gray-900">
              {data.sessions_this_week}
            </div>
            <div className="text-xs text-gray-500">sessions</div>
          </div>
          <div className="bg-white/70 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">This Month</div>
            <div className="text-2xl font-bold text-primary">
              {data.sessions_this_month}
            </div>
            <div className="text-xs text-gray-500">sessions</div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/50 rounded-lg p-3 flex items-center gap-2">
            <Baby className={`h-5 w-5 ${style.text} shrink-0`} />
            <div>
              <div className="text-xs text-gray-500">Children</div>
              <div className="text-lg font-bold text-gray-900">
                {data.children_count}
              </div>
            </div>
          </div>
          <div className="bg-white/50 rounded-lg p-3 flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary shrink-0" />
            <div>
              <div className="text-xs text-gray-500">Groups</div>
              <div className="text-lg font-bold text-gray-900">
                {data.groups_count}
              </div>
            </div>
          </div>
          <div
            className={`bg-white/50 rounded-lg p-3 flex items-center gap-2 ${style.border} border-l-2`}
          >
            <Activity className={`h-5 w-5 ${style.text} shrink-0`} />
            <div>
              <div className="text-xs text-gray-500">Sess/Grp/Wk</div>
              <div className={`text-lg font-bold ${style.text}`}>
                {data.avg_sessions_per_group_per_week}
              </div>
            </div>
          </div>
        </div>

        {/* Flags */}
        {hasFlags && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
            {data.flags.same_letter_group.flagged_eas > 0 && (
              <Badge
                variant="outline"
                className="text-xs gap-1 bg-orange-50 border-orange-400 text-orange-700"
              >
                <AlertTriangle className="h-3 w-3" />
                Same Groups: {data.flags.same_letter_group.flagged_eas} EA
                {data.flags.same_letter_group.flagged_eas !== 1 ? "s" : ""}
              </Badge>
            )}
            {data.flags.moving_too_fast.flagged_eas > 0 && (
              <Badge
                variant="outline"
                className="text-xs gap-1 bg-red-50 border-red-400 text-red-700"
              >
                <AlertTriangle className="h-3 w-3" />
                Moving Fast: {data.flags.moving_too_fast.flagged_eas} EA
                {data.flags.moving_too_fast.flagged_eas !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
