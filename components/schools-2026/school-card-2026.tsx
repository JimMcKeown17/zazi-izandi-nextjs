"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  EnrichedSchool2026,
  EADetail,
} from "@/lib/schools-2026/types";

interface SchoolCard2026Props {
  data: EnrichedSchool2026;
  groupsAvailable: boolean;
}

// ─── Dosage color logic (shared across school + EA levels) ───────

type DosageLevel = "green" | "yellow" | "red";

function getDosageLevel(avg: number): DosageLevel {
  if (avg >= 3) return "green";
  if (avg >= 2) return "yellow";
  return "red";
}

function getAvgDayColor(val: number | null): string {
  if (val === null) return "text-gray-400";
  if (val >= 2.5) return "text-green-700";
  if (val >= 1.5) return "text-yellow-700";
  return "text-red-700";
}

function getAvgDayBorder(val: number | null): string {
  if (val === null) return "";
  if (val >= 2.5) return "border-l-green-500 border-l-2";
  if (val >= 1.5) return "border-l-yellow-500 border-l-2";
  return "border-l-red-500 border-l-2";
}

const DOSAGE_STYLES = {
  green: {
    bg: "bg-gradient-to-br from-green-50 to-emerald-50",
    border: "border-green-500",
    badgeBg: "bg-green-500",
    badgePill: "bg-green-100 text-green-800",
    text: "text-green-700",
    label: "On Track",
  },
  yellow: {
    bg: "bg-gradient-to-br from-yellow-50 to-amber-50",
    border: "border-yellow-500",
    badgeBg: "bg-yellow-500",
    badgePill: "bg-yellow-100 text-yellow-800",
    text: "text-yellow-700",
    label: "Needs Attention",
  },
  red: {
    bg: "bg-gradient-to-br from-red-50 to-rose-50",
    border: "border-red-500",
    badgeBg: "bg-red-500",
    badgePill: "bg-red-100 text-red-800",
    text: "text-red-700",
    label: "Low Dosage",
  },
} as const;

const EA_PILL_STYLES = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
} as const;

const EA_BORDER_STYLES = {
  green: "border-l-green-500",
  yellow: "border-l-yellow-500",
  red: "border-l-red-500",
} as const;

// ─── Flag badge config ──────────────────────────────────────────

const FLAG_LABELS: Record<string, { label: string; className: string }> = {
  stagnation: { label: "Stagnation", className: "bg-red-50 border-red-400 text-red-700" },
  same_letter_group: {
    label: "Same Letter",
    className: "bg-orange-50 border-orange-400 text-orange-700",
  },
  moving_too_fast: {
    label: "Moving Fast",
    className: "bg-amber-50 border-amber-400 text-amber-700",
  },
  ghost_group: { label: "Ghost Group", className: "bg-gray-100 border-gray-400 text-gray-700" },
  curriculum_gaps: {
    label: "Curriculum Gaps",
    className: "bg-purple-50 border-purple-400 text-purple-700",
  },
};

// ─── Main Component ─────────────────────────────────────────────

export default function SchoolCard2026({
  data,
  groupsAvailable,
}: SchoolCard2026Props) {
  const [expanded, setExpanded] = useState(false);
  const level = getDosageLevel(data.avg_sessions_per_group_per_week);
  const style = DOSAGE_STYLES[level];

  return (
    <Card
      className={`${style.bg} ${style.border} border-l-4 hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col`}
    >
      <CardHeader className="pb-3">
        {/* Header: name + dosage badge */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {data.school_name}
            </h3>
            <Badge variant="outline" className="text-xs font-medium">
              {data.school_type}
            </Badge>
          </div>
          <div
            className={`${style.badgeBg} text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm shrink-0 ml-2`}
          >
            {style.label}
          </div>
        </div>

        {/* EA name pills */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
          <Users className="h-4 w-4 shrink-0" />
          <div className="flex flex-wrap gap-1.5">
            {data.eas.map((ea) => {
              const eaLevel = getDosageLevel(ea.avg_sessions_per_group_per_week);
              return (
                <span
                  key={ea.name}
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${EA_PILL_STYLES[eaLevel]}`}
                >
                  {ea.name}
                  {ea.has_flags && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  )}
                </span>
              );
            })}
            {data.eas.length === 0 && data.ea_count > 0 && (
              <span className="text-sm text-gray-400 italic">
                {data.ea_count} EAs
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 flex-1 flex flex-col">
        {/* Counts row — compact horizontal */}
        <div className="flex gap-4 text-sm">
          <div className="bg-white/70 rounded-lg px-4 py-2 flex items-center gap-2">
            <span className="text-gray-500">EAs</span>
            <span className="font-bold text-gray-900">{data.ea_count}</span>
          </div>
          <div className="bg-white/70 rounded-lg px-4 py-2 flex items-center gap-2">
            <span className="text-gray-500">Children</span>
            <span className="font-bold text-gray-900">{data.children_count}</span>
          </div>
        </div>

        {/* Key performance metrics — 3 prominent boxes */}
        <div className="grid grid-cols-3 gap-3">
          <div
            className={`bg-white/70 rounded-lg p-3 text-center ${getAvgDayBorder(data.avg_per_day_worked)}`}
          >
            <div className="text-xs text-gray-500 mb-0.5">Avg / Day Worked</div>
            <div className={`text-xl font-bold ${getAvgDayColor(data.avg_per_day_worked)}`}>
              {data.avg_per_day_worked?.toFixed(1) ?? "—"}
            </div>
          </div>
          <div
            className={`bg-white/70 rounded-lg p-3 text-center ${style.border} border-l-2`}
          >
            <div className="text-xs text-gray-500 mb-1">Dosage</div>
            <div className={`text-xl font-bold ${style.text}`}>
              {data.weighted_dosage.toFixed(1)}
            </div>
          </div>
          <div className="bg-white/70 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Sessions This Wk</div>
            <div className="text-xl font-bold text-gray-900">
              {data.sessions_this_week}
            </div>
          </div>
        </div>

        {/* Flag bar */}
        <FlagBar
          totalFlags={data.total_flags}
          breakdown={data.flag_breakdown}
        />

        {/* Spacer to push expand toggle to bottom */}
        <div className="flex-1" />

        {/* Expand toggle */}
        {groupsAvailable && data.eas.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm text-gray-400 hover:text-gray-600 hover:bg-white/40 transition-colors border-t border-gray-200/60 rounded-b-lg"
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
        <div className="bg-gray-50/80 border-t-2 border-gray-200 px-5 py-5 space-y-4">
          {data.eas.map((ea) => (
            <EADetailRow key={ea.name} ea={ea} />
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Flag Bar (collapsed) ───────────────────────────────────────

function FlagBar({
  totalFlags,
  breakdown,
}: {
  totalFlags: number;
  breakdown: EnrichedSchool2026["flag_breakdown"];
}) {
  if (totalFlags === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
        <Check className="h-4 w-4" />
        <span>No active flags</span>
      </div>
    );
  }

  const flagTypes = Object.entries(breakdown)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => {
      const config = FLAG_LABELS[key];
      return { key, text: `${config?.label ?? key}: ${count}`, config };
    });

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
      <span className="flex items-center gap-1.5 text-sm text-amber-800 font-semibold">
        <AlertTriangle className="h-4 w-4" />
        {totalFlags} flag{totalFlags !== 1 ? "s" : ""}
      </span>
      {flagTypes.map(({ key, text, config }) => (
        <Badge
          key={key}
          variant="outline"
          className={`text-xs gap-1 ${config?.className ?? ""}`}
        >
          <AlertTriangle className="h-3 w-3" />
          {text}
        </Badge>
      ))}
    </div>
  );
}

// ─── EA Detail Row (expanded) ───────────────────────────────────

function EADetailRow({ ea }: { ea: EADetail }) {
  const level = getDosageLevel(ea.avg_sessions_per_group_per_week);

  // Collect active flag types across all groups
  const activeFlags = new Set<string>();
  for (const g of ea.groups) {
    for (const [key, val] of Object.entries(g.flags)) {
      if (val) activeFlags.add(key);
    }
  }

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 border-l-4 ${EA_BORDER_STYLES[level]} p-4`}
    >
      {/* EA header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-base text-gray-900">{ea.name}</span>
        <span className="text-sm text-gray-500">
          {ea.groups_count} groups · {ea.children_count} children ·{" "}
          {ea.sessions_this_week} this wk
        </span>
      </div>

      {/* Per-EA metric boxes */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className={`bg-gray-50 rounded-lg p-3 text-center ${getAvgDayBorder(ea.avg_per_day_worked)}`}>
          <div className="text-xs text-gray-500 mb-0.5">Avg / Day Worked</div>
          <div className={`text-lg font-bold ${getAvgDayColor(ea.avg_per_day_worked)}`}>
            {ea.avg_per_day_worked?.toFixed(1) ?? "—"}
          </div>
          <div className="text-[0.6rem] text-gray-400">last 10 days</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Avg / Prog Day</div>
          <div className={`text-lg font-bold ${getAvgDayColor(ea.avg_per_programme_day)}`}>
            {ea.avg_per_programme_day?.toFixed(1) ?? "—"}
          </div>
        </div>
        <div className={`bg-gray-50 rounded-lg p-3 text-center ${DOSAGE_STYLES[level].border} border-l-2`}>
          <div className="text-xs text-gray-500 mb-1">Dosage</div>
          <div className={`text-lg font-bold ${DOSAGE_STYLES[level].text}`}>
            {ea.weighted_dosage.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Flag badges */}
      {activeFlags.size > 0 ? (
        <div className="flex flex-wrap gap-2">
          {Array.from(activeFlags).map((flag) => {
            const config = FLAG_LABELS[flag];
            if (!config) return null;
            const count = ea.groups.filter(
              (g) => g.flags[flag as keyof typeof g.flags]
            ).length;
            return (
              <Badge
                key={flag}
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
        <div className="text-sm text-gray-400 italic">No flags</div>
      )}
    </div>
  );
}
