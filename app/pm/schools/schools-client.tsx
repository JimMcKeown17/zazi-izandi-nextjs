"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Users, Baby, Layers, Activity } from "lucide-react";
import type { SchoolPerformanceRow } from "@/lib/pm/types";
import type { Cohort } from "@/lib/pm/cohorts";
import { getDosageLevel } from "@/lib/pm/constants";
import { DosageBadge } from "@/components/pm/shared/dosage-badge";
import { SchoolFilters } from "@/components/pm/schools/school-filters";

interface SchoolsClientProps {
  schools: SchoolPerformanceRow[];
  cohortLabel?: string;
  cohort?: Cohort;
  totalSchools?: number;
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function getUniqueTypes(schools: SchoolPerformanceRow[]): string[] {
  const types = new Set(schools.map((s) => s.school_type));
  return Array.from(types).sort();
}

export function SchoolsClient({ schools, cohortLabel = "Treatment", cohort, totalSchools }: SchoolsClientProps) {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedDosage, setSelectedDosage] = useState("");
  const [selectedSort, setSelectedSort] = useState("avg_sessions_per_group_per_week-desc");

  const schoolTypes = useMemo(() => getUniqueTypes(schools), [schools]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return schools.filter((s) => {
      if (q && !s.school_name.toLowerCase().includes(q)) return false;
      if (selectedType && s.school_type !== selectedType) return false;
      if (selectedDosage && getDosageLevel(s.avg_sessions_per_group_per_week) !== selectedDosage)
        return false;
      return true;
    });
  }, [schools, search, selectedType, selectedDosage]);

  const sorted = useMemo(() => {
    const [key, dir] = selectedSort.split("-") as [keyof SchoolPerformanceRow, "asc" | "desc"];

    return [...filtered].sort((a, b) => {
      const av = a[key];
      const bv = b[key];

      let cmp = 0;
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv);
      } else {
        cmp = (av as number) - (bv as number);
      }
      return dir === "asc" ? cmp : -cmp;
    });
  }, [filtered, selectedSort]);

  function schoolHref(schoolName: string): string {
    const basePath = `/pm/schools/${toSlug(schoolName)}`;
    return cohort && cohort !== "treatment"
      ? `${basePath}?cohort=${encodeURIComponent(cohort)}`
      : basePath;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{cohortLabel} Schools</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {sorted.length} of {totalSchools ?? schools.length} schools
          </p>
        </div>
      </div>

      {/* Filters */}
      <SchoolFilters
        schoolTypes={schoolTypes}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedDosage={selectedDosage}
        onDosageChange={setSelectedDosage}
        selectedSort={selectedSort}
        onSortChange={setSelectedSort}
        search={search}
        onSearchChange={setSearch}
      />

      {/* School cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((school) => (
          <Link
            key={school.school_name}
            href={schoolHref(school.school_name)}
            className="block bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-150"
          >
            {/* Card header */}
            <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">{school.school_name}</p>
                <p className="text-xs text-slate-500 capitalize mt-0.5">{school.school_type}</p>
              </div>
              <DosageBadge value={school.avg_sessions_per_group_per_week} showLabel />
            </div>

            {/* Card body — 4-column stats grid */}
            <div className="px-4 py-3 border-t border-slate-100 grid grid-cols-4 gap-2 text-center">
              {/* EAs */}
              <div className="flex flex-col items-center gap-1">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-800 tabular-nums">
                  {school.ea_count}
                </span>
                <span className="text-xs text-slate-400">EAs</span>
              </div>

              {/* Children */}
              <div className="flex flex-col items-center gap-1">
                <Baby className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-800 tabular-nums">
                  {school.children_count.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">Children</span>
              </div>

              {/* Groups */}
              <div className="flex flex-col items-center gap-1">
                <Layers className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-800 tabular-nums">
                  {school.groups_count}
                </span>
                <span className="text-xs text-slate-400">Groups</span>
              </div>

              {/* Sessions/week */}
              <div className="flex flex-col items-center gap-1">
                <Activity className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-800 tabular-nums">
                  {school.sessions_this_week}
                </span>
                <span className="text-xs text-slate-400">Sess/wk</span>
              </div>
            </div>

            {/* Flags badge */}
            {school.flags_count > 0 && (
              <div className="px-4 pb-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-semibold">
                  {school.flags_count} flag{school.flags_count !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </Link>
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No schools match the current filters.</p>
        </div>
      )}
    </div>
  );
}
