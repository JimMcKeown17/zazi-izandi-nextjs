# Handoff — Assignment Read-Model Reconciliation (for a fresh Codex session)

_Written 2026-08-14 at the end of a Claude session (token budget exhausted).
You are picking this up with none of that session's context. Read this top
to bottom before doing anything. Nothing has been implemented — the
deliverable so far is a design spec that has NOT yet passed adversarial
review. Your mission is defined at the end._

## 1. The problem, from zero

The Mobile App Operations "User health" dashboard
(zazi-izandi.co.za/mobile-app/user-health) showed EAs with 13–17
app-captured assessments but **0 classes · 0 children · 0 groups** in the
Server Data column. Root cause, established with code reading plus
read-only production queries (2026-08-13, Supabase project
`yaclyyurdwarhmiheojr`):

- The mobile app (offline-first, sync outbox) writes assignments to
  **`staff_children`** (child↔EA), and ownership to **`classes.staff_id`**
  and **`groups.staff_id`**. These sync upward correctly — the app is not
  at fault.
- The domain tables **`child_ea_assignments` / `class_ea_assignments` /
  `group_ea_assignments`** were created by the 2026-05-04 refactor
  migration (`20260504152516_sqlite_refactor_domain_schema.sql`) with a
  **one-time** `INSERT…SELECT…ON CONFLICT DO NOTHING` copy from those
  sources — and **nothing maintains them since**. Every assignment written
  after 2026-05-04 reaches the sources and stops.
- The TeamPact seed writes **both** sources and domain tables, which masked
  the gap for the seeded cohort until self-setup (ECD) EAs arrived.
- Measured drift (2026-08-13, read-only): **854 missing child assignments
  across 35 EAs** (including seeded EAs' post-seed in-app additions — not
  ECD-specific, grows daily), **34 active classes / 33 EAs**, **40 active
  groups / 8 EAs**. 0 of the 27 "ZZ ECD 2026" rollout-wave members have any
  domain row; 22 of 27 have genuinely created children in-app.
- Consequence: the `mobile_user_health_domain_v2` RPC (and every other
  consumer of the domain tables, including the newly shipped per-EA profile
  pages) undercounts all of it. The ECD cohort renders as if nobody has
  done anything, when adoption is actually strong.

**The critical discovery that shaped everything:** these domain tables are
NOT read caches. They are the **RLS authorization substrate**. The
`current_user_can_write_child` / `_access_child` / class / group helpers
(`20260504152516:999–1169`) grant via an *active* domain row, else fall
back to legacy evidence (`staff_children` / `children.created_by` /
`classes.created_by` / `groups.staff_id`) — but that fallback is gated on
`NOT EXISTS(any domain row for the entity)`, not filtered by
`unassigned_at`. Writing any row — active or closed — permanently kills the
fallback for that entity. Additionally, a pulled row with `unassigned_at`
set is the app's **revocation signal**: the device quarantines that
child's entire local graph (`mergeServerRows.js:53–63, 371–372`;
`pull_drop_quarantine`, tier `'revoked'`). Naive fixes are therefore
authorization changes with device-side consequences. Verify all of this
yourself — do not take it from me.

## 2. Repo and environment map

- **App repo (all implementation happens here):**
  `/Users/jimmckeown/Development/zazi-izandi-app` — Expo app +
  `supabase/migrations/`. Key files: migrations
  `20260504152507_zazi_initial_schema.sql`,
  `20260504152516_sqlite_refactor_domain_schema.sql`,
  `20260504184402_restrict_security_definer_execute.sql`,
  `20260729200000_wave2b_sync_timestamp_contract.sql` (the hot sync RPC —
  tombstone branch at ~2307–2325, upsert branch ~2279–2296, canonical
  DOMAIN-LOCK-ORDER ~6556),
  `20260803120000_teampact_seed_bridge_and_manifest.sql` (advisory seed
  lease `private.seed_assert_lease` at ~518–534); app source
  `src/services/offlineSync.js`, `src/db/repositories/`
  (`syncOutboxV2Repository.js` — client push gate ~963–989,
  `mergeServerRows.js`, `childRevocationRepository.js`,
  `childDataRepository.js`), `src/utils/storage.js` (delete path ~133–146);
  scripts `wave2-combined-postgres-release-harness.cjs` (applies EVERY
  migration to a bare template0 DB — **no `cron.*` may appear in a
  migration**), `seed-verification/matrix-fixture.mjs`,
  `provision-seed-restore.mjs`.
- **Website repo (spec/roadmap/docs live here, on `main`):**
  `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs`
  (note: the *inner* folder is the repo). This handoff, the spec, and
  `documentation/roadmap.md` + `documentation/build-log.md` are here.
- **Django repo (only the watchdog check touches it):**
  `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025` (nightly cron
  lives there).
- **Read-only production access** (for verification only; no writes without
  Jim's deploy approval): `psql` at `/opt/homebrew/opt/libpq/bin/psql`,
  password in the app repo's `.env` (`SUPABASE_DB_PASSWORD`), pooler
  `postgresql://postgres.yaclyyurdwarhmiheojr@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`.
  Always set `PGOPTIONS="-c default_transaction_read_only=on"` for
  measurements.

## 3. The design spec and its review history

**Spec:** `docs/superpowers/specs/2026-08-13-assignment-projection-design.md`
(v4) in the website repo, on `main`.

Review history (three adversarial rounds ran against earlier versions; each
was adjudicated — claims verified against code — before revising):

- **Round 1 (17 findings)** killed the v1 design (projection triggers +
  soft-close-on-delete): the tables are the RLS substrate; `unassigned_at`
  is a revocation signal; `staff_children` is written via
  `ON CONFLICT…DO UPDATE` which row triggers can't see; seed fixtures
  bare-INSERT both tables (would 23505 under triggers); restore tooling
  disables triggers (`session_replication_role='replica'`).
- **Round 2 (15 findings, REVISE)** hardened the replacement (insert-only
  reconciliation): neutrality guards moved into the SQL `WHERE` (not a
  point-in-time scan), advisory leases, `ORDER BY`+`LIMIT` scans matching
  the RPCs' lock discipline, per-table subtransactions, run log, cron
  scheduling moved out of the migration, `plpgsql` + `lock_timeout` only.
- **Round 3 (Codex, NO-SHIP, 4 findings)** forced v4: the "accept retained
  access until Phase 2" trade-off was withdrawn as an authorization defect;
  a provenance ledger + tested compensating rollback was added (before
  that, the migration was irreversible); advisory locks became
  transaction-scoped; an independent watchdog became a deploy prerequisite.

**⚠️ v4 itself has NOT passed adversarial review.** A round-4 Codex review
was in flight when this session ended, and its interim log already flagged
"a concrete NO-SHIP contradiction is emerging" (suspected area: the
interaction between the reconciler's closed-row re-open rule, the Fork B
tombstone closure, and the client-side push gate — check whether re-opening
on live source evidence can resurrect access that a Fork B revocation just
removed, and whether the drift/rollback machinery is coherent under Fork
B). Its output, if it survived, is at
`/private/tmp/claude-501/-Users-jimmckeown-Development-zazi-mobile-clock-reporting-nextjs/1a56206f-e1d6-4e6e-9906-acc62c34849b/tasks/bnpvwd6i4.output`
— but do not rely on it existing. **Treat the spec as an unreviewed draft:
verify every "verified architecture fact" (1–14) against the code yourself,
and run fresh adversarial review rounds until a SHIP verdict, adjudicating
each round's findings on evidence (several earlier findings contained
wrong citations or overreach — verify, never blindly accept).**

## 4. The decision Jim must make (deploy is gated on it)

The spec's §"Decision required" defines two forks. **Recommendation from
the outgoing session: Fork B.** Jim has NOT yet decided — put this decision
in front of him explicitly once the spec passes review.

- **Fork B (recommended): child projection + atomic revocation.** A
  versioned `CREATE OR REPLACE` of the sync RPC extends the existing
  `STAFF_CHILDREN` tombstone branch — which already deletes the source row
  under the permission gate, inside the canonical lock order — to also
  soft-close the actor's active `child_ea_assignments` row in the same
  transaction. Removal then genuinely revokes (RLS denies; the removing
  device's next pull quarantines the child locally, which is the intended
  outcome of a deliberate removal). Bounded known cost: **re-add after
  removal** becomes a rare support case until Phase 2 — the closed domain
  row makes the client refuse the push (`syncOutboxV2Repository.js:963–989`)
  and the server gate return false; runbook = service-role SQL deletes the
  child's closed domain rows, restoring the legacy fallback, after which
  the re-add syncs. Why recommended: it fixes the actual gap (854 of the
  928 missing rows are children) *and* closes the authorization hole,
  entirely server-side. Cost: one hot, heavily-reviewed RPC changes — own
  migration, full harness rerun.
- **Fork A (conservative): classes + groups only.** No sync-RPC change, no
  revocation question (class/group de-claiming is archival, which
  consumers already filter). But the ECD children gap — the original
  complaint — stays broken.
- Withdrawn options, do not resurrect: v3's "accept retained access"
  (authorization defect — a removed EA would keep read/write access to a
  child's data while the UI implied revocation succeeded) and v1's
  reconciler-written soft-closes (quarantine/deadlock chain).

## 5. What "Phase 2" actually means (defined)

Phase 1 (the current spec) only makes the domain tables *truthful for
active claims*: insert-only reconciliation + backfill, plus (under Fork B)
atomic revocation on removal. **Phase 2 is the assignment-lifecycle
workstream** — everything needed for removal, re-add, and transfer to be
first-class citizens across app and server. Concretely:

1. **Re-add/reopen protocol (app + server).** Today a closed domain row
   permanently blocks the pair: the client refuses the push
   (`syncOutboxV2Repository.js:963–989` throws on any confirmed closed
   row) and the RLS gate is false. Phase 2 teaches the client and the sync
   RPC to reopen a closed pair on a legitimate re-claim, eliminating the
   Fork B support runbook.
2. **Transfer/handover flow.** Jim's domain: children are never shared
   between EAs, but an EA can quit and be replaced, or move schools
   (rare). Phase 2 implements explicit handover — close the old EA's row,
   open the new EA's — giving the org durable "who taught this child in
   March" attribution. (The one-active-row-per-child unique index already
   models this; the flows don't exist.)
3. **`handover_reason` vocabulary + CHECK constraint.** The column is
   free-text on all three tables today. Phase 2 fixes the vocabulary —
   which must NOT collide with the app's local quarantine reason string
   `'explicit_assignment_end'` (`mergeServerRows.js` uses it locally).
4. **Seed/fixture hardening.** `matrix-fixture.mjs` and seed SQL
   bare-INSERT both source and domain tables; they need `ON CONFLICT`
   clauses before any Phase 2 server-side writer exists. (Optional now,
   mandatory before Phase 2.)
5. Possibly a PM-facing reassignment UI (website repo), far future.

If Fork A is chosen for Phase 1, Phase 2 additionally inherits child
projection + revocation wholesale.

## 6. Also in flight / adjacent (don't duplicate, don't collide)

- **Shipped while this was being designed:** per-EA profile pages
  (2026-08-14, all three layers — see `documentation/build-log.md`). They
  consume the same domain tables and currently under-count self-setup EAs
  — they benefit from this work automatically.
- **Roadmap:** `documentation/roadmap.md` (website repo) has the full
  "Data-quality findings — ECD self-setup blind spot" section (this work),
  a separate "wave panel v2" UX section (funnel redesign, tile scoping,
  "Approved push notifications" rename, dormancy datapoint, cumulative
  activation curve — needs `first_activity_at` added to the v2 RPC), and
  the separate small fix: **all 27 ECD roster rows have
  `education_assistants.school_id IS NULL`**, so expectation renders
  "unknown" instead of "self_setup" — fix roster linkage and/or derive
  expectation from rollout-wave membership (already joined in the RPC).
  That one is independent of this spec and uncontroversial.
- Coordinate migration timestamps with any in-flight app-repo worktrees
  (`git worktree list` in the app repo; several agents work there).

## 7. Jim's standing process rules (observed this session; follow them)

- Adversarial review rounds until clean; **verify findings against code
  before accepting** — reviews in this cycle contained both decisive
  catches and wrong citations. Expect 2–3+ rounds per document.
- Feature branches always; merge to main + push when green; **no
  Co-Authored-By / agent-name trailers** in commits.
- Fix at root cause; no bandaids; backend contracts before frontend.
- Read-only production queries are fine (pattern in §2); **no production
  writes without Jim's explicit deploy approval** — and the Fork decision
  (§4) is his, not yours.
- The release harness (`wave2-combined-postgres-release-harness.cjs`) must
  stay green; it applies every migration to a bare template0 database.

## 8. Your mission, in order

1. Read the spec (v4) end to end. Independently verify its architecture
   facts 1–14 against the code paths in §2 — treat any mismatch as a
   finding.
2. Run adversarial review on the spec (challenge the design, not just the
   prose): resolve the suspected v4 contradiction (§3 ⚠️), then iterate
   revise→review until a SHIP verdict. Keep the spec's honesty invariants
   (insert-only, authorization-neutral, never write `unassigned_at` from
   the reconciler).
3. Present Jim the Fork A/B decision (§4) with your own assessment — the
   outgoing recommendation is Fork B, but re-derive it.
4. Only after SHIP + Jim's fork decision: write the implementation plan
   (migration, harness tests per the spec's test plan, watchdog check,
   runbook), then implement on a feature branch in the app repo.
5. Keep `documentation/roadmap.md` and `documentation/build-log.md` in the
   website repo current as things land.
