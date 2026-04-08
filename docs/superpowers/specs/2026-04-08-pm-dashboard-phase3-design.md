# PM Dashboard Phase 3: Assessments & Mentor Visits

> **Date:** 2026-04-08
> **Status:** Design approved, ready for implementation planning

## Context

Phase 3 is the final phase of migrating the Streamlit data portal to the Next.js PM dashboard. Phases 1 and 2 are complete (Overview, Schools, Sessions, Letter Progress, Quality Flags, Letter Alignment). Phase 3 adds two remaining data pages — Assessments and Mentor Visits — and removes the Compare placeholder page.

The raw data infrastructure is already in place: `Assessment2026`, `AssessmentCell2026`, and `MentorVisit2026` models in Django are populated nightly from TeamPact. What's missing is the API aggregation layer and the frontend pages.

## Scope

### In scope
- Django: `compute_assessment_summary_2026.py` nightly command
- Django: `compute_mentor_visit_summary_2026.py` nightly command
- Django: `GET /api/assessments-summary/` endpoint
- Django: `GET /api/mentor-visits-summary/` endpoint
- Next.js: `/pm/assessments` page with components
- Next.js: `/pm/mentor-visits` page with components
- Next.js: proxy routes for both endpoints
- Remove Compare placeholder page and sidebar nav entry

### Out of scope
- Endline assessment data (baseline only for now)
- Compare page (dropped)
- Grouping QA (stays in Streamlit)
- Collector outlier analysis (stays in Streamlit)
- Letter-level cell analysis (stays in Streamlit)

---

## 1. Django Backend

### 1.1 Assessment Summary

**Nightly command:** `compute_assessment_summary_2026.py`

Queries `Assessment2026`, groups by school/language/grade, and pre-computes:
- Total children assessed, avg LCPM/WCPM/nonwords
- % zero letter knowledge (letters_total_correct == 0)
- % at benchmark: 40+ LCPM for Grade 1, 10+ LCPM for Grade R
- Stop rule rate, completion rate
- Cohort tagging: each school labeled `treatment`, `sef`, or `control`
  - Control = any primary school in the assessment data that is NOT in the treatment or SEF school lists (defined by exclusion)

Stores results as JSON in a cache model or as structured rows in `AssessmentSummary2026`.

**Endpoint:** `GET /api/assessments-summary/`

Query params (all optional): `?language=isiXhosa&grade=Grade+1`

Response:
```json
{
  "generated_at": "2026-04-08T02:00:00Z",
  "overview": {
    "total_assessed": 3200,
    "avg_lcpm": 12.4,
    "avg_wcpm": 3.1,
    "avg_nonwords": 5.2,
    "pct_zero_letters": 28.5,
    "pct_at_benchmark_gr1": 15.2,
    "pct_at_benchmark_grR": 22.0,
    "stop_rule_rate": 18.5,
    "completion_rate": 95.2
  },
  "by_cohort": [
    {
      "cohort": "treatment",
      "count": 1800,
      "avg_lcpm": 11.8,
      "pct_zero": 30.2,
      "pct_at_benchmark": 14.1
    },
    {
      "cohort": "control",
      "count": 1400,
      "avg_lcpm": 13.1,
      "pct_zero": 26.8,
      "pct_at_benchmark": 16.5
    }
  ],
  "by_language": [
    {"language": "isiXhosa", "count": 1800, "avg_lcpm": 11.8}
  ],
  "by_grade": [
    {"grade": "Grade R", "count": 1500, "avg_lcpm": 8.2, "pct_zero": 38.0, "pct_at_benchmark": 22.0},
    {"grade": "Grade 1", "count": 1700, "avg_lcpm": 16.1, "pct_zero": 20.1, "pct_at_benchmark": 15.2}
  ],
  "score_distribution": [
    {"bucket": 0, "count": 912},
    {"bucket": 5, "count": 450}
  ],
  "by_school": [
    {
      "school": "Siyazama PS",
      "cohort": "treatment",
      "count": 65,
      "avg_lcpm": 14.2,
      "pct_zero": 22.0,
      "pct_at_benchmark": 18.5
    }
  ]
}
```

### 1.2 Mentor Visit Summary

**Nightly command:** `compute_mentor_visit_summary_2026.py`

Queries `MentorVisit2026`, computes:
- Visit counts, unique mentors, schools/EAs visited
- Compliance rates for each check field (Yes/No/Did not observe)
  - Fields: `grouping_correct`, `letter_tracker_correct`, `teaching_correct_letters`, `comment_section_usage`, `mastery_before_blending`
  - Yes/No extraction: `str(val).lower().startswith("yes")` → Yes, `startswith("no")` → No
- Quality rating distributions for `session_quality` and `teacher_relationship`
  - Uses `normalize_rating()` logic: maps text to Excellent/Good/Average/Poor/Did not observe
- Visits over time (weekly aggregation)
- Per-mentor summary (visits, schools, avg quality score using 4=Excellent, 3=Good, 2=Average, 1=Poor)
- Flagged EAs: those whose most recent visit had "No" for any compliance check
- Coverage gaps: schools not visited in 14+ days

**Endpoint:** `GET /api/mentor-visits-summary/`

Response:
```json
{
  "generated_at": "2026-04-08T02:00:00Z",
  "overview": {
    "total_visits": 145,
    "unique_mentors": 6,
    "schools_visited": 42,
    "eas_observed": 85
  },
  "compliance": {
    "grouping_correct": {"yes": 120, "no": 15, "not_observed": 10},
    "letter_tracker_correct": {"yes": 130, "no": 10, "not_observed": 5},
    "teaching_correct_letters": {"yes": 110, "no": 25, "not_observed": 10},
    "comment_section_usage": {"yes": 95, "no": 40, "not_observed": 10},
    "mastery_before_blending": {"yes": 80, "no": 20, "not_observed": 45}
  },
  "quality_ratings": {
    "session_quality": {"Excellent": 20, "Good": 45, "Average": 15, "Poor": 5, "Did not observe": 5},
    "teacher_relationship": {"Excellent": 30, "Good": 40, "Average": 12, "Poor": 3, "Did not observe": 5}
  },
  "visits_over_time": [
    {"week_start": "2026-03-03", "visits": 12}
  ],
  "by_mentor": [
    {"mentor": "Nothemba", "visits": 35, "schools_visited": 12, "avg_quality_score": 3.2}
  ],
  "flagged_eas": [
    {
      "ea_name": "Thando M",
      "school": "Siyazama PS",
      "mentor": "Nothemba",
      "issue": "grouping_correct",
      "visit_date": "2026-04-01"
    }
  ],
  "coverage": {
    "schools_visited_14d": 38,
    "total_schools": 51,
    "coverage_rate": 74.5,
    "gaps": [
      {"school": "Ntaba Maria PS", "last_visit": "2026-02-15", "days_since": 52}
    ]
  }
}
```

---

## 2. Next.js Frontend

### 2.1 Shared Patterns

Both pages follow the established PM dashboard pattern:
- **Server component** `page.tsx` fetches data via `lib/pm/api.ts`
- API functions return `{ data, isLive }` tuple
- `isLive: false` shows amber "mock data" warning banner
- **Client components** for interactive charts (Recharts)
- `KPICard` component reused for all metric cards
- ISR revalidation: 300 seconds

### 2.2 Assessments Page (`/pm/assessments`)

**File:** `app/pm/assessments/page.tsx`

**Components:**

1. **AssessmentKPIs** (`components/pm/assessments/assessment-kpis.tsx`)
   - 6 KPI cards in a responsive grid
   - Cards: Children Assessed, Avg Letters Correct, % Zero Letter Knowledge, % At Benchmark (Gr 1 at 40+), % At Benchmark (Gr R at 10+), Completion Rate

2. **CohortComparison** (`components/pm/assessments/cohort-comparison.tsx`) — "use client"
   - Grouped bar chart (Recharts) showing treatment vs control
   - Metrics compared: avg LCPM, % zero letters, % at benchmark
   - Broken down by grade
   - This is the primary analytical view

3. **ScoreDistribution** (`components/pm/assessments/score-distribution.tsx`) — "use client"
   - Histogram of letters_total_correct (buckets of 5)
   - Color-coded by grade (Grade R, Grade 1, Grade 2)
   - Reference lines at threshold values (0, 10, 40)

4. **SchoolComparison** (`components/pm/assessments/school-comparison.tsx`) — "use client"
   - Horizontal bar chart of avg LCPM by school
   - Bars color-coded by cohort: treatment (primary blue), control (slate), SEF (accent-yellow)
   - Sorted descending by avg LCPM

5. **LanguageGradeBreakdown** (`components/pm/assessments/language-grade-breakdown.tsx`) — "use client"
   - Grouped bar chart: avg LCPM by language, grouped by grade

**Filters:** Language dropdown, Grade dropdown (client-side filtering of pre-loaded data)

### 2.3 Mentor Visits Page (`/pm/mentor-visits`)

**File:** `app/pm/mentor-visits/page.tsx`

**Components:**

1. **VisitKPIs** (`components/pm/mentor-visits/visit-kpis.tsx`)
   - 4 KPI cards: Total Visits, Mentors Active, Schools Visited, EAs Observed

2. **VisitsOverTime** (`components/pm/mentor-visits/visits-over-time.tsx`) — "use client"
   - Bar chart of weekly visit counts (Recharts)

3. **ComplianceChecks** (`components/pm/mentor-visits/compliance-checks.tsx`) — "use client"
   - 5 compliance sections, each with:
     - Donut/pie chart (Yes/No/Not Observed) on the left
     - Flagged EAs table on the right (EAs whose most recent visit was "No")
   - Compliance fields: Grouping Correct, Letter Tracker Correct, Teaching Correct Letters, Comment Section Usage, Mastery Before Blending

4. **QualityRatings** (`components/pm/mentor-visits/quality-ratings.tsx`) — "use client"
   - 2 bar charts for session_quality and teacher_relationship
   - Bars: Excellent (green), Good (blue), Average (orange), Poor (red)

5. **MentorSummaryTable** (`components/pm/mentor-visits/mentor-summary-table.tsx`) — "use client"
   - Sortable table: Mentor, Visit Count, Schools Visited, Avg Quality Score
   - Quality score displayed as numeric (1-4) with color coding

6. **CoverageGaps** (`components/pm/mentor-visits/coverage-gaps.tsx`)
   - Coverage rate KPI (% schools visited in last 14 days)
   - Table of schools not visited in 14+ days with days-since count
   - Schools sorted by days since last visit (most overdue first)
   - Alert badges for schools with 30+ days gap

**Filters:** Mentor dropdown, School dropdown (client-side filtering)

### 2.4 Sidebar Changes

- Remove "Compare" from sidebar navigation
- Remove `app/pm/compare/page.tsx`

### 2.5 Proxy Routes

- `app/api/assessments-summary/route.ts` — proxies to Django
- `app/api/mentor-visits-summary/route.ts` — proxies to Django

### 2.6 Types

New types in `lib/pm/types.ts`:
- `AssessmentsSummaryResponse` — maps to the assessments endpoint response
- `MentorVisitsSummaryResponse` — maps to the mentor visits endpoint response

### 2.7 API Functions

New functions in `lib/pm/api.ts`:
- `getAssessmentsSummary()` → `{ data: AssessmentsSummaryResponse, isLive: boolean }`
- `getMentorVisitsSummary()` → `{ data: MentorVisitsSummaryResponse, isLive: boolean }`

Both follow the existing pattern: try Django endpoint, fall back to mock data with `isLive: false`.

---

## 3. Key Files to Modify/Create

### Django (in `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api`)
- `management/commands/compute_assessment_summary_2026.py` — new
- `management/commands/compute_mentor_visit_summary_2026.py` — new
- `models.py` — add `AssessmentSummary2026Cache`, `MentorVisitSummary2026Cache` models
- `views.py` — add assessment and mentor visit summary views
- `urls.py` — add URL patterns
- `serializers.py` — add serializers (or return raw JSON from cache)

### Next.js
- `lib/pm/types.ts` — add new response types
- `lib/pm/api.ts` — add fetch functions
- `app/api/assessments-summary/route.ts` — new proxy
- `app/api/mentor-visits-summary/route.ts` — new proxy
- `app/pm/assessments/page.tsx` — replace placeholder
- `app/pm/mentor-visits/page.tsx` — replace placeholder
- `app/pm/compare/page.tsx` — delete
- `components/pm/assessments/*.tsx` — 5 new components
- `components/pm/mentor-visits/*.tsx` — 6 new components
- `components/pm/layout/pm-sidebar.tsx` — remove Compare nav item

---

## 4. Verification

1. Run `compute_assessment_summary_2026` and `compute_mentor_visit_summary_2026` locally
2. Hit `/api/assessments-summary/` and `/api/mentor-visits-summary/` — verify JSON shape
3. Run `npm run dev`, navigate to `/pm/assessments` and `/pm/mentor-visits`
4. Verify KPIs render with real data, charts are interactive
5. Verify treatment vs control comparison shows distinct cohort data
6. Verify compliance checks show correct donut + flagged EA tables
7. Verify coverage gaps highlight overdue schools
8. Verify Compare page is removed from sidebar and returns 404
9. Run `npm run build` — no type errors
10. Run `npm run lint` — no lint errors
