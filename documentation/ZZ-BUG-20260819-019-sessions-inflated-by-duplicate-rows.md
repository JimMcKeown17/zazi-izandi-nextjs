---
record_version: 1
id: ZZ-BUG-20260819-019   # SUGGESTED number — reassign to the next free id at intake
title: EA session counts inflated by duplicate `sessions` rows (one session persisted under multiple ids)
classification: product_defect
subsystem: session sync / outbox — client session-id stability at the write boundary

severity_score: 4
severity_band: S2
severity_components:
  user_impact: 2          # reporting is materially misleading; ops/quality decisions read false counts
  data_security_privacy: 1
  scope: 1                # multiple EAs across multiple schools observed
  recoverability: 0       # duplicates are removable by a dedup sweep; the real session is not lost
severity_override: none
priority: P2

diagnosis_state: PROBABLE
delivery_state: NO_FIX_PROPOSED
verification_state: NOT_TESTED

root_cause_confidence_pct: 75
confidence_basis: >
  Confirmed from two independent read paths that the inflation is real row-level
  duplication in public.sessions, not a query/join artifact: (a) the heatmap RPC
  mobile_sessions_activity counts raw sessions rows, and (b) the user-profile RPC
  mobile_user_profile lists "recent sessions" by DISTINCT sessions.id (1:1), yet
  both show the same inflation and the operator visually confirmed "the same
  session saved over and over" in the per-user detail. Distinct-id rows with
  identical content ⇒ duplicate INSERTs, which rules out a roster fan-out join.
  The server RPC apply_mobile_session_bundle_mutation is idempotent (upserts on a
  CLIENT-supplied id via ON CONFLICT (id) DO UPDATE), so duplication requires the
  client to emit DIFFERENT ids for one logical session. createSessionDraft mints a
  fresh uuidv4() per call (idFactory()), and sessions has no natural/business
  unique key to stop it. NOT yet confirmed: the exact client trigger (autosave /
  resume / outbox re-enqueue) and the blast radius — both need the read-only prod
  queries below (a Claude Code session was blocked from running them against prod).

created_at_utc: 2026-08-19T17:00:06Z
updated_at_utc: 2026-08-19T17:00:06Z
first_observed_at: unknown   # earliest duplicate created_at — resolved by the blast-radius query
last_observed_at: 2026-08-19T00:00:00Z   # dashboard viewed 2026-08-19 (SAST); today's rows are duplicated

known_occurrences: 4        # EAs visibly inflated in the dashboard; true count needs the query
known_affected_users: 4     # Akhona Xhanko, Danica Makapela, Jenna Joubert, Ayabulela Thandani (min, from one screenshot)
exposure_denominator: unknown
exposure_window: Production 1.1.1 devices whose session-save path persists one logical session under more than one id

environment: production
affected_releases:
  - 1.1.1 (runtime 1.1.1)   # INFERRED from sibling ZZ-BUG-20260819-018; confirm from the duplicate rows' provenance
affected_devices: []        # unknown until the rows are inspected; 018 saw Samsung SM-A055F / SM-A065F
affected_os_versions: []
repositories:
  - zazi-izandi-app

sentry_issue_ids: []
sentry_event_ids: []
field_report_ids: []
sync_incident_keys: []
sync_incident_signatures: []
evidence_paths: []

data_safety_status: server_copies_over_present_local_status_unknown   # over-counted, not lost
workaround_status: none_known
owner: unassigned
duplicate_of: none
possible_duplicate_of: []   # RELATED to ZZ-BUG-20260819-018 (same subsystem, sibling), not a duplicate
---

# ZZ-BUG-20260819-019 — EA session counts inflated by duplicate `sessions` rows

> Handoff note authored from the reporting side (zazi-izandi-nextjs mobile-app
> dashboard). The fix belongs to zazi-izandi-app / Supabase. Written to avoid
> editing the app repo while Option-D-recovery work is in flight. Reassign the id
> and drop into `docs/bugs/records/` at intake.

## User-visible symptom

On the staff **Mobile App Data → Sessions** dashboard (`zazi-izandi.co.za/mobile-app/sessions`),
the **EA Activity Heatmap** shows impossible per-day session counts for a subset
of EAs. On 2026-08-19 the operator saw, for a single weekday, Akhona Xhanko 32
(and 86 the previous weekday), Danica Makapela 26, Jenna Joubert 26, Ayabulela
Thandani 11 — against a normal Literacy-Coach load of ~2–5/day (most EAs show 3).
Operator verbatim: *"If I click into the user, I can see it's just the same
session saved over and over and over again."*

## Operational impact

- **Can the user continue?** Yes. Nothing is blocked for the EA; this is a
  reporting-integrity defect.
- **Core workflow affected:** Staff reporting/quality. Heatmap totals, daily
  trend, school summaries, distribution buckets, and per-EA profile counts all
  over-count. Quality/dosage decisions made from these numbers are wrong.
- **Known affected users:** ≥4 visible in one screenshot (Akhona Xhanko, Danica
  Makapela, Jenna Joubert, Ayabulela Thandani). True count unknown until the
  blast-radius query runs.
- **Relevant exposed population:** Any device whose session-save path persists a
  single logical session under more than one `id`.
- **Workaround:** None from the app. Do NOT recreate anything — the real session
  exists; the extras are duplicates to be removed by a sweep.

## Data-safety assessment

- **Missing local data:** Unknown (no device export held).
- **Missing server data:** None suspected — this is over-counting, not loss.
- **Pending outbox/retry/quarantine evidence:** Not held from the reporting side.
  Note the sibling finding ZZ-BUG-20260819-018 (`missing_outbox_slot`, same
  devices/subsystem) — the outbox bookkeeping there may be the same mechanism
  that lets a session be re-persisted under a new id.
- **Eventual convergence evidence:** N/A — duplicates persist; they do not converge away.
- **Duplication, misattribution, or cross-account risk:** **Duplication confirmed**
  (distinct-id rows, identical content, same owner). No cross-account risk observed.

## Occurrences

| Report | Source | Reporter/user | Observed time | Received time | Release/environment | Device/OS | Network | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | Staff dashboard | Masi ops (Jim) | 2026-08-19 (SAST) | 2026-08-19T17:00Z | 1.1.1 production (reporting via Django RPC) | n/a (server data) | n/a | Heatmap counts Akhona 32/86, Danica 26, Jenna 26, Ayabulela 11; per-user detail shows the same session repeated. |

## Reproduction

### Reporter steps

1. Open `/mobile-app/sessions`, view the EA Activity Heatmap.
2. Observe a subset of EAs with impossibly high per-day counts.
3. Click into an inflated EA; the "recent sessions" list shows the same session
   repeated.

### Expected

One `sessions` row per real teaching session; per-day counts in the low single digits.

### Actual

Many `sessions` rows for one logical session (distinct ids, identical content),
counted faithfully by the reporting RPCs.

### Closest E2E reproduction

Not attempted from the reporting side. A device-level repro (autosave/resume/retry
of an in-progress session on an affected build) is the next step and belongs in
the app repo.

## Observed facts

- **Reporting is a faithful mirror.** `mobile_sessions_activity`
  (`supabase/migrations/20260810120000_...`) counts raw `public.sessions` rows
  (`COUNT(qualifying_session.id)`) where `session_type = 'Literacy Coach'`. Django
  (`api/mobile/reports.py`) and Next.js only validate/aggregate/display.
- **Independent corroboration.** `mobile_user_profile`
  (`supabase/migrations/20260813100000_...`) builds `recent_sessions` from
  `recent_sessions_bounded` = **distinct `sessions.id`** (1:1 join by id). The
  operator seeing the same session repeated there ⇒ **distinct-id duplicates**,
  not a fan-out. (A roster fan-out in the heatmap join would NOT show in this
  distinct-id list, and the totals broadly match `018`'s raw server count of 122
  for Akhona.)
- **`public.sessions` has no natural unique key.** `id UUID DEFAULT
  gen_random_uuid() PRIMARY KEY`; indexes only on `user_id`, `session_date`,
  `synced`, and the id arrays (initial schema `20260504152507_...`). Nothing at
  the DB level prevents two identical-content rows with different ids.
- **Server sync is idempotent on a client id.** `apply_mobile_session_bundle_mutation`
  (`20260722150000_...`) reads `v_session_id := (v_root_record ->> 'id')::UUID`
  and does `INSERT INTO public.sessions ... ON CONFLICT (id) DO UPDATE`. So a
  retry with the **same** id upserts cleanly — duplication requires **different**
  ids for one logical session.
- **The client mints a fresh id per draft.** `createSessionDraft`
  (`src/utils/activeSessionState.js`) sets `id: idFactory()` with `idFactory =
  uuidv4`. `sessionsRepository.save()` keys the outbox mutation on `session.id`,
  so the duplication is upstream of the outbox: multiple `session.id` values are
  reaching persistence for one teaching session.
- **Precedent, same bug class.** `time_entries` had the identical
  "insert not idempotent on retry" defect and was fixed 2026-08-18 with
  `ON CONFLICT (id) DO UPDATE` (`20260818120000_...`, ZZ-BUG-20260813-002).
- **Active sibling.** ZZ-BUG-20260819-018 (`missing_outbox_slot`) and the
  Option-D-recovery / "2026-08-19 sync-receipt sweep" work touch this exact
  outbox/sync-integrity area, on the same devices, citing the same EA (Akhona).

## Hypotheses

| Hypothesis | Evidence for | Evidence against | Confidence | Next discriminating check |
| --- | --- | --- | ---: | --- |
| Client persists one in-progress session under a NEW id on autosave/resume/crash-recovery; each gets uploaded and upserts to its own row | `createSessionDraft` mints uuid per call; magnitude (26–86) fits a periodic loop; per-EA variance fits session length / app churn | Not device-confirmed; unclear how many went through the receipt-tracked path | 55% | `created_at` cadence query below — seconds apart ⇒ autosave loop |
| Outbox re-enqueues a session-family mutation with a regenerated record id after an accept/slot loss (ties to 018's `missing_outbox_slot`) | 018 shows slots going missing after accept on these devices | 018 saw a single id per family, not 80+ | 25% | Device export of `sync_outbox_v2` for one affected session-day |
| Legacy pre-idempotency duplicates (created before the bundle RPC went live) | Some piles could predate 2026-07-22 | Operator says counts are for **today** (2026-08-19) | 10% | Min/max `created_at` of a duplicate pile |
| Reporting-side inflation (join fan-out) | — | Ruled out: profile lists distinct ids and still shows repeats | 0% | — |

## Root cause

**Probable:** a single logical teaching session is persisted under multiple
`sessions.id` values by the mobile app (client-side id instability across
autosave/resume/retry, or outbox re-enqueue with a regenerated id). Because the
server upsert is keyed on the client-supplied id and `public.sessions` has no
natural unique key, each distinct id becomes its own row. The Django RPC and the
Next.js dashboard then faithfully count the duplicates. The exact client trigger
is not yet established (needs the cadence query and/or a device export).

## Suggested fix

Direction only — not approved, not implemented. Fix at the write boundary, then clean up:

1. **Client (primary):** guarantee **one stable `id` per logical session** for
   its whole lifecycle — draft → autosave → resume → complete → sync. The id must
   be minted once and reused; autosave/resume must UPDATE, never mint a new draft
   id. Audit `activeSessionState.js` / `useActiveSessionState.js` / the
   completion + outbox path.
2. **DB (defense-in-depth):** add a natural-key guard on `public.sessions` so a
   client bug can never multiply rows — e.g. a UNIQUE constraint (or unique index)
   on a business key such as `(user_id, session_date, started_at)` (or a
   client-supplied `client_session_key`), with the bundle RPC upserting on it.
   This is the durable stop; the client fix alone leaves the table unguarded.
3. **Data cleanup:** a one-off, audited dedup sweep collapsing existing duplicate
   piles to one row each (keep earliest `created_at`, re-point `session_attendees`),
   run after 1 and 2 so it doesn't immediately re-fill.
4. A reporting-side `DISTINCT`/dedup in the RPC would be a **band-aid** that hides
   the corruption without fixing it — not recommended as the resolution.

### Read-only prod confirmation queries (project `yaclyyurdwarhmiheojr`)

```sql
-- Blast radius: EA/day combos with duplicate-looking session rows (last 14 days)
select user_id, session_date, count(*) as rows, count(distinct id) as distinct_ids
from public.sessions
where session_type = 'Literacy Coach'
  and session_date >= current_date - 14
group by user_id, session_date
having count(*) > 6
order by rows desc;

-- Are the piles truly identical content? (group by a candidate business key)
select user_id, session_date, started_at, group_ids, children_ids, count(*) as copies
from public.sessions
where session_type = 'Literacy Coach'
  and session_date >= current_date - 14
group by user_id, session_date, started_at, group_ids, children_ids
having count(*) > 1
order by copies desc;

-- Cadence of one pile (Akhona, Tue 18): seconds apart ⇒ autosave loop; hours/days ⇒ re-sync
select id, created_at, started_at, duration_seconds, group_ids, children_ids
from public.sessions
where session_type = 'Literacy Coach'
  and session_date = '2026-08-18'
  and user_id = '<akhona_user_id>'
order by created_at;
```

## Verification plan

- [ ] Run the blast-radius + cadence queries; quantify affected EAs/days and pin the trigger.
- [ ] Reproduce the session save/autosave/resume/sync flow on 1.1.1 (or closest) and show one logical session producing >1 `sessions.id`.
- [ ] Add a regression test that fails when one logical session yields multiple rows.
- [ ] Land the client id-stability fix and/or the DB natural-key guard.
- [ ] Run the audited dedup sweep; verify attendees re-point and counts normalize.
- [ ] Confirm the dashboard shows realistic per-day counts after the fix + sweep.
- [ ] Identify the exact release/build containing the fix.

## Timeline

| Time UTC | Actor | Event | Evidence or decision |
| --- | --- | --- | --- |
| 2026-08-19T~09:00Z | EA devices | Duplicate `sessions` rows present for 2026-08-19 | Dashboard counts |
| 2026-08-19T17:00Z | Reporting-side investigation | Duplication confirmed as real distinct-id rows; root cause localized to app write/sync path | This record |

## Open questions

- What single fact most changes the leading hypothesis? → The `created_at` cadence
  of one duplicate pile (autosave loop vs. re-sync vs. legacy).
- After a successful session-bundle upload, exactly what local writes mark the
  session synced and clear its outbox slot — and can any path re-mint the draft id
  or re-enqueue under a new id? (Shared open question with ZZ-BUG-20260819-018.)
