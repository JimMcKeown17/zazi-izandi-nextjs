"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SchoolPerformanceRow } from "@/lib/pm/types";
import { DosageBadge } from "@/components/pm/shared/dosage-badge";

interface SchoolTableProps {
  schools: SchoolPerformanceRow[];
}

type SortKey =
  | "school_name"
  | "school_type"
  | "ea_count"
  | "children_count"
  | "avg_sessions_per_group_per_week"
  | "flags_count";

type SortDir = "asc" | "desc";

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 text-slate-400" />;
  return dir === "asc"
    ? <ChevronUp className="w-3 h-3 text-primary" />
    : <ChevronDown className="w-3 h-3 text-primary" />;
}

export function SchoolTable({ schools }: SchoolTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("avg_sessions_per_group_per_week");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return schools.filter((s) =>
      s.school_name.toLowerCase().includes(q)
    );
  }, [schools, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];

      let cmp = 0;
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv);
      } else {
        cmp = (av as number) - (bv as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const cols: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "school_name", label: "School" },
    { key: "school_type", label: "Type" },
    { key: "ea_count", label: "EAs", align: "right" },
    { key: "children_count", label: "Children", align: "right" },
    { key: "avg_sessions_per_group_per_week", label: "Sess/week", align: "right" },
    { key: "flags_count", label: "Flags", align: "right" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Search */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
        <p className="text-sm font-semibold text-slate-800">School Performance</p>
        <input
          type="search"
          placeholder="Search schools…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto text-xs border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder-slate-400 w-48"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {cols.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={cn(
                    "px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap",
                    col.align === "right" ? "text-right" : "text-left"
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon active={sortKey === col.key} dir={sortDir} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((school) => (
              <tr
                key={school.school_name}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/pm/schools/${toSlug(school.school_name)}`}
                    className="text-primary font-medium hover:underline"
                  >
                    {school.school_name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-slate-500 capitalize">
                  {school.school_type}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-700 tabular-nums">
                  {school.ea_count}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-700 tabular-nums">
                  {school.children_count.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <DosageBadge value={school.avg_sessions_per_group_per_week} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  {school.flags_count > 0 ? (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold tabular-nums">
                      {school.flags_count}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          Showing {sorted.length} of {schools.length} schools
        </p>
      </div>
    </div>
  );
}
