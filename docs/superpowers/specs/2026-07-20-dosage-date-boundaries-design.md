# Programme Dosage & Time-Denominator Boundaries — Design

**Date:** 2026-07-20
**Status:** Approved (design); implementation plan to follow
**Scope:** Django backend (`Zazi_iZandi_Website_2025`) + PM frontend (`zazi-izandi-nextjs`)

> **Revision note (2026-07-20):** after an adversarial review, the session-derived "clamp" was **removed** from the design. The official denominator is now calendar-only; inferred school silence is surfaced on a Data Quality tab but never mutates a headline metric. §3 and §5 carry the reasoning.

## Problem

The PM dashboard reports **Weighted Dosage of 1.1 sessions/group/week (44% of a 2.5 target)** and mass-fires Quality Flags (131 active, "ACTION REQUIRED"). The programme is mid-term-break (SA Term 2 ended ~19 Jun; Term 3 resumes ~21 Jul), and the break days are being counted as teaching days in the denominator. The true dosage is roughly **2.1**, i.e. the programme is close to its target, not failing it.

This is not a single metric bug. It is a family of time-based metrics that divide by a day/week count, and the count is wrong because scheduled non-teaching days (public holidays, term breaks, staff absences) are not being excluded.

### Evidence (production data, as of 2026-07-20)

Weighted dosage over all teaching groups under different denominators:

| Denominator | Dosage | Note |
|---|---|---|
| Current: plain weekdays, first session → today | **1.19** | matches the dashboard's 1.1 (gap is cohort filtering) |
| **Calendar-aware, end = today — CHOSEN** | **2.12** | holidays/breaks excluded via real Masi calendar |
| Calendar-aware + school-level clamp | 2.39 | rejected — the uplift over 2.12 is unvalidated, produced by inflating unauthored-break schools (§3) |
| Calendar-aware + per-group clamp | 2.69 | rejected — masks abandonment (§3) |

The chosen denominator is the calendar-only **2.12**; the clamp rows are recorded as measured alternatives that the adversarial review (§3) ruled out.

Session activity confirms the shape: full teaching through the week of 15 Jun (~180 sessions on 19 Jun), then a sharp drop to single digits from 22 Jun onward. The last real teaching day was **19 Jun**; 22–30 Jun are stragglers.

## Root cause — three compounding, silent failures

The Masi master calendar **is** populated (384 closures + 1,340 staff absences for 2026), and Zazi's identity caches **are** synced (92 schools with canonical types, 156 youth). Yet none of the closure data reaches the dosage math, for three stacked reasons — each of which alone would mask the others, which is why it survived code review:

1. **Zazi's production `SchoolClosureCache` was empty (0 rows).** `sync_masi_calendar` was not populating it — the calendar sync was never added to the Render cron (the identity sync `sync_masi_identity` did run, confirming `MASI_API_BASE_URL` and the secret are set). **RESOLVED 2026-07-20:** the command was run manually (384 closures + 1,340 absences synced, verified in prod) and added to the Render cron. `count_work_days` was excluding only weekends until this point.

2. **Every `count_work_days` call site passes no `program_name` / `youth_uid`.** The signature is `count_work_days(start, end, *, program_name=None, youth_uid=None)`. With `program_name=None`, the resolver (`api/utils/work_days.py`) honours only `scope_key='global'` closures. So even once the cache is populated, per-school / per-type / per-region breaks and per-EA absences are ignored.

3. **The current June/July term break is authored as `type:primary`-scoped, one row per day (22 Jun – 17 Jul), with zero `global` rows in that window.** So it is invisible to Zazi until failure (2) is fixed. (The Easter break, 26 Mar – 6 Apr, *is* `global` and would resolve once failure (1) is fixed.)

**Meta-cause: silent failure.** An empty cache and an unresolved scope produce a plausible-looking wrong number with no alarm. The design must make recurrence loud, not just fix the current value.

### Secondary consistency bugs found during investigation

- **Two programme-start sources.** Nightly compute jobs hardcode `PROGRAMME_START_DATE = 2026-02-23`; the live `programme_overview` endpoint filters sessions by `ProgrammeTargets.programme_start_date`, which in production is **2026-02-02**. The live endpoint therefore includes ~3 extra weeks of pre-programme training/demo sessions. **Resolution (confirmed with Jim):** 2026-02-23 is the correct session-inclusion cutoff. Align the live endpoint to filter from 2026-02-23 (matching the nightly), keeping a single source of truth for the teaching/demo cutoff. `ProgrammeTargets.programme_start_date` (2026-02-02) may legitimately remain distinct as the calendar programme-start that feeds the "Week N of M" counter — to confirm during the plan, and if so name the two concepts separately rather than overloading one field.
- **Hardcoded on-track threshold.** `programme_overview` counts on-track groups against a literal `2.5` rather than `ProgrammeTargets.target_dosage`. (The frontend separately overrides both with per-cohort targets in `lib/pm/cohorts.ts`.)
- **Stale frontend holiday copy.** `zazi-izandi-nextjs/lib/schools-2026/constants.ts` still carries a hardcoded `SCHOOL_HOLIDAYS_2026` (one Easter entry) with a docstring claiming it is "kept in sync with Django `api/views.py`" — a constant Django retired. It feeds `/pm/schools/[name]`'s per-EA programme-day denominator, so that page diverges from `/pm`.
- **Rolling-window mislabel.** `sessions_this_week` / `sessions_this_month` are rolling 7/30 **calendar-day** windows anchored to cron run time, but `documentation/data-metrics-reference.md` documents them as current-ISO-week / current-calendar-month.

## Design decisions

### 1. Start date — unchanged

Each group's denominator continues to start at its **own first session date** (`compute_group_summaries_2026.py`). This is already correct and matches `pm-dashboard-architecture.md`. No change.

### 2. Denominator — calendar-aware (the whole mechanism)

Every time-based denominator resolves working days through the Masi closure calendar. Concretely:

- Ensure `sync_masi_calendar` runs nightly in production (ops; see Rollout).
- Pass `program_name` (and `youth_uid` where an EA is the subject) into **every** `count_work_days` / `closed_dates` call site so per-school, per-type, per-region closures and per-EA absences resolve. Identity data to support this is already synced.

With the current calendar this alone moves dosage 1.19 → ~2.12 and stops the ghost-flag mass-fire.

### 3. No session-derived clamp — calendar only (reversed after adversarial review)

An earlier version of this design added a session-derived "clamp" (rewind the denominator's end to a school's last-active date when the school went quiet) as a floor against an under-authored calendar. **An adversarial review (Codex, 2026-07-20) correctly rejected it, and we agree.** The fatal property: a clamp lets *missing delivery improve the published number*. When a school goes dark for a bad reason — the sole EA quits, a session-ingestion outage, a school-wide implementation failure — the clamp rewinds the denominator while keeping the numerator, so dosage stops decaying and can *rise*, precisely when things are worst. That is the one direction a metric must never fail (optimistic), and because weighted dosage / on-track / health all inherit the value, a side badge cannot rescue a falsely healthy headline. The clamp also silently redefined the metric (from "dosage over expected teaching time" to "frequency over an inferred active window") and was size-biased through its `MIN_DAILY_SESSIONS` straggler cutoff. Our own simulation is the tell: school-clamp 2.39 > calendar-only 2.12 — an *uplift produced by inflating exactly the schools whose breaks aren't authored.*

**Decision: the official denominator is calendar-derived, `end = today`, full stop.** No clamp. It fails *pessimistic* (an unauthored break makes a school look worse, which invites scrutiny) rather than optimistic (looks better, which hides problems). With the July break authored as `type:primary` and the call sites fixed, this already yields the honest **~2.12** — the clamp was never needed to fix the headline; the calendar fix was.

**Metric contract (explicit):** *sessions per expected teaching week*, where expected teaching weeks = `count_work_days(first_session, today, program_name, youth_uid) / 5` (weekdays minus resolved closures and absences). One number, one meaning, deterministic from the calendar — no inferred windows.

**Single-EA schools resolve for free under calendar-only.** 28 of 95 schools (29%) have one EA. With no clamp, a sole EA quitting mid-term makes that school's dosage *fall* (correct — no teaching is happening) and lights up the calendar-aware ghost flag (§4) plus the unexplained-silence flag (§5). Nothing is masked; the concern that motivated the clamp is answered by *removing* it.

**Sustained unexplained silence is surfaced, never auto-excluded.** When a school is silent for a sustained run of expected-open days that no closure covers, we do **not** mark it provisional or pull it from the headline — that removal is a judgment only a human who *knows* the cause should make. Instead the school stays in the headline (showing its honest, likely-low calendar-only dosage) and is **flagged on the Data Quality tab** for a human to resolve: author the missing closure (calendar then corrects it) or confirm the failure (the low number was right). See §5b.

**EA-subject metrics** (`avg_sessions_per_programme_day`, EA scatter/history) likewise use calendar-only denominators — `count_work_days(first_session, today, youth_uid=ea)` so personal absences resolve — plus the existing manual `last_working_day` end for resigned EAs. No session-derived end date.

### 4. Ghost / attendance flag — calendar-aware

`flag_ghost_group` counts weekdays since a group's last session and fires at ≥5, ignoring the closure calendar — so every group crosses the threshold during a break and the programme mass-flags itself. Change it to count **working days minus known closures**, so "on holiday" no longer fires while "abandoned during teaching time" still does. This keeps the attendance signal (the 244 groups that stopped >2 weeks before their school went quiet, any group quiet during teaching) honest: dosage measures intensity of teaching over expected teaching time, the ghost flag measures whether teaching is still happening at all.

### 5. Observability — make silent failure loud

Two diagnostic signals, both surfaced on the Data Quality tab (below); neither ever mutates a headline metric.

**(a) Sync-run health — not `masi_updated_at`.** The review caught (and prod confirms) that `masi_updated_at` is Masi's *record edit* time, not our *sync run* time: in prod it maxes at 24 Jun, so a "stale if older than 3 days" rule would falsely scream STALE on a cache Jim synced successfully *today*. Instead, track sync execution explicitly — last successful run timestamp, requested window, returned counts, failure state — via a small `MasiSyncRun` log row written by `sync_masi_calendar`. `closure_calendar_ok` is false when the last successful run is older than `STALE_AFTER_DAYS` (default 2), the window doesn't span the programme, or the last run failed. Also **scope-aware coverage**: enumerate session-active schools/EAs and flag any lacking a `SchoolIdentity2026` / `YouthIdentity2026` mapping (today: 2 real schools — `Malukhanye ECD`, `Witterkleibosch` — silently fall back to global-only closures; `Masinyusane` is the known fake and excluded). Unresolved names are listed, not hidden.

**(b) Unexplained-silence flag.** For each school, if a sustained run of *expected-open* days (weekdays minus resolved closures) has no sessions, emit one item: "School X silent since D over N expected-open days — no closure on record; break or problem?" This is *informational only*: the school remains in all headline metrics. Resolution is a human action — author the closure (calendar corrects the metric next sync) or confirm the failure (the low number stands). Any decision to exclude a school from stats is manual and out of scope here.

**Surfacing — a dedicated Data Quality / Alerts tab.** Both signals (plus the unmatched-children / coverage lists already planned for `/pm/data-quality`) surface on a **new PM sidebar tab**. The Overview shows only a lightweight badge/count linking to it. The tab never changes a metric; it is where humans see and act on data-quality issues.

### 6. Scope — comprehensive backend pass

Fix all work-day-denominator metrics coherently in one pass (group + school dosage → weighted dosage inherits; `avg_sessions_per_programme_day`; EA scatter + history; ghost flag) and fold in the secondary consistency bugs (single session cutoff of 2026-02-23 in both nightly and live; on-track uses `target_dosage`; refresh/retire the stale frontend holiday copy). The nightly compute is a full recompute, so the next run corrects all history — no backfill needed.

## Out of scope (parked)

- **Year-end programme end / "assessment start as final session date."** A genuine future concern (post-assessment, attendance gets messy), but it is a year-end question and we are mid-year. Assessments are not present in `sessions_2026` (they live in the separate EGRA dataset), so this needs a different data source. When we reach it, drive it off `ProgrammeTargets.programme_end_date` and/or the EGRA assessment timeline, not the session stream.
- **Full reconciliation report** (per-group session-derived active weeks vs calendar work weeks, plus unmatched-children / coverage exports). The unexplained-silence signal (§5b) is a targeted slice of this that ships now on the new Data Quality tab; the broader per-group report and exports are a later build on the same tab.
- **Teaching-week counter ("Week 20 of 38").** Pure calendar division; cosmetic. Optionally make holiday-aware later.

## Affected code (for the implementation plan)

Django (`Zazi_iZandi_Website_2025`):
- `api/management/commands/compute_group_summaries_2026.py` — pass `program_name` into the group dosage `count_work_days` call; make `_count_weekdays` / `flag_ghost_group` closure-aware; emit the per-school unexplained-silence check.
- `api/management/commands/compute_school_summaries_2026.py` — pass `program_name` into the school dosage `count_work_days` call.
- `api/views.py` — `programme_overview` (weighted dosage denominator, on-track threshold → `target_dosage`, `avg_sessions_per_programme_day`, programme-start source → 2026-02-23, `closure_calendar_ok` from sync-run health + identity coverage); `ea_performance` / `ea_performance_history` (pass `youth_uid`); `sessions_activity` (`closed_dates` call).
- `api/utils/work_days.py` — resolver already supports scoped resolution; change is confirming every call site passes `program_name` / `youth_uid`.
- `sync_masi_calendar` + a new `MasiSyncRun` log model — record last successful run, window, counts, failure state (for `closure_calendar_ok`).
- `sync_masi_identity` / `SchoolIdentity2026` — ensure the 2 real unmapped session-active schools (`Malukhanye ECD`, `Witterkleibosch`) get identities; expose any unresolved names.
- Render cron — `sync_masi_calendar` added (done); confirm ordering after `sync_teampact_sessions_2026`, before the compute steps.

Next.js (`zazi-izandi-nextjs`):
- **New PM sidebar tab (Data Quality / Alerts)** — lists the cache-staleness and unexplained-silence items; the Overview shows only a linking badge/count. Home for `/pm/data-quality`'s planned exports later.
- `app/pm/page.tsx` / overview components — render the linking badge from `closure_calendar_ok` and the outstanding-alert count.
- `lib/schools-2026/constants.ts` + `lib/schools-2026/enrich.ts` — retire/repoint the stale hardcoded holiday copy so `/pm/schools/[name]` matches `/pm`.

## Rollout / operational dependencies

1. **✅ DONE (2026-07-20).** `sync_masi_calendar` run in prod (384 closures, 1,340 absences synced; cache verified non-zero and spanning 2026-01-01…2026-12-26) and added to the Render cron.
2. **ECD closures — rely on the real per-centre calendar; do not author blanket `type:ecd` breaks (decided).** ECD centres are not public institutions; whether one closes for a term break is up to its leadership, and some daycares stay open year-round. A blanket `type:ecd` break would therefore be *wrong* — it would exclude days some centres were genuinely open. We rely on the actual per-centre closures in Masi. An ECD that closed without a closure authored shows lower calendar-only dosage (honest) and appears on the Data Quality tab as unexplained silence for a human to resolve; an ECD that stayed open keeps logging sessions and needs nothing. No authoring action required for this fix.
3. **✅ RESOLVED.** 2026-02-23 confirmed as the correct session cutoff (see consistency bug above); align the live endpoint to it.

## Verification plan

- **Reproduce the current wrong number** end-to-end (done: 1.19 all-groups matches the 1.1 cohort figure).
- After the fix, confirm on production data that weighted dosage lands **~2.1** (calendar-only), on-track-groups rises correspondingly, and active-flag count drops sharply once the ghost flag is calendar-aware. The number is *not* tuned to a target — it is whatever the calendar yields, and it should fail **pessimistic** (an unauthored break lowers a school, never raises it).
- Assert the 244 "stopped mid-programme" groups read **low** dosage — the calendar-only denominator (no clamp) does not mask them.
- **Fail-pessimistic test:** simulate a school going dark with no closure authored; confirm its dosage *falls* (never rises), the school stays in the headline, and an unexplained-silence item appears on the Data Quality tab.
- **Sync-health test:** confirm `closure_calendar_ok` is driven by the `MasiSyncRun` log (true right now despite `masi_updated_at` being 26 days old), and flips false on a failed/absent run or incomplete window. Confirm unmapped session-active schools are listed.
- Confirm `/pm` and `/pm/schools/[name]` agree on programme-day denominators after the frontend holiday copy is repointed.

## Expected outcome

Weighted Dosage moves from **1.1 → ~2.1** (the honest calendar figure, not a smoothed-up number); on-track groups and the dosage distribution shift up in step; active Quality Flags fall as break-driven ghost flags clear; and any future sync failure or unexplained school-wide silence surfaces on the Data Quality tab — visibly and without ever mutating a headline metric — instead of silently deflating (or, worse, inflating) the programme's numbers.
