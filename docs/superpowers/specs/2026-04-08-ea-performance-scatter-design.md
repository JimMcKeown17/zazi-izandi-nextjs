# EA Performance Scatter Plot — Design Spec

## Context

The PM dashboard lacks a holistic view of individual EA performance that combines dosage (quantity) with letter alignment (quality). Currently, dosage data lives on the Sessions page and alignment data on the Letter Alignment page. Programme managers need a single view to identify EAs who need support (low dosage + low quality), acknowledge top performers (high dosage + high quality), and spot EAs who are doing lots of sessions but with poor alignment, or vice versa.

## Overview

A new `/pm/education-assistants` page with a 4-quadrant scatter plot. Each dot is an EA. X-axis = Avg Sessions / Programme Day. Y-axis = Letter Alignment Score (letters-phase groups only, blending excluded). Clicking a dot reveals an EA detail panel below the chart.

## Data Source: New Django Endpoint

### Endpoint: `GET /api/ea-performance/`

**Query params:** `?cohort=treatment|sef|ecd|all` (default: `all`)

**Why a new endpoint:** The per-EA sessions/programme day calculation already exists in `views.py:576-588` but only the aggregate average is returned. Letter alignment scores exist per-group in `GroupSummary2026` but need aggregation to EA level with blending filtered out. A dedicated endpoint avoids fragile frontend joins and ensures accurate session deduplication via `session_id`.

**Response shape:**

```json
{
  "generated_at": "2026-04-08T...",
  "summary": {
    "total_eas": 47,
    "avg_sessions_per_programme_day": 2.3,
    "avg_alignment_score": 62.0,
    "quadrant_counts": {
      "top_right": 18,
      "top_left": 8,
      "bottom_right": 12,
      "bottom_left": 9
    }
  },
  "eas": [
    {
      "ea_name": "Ntombi Mbeki",
      "school": "Siyabulela Primary School",
      "sessions_per_programme_day": 2.8,
      "alignment_avg_score": 74.0,
      "total_sessions": 156,
      "groups_count": 3,
      "letters_groups_count": 2,
      "blending_groups_count": 1,
      "children_count": 24,
      "active_flags_count": 1,
      "groups": [
        {
          "class_name": "Group A",
          "phase": "letters",
          "children_count": 8,
          "avg_sessions_per_week": 3.1,
          "alignment_avg_score": 78.0,
          "flags": ["curriculum_gaps"]
        }
      ]
    }
  ]
}
```

**Computation logic:**

1. Query all `TeampactSession2026` rows, deduplicate by `session_id`, group by `user_name` (EA).
2. For each EA: `sessions_per_programme_day = len(session_ids) / count_work_days(first_session_date, today)`. Reuse existing `count_work_days()` which excludes weekends + `SCHOOL_HOLIDAYS_2026`.
3. Query `GroupSummary2026` for each EA's groups. Filter to `phase='letters'` for alignment. Compute `alignment_avg_score = mean(group.alignment_avg_score for groups where phase='letters' and alignment_avg_score is not null)`.
4. Apply cohort filtering by matching `program_name` against cohort school sets (same pattern as other endpoints).
5. EAs with zero letters-phase groups OR whose letters-phase groups have no assessed children get `alignment_avg_score: null` and are excluded from scatter plot data (they can't be meaningfully plotted on the Y-axis).

### Django files to modify

- `api/views.py` — Add `ea_performance` view function
- `api/urls.py` — Add URL pattern

### Next.js proxy route

Not needed — server component fetches directly from `DJANGO_API_URL` like other PM endpoints.

## Frontend Architecture

### New files

| File | Purpose |
|------|---------|
| `app/pm/education-assistants/page.tsx` | Server component: fetch data, apply cohort filter, render |
| `components/pm/education-assistants/ea-scatter-chart.tsx` | Client component: Recharts ScatterChart with click handling |
| `components/pm/education-assistants/ea-detail-panel.tsx` | Client component: selected EA details |

### Modified files

| File | Change |
|------|--------|
| `lib/pm/api.ts` | Add `getEAPerformance()` fetch function |
| `lib/pm/types.ts` | Add `EAPerformanceResponse`, `EAPerformanceItem`, `EAGroupDetail` types |
| `components/pm/layout/pm-sidebar.tsx` | Add "Education Assistants" nav item |

### Page structure (`page.tsx`)

Standard PM page pattern:
1. Accept `searchParams`, parse cohort
2. Call `getEAPerformance(cohort)`
3. Show amber banner if `!isLive`
4. Render KPI cards (server) + scatter chart + detail panel (client)

### Scatter chart component

- **Library:** Recharts `ScatterChart` with `Scatter`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ReferenceLine`
- **Quadrant lines:** Two `ReferenceLine` components at X=2 and Y=50, dashed stroke
- **Dot colors:** Color each dot by quadrant (green = top-right, amber = top-left or bottom-right, red = bottom-left)
- **Click handler:** `onClick` on Scatter dots sets `selectedEA` state, renders detail panel
- **Tooltip:** Shows EA name, school, and both metrics on hover
- **Responsive:** Wrapped in `ResponsiveContainer`, chart height ~340px

### KPI cards (above chart)

Four `KPICard` components using the existing shared component:
1. Total EAs (with letters groups)
2. Top Right quadrant count (high dosage + quality)
3. Programme avg sessions/day
4. Programme avg alignment score

### EA detail panel

Rendered below the chart when `selectedEA` is set:
- EA name + school header
- Badges for sessions/day and alignment score
- 4 stat boxes: groups count, total sessions, children count, active flags
- Group breakdown table: group name, phase, children, sessions/week, alignment %, flags
- Blending groups shown muted (lower opacity) with "—" for alignment

### Sidebar entry

Add between "Sessions" and "Letter Progress" in `NAV_ITEMS`:
```
{ name: "Education Assistants", href: "/pm/education-assistants", icon: "Users" }
```

## Quadrant Configuration

- X-axis crosshair: **2.0** sessions/programme day (fixed)
- Y-axis crosshair: **50%** alignment score (fixed)
- X-axis range: 0 to 4 (with auto-extend if data exceeds)
- Y-axis range: 0% to 100%

## Cohort filtering

Follows existing pattern: cohort from URL `?cohort=treatment`, passed to Django endpoint. Django filters EA sessions by matching `program_name` to cohort school sets.

## Verification

1. **Django endpoint:** Hit `/api/ea-performance/` directly, verify per-EA data includes both metrics, blending groups excluded from alignment score
2. **Frontend:** Navigate to `/pm/education-assistants`, verify scatter plot renders with correct axes, quadrant colors, and crosshair lines
3. **Click interaction:** Click an EA dot, verify detail panel shows correct group breakdown
4. **Cohort filter:** Switch cohorts via dropdown, verify chart updates with filtered EAs
5. **Edge cases:** EA with only blending groups should not appear on chart. EA with no alignment data (no assessed children) should show null alignment and be excluded.
6. **Build:** `npm run build` passes with no TypeScript errors
