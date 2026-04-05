"use client";

interface SchoolFiltersProps {
  schoolTypes: string[];
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedDosage: string;
  onDosageChange: (level: string) => void;
  selectedSort: string;
  onSortChange: (sort: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

const DOSAGE_OPTIONS = [
  { value: "", label: "All Dosage Levels" },
  { value: "on_track", label: "On Track" },
  { value: "needs_attention", label: "Needs Attention" },
  { value: "low", label: "Low Dosage" },
];

const SORT_OPTIONS = [
  { value: "avg_sessions_per_group_per_week-desc", label: "Dosage: High → Low" },
  { value: "avg_sessions_per_group_per_week-asc", label: "Dosage: Low → High" },
  { value: "sessions_this_week-desc", label: "Sessions: Most" },
  { value: "children_count-desc", label: "Children: Most" },
  { value: "flags_count-desc", label: "Flags: Most" },
  { value: "school_name-asc", label: "Name: A → Z" },
];

export function SchoolFilters({
  schoolTypes,
  selectedType,
  onTypeChange,
  selectedDosage,
  onDosageChange,
  selectedSort,
  onSortChange,
  search,
  onSearchChange,
}: SchoolFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <input
        type="search"
        placeholder="Search schools…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="text-sm border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder-slate-400 w-48 bg-white"
      />

      {/* Type filter */}
      <select
        value={selectedType}
        onChange={(e) => onTypeChange(e.target.value)}
        className="text-sm border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white text-slate-700 cursor-pointer"
      >
        <option value="">All Types</option>
        {schoolTypes.map((t) => (
          <option key={t} value={t}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </option>
        ))}
      </select>

      {/* Dosage filter */}
      <select
        value={selectedDosage}
        onChange={(e) => onDosageChange(e.target.value)}
        className="text-sm border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white text-slate-700 cursor-pointer"
      >
        {DOSAGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={selectedSort}
        onChange={(e) => onSortChange(e.target.value)}
        className="text-sm border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white text-slate-700 cursor-pointer"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
