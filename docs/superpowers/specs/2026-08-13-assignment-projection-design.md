# Assignment Read-Model Reconciliation — Design Spec (v4)

_Drafted 2026-08-13. v2 after adversarial round 1 (17 findings; trigger/
soft-close design withdrawn — see "Why not triggers"). v3 after adversarial
round 2 (15 findings, REVISE: architecture endorsed, SQL contract hardened).
v4 after adversarial round 3 (Codex, NO-SHIP: 4 findings — the
retained-access "accepted trade-off" is withdrawn as an authorization
defect; provenance ledger + compensating rollback added; advisory locks
made transaction-scoped; independent watchdog made a deploy prerequisite).
Status: DRAFT for review round 4. Target repo: `zazi-izandi-app`. No
mobile-app or frontend changes. Fork B modifies one existing sync RPC in a
versioned migration; the watchdog adds one management-command check to the
existing nightly Django cron. Everything else is additive Supabase
migrations._

## Problem

The domain tables `child_ea_assignments`, `class_ea_assignments`, and
`group_ea_assignments` were introduced by the 2026-05-04 refactor
(`20260504152516_sqlite_refactor_domain_schema.sql`) with a **one-time**
`INSERT … SELECT … ON CONFLICT DO NOTHING` copy from the mobile-writable
sources and no ongoing maintenance. Every assignment written since reaches
the sources (`staff_children`, `classes.staff_id`, `groups.staff_id`) and
stops there. The TeamPact seed writes both sources and domain tables, which
masked the gap for seeded cohorts until self-setup EAs arrived.

Measured drift (production, read-only, 2026-08-13): 854 missing child
assignments across 35 EAs (incl. seeded EAs' in-app additions), 34 active
classes across 33 EAs, 40 active groups across 8 EAs. Consequence: the
user-health v2 RPC reports 0/0/0/0 server data for the whole ZZ ECD 2026
wave (22 of 27 EAs have really created children); every consumer of these
tables undercounts; drift grows monotonically.

## Verified architecture facts (rounds 1–2; all verified in code/production)

1. **These tables are the authorization substrate.** The
   `current_user_can_*` helpers (`20260504152516:999–1169`) grant via an
   **active** domain row, else fall back to legacy evidence
   (`staff_children` / `children.created_by`; `classes.created_by`;
   `groups.staff_id`) — gated on `NOT EXISTS (… any domain row for the
   entity …)`, **not** filtered by `unassigned_at`. Any row, active or
   closed, permanently disables the fallback for that entity. Legacy SELECT
   policies die the same way (`:1305–1329`).
2. **`unassigned_at` is a revocation instruction.** A pulled row with it set
   is `'explicit_assignment_end'` evidence; the device quarantines the
   entity's local graph (`mergeServerRows.js:53–63, 371–372`;
   `childRevocationRepository.js` is the *inbound consumer*, not a delete
   path).
3. **`staff_children` is upserted**: RLS is SELECT/INSERT/UPDATE/DELETE
   (`20260504152516:1282–1352`); the server sync write is `INSERT … ON
   CONFLICT (staff_id, child_id) DO UPDATE` gated on
   `current_user_can_write_child` with a `GET DIAGNOSTICS ROW_COUNT`
   permission check (`20260729200000:2279–2296`). Row-level INSERT/DELETE
   triggers cannot see the DO UPDATE resolution.
4. **The client refuses pushes against a closed domain row**
   (`syncOutboxV2Repository.js:963–985`).
5. **Devices pull all three domain tables as full snapshots**
   (`childDataRepository.js:28–63`, `replaceAll`), no `server_updated_at`
   cursor; local SQLite mirrors have `id` primary keys only.
6. INSERT/UPDATE policies for `authenticated` exist on all three domain
   tables (`20260504152516:1456–1516`) but are **unused by the shipped
   client** (`offlineSync.js:398–404` documents them as a server-managed
   read cache, never in the outbox) — a reconciliation-vs-EA-direct-insert
   race is theoretical, not a live path.
7. **`classes.staff_id` / `groups.staff_id` are `NOT NULL`**
   (`20260504152507:112, 275`) and no RPC updates them.
8. **Deletion is live**: `storage.js:133–146` → tombstone →
   `DELETE FROM public.staff_children` (`20260729200000:2307–2325`).
9. **Seeds/fixtures dual-write both tables with bare INSERTs**
   (`matrix-fixture.mjs:597/613, 637/663, 718/726`).
10. **SECURITY DEFINER template**: `private.seed_assert_lease()`
    (`20260803120000:518–534`) — `LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = ''`, fully-qualified names. (Note:
    `20260813092000:4–13` is SECURITY **INVOKER** — do not copy it for this
    function.) Function grants follow `REVOKE ALL … FROM PUBLIC, anon,
    authenticated, authenticator; GRANT EXECUTE … TO service_role`
    (`20260813092000:501–504`).
11. **Restore tooling disables triggers** (`session_replication_role =
    'replica'`, `provision-seed-restore.mjs:59`) and the seed/restore stack
    has an **advisory-lease protocol**: `private.seed_assert_lease()`
    (`pg_try_advisory_lock(hashtextextended('zazi:primary:2026:teampact-seed',0))`),
    required by `provision-seed-restore.mjs:56` and the seed control
    functions.
12. **The release harness applies every migration to a bare `template0`
    database** with only `pgcrypto` and hand-rolled `auth` stubs
    (`wave2-combined-postgres-release-harness.cjs:607–620, 1033–1094`).
    No pg_cron exists there → **migrations must contain no `cron.*`
    reference.**
13. **`SET LOCAL statement_timeout` inside a function is inert** — repo
    deviation documented at `20260722120000:9–14`; functions set only
    `lock_timeout`.
14. The sync/grouping RPCs lock **parent first, assignment second, `ORDER BY
    id`, `FOR UPDATE`, under `lock_timeout='4s'`**
    (`20260729200000:6556–6652`; `20260723210000:1480–1580`). A plain
    `INSERT … SELECT` into an assignment table takes FK `FOR KEY SHARE` on
    parents *after* the insert, in scan order — unordered, it can cycle with
    those RPCs.

## Authorization-impact scan (production, 2026-08-13) — now an invariant,
not a measurement

Point-in-time results: child candidates with `created_by` mismatch **0**/854;
candidates whose child already has any domain row **0**; class `created_by`
mismatches **0**/34; group candidates blocked by another active row **0**/40;
multi-claimant children **0**. (`groups` has no `created_by`; its fallback
*is* `staff_id` — identical principal by construction.)

Round-2 adjudication: these zeros describe today, but the job runs forever.
**The neutrality conditions are therefore encoded as `WHERE` predicates in
the reconciliation itself** (below), and rows failing them are *skipped and
counted*, never projected — because `ON CONFLICT … DO NOTHING` would
otherwise pick a nondeterministic winner and permanently extinguish the
losing principal's fallback (fact 1).

## Design (Phase 1: insert-only reconciliation)

One additive migration in `zazi-izandi-app/supabase/migrations/` — function,
run-log table, drift view, and one direct backfill call. **No `cron.*`
statement in the migration** (fact 12); scheduling is a runbook step.

### 1. `private.reconcile_assignment_read_models(p_limit integer DEFAULT 500)`

`LANGUAGE plpgsql`, `SECURITY DEFINER`, owner `postgres`,
`SET search_path = ''`, fully-qualified names, grants per fact 10. Behavior:

1. **Leases — transaction-scoped.** `pg_try_advisory_xact_lock` on its own
   key (`'zazi:primary:2026:assignment-reconciler'`) — if unavailable,
   another run is live (this also serializes the Django-fallback path):
   record a skipped run and return. Then `pg_try_advisory_xact_lock` on the
   seed key (fact 11) — if unavailable, a seed/restore is live: record
   `skipped_seed_lease` and return. Transaction scope (repo precedent:
   `20260813091000:61`, `20260813230000:384`) means rollback or completion
   releases the locks automatically — a crash after acquisition can never
   wedge future runs into permanent `skipped_concurrent` (round-3 finding;
   session-scoped locks survive transaction rollback and would). Advisory
   keys share one keyspace regardless of scope, so the xact-lock attempt
   correctly fails while a seed session holds its session-scoped lease.
   This closes the two round-2 damage paths: a cron firing mid-restore
   (backup row vs fresh projected row → `23505` aborting the restore) and
   mid-wipe resurrection of rows being torn down.
2. **Per-table work, canonical order** (classes → groups → children,
   matching the parent-first spirit of `DOMAIN-LOCK-ORDER`), each statement
   wrapped in its **own `BEGIN … EXCEPTION` subtransaction** so a race on
   one table (`23503`, `23505`, `40P01`, `55P03` — all *expected transient
   outcomes*, converged by the next run) records an error for that table
   without discarding the others' work.
3. Each source SELECT is **`ORDER BY <parent id>` with `LIMIT p_limit`**
   (fact 14: ordering makes the RI `FOR KEY SHARE` acquisitions monotone
   like the RPCs' `ORDER BY id FOR UPDATE`; the cap bounds lock footprint —
   convergence over successive runs is the contract). `SET LOCAL
   lock_timeout = '4s'`; **no in-function `statement_timeout`** (fact 13) —
   wall-clock is bounded by the cron command string.
4. **Projection predicate** (child; groups identical in shape; classes
   noted below). A `staff_children` row `sc` is projected iff:
   - no **active** domain row exists for the pair
     (`existing.unassigned_at IS NULL` filter — see "closed-row rule");
   - **every existing domain row for that child belongs to `sc.staff_id`**
     (no row for a different EA, active or closed) — otherwise counted as
     residual `contested_history`, because projecting would either violate
     the one-active-per-child arbiter or grant access beyond current
     fallback state;
   - the child has **exactly one distinct claimant** in `staff_children` —
     otherwise residual `multi_claimant` (the arbiter would pick a
     nondeterministic winner and kill the loser's fallback);
   - `children.created_by IS NULL OR children.created_by = sc.staff_id` —
     otherwise residual `creator_mismatch` (the creator currently holds
     fallback access the projection would extinguish).
   Classes (pair-scoped arbiter, shared classes legal): pair-active check
   plus `classes.created_by IS NULL OR classes.created_by = staff_id`;
   other EAs' pairs are irrelevant. Groups: same shape as children;
   no `created_by` column exists, so that clause is omitted.
   All residual classes are counted per run and visible in the drift view.
   Today every residual count is zero (scan above).
5. **Closed-row rule (decided).** The pair check filters
   `unassigned_at IS NULL`, so a pair whose only domain row is *closed* but
   whose source row is live is **re-opened** (a new active row is inserted;
   the closed row remains as history). Rationale: Phase 1's contract is
   "domain state converges to live source claims"; a deliberate revocation
   removes the source row (fact 8), so it is never resurrected. Without
   this, "live source + closed row" is an un-healable lockout (facts 1, 4)
   invisible to every counter. Operational corollary, stated for admins:
   **manual revocation = delete the `staff_children` row** (the app's
   tombstone path or SQL); merely closing a domain row while the source
   lives is drift, and the reconciler will undo it.
6. **No archived filters, symmetrically.** A domain row is an authorization
   record, not a roster entry; archival visibility is enforced by consumers
   (`archived_at IS NULL` joins in the RPCs). The drift view must be
   derived from the *same predicate text* as the inserts so its zeros are
   meaningful.
7. **Timestamps.** `assigned_at = LEAST(COALESCE(sc.assigned_at,
   sc.created_at, now()), now())` (clamps device clock skew; sources are
   nullable, targets `NOT NULL`); bookkeeping columns = `now()`;
   `synced = TRUE`. Nothing consumes `server_updated_at` deltas for these
   tables (fact 5 — full-snapshot pulls), so `now()` stamps are safe.
8. **Run log + provenance ledger.** The function writes one row per
   invocation to `private.assignment_reconciliation_runs`
   (started/finished, per-table inserted + residual counts by class, error
   text, `skipped_seed_lease` / `skipped_concurrent` flags), and — round-3
   requirement — appends every inserted row's identity to an immutable
   `private.assignment_reconciliation_ledger` (`run_id`, `table_name`,
   `row_id`, `inserted_at`). The ledger is what makes the migration
   *reversible*: an incident responder can distinguish reconciler-created
   rows from seeded, handover, or manually managed ones. (Precedent:
   `private.seed_run_manifest`, `private.mobile_sync_receipts`.)

### 2. Drift view

`private.assignment_read_model_drift` — per table: `missing_projectable`,
`residual_contested_history` / `residual_multi_claimant` /
`residual_creator_mismatch`, and **`orphaned_active`** (active domain row
whose source row no longer exists). Defined `WITH (security_invoker =
true)` (PG17) plus explicit `REVOKE ALL … FROM PUBLIC, anon, authenticated,
authenticator`.

### 2b. Compensating rollback (round-3 requirement — rollback must be real)

`private.rollback_assignment_reconciliation(p_run_id DEFAULT NULL)`
(SECURITY DEFINER per fact 10, xact-locked like the reconciler): for each
ledger entry (optionally scoped to one run), **delete** the domain row iff
it is *unmodified since insertion* (`server_updated_at` still equals the
ledger's inserted stamp — any later UPDATE, including a Fork-B revocation
closure, bumps it via the existing `BEFORE UPDATE` trigger and the row is
skipped as no-longer-reconciler-owned). Deleting an entity's only rows
restores the pre-deploy legacy fallback exactly (fact 1's `NOT EXISTS`
gate), and the projection predicate guarantees the reconciler only ever
inserted into entities that had no other rows — so full rollback of
unmodified rows is a faithful return to pre-deploy authorization state.
Returns per-table deleted/skipped counts; ledger rows are retained for
audit. Harness-tested before any production backfill (test plan).

### 2c. Independent watchdog (deploy prerequisite — round-3 requirement)

A passive run log cannot notice a deleted cron job, scheduler outage, or
pre-log failure. Before the schedule is enabled: a `public`,
service-role-only health function (fact 10 pattern — PostgREST cannot reach
`private`) returning last-successful-run age plus the drift view's
counters; the **existing nightly Django cron** calls it and raises a
data-quality alert (surfaced on `/pm/data-quality`) when: no successful run
within 3 intervals, any nonzero `residual_*` count, or `orphaned_active`
growth week-over-week. The staleness figure below is thereby an operational
SLO with a monitor, not an assumed bound. (This is the one place a
Django-side change exists: one management-command check calling one RPC —
no sync-path or app changes.)

### 3. Scheduling (runbook step, hosted project only — never in a migration)

After the migration is applied and verified:

```sql
SELECT cron.schedule(
  'reconcile-assignment-read-models',
  '17 * * * *',
  $$SET statement_timeout = '120s'; SELECT private.reconcile_assignment_read_models();$$);
```

Precondition: pg_cron enabled on the pinned ZZ project (no repo precedent —
verify first). Post-check: the job exists in `cron.job` and, after the next
hour, a success row exists in `private.assignment_reconciliation_runs`.
Fallback if pg_cron is unavailable: a service-role RPC wrapper called by the
existing nightly Django cron — safe against overlap because the function's
own advisory lock provides the serialization pg_cron would have.

## Decision required (Jim) — how child projection handles removal

Round-3 adjudication, accepted: v3's "accept retained access until Phase 2"
option is **withdrawn**. After projection, an EA who deliberately removes a
child would have kept server-side read/write access to that child's graph
while the UI implied revocation succeeded — in a child-data system that is
an authorization defect, not a trade-off. Two viable forks remain:

**Fork B (recommended) — child projection + atomic revocation in the
tombstone branch.** The sync RPC's `STAFF_CHILDREN` tombstone branch
(`20260729200000:2307–2325`) already deletes the source row under the
permission gate inside the canonical lock order; a versioned
`CREATE OR REPLACE` migration extends that same transaction to soft-close
the actor's active `child_ea_assignments` row (`unassigned_at = now()`,
`handover_reason = 'assignment_removed'`). Removal then revokes atomically:
the domain row closes, RLS denies, and the removing device's next pull
quarantines the child locally — which is the *intended* outcome of a
deliberate removal (the quarantine/restore machinery exists for exactly
this). Known bounded cost: **re-add after removal** becomes a support case
until Phase 2 — the closed row makes the client refuse the push (fact 4)
and the server gate false (fact 1); runbook: service-role SQL deletes the
child's closed domain rows (ledgered), restoring the fallback, after which
the re-add syncs and the reconciler re-projects. Judged rare (deliberate
removal followed by re-claim of the same child). Blast radius: one hot,
heavily-reviewed RPC changes — it gets its own migration, full harness
rerun, and the round-3-mandated cases (RLS denial post-closure, duplicate
tombstones, mid-transaction rollback, partial-failure recovery).

**Fork A (conservative) — exclude child projection from Phase 1.** Ship
classes + groups only (their sources have no removal path — declaiming is
archival, which consumers already filter — so no revocation gap exists for
them). Zero sync-RPC changes; but the ECD dashboard gap this work exists to
fix is overwhelmingly *children* (854 of 928 rows), so the original problem
stays broken until the full child design ships.

The v1-style alternative (reconciler-written soft-closes) remains rejected —
it re-imports the round-1 quarantine/deadlock chain from outside the sync
transaction where the app cannot reason about it.

## Staleness contract

Server-side visibility (dashboards, RPC counts, chase lists) lags app
reality by up to one cron interval (60 min at the proposed cadence; drop to
`*/15` for the first rollout week if desired, then relax). Device behavior
and RLS access are unaffected during the window — the legacy fallback covers
exactly the rows not yet projected. State this on the User health page's
how-to panel when convenient; it is the answer to "why does a brand-new EA
show 0 for a few minutes."

## Why not triggers (round-1 adjudication; round-2 confirmed resolved)

1. The sync path resolves to `ON CONFLICT … DO UPDATE` — INSERT/DELETE
   triggers are blind to it (fact 3).
2. Soft-close-on-delete is irreversible revocation: kills the RLS fallback
   (fact 1), quarantines device data (fact 2), and the client refuses the
   healing push (fact 4).
3. Seed fixtures bare-INSERT both tables → `23505` under triggers (fact 9).
4. Trigger locks land mid-RPC, outside `DOMAIN-LOCK-ORDER`, under a
   statement whose `ROW_COUNT` is a permission gate (facts 3, 14).
5. Restore tooling disables triggers (`replica`), silently reopening drift
   (fact 11).

State-based reconciliation has none of these; each round-2 hardening
(leases, WHERE-encoded invariants, ordered bounded scans, subtransactions,
run log) keeps it that way.

## Effects on consumers (accepted, to be communicated)

- Server-data counts jump on deploy for user-health v2, grouping and
  letter-mastery RPCs, and the per-EA profile pages. Intended; brief the
  team. School filters unaffected until the separate ECD roster fix.
- Devices receive the new **active** rows on their next full-snapshot pull —
  same principal, no revocation evidence. Round-2 addition: the pull's
  `replaceAll` runs a per-child restoration sweep
  (`childrenRepository.js:709–733` → `childRevocationRepository.js:757–797`)
  that is currently a no-op for the affected EAs and becomes O(children)
  SQLite statements per cycle. Expected to be negligible at ≤33 children
  per EA, but **measure one ECD device's sync-cycle duration before/after
  deploy** rather than asserting it.
- No triggers are installed on any table the sync RPCs write; their
  `GET DIAGNOSTICS` gates are untouched.

## Test plan (postgres behavioral harness, repo pattern)

Happy path: (1) fresh source rows in all three sources → one run inserts
active rows with clamped non-null timestamps; (2) immediate re-run → zero
inserts; (3) NULL source timestamps → `COALESCE` lands; future-dated →
clamped; (4) seed-style dual-write then reconcile → no dupes, no errors;
(5) RLS regression: fallback-only fixture EA passes the helper checks
before and after (children/classes/groups) — authorization-neutrality;
(6) end-to-end: v2 RPC returns non-zero counts for an ECD-shaped fixture EA.

Round-2 additions: (7) multi-claimant child → both skipped, residual
`multi_claimant` counted, nothing inserted; (8) `created_by` mismatch →
skipped + counted; (9) closed row for the pair + live source → re-opened
(new active row, closed row untouched); closed row for a *different* EA →
`contested_history`, not projected; (10) run while the seed advisory lease
is held → `skipped_seed_lease`, zero writes; concurrent second invocation →
`skipped_concurrent`; (11) release harness applies the migration to its
bare `template0` database (proves no `cron.*` in the migration); (12)
`p_limit` batching converges over successive runs; (13) function EXECUTE
denied to `authenticated`/`anon`; drift view unreadable by `authenticated`;
(14) sync upsert path still returns `ROW_COUNT = 1` (no trigger crept in).

Round-3 additions: (15) ledger records every inserted row; compensating
rollback deletes unmodified reconciler rows, skips modified ones, restores
the legacy fallback (helper returns TRUE again for the fallback-only
fixture EA), and reports counts; rollback is idempotent; (16) injected
failure after lock acquisition (two connections) → transaction rollback
frees the xact locks and a fresh invocation immediately acquires and
reconciles; (17) Fork B tombstone atomicity: removal closes the domain row
and deletes the source in one transaction — RLS denies the removed EA
afterwards; duplicate tombstone replays are idempotent; mid-transaction
rollback leaves both rows consistent; re-add-after-removal reproduces the
documented client refusal and the runbook SQL restores the fallback; (18)
watchdog: a deleted cron job / stale last-success is detected by the health
function and surfaces the alert condition.

## Deploy

1. Harness green (includes the new cases; the harness itself proves fact 12
   compliance).
2. Record the decision above (unassignment behavior) — deploy is gated on
   it.
3. Apply the migration (timestamp coordinated with any in-flight app-repo
   migrations); its final statement calls the function with
   `p_limit => NULL` — that call *is* the catch-up backfill (854+34+40).
4. Post-apply (read-only): drift view all zeros; run-log row present; the
   two known ECD EAs show classes/children in the v2 RPC and on the User
   health page.
5. Runbook: enable/verify pg_cron, `cron.schedule`, verify `cron.job` row
   and the next run's log entry.
6. Announce the Server Data jump; note the staleness contract.
7. Rollback (now real, per round 3): `cron.unschedule` halts scheduling;
   `private.rollback_assignment_reconciliation()` reverses the data plane —
   ledgered, unmodified reconciler rows are deleted, restoring the legacy
   fallback exactly; modified rows (e.g. Fork-B closures) are skipped and
   reported. Part B's v1/v2 RPC rollback story is unaffected.

## Open questions for round 4

1. Fork A vs Fork B (see Decision section) — Jim's call; deploy is gated on
   it. The rest of the design is identical under either fork.
2. Cadence: hourly steady-state with `*/15` for the first rollout week?
3. Seed-fixture hardening (`ON CONFLICT` in `matrix-fixture.mjs` and seed
   SQL): agreed as mandatory before Phase 2 — schedule now or with Phase 2?
