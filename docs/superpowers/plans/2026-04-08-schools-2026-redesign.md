# Schools 2026 Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the schools-2026 page from a visually busy dashboard to a clean, minimal product-like interface with type-aware dosage thresholds, an interactive map, and streamlined flag display.

**Architecture:** Replace colored gradient cards with white cards featuring a single hero dosage metric. Add a Mapbox map via an adapter component wrapping the existing 2025 SchoolMap. Extract dosage threshold logic into a shared utility that accepts school_type. Flags move from card surface into expanded EA detail only.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Mapbox GL, Lucide icons, shadcn/ui (Card, Badge)

**Spec:** `docs/superpowers/specs/2026-04-08-schools-2026-redesign.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/schools-2026/dosage.ts` | **Create** | Type-aware dosage threshold utility |
| `components/schools-2026/school-map-2026.tsx` | **Create** | Adapter wrapping 2025 SchoolMap with EnrichedSchool2026 data |
| `components/schools-2026/school-card-2026.tsx` | **Modify** | Full card redesign — white, hero metric, clean typography |
| `components/schools-2026/school-cards-grid-2026.tsx` | **Modify** | Restyle filter bar, update dosage filter labels |
| `app/schools-2026/page.tsx` | **Modify** | Replace hero, add map, inline stats, remove StatsSummary2026 |

---

### Task 1: Create type-aware dosage utility

Extract dosage logic into a shared utility so cards, map, filters, and EA pills all use the same threshold function.

**Files:**
- Create: `lib/schools-2026/dosage.ts`

- [ ] **Step 1: Create `lib/schools-2026/dosage.ts`**

```typescript
// lib/schools-2026/dosage.ts

export type DosageLevel = "green" | "yellow" | "red";

/**
 * Type-aware dosage thresholds:
 *   Primary: green ≥2, yellow 1–2, red <1
 *   ECD:     green ≥3, yellow 2–3, red <2
 */
export function getDosageLevel(
  avg: number,
  schoolType: string
): DosageLevel {
  const isECD = schoolType === "ECD";
  const greenThreshold = isECD ? 3 : 2;
  const yellowThreshold = isECD ? 2 : 1;

  if (avg >= greenThreshold) return "green";
  if (avg >= yellowThreshold) return "yellow";
  return "red";
}

export const DOSAGE_LABELS: Record<DosageLevel, string> = {
  green: "On Track",
  yellow: "Needs Attention",
  red: "Low Dosage",
};
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit lib/schools-2026/dosage.ts 2>&1 || npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add lib/schools-2026/dosage.ts
git commit -m "feat(schools-2026): add type-aware dosage threshold utility"
```

---

### Task 2: Redesign SchoolCard2026

Rewrite the card component: white background, single hero dosage metric, clean typography, no flag bar, updated EA pills.

**Files:**
- Modify: `components/schools-2026/school-card-2026.tsx`
- Reference: `lib/schools-2026/dosage.ts` (from Task 1)
- Reference: `lib/schools-2026/types.ts` (unchanged)

- [ ] **Step 1: Replace the entire `school-card-2026.tsx` file**

```tsx
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
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: No type errors (the import of `getDosageLevel` and `DOSAGE_LABELS` should resolve from Task 1)

- [ ] **Step 3: Commit**

```bash
git add components/schools-2026/school-card-2026.tsx
git commit -m "feat(schools-2026): redesign card — white bg, hero metric, clean typography"
```

---

### Task 3: Restyle filter bar and grid

Update the filter bar to match the clean aesthetic and adjust dosage filter labels to show type-aware thresholds.

**Files:**
- Modify: `components/schools-2026/school-cards-grid-2026.tsx`
- Reference: `lib/schools-2026/dosage.ts` (from Task 1)

- [ ] **Step 1: Replace the entire `school-cards-grid-2026.tsx` file**

```tsx
"use client";

import { useMemo, useState } from "react";
import { Search, Filter } from "lucide-react";
import SchoolCard2026 from "./school-card-2026";
import { getDosageLevel } from "@/lib/schools-2026/dosage";
import type { EnrichedSchool2026 } from "@/lib/schools-2026/types";

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

      // Dosage filter — uses type-aware thresholds
      if (dosageFilter !== "all") {
        const level = getDosageLevel(
          school.avg_sessions_per_group_per_week,
          school.school_type
        );
        if (dosageFilter !== level) return false;
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
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2 bg-white rounded-lg px-4 py-2.5 border border-gray-200">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by school name or EA..."
            className="flex-1 outline-none text-sm text-gray-900 placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            className="bg-white rounded-lg px-3 py-2.5 border border-gray-200 text-sm text-gray-700 outline-none"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="Primary School">Primary School</option>
            <option value="ECD">ECD</option>
          </select>
          <select
            className="bg-white rounded-lg px-3 py-2.5 border border-gray-200 text-sm text-gray-700 outline-none"
            value={dosageFilter}
            onChange={(e) => setDosageFilter(e.target.value)}
          >
            <option value="all">All Dosage</option>
            <option value="green">On Track (Primary 2+, ECD 3+)</option>
            <option value="yellow">Attention (Primary 1-2, ECD 2-3)</option>
            <option value="red">Low (Primary &lt;1, ECD &lt;2)</option>
          </select>
          <select
            className="bg-white rounded-lg px-3 py-2.5 border border-gray-200 text-sm text-gray-700 outline-none"
            value={flagFilter}
            onChange={(e) => setFlagFilter(e.target.value)}
          >
            <option value="all">All Flags</option>
            <option value="has-flags">Has Flags</option>
            <option value="no-flags">No Flags</option>
          </select>
        </div>
      </div>

      {/* Results count + legend */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Showing {filtered.length} of {schools.length} schools
        </p>
        <div className="hidden md:flex items-center gap-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" /> On Track
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Needs Attention
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Low Dosage
          </span>
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
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add components/schools-2026/school-cards-grid-2026.tsx
git commit -m "feat(schools-2026): restyle filter bar, type-aware dosage filters"
```

---

### Task 4: Create SchoolMap2026 adapter

Wrap the existing 2025 `SchoolMap` component with an adapter that converts `EnrichedSchool2026[]` into the format the map expects, using type-aware dosage colors.

**Files:**
- Create: `components/schools-2026/school-map-2026.tsx`
- Reference: `components/schools/school-map.tsx` (2025 map, read-only)
- Reference: `lib/schools-2026/dosage.ts` (from Task 1)

- [ ] **Step 1: Create `components/schools-2026/school-map-2026.tsx`**

```tsx
"use client";

import SchoolMap from "@/components/schools/school-map";
import { getDosageLevel } from "@/lib/schools-2026/dosage";
import type { EnrichedSchool2026 } from "@/lib/schools-2026/types";

interface SchoolMap2026Props {
  schools: EnrichedSchool2026[];
}

const DOSAGE_TO_PERFORMANCE: Record<string, string> = {
  green: "high",
  yellow: "good",
  red: "low",
};

/**
 * Adapter that converts EnrichedSchool2026[] to the format
 * expected by the 2025 SchoolMap component.
 */
export default function SchoolMap2026({ schools }: SchoolMap2026Props) {
  const mapSchools = schools
    .filter((s) => s.latitude !== null && s.longitude !== null)
    .map((school) => {
      const level = getDosageLevel(
        school.avg_sessions_per_group_per_week,
        school.school_type
      );

      return {
        NatEmis: null,
        Official_Institution_Name: school.school_name,
        Matched_GPS_Coordinates: `${school.latitude}, ${school.longitude}`,
        Matched_Area: null,
        CMC: null,
        EICircuit: null,
        Phase_PED: school.school_type,
        "Gr R": school.children_count,
        "Gr 1": null,
        "Year(s) on the Programme": `${school.ea_count} EAs`,
        performance: DOSAGE_TO_PERFORMANCE[level],
      };
    });

  if (mapSchools.length === 0) return null;

  return (
    <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200">
      <SchoolMap schools={mapSchools} />
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add components/schools-2026/school-map-2026.tsx
git commit -m "feat(schools-2026): add map adapter wrapping 2025 SchoolMap"
```

---

### Task 5: Redesign the page layout (hero, map, stats)

Replace the green gradient hero with a minimal header, add the map, inline the stats, and remove the old StatsSummary2026 import.

**Files:**
- Modify: `app/schools-2026/page.tsx`

- [ ] **Step 1: Replace the entire `app/schools-2026/page.tsx` file**

```tsx
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import SchoolCardsGrid2026 from "@/components/schools-2026/school-cards-grid-2026";
import SchoolMap2026 from "@/components/schools-2026/school-map-2026";
import type { School2026Data } from "@/lib/schools-2026/school2026-data";
import { getGroups2026, getSessionsActivity } from "@/lib/pm/api";
import { enrichSchoolsWithGroups } from "@/lib/schools-2026/enrich";
import { AlertTriangle, MapPin } from "lucide-react";

interface Schools2026ApiResponse {
  generated_at: string;
  summary: {
    total_schools: number;
    total_eas: number;
    total_children: number;
    total_sessions_this_week: number;
    total_sessions_this_month: number;
  };
  schools: School2026Data[];
}

async function getSchools2026Data(): Promise<Schools2026ApiResponse | null> {
  const apiUrl = process.env.DJANGO_API_URL;
  if (!apiUrl) {
    console.error("DJANGO_API_URL is not set");
    return null;
  }

  try {
    const res = await fetch(`${apiUrl}/api/schools-2026/`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`Django API returned ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("Failed to fetch schools 2026 data:", error);
    return null;
  }
}

export default async function Schools2026Page() {
  const [schoolsData, groupsResult, sessionsResult] = await Promise.all([
    getSchools2026Data(),
    getGroups2026(),
    getSessionsActivity(30, "all"),
  ]);

  const enrichedSchools = schoolsData
    ? enrichSchoolsWithGroups(
        schoolsData.schools,
        groupsResult.isLive ? groupsResult.data.groups : [],
        sessionsResult.isLive ? sessionsResult.data.ea_heatmap.eas : []
      )
    : null;

  const groupsAvailable = groupsResult.isLive;
  const summary = schoolsData?.summary;

  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Minimal Hero */}
        <section className="bg-white border-b border-gray-100 py-10">
          <div className="container">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              2026 Schools
            </h1>
            <p className="text-base text-gray-500 mb-6">
              Live session data, dosage tracking, and quality monitoring
            </p>

            {/* Inline stats */}
            {summary && (
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
                <span>
                  <span className="text-2xl font-bold text-gray-900">
                    {summary.total_schools}
                  </span>{" "}
                  <span className="text-gray-500">Schools</span>
                </span>
                <span className="text-gray-300 hidden sm:inline">·</span>
                <span>
                  <span className="text-2xl font-bold text-gray-900">
                    {summary.total_eas}
                  </span>{" "}
                  <span className="text-gray-500">EAs</span>
                </span>
                <span className="text-gray-300 hidden sm:inline">·</span>
                <span>
                  <span className="text-2xl font-bold text-gray-900">
                    {summary.total_children.toLocaleString()}
                  </span>{" "}
                  <span className="text-gray-500">Children</span>
                </span>
                <span className="text-gray-300 hidden sm:inline">·</span>
                <span>
                  <span className="text-2xl font-bold text-gray-900">
                    {summary.total_sessions_this_month.toLocaleString()}
                  </span>{" "}
                  <span className="text-gray-500">Sessions this month</span>
                </span>
              </div>
            )}
          </div>
        </section>

        {schoolsData && enrichedSchools ? (
          <>
            {/* Degradation banner */}
            {!groupsAvailable && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
                <div className="container flex items-center gap-2 text-amber-800 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Detailed EA data unavailable — showing summary view
                  </span>
                </div>
              </div>
            )}

            {/* Interactive Map */}
            <section className="py-8 bg-white">
              <div className="container">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  School Locations
                </h2>
                <SchoolMap2026 schools={enrichedSchools} />
                {/* Map legend */}
                <div className="flex items-center gap-5 mt-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 border border-white shadow-sm" />
                    On Track
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white shadow-sm" />
                    Needs Attention
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white shadow-sm" />
                    Low Dosage
                  </span>
                </div>
              </div>
            </section>

            {/* School Cards Section */}
            <section className="py-10 bg-gray-50">
              <div className="container">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    School Dosage Overview
                  </h2>
                  <p className="text-sm text-gray-500">
                    Session frequency, quality flags, and EA performance —
                    colour coded by dosage level
                  </p>
                </div>

                <SchoolCardsGrid2026
                  schools={enrichedSchools}
                  groupsAvailable={groupsAvailable}
                />
              </div>
            </section>
          </>
        ) : (
          <section className="py-20 bg-white">
            <div className="container text-center">
              <div className="max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Data Unavailable
                </h2>
                <p className="text-gray-500">
                  Unable to load 2026 school data. The data service may be
                  starting up — please try again in a few minutes.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-10 bg-white border-t border-gray-100">
          <div className="container text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Explore Detailed Analytics
            </h2>
            <p className="text-gray-500 mb-5 max-w-xl mx-auto">
              Visit our Data Portal for deeper analysis, flag details, and
              historical trends
            </p>
            <a
              href="https://dataportal.zaziizandi.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-800 text-white font-semibold px-7 py-2.5 rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              Open Data Portal
              <MapPin className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: No type errors. Note: `stats-summary-2026.tsx` is no longer imported — it can be deleted later or left as dead code for now.

- [ ] **Step 3: Commit**

```bash
git add app/schools-2026/page.tsx
git commit -m "feat(schools-2026): minimal hero, inline stats, add map section"
```

---

### Task 6: Visual verification and build check

Run the app and verify everything works end-to-end.

**Files:** None (verification only)

- [ ] **Step 1: Build check**

Run: `npm run build`
Expected: Build succeeds with no errors. Watch for unused import warnings (CalendarDays was removed from page.tsx).

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: No errors. Fix any warnings about unused imports.

- [ ] **Step 3: Visual verification**

Run: `npm run dev`
Navigate to `http://localhost:3000/schools-2026` and verify:
1. Hero is minimal white with inline stats — no green gradient
2. Map renders with colored dots (green/amber/red by dosage)
3. Cards are white with thin left border accent and status chip
4. Dosage number is large and centered as the hero metric
5. Secondary stats are plain text, no boxes
6. EA names show as plain text with small colored dots
7. No flags appear on the main card surface
8. Expanding an EA shows flags — only Same Letters, Ghost Groups, Moving Too Fast
9. Filter by dosage uses type-aware thresholds (check a Primary school at dosage 2.0 = green; ECD at 2.0 = yellow)
10. Map legend and card legend use consistent colors

- [ ] **Step 4: Clean up unused file**

Delete `components/schools-2026/stats-summary-2026.tsx` since it is no longer imported.

```bash
git rm components/schools-2026/stats-summary-2026.tsx
git commit -m "chore: remove unused StatsSummary2026 component"
```

- [ ] **Step 5: Final commit if any lint/build fixes were needed**

```bash
git add -A
git commit -m "fix: address lint warnings from schools-2026 redesign"
```
