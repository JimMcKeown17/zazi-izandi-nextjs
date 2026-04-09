# EA Performance Scatter Plot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Education Assistants page to the PM dashboard with a 4-quadrant scatter plot (sessions/programme day vs letter alignment score) and click-to-expand EA detail panel.

**Architecture:** New Django endpoint `/api/ea-performance/` pre-computes per-EA metrics (reusing existing `count_work_days` and `GroupSummary2026` alignment data). Next.js server page fetches and renders KPI cards + a Recharts `ScatterChart` client component with an `EADetailPanel` below.

**Tech Stack:** Django (Python) · Next.js 16 (App Router) · TypeScript · Recharts · Tailwind CSS · shadcn KPICard

---

## Delivery Order

1. **Backend** (Task 1): Django endpoint + URL + local verification → deploy to Render
2. **Frontend** (Tasks 2–5): Types/API → detail panel → scatter chart → page + sidebar
3. **E2E** (Task 6): Full verification against live API

> **Note — check-in sessions:** The existing `programme_overview` endpoint queries `TeampactSession2026` without explicitly filtering check-in class names. Check-ins may already be excluded at the `compute_school_summaries_2026` management command level, or may not appear in session data at all. **Investigate** whether check-in rows exist in `TeampactSession2026` and, if so, whether all PM endpoints need a shared exclusion filter. This is out of scope for this plan but should be tracked.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `api/views.py` (add function) | Django: `ea_performance` view — per-EA scatter data |
| Modify | `api/urls.py:19` | Django: add URL pattern |
| Modify | `lib/pm/types.ts` | TS types for endpoint response |
| Modify | `lib/pm/api.ts` | `getEAPerformance()` fetch function |
| Create | `app/pm/education-assistants/page.tsx` | Server component page |
| Create | `components/pm/education-assistants/ea-scatter-chart.tsx` | Client: Recharts scatter + click |
| Create | `components/pm/education-assistants/ea-detail-panel.tsx` | Client: selected EA details |
| Modify | `components/pm/layout/pm-sidebar.tsx:26-35` | Add sidebar nav item |

---

### Task 1: Django endpoint — `ea_performance` view

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/views.py` (add new function at end)
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/urls.py:19`

- [ ] **Step 1: Add the `ea_performance` view function**

Add this function at the end of `api/views.py` (before any non-view code, or at the very end of the file):

```python
@csrf_exempt
def ea_performance(request):
    """
    GET /api/ea-performance/?cohort=treatment|sef|ecd|all

    Returns per-EA scatter plot data:
    - sessions_per_programme_day (X-axis)
    - alignment_avg_score from letters-phase groups (Y-axis)
    - group breakdowns for detail panel
    """
    from datetime import datetime
    from collections import defaultdict
    from api.models import TeampactSession2026

    cohort = request.GET.get("cohort", "all").lower()
    today = date.today()

    # --- Load schools (same cohort filtering as programme_overview) ---
    all_schools = list(SchoolSummary2026.objects.all())
    all_schools = [s for s in all_schools if s.school_name.upper() not in EXCLUDED_PROGRAMS]

    if cohort == "treatment":
        schools = [s for s in all_schools if s.school_name.upper() in TREATMENT_SCHOOLS]
    elif cohort == "sef":
        schools = [s for s in all_schools if s.school_name.upper() in SEF_SCHOOLS]
    elif cohort == "ecd":
        schools = [s for s in all_schools if s.school_type == "ECD"]
    else:
        schools = all_schools

    cohort_school_names_upper = {s.school_name.upper() for s in schools}

    # --- Per-EA session metrics (deduplicated by session_id) ---
    try:
        targets = ProgrammeTargets.objects.get(year=2026)
        start_date = targets.programme_start_date
    except ProgrammeTargets.DoesNotExist:
        return JsonResponse({"error": "Programme targets for 2026 not found."}, status=404)

    ea_sessions_qs = (
        TeampactSession2026.objects
        .filter(session_started_at__gte=start_date)
        .exclude(program_name__in=EXCLUDED_PROGRAMS)
        .exclude(program_name__isnull=True)
        .exclude(program_name__exact='')
        .values('user_name', 'session_id', 'session_started_at', 'program_name')
    )

    if cohort != "all":
        ea_sessions_qs = [
            row for row in ea_sessions_qs
            if row['program_name'].upper() in cohort_school_names_upper
        ]
    else:
        ea_sessions_qs = list(ea_sessions_qs)

    ea_session_data = defaultdict(lambda: {
        'session_ids': set(),
        'dates': set(),
        'school_counts': defaultdict(int),
    })
    for row in ea_sessions_qs:
        ea = row['user_name']
        if not ea:
            continue
        ea_session_data[ea]['session_ids'].add(row['session_id'])
        ea_session_data[ea]['dates'].add(row['session_started_at'].date())
        ea_session_data[ea]['school_counts'][row['program_name']] += 1

    # --- Per-EA group data (from GroupSummary2026) ---
    all_groups = list(GroupSummary2026.objects.all())
    all_groups = [g for g in all_groups if g.program_name.upper() not in EXCLUDED_PROGRAMS]
    if cohort != "all":
        all_groups = [g for g in all_groups if g.program_name.upper() in cohort_school_names_upper]

    ea_groups = defaultdict(list)
    for g in all_groups:
        ea_groups[g.ea_name].append(g)

    # --- Build per-EA response ---
    FLAG_NAMES = [
        'flag_same_letter_group', 'flag_moving_too_fast', 'flag_ghost_group',
        'flag_stagnation', 'flag_curriculum_gaps', 'flag_teaching_known', 'flag_skipping_needed',
    ]
    FLAG_LABELS = {
        'flag_same_letter_group': 'same_letter_group',
        'flag_moving_too_fast': 'moving_too_fast',
        'flag_ghost_group': 'ghost_group',
        'flag_stagnation': 'stagnation',
        'flag_curriculum_gaps': 'curriculum_gaps',
        'flag_teaching_known': 'teaching_known',
        'flag_skipping_needed': 'skipping_needed',
    }

    eas = []
    alignment_scores_all = []

    # Union of EA names from sessions and groups
    all_ea_names = set(ea_session_data.keys()) | set(ea_groups.keys())

    for ea_name in sorted(all_ea_names):
        session_info = ea_session_data.get(ea_name)
        groups = ea_groups.get(ea_name, [])

        # Sessions per programme day
        if session_info:
            total_sessions = len(session_info['session_ids'])
            first_date = min(session_info['dates'])
            work_days = count_work_days(first_date, today)
            sessions_per_programme_day = round(total_sessions / work_days, 2)
            school = max(
                session_info['school_counts'],
                key=session_info['school_counts'].get
            ) if session_info['school_counts'] else ''
        else:
            total_sessions = sum(g.total_sessions for g in groups)
            sessions_per_programme_day = 0
            school = groups[0].program_name if groups else ''

        # Alignment from letters-phase groups only
        letters_groups = [g for g in groups if g.phase == 'letters']
        blending_groups = [g for g in groups if g.phase == 'blending']
        letters_with_alignment = [
            g for g in letters_groups
            if g.alignment_avg_score is not None
        ]

        if letters_with_alignment:
            alignment_avg = round(
                sum(g.alignment_avg_score for g in letters_with_alignment) /
                len(letters_with_alignment), 1
            )
        else:
            alignment_avg = None

        if alignment_avg is not None:
            alignment_scores_all.append(alignment_avg)

        # Active flags count
        active_flags = 0
        for g in groups:
            for flag in FLAG_NAMES:
                if getattr(g, flag, False):
                    active_flags += 1

        # Group details
        group_details = []
        for g in groups:
            flags_list = [
                FLAG_LABELS[f] for f in FLAG_NAMES if getattr(g, f, False)
            ]
            group_details.append({
                'class_name': g.class_name,
                'phase': g.phase,
                'children_count': g.children_count,
                'avg_sessions_per_week': round(g.avg_sessions_per_week, 1),
                'alignment_avg_score': round(g.alignment_avg_score, 1) if g.alignment_avg_score is not None else None,
                'flags': flags_list,
            })

        children_count = sum(g.children_count for g in groups)

        eas.append({
            'ea_name': ea_name,
            'school': school,
            'sessions_per_programme_day': sessions_per_programme_day,
            'alignment_avg_score': alignment_avg,
            'total_sessions': total_sessions,
            'groups_count': len(groups),
            'letters_groups_count': len(letters_groups),
            'blending_groups_count': len(blending_groups),
            'children_count': children_count,
            'active_flags_count': active_flags,
            'groups': group_details,
        })

    # --- Summary ---
    eas_with_alignment = [e for e in eas if e['alignment_avg_score'] is not None]

    x_mid = 2.0
    y_mid = 50.0
    top_right = sum(1 for e in eas_with_alignment if e['sessions_per_programme_day'] >= x_mid and e['alignment_avg_score'] >= y_mid)
    top_left = sum(1 for e in eas_with_alignment if e['sessions_per_programme_day'] < x_mid and e['alignment_avg_score'] >= y_mid)
    bottom_right = sum(1 for e in eas_with_alignment if e['sessions_per_programme_day'] >= x_mid and e['alignment_avg_score'] < y_mid)
    bottom_left = sum(1 for e in eas_with_alignment if e['sessions_per_programme_day'] < x_mid and e['alignment_avg_score'] < y_mid)

    avg_sessions = round(
        sum(e['sessions_per_programme_day'] for e in eas) / max(len(eas), 1), 1
    )
    avg_alignment = round(
        sum(alignment_scores_all) / max(len(alignment_scores_all), 1), 1
    ) if alignment_scores_all else 0

    return JsonResponse({
        'generated_at': datetime.now().isoformat(),
        'summary': {
            'total_eas': len(eas_with_alignment),
            'avg_sessions_per_programme_day': avg_sessions,
            'avg_alignment_score': avg_alignment,
            'quadrant_counts': {
                'top_right': top_right,
                'top_left': top_left,
                'bottom_right': bottom_right,
                'bottom_left': bottom_left,
            },
        },
        'eas': eas,
    })
```

- [ ] **Step 2: Add URL pattern**

In `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/urls.py`, add this line after the `mentor-visits-summary` entry (line 19):

```python
    path('ea-performance/', views.ea_performance, name='ea-performance'),
```

- [ ] **Step 3: Test the endpoint locally**

Run: `cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025 && python manage.py runserver`

Then in another terminal:
```bash
curl -s "http://localhost:8000/api/ea-performance/" | python3 -m json.tool | head -40
```

Expected: JSON with `summary.total_eas > 0`, `eas` array with objects containing `ea_name`, `sessions_per_programme_day`, `alignment_avg_score`.

- [ ] **Step 4: Commit Django changes**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
git add api/views.py api/urls.py
git commit -m "feat(api): add /api/ea-performance/ endpoint for scatter plot data"
```

---

### Task 2: TypeScript types and API function

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/lib/pm/types.ts`
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/lib/pm/api.ts`

- [ ] **Step 1: Add types to `types.ts`**

Add at the end of `lib/pm/types.ts`:

```typescript
// ─── EA Performance API Response ──────────────────────────────

export interface EAPerformanceResponse {
  generated_at: string;
  summary: {
    total_eas: number;
    avg_sessions_per_programme_day: number;
    avg_alignment_score: number;
    quadrant_counts: {
      top_right: number;
      top_left: number;
      bottom_right: number;
      bottom_left: number;
    };
  };
  eas: EAPerformanceItem[];
}

export interface EAPerformanceItem {
  ea_name: string;
  school: string;
  sessions_per_programme_day: number;
  alignment_avg_score: number | null;
  total_sessions: number;
  groups_count: number;
  letters_groups_count: number;
  blending_groups_count: number;
  children_count: number;
  active_flags_count: number;
  groups: EAGroupDetail[];
}

export interface EAGroupDetail {
  class_name: string;
  phase: "letters" | "blending";
  children_count: number;
  avg_sessions_per_week: number;
  alignment_avg_score: number | null;
  flags: string[];
}
```

- [ ] **Step 2: Add fetch function to `api.ts`**

Add import for the new type at the top of `lib/pm/api.ts` (extend the existing import from `"./types"`):

```typescript
import type {
  // ... existing imports ...
  EAPerformanceResponse,
} from "./types";
```

Then add this at the end of `lib/pm/api.ts`, before the final empty-object constants:

```typescript
// ─── EA Performance ──────────────────────────────────────────

export interface EAPerformanceResult {
  data: EAPerformanceResponse;
  isLive: boolean;
}

export async function getEAPerformance(
  cohort = "all"
): Promise<EAPerformanceResult> {
  const apiUrl = process.env.DJANGO_API_URL;

  if (!apiUrl) {
    console.warn("[pm/api] DJANGO_API_URL not set — EA performance data unavailable");
    return { data: EMPTY_EA_PERFORMANCE, isLive: false };
  }

  try {
    const res = await fetch(
      `${apiUrl}/api/ea-performance/?cohort=${encodeURIComponent(cohort)}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      console.error(`[pm/api] EA performance returned ${res.status}`);
      return { data: EMPTY_EA_PERFORMANCE, isLive: false };
    }

    return { data: await res.json(), isLive: true };
  } catch (error) {
    console.error("[pm/api] Failed to fetch EA performance:", error);
    return { data: EMPTY_EA_PERFORMANCE, isLive: false };
  }
}

const EMPTY_EA_PERFORMANCE: EAPerformanceResponse = {
  generated_at: "",
  summary: {
    total_eas: 0,
    avg_sessions_per_programme_day: 0,
    avg_alignment_score: 0,
    quadrant_counts: { top_right: 0, top_left: 0, bottom_right: 0, bottom_left: 0 },
  },
  eas: [],
};
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs && npx tsc --noEmit --pretty`

Expected: No errors related to the new types.

- [ ] **Step 4: Commit**

```bash
git add lib/pm/types.ts lib/pm/api.ts
git commit -m "feat(pm): add EA performance types and API function"
```

---

### Task 3: EA Detail Panel component

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/pm/education-assistants/ea-detail-panel.tsx`

- [ ] **Step 1: Create the detail panel component**

Create `components/pm/education-assistants/ea-detail-panel.tsx`:

```tsx
"use client";

import type { EAPerformanceItem } from "@/lib/pm/types";

// Human-readable flag labels
const FLAG_LABELS: Record<string, string> = {
  same_letter_group: "Same Letter",
  moving_too_fast: "Moving Too Fast",
  ghost_group: "Ghost Group",
  stagnation: "Stagnation",
  curriculum_gaps: "Curriculum Gaps",
  teaching_known: "Teaching Known",
  skipping_needed: "Skipping Needed",
};

interface EADetailPanelProps {
  ea: EAPerformanceItem;
  onClose: () => void;
}

export function EADetailPanel({ ea, onClose }: EADetailPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border-2 border-primary p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{ea.ea_name}</h3>
          <p className="text-sm text-slate-500">{ea.school}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-green-50 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
            {ea.sessions_per_programme_day} sessions/day
          </span>
          {ea.alignment_avg_score !== null && (
            <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
              {ea.alignment_avg_score}% alignment
            </span>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none ml-2"
            aria-label="Close detail panel"
          >
            ×
          </button>
        </div>
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Groups", value: ea.groups_count },
          { label: "Total Sessions", value: ea.total_sessions },
          { label: "Children", value: ea.children_count },
          { label: "Active Flags", value: ea.active_flags_count },
        ].map((stat) => (
          <div
            key={stat.label}
            className="text-center p-3 bg-slate-50 rounded-md"
          >
            <div className="text-xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-xs text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Group breakdown */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Groups
        </h4>
        <div className="space-y-1.5">
          {ea.groups.map((group) => (
            <div
              key={`${group.class_name}-${group.phase}`}
              className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 items-center px-3 py-2 rounded-md text-sm ${
                group.phase === "blending"
                  ? "bg-slate-100 opacity-60"
                  : "bg-slate-50"
              }`}
            >
              <div>
                <span className="font-medium">{group.class_name}</span>
                <span className="text-slate-400 ml-1">· {group.phase}</span>
              </div>
              <div className="text-slate-500">
                {group.children_count} children
              </div>
              <div className="text-slate-500">
                {group.avg_sessions_per_week} sess/wk
              </div>
              <div
                className={
                  group.alignment_avg_score !== null
                    ? group.alignment_avg_score >= 50
                      ? "text-green-600"
                      : "text-amber-600"
                    : "text-slate-400"
                }
              >
                {group.alignment_avg_score !== null
                  ? `${group.alignment_avg_score}%`
                  : "—"}
              </div>
              <div>
                {group.flags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {group.flags.map((flag) => (
                      <span
                        key={flag}
                        className="bg-amber-50 text-amber-700 text-[10px] font-medium px-1.5 py-0.5 rounded"
                      >
                        {FLAG_LABELS[flag] || flag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs">No flags</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/pm/education-assistants/ea-detail-panel.tsx
git commit -m "feat(pm): add EA detail panel component"
```

---

### Task 4: Scatter chart component

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/pm/education-assistants/ea-scatter-chart.tsx`

- [ ] **Step 1: Create the scatter chart component**

Create `components/pm/education-assistants/ea-scatter-chart.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { EAPerformanceItem } from "@/lib/pm/types";
import { EADetailPanel } from "./ea-detail-panel";

const X_MID = 2.0;
const Y_MID = 50;

const QUADRANT_COLORS = {
  topRight: "#22c55e",   // green
  topLeft: "#f59e0b",    // amber
  bottomRight: "#f59e0b", // amber
  bottomLeft: "#ef4444", // red
} as const;

function getQuadrantColor(x: number, y: number): string {
  if (x >= X_MID && y >= Y_MID) return QUADRANT_COLORS.topRight;
  if (x < X_MID && y >= Y_MID) return QUADRANT_COLORS.topLeft;
  if (x >= X_MID && y < Y_MID) return QUADRANT_COLORS.bottomRight;
  return QUADRANT_COLORS.bottomLeft;
}

interface EAScatterChartProps {
  eas: EAPerformanceItem[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const ea = payload[0].payload as EAPerformanceItem;
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-slate-900">{ea.ea_name}</p>
      <p className="text-slate-500 text-xs">{ea.school}</p>
      <div className="mt-1 space-y-0.5 text-xs text-slate-600">
        <p>Sessions/day: {ea.sessions_per_programme_day}</p>
        <p>Alignment: {ea.alignment_avg_score}%</p>
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function EAScatterChart({ eas }: EAScatterChartProps) {
  const [selectedEA, setSelectedEA] = useState<EAPerformanceItem | null>(null);

  // Only plot EAs with alignment data
  const plottable = eas.filter((e) => e.alignment_avg_score !== null);

  // Compute X-axis max (round up to nearest integer, min 4)
  const maxX = Math.max(
    4,
    Math.ceil(
      Math.max(...plottable.map((e) => e.sessions_per_programme_day), 4)
    )
  );

  const handleClick = useCallback(
    (_: unknown, index: number) => {
      setSelectedEA(plottable[index]);
    },
    [plottable]
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-5">
        {/* Chart header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              EA Performance Map
            </h2>
            <p className="text-xs text-slate-500">
              Click an EA to see details below
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: QUADRANT_COLORS.topRight }}
              />
              High quality + dosage
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: QUADRANT_COLORS.topLeft }}
              />
              Mixed
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: QUADRANT_COLORS.bottomLeft }}
              />
              Needs support
            </span>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              dataKey="sessions_per_programme_day"
              name="Sessions/Day"
              domain={[0, maxX]}
              tick={{ fontSize: 11, fill: "#64748b" }}
              label={{
                value: "Avg Sessions / Programme Day",
                position: "bottom",
                offset: 8,
                style: { fontSize: 11, fill: "#94a3b8" },
              }}
            />
            <YAxis
              type="number"
              dataKey="alignment_avg_score"
              name="Alignment"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#64748b" }}
              label={{
                value: "Letter Alignment Score (%)",
                angle: -90,
                position: "insideLeft",
                offset: 4,
                style: { fontSize: 11, fill: "#94a3b8", textAnchor: "middle" },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              x={X_MID}
              stroke="#cbd5e1"
              strokeDasharray="6 4"
            />
            <ReferenceLine
              y={Y_MID}
              stroke="#cbd5e1"
              strokeDasharray="6 4"
            />
            <Scatter
              data={plottable}
              onClick={handleClick}
              cursor="pointer"
            >
              {plottable.map((ea, i) => (
                <Cell
                  key={ea.ea_name}
                  fill={getQuadrantColor(
                    ea.sessions_per_programme_day,
                    ea.alignment_avg_score!
                  )}
                  stroke={
                    selectedEA?.ea_name === ea.ea_name ? "#1e293b" : "white"
                  }
                  strokeWidth={selectedEA?.ea_name === ea.ea_name ? 2 : 1}
                  r={selectedEA?.ea_name === ea.ea_name ? 7 : 5}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Detail panel */}
      {selectedEA && (
        <EADetailPanel
          ea={selectedEA}
          onClose={() => setSelectedEA(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/pm/education-assistants/ea-scatter-chart.tsx
git commit -m "feat(pm): add EA scatter chart component with click-to-expand"
```

---

### Task 5: Page and sidebar entry

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/app/pm/education-assistants/page.tsx`
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/pm/layout/pm-sidebar.tsx:26-35`

- [ ] **Step 1: Create the page**

Create `app/pm/education-assistants/page.tsx`:

```tsx
import { getEAPerformance } from "@/lib/pm/api";
import { parseCohort, getCohortLabel } from "@/lib/pm/cohorts";
import { KPICard } from "@/components/pm/shared/kpi-card";
import { EAScatterChart } from "@/components/pm/education-assistants/ea-scatter-chart";
import { AlertTriangle } from "lucide-react";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EducationAssistantsPage({
  searchParams,
}: Props) {
  const params = await searchParams;
  const cohort = parseCohort(params.cohort as string | undefined);
  const cohortLabel = getCohortLabel(cohort);

  const { data, isLive } = await getEAPerformance(cohort);
  const { summary } = data;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {!isLive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-amber-800">
            <span className="font-semibold">
              EA performance data unavailable.
            </span>{" "}
            The EA performance API is not responding. Data shown below may be
            empty.
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Education Assistants
        </h1>
        <p className="text-sm text-slate-500">
          {cohortLabel} — {summary.total_eas} EAs with letters groups
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="EAs Plotted"
          value={summary.total_eas}
          subtitle="with letters groups"
          borderColor="border-l-primary"
        />
        <KPICard
          label="Top Right"
          value={summary.quadrant_counts.top_right}
          subtitle="high dosage + quality"
          borderColor="border-l-green-500"
        />
        <KPICard
          label="Avg Sessions/Day"
          value={summary.avg_sessions_per_programme_day}
          subtitle="programme average"
          borderColor="border-l-amber-500"
        />
        <KPICard
          label="Avg Alignment"
          value={`${summary.avg_alignment_score}%`}
          subtitle="letters groups only"
          borderColor="border-l-violet-500"
        />
      </div>

      {/* Scatter chart + detail panel */}
      <EAScatterChart eas={data.eas} />
    </div>
  );
}
```

- [ ] **Step 2: Add sidebar nav item**

In `components/pm/layout/pm-sidebar.tsx`, add `Users` to the Lucide import (line 6-16) and add the nav item to `NAV_ITEMS` (line 26-35).

Add `Users` to the import:

```typescript
import {
  LayoutDashboard,
  School,
  Calendar,
  BookOpen,
  AlertTriangle,
  ClipboardCheck,
  Eye,
  ArrowLeft,
  Grid3X3,
  Users,
} from "lucide-react";
```

Add the nav item after "Sessions" (between the Calendar and BookOpen entries):

```typescript
const NAV_ITEMS: NavItem[] = [
  { name: "Overview", href: "/pm", icon: LayoutDashboard, exact: true },
  { name: "Schools", href: "/pm/schools", icon: School },
  { name: "Sessions", href: "/pm/sessions", icon: Calendar },
  { name: "Education Assistants", href: "/pm/education-assistants", icon: Users },
  { name: "Letter Progress", href: "/pm/letter-progress", icon: BookOpen },
  { name: "Quality Flags", href: "/pm/quality-flags", icon: AlertTriangle },
  { name: "Letter Alignment", href: "/pm/letter-alignment", icon: Grid3X3 },
  { name: "Assessments", href: "/pm/assessments", icon: ClipboardCheck },
  { name: "Mentor Visits", href: "/pm/mentor-visits", icon: Eye },
];
```

Also add an explicit mobile tab list (so adding desktop items doesn't break mobile). Replace the `NAV_ITEMS.slice(0, 4)` in the mobile bottom bar with a dedicated array:

```typescript
const MOBILE_NAV_ITEMS = [
  NAV_ITEMS[0], // Overview
  NAV_ITEMS[1], // Schools
  NAV_ITEMS[3], // Education Assistants
  NAV_ITEMS[4], // Letter Progress
];
```

Then in the mobile `<nav>` section, replace `NAV_ITEMS.slice(0, 4)` with `MOBILE_NAV_ITEMS`:

```tsx
{MOBILE_NAV_ITEMS.map((item) => {
```

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add app/pm/education-assistants/page.tsx components/pm/layout/pm-sidebar.tsx
git commit -m "feat(pm): add Education Assistants page with scatter plot"
```

---

### Task 6: End-to-end verification

- [ ] **Step 1: Start dev server and verify page loads**

Run: `npm run dev`

Navigate to `http://localhost:3000/pm/education-assistants`

Verify:
- KPI cards show real data (total EAs > 0)
- Scatter plot renders with colored dots
- Dashed crosshair lines visible at X=2, Y=50
- Quadrant labels in legend match dot colors

- [ ] **Step 2: Test click interaction**

Click an EA dot on the scatter chart.

Verify:
- Selected dot gets a dark border and slightly larger radius
- Detail panel appears below the chart with:
  - EA name and school
  - Badges for sessions/day and alignment %
  - 4 stat boxes (groups, sessions, children, flags)
  - Group breakdown rows
  - Blending groups shown muted (lower opacity, "—" for alignment)

- [ ] **Step 3: Test cohort filtering**

Use the cohort dropdown (in the context bar) to switch to "SEF" or "Treatment".

Verify: scatter plot updates with fewer dots, KPIs recalculate.

- [ ] **Step 4: Test sidebar**

Verify "Education Assistants" appears in sidebar between "Sessions" and "Letter Progress" with the Users icon. Active state highlights correctly.

Also verify mobile bottom tabs: Education Assistants should appear instead of Sessions on mobile.

- [ ] **Step 5: Final build and lint check**

Run: `npm run build && npm run lint`

Expected: Build and lint both succeed with zero errors.

- [ ] **Step 6: Commit any fixes from testing**

If any fixes were needed during testing, commit them:
```bash
git add -A
git commit -m "fix(pm): polish EA performance page after testing"
```
