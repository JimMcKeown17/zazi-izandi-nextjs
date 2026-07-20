# Programme Dosage & Time-Denominator Boundaries — Design

**Date:** 2026-07-20
**Status:** Approved (design); implementation plan to follow
**Scope:** Django backend (`Zazi_iZandi_Website_2025`) + one Next.js banner (`zazi-izandi-nextjs`)

## Problem

The PM dashboard reports **Weighted Dosage of 1.1 sessions/group/week (44% of a 2.5 target)** and mass-fires Quality Flags (131 active, "ACTION REQUIRED"). The programme is mid-term-break (SA Term 2 ended ~19 Jun; Term 3 resumes ~21 Jul), and the break days are being counted as teaching days in the denominator. The true dosage is roughly **2.1–2.4**, i.e. the programme is close to its target, not failing it.

This is not a single metric bug. It is a family of time-based metrics that divide by a day/week count, and the count is wrong because scheduled non-teaching days (public holidays, term breaks, staff absences) are not being excluded.

### Evidence (production data, as of 2026-07-20)

Weighted dosage over all teaching groups under different denominators:

| Denominator | Dosage | Note |
|---|---|---|
| Current: plain weekdays, first session → today | **1.19** | matches the dashboard's 1.1 (gap is cohort filtering) |
| Calendar-aware, end = today | **2.12** | holidays/breaks excluded via real Masi calendar |
| Calendar-aware + **school-level** clamp | **2.39** | also floors school-wide breaks the calendar under-authors |
| Calendar-aware + **per-group** clamp | 2.69 | rejected — masks abandonment (see below) |

Session activity confirms the shape: full teaching through the week of 15 Jun (~180 sessions on 19 Jun), then a sharp drop to single digits from 22 Jun onward. The last real teaching day was **19 Jun**; 22–30 Jun are stragglers.

## Root cause — three compounding, silent failures

The Masi master calendar **is** populated (384 closures + 1,340 staff absences for 2026), and Zazi's identity caches **are** synced (92 schools with canonical types, 156 youth). Yet none of the closure data reaches the dosage math, for three stacked reasons — each of which alone would mask the others, which is why it survived code review:

1. **Zazi's production `SchoolClosureCache` is empty (0 rows).** `sync_masi_calendar` is not populating it. The identity sync (`sync_masi_identity`) clearly runs in prod, so `MASI_API_BASE_URL` and the shared secret are set correctly — the calendar sync was simply never added to the Render cron (it appears in no orchestration script in the repo). Result: `count_work_days` currently excludes **only weekends**.

2. **Every `count_work_days` call site passes no `program_name` / `youth_uid`.** The signature is `count_work_days(start, end, *, program_name=None, youth_uid=None)`. With `program_name=None`, the resolver (`api/utils/work_days.py`) honours only `scope_key='global'` closures. So even once the cache is populated, per-school / per-type / per-region breaks and per-EA absences are ignored.

3. **The current June/July term break is authored as `type:primary`-scoped, one row per day (22 Jun – 17 Jul), with zero `global` rows in that window.** So it is invisible to Zazi until failure (2) is fixed. (The Easter break, 26 Mar – 6 Apr, *is* `global` and would resolve once failure (1) is fixed.)

**Meta-cause: silent failure.** An empty cache and an unresolved scope produce a plausible-looking wrong number with no alarm. The design must make recurrence loud, not just fix the current value.

### Secondary consistency bugs found during investigation

- **Two programme-start sources.** Nightly compute jobs hardcode `PROGRAMME_START_DATE = 2026-02-23`; the live `programme_overview` endpoint filters sessions by `ProgrammeTargets.programme_start_date`, which in production is **2026-02-02**. The live endpoint therefore includes ~3 extra weeks of pre-programme training/demo sessions.
- **Hardcoded on-track threshold.** `programme_overview` counts on-track groups against a literal `2.5` rather than `ProgrammeTargets.target_dosage`. (The frontend separately overrides both with per-cohort targets in `lib/pm/cohorts.ts`.)
- **Stale frontend holiday copy.** `zazi-izandi-nextjs/lib/schools-2026/constants.ts` still carries a hardcoded `SCHOOL_HOLIDAYS_2026` (one Easter entry) with a docstring claiming it is "kept in sync with Django `api/views.py`" — a constant Django retired. It feeds `/pm/schools/[name]`'s per-EA programme-day denominator, so that page diverges from `/pm`.
- **Rolling-window mislabel.** `sessions_this_week` / `sessions_this_month` are rolling 7/30 **calendar-day** windows anchored to cron run time, but `documentation/data-metrics-reference.md` documents them as current-ISO-week / current-calendar-month.

## Design decisions

### 1. Start date — unchanged

Each group's denominator continues to start at its **own first session date** (`compute_group_summaries_2026.py`). This is already correct and matches `pm-dashboard-architecture.md`. No change.

### 2. Denominator — calendar-aware, as the primary mechanism

Every time-based denominator resolves working days through the Masi closure calendar. Concretely:

- Ensure `sync_masi_calendar` runs nightly in production (ops; see Rollout).
- Pass `program_name` (and `youth_uid` where an EA is the subject) into **every** `count_work_days` / `closed_dates` call site so per-school, per-type, per-region closures and per-EA absences resolve. Identity data to support this is already synced.

With the current calendar this alone moves dosage 1.19 → 2.12 and stops the ghost-flag mass-fire.

### 3. Safety-net clamp — school-level, session-derived

The user does not fully trust the calendar's timeliness/completeness (confirmed: ECD breaks are not authored as `type:ecd`, so calendar-only under-counts ECD closures). A clamp floors the denominator so a missing break cannot silently inflate it — **but the clamp must not redefine the metric or hide abandonment.**

**Granularity is the whole ballgame.** A per-group clamp (`end = min(today, group_last_session)`) measures each group only over its own active window, so a group that died in April divides by ~4 weeks instead of ~19 and scores *well*. 244 of 1,052 groups (23%) stopped teaching >2 weeks before their school went quiet; a per-group clamp hides all of them, inflating the mean to 2.69 and violating the project's "ghost = attendance, keep it out of quality" principle. **Rejected.**

**Adopted: school-level clamp.** Freeze a school's denominator only when the *whole school* goes quiet for a sustained gap — the pattern that is unambiguously a break rather than one class being neglected.

```
school_last_active_date = last working day on which the school had >= MIN_DAILY_SESSIONS sessions
if count_work_days(school_last_active_date, today, program_name=school) >= BREAK_THRESHOLD:
    end = school_last_active_date          # school-wide break: freeze
else:
    end = today                            # normal operation
denominator_work_days = count_work_days(first_session, end, program_name=school)
```

A single class that dies while its school keeps teaching still runs to `today` and stays penalized. This lands dosage at ~2.39 and catches staggered per-school / per-type breaks (including ECD) the calendar misses.

**Parameters (tunable; defaults for the plan to validate):** `MIN_DAILY_SESSIONS = 3` (ignore stragglers), `BREAK_THRESHOLD = 10` working days (~2 weeks; only sustained school-wide gaps freeze).

**EA-subject metrics** (`avg_sessions_per_programme_day`, EA scatter/history) are not tied to one school, so their session-derived floor is **programme-level** (freeze when the whole programme is quiet), combined with calendar resolution (`youth_uid` for personal absences) and the existing manual `last_working_day` clamp for resigned EAs. Never per-EA in a way that masks an EA who stopped.

**Principle for the plan:** calendar is primary; the session-derived clamp floors at the coarsest aggregate that stays unambiguous (school for group/school dosage, programme for EA metrics); never freeze at a grain fine enough to erase a genuine drop-off signal.

### 4. Ghost / attendance flag — calendar-aware

`flag_ghost_group` counts weekdays since a group's last session and fires at ≥5, ignoring the closure calendar — so every group crosses the threshold during a break and the programme mass-flags itself. Change it to count **working days minus known closures**, so "on holiday" no longer fires while "abandoned during teaching time" still does. This keeps the attendance signal (the 244 dead groups, any group quiet during teaching) honest and complements the dosage clamp: dosage measures quality-while-active, the ghost flag measures still-active.

### 5. Staleness alert — make silent failure loud

Add a check so an empty or stale closure cache surfaces instead of quietly deflating metrics:

- The programme-overview payload gains a `closure_calendar_ok` signal, false when `SchoolClosureCache` has no rows spanning the current programme window, **or** the newest `masi_updated_at` is older than `STALE_AFTER_DAYS` (default 3).
- `/pm` renders an amber data-quality banner when false ("Closure calendar stale — dosage may be understated"), reusing the existing `isLive` / mock-data-transparency banner pattern.
- Log/alert server-side on the same condition.

The clamp still floors the number underneath; the banner ensures a human is told.

### 6. Scope — comprehensive backend pass

Fix all work-day-denominator metrics coherently in one pass (group + school dosage → weighted dosage inherits; `avg_sessions_per_programme_day`; EA scatter + history; ghost flag) and fold in the secondary consistency bugs (single programme-start source via `ProgrammeTargets`; on-track uses `target_dosage`; refresh/retire the stale frontend holiday copy). The nightly compute is a full recompute, so the next run corrects all history — no backfill needed.

## Out of scope (parked)

- **Year-end programme end / "assessment start as final session date."** A genuine future concern (post-assessment, attendance gets messy), but it is a year-end question and we are mid-year. Assessments are not present in `sessions_2026` (they live in the separate EGRA dataset), so this needs a different data source. When we reach it, drive it off `ProgrammeTargets.programme_end_date` and/or the EGRA assessment timeline, not the session stream.
- **Reconciliation report** (session-derived active weeks vs calendar work weeks per group, feeding a `/pm/data-quality` page). Valuable and complementary to the staleness alert, but a separate build.
- **Teaching-week counter ("Week 20 of 38").** Pure calendar division; cosmetic. Optionally make holiday-aware later.

## Affected code (for the implementation plan)

Django (`Zazi_iZandi_Website_2025`):
- `api/management/commands/compute_group_summaries_2026.py` — group dosage denominator (`count_work_days` call); `_count_weekdays` / `flag_ghost_group`.
- `api/management/commands/compute_school_summaries_2026.py` — school dosage denominator; school-last-active computation.
- `api/views.py` — `programme_overview` (weighted dosage, on-track threshold, `avg_sessions_per_programme_day`, programme-start source, staleness signal); `ea_performance` and `ea_performance_history` (EA denominators); `sessions_activity` (`closed_dates` call).
- `api/utils/work_days.py` — resolver already supports scoped resolution; no change expected beyond confirming call-site usage.
- Render cron — add `sync_masi_calendar` to the nightly sequence (after `sync_teampact_sessions_2026`, before the compute steps), and verify it succeeds.

Next.js (`zazi-izandi-nextjs`):
- `app/pm/page.tsx` / overview components — render the staleness banner from `closure_calendar_ok`.
- `lib/schools-2026/constants.ts` + `lib/schools-2026/enrich.ts` — retire/repoint the stale hardcoded holiday copy so `/pm/schools/[name]` matches `/pm`.

## Rollout / operational dependencies

1. **Add `sync_masi_calendar` to the Render cron** and confirm it populates `SchoolClosureCache` (this is inert-blocking: nothing else matters until the cache fills). Verify the closure count is non-zero and spans the programme window after the first run.
2. Author the **missing ECD term-break closures** in Masi (`/operations/closures`) as `type:ecd` (or per-school) so calendar-only accuracy improves and the school clamp becomes a true backstop rather than load-bearing for ECD.
3. Confirm/settle the **`ProgrammeTargets` values** in production (`programme_start_date` currently 2026-02-02 vs the intended training/demo cutoff of 2026-02-23) before making it the single source of truth.

## Verification plan

- **Reproduce the current wrong number** end-to-end (done: 1.19 all-groups matches the 1.1 cohort figure).
- After the fix, confirm on production data that weighted dosage lands ~2.1–2.4, on-track-groups rises correspondingly, and active-flag count drops sharply once the ghost flag is calendar-aware.
- Assert the 244 "died mid-programme" groups still read **low** dosage (clamp did not mask them).
- Force an empty/stale cache in a test and confirm the amber banner appears and the clamp still floors the number.
- Confirm `/pm` and `/pm/schools/[name]` agree on programme-day denominators after the frontend holiday copy is repointed.

## Expected outcome

Weighted Dosage moves from **1.1 → ~2.4**; on-track groups and the dosage distribution shift up in step; active Quality Flags fall as break-driven ghost flags clear; and any future cache staleness raises a visible banner instead of silently deflating the programme's numbers.
