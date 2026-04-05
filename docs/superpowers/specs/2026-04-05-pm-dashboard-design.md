# PM Dashboard — Design Specification

> A next-level project management dashboard for the Zazi iZandi programme, replacing Streamlit with a polished, interactive, command-center experience inside the Next.js website.

---

## Context

The Zazi iZandi programme operates across 61 schools with 185 EAs serving 5,550 children. Programme data currently lives in a Django backend and is viewed via Streamlit. This dashboard replaces Streamlit with a purpose-built PM hub that serves four personas — funders, senior staff, mentors, and junior staff — through progressive disclosure of programme health, dosage, quality, and outcomes.

This spec integrates the original `pm-dashboard-plan.md`, all three tiers from `pm-dashboard-metrics-recommendations.md`, and five elevation features: timeline intelligence, command center mode, targets vs actuals, full flag lifecycle, and a dedicated comparison page.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Navigation | Left sidebar | Industry standard for data-heavy dashboards; scales to 10+ pages; room for badges |
| Information hierarchy | Progressive disclosure | Funders stop at the health badge, staff scroll to charts, mentors drill into tables |
| Metrics scope | All 3 recommendation tiers | Weighted dosage, trust metrics, teaching-to-need, data health — full integration |
| Elevation features | All 5 | Timeline intelligence, command center, targets, flag lifecycle, comparison page |
| Phasing | Phase 1 heavily elevated | The first page users see must be exceptional |
| Flag lifecycle | Full with history | New Django model; states: new → acknowledged → in_progress → resolved |
| Comparisons | Dedicated `/pm/compare` page | Clean separation; pick dimension and see side-by-side KPIs + charts |
| Targets | Hardcoded in Django | `ProgrammeTargets` model; updated via admin; stable annual values |

---

## Dashboard Shell

### Left Sidebar

- Dark theme (`slate-900` / `#1e293b`)
- Brand: "Zazi iZandi PM" in accent-yellow at top
- 7 nav items with Lucide icons + text labels:
  - Overview (`LayoutDashboard`)
  - Schools (`School`)
  - Sessions (`Calendar`)
  - Letter Progress (`BookOpen`)
  - Quality Flags (`AlertTriangle`) — with red badge count
  - Assessments (`ClipboardCheck`)
  - Mentor Visits (`Eye`)
- Separator, then: Compare (`GitCompare`)
- Clerk `UserButton` avatar at bottom
- Active item: highlighted background + yellow left border
- Responsive:
  - `≥1024px`: full sidebar (210px)
  - `768–1023px`: icon-only (48px)
  - `<768px`: bottom tab bar (top 5 items + "More" overflow)

### Main Content Area

- Light background (`#f8fafc`)
- Breadcrumb bar at top for drill-down pages (e.g., Overview → Schools → Siyazama PS)
- All content within a max-width container with responsive padding

### Routing

All PM pages under `/pm/*`. Shared layout at `app/pm/layout.tsx` renders sidebar + breadcrumbs + content slot.

```
app/pm/
├── layout.tsx                    # Sidebar + breadcrumbs shell
├── page.tsx                      # /pm → Overview (command center)
├── schools/
│   ├── page.tsx                  # /pm/schools → Enhanced school cards
│   └── [school-name]/
│       └── page.tsx              # /pm/schools/[name] → School detail
├── sessions/
│   └── page.tsx                  # /pm/sessions
├── letter-progress/
│   ├── page.tsx                  # /pm/letter-progress
│   └── [group-id]/
│       └── page.tsx              # /pm/letter-progress/[id]
├── quality-flags/
│   └── page.tsx                  # /pm/quality-flags
├── assessments/
│   └── page.tsx                  # /pm/assessments
├── mentor-visits/
│   └── page.tsx                  # /pm/mentor-visits
└── compare/
    └── page.tsx                  # /pm/compare
```

### Authentication

Add `/pm` to `middleware.ts` protected routes:

```typescript
const PROTECTED_ROUTES: Record<string, Role> = {
  "/schools": "funder",
  "/pm": "funder",
};
```

Update `createRouteMatcher` pattern to include `/pm(.*)`.

### Header Navigation

Add new items to the "Project Management" nav group in `header.tsx`:

- Overview → `/pm`
- Schools → `/pm/schools`
- Sessions → `/pm/sessions`
- Letter Progress → `/pm/letter-progress`
- Quality Flags → `/pm/quality-flags`
- Assessments → `/pm/assessments`
- Mentor Visits → `/pm/mentor-visits`
- Compare → `/pm/compare`

Keep legacy items: 2025 Schools → `/schools`, Data Portal (external link).

---

## Phase 1: The Command Center

### `/pm` — Programme Overview

Four layers of progressive disclosure:

#### Layer 0: Programme Context Bar

Dark gradient bar (`slate-800` → `slate-700`) across top of content area.

| Element | Position | Source |
|---------|----------|--------|
| "2026 Programme" | Left | Static |
| "Week 6 of 40" + progress mini-bar | Left-center | Computed: `floor((today - programme_start_date) / 7) + 1` |
| Health badge | Right | Composite: green "HEALTHY" / amber "NEEDS ATTENTION" / red "ACTION REQUIRED" |
| "Data as of [timestamp] · [X]h ago" | Right | `data_freshness_hours` from API |

**Health signal computation:**

```
health_score = weighted_average([
  min(dosage_actual / dosage_target, 1.0),          // weight: 0.3
  min(on_track_actual / on_track_target, 1.0),      // weight: 0.3
  1 - (active_flag_count / total_eas),              // weight: 0.2
  min(flag_resolution_rate / resolution_target, 1.0) // weight: 0.2
])

≥ 0.80 → HEALTHY (green)
≥ 0.60 → NEEDS ATTENTION (amber)
<  0.60 → ACTION REQUIRED (red)
```

#### Layer 1: KPI Cards (2 rows of 3)

**Top row — actionable metrics with target comparison:**

| Card | Value | Target comparison | Border color |
|------|-------|-------------------|--------------|
| Weighted Dosage | `weighted_programme_dosage` | "X% of target" + progress bar | Dosage color (green/yellow/red) |
| On-Track Groups | `on_track_group_rate` (% groups ≥ 3 sessions/week) | "X% of target" + progress bar | Dosage color |
| Active Flags | Count of non-resolved `FlagEvent` records | Week-over-week delta + lifecycle breakdown ("4 new · 5 active · 3 resolved") | Red |

**Bottom row — informational metrics:**

| Card | Value | Subtitle | Border color |
|------|-------|----------|--------------|
| Schools | `total_schools` | "X Primary · Y ECD" | Primary blue |
| EAs & Children | `total_eas` | "X children enrolled" | Purple |
| Sessions | `total_sessions_this_month` | "X this week · Y all-time" | Cyan |

**Weighted dosage formula** (replaces simple mean):

```
weighted_programme_dosage = sum(total_sessions across all groups)
                         / (sum(groups_count across all schools) * weeks_since_programme_start)
```

#### Layer 2: Charts

Two-column layout (5:3 ratio):

**Sessions Over Time** (left, wider)
- Recharts `LineChart`
- X-axis: dates (past 30 days default)
- Y-axis: session count
- 3 lines: Primary School, ECD, Total
- Tooltip with date + counts

**Dosage Distribution** (right, narrower)
- Recharts `BarChart` (horizontal)
- 5 buckets: 0–1, 1–2, 2–3, 3–4, 4+
- Color: red (0–2), yellow (2–3), green (3+)
- Shows school count per bucket

#### Layer 3: School Performance Table

- Sortable columns: School, Type, EAs, Children, Sessions/week, Dosage, Flags
- Dosage cell color-coded (green/yellow/red thresholds)
- Flag count in red badge
- Search input for school name filtering
- Click row → `/pm/schools/[school-name]`

#### Data Health Panel (collapsed by default)

Expandable section at bottom, visible to `junior_staff`+ roles:
- `data_freshness_hours`: time since last sync
- Last sync timestamp
- `join_match_rate`: % records successfully linked

### `/pm/schools` — Enhanced School Cards

Reuse existing `school-card-2026.tsx` component architecture with enhancements:

**New filters:**
- By mentor (dropdown from `mentor_schools.py` data)
- By region (NMB / East London)
- By school type (Primary / ECD / All)
- By dosage level (On Track / Needs Attention / Low Dosage)

**New sort options:**
- By dosage (default)
- By sessions this week
- By children count
- By flag count

**Grid:** Responsive 1/2/3 columns. Cards clickable → school detail.

### `/pm/schools/[school-name]` — School Detail

Drill-down page showing:
- School-level KPI cards (EAs, children, groups, total sessions, dosage, flags)
- EA cards grid: one card per EA showing their session count, groups, flags
- Group-level letter progress bars (visual: progress along 26-letter sequence)
- Recent session activity (sparkline or mini-table, last 10 weekdays)
- Quality flags affecting this school (from `FlagEvent` table)
- Mentor visit history for this school

Breadcrumb: Overview → Schools → [School Name]

---

## Phase 2: Operational Pages

### `/pm/sessions` — Session Activity

**Shared filter bar** (reusable component):
- Date range: last week, last 30 days, this month, YTD, custom
- School dropdown
- EA dropdown (filtered by selected school)
- School type: Primary / ECD / All
- Mentor dropdown

**Views:**

1. **Daily Session Trend** — `LineChart`, sessions per day, filterable
2. **EA Activity Heatmap** — Grid: rows = EAs, columns = last 10 weekdays, cells = session count (0–5+ color scale). Key tool for spotting inactive EAs
3. **Session Distribution** — Histogram: sessions/day per EA. Shows who runs 5 days vs 1–2
4. **School-Level Summary Table** — sessions/day avg, total sessions, active EAs, sessions/group/week. Sortable

### `/pm/letter-progress` — Curriculum Tracking

**Views:**

1. **Progress Overview** — Each group as a progress bar along the 26-letter sequence. Color-coded by grade (Grade R = blue, Grade 1 = green, Grade 2 = purple). Grouped by school → EA
2. **Average Progress by Grade** — `BarChart` showing mean progress index by grade
3. **Progress by School** — Horizontal bar chart, top 30 schools ranked by avg progress
4. **Group Detail Table** — Columns: school, EA, group, grade, current letter, progress %, sessions/week, last session date. Sortable, filterable, searchable

**New metrics displayed:**
- `teaching_to_need_alignment` in group drill-downs (matched weak letters / total letters taught recently)
- `exposure_adequacy_rate` alongside progression (% letters with ≥ 5 exposures before moving on)

**Drill-down:** `/pm/letter-progress/[group-id]`
- Letter-by-letter timeline: when each letter was first taught, sessions per letter
- Session-by-session table: date, letters taught, new vs review, notes
- Children in the group (names, attendance rate)
- Flags affecting this group

### `/pm/quality-flags` — Quality Monitoring with Lifecycle

**Flag Summary Cards** (6 cards, 2 rows of 3):
One card per flag type. Each shows:
- Flag count (EAs or groups depending on flag)
- Icon
- Lifecycle breakdown: "X new · Y active · Z resolved"
- Percentage of total EAs/groups
- Week-over-week trend (↑/↓)

**Flag types:**
1. Same Letter Groups — 3+ groups at same letter (letter-phase only)
2. Moving Too Fast — >70% no-review transitions (letter-phase only)
3. Ghost Groups — No session in 5+ weekdays
4. Stagnation — Same letter for 2+ weeks with 4+ sessions (letter-phase only)
5. Curriculum Gaps — Letters skipped in sequence (letter-phase only)
6. Unbalanced Groups — Min group sessions < 50% of max group sessions

**14-Day Resolution Rate** — Large KPI card: `resolved_within_14_days / new_flags_last_14_days`. Target: 80%.

**Flag Trend** — Stacked bar chart (weekly, past 8 weeks): new (red) / active (amber) / resolved (green).

**Flagged Items Table:**
- Columns: EA/Group, School, Mentor, Flag Type, Status, Detail
- Filter tabs: All / New only / Active / Resolved
- Status badges: NEW (red), ACKNOWLEDGED (blue), IN PROGRESS (amber), RESOLVED (green)
- Click row → flag detail showing evidence (e.g., which groups at which letter, transition history)

**Flag Lifecycle (new Django model `FlagEvent`):**

```
States: new → acknowledged → in_progress → resolved

Transitions:
- new → acknowledged:    Staff clicks "Seen" in UI (records who + when)
- acknowledged → in_progress: Staff marks as being addressed
- in_progress → resolved: Auto-resolved when condition clears for 2 consecutive nightly compute cycles
- new → resolved:         Auto-resolved (condition cleared before anyone saw it)
- Any → resolved:         Manual resolution with note
```

"Resolved" definition: flag condition no longer detected for 2 consecutive recompute cycles (2 nights).

---

## Phase 3: Analysis Pages

### `/pm/assessments` — Assessment Outcomes

**KPI Row:**
- Children assessed
- Average LCPM (letters correct per minute)
- Average WCPM (words correct per minute)
- % Grade 1 at 40+ LCPM (primary researcher benchmark)
- % Grade R at 15+ LCPM (informal benchmark)
- % zero letter knowledge

**Trust Cards** (new, displayed next to outcome KPIs):
- `assessment_coverage_rate` = assessed children / eligible children
- `assessment_completeness_rate` = complete assessments / started assessments

**Score Distribution** — Histogram: X = LCPM score (0–100), Y = child count. Vertical threshold lines at 0, 15, 30, 40. Filterable by school, grade, language.

**School Comparison** — Bar chart: avg LCPM by school (sorted). Treatment vs control color-coding. % at benchmark per school.

**Researcher Impact Metrics** (when endline data available):
- Baseline vs endline: avg LCPM improvement, avg WCPM improvement
- % at 40+ LCPM (Grade 1): baseline vs endline, treatment vs control
- % at 15+ LCPM (Grade R): baseline vs endline
- % zero knowledge: baseline vs endline (should decrease)
- Dose-response: improvement by dosage cohort (0–10, 11–20, 21–30, 31–40, 41+ sessions)

**Sample size guardrails:** All disaggregated views show `n=X`. Suppress percentages when `n < 20`.

### `/pm/mentor-visits` — Mentor Quality & Coverage

**Visit Summary KPIs:** total visits, unique mentors, schools visited, avg duration

**Quality Ratings:** Donut charts per dimension (session quality, learner engagement, EA energy, grouping correctness, letter tracker usage). Ratings: Excellent / Good / Average / Poor.

**EA Quality Profiles Table:** EA name, school, visit count, avg quality rating, key observations. Links mentor data to session flags for holistic view.

**Coverage:**
- `mentor_coverage_recency`: % schools visited in last 14 days
- Unvisited school highlighting (schools not visited in > 14 days)
- Coverage table with last-visit date and days-since

### `/pm/compare` — Dedicated Comparison Page

**Dimension picker** (radio buttons):
- Region: NMB vs East London (mapping from `data/mentor_schools.py` in Django backend)
- Cohort: Treatment vs Control (mapping from static cohort config in Django)
- Type: Primary School vs ECD (from `SchoolSummary2026.school_type`)

**Side-by-side KPI cards:** Same KPI card component, rendered twice with comparison data. Delta/difference shown between them with directional indicator.

**Overlaid charts:** Same chart type (line/bar), two data series overlaid with distinct colors. Legend shows which group is which.

**Metrics available for comparison:**
- Weighted dosage
- On-track group rate
- Session counts
- Average letter progress
- Flag counts
- Assessment scores (when available)

---

## New Django Models

### `ProgrammeTargets`

```python
class ProgrammeTargets(models.Model):
    year = models.IntegerField(primary_key=True)
    programme_start_date = models.DateField()
    programme_end_date = models.DateField()
    target_dosage = models.FloatField()                  # e.g., 3.5
    target_on_track_pct = models.FloatField()            # e.g., 85.0
    target_flag_resolution_pct = models.FloatField()     # e.g., 80.0
    target_assessment_coverage_pct = models.FloatField() # e.g., 95.0
    target_mentor_coverage_days = models.IntegerField()  # e.g., 14
```

Populated via Django admin. One row per programme year.

### `FlagEvent`

```python
class FlagEvent(models.Model):
    FLAG_TYPES = [
        ('same_letter_group', 'Same Letter Groups'),
        ('moving_too_fast', 'Moving Too Fast'),
        ('ghost_group', 'Ghost Groups'),
        ('stagnation', 'Stagnation'),
        ('curriculum_gaps', 'Curriculum Gaps'),
        ('unbalanced_groups', 'Unbalanced Groups'),
    ]
    STATUSES = [
        ('new', 'New'),
        ('acknowledged', 'Acknowledged'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
    ]

    flag_type = models.CharField(max_length=30, choices=FLAG_TYPES)
    entity_type = models.CharField(max_length=10)    # 'ea' or 'group'
    entity_id = models.CharField(max_length=200)     # EA name or "program_name|class_name"
    school = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUSES, default='new')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    acknowledged_by = models.CharField(max_length=100, blank=True, null=True)
    resolution_note = models.TextField(blank=True, null=True)
    consecutive_clear_cycles = models.IntegerField(default=0)

    class Meta:
        unique_together = ('flag_type', 'entity_type', 'entity_id')
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['school']),
            models.Index(fields=['flag_type', 'status']),
        ]
```

### `FlagSnapshot` (for weekly trend chart)

```python
class FlagSnapshot(models.Model):
    snapshot_date = models.DateField()
    flag_type = models.CharField(max_length=30)
    new_count = models.IntegerField()
    active_count = models.IntegerField()
    resolved_count = models.IntegerField()

    class Meta:
        unique_together = ('snapshot_date', 'flag_type')
```

Created weekly by a management command that snapshots current `FlagEvent` counts.

---

## Django API Endpoints

### Enhanced Existing

**`GET /api/programme-overview/`**

```json
{
  "generated_at": "2026-04-05T08:00:00Z",
  "programme": {
    "year": 2026,
    "start_date": "2026-02-23",
    "end_date": "2026-11-28",
    "current_week": 6,
    "total_weeks": 40
  },
  "targets": {
    "dosage": 3.5,
    "on_track_pct": 85.0,
    "flag_resolution_pct": 80.0,
    "assessment_coverage_pct": 95.0,
    "mentor_coverage_days": 14
  },
  "kpis": {
    "total_schools": 61,
    "total_schools_primary": 41,
    "total_schools_ecd": 20,
    "total_eas": 185,
    "total_children": 5550,
    "weighted_dosage": 3.2,
    "on_track_group_rate": 78.0,
    "total_sessions_this_week": 420,
    "total_sessions_this_month": 1890,
    "total_sessions_all_time": 15000,
    "active_flags": 12,
    "flags_delta_week": -3,
    "flag_resolution_rate_14d": 72.0,
    "flag_lifecycle": {
      "new": 4,
      "acknowledged": 2,
      "in_progress": 3,
      "resolved_this_week": 3
    }
  },
  "health": {
    "score": 0.83,
    "status": "healthy",
    "components": {
      "dosage": 0.91,
      "on_track": 0.92,
      "flags": 0.94,
      "resolution": 0.90
    }
  },
  "data_health": {
    "freshness_hours": 2.0,
    "last_sync": "2026-04-05T06:00:00Z",
    "join_match_rate": 0.97
  },
  "sessions_time_series": [
    {"date": "2026-03-06", "primary": 45, "ecd": 22, "total": 67}
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

### New Endpoints

**`GET /api/sessions-activity/?school=X&ea=X&from=X&to=X`** — Session time-series, EA activity heatmap data, school summary. (Contract as in `pm-dashboard-plan.md`)

**`GET /api/letter-progress-2026/?school=X&grade=X&mentor=X`** — Group progress, average by grade, letter sequence. Enhanced with `teaching_to_need_alignment` and `exposure_adequacy_rate` per group.

**`GET /api/quality-flags/`** — Flag summary counts with lifecycle, flagged items with status, flag trend snapshots. Enhanced from plan with `FlagEvent` data.

**`GET /api/flag-events/`** — CRUD for flag lifecycle state changes.
- `PATCH /api/flag-events/{id}/` — Update status (acknowledge, mark in-progress, resolve with note)
- **Auth for writes:** PATCH requests require a shared secret token passed via `Authorization: Token <DJANGO_API_TOKEN>` header. The Next.js frontend calls a Next.js API route (e.g., `/api/flags/[id]`) which proxies to Django with the secret. This avoids exposing the Django token to the browser.

**`GET /api/assessments-summary/?type=baseline&language=X&grade=X`** — Assessment outcomes + trust metrics (`coverage_rate`, `completeness_rate`). Enhanced from plan.

**`GET /api/mentor-visits-summary/`** — Visit KPIs, quality ratings, coverage with `mentor_coverage_recency`.

**`GET /api/comparison/?dimension=region`** — Returns two data sets (e.g., NMB vs EL) for the same set of KPIs, enabling the comparison page.

---

## Component Architecture

```
components/pm/
├── layout/
│   ├── pm-layout.tsx              # Dashboard shell (sidebar + content)
│   ├── pm-sidebar.tsx             # Sidebar navigation with active state + badges
│   ├── pm-breadcrumbs.tsx         # Breadcrumb navigation for drill-downs
│   ├── programme-context-bar.tsx  # Dark bar: week, health badge, freshness
│   └── filter-bar.tsx             # Reusable filter bar (date, school, EA, type, mentor)
├── shared/
│   ├── kpi-card.tsx               # Reusable KPI card with optional target comparison bar
│   ├── data-table.tsx             # Sortable/filterable/searchable table
│   ├── chart-wrapper.tsx          # Recharts wrapper with loading/error states
│   ├── health-badge.tsx           # Green/amber/red programme health badge
│   └── target-indicator.tsx       # Target vs actual progress bar
├── overview/
│   ├── overview-kpis.tsx          # 6 KPI cards (2 rows of 3)
│   ├── sessions-chart.tsx         # Sessions over time LineChart
│   ├── dosage-distribution.tsx    # Dosage horizontal BarChart
│   └── school-table.tsx           # Sortable school performance table
├── schools/
│   ├── school-filters.tsx         # Filter controls (mentor, region, type, dosage)
│   ├── school-detail-kpis.tsx     # School-level KPI cards
│   └── ea-card.tsx                # EA summary card for school detail page
├── sessions/
│   ├── session-trend.tsx          # Daily session trend LineChart
│   ├── ea-heatmap.tsx             # EA × weekday activity heatmap grid
│   └── session-distribution.tsx   # Sessions/day per EA histogram
├── letter-progress/
│   ├── progress-overview.tsx      # Visual progress bars along 26-letter sequence
│   ├── progress-by-grade.tsx      # Average progress BarChart by grade
│   └── group-detail-table.tsx     # Filterable group table
├── quality-flags/
│   ├── flag-summary-cards.tsx     # 6 flag type cards with lifecycle badges
│   ├── flag-resolution-kpi.tsx    # 14-day resolution rate card
│   ├── flag-trend-chart.tsx       # Weekly stacked bar (new/active/resolved)
│   ├── flagged-items-table.tsx    # Master table with status filters
│   └── flag-lifecycle-actions.tsx # Acknowledge/update status buttons
├── assessments/
│   ├── assessment-kpis.tsx        # Outcome KPIs + trust cards
│   ├── score-distribution.tsx     # LCPM histogram with threshold lines
│   └── school-comparison.tsx      # School avg LCPM bar chart
├── mentor-visits/
│   ├── visit-summary.tsx          # Visit KPIs
│   ├── quality-ratings.tsx        # Donut charts per dimension
│   └── visit-coverage.tsx         # Coverage table with recency highlighting
└── compare/
    ├── comparison-selector.tsx    # Dimension picker (region/cohort/type)
    ├── comparison-kpis.tsx        # Side-by-side KPI cards with delta
    └── comparison-charts.tsx      # Overlaid chart comparisons
```

---

## Data Fetching Pattern

- **Server components** fetch from Django API (same pattern as `/schools-2026`)
- **ISR** with `revalidate: 300` (5 minutes) for all PM pages
- **Client components** only for: charts (Recharts), filters, search, sorting, flag lifecycle actions
- Each page calls 1–2 Django endpoints
- Django pre-computes in nightly cron; API reads from pre-computed tables
- Flag lifecycle actions use client-side `fetch` with `PATCH`

---

## Charting

**Library:** Recharts (`npm install recharts`)
- React-based, composable, Next.js SSR compatible
- Tailwind CSS compatible for styling
- Chart components: `LineChart`, `BarChart`, `PieChart` (donut via inner radius)

**Chart wrapper:** `chart-wrapper.tsx` handles loading skeleton, error state, and responsive container.

---

## Responsive Design

| Breakpoint | Sidebar | Content | Charts | Tables |
|------------|---------|---------|--------|--------|
| `≥1024px` | Full (210px) | Remaining width | Side-by-side | Full columns |
| `768–1023px` | Icon-only (48px) | Remaining width | Stacked | Horizontal scroll |
| `<768px` | Bottom tab bar | Full width | Stacked, full width | Horizontal scroll |

Filter bar collapses to a slide-out drawer on mobile.

---

## Phased Implementation

### Phase 1: Command Center (heavily elevated)

| Step | Task | Scope |
|------|------|-------|
| 1.1 | Create `/pm` route structure + shared dashboard layout (sidebar, breadcrumbs) | Frontend |
| 1.2 | Install Recharts, build shared components (kpi-card, data-table, chart-wrapper, health-badge, target-indicator) | Frontend |
| 1.3 | Update `middleware.ts` to protect `/pm/*` routes | Frontend |
| 1.4 | Update `header.tsx` navigation with PM sub-pages | Frontend |
| 1.5 | Create `ProgrammeTargets` Django model + migration | Backend |
| 1.6 | Build enhanced `/api/programme-overview/` endpoint (with targets, timeline, health signal, data health) | Backend |
| 1.7 | Build `/pm` overview page: context bar + KPI cards + charts + school table | Frontend |
| 1.8 | Move/enhance school cards to `/pm/schools` with filters + sort | Frontend |
| 1.9 | Build school detail page `/pm/schools/[school-name]` | Frontend |

### Phase 2: Operational Pages

| Step | Task | Scope |
|------|------|-------|
| 2.1 | Build `/api/sessions-activity/` endpoint | Backend |
| 2.2 | Build `/pm/sessions` page (trend, heatmap, distribution, table) | Frontend |
| 2.3 | Build `/api/letter-progress-2026/` endpoint (with teaching-to-need, exposure adequacy) | Backend |
| 2.4 | Build `/pm/letter-progress` page + group detail drill-down | Frontend |
| 2.5 | Implement new flags in Django (Ghost Groups, Curriculum Gaps, Stagnation, Unbalanced Groups) | Backend |
| 2.6 | Create `FlagEvent` + `FlagSnapshot` models + migration | Backend |
| 2.7 | Build flag lifecycle management command (nightly: compare flags, create/resolve events) | Backend |
| 2.8 | Build `/api/quality-flags/` + `/api/flag-events/` endpoints | Backend |
| 2.9 | Build `/pm/quality-flags` page (summary cards, resolution rate, trend chart, table with lifecycle) | Frontend |

### Phase 3: Analysis Pages

| Step | Task | Scope |
|------|------|-------|
| 3.1 | Build `/api/assessments-summary/` endpoint (with trust metrics) | Backend |
| 3.2 | Build `/pm/assessments` page (KPIs, trust cards, histogram, school comparison) | Frontend |
| 3.3 | Build `/api/mentor-visits-summary/` endpoint (with coverage recency) | Backend |
| 3.4 | Build `/pm/mentor-visits` page (KPIs, quality ratings, coverage table) | Frontend |
| 3.5 | Build `/api/comparison/` endpoint | Backend |
| 3.6 | Build `/pm/compare` page (dimension picker, side-by-side KPIs, overlaid charts) | Frontend |
| 3.7 | Add researcher impact metrics to `/pm/assessments` (when endline available) | Both |
| 3.8 | Polish, cross-linking between pages, responsive testing | Frontend |

---

## Verification Plan

### Phase 1 verification
1. `npm run build` passes with no errors
2. `/pm` loads with sidebar, context bar, KPI cards, charts, and table
3. Health badge shows correct status based on targets
4. School table is sortable and searchable
5. Click school row → navigates to `/pm/schools/[name]`
6. `/pm/schools` shows filterable, sortable school cards
7. Middleware redirects unauthenticated users to `/login`
8. Responsive: sidebar collapses at 768px, bottom tabs on mobile

### Phase 2 verification
1. `/pm/sessions` loads with heatmap showing real EA activity data
2. `/pm/letter-progress` shows progress bars for all active groups
3. `/pm/quality-flags` shows 6 flag types with accurate counts from Django
4. Flag lifecycle: clicking "Acknowledge" changes status and records user
5. Auto-resolution works: flag that clears for 2 nights moves to resolved
6. Resolution rate KPI updates correctly

### Phase 3 verification
1. `/pm/assessments` shows trust metrics next to outcome KPIs
2. Score histogram renders threshold lines at correct positions
3. Sample size labels appear on all disaggregated views
4. `/pm/compare` renders side-by-side for all 3 dimensions
5. `/pm/mentor-visits` highlights schools not visited in > 14 days
6. All pages responsive on tablet (mentor field use)
