# Schools 2026 Page Redesign

## Context

The current schools-2026 page is functional but visually busy — every card competes for attention with strong background tints, colored borders, many pills/badges, boxed metrics, and lots of accent colors. The goal is a "premium product" feel: clean, minimal, with color used only for meaning.

Additionally, the page needs:
- An interactive school map (reused from the 2025 schools page)
- Type-aware dosage thresholds (different for Primary vs ECD)
- Flags shown only in the expanded EA dropdown, limited to 3 types

## Dosage Thresholds (Type-Aware)

Current code uses uniform thresholds for all schools. The new system is:

| School Type | Green (On Track) | Yellow (Needs Attention) | Red (Low Dosage) |
|-------------|-------------------|--------------------------|-------------------|
| **Primary** | ≥ 2 sess/grp/wk  | 1–2 sess/grp/wk          | < 1 sess/grp/wk  |
| **ECD**     | ≥ 3 sess/grp/wk  | 2–3 sess/grp/wk          | < 2 sess/grp/wk  |

These thresholds apply everywhere: card status chip, card left border, EA pill colors, map dot colors, and filter dropdowns.

The `getDosageLevel()` function must accept `school_type` as a parameter.

EA-level dosage colors use the parent school's type for threshold lookup.

## Hero Section

**Before**: Large green gradient banner (`from-green-600 to-emerald-800`) with CalendarDays icon, centered title, subtitle. Followed by 4 separate gradient stat cards with colored left borders.

**After**: Minimal header on white/neutral background.

- Page title: "2026 Schools" — `text-3xl font-bold text-gray-900`
- Subtitle: muted gray, 1 line — `text-base text-gray-500`
- Stats: 4 inline stats in a single horizontal row, not separate cards
  - Format: `61 Schools · 122 EAs · 3,200 Children · 4,500 Sessions`
  - Each stat: bold number + small muted label
  - No gradient backgrounds, no colored borders, no icons
  - Separator dots or pipes between stats
- Remove: CalendarDays icon, green gradient, StatsSummary2026 component (replace inline)

## Interactive Map

Add the interactive Mapbox school map below the hero section.

**Source component**: `components/schools/school-map.tsx` (from 2025 schools page)

**Approach**: Create a new wrapper component `components/schools-2026/school-map-2026.tsx` that:
1. Accepts `EnrichedSchool2026[]` and adapts them to the `SchoolData` format the map expects
2. Maps dosage levels to the `performance` field: green → "high", yellow → "good", red → "low"
3. Uses type-aware thresholds for the dosage → color mapping
4. Popups show 2026-relevant data: school name, type, EA count, children, dosage, status

**Alternative**: Refactor the original `SchoolMap` to accept a generic format. However, since the 2025 page is frozen, a wrapper/adapter is safer.

**Layout**: Full-width container, `h-[500px]`, with rounded corners. Include a simple legend showing dot color meanings.

**Data gap check**: The 2026 API returns `latitude` and `longitude` as separate fields. The 2025 map expects `Matched_GPS_Coordinates` as a "lat, long" string. The adapter must convert.

If any 2026 school is missing lat/lon data, log a warning but don't break the map.

## Card Redesign

### Card Structure (top to bottom)

```
┌─ 3px left border (dosage color) ──────────────────────────┐
│                                                            │
│  School Name                         [On Track] chip       │
│  Primary School · 2 EAs · 53 children                      │
│                                                            │
│                         2.4                                │
│              sessions/group/week                           │
│                                                            │
│  Avg/day worked  3.3         Sessions this week  12        │
│                                                            │
│  ● Nomsa   ● Thandi                                       │
│                                                            │
│                    ▾ Expand EA detail                       │
└────────────────────────────────────────────────────────────┘
```

### Styling Rules

- **Card background**: White (`bg-white`), subtle border (`border border-gray-200`)
- **Left accent**: 3px left border in dosage color — the main color signal on the card
- **Status chip**: Small rounded pill in top-right corner
  - Green: `bg-green-100 text-green-800` — "On Track"
  - Amber: `bg-amber-100 text-amber-800` — "Needs Attention"
  - Red: `bg-red-100 text-red-800` — "Low Dosage"
- **No gradient backgrounds** on the card or any inner element
- **No boxed metric containers** — remove the `bg-white/70 rounded-lg` metric boxes
- **Hover**: Subtle shadow lift (`hover:shadow-md`) — not `hover:shadow-xl`

### Typography Hierarchy

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| School name | 20px (`text-xl`) | Semibold | `text-gray-900` |
| Metadata line | 13px (`text-[13px]`) | Normal | `text-gray-500` |
| Hero metric (dosage) | 36px (`text-4xl`) | Bold | Dosage color |
| Hero label | 13px | Normal | `text-gray-400` |
| Secondary stats | 14px (`text-sm`) | Medium for values, normal for labels | Values: `text-gray-900`, Labels: `text-gray-500` |
| EA names | 13px | Medium | `text-gray-700` |

### Metadata Line

Replace the separate "EAs" and "Children" count boxes with a single metadata line:

```
Primary School · 2 EAs · 53 children
```

Using `text-[13px] text-gray-500` with interpunct separators.

### Hero Metric (Dosage)

- Large centered number: `text-4xl font-bold` in dosage color
- Label below: "sessions/group/week" in `text-[13px] text-gray-400`
- Vertical padding: `py-4` to give it breathing room
- This is THE focal point of the card

### Secondary Stats

Single row, no boxes, no containers:

```
Avg/day worked  3.3         Sessions this week  12
```

- Layout: `flex justify-between`
- Labels: `text-sm text-gray-500`
- Values: `text-sm font-medium text-gray-900` (or dosage-colored for avg/day worked)
- No borders, no backgrounds

### EA Name Pills

- Small colored dot (6px, `w-1.5 h-1.5`) before each name, colored by EA's dosage level
- Names in `text-[13px] font-medium text-gray-700`
- No colored pill backgrounds — just dot + plain text
- Red indicator dot for flagged EAs (as current)
- Wrap on multiple lines if needed

### Flags on Card

**Removed entirely from the card surface.** No FlagBar component rendered on the main card. Flags are only visible in the expanded EA detail section.

## Expanded EA Detail Section

Keep the same content but restyle to match the new aesthetic:

- Background: `bg-gray-50` (very light) with top border
- Per-EA rows: white background, `border border-gray-200`, thin 2px left border in EA dosage color
- EA name: `font-semibold text-base text-gray-900`
- Metadata: groups, children, sessions as `text-sm text-gray-500`
- Metrics: plain text values (no boxes), color-coded where meaningful
- **Flags**: Only show 3 types: `same_letter_group`, `ghost_group`, `moving_too_fast`
  - Remove `stagnation` and `curriculum_gaps` from this view
  - Use small, quiet badges: `text-xs` with subtle colors

## Filter Bar

Restyle the filter bar to match the clean aesthetic:
- Remove the gray background container (`bg-gray-50 rounded-lg p-4`)
- Clean white search input with subtle border
- Selects with subtle styling
- Update dosage filter options to note type-aware thresholds:
  - "On Track (Primary 2+, ECD 3+)"
  - "Needs Attention (Primary 1-2, ECD 2-3)"
  - "Low Dosage (Primary <1, ECD <2)"

## Files to Modify

| File | Change |
|------|--------|
| `app/schools-2026/page.tsx` | Replace hero section, add map, inline stats, remove StatsSummary2026 |
| `components/schools-2026/school-card-2026.tsx` | Complete card redesign — white background, hero metric, typography, remove FlagBar, update EA pills |
| `components/schools-2026/school-cards-grid-2026.tsx` | Restyle filter bar, update dosage filter labels, update legend |
| `components/schools-2026/stats-summary-2026.tsx` | May be deleted if stats are inlined into the page |
| `lib/schools-2026/types.ts` | No changes expected (data types unchanged) |
| `lib/schools-2026/enrich.ts` | No changes expected (enrichment logic unchanged) |

## New Files

| File | Purpose |
|------|---------|
| `components/schools-2026/school-map-2026.tsx` | Wrapper/adapter that feeds `EnrichedSchool2026[]` to the existing `SchoolMap` component with type-aware dosage colors |

## Verification

1. **Visual check**: Run `npm run dev`, navigate to `/schools-2026`
   - Cards should be white with thin left accent, single hero dosage number, clean typography
   - Hero section should be minimal white header with inline stats
   - Map should render with correctly colored dots
   - Filter by dosage should apply type-aware thresholds
2. **Type-aware thresholds**: Verify a Primary school with dosage 2.0 shows green, while an ECD with 2.0 shows yellow
3. **Flags**: Confirm no flags appear on card surface; only Same Letters, Ghost Groups, Moving Too Fast appear in expanded EA sections
4. **Map**: Click school dots to see popups with 2026 data; verify dot colors match card dosage colors
5. **Responsive**: Check mobile (1 col), tablet (2 col), desktop (3 col) card layouts
6. **Build**: `npm run build` passes with no errors
