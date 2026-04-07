"use client";

import { useState } from "react";
import type { GroupSummary } from "@/lib/pm/types";
import { Users, BarChart3, AlertTriangle, SkipForward, Info, Download, Loader2 } from "lucide-react";

interface Props {
  letterGroups: GroupSummary[];
  assessedGroups: GroupSummary[];
}

function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        onBlur={() => setOpen(false)}
        className="text-slate-400 hover:text-slate-600"
      >
        <Info className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-800 text-white text-[10px] rounded-lg p-2 shadow-lg">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </span>
  );
}

export function AlignmentKpis({ letterGroups, assessedGroups }: Props) {
  const [exporting, setExporting] = useState(false);

  const totalGroups = letterGroups.length;
  const assessedCount = assessedGroups.length;
  const unassessedCount = totalGroups - assessedCount;

  const avgAlignment = assessedGroups.length > 0
    ? Math.round(
        assessedGroups.reduce((sum, g) => sum + (g.alignment_avg_score ?? 0), 0) / assessedGroups.length
      )
    : 0;

  const teachingKnownCount = letterGroups.filter((g) => g.flags.teaching_known).length;
  const skippingNeededCount = letterGroups.filter((g) => g.flags.skipping_needed).length;

  async function exportUnmatched() {
    setExporting(true);
    try {
      const res = await fetch("/api/letter-alignment/unmatched/");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.length) {
        alert("No unmatched children found.");
        return;
      }
      const headers = ["participant_id", "participant_name", "school", "group", "ea"];
      const rows = data.map((r: Record<string, string | number>) =>
        headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
      );
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "unmatched-children.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Groups with Assessment Data */}
      <div className="bg-white rounded-lg shadow-sm p-3 border-l-3 border-l-primary">
        <div className="flex items-center gap-2 text-slate-500 mb-1">
          <Users className="h-4 w-4" />
          <span className="text-xs">Groups with Assessment Data</span>
        </div>
        <p className="text-xl font-bold text-slate-900">{assessedCount} / {totalGroups}</p>
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-slate-400">
            {unassessedCount} without linked assessments (ECD + unlinked)
          </p>
          {unassessedCount > 0 && (
            <button
              onClick={exportUnmatched}
              disabled={exporting}
              className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
              title="Download CSV of children without linked assessments"
            >
              {exporting ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Download className="h-2.5 w-2.5" />}
              Export
            </button>
          )}
        </div>
      </div>

      {/* Avg Alignment */}
      <div className={`bg-white rounded-lg shadow-sm p-3 border-l-3 ${
        avgAlignment >= 70 ? "border-l-green-500" : avgAlignment >= 50 ? "border-l-amber-500" : "border-l-red-500"
      }`}>
        <div className="flex items-center gap-2 text-slate-500 mb-1">
          <BarChart3 className="h-4 w-4" />
          <span className="text-xs">Avg Alignment</span>
          <Tooltip text="Alignment = % of letters being taught that the child actually needs. 100% = every taught letter is needed. 0% = every taught letter is already known. A child who knows most letters will score low even if the EA is teaching correctly for the group." />
        </div>
        <p className="text-xl font-bold text-slate-900">{avgAlignment}%</p>
        <p className="text-[10px] text-slate-400">across assessed children</p>
      </div>

      {/* Teaching Known */}
      <div className="bg-white rounded-lg shadow-sm p-3 border-l-3 border-l-amber-500">
        <div className="flex items-center gap-2 text-slate-500 mb-1">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-xs">Teaching Known</span>
        </div>
        <p className="text-xl font-bold text-slate-900">{teachingKnownCount}</p>
        <p className="text-[10px] text-slate-400">groups with over-teaching</p>
      </div>

      {/* Letters Skipped */}
      <div className="bg-white rounded-lg shadow-sm p-3 border-l-3 border-l-red-500">
        <div className="flex items-center gap-2 text-slate-500 mb-1">
          <SkipForward className="h-4 w-4" />
          <span className="text-xs">Letters Skipped</span>
        </div>
        <p className="text-xl font-bold text-slate-900">{skippingNeededCount}</p>
        <p className="text-[10px] text-slate-400">groups with letters skipped</p>
      </div>
    </div>
  );
}
