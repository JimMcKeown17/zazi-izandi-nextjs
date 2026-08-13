# Assignment Read-Model Projection — Design Spec

_Drafted 2026-08-13. Status: DRAFT for adversarial review. Target repo:
`zazi-izandi-app` (Supabase migrations only). No mobile-app, Django, or
frontend changes._

## Problem

The domain read-model tables `child_ea_assignments`, `class_ea_assignments`,
and `group_ea_assignments` were introduced by the 2026-05-04 refactor
(`20260504152516_sqlite_refactor_domain_schema.sql`) with a **one-time**
`INSERT … SELECT … ON CONFLICT DO NOTHING` copy from the mobile-writable
sources — and no ongoing projection. Every assignment written since then
reaches the sources and stops there. The TeamPact seed writes both sources
and read models, which masked the gap for seeded cohorts until self-setup
EAs arrived.

Measured drift (production, read-only queries, 2026-08-13):

| Read model | Missing rows | EAs affected | Source of truth |
|---|---|---|---|
| `child_ea_assignments` | 854 | 35 (incl. seeded EAs' in-app additions) | `staff_children` |
| `class_ea_assignments` | 34 active classes | 33 | `classes.staff_id` |
| `group_ea_assignments` | 40 active groups | 8 | `groups.staff_id` |

Consequences today: the user-health v2 RPC reports 0/0/0/0 server data for
the entire ZZ ECD 2026 wave (22 of 27 EAs have really created children), and
every other consumer of the read models undercounts. Drift grows
monotonically.

Backfill conflict scan (production, 2026-08-13): **zero** missing
`staff_children` rows collide with another EA's active read-model row, and
**zero** children are claimed by multiple EAs in `staff_children`. The
catch-up backfill is pure insertion under today's data.

## Verified architecture facts (do not re-litigate; sources cited)

1. `staff_children` is the canonical mobile-writable child↔EA assignment:
   app RLS allows SELECT/INSERT/DELETE (no UPDATE) scoped to
   `staff_id = auth.uid()`; unique `(staff_id, child_id)`
   (`20260504152507_zazi_initial_schema.sql`).
2. `offlineSync.js` documents the read model as *"a server-managed READ
   cache (never pushed up, never in the outbox)"* and `staff_children` as
   *"the mobile-writable assignment that syncs upward."* The sync wire
   contract (`syncWireServerTypes.json`) pushes `classes`, `children`,
   `staff_children`, `groups`, `children_groups`, `sessions`, `assessments`.
3. The app still writes `staff_id` on `classes` and `groups`
   (`classesRepository.js`, `groupsRepository.js`).
4. The app has a revocation flow (`childRevocationRepository.js`,
   `'explicit_assignment_end'`) that DELETEs `staff_children` rows — so
   deletion is a live path, not hypothetical.
5. Read-model uniqueness invariants (`20260504152516`):
   - `child_ea_assignments`: **one active row per child**
     (`idx_child_ea_one_active` UNIQUE `(child_id)` WHERE
     `unassigned_at IS NULL`) — matches the programme rule that Zazi
     children are not shared between EAs; transfers happen only on EA
     replacement or school moves.
   - `class_ea_assignments`: one active row per `(class_id, ea_user_id)`
     **pair** — a class may be visible to multiple EAs.
   - `group_ea_assignments`: **one active row per group**
     (`idx_group_ea_one_active`).
   - All three carry `unassigned_at`, `handover_reason`, and a CHECK
     `assigned_at <= unassigned_at`.
6. Devices pull the read models during bootstrap (`CRITICAL_PULL_LABELS`)
   and incrementally via the `server_updated_at` sync-timestamp contract
   (`20260729200000_wave2b_sync_timestamp_contract.sql`), so projected rows
   and soft-closes will propagate down to devices. `BEFORE UPDATE` triggers
   already maintain `server_updated_at` on all three tables.
7. The TeamPact seed writes **both** `staff_children` and the read models,
   so the projection must be idempotent against rows the seed already
   created.

## Goals

- Read models become continuously correct: every source write is reflected
  without app, Django, or RPC changes.
- History is preserved: unassignment soft-closes (`unassigned_at`), never
  deletes — supporting future "who taught this child in March" attribution.
- One-time catch-up backfill erases the measured drift.
- Idempotent under sync retries, seed re-runs, and migration re-application.

## Non-goals

- No change to `staff_children` semantics or the app's write paths.
- No RPC changes (the read models stay the single query surface).
- Not fixing ECD roster `school_id` / expectation classification (separate
  roadmap item).
- No retroactive reconstruction of pre-2026-08-13 unassignment history
  (hard-deleted `staff_children` rows are gone; history begins at deploy).

## Design

One additive migration containing three `SECURITY DEFINER` trigger
functions (owner `postgres`, `SET search_path = pg_catalog, public`,
`EXECUTE` revoked from `public`/`anon`/`authenticated` per the
`20260504184402_restrict_security_definer_execute.sql` convention), the
triggers, then the catch-up backfill — triggers installed **before** the
backfill in the same transaction so no write can fall in a gap.

### 1. `staff_children` → `child_ea_assignments`

`AFTER INSERT` per row:

- Active row for `(child_id, staff_id)` exists → no-op (seed/retry
  idempotency).
- Active row for the child under a **different** EA exists → handover:
  `UPDATE … SET unassigned_at = GREATEST(assigned_at, NEW.assigned_at),
  handover_reason = 'projected_handover'`, then insert the new active row.
  (`GREATEST` guards the date CHECK against out-of-order device clocks.)
- Otherwise insert an active row with
  `assigned_at = COALESCE(NEW.assigned_at, NEW.created_at, now())`,
  `synced = TRUE`.
- The insert uses `ON CONFLICT (child_id) WHERE unassigned_at IS NULL DO
  NOTHING` (partial-index arbiter) so a concurrent claimant cannot raise.

`AFTER DELETE` per row: soft-close the active `(child_id, staff_id)` row —
`unassigned_at = GREATEST(assigned_at, now())`,
`handover_reason = 'assignment_removed'`. No-op when absent. Never delete.

### 2. `classes.staff_id` → `class_ea_assignments`

- `AFTER INSERT` when `staff_id IS NOT NULL`: ensure the active pair row,
  `ON CONFLICT (class_id, ea_user_id) WHERE unassigned_at IS NULL DO
  NOTHING`.
- `AFTER UPDATE OF staff_id`: when it changes, soft-close only the
  `(class_id, OLD.staff_id)` pair (`handover_reason =
  'owner_changed'`) and ensure the new pair. Rows for co-teaching EAs
  created by the seed are untouched — the projection only manages pairs it
  would itself create.
- Class archival (`archived_at`) needs no projection action: every read-side
  consumer already joins with `archived_at IS NULL`.

### 3. `groups.staff_id` → `group_ea_assignments`

Same shape as children (one-active-per-group): `AFTER INSERT` ensures the
active row with the handover rule; `AFTER UPDATE OF staff_id` soft-closes
the previous owner's row and opens the new one. `ON CONFLICT (group_id)
WHERE unassigned_at IS NULL DO NOTHING`.

### 4. Catch-up backfill (same migration, after triggers)

Three idempotent `INSERT … SELECT` statements mirroring the refactor's
originals, restricted to missing rows and using each table's partial unique
index as the conflict arbiter; `assigned_at` comes from the source row
(`staff_children.assigned_at` / `created_at`), `synced = TRUE`. Measured
sizes (854 + 34 + 40) make this a trivial single-transaction operation.
Because the conflict scan found zero contested children, no handover replay
is needed; the `ON CONFLICT` clauses are pure safety against mid-deploy
writes.

## Interactions and accepted effects

- **Numbers jump on deploy.** All read-model consumers — user-health v2
  server data, grouping and letter-mastery RPCs, the in-flight per-EA
  profile RPC — gain the backfilled rows at once. This is the intended
  effect; brief the team so it reads as the fix, not a glitch. School
  filtering is unaffected meanwhile (ECD roster rows have no `school_id`
  until the separate roster fix).
- **Device pull-down.** Soft-closes bump `server_updated_at`, so devices
  incrementally pull closures of rows they hold in the read cache. The app
  treats these tables as read-only cache; local `staff_children` remains
  its operating truth, so no behavior change — but the harness must confirm
  closed rows don't violate any local uniqueness on re-pull.
- **Seed compatibility.** Seeds keep writing both tables; the trigger's
  same-pair no-op and conflict arbiters make dual writes converge. A future
  simplification (seed writes sources only and lets the projection
  materialize) is possible but out of scope.
- **RLS.** Trigger functions run as `postgres` (table owner, RLS not
  forced), so EA-initiated writes can maintain read-model rows the EA could
  not touch directly. Read policies on the read models are unchanged.
- **Rollback.** Dropping the triggers halts projection instantly; the
  backfilled rows are correct domain data and stay (no data rollback
  needed). The v1/v2 RPC rollback story from Part B is unaffected.

## Test plan (postgres behavioral harness, repo pattern)

Cases, each asserting read-model state and invariant indexes:

1. Insert new `staff_children` row → active read-model row created, correct
   `assigned_at`.
2. Re-insert same pair (sync retry / seed overlap) → no duplicate, no error.
3. Insert for a child actively held by another EA → old row soft-closed
   with `projected_handover`, new row active, one-active invariant holds,
   date CHECK holds even with `NEW.assigned_at` earlier than the old
   `assigned_at`.
4. Delete `staff_children` row → soft-close with `assignment_removed`;
   delete of a pair with no active row → no-op.
5. Class insert with `staff_id`; class `staff_id` change → old pair closed,
   new pair active; seeded co-teacher pair untouched.
6. Group insert; group `staff_id` change → handover semantics.
7. Backfill idempotency: run the backfill statements twice → second run
   inserts zero rows.
8. End-to-end: after backfill, `mobile_user_health_domain_v2` returns
   non-zero classes/children for a fixture ECD-shaped EA.
9. RLS: an `authenticated` EA still cannot INSERT/UPDATE the read models
   directly; inserting into `staff_children` as that EA succeeds and the
   projection lands.

## Deploy

1. Behavioral harness green locally against a shadow database.
2. Apply the single additive migration to the pinned ZZ project via the
   established migration flow; coordinate the timestamp with the
   `feat/ea-profile-rpc` branch's pending migrations.
3. Post-apply verification (read-only): drift queries return zero missing
   rows for all three read models; spot-check the two known ECD EAs in the
   v2 RPC output; confirm the User health page shows their classes/children.
4. Announce the expected jump in Server Data numbers to the team.

## Open questions for review

1. `handover_reason` vocabulary: are `projected_handover` /
   `assignment_removed` / `owner_changed` the right terms, or should they
   align with the app's revocation-reason strings (e.g.
   `explicit_assignment_end`)?
2. Should the child-insert handover also fire when the existing active row
   was seed-written for a *different* EA (current answer: yes — latest
   mobile write wins the active slot), or should seed rows be privileged?
3. Do any grouping flows reassign `groups.staff_id` in practice, or is the
   `UPDATE OF staff_id` trigger purely defensive?
