"use client";

import { useMemo, useState } from "react";
import { Search, Filter } from "lucide-react";
import SchoolCard2026 from "./school-card-2026";
import type { EnrichedSchool2026 } from "@/lib/schools-2026/types";
import { Badge } from "@/components/ui/badge";

interface SchoolCardsGrid2026Props {
  schools: EnrichedSchool2026[];
  groupsAvailable: boolean;
}

export default function SchoolCardsGrid2026({
  schools,
  groupsAvailable,
}: SchoolCardsGrid2026Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dosageFilter, setDosageFilter] = useState<string>("all");
  const [flagFilter, setFlagFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    // Sort alphabetically first
    const sorted = [...schools].sort((a, b) =>
      a.school_name.localeCompare(b.school_name)
    );

    return sorted.filter((school) => {
      // Search by school name or EA name
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = school.school_name.toLowerCase().includes(q);
        const matchesEA = school.eas.some((ea) =>
          ea.name.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesEA) return false;
      }

      // Type filter
      if (typeFilter !== "all" && school.school_type !== typeFilter)
        return false;

      // Dosage filter
      if (dosageFilter !== "all") {
        const avg = school.avg_sessions_per_group_per_week;
        if (dosageFilter === "green" && avg < 3) return false;
        if (dosageFilter === "yellow" && (avg < 2 || avg >= 3)) return false;
        if (dosageFilter === "red" && avg >= 2) return false;
      }

      // Flag filter
      if (flagFilter === "has-flags" && school.total_flags === 0) return false;
      if (flagFilter === "no-flags" && school.total_flags > 0) return false;

      return true;
    });
  }, [schools, searchQuery, typeFilter, dosageFilter, flagFilter]);

  return (
    <>
      {/* Filter & Search Bar */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex items-center gap-2 bg-white rounded-lg px-4 py-2 border">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by school name or EA..."
            className="flex-1 outline-none text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            className="bg-white rounded-lg px-4 py-2 border text-sm font-medium text-gray-700 outline-none"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="Primary School">Primary School</option>
            <option value="ECD">ECD</option>
          </select>
          <select
            className="bg-white rounded-lg px-4 py-2 border text-sm font-medium text-gray-700 outline-none"
            value={dosageFilter}
            onChange={(e) => setDosageFilter(e.target.value)}
          >
            <option value="all">All Dosage</option>
            <option value="green">On Track (3+)</option>
            <option value="yellow">Needs Attention (2-3)</option>
            <option value="red">Low Dosage (&lt;2)</option>
          </select>
          <select
            className="bg-white rounded-lg px-4 py-2 border text-sm font-medium text-gray-700 outline-none"
            value={flagFilter}
            onChange={(e) => setFlagFilter(e.target.value)}
          >
            <option value="all">All Flags</option>
            <option value="has-flags">Has Flags</option>
            <option value="no-flags">No Flags</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Showing {filtered.length} of {schools.length} schools
        </p>
        {/* Dosage Legend */}
        <div className="hidden md:flex flex-wrap gap-3">
          <Badge className="bg-green-500 text-white">
            On Track: 3+ sess/grp/wk
          </Badge>
          <Badge className="bg-yellow-500 text-white">
            Attention: 2-3 sess/grp/wk
          </Badge>
          <Badge className="bg-red-500 text-white">
            Low: &lt;2 sess/grp/wk
          </Badge>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((school) => (
          <SchoolCard2026
            key={school.school_name}
            data={school}
            groupsAvailable={groupsAvailable}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Filter className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">No schools match your filters</p>
          <p className="text-sm">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </>
  );
}
