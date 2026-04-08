"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDosageLevel, DOSAGE_LABELS } from "@/lib/schools-2026/dosage";
import type { EnrichedSchool2026, EADetail } from "@/lib/schools-2026/types";

interface SchoolCard2026Props {
  data: EnrichedSchool2026;
  groupsAvailable: boolean;
}

// ─── Styling maps ──────────────────────────────────────────────

const CHIP_STYLES = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
} as const;

const BORDER_COLORS = {
  green: "border-l-green-500",
  yellow: "border-l-amber-500",
  red: "border-l-red-500",
} as const;

const DOSAGE_TEXT = {
  green: "text-green-700",
  yellow: "text-amber-700",
  red: "text-red-700",
} as const;

const DOT_COLORS = {
  green: "bg-green-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
} as const;

function getAvgDayColor(val: number | null): string {
  if (val === null) return "text-gray-400";
  if (val >= 2.5) return "text-green-700";
  if (val >= 1.5) return "text-amber-700";
  return "text-red-700";
}

// ─── Allowed flags (EA dropdown only) ──────────────────────────

const ALLOWED_FLAGS = ["same_letter_group", "ghost_group", "moving_too_fast"] as const;

const FLAG_LABELS: Record<string, { label: string; className: string }> = {
  same_letter_group: {
    label: "Same Letter",
    className: "bg-orange-50 border-orange-300 text-orange-700",
  },
  ghost_group: {
    label: "Ghost Group",
    className: "bg-gray-50 border-gray-300 text-gray-600",
  },
  moving_too_fast: {
    label: "Moving Fast",
    className: "bg-amber-50 border-amber-300 text-amber-700",
  },
};

// ─── Main Component ────────────────────────────────────────────

export default function SchoolCard2026({
  data,
  groupsAvailable,
}: SchoolCard2026Props) {
  const [expanded, setExpanded] = useState(false);
  const level = getDosageLevel(data.avg_sessions_per_group_per_week, data.school_type);

  return (
    <Card
      className={`bg-white border border-gray-200 ${BORDER_COLORS[level]} border-l-[3px] hover:shadow-md transition-shadow duration-200 overflow-hidden h-full flex flex-col`}
    >
      <CardHeader className="pb-2 pt-5 px-6">
        {/* Header: name + status chip */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-xl font-semibold text-gray-900 leading-tight">
            {data.school_name}
          </h3>
          <span
            className={`${CHIP_STYLES[level]} text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 whitespace-nowrap`}
          >
            {DOSAGE_LABELS[level]}
          </span>
        </div>

        {/* Metadata line */}
        <p className="text-[13px] text-gray-500">
          {data.school_type} · {data.ea_count} EA{data.ea_count !== 1 ? "s" : ""} · {data.children_count} children
        </p>
      </CardHeader>

      <CardContent className="px-6 pb-5 flex-1 flex flex-col">
        {/* Hero metric: Dosage */}
        <div className="text-center py-4">
          <div className={`text-4xl font-bold ${DOSAGE_TEXT[level]}`}>
            {data.weighted_dosage.toFixed(1)}
          </div>
          <div className="text-[13px] text-gray-400 mt-0.5">
            sessions / group / week
          </div>
        </div>

        {/* Secondary stats — plain row */}
        <div className="flex justify-between text-sm mb-4">
          <div>
            <span className="text-gray-500">Avg/day worked </span>
            <span className={`font-medium ${getAvgDayColor(data.avg_per_day_worked)}`}>
              {data.avg_per_day_worked?.toFixed(1) ?? "—"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Sessions this week </span>
            <span className="font-medium text-gray-900">
              {data.sessions_this_week}
            </span>
          </div>
        </div>

        {/* EA name dots */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-3">
          {data.eas.map((ea) => {
            const eaLevel = getDosageLevel(
              ea.avg_sessions_per_group_per_week,
              data.school_type
            );
            return (
              <span
                key={ea.name}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-700"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[eaLevel]} shrink-0`}
                />
                {ea.name}
                {ea.has_flags && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                )}
              </span>
            );
          })}
          {data.eas.length === 0 && data.ea_count > 0 && (
            <span className="text-[13px] text-gray-400 italic">
              {data.ea_count} EA{data.ea_count !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Expand toggle */}
        {groupsAvailable && data.eas.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors border-t border-gray-100 mt-2"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" /> Expand EA detail
              </>
            )}
          </button>
        )}
      </CardContent>

      {/* ── Expanded Section ──────────────────────────── */}
      {expanded && (
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-5 space-y-3">
          {data.eas.map((ea) => (
            <EADetailRow
              key={ea.name}
              ea={ea}
              schoolType={data.school_type}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── EA Detail Row (expanded) ──────────────────────────────────

function EADetailRow({
  ea,
  schoolType,
}: {
  ea: EADetail;
  schoolType: string;
}) {
  const level = getDosageLevel(ea.avg_sessions_per_group_per_week, schoolType);

  // Collect only the 3 allowed flag types
  const activeFlags: { key: string; count: number }[] = [];
  for (const flagKey of ALLOWED_FLAGS) {
    const count = ea.groups.filter(
      (g) => g.flags[flagKey as keyof typeof g.flags]
    ).length;
    if (count > 0) {
      activeFlags.push({ key: flagKey, count });
    }
  }

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 border-l-2 ${BORDER_COLORS[level]} p-4`}
    >
      {/* EA header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-base text-gray-900">{ea.name}</span>
        <span className="text-sm text-gray-500">
          {ea.groups_count} group{ea.groups_count !== 1 ? "s" : ""} · {ea.children_count} children · {ea.sessions_this_week} this wk
        </span>
      </div>

      {/* Per-EA metrics — plain text, no boxes */}
      <div className="flex gap-6 text-sm mb-3">
        <div>
          <span className="text-gray-500">Avg/day </span>
          <span className={`font-medium ${getAvgDayColor(ea.avg_per_day_worked)}`}>
            {ea.avg_per_day_worked?.toFixed(1) ?? "—"}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Avg/prog day </span>
          <span className={`font-medium ${getAvgDayColor(ea.avg_per_programme_day)}`}>
            {ea.avg_per_programme_day?.toFixed(1) ?? "—"}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Dosage </span>
          <span className={`font-medium ${DOSAGE_TEXT[level]}`}>
            {ea.weighted_dosage.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Flag badges — only allowed 3 types */}
      {activeFlags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activeFlags.map(({ key, count }) => {
            const config = FLAG_LABELS[key];
            if (!config) return null;
            return (
              <Badge
                key={key}
                variant="outline"
                className={`text-xs gap-1 ${config.className}`}
              >
                <AlertTriangle className="h-3 w-3" />
                {config.label}: {count}
              </Badge>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-gray-400">No flags</div>
      )}
    </div>
  );
}
