# Project Management Dashboard — Strategy & Implementation Plan

> Plan for progressively replacing the Streamlit data portal with polished, interactive dashboard pages in the Next.js website. This is the first workstream to implement.

---

## Table of Contents

1. [Vision & Goals](#vision--goals)
2. [User Personas](#user-personas)
3. [Navigation & Routing](#navigation--routing)
4. [Authentication & Authorization](#authentication--authorization)
5. [Phase 1: Programme Overview Dashboard](#phase-1-programme-overview-dashboard)
6. [Phase 2: Sessions, Letter Progress & Quality Flags](#phase-2-sessions-letter-progress--quality-flags)
7. [Phase 3: Assessments, Mentor Visits & Cohort Analysis](#phase-3-assessments-mentor-visits--cohort-analysis)
8. [Technical Architecture](#technical-architecture)
9. [Django API Endpoints Required](#django-api-endpoints-required)
10. [Implementation Sequence](#implementation-sequence)

---

## Vision & Goals

**Vision:** A single, polished project management hub within the Zazi iZandi website that gives funders, mentors, and staff real-time visibility into programme health — dosage, quality, and outcomes.

**Goals:**
1. Replace Streamlit as the primary dashboard over 3 phases
2. Provide a curated, opinionated view of the most important metrics (not a raw data dump)
3. Enable drill-down from programme → school → EA → group
4. Surface quality flags prominently so issues are caught early
5. Make data accessible to non-technical stakeholders (funders)

**Non-goals (for now):**
- Data entry or editing (TeamPact remains the data collection tool)
- Real-time streaming (nightly sync + 5-minute ISR is sufficient)
- Raw data export (users needing that can use Streamlit until migration is complete)

---

## User Personas

| Persona | Role | Needs | Frequency |
|---------|------|-------|-----------|
| **Funder** | External stakeholder funding the programme | High-level KPIs, impact numbers, programme health at a glance | Monthly/quarterly |
| **Senior Staff** | Programme directors, CEO | Cross-school comparison, dosage trends, quality flag overview, assessment outcomes | Weekly |
| **Mentor** | Field supervisor visiting schools | Their assigned schools' EAs, session activity, quality flags, mentor visit history | Daily/weekly |
| **Junior Staff** | Programme coordinators | Operational detail — session counts, letter progress, group-level data | Daily |

All personas access the same dashboard but focus on different levels of detail.

---

## Navigation & Routing

### Current Navigation (Project Management tab)
```
Project Management (funder role minimum)
├── 2025 Schools → /schools
└── 2026 Schools → /schools-2026
```

### Proposed Navigation
```
Project Management (funder role minimum)
├── Overview      → /pm                    [Phase 1]
├── Schools       → /pm/schools            [Phase 1 — enhanced school cards]
├── Sessions      → /pm/sessions           [Phase 2]
├── Letter Progress → /pm/letter-progress  [Phase 2]
├── Quality Flags → /pm/quality-flags      [Phase 2]
├── Assessments   → /pm/assessments        [Phase 3]
├── Mentor Visits → /pm/mentor-visits      [Phase 3]
├── ── separator ──
├── 2025 Schools  → /schools               [Keep as-is, legacy]
└── Data Portal   → /data-portal           [Keep as external link, phase out over time]
```

**URL structure:** All new PM pages live under `/pm/*` for clean routing and shared layout potential.

### Layout Consideration
The `/pm` pages could share a **dashboard layout** with:
- A sidebar or top tab navigation for switching between PM sub-pages
- Breadcrumb navigation for drill-downs (e.g., Overview → Schools → Siyazama PS → EA: Thando)
- Persistent date range / filter bar

This is different from the public pages which use the standard Header/Footer pattern. The PM section should feel like a dedicated dashboard app.

---

## Authentication & Authorization

**No changes needed for PM Dashboard.** Existing Clerk RBAC with `funder` minimum role already protects `/schools*` routes. The new `/pm/*` routes need:

1. Add `/pm` pattern to `middleware.ts` protected routes:
   ```typescript
   const PROTECTED_ROUTES: Record<string, Role> = {
     "/schools": "funder",
     "/pm": "funder"  // NEW
   };
   ```

2. Update header navigation with new PM sub-pages (all visible to `funder`+)

**Future consideration:** When EA role is added (for "My Kids" page), EAs should NOT see PM dashboard pages. The role hierarchy would become:
```
ea (0) < funder (1) < junior_staff (2) < senior_staff (3) < admin (4)
```

---

## Phase 1: Programme Overview Dashboard

**Goal:** A single page that answers "How is the programme doing?" at a glance.

### Route: `/pm`

### KPI Cards (Top Row)

| KPI | Source | Display |
|-----|--------|---------|
| Total Schools | `SchoolSummary2026` count | Number + breakdown (Primary / ECD) |
| Total EAs | Sum of `ea_count` across schools | Number |
| Total Children | Sum of `children_count` across schools | Number with thousands separator |
| Total Sessions (this month) | Sum of `sessions_this_month` | Number with thousands separator |
| Average Dosage | Mean of `avg_sessions_per_group_per_week` | Number with dosage color badge |
| Flagged EAs | Sum of flagged EA counts | Number with red badge |

### Charts

1. **Sessions Over Time** (line chart)
   - X-axis: dates (past 30 days by default)
   - Y-axis: session count
   - Lines: one per school type (Primary School vs ECD) + total
   - Filter: date range selector

2. **Dosage Distribution** (horizontal bar or histogram)
   - X-axis: dosage range (0-1, 1-2, 2-3, 3-4, 4+)
   - Y-axis: number of schools
   - Color: dosage status colors (red/yellow/green)

3. **School Performance Table**
   - Sortable table: school name, type, EAs, children, groups, sessions this week, sessions this month, avg dosage, flags
   - Click row → navigate to school detail (Phase 1 stretch or Phase 2)
   - Sortable by any column
   - Search/filter by school name

### Data Source
- Primarily `SchoolSummary2026` (already pre-computed)
- New endpoint: `/api/programme-overview/` for time-series data

---

### Route: `/pm/schools`

**Enhanced version of current `/schools-2026` page.**

Reuse existing school card components (`school-card-2026.tsx`, `school-cards-grid-2026.tsx`) with enhancements:

1. **Add filter by mentor** (group schools by mentor assignment)
2. **Add filter by region** (NMB vs East London)
3. **Add sort options** (by dosage, sessions, children count, flags)
4. **School detail drill-down** (click card → `/pm/schools/[school-name]`)

### School Detail Page: `/pm/schools/[school-name]`

When you click a school card, show:
- School KPIs (EAs, children, groups, total sessions, dosage)
- EA cards for each EA at this school (sessions, groups, flags)
- Group-level letter progress visualization
- Recent session activity (last 10 weekdays)
- Quality flags affecting this school
- Mentor visit history

---

## Phase 2: Sessions, Letter Progress & Quality Flags

### Route: `/pm/sessions`

**Replaces:** Streamlit "Sessions 2026" page

**Purpose:** Deep-dive into session activity patterns across the programme.

### Views

1. **Daily Session Trend** (line chart)
   - Filterable by: school, EA, school type, date range
   - Shows sessions per day with weekday/weekend differentiation

2. **EA Activity Heatmap** (grid)
   - Rows: EAs
   - Columns: past 10 weekdays
   - Cells: session count (color-coded 0-5+)
   - Quickly spot who is active and who isn't

3. **Session Distribution** (histogram)
   - How many days per week each EA runs sessions
   - Identifies EAs working 5 days vs 1-2 days

4. **School-Level Summary Table**
   - Sessions/day average, total sessions, active EAs, sessions/group/week
   - Sortable and filterable

### Filters Bar
- Date range (preset: last week, last 30 days, this month, this year, custom)
- School (dropdown)
- EA (dropdown, filtered by selected school)
- School type (Primary / ECD / All)
- Mentor (dropdown)

---

### Route: `/pm/letter-progress`

**Replaces:** Streamlit "Letter Progress 2026" + "Letter Progress Detailed 2026"

**Purpose:** Track where every group is in the letter curriculum.

### Views

1. **Progress Overview** (visual)
   - Each group shown as a progress bar along the 26-letter sequence
   - Color-coded by grade (Grade R = blue, Grade 1 = green, Grade 2 = purple)
   - Grouped by school, then by EA

2. **Average Progress by Grade** (bar chart)
   - Shows average letter progress index by grade across all schools

3. **Progress by School** (horizontal bar chart)
   - Top 30 schools ranked by average progress
   - Useful for identifying high/low performing schools

4. **Group Detail Table**
   - Columns: school, EA, group/class name, grade, current letter, progress %, sessions this week, last session date
   - Sortable, filterable, searchable
   - Click row → drill down to group session history

### Group Detail View: `/pm/letter-progress/[group-id]`
- Letter-by-letter timeline showing when each letter was first taught and how many sessions it appeared in
- Session-by-session table: date, letters taught, new vs review, notes
- Children in the group (names, attendance rate)
- Flags affecting this group

---

### Route: `/pm/quality-flags`

**Replaces:** Streamlit "Flag: Same Letter Groups" + "Flag: Moving Too Fast" + "Session Quality Review"

**Purpose:** Centralized quality monitoring — all flags in one place.

### Layout

1. **Flag Summary Cards** (top row)
   - One card per flag type showing: count of flagged EAs, percentage, trend (up/down from last week)
   - Cards for: Same Letter Groups, Moving Too Fast, Ghost Groups, Curriculum Gaps, Stagnation, Unbalanced Groups

2. **Flagged EAs Table**
   - Columns: EA name, school, mentor, flag type(s), flag detail, last session date
   - Filter by flag type, school, mentor
   - Click row → drill down to EA detail showing the specific flag evidence

3. **Flag Detail Views** (per flag type)
   - **Same Letter Groups:** Show which groups are at the same level, with letter details
   - **Moving Too Fast:** Show session-by-session letter transitions with review/no-review markers
   - **Ghost Groups:** Show last session date and gap duration per dormant group
   - **Curriculum Gaps:** Show the letter sequence with gaps highlighted
   - **Stagnation:** Show progress timeline (flat line over weeks)
   - **Unbalanced Groups:** Show session counts per group with imbalance highlighted

4. **Quality Trend** (line chart)
   - Flagged EA count over time (weekly aggregation)
   - Shows if quality is improving or deteriorating

---

## Phase 3: Assessments, Mentor Visits & Cohort Analysis

### Route: `/pm/assessments`

**Replaces:** Streamlit "Baseline 2026" + "ECD Baseline 2026"

**Purpose:** Assessment data analysis — baseline scores, group formation, future endline comparison.

### Views

1. **Assessment Overview KPIs**
   - Children assessed, average EGRA score, eligibility rate (EGRA >= 30), stop rule rate
   - Breakdown by language, grade, school type

2. **Score Distribution** (histogram)
   - X-axis: EGRA score (0-100)
   - Y-axis: number of children
   - Vertical line at score = 30 (eligibility threshold)
   - Filter by school, grade, language

3. **School Comparison** (bar chart)
   - Average EGRA score by school, sorted
   - Treatment vs control school comparison

4. **Cohort Analysis** (when endline data is available)
   - Score improvement by dosage cohort (0-10 sessions, 11-20, 21-30, 31-40, 41+)
   - Dose-response visualization: "Do children with more sessions improve more?"
   - Treatment vs control comparison

---

### Route: `/pm/mentor-visits`

**Replaces:** Streamlit "Mentor Visits 2026"

**Purpose:** Track mentor observations and quality patterns.

### Views

1. **Visit Summary**
   - Total visits, visits per mentor, visits per school, average visit duration
   - Coverage: which schools have been visited recently, which haven't

2. **Quality Ratings** (donut/pie charts)
   - Distribution of ratings for: session quality, learner engagement, EA energy, grouping correctness, letter tracker usage

3. **EA Quality Profiles**
   - Table: EA name, school, visit count, average quality rating, key observations
   - Links mentor observations to session data flags for holistic EA assessment

4. **Mentor Visit Coverage** (table or calendar view)
   - Which schools visited when
   - Highlighting schools not visited in > 2 weeks

---

## Technical Architecture

### Charting Library
**Recharts** — React-based, composable, works well with Next.js SSR.
- Install: `npm install recharts`
- Already compatible with Tailwind CSS styling

### Component Structure
```
components/
├── pm/
│   ├── layout/
│   │   ├── pm-layout.tsx          # Dashboard shell (sidebar + content)
│   │   ├── pm-sidebar.tsx         # Sub-navigation for PM pages
│   │   └── filter-bar.tsx         # Reusable filter bar component
│   ├── overview/
│   │   ├── kpi-cards.tsx          # Programme-level KPI cards
│   │   ├── sessions-chart.tsx     # Sessions over time line chart
│   │   ├── dosage-distribution.tsx # Dosage histogram
│   │   └── school-table.tsx       # Sortable school performance table
│   ├── sessions/
│   │   ├── session-trend.tsx      # Daily session trend chart
│   │   ├── ea-heatmap.tsx         # EA activity heatmap grid
│   │   └── session-distribution.tsx # Sessions per EA histogram
│   ├── letter-progress/
│   │   ├── progress-overview.tsx  # Visual progress bars
│   │   ├── progress-by-grade.tsx  # Average progress by grade chart
│   │   └── group-detail-table.tsx # Filterable group table
│   ├── quality-flags/
│   │   ├── flag-summary-cards.tsx # Flag count cards
│   │   ├── flagged-eas-table.tsx  # Master flagged EA table
│   │   └── flag-detail-views.tsx  # Per-flag-type detail views
│   ├── assessments/
│   │   ├── assessment-kpis.tsx    # Assessment overview cards
│   │   ├── score-distribution.tsx # EGRA score histogram
│   │   └── cohort-analysis.tsx    # Dose-response chart
│   └── mentor-visits/
│       ├── visit-summary.tsx      # Visit KPIs
│       ├── quality-ratings.tsx    # Rating distribution charts
│       └── visit-coverage.tsx     # Coverage table
app/
├── pm/
│   ├── layout.tsx                 # PM dashboard layout (sidebar, breadcrumbs)
│   ├── page.tsx                   # /pm → Overview dashboard
│   ├── schools/
│   │   ├── page.tsx               # /pm/schools → Enhanced school cards
│   │   └── [school-name]/
│   │       └── page.tsx           # /pm/schools/[name] → School detail
│   ├── sessions/
│   │   └── page.tsx               # /pm/sessions
│   ├── letter-progress/
│   │   ├── page.tsx               # /pm/letter-progress
│   │   └── [group-id]/
│   │       └── page.tsx           # /pm/letter-progress/[id] → Group detail
│   ├── quality-flags/
│   │   └── page.tsx               # /pm/quality-flags
│   ├── assessments/
│   │   └── page.tsx               # /pm/assessments
│   └── mentor-visits/
│       └── page.tsx               # /pm/mentor-visits
```

### Data Fetching Pattern
- **Server components** fetch data from Django API (same pattern as current `/schools-2026`)
- **ISR** with `revalidate: 300` (5 minutes) for all PM pages
- **Client components** only for interactive elements: charts, filters, search, sorting
- Each page calls one or two Django API endpoints
- Django pre-computes expensive aggregations in nightly cron; API endpoints read from pre-computed tables where possible

### Responsive Design
- Dashboard layout switches from sidebar to bottom tabs on mobile
- Charts resize responsively
- Tables become scrollable horizontally on small screens
- Filter bar collapses to a slide-out panel on mobile

---

## Django API Endpoints Required

All new endpoints needed, with expected data contract:

### `/api/programme-overview/`
```json
{
  "generated_at": "2026-04-03T10:00:00Z",
  "kpis": {
    "total_schools": 61,
    "total_schools_primary": 41,
    "total_schools_ecd": 20,
    "total_eas": 185,
    "total_children": 5550,
    "total_sessions_this_week": 420,
    "total_sessions_this_month": 1890,
    "total_sessions_all_time": 15000,
    "avg_dosage": 3.2,
    "flagged_eas_count": 12
  },
  "sessions_time_series": [
    {"date": "2026-03-01", "primary": 45, "ecd": 22, "total": 67},
    ...
  ],
  "dosage_distribution": [
    {"range": "0-1", "count": 3},
    {"range": "1-2", "count": 8},
    {"range": "2-3", "count": 15},
    {"range": "3-4", "count": 25},
    {"range": "4+", "count": 10}
  ]
}
```

### `/api/sessions-activity/?school=X&ea=X&from=X&to=X`
```json
{
  "daily_sessions": [
    {"date": "2026-04-01", "sessions": 42, "eas_active": 30},
    ...
  ],
  "ea_activity": [
    {
      "ea_name": "Thando M",
      "school": "Siyazama PS",
      "days": {"2026-04-01": 4, "2026-04-02": 3, ...}
    },
    ...
  ],
  "school_summary": [
    {
      "school": "Siyazama PS",
      "sessions_per_day_avg": 12.3,
      "total_sessions": 186,
      "active_eas": 6,
      "sessions_per_group_per_week": 3.1
    },
    ...
  ]
}
```

### `/api/letter-progress-2026/?school=X&mentor=X&grade=X`
```json
{
  "groups": [
    {
      "school": "Siyazama PS",
      "ea": "Thando M",
      "group": "Grade R Group 1",
      "grade": "Grade R",
      "current_letter": "i",
      "progress_index": 2,
      "progress_pct": 11.5,
      "sessions_this_week": 3,
      "last_session_date": "2026-04-02",
      "session_count": 18,
      "mentor": "Nothemba"
    },
    ...
  ],
  "average_by_grade": [
    {"grade": "Grade R", "avg_progress": 12.5},
    {"grade": "Grade 1", "avg_progress": 45.2}
  ],
  "letter_sequence": ["a","e","i","o","u","b","l","m","k","p","s","h","z","n","d","y","f","w","v","x","g","t","q","r","c","j"]
}
```

### `/api/quality-flags/`
```json
{
  "summary": {
    "same_letter_groups": {"flagged_eas": 5, "total_eas": 185, "pct": 2.7},
    "moving_too_fast": {"flagged_eas": 8, "total_eas": 185, "pct": 4.3},
    "ghost_groups": {"flagged_groups": 12, "total_groups": 450, "pct": 2.7},
    "curriculum_gaps": {"flagged_groups": 6, "total_groups": 450, "pct": 1.3},
    "stagnation": {"flagged_groups": 15, "total_groups": 450, "pct": 3.3},
    "unbalanced_groups": {"flagged_eas": 10, "total_eas": 185, "pct": 5.4}
  },
  "flagged_items": [
    {
      "ea": "Thando M",
      "school": "Siyazama PS",
      "mentor": "Nothemba",
      "flag_type": "same_letter_groups",
      "detail": {
        "groups_at_same_letter": ["Group 1", "Group 2", "Group 3"],
        "letter": "a",
        "letter_index": 0
      },
      "last_session": "2026-04-02"
    },
    ...
  ]
}
```

### `/api/assessments-summary/?type=baseline&language=X&grade=X`
```json
{
  "overview": {
    "total_assessed": 3200,
    "avg_score": 12.4,
    "eligibility_rate": 15.2,
    "stop_rule_rate": 28.5
  },
  "score_distribution": [
    {"score_range": "0-5", "count": 450},
    {"score_range": "6-10", "count": 620},
    ...
  ],
  "by_school": [
    {"school": "Siyazama PS", "avg_score": 14.2, "count": 65, "cohort": "treatment"},
    ...
  ],
  "by_language": [
    {"language": "isiXhosa", "avg_score": 11.8, "count": 1800},
    ...
  ]
}
```

### `/api/mentor-visits-summary/`
```json
{
  "overview": {
    "total_visits": 145,
    "unique_mentors": 6,
    "schools_visited": 42,
    "avg_duration_minutes": 25
  },
  "quality_ratings": {
    "session_quality": {"Excellent": 20, "Good": 45, "Average": 15, "Poor": 5},
    "learner_engagement": {"Excellent": 30, "Good": 40, "Average": 12, "Poor": 3},
    ...
  },
  "visits_by_school": [
    {"school": "Siyazama PS", "visit_count": 4, "last_visit": "2026-03-28", "avg_quality": "Good"},
    ...
  ],
  "coverage_gaps": [
    {"school": "Ntaba Maria PS", "last_visit": "2026-02-15", "days_since": 47}
  ]
}
```

---

## Implementation Sequence

### Phase 1 (Estimated scope: 3-4 development sessions)

| Step | Task | Dependencies |
|------|------|-------------|
| 1.1 | Create `/pm` route structure and shared dashboard layout | None |
| 1.2 | Install Recharts, set up chart wrapper components | None |
| 1.3 | Update header navigation with new PM sub-pages | 1.1 |
| 1.4 | Update `middleware.ts` to protect `/pm/*` routes | 1.1 |
| 1.5 | Build Django `/api/programme-overview/` endpoint | None (backend) |
| 1.6 | Build `/pm` overview page: KPI cards + charts + school table | 1.1, 1.2, 1.5 |
| 1.7 | Move/enhance school cards to `/pm/schools` | 1.1 |
| 1.8 | Build school detail page `/pm/schools/[school-name]` | 1.7 |

### Phase 2 (Estimated scope: 4-5 development sessions)

| Step | Task | Dependencies |
|------|------|-------------|
| 2.1 | Build Django `/api/sessions-activity/` endpoint | None (backend) |
| 2.2 | Build `/pm/sessions` page with charts and EA heatmap | 2.1 |
| 2.3 | Build Django `/api/letter-progress-2026/` endpoint | None (backend) |
| 2.4 | Build `/pm/letter-progress` page with progress visualization | 2.3 |
| 2.5 | Implement new flags in Django (Ghost Groups, Curriculum Gaps, Stagnation, Unbalanced Groups) | None (backend) |
| 2.6 | Build Django `/api/quality-flags/` endpoint | 2.5 |
| 2.7 | Build `/pm/quality-flags` page | 2.6 |
| 2.8 | Build group detail drill-down page | 2.4 |

### Phase 3 (Estimated scope: 3-4 development sessions)

| Step | Task | Dependencies |
|------|------|-------------|
| 3.1 | Build Django `/api/assessments-summary/` endpoint | None (backend) |
| 3.2 | Build `/pm/assessments` page | 3.1 |
| 3.3 | Build Django `/api/mentor-visits-summary/` endpoint | None (backend) |
| 3.4 | Build `/pm/mentor-visits` page | 3.3 |
| 3.5 | Add cohort analysis to assessments (when endline data available) | 3.2 |
| 3.6 | Polish, cross-linking between pages, responsive testing | All above |

---

## Success Criteria

- [ ] Funders can see programme health at a glance on `/pm` without needing Streamlit
- [ ] Mentors can quickly identify which EAs need support via quality flags
- [ ] All key Streamlit metrics are available in Next.js
- [ ] Pages load quickly (ISR + pre-computed data, no slow real-time queries)
- [ ] Dashboard is usable on tablet (mentors in the field)
- [ ] 6 quality flags are operational (2 existing + 4 new)
- [ ] Drill-down path works: Programme → School → EA → Group → Session history

---

## Open Questions

1. **Sidebar vs top tabs** for PM sub-navigation? Sidebar is standard for dashboards but uses horizontal space. Top tabs are familiar from the rest of the site.
2. **Date range persistence** — should selected filters persist across page navigation within PM? (URL params vs state management)
3. **School detail page** — should this replace or supplement the current school card detail?
4. **Comparative view** — do funders want to compare schools/regions side-by-side, or is sorted tables sufficient?
5. **Export** — should any views support CSV/PDF export, or is that a Streamlit-only feature for now?

---

## Related Documentation

- [Data, Metrics & Flags Reference](data-metrics-reference.md) — all data fields, metrics formulas, and flag logic
- [EA "My Kids" Plan](ea-my-kids-plan.md) — the EA-facing workstream (implements after PM Dashboard)
- [Zazi iZandi Programme Guide](zazi_izandi_programme_guide.md) — curriculum rules that flags enforce
- [Data & Backend](data-and-backend.md) — current Django API setup
- [Routes](routes.md) — current route structure
- [Components](components.md) — current component architecture
