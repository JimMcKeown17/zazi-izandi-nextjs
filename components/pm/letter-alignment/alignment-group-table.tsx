"use client";

import { useState } from "react";
import type { GroupSummary, LetterAlignmentResponse, FlagEvidenceResponse } from "@/lib/pm/types";
import { LETTER_SEQUENCES, DEFAULT_LANGUAGE } from "@/lib/pm/constants";
import { AlignmentHeatmap } from "./alignment-heatmap";
import { RecentSessionsPanel } from "./recent-sessions-panel";
import { ChevronDown, ChevronRight, Loader2, Info } from "lucide-react";

interface Props {
  groups: GroupSummary[];
}

const LANG_BADGE: Record<string, string> = {
  isiXhosa: "bg-indigo-100 text-indigo-700",
  English: "bg-orange-100 text-orange-700",
  Afrikaans: "bg-green-100 text-green-700",
};

function alignmentColor(score: number | null | undefined): string {
  if (score == null) return "text-slate-400";
  if (score >= 70) return "text-green-600 font-semibold";
  if (score >= 50) return "text-amber-600 font-semibold";
  return "text-red-600 font-semibold";
}

export function AlignmentGroupTable({ groups }: Props) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [alignmentData, setAlignmentData] = useState<LetterAlignmentResponse | null>(null);
  const [sessionsData, setSessionsData] = useState<FlagEvidenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"school" | "alignment" | "flags">("school");

  const letterGroups = groups.filter((g) => g.phase === "letters");

  const filtered = letterGroups.filter((g) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      g.program_name.toLowerCase().includes(q) ||
      g.ea_name.toLowerCase().includes(q) ||
      g.class_name.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "alignment") {
      return (a.alignment_avg_score ?? 101) - (b.alignment_avg_score ?? 101);
    }
    if (sortBy === "flags") {
      const aFlags = (a.flags.teaching_known ? 1 : 0) + (a.flags.skipping_needed ? 1 : 0);
      const bFlags = (b.flags.teaching_known ? 1 : 0) + (b.flags.skipping_needed ? 1 : 0);
      return bFlags - aFlags;
    }
    return a.program_name.localeCompare(b.program_name);
  });

  async function handleExpand(g: GroupSummary) {
    const key = `${g.program_name}|${g.class_name}`;
    if (expandedGroup === key) {
      setExpandedGroup(null);
      setAlignmentData(null);
      setSessionsData(null);
      return;
    }

    setExpandedGroup(key);
    setLoading(true);
    setAlignmentData(null);
    setSessionsData(null);

    try {
      // Fetch both alignment and session data in parallel
      const [alignRes, sessionsRes] = await Promise.all([
        fetch(
          `/api/letter-alignment/?school=${encodeURIComponent(g.program_name)}&group=${encodeURIComponent(g.class_name)}`
        ),
        fetch(
          `/api/flag-evidence/?school=${encodeURIComponent(g.program_name)}&group=${encodeURIComponent(g.class_name)}`
        ),
      ]);

      if (sessionsRes.ok) {
        setSessionsData(await sessionsRes.json());
      }

      if (alignRes.ok) {
        const data = await alignRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setAlignmentData(data[0]);
        }
      }
    } catch {
      // Silently fail — heatmap just won't show
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-semibold text-slate-800">
          Groups Overview ({sorted.length})
        </p>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-xs border border-slate-200 rounded px-2 py-1"
          >
            <option value="school">Sort: School</option>
            <option value="alignment">Sort: Alignment (worst first)</option>
            <option value="flags">Sort: Flags (most first)</option>
          </select>
          <input
            type="text"
            placeholder="Search school/EA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1 w-44"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              <th className="px-4 py-2 w-6"></th>
              <th className="px-2 py-2">School</th>
              <th className="px-2 py-2">Group</th>
              <th className="px-2 py-2">EA</th>
              <th className="px-2 py-2">Lang</th>
              <th className="px-2 py-2 text-right">Children</th>
              <th className="px-2 py-2 text-right">Assessed</th>
              <th className="px-2 py-2 text-right" title="% of taught letters that each child actually needs. 100% = perfect fit, 0% = all taught letters already known.">Alignment</th>
              <th className="px-2 py-2">Flags</th>
            </tr>
          </thead>
            {sorted.map((g) => {
              const key = `${g.program_name}|${g.class_name}`;
              const isExpanded = expandedGroup === key;
              const hasFlags = g.flags.teaching_known || g.flags.skipping_needed;
              const lang = g.language || DEFAULT_LANGUAGE;
              const badgeClass = LANG_BADGE[lang] || "bg-slate-100 text-slate-600";

              return (
                <tbody key={key}>
                  <tr
                    onClick={() => handleExpand(g)}
                    className={`cursor-pointer border-b border-slate-100 transition-colors ${
                      g.flags.skipping_needed
                        ? "bg-red-50/50 hover:bg-red-50"
                        : g.flags.teaching_known
                          ? "bg-amber-50/50 hover:bg-amber-50"
                          : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-2 text-slate-400">
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </td>
                    <td className="px-2 py-2 font-medium text-slate-700">{g.program_name}</td>
                    <td className="px-2 py-2 text-slate-600">{g.class_name}</td>
                    <td className="px-2 py-2 text-slate-500">{g.ea_name}</td>
                    <td className="px-2 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeClass}`}>
                        {lang}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right text-slate-600">
                      {g.children_count}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-600">
                      {g.children_assessed ?? 0}
                    </td>
                    <td className={`px-2 py-2 text-right ${alignmentColor(g.alignment_avg_score)}`}>
                      {g.alignment_avg_score != null ? `${Math.round(g.alignment_avg_score)}%` : "—"}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        {g.flags.skipping_needed && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700">
                            Letters Skipped
                          </span>
                        )}
                        {g.flags.teaching_known && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700">
                            Teaching Known
                          </span>
                        )}
                        {!hasFlags && (g.children_assessed ?? 0) > 0 && (
                          <span className="text-slate-400">—</span>
                        )}
                        {(g.children_assessed ?? 0) === 0 && (
                          <span className="text-slate-300 italic">no data</span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded row: child heatmap */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} className="px-4 py-3 bg-slate-50/50">
                        {loading ? (
                          <div className="flex items-center justify-center py-8 text-slate-400">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Loading alignment data...
                          </div>
                        ) : alignmentData ? (
                          <div className="flex gap-4">
                            <div className="flex-1 min-w-0">
                              <AlignmentHeatmap data={alignmentData} />
                            </div>
                            <div className="w-48 shrink-0">
                              <RecentSessionsPanel sessions={sessionsData?.sessions ?? []} />
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-sm text-slate-400">
                            No alignment data available for this group.
                            Children may not have linked assessments.
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="flex items-center justify-center h-32 text-sm text-slate-400">
          No letter-phase groups found
        </div>
      )}
    </div>
  );
}
