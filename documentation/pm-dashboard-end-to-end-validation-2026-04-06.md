# PM Dashboard End-to-End Validation Report

Date: 2026-04-06  
Environment: local Next.js (`localhost:3000`) + live Render Django API (`https://zazi-izandi-website-main.onrender.com`)  
Authenticated role used for validation: `admin`

---

## Scope Executed

Validation was executed page-by-page across:

- `/pm` (Overview)
- `/pm/sessions`
- `/pm/letter-progress`
- `/pm/quality-flags`
- `/pm/schools` and sample school detail
- `/pm/assessments`, `/pm/mentor-visits`, `/pm/compare` (placeholder checks)

Checks included:

- UI value parity against live API responses
- Cohort-filter behavior (`treatment`, `sef`, `ecd`, `all`)
- KPI/card/chart/table consistency
- Quality flag evidence drill-down behavior
- Cross-endpoint consistency checks

---

## Findings (Ordered by Severity)

## 1) Critical - `/pm?cohort=all` mixes incompatible denominators

### What happens
On Overview, the cards/table are recomputed from a frontend-filtered subset (`78` schools), while context/charts remain from backend `all` (`91` schools).

### Impact
The same page shows conflicting truths (different cohorts/denominators) at once.

### Evidence

- UI (`all`): `78 schools`, `153 EAs`, `4,581 sessions this month`
- API `/api/programme-overview/?cohort=all`: `91 schools`, `183 EAs`, `5,014 sessions this month`

### Code path

- `app/pm/page.tsx` (local KPI recompute)
- `lib/pm/cohorts.ts` (`all` union filter logic)

---

## 2) Critical - Quality flag evidence panel fails to load live evidence

### What happens
For evidence-backed flags (`Moving Too Fast`, `Curriculum Gaps`), panel shows:

`Unable to load evidence data. The API may be unavailable.`

### Impact
Users cannot inspect root evidence behind flagged rows.

### Evidence

- Browser-side fetch from frontend to `NEXT_PUBLIC_DJANGO_API_URL` fails (`TypeError: Failed to fetch`)
- Direct server-side calls to the same endpoint succeed

### Code path

- `lib/pm/api.ts` (`getFlagEvidence`)
- `components/pm/quality-flags/flag-evidence-panel.tsx`

---

## 3) High - Cohort selection is not preserved when navigating PM sidebar

### What happens
Starting at `?cohort=ecd`, clicking sidebar routes navigates to:

- `/pm/sessions` (no cohort query)
- `/pm/letter-progress` (no cohort query)

Pages then default back to Treatment.

### Impact
Cross-page comparisons by cohort are unreliable unless user re-selects cohort on each page.

### Code path

- `components/pm/layout/pm-sidebar.tsx` (static `href`s without query carry-over)

---

## 4) High - School detail page is mock-backed, not live-backed

### What happens
`/pm/schools/[school-name]` uses mock generator data.

### Evidence

- Mock EA names appear in detail cards (`Nomvula Dlamini`, `Thandi Nkosi`, etc.)

### Code path

- `lib/pm/api.ts` (`getSchoolDetail` returns `getMockSchoolDetail`)
- `app/pm/schools/[school-name]/page.tsx`

---

## 5) Medium - Sidebar Quality Flags badge is global, not cohort-aware

### What happens
Badge count comes from `app/pm/layout.tsx` via `getProgrammeOverview()` without page cohort context.

### Impact
Badge can show all-programme count while user is viewing Treatment/SEF/ECD page states.

---

## 6) Medium - Overview totals and Sessions totals differ for `all`

### Observation

- `programme-overview all` month total: `5,014`
- `sessions-activity all` daily trend sum: `4,722`

### Note
May be definitional/window differences between endpoints, but currently not explained in UI.

---

## Pass Results

- Overview parity passed for `treatment`, `sef`, `ecd`.
- Sessions page header totals/counts matched `/api/sessions-activity` for all cohorts.
- Letter Progress counts matched groups-filtered expectations for all cohorts.
- Quality Flags totals matched groups-filtered calculations for all cohorts.
- Placeholder routes behaved as expected:
  - `/pm/assessments`
  - `/pm/mentor-visits`
  - `/pm/compare`
- No mock-data warning banners appeared on implemented PM pages during this run.

---

## Specific Outlier Check: Busisiwe Kampeni

Outlier confirmed in sessions heatmap:

- School: `Soweto-On-Sea Primary School`
- Date: `2026-03-18`
- Count: `11` sessions (Treatment view), `13` sessions (All Programme view)
- This is the highest max-day value in the current 10-weekday heatmap window.

---

## Artifacts Generated

All validation artifacts are available at:

- `/tmp/pm-dashboard-validation-2026-04-06/ui-metrics.json`
- `/tmp/pm-dashboard-validation-2026-04-06/comparison-results.json`
- `/tmp/pm-dashboard-validation-2026-04-06/quality-evidence-check.json`
- `/tmp/pm-dashboard-validation-2026-04-06/raw/` (latest API snapshots)
- `/tmp/pm-dashboard-validation-2026-04-06/screenshots/` (page screenshots)

---

## Recommended Fix Priority

1. Fix cohort consistency on Overview (`all` denominator mismatch).
2. Fix frontend evidence fetch path/CORS/proxy for flag evidence panel.
3. Preserve cohort query across sidebar navigation.
4. Replace school detail mock path with live endpoint.
5. Make sidebar badge cohort-aware (or explicitly global-labeled).
6. Document/align endpoint semantics for overview vs sessions totals.
