# Plan: EducationAssistant Roster Model + Resigned EA Filtering

## Context

The PM dashboard at `/pm/*` derives EAs (Education Assistants) at query time from `TeampactSession2026.user_name` and `GroupSummary2026.ea_user_id` / `ea_name`. There is no canonical EA roster, no employment status, no email/role enrichment, and no mechanism to mark someone as resigned. As a result:

- Resigned EAs persist on the EA Heatmap (`/pm/sessions`) as red dots indefinitely — visual noise the team can't act on.
- Resigned EAs appear in EA Performance rankings (`/pm/education-assistants`, `/pm/ea-mobile-view`, `/pm/teacher-view`) with stale numerators and a programme-days denominator that grows with calendar time, dragging averages down unfairly.
- EA-level metadata (email, mentor, role, programme assignment) lives in `TAProfile` keyed by *name* (`unique=True` — fragile to duplicates) or in spreadsheets outside the system.
- 18 EAs have resigned across 2026 to date (~5/month). A scalable mechanism is needed beyond ad-hoc dev edits.

This plan introduces a canonical `EducationAssistant` model that becomes the single source of truth for "who is on the Zazi iZandi programme right now," fixes the visual problem on the affected pages, and corrects per-EA averages: resigned EAs are excluded from PM overview KPIs (active-staff lens), and a defensive `last_working_day` denominator clamp is added to `ea_performance` for any future view that surfaces them.

## Recommended Approach

A new `EducationAssistant` Django model with three independent data sources:

| Source | Fields it owns | Mechanism | Cadence |
|---|---|---|---|
| **Sessions (canonical roster)** | `user_id`, `name`, `primary_program_name`, `first_session_date`, `last_session_date` | Auto-upsert from `TeampactSession2026` (cohort-filtered with normalised casing) | Nightly cron + one-off backfill |
| **TeamPact user CSV (enrichment)** | `email`, `first_name`, `last_name`, `teampact_role` | `import_teampact_users <csv>` — **enriches existing rows only**, never creates new | Manual, quarterly-ish |
| **Django admin (manual)** | `employment_status`, `last_working_day`, `replaced`, `mentor_name`, `notes` | Staff edit at `/admin`. One-off `import_resigned_eas <csv>` for the initial 18-row seed (dry-run by default; rejects ambiguous name matches) | On staff resignation |

**Critical architectural choice — where the roster filter applies:**

The roster filter operates on **output dicts**, not querysets. This is non-negotiable: filtering at the queryset level would erase resigned EAs' historical sessions from daily trends and school totals (they share the same queryset as the EA heatmap). The contract:

- **Session-level aggregates** (daily totals, school totals, cohort totals) → include every session ever recorded. Untouched.
- **Group-level outputs** (group counts per school, Quality Flags, Letter Progress) → include every group, even those owned by resigned EAs. Response now carries `ea_user_id` and `ea_resigned` flags so consumers can filter presentation if they want; data stays intact.
- **EA-roster outputs** (heatmap rows, EA performance ranking, school-detail EA cards, programme overview KPIs, distribution) → exclude EAs whose `last_working_day` has passed.

Per-view application:
- `sessions_activity()` → roster filter on `ea_heatmap` output dict only; daily/school stays whole.
- `ea_performance()` → roster filter on the unioned EA set (sessions ∪ groups), key by `user_id`. Defensive denominator clamp retained.
- `programme_overview()` → roster filter on `ea_data` *before* KPI computation. KPIs are active-staff metrics; no clamp needed.
- `groups_2026_summary()` → no row filter; expose `ea_user_id` + `ea_resigned` for downstream presentation filtering.
- `enrichSchoolsWithGroups()` (frontend) → tag each EADetail with `is_active`; school-level aggregations remain over the full EA set; render layer filters visible cards. (Filter at render, not aggregation, to preserve school-level flag/dosage/avg stats.)

A new helper centralises this:

```python
# api/utils/ea_roster.py (new file)
def resigned_user_ids_as_of(as_of=None) -> set[int]:
    as_of = as_of or timezone.now().date()
    return set(
        EducationAssistant.objects
        .filter(employment_status='resigned', last_working_day__lt=as_of)
        .values_list('user_id', flat=True)
    )

def is_active_as_of(ea: EducationAssistant, as_of=None) -> bool:
    as_of = as_of or timezone.now().date()
    if ea.employment_status == 'active':
        return True
    return ea.last_working_day is not None and ea.last_working_day >= as_of
```

Effective-active semantics: an EA marked `resigned` with `last_working_day >= today` is still active (handles "marked resigned in advance with a future final day"). Past-tense `last_working_day` makes them disappear automatically the day after.

## Files to Create / Modify

### Django backend (`/Users/jimmckeown/Development/Zazi_iZandi_Website_2025`)

**Create:**

- `api/models.py` — append `EducationAssistant`:

```python
class EducationAssistant(models.Model):
    user_id = BigIntegerField(unique=True, null=False, db_index=True)  # TeamPact user_id
    name = CharField(max_length=200)
    primary_program_name = CharField(max_length=200, blank=True)  # latest school (most recent session's program_name)

    # Enrichment from TeamPact user export CSV
    email = EmailField(blank=True, db_index=True)
    first_name = CharField(max_length=100, blank=True)
    last_name = CharField(max_length=100, blank=True)
    teampact_role = CharField(max_length=50, blank=True)  # 'coach', 'manager'

    # Manual via /admin
    EMPLOYMENT_STATUS = [('active', 'Active'), ('resigned', 'Resigned')]
    employment_status = CharField(max_length=16, choices=EMPLOYMENT_STATUS, default='active')
    last_working_day = DateField(null=True, blank=True)
    replaced = BooleanField(default=False)
    mentor_name = CharField(max_length=200, blank=True)
    notes = TextField(blank=True)

    # Activity window (auto)
    first_session_date = DateField(null=True, blank=True)
    last_session_date = DateField(null=True, blank=True)

    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

    def clean(self):
        if self.employment_status == 'resigned' and not self.last_working_day:
            raise ValidationError('last_working_day is required when employment_status is resigned')
```

- `api/utils/ea_roster.py` — `resigned_user_ids_as_of()` and `is_active_as_of()` helpers (above).
- `api/utils/program_filters.py` — `EXCLUDED_PROGRAMS_NORMALISED = {"MASINYUSANE"}`, `exclude_excluded_programs(qs, field='program_name')` for querysets, AND `is_excluded_program(name: str) -> bool` for filtering in-memory dicts/lists (used at `views.py:1360` and any other Python-level filter site).
- `api/admin.py` — `EducationAssistantAdmin` with `list_display=('name','user_id','employment_status','last_working_day','primary_program_name','mentor_name')`, `list_filter=('employment_status','mentor_name','primary_program_name')`, `search_fields=('name','email','user_id')`.
- `api/management/commands/backfill_education_assistants.py` — derive initial roster from `TeampactSession2026` + `GroupSummary2026.ea_user_id` (cohort-filtered, normalised excluded-programs). Idempotent. Print `created/updated/skipped` counts.
- `api/management/commands/import_teampact_users.py` — accepts the TeamPact user export CSV. **Only updates existing rows** (matched by `ID` column → `user_id`). Sets `email`, `first_name`, `last_name`, `teampact_role`. Logs unmatched IDs.
- `api/management/commands/import_resigned_eas.py` — accepts resignations CSV. **Dry-run by default** (`--apply` to commit). Matches by `Full Name` against `EducationAssistant.name` case-insensitive; **raises an error on ambiguous matches** (more than one row with same name). Supports optional `User ID` column to disambiguate. Sets `employment_status='resigned'`, `last_working_day`, `replaced`, `mentor_name`. Reports unmatched names.
- New migration auto-generated by `makemigrations`.

**Modify:**

- `api/management/commands/sync_teampact_sessions_2026.py` — after the existing session upsert (around line 211), add:
  - `EducationAssistant` upsert step: `bulk_create([... user_id=row.user_id ...], ignore_conflicts=True)` for any new `user_id`s, with cohort filter + normalised excluded-programs check applied.
  - Refresh per-EA derived fields:
    - `first_session_date` = `Min(session_started_at__date)` over that user's cohort sessions.
    - `last_session_date` = `Max(session_started_at__date)`.
    - `name` = `user_name` from the user's **most recent** session (handles name changes / spelling fixes upstream in TeamPact).
    - `primary_program_name` = `program_name` from the user's **most recent** session (semantics: latest school placement, more useful than most-frequent for operational roster work).
  - Manual fields (`employment_status`, `last_working_day`, `replaced`, `mentor_name`, `notes`) and enrichment fields (`email`, `first_name`, `last_name`, `teampact_role`) are never touched.

- `api/views.py:741` `sessions_activity()` — three changes, none filter the queryset:
  1. **Add `user_id` to the `.values(...)` projection** so EA-keyed outputs can use it.
  2. **Build `ea_day_sessions` keyed by `user_id`** (not `user_name`); attach `user_name` only as a display label in the response.
  3. **Filter the `ea_heatmap` / EA-distribution outputs** through `resigned_user_ids_as_of()` *after* `ea_day_sessions` is fully built. Daily-trend and school-stats outputs are NOT filtered — they remain accurate aggregates of all sessions.

- `api/views.py:1291` `ea_performance()` — refactor to user_id-keyed:
  1. **Add `user_id` to session `.values(...)` (line 1335)** alongside `user_name`.
  2. **Key `ea_session_data` and `ea_groups` by `user_id`**, not name. (Group lookup becomes `ea_groups[g.ea_user_id]`; current code uses `g.ea_name` at line 1367.)
  3. **Filter the union** (`all_ea_user_ids = set(ea_session_data) | set(ea_groups)`) by removing entries in `resigned_user_ids_as_of()`.
  4. **Clamp the programme-days denominator** (`work_days = count_work_days(first_date, today)` at line 1398): for any EA whose `EducationAssistant.last_working_day` is set and in the past, use `count_work_days(first_date, last_working_day)` instead. This is defensive — Phase 1 hides them anyway, but a future view that toggles them visible gets correct math for free.

- `api/views.py:584` `programme_overview()` — these KPIs (`total_active_eas`, `pct_eas_on_track`, `avg_sessions_per_day_worked`, `avg_sessions_per_programme_day`) are **active-staff metrics**, not historical. **Filter resigned EAs out of `ea_data` before any KPI is computed.** Specifically:
  1. Add `user_id` to the session `.values(...)` projection at line 552.
  2. Build `ea_data` keyed by `user_id` (not `user_name`).
  3. After `ea_data` is built, drop entries whose `user_id` is in `resigned_user_ids_as_of()`.
  4. `total_active_eas` then becomes a true count of currently-employed EAs with sessions in the window. No denominator clamp is needed here because resigned EAs are excluded entirely.
  
  (Defensive note: keep the denominator clamp on `ea_performance()` regardless, since that view may surface resigned EAs via a future `?include_resigned=1` toggle. `programme_overview` has no such use case — it's strictly about the active team.)

- `api/views.py:329` `groups_2026_summary()` — extend the response shape to support school-detail filtering downstream:
  1. **Add `ea_user_id`** to each group dict (line 332 area). The model already has `ea_user_id: BigIntegerField`; just expose it. Currently the response is name-keyed only.
  2. **Add `ea_resigned: bool`** computed via `resigned_user_ids_as_of()` (call once at top of view, look up per group). Frontend uses this to filter the EA cards on school detail without losing the group itself.
  3. **Do NOT filter resigned EAs out of the response.** Their groups are real and still need to flow into school totals, Quality Flags, and Letter Progress views unchanged.

### Phase 1.5 (separate, ship together): EXCLUDED_PROGRAMS casing fix

`api/views.py:422` defines `EXCLUDED_PROGRAMS = {"MASINYUSANE"}` (uppercase). Compute commands at `compute_school_summaries_2026.py:43` and `compute_group_summaries_2026.py:26` use `{"Masinyusane"}` (mixed case). Usage is exact-match `.exclude(program_name__in=EXCLUDED_PROGRAMS)` — so the views currently let mixed-case "Masinyusane" rows through. Local DB has 379 such rows being silently included.

Fix: switch all three locations to a single canonical constant and use a normalised comparison. Cleanest implementation:

```python
# api/utils/program_filters.py (new)
EXCLUDED_PROGRAMS_NORMALISED = {"MASINYUSANE"}

def exclude_excluded_programs(qs, field='program_name'):
    return qs.annotate(_pname_upper=Upper(field)).exclude(_pname_upper__in=EXCLUDED_PROGRAMS_NORMALISED)
```

Replace every `.exclude(program_name__in=EXCLUDED_PROGRAMS)` site (views.py lines 549, 646, 780, 1201, 1332, 1361 per Explore output) with `exclude_excluded_programs(qs)`. Replace the constants in compute commands with the same import. Add a one-line note that this is upstream of the EA backfill so the resigned-filter math is correct.

### Next.js frontend

One frontend change required this phase: the school-detail page must filter resigned EAs from the EA cards.

**Modify `lib/schools-2026/enrich.ts`** — `enrichSchoolsWithGroups()` builds school cards from `groups` (from `/api/groups-2026/`) at lines 47-54 via `buildEADetails`. **Critical**: `buildEADetails` accumulates `totalFlags`, `flagBreakdown` (lines 154-160), and feeds school-level `weighted_dosage` (line 87) and `schoolAvgPerDay` (lines 71-78) — all derived during per-EA iteration. Naively filtering resigned EAs inside `buildEADetails` would erase their groups' flags from school totals (same shared-output-dict pattern as `sessions_activity`).

Implementation:
1. `buildEADetails` continues to operate on the **full** `schoolGroups` list. School-level `totalFlags`, `flagBreakdown`, `weighted_dosage`, `avg_per_day_worked` remain unchanged from current behaviour.
2. **Group EAs by `ea_user_id ?? ea_name`**, not by `ea_name` alone (current code at `enrich.ts:124-128`). Now that the API exposes `ea_user_id`, using id-with-name-fallback removes the duplicate-name fragility. Name remains for display and for legacy data missing `ea_user_id`.
3. Add `is_active: boolean` to the `EADetail` type. Populate inside `buildEADetails` by checking `eaGroups[0].ea_resigned` (consistent across an EA's groups; same `user_id`).
4. The returned `eas` array includes both active and resigned EAs, each tagged with `is_active`.
5. **Render-layer filtering** must apply at every place the `eas` array is surfaced visibly:
   - `app/pm/schools/[school-name]/page.tsx:132` — EA cards: `school.eas.filter((ea) => ea.is_active !== false).map(...)`.
   - `components/schools-2026/school-card-2026.tsx` (`SchoolCard2026`) — visible EA name line and expanded EA rows: filter `data.eas` to active.
   - `components/schools-2026/school-cards-grid-2026.tsx` (`SchoolCardsGrid2026`) — search input matches against `school.eas`: filter to active before search match.
   The pattern (`is_active !== false`) treats `undefined` as active for forward-compatibility with consumers that haven't been updated yet.

This pattern preserves all school-level aggregates (intentional — they reflect the school's full performance profile) and only changes the visible EA cards. The wider question of whether school-level `weighted_dosage` and `avg_per_day_worked` should also exclude resigned EAs (active-staff lens, by analogy with `programme_overview`) is deferred to the Phase 2 audit per the user's earlier note.

**Modify `lib/pm/types.ts`** — add fields:
- `GroupSummary.ea_user_id?: number | null` (line 157 area)
- `GroupSummary.ea_resigned?: boolean`
- `EADetail.is_active?: boolean` (in the EADetail interface; check `lib/schools-2026/types.ts` if separate)
- `EAHeatmapRow.user_id?: number | null` — `sessions_activity()` will now build heatmap rows by `user_id`. Adding the optional field to the type lets React keys and downstream joins use the stable identifier instead of `ea_name|school` strings.

Optional fields (`?`) so any consumer not yet updated keeps compiling. Default frontend behaviour when `ea_resigned` is undefined: treat as `false` (active). Where heatmap-row React keys are using `ea_name|school` today, prefer `user_id ?? ea_name|school` going forward.

Documenting endpoint blast radius and intended behaviour per consumer:

| Endpoint | Caller | Phase 1 effect | Intentional? |
|---|---|---|---|
| `/api/sessions-activity/` | `app/pm/sessions/page.tsx:18` | Heatmap row for resigned EA disappears; daily totals unchanged | ✅ Yes — target page |
| `/api/sessions-activity/` | `lib/pm/api.ts:171` (school enrichment) | Heatmap join key for resigned EA missing → `Sess/day` would be `—`, but their card is filtered upstream by `ea_resigned` so this never renders | ✅ Yes — covered by school-detail fix |
| `/api/sessions-activity/` | `app/schools-2026/page.tsx:46` | Cohort-wide aggregates unchanged | ✅ Yes — invisible / no regression |
| `/api/ea-performance/` | `app/pm/education-assistants/page.tsx:18` | Resigned EAs removed from rankings | ✅ Yes — target page |
| `/api/ea-performance/` | `app/pm/ea-mobile-view/page.tsx:5` | Resigned EAs removed | ✅ Yes — same intent |
| `/api/ea-performance/` | `app/pm/teacher-view/page.tsx:5` | Resigned EAs removed | ✅ Yes — same intent |
| `/api/groups-2026/` | `app/pm/quality-flags/`, `app/pm/letter-progress/`, `app/pm/letter-alignment/` | Response gains `ea_user_id` and `ea_resigned` fields; no other shape change. These pages ignore the new fields and behave identically | ✅ Yes — additive change |
| `/api/groups-2026/` | `app/pm/schools/[school-name]/page.tsx` (via `enrichSchoolsWithGroups`) | School-level stats (flags, dosage, avg/day) unchanged; resigned EA cards hidden | ✅ Yes — target page |
| `/api/groups-2026/` | `app/schools-2026/page.tsx:49` (public schools page, also via `enrichSchoolsWithGroups`) | Same as above — school-level stats unchanged, resigned EAs hidden from per-school card details if surfaced | ✅ Yes — same enrichment path |
| `/api/programme-overview/` | `app/pm/page.tsx` (PM dashboard top-line) | `total_active_eas` and percentages now reflect currently-employed EAs only | ✅ Yes — semantic correction |
| `/api/programme-overview/` | `app/pm/layout.tsx:15` (sidebar via `flagCount = data.kpis.active_flags`) | Layout reads only `active_flags`, which is unaffected. No visual change | ✅ Yes — no impact |

If any consumer ever needs to see resigned EAs (e.g., a future "year-end summary"), add a `?include_resigned=1` query param to `sessions_activity()` and `ea_performance()`; not built now.

## Backfill & Seed Sequence

Runs **once**, in this order on Render (after migrations and the Phase 1.5 casing fix have shipped):

```
1. python manage.py migrate
2. python manage.py backfill_education_assistants               # populates from sessions
3. python manage.py import_teampact_users tp_users.csv          # enriches with email + role
4. python manage.py import_resigned_eas resigned.csv            # dry-run; review unmatched/ambiguous
5. python manage.py import_resigned_eas resigned.csv --apply    # commit
```

Each command prints summary counts. Step 4 must show zero ambiguities and an acceptable unmatched list before step 5 runs.

## Verification

1. **Migration**: `python manage.py makemigrations --check && python manage.py migrate` succeeds locally (venv activated per `feedback_django_venv.md`).
2. **Backfill counts**: `EducationAssistant.objects.count()` matches the **non-null union** of `TeampactSession2026.user_id` and `GroupSummary2026.ea_user_id` after cohort + normalised excluded-programs filter. Concretely: `set(sessions_user_ids) | set(group_ea_user_ids) - {None}`. Run that SQL by hand and compare against the model count.
3. **Casing fix sanity**: `TeampactSession2026.objects.filter(program_name__iexact='Masinyusane').count()` should now be excluded by `exclude_excluded_programs(qs)`. Confirm cohort totals drop by the expected count.
4. **Roster vs. session-totals invariant** (most important regression): pick one resigned EA with historical sessions. Before-and-after the roster filter is applied:
   - **Heatmap row**: present before, absent after.
   - **Daily total** for a day where they had sessions: identical before and after (this is the regression that proves we're filtering at the right layer).
   - **School total** for their school for that day: identical before and after.
5. **EA Performance**: the resigned EA's row is absent. Cohort totals are unchanged.
6. **Denominator clamp**: in Django shell, manually compute sessions/day for one resigned EA assuming a temporary `?include_resigned=1` flag (or via the helper directly). Verify denominator uses `last_working_day - first_session_date` not `today - first_session_date`.
7. **Admin round-trip**: at `/admin`, mark one active EA as resigned with `last_working_day = today + 1`. Reload `/pm/sessions` — they should still appear (effective-active logic). Then back-date `last_working_day` to yesterday — they should disappear.
8. **Sync resilience**: run `sync_teampact_sessions_2026`. Confirm `EducationAssistant.objects.count()` doesn't decrease, and `employment_status` of any manually-resigned EA is preserved.
9. **`programme_overview()` resigned-exclusion**: seed (or pick from prod) an active EA pool of N. Then mark one as resigned. Reload the dashboard. Confirm `total_active_eas` decreases by exactly 1, and `avg_sessions_per_day_worked` shifts in the direction expected by the resigned EA's removal (e.g., increases if they were below average, decreases if above).
10. **School-detail page**: load `/pm/schools/<school-with-resigned-EA>`. Confirm: (a) the resigned EA's card is gone from the "Education Assistants" section; (b) the school-level `total_sessions`, `children_count`, `groups_count` numbers are unchanged from before the migration.

## Tests to Add

In Django test suite (per `reference_django_test_setup.md` — `zazi_user` needs CREATEDB):

- **`test_sessions_activity_resigned_ea_invariants`**: seed one active EA + one resigned EA each with 5 sessions on the same day. Assert:
  - `daily_trend[that_day]` = 10 sessions (both counted).
  - `school_stats[their_school]` includes both EAs' sessions.
  - `ea_heatmap` contains the active EA's user_id only.
- **`test_ea_performance_resigned_ea_filtered_via_groups`**: seed a resigned EA with `GroupSummary2026.ea_user_id` set but zero sessions. Confirm they don't appear in the response (catches the name-vs-id leak Codex flagged).
- **`test_ea_performance_denominator_clamps_for_resigned`**: seed a resigned EA visible via a test-only `include_resigned=True` path; assert their `sessions_per_programme_day` uses `last_working_day` not `today`.
- **`test_resigned_ea_with_future_last_working_day_still_active`**: confirm effective-active logic.
- **`test_excluded_programs_case_insensitive`**: seed a session with `program_name='Masinyusane'` (mixed case). Confirm it's excluded from cohort queries after the Phase 1.5 fix.
- **`test_groups_2026_summary_marks_resigned_ea`**: seed a resigned EA with one group. Confirm the response includes the group with `ea_user_id` set and `ea_resigned=True`. Confirm group counts in school-level rollups are unchanged.
- **`test_school_detail_enrichment_filters_resigned`** (frontend, Vitest or similar — or a Django integration assertion if no JS test infra): given a `groups` payload with one resigned EA and one active EA at the same school, the rendered school card lists the active EA only, but `groups_count`, `children_count`, and `total_sessions` for the school include both.
- **`test_programme_overview_excludes_resigned`**: seed an active EA with 5 sessions/day and a resigned EA with 0.5 sessions/day. Confirm `total_active_eas == 1`, `pct_eas_on_track` reflects only the active EA, and `avg_sessions_per_day_worked` is not dragged down by the resigned EA.

## Out of Scope (Phase 2 Candidates)

- **Sessions page school table `active_eas` semantics.** This label currently means "EAs with sessions in the reporting window," not "currently employed EAs." Phase 1 leaves it unchanged — this is acceptable because the table is a session-activity reporter, not a staffing table. Reconcile in Phase 2 if it becomes a confusion source (rename or filter).
- Mentor as FK to a `Mentor` model.
- Filtering resigned EAs from Quality Flags / Letter Progress / Mentor Visits surfaces (group-level rollups, not EA rosters).
- Wider sessions-per-day audit across other `/pm/*` charts.
- Clerk ↔ Django auto-mapping (webhook on Clerk user create that matches by email, writes `teampact_user_id` to publicMetadata).
- `/pm/data-quality` page surfacing unmatched names from imports (per `project_data_quality_page.md`).
- `?include_resigned=1` query param on `sessions_activity` / `ea_performance` for any year-end-summary use case.

## Notes for Implementation Phase

- This plan currently lives at `~/.claude/plans/discussion-about-our-pm-squishy-ladybug.md`. Per `feedback_plans_location.md`, after plan approval also save a copy to the repo at `docs/superpowers/plans/2026-04-28-education-assistant-roster.md`.
- Work on a feature branch (per `feedback_git_commits.md`); no Co-Authored-By Claude trailers.
- Two repos coordinated. **Deployment order**: Django changes (model, migrations, views, casing fix, sync update) ship to Render **first** so the new `ea_user_id` / `ea_resigned` fields are available. Then the Next.js change (`enrich.ts` filter + `types.ts` field additions + `page.tsx` render-time filter) ships to Vercel. Until Next.js deploys, the school-detail page will look unchanged (resigned EAs still visible) — that's a brief, acceptable intermediate state since Django is purely additive.
- All Next.js → Django calls use `lib/django-fetch.ts` with `INTERNAL_API_SECRET` (per `project_django_service_auth.md`). No new auth surface.
- Keep `EducationAssistant` and `TAProfile` separate for now. `TAProfile` is name-keyed legacy data; `EducationAssistant` is user_id-keyed new truth. A future migration could fold them, but not in scope.
