# Assignment Read-Model Reconciliation — Design Spec (v2)

_Drafted 2026-08-13; v2 after adversarial review round 1 (17 findings, all
adjudicated and verified against code — the round-1 trigger/soft-close design
is withdrawn, see "Why not triggers"). Status: DRAFT for review round 2.
Target repo: `zazi-izandi-app` (Supabase migrations only). No mobile-app,
Django, or frontend changes._

## Problem

The domain tables `child_ea_assignments`, `class_ea_assignments`, and
`group_ea_assignments` were introduced by the 2026-05-04 refactor
(`20260504152516_sqlite_refactor_domain_schema.sql`) with a **one-time**
`INSERT … SELECT … ON CONFLICT DO NOTHING` copy from the mobile-writable
sources and no ongoing maintenance. Every assignment written since reaches
the sources (`staff_children`, `classes.staff_id`, `groups.staff_id`) and
stops there. The TeamPact seed writes both sources and domain tables, which
masked the gap for seeded cohorts until self-setup EAs arrived.

Measured drift (production, read-only, 2026-08-13):

| Domain table | Missing rows | EAs affected | Source of truth |
|---|---|---|---|
| `child_ea_assignments` | 854 | 35 (incl. seeded EAs' in-app additions) | `staff_children` |
| `class_ea_assignments` | 34 active classes | 33 | `classes.staff_id` |
| `group_ea_assignments` | 40 active groups | 8 | `groups.staff_id` |

Consequence: the user-health v2 RPC reports 0/0/0/0 server data for the
whole ZZ ECD 2026 wave (22 of 27 EAs have really created children); every
other consumer of these tables undercounts; drift grows monotonically.

## Corrected architecture facts (verified in code and production; round-1
findings incorporated — do not weaken these)

1. **These are not read caches — they are the authorization substrate.**
   `current_user_can_write_child` / `_access_child` / class / group helpers
   (`20260504152516:999–1160`, twins in `20260504184402`) grant via an
   **active** domain row, else fall back to legacy evidence
   (`staff_children` / `children.created_by` for children;
   `classes.created_by` for classes; `groups.staff_id` for groups) — but the
   fallback is gated on `NOT EXISTS (… any domain row for the entity …)`,
   **not** filtered by `unassigned_at`. Writing any row, active or closed,
   permanently disables the fallback for that entity.
2. **`unassigned_at` is a revocation instruction, not history bookkeeping.**
   `mergeServerRows.js:53–63, 371–372` treats a pulled row with
   `unassigned_at` as `'explicit_assignment_end'` evidence and quarantines
   the entity's entire local graph (`pull_drop_quarantine`, tier
   `'revoked'`, `childRevocationRepository.js` — which is the *inbound
   consumer* of these signals, not a delete path).
3. **`staff_children` is written via upsert, and UPDATE is a live path.**
   RLS on `staff_children` was rewritten by `20260504152516:1282–1352` to
   SELECT/INSERT/**UPDATE**/DELETE. The server sync write is
   `INSERT … ON CONFLICT (staff_id, child_id) DO UPDATE`
   (`20260729200000:2279–2296`), gated on `current_user_can_write_child`
   with a `GET DIAGNOSTICS ROW_COUNT` permission check. Row-level
   INSERT/DELETE triggers cannot see the DO UPDATE resolution.
4. **The client refuses pushes against a closed domain row.**
   `syncOutboxV2Repository.js:964–989` throws
   `'…normalized assignment is inactive'` when confirmed local evidence is a
   closed row — so a server-side soft-close cannot be healed by the app,
   and per fact 1 the server gate goes permanently false too.
5. **Devices pull all three domain tables as full snapshots** (`.eq('ea_user_id',
   userId)` + `replaceAll`, `childDataRepository.js:28–63`), not via a
   `server_updated_at` cursor. Local SQLite mirrors have `id` primary keys
   only — no active-row uniqueness to violate.
6. **EAs can write their own domain rows** — INSERT/UPDATE policies exist
   for `authenticated` on all three tables (`20260504152516:1456–1515`),
   gated on `ea_user_id = auth.uid()` plus the helper.
7. **`classes.staff_id` and `groups.staff_id` are `NOT NULL`**
   (`20260504152507:112, 275`) and no RPC ever updates them
   (`20260729200000:7296–7360`; `20260723200000:811–859`).
8. **Deletion is live**: `storage.js:135–147` (`deleteStaffChild`) →
   tombstone descriptor → server DELETE branch
   (`20260729200000:2307–2325`).
9. **Seeds and fixtures dual-write both tables with bare INSERTs**
   (`scripts/seed-verification/matrix-fixture.mjs:597/613, 637/663,
   718/726`; seed writer role is `NOLOGIN BYPASSRLS`, not table owner).
10. **Repo convention for SECURITY DEFINER**: `SET search_path = ''` with
    fully-qualified names, `REVOKE ALL … FROM PUBLIC, anon, authenticated,
    authenticator` (`20260813092000:13, 501–504`). (Older helpers use
    `public, pg_temp`; new code follows the strict form.)
11. **Restore tooling disables triggers wholesale**
    (`session_replication_role = 'replica'`,
    `scripts/provision-seed-restore.mjs:59`).

## Authorization-impact scan (production, read-only, 2026-08-13)

For every backfill candidate, the principal who would gain the active domain
row was compared against every principal currently authorized through the
fallback:

- Child candidates where `children.created_by` differs from the
  `staff_children` claimant: **0** of 854.
- Child candidates whose child already has *any* domain row: **0**.
- Class candidates where `classes.created_by` differs from
  `classes.staff_id`: **0** of 34.
- Group candidates blocked by another EA's active row: **0** of 40
  (`groups` has no `created_by`; its fallback *is* `staff_id`, so the
  principal is identical by construction).
- Children claimed by multiple EAs in `staff_children`: **0**.

Conclusion: the backfill is **authorization-neutral** — every insert moves
the exact same principal from the fallback branch to the primary branch,
and no device receives any revocation signal (no `unassigned_at` is ever
written).

## Design (Phase 1: insert-only reconciliation — this spec)

One additive migration in `zazi-izandi-app/supabase/migrations/`:

### 1. `private.reconcile_assignment_read_models()`

A `SECURITY DEFINER` function, owner `postgres`, `SET search_path = ''`,
fully-qualified names, `REVOKE ALL` per convention (fact 10). Body: three
idempotent statements, executed in the repo's canonical
`DOMAIN-LOCK-ORDER` (`20260729200000:6556`): classes →
`class_ea_assignments` → groups → `group_ea_assignments` → children →
`child_ea_assignments`. Each is shaped:

```sql
INSERT INTO public.child_ea_assignments
  (child_id, ea_user_id, assigned_at, synced, created_at, updated_at, server_updated_at)
SELECT
  sc.child_id,
  sc.staff_id,
  LEAST(COALESCE(sc.assigned_at, sc.created_at, pg_catalog.now()), pg_catalog.now()),
  TRUE,
  pg_catalog.now(), pg_catalog.now(), pg_catalog.now()
FROM public.staff_children AS sc
WHERE sc.staff_id IS NOT NULL AND sc.child_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.child_ea_assignments AS existing
    WHERE existing.child_id = sc.child_id
      AND existing.ea_user_id = sc.staff_id)
ON CONFLICT (child_id) WHERE unassigned_at IS NULL DO NOTHING;
```

(the class statement arbitrates on `(class_id, ea_user_id) WHERE
unassigned_at IS NULL`, the group statement on `(group_id) WHERE
unassigned_at IS NULL`; class/group sources are `classes.staff_id` /
`groups.staff_id` with `archived_at IS NULL`).

Hard invariants, asserted by the harness:

- **Insert-only.** The function never UPDATEs, never DELETEs, and never
  writes `unassigned_at` or `handover_reason`. It therefore cannot revoke
  access (fact 1), cannot emit quarantine signals (fact 2), and cannot
  create the client push deadlock (fact 4).
- **State-based, not event-based.** Each run converges current source state
  into the domain tables, so writes that arrive as upsert-UPDATEs (fact 3),
  seed writes, and restores done under `replica` mode (fact 11) are all
  covered by the next run — there is no event stream to miss.
- `LEAST(…, now())` clamps device-supplied future timestamps;
  `COALESCE` covers `staff_children`'s nullable `assigned_at`/`created_at`
  (the target columns are `NOT NULL`).
- The function returns a row of counters: inserted per table + residual
  unprojectable rows (source rows whose target holds an active row for a
  different principal — currently 0; they are surfaced, never forced).
- `SET LOCAL lock_timeout` and `statement_timeout` inside the function;
  row counts are small and transactions short, so ordinary row locks in
  canonical order cannot deadlock the sync RPCs.

### 2. Drift visibility

`private.assignment_read_model_drift` view returning, per table: missing
count and blocked-by-other-active count — the same queries used for the
production measurements above. Post-deploy assertion: all zeros. This view
is also the permanent monitor that this class of bug can never again go
unnoticed for three months.

### 3. Scheduling + initial backfill

- The migration ends with one direct call to the function — that call *is*
  the catch-up backfill (854 + 34 + 40 rows, trivial).
- Ongoing runs via `pg_cron`: `cron.schedule('reconcile-assignment-read-models',
  '17 * * * *', $$SELECT private.reconcile_assignment_read_models();$$)` —
  hourly, offset from the hour to avoid thundering-herd minutes. pg_cron
  runs a named job serially, so runs cannot overlap.
- **Deploy precondition:** confirm the `pg_cron` extension is enabled on
  the pinned ZZ project before applying (it is available on Supabase but
  not yet used by this repo — no `cron.schedule` precedent in migrations).
  Fallback if unavailable: expose a service-role-only RPC wrapper and call
  it from the existing nightly Django cron; hourly pg_cron is preferred.

## Why not triggers (round-1 adjudication — recorded so it is not re-proposed)

The v1 design (projection triggers + soft-close on delete) is withdrawn:

1. The sync path resolves to `ON CONFLICT … DO UPDATE`; INSERT/DELETE
   triggers are blind to it (fact 3).
2. Soft-closing on delete is an **irreversible revocation**: any domain row
   kills the RLS fallback (fact 1), the pulled `unassigned_at` quarantines
   the device's local graph (fact 2), and the client then refuses the
   re-add push (fact 4) — a deadlock requiring app changes to escape.
3. Seed fixtures bare-INSERT both tables; a trigger-created row makes them
   raise `23505` (fact 9).
4. Trigger-acquired locks land mid-`mobile_sync_child_bundle`, outside the
   canonical lock order, and nest SPI writes under a statement whose
   `GET DIAGNOSTICS ROW_COUNT` is a permission gate (fact 3).
5. Restore tooling disables triggers (`replica` mode), silently reopening
   drift (fact 11).

A state-based reconciliation has none of these failure modes; the trigger
approach would need every one of them individually engineered around.

## Phase 2 (explicitly deferred; separate spec, requires app changes)

Unassignment/handover projection — making a `staff_children` DELETE (or a
future explicit transfer flow) produce domain-row soft-closes. This
requires, at minimum: the client push gate learning to reopen closed rows
(`syncOutboxV2Repository.js:964–989`), a decision on `handover_reason`
vocabulary (must not collide with the app's local `'explicit_assignment_end'`
quarantine reason) plus a CHECK constraint, seed/fixture hardening
(`ON CONFLICT` clauses in `matrix-fixture.mjs` and seed SQL), and a
deliberate design for the revocation/quarantine UX. Until then,
unassignments simply leave the domain row active — exactly today's behavior
for the seeded cohort, no worse — and the drift view quantifies any
divergence.

## Effects on consumers (accepted, to be communicated)

- Server-data counts jump on deploy for user-health v2, grouping and
  letter-mastery RPCs, and the in-flight per-EA profile RPC. Intended;
  brief the team so it reads as the fix. School filters are unaffected
  until the separate ECD roster fix lands.
- Devices receive the new **active** rows on their next full-snapshot pull —
  same principal, no revocation evidence, no quarantine path (facts 2, 5),
  and no local uniqueness to violate (fact 5).
- The sync RPC's `GET DIAGNOSTICS` gates are untouched — no triggers are
  installed on any table it writes.

## Test plan (postgres behavioral harness, repo pattern)

1. Fresh `staff_children` / `classes` / `groups` rows → one reconciliation
   run inserts the expected active rows with clamped, non-null timestamps.
2. Immediate re-run → zero inserts (idempotent).
3. Source rows with NULL `assigned_at`/`created_at` → `COALESCE` lands
   `NOT NULL` targets; future-dated source timestamps → clamped to `now()`.
4. Target entity holding an active row for a *different* EA → skipped, and
   the drift view reports it (never forced, never closed).
5. Seed-style dual-write (bare INSERT into source and domain tables, seed
   ordering) followed by reconciliation → no duplicates, no errors.
6. RLS regression: for a fixture EA whose access is fallback-only, the
   helper functions return TRUE before and after reconciliation (children,
   classes, groups) — authorization-neutrality.
7. `authenticated` EA still cannot write another EA's domain rows; the
   reconciliation function runs as owner regardless of caller RLS.
8. Sync upsert path (`DO UPDATE`) still returns `ROW_COUNT = 1` (guard that
   no trigger crept in).
9. End-to-end: after reconciliation, `mobile_user_health_domain_v2` returns
   non-zero classes/children for an ECD-shaped fixture EA.
10. Function is callable only by owner/service role (`REVOKE` verified).

## Deploy

1. Harness green against a shadow database.
2. Confirm `pg_cron` availability on the pinned ZZ project.
3. Apply the migration (timestamp coordinated with the in-flight
   `feat/ea-profile-rpc` migrations); its final statement performs the
   backfill.
4. Post-apply (read-only): drift view all zeros; the two known ECD EAs show
   classes/children in the v2 RPC and on the User health page.
5. Announce the expected Server Data jump.
6. Rollback: `cron.unschedule` + `DROP FUNCTION`; inserted rows are correct
   domain data and remain (no data rollback needed). The Part B v1/v2 RPC
   rollback story is unaffected.

## Open questions for review round 2

1. Cadence: is hourly right, or should the first week run every 15 minutes
   while the ECD wave is hot, then relax?
2. Should the drift view (or its counts) be surfaced to Django/user-health
   as an operational metric, rather than living as a SQL-only check?
3. Seed hardening (`ON CONFLICT` in `matrix-fixture.mjs` and seed SQL):
   optional now, mandatory before Phase 2 — confirm sequencing.
