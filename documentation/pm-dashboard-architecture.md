# PM Dashboard Architecture

The `/pm/*` pages form a self-contained dashboard app with a distinct layout.

## Layout & Navigation

- **Dashboard shell** (`app/pm/layout.tsx`): left sidebar + content area, no Header/Footer
- **Sidebar** (`pm-sidebar.tsx`): dark theme, responsive (full → icon-only → mobile bottom tabs)
- **Programme context bar**: dark header with programme week, cohort selector, health badge, data freshness
- **Cohort filter**: global `?cohort=treatment|sef|ecd|all` URL param, defaults to `treatment`. Cohort lists in `lib/pm/cohorts.ts`.

## Data Fetching Pattern

- Server components fetch from Django API with ISR (5-min revalidation)
- API layer (`lib/pm/api.ts`) returns `{ data, isLive }` — pages show amber banner when using mock data fallback
- Charts: Recharts (client components) for line charts, bar charts. Wrapped in server component pages.

## Dosage Calculation

- Per-group `first_session_date` (not global programme start)
- Teaching start date = 2026-03-08
- School holidays excluded from programme-day denominators (see `SCHOOL_HOLIDAYS_2026` in Django `api/views.py`)

## KPI Layout

3 rows — aggregate (schools/EAs/children), group performance (dosage/on-track/flags), EA performance (sessions per day worked/on-track EAs/sessions per programme day).

## Pages

### Overview (`/pm`)
- KPIs, sessions chart, dosage distribution, school table

### Schools (`/pm/schools`)
- Fetches `/api/schools-2026/` (filtered by cohort in frontend)

### Sessions (`/pm/sessions`)
- Consumes `/api/sessions-activity/` — daily trend, EA heatmap (last 10 weekdays), session distribution histogram, school summary table.

### Letter Progress (`/pm/letter-progress`)
- Consumes `/api/groups-2026/` — progress bars along language-specific letter sequence, average progress by grade, sortable group detail table.

### Quality Flags (`/pm/quality-flags`)
- Consumes `/api/groups-2026/` — 7 flag types from nightly compute (same_letter_group, moving_too_fast, ghost_group, stagnation, curriculum_gaps, teaching_known, skipping_needed)
- `curriculum_gaps` displayed as "Not Following Letter Order"
- No lifecycle yet (FlagEvent model deferred to Phase 4)

### Letter Alignment (`/pm/letter-alignment`)
- Consumes `/api/groups-2026/` for overview + `/api/letter-alignment/` for child drill-down
- Per-child heatmap shows 5 states: mastered (orange), taught/needed (green), not reached (gray), skipped (red), teaching known (amber)
- Spec: `docs/superpowers/specs/2026-04-07-letter-alignment-design.md`

## Language-Aware Letter Sequences

Three languages (isiXhosa: 26, English: 26, Afrikaans: 22 letters) with different pedagogical orders. Defined in:
- Django: `api/letter_constants.py`
- Next.js: `lib/pm/constants.ts` (`LETTER_SEQUENCES`)

Group language determined bottom-up via participant_id → assessment linking.

## Group Cohort Filtering

`filterGroupsByCohort` in `lib/pm/cohorts.ts` filters by `program_name` (groups use this instead of `school_name`).

## Specs & Plans

- PM Dashboard spec: `docs/superpowers/specs/2026-04-05-pm-dashboard-design.md`
- PM Dashboard plan: `docs/superpowers/plans/2026-04-05-pm-dashboard-phase1.md`
- Letter Alignment spec: `docs/superpowers/specs/2026-04-07-letter-alignment-design.md`

## Django Endpoints

| Next.js Route | Django Endpoint | Notes |
|---------------|-----------------|-------|
| `/schools-2026` | `/api/schools-2026/` | ISR 300s |
| `/pm` | `/api/programme-overview/` | ISR 300s, includes sessions_time_series |
| `/pm/schools` | `/api/schools-2026/` | Same endpoint, filtered in frontend |
| `/pm/sessions` | `/api/sessions-activity/` | ISR 300s |
| `/pm/letter-progress` | `/api/groups-2026/` | ISR 300s, per-group letter progress |
| `/pm/quality-flags` | `/api/groups-2026/` | Same endpoint, uses flag fields |
| `/pm/letter-alignment` | `/api/groups-2026/` + `/api/letter-alignment/` | Proxied via `/api/letter-alignment/route.ts` |

Django source repo: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025`
