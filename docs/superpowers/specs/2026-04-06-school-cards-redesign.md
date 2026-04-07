# School Cards 2026 Redesign — "NASA Board"

## Context

The `/schools-2026` page currently shows school cards with basic dosage tracking (green/yellow/red border based on avg sessions/group/week) and two quality flag types. The PM dashboard pages (`/pm/*`) have been built out with much richer data: per-EA metrics, all 5 quality flag types, and per-group letter progress.

**Goal:** Bring key PM dashboard insights into the school cards to create a "NASA board" — an at-a-glance monitoring view where funders see the full story without clicking, and staff see a launchpad before diving into PM detail pages.

**Key principle:** Dosage stays the primary health signal (card border color). Quality flags overlay as alerts. Cards are expandable to reveal per-EA breakdown with letter progress.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Audience | Funders (self-contained) + Staff (launchpad to PM) |
| EA detail model | Expandable/collapsible cards |
| Health signal | Dosage primary, flags as alert overlay |
| Letter progress | Expanded section only |
| Default sort | Alphabetical by school name |
| Flag filter | Add "Has Flags" filter to existing filter bar |
| Navbar text | Remove "(Legacy)" → "2026 Schools" |

## Collapsed Card Design

Each card shows at a glance:

1. **Left border** — dosage color: green (≥3 sessions/group/week), yellow (2–3), red (<2)
2. **Header** — school name, type badge (Primary / ECD), dosage badge (e.g. "3.4/wk")
3. **Stats row** — EAs count, children, groups, sessions this week
4. **EA name pills** — color-coded by individual EA dosage health:
   - Green pill: EA avg ≥3 sessions/group/week
   - Yellow pill: EA avg 2–3
   - Red pill: EA avg <2
   - **Red dot** on pill if that EA has ≥1 quality flag
5. **Flag bar** — appears below EA pills:
   - If flags exist: amber background, "N flags: 2× stagnation, 1× same letter" with type breakdown
   - If clean: green background, "No active flags" with checkmark
6. **Expand toggle** — "▾ Expand EA detail" / "▴ Collapse"

## Expanded EA Section

When expanded, shows per-EA detail rows:

1. **Left border** — EA-level dosage color
2. **Header** — EA name + individual dosage badge
3. **Stats** — groups count, children, sessions this week
4. **Flag badges** — all 5 types shown when present:
   - `stagnation` — red badge
   - `same_letter_group` — orange badge
   - `moving_too_fast` — amber badge
   - `ghost_group` — gray badge
   - `curriculum_gaps` — purple badge
   - "No flags" in italic gray when clean
5. **Letter progress bars** — per-group progress through 26-letter sequence:
   - Group label (e.g. "Gr 1 - Set A")
   - Progress track with fill (green ≥50%, yellow 25–50%, red <25%)
   - Percentage label
   - Only show letter-phase groups (exclude blending, matching PM dashboard pattern)

## Filters & Sorting

Existing filter bar updated:

| Filter | Options |
|--------|---------|
| Search | School name or EA name (existing) |
| Type | All / Primary School / ECD (existing) |
| Dosage | All / On Track (3+) / Needs Attention (2–3) / Low (<2) (existing) |
| **Flags** | **All / Has Flags / No Flags** (new) |

Default sort: alphabetical by `school_name`.

## Data Architecture

### Current State
- Page fetches `/api/schools-2026/` only
- Returns `School2026Data` with school-level aggregates, EA names (strings), 2 flag types

### New State
- Page fetches **both** `/api/schools-2026/` and `/api/groups-2026/` in parallel (server component)
- `schools-2026` provides: school-level stats, summary counts
- `groups-2026` provides: per-group data including EA name, dosage, all 5 flags, letter progress
- **Client-side aggregation:** groups are aggregated by `program_name` → `ea_name` to build per-EA summaries for the expanded section

### Enriched Data Type

```typescript
interface EnrichedSchool2026 {
  // From schools-2026 API
  school_name: string;
  school_type: string;
  ea_count: number;
  children_count: number;
  groups_count: number;
  sessions_this_week: number;
  sessions_this_month: number;
  total_sessions: number;
  avg_sessions_per_group_per_week: number;
  latitude: number | null;
  longitude: number | null;

  // Computed from groups-2026
  eas: EADetail[];
  total_flags: number;
  flag_breakdown: {
    same_letter_group: number;
    moving_too_fast: number;
    ghost_group: number;
    stagnation: number;
    curriculum_gaps: number;
  };
}

interface EADetail {
  name: string;
  groups_count: number;
  children_count: number;
  sessions_this_week: number;
  avg_sessions_per_group_per_week: number;
  flags_count: number;
  has_flags: boolean;
  groups: EAGroupDetail[];
}

interface EAGroupDetail {
  class_name: string;
  grade: string;
  phase: "letters" | "blending";
  current_letter: string;
  progress_pct: number;
  avg_sessions_per_week: number;
  flags: {
    same_letter_group: boolean;
    moving_too_fast: boolean;
    ghost_group: boolean;
    stagnation: boolean;
    curriculum_gaps: boolean;
  };
}
```

### Aggregation Logic

Server-side function `enrichSchoolsWithGroups(schools, groups)`:

1. Build a map of `program_name` → `GroupSummary[]` from groups-2026
2. For each school in schools-2026:
   - Find matching groups by `program_name === school_name`
   - Group by `ea_name`
   - For each EA: compute avg dosage across their groups, count flags, collect group details
   - Compute school-level flag totals across all groups
3. Return `EnrichedSchool2026[]`

### Cohort Filtering

Reuse `filterGroupsByCohort()` from `lib/pm/cohorts.ts` to filter groups before aggregation. Groups use `program_name` for cohort matching.

### Graceful Degradation

If `/api/groups-2026/` fails but `/api/schools-2026/` succeeds:
- Show cards with school-level data only (current card behavior as fallback)
- EA pills show names without color coding (no dosage data per EA)
- Flag bar shows the 2 existing flag types from schools-2026 response
- Expand toggle is hidden (no per-EA detail available)
- Amber banner at top: "Detailed EA data unavailable — showing summary view"

## Files to Modify

| File | Change |
|------|--------|
| `app/schools-2026/page.tsx` | Fetch both endpoints, call `enrichSchoolsWithGroups()`, pass enriched data to grid |
| `components/schools-2026/school-card-2026.tsx` | Complete redesign: new interface, EA pills, flag bar, expandable section with per-EA rows and progress bars |
| `components/schools-2026/school-cards-grid-2026.tsx` | Add flag filter, update type to `EnrichedSchool2026`, alphabetical sort |
| `components/layout/header.tsx` | Line 130: `"2026 Schools (Legacy)"` → `"2026 Schools"`, update description |
| `lib/pm/types.ts` or new `lib/schools-2026/types.ts` | Add `EnrichedSchool2026`, `EADetail`, `EAGroupDetail` interfaces |

### Existing Code to Reuse

- `getGroups2026()` from `lib/pm/api.ts` — already fetches `/api/groups-2026/` with ISR
- `filterGroupsByCohort()` from `lib/pm/cohorts.ts` — cohort filtering by `program_name`
- `getDosageStyle()` pattern from current `school-card-2026.tsx` — dosage color logic
- `GroupSummary` type from `lib/pm/types.ts` — per-group data shape
- shadcn `Card`, `Badge` components from `components/ui/`

## Verification

1. **Dev server** — `npm run dev`, navigate to `/schools-2026`
2. **Collapsed view** — verify all cards show EA pills with correct dosage colors, flag bars with type breakdown
3. **Expand/collapse** — click toggle on several cards, verify per-EA rows show correct dosage, flags, and progress bars
4. **Filters** — test search (by school name, by EA name), type filter, dosage filter, new flag filter
5. **Sort** — verify alphabetical ordering
6. **Navbar** — confirm "2026 Schools" without "(Legacy)" in navigation
7. **Responsive** — test at mobile (1 col), tablet (2 col), desktop (3 col)
8. **Error state** — verify graceful degradation if groups-2026 fetch fails (show cards with school-level data only, expanded section unavailable)
9. **Build** — `npm run build` passes without errors
10. **Lint** — `npm run lint` passes
