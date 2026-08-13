# Zazi iZandi Website Roadmap

_Updated: 2026-08-13_

This tracker records the website work for the approved mobile-app admin
reporting plan. The detailed cross-repository contract remains in the mobile
repository's canonical Phase 1 plan; this file tracks only this Next.js
worktree's implementation and evidence boundaries.

## In progress: Mobile-app admin reporting Phase 1

- [x] Slice 1 frontend foundation: capability contract, `zz_data_manager` role,
  Next.js 16 proxy boundary, header/after-login discovery, protected mobile
  shell, and Sessions report.
- [x] Slice 1 report fidelity: UUID row identity, stable unfiltered school
  options, explicit current-school wording, null/unknown school-type handling,
  explicit Other/unattributed trend series, full-window heatmap totals, and
  visible employment status for mobile rows with inactive/resigned activity.
- [x] Slice 1 review hardening: complete frozen-payload fixture, sanitized
  handling for upstream/empty/malformed/schema-invalid responses, and
  success-only versus error-only browser landmarks.
- [x] Slice 1 local static gates: focused contracts, TypeScript, focused lint,
  and production build with non-secret build-only configuration.
- [x] Slice 1 hosted database dependency: apply the exact reporting RPC and
  verify PostgreSQL 17 structure/effective ACLs, anonymous denial, and
  service-role response shape on the pinned ZZ project.
- [x] Slice 1 zero-state integration gate: exercise the production Next.js
  server against the deployed Django endpoint and hosted reporting RPC through
  an authorized Clerk session, including the seven-day filter round trip.
- [ ] Slice 1 populated-data gate: inspect representative sessions,
  attendances, transfers, current-school attribution, and school filtering once
  qualifying production activity exists.
- [ ] Slice 1 browser-auth gate: run the Clerk Playwright role matrix with all
  configured test identities and inspect desktop/mobile responsive rendering.
- [x] Slice 1 deployment/live gate: verify Vercel's project, production branch,
  domains, and environment; deploy Django first; deploy the frontend; prove a
  cookie-free login redirect and an authorized live success response.
- [x] Slice 2: Clock In/Out reporting and CSV.
  - [x] Frontend contract and local UI: shift-level rows, bounded date/current-
    school filters, reconciled summaries, open and automatic-clock-out states,
    responsive table/cards, sanitized error state, and capability-restricted
    same-origin CSV download.
  - [x] Upstream and live proof: service-role Supabase reporting function and
    CSV query, Clerk-authorized Django endpoints, hosted integration, and
    deployment — live end to end 2026-08-11 (see build log).
- [x] User onboarding and health board.
  - [x] Frontend contract and local UI: searchable UUID/name/email identity,
    auth readiness and last-sign-in evidence, positive device registration,
    seeded/self-setup data expectations, app activity, attention reasons, and
    responsive row/card presentation.
  - [x] Upstream and live proof: domain aggregation privilege-tested, joined to
    auth-account evidence in Django, verified against the real seeded and
    self-setup cohorts, and deployed — live end to end 2026-08-11 (see build
    log).
- [x] Mobile ops usability (Part A, plan
  docs/superpowers/plans/2026-08-11-mobile-ops-usability.md): per-EA clock
  rollup with By shift / By EA toggle and search, daily clocking trend chart,
  stage × blockers health model, URL-initialized filters with clickable
  summary tiles, chase-list CSV export, app-version card, blocker playbook
  panel, and cross-links between the health board and clock ledger. Merged to
  main 2026-08-12.
- [ ] Slice 3: Session CSV exports.
- [ ] Slice 4: Add-school workflow and audit trail.
- [ ] Slice 5: Add-user invite workflow and public set-password page.

## Explicitly outside the completed frontend work

Session CSV exports, school/user writes, and the public invite page remain
unimplemented. Disabled sidebar labels are discovery-only and do not link to
placeholder write routes. Actual app-store/download telemetry is also not
available: a push-token registration is useful positive device evidence, but
its absence cannot prove that the app was never installed.

## Roadmap: future mobile-app operations work

- [x] Part B rollout waves + app_open (plan
  docs/superpowers/plans/2026-08-12-rollout-waves.md): wave tables with
  immutability guard, rate-bounded `record_app_open` RPC, and
  `mobile_user_health_domain_v2` in Supabase; Django tolerant passthrough;
  frontend wave filter, wave-scoped evidence panel, lifetime-ratchet stage,
  and quiet predicate; app_open emitter published to the app via EAS OTA.
  Deployed 2026-08-13 with waves loaded: ZZ Primary 2026 (152 seeded EAs,
  launched 2026-08-08) and ZZ ECD 2026 (27 self-setup EAs, 2026-08-11).
  Masifunde wave still to be defined and loaded.
- [ ] **In progress** — Per-EA profile pages (`/mobile-app/users/<id>`, fills
  the "Users — soon" nav placeholder): one EA's full clock history, sessions,
  and user-health snapshot on a single page; cross-links from the health board
  and clock ledger land here instead of on filtered global pages. Being built
  2026-08-13 across `feat/ea-profile` (this repo), `feat/ea-profile-api`
  (Django), and `feat/ea-profile-rpc` (Supabase); spec and plan in
  docs/superpowers/specs/2026-08-12-ea-profile-design.md and
  docs/superpowers/plans/2026-08-12-ea-profile.md on that branch.

## Roadmap: user-health digestibility (wave panel v2, agreed 2026-08-13)

Field observation from the first live rollout week: the wave panel mixes
three metric species — adoption (activated), instrument coverage (push
tokens, app_open), and preconditions (accounts, auth-ready) — on one visual
scale, which invites invalid comparisons (80% logged-in was read against 42%
opened-app). The redesign separates the species.

- [ ] Mutually exclusive adoption funnel at the top of the wave panel: three
  buckets from the existing stage model — Activated (ever) / Reached but not
  yet active / No evidence yet — every wave member in exactly one bucket, the
  bars sum to the wave size, and each bucket links to the board filtered to
  those EAs (and to the chase-list CSV). This is the "who do I call" view.
  Once a wave matures, split Activated into Active vs Quiet using the shipped
  quiet predicate.
- [ ] Demote the instrument bars: move "Device signal" and "Opened app" out of
  the main panel into a collapsed "telemetry coverage" disclosure, framed
  explicitly as how well we can observe, not how well EAs are doing. Rename
  "Device signals" to "Approved push notifications" everywhere — that is its
  operational meaning (who a push notification can reach).
- [ ] Summary cards: drop the "Device signals" card; add an "Opened app
  (ever)" card in its place (doubles as an OTA-penetration proxy during
  rollouts).
- [ ] Precondition bars: collapse "Accounts" and "Auth ready" into a single
  caption line (e.g. "152 accounts · all auth-ready") and render a bar only
  when a value regresses below 100% — keep the alarm, lose the noise.
- [ ] Summary tiles must respect the active cohort/wave filter (today the
  tiles are population-wide while the board below is filtered — two silent
  denominators on one screen). All rows are already loaded client-side, so
  this can be a client-side recompute; label the scope on the tiles either
  way.
- [ ] Dormancy datapoint per row: "Last activity: N days ago" computed from
  the lifetime `last_ever_activity_at` already in the payload, shown as a
  compact line inside an existing cell (Auth/Login, or the slot freed by
  demoting the Device Signal column — last login matters operationally;
  push-token state does not belong in the row grid). Becomes the triage key
  for Quiet EAs as waves mature. Frontend-only.
- [ ] Cumulative activation curve per wave: day-by-day cumulative count of
  wave members with their first app activity, plotted against the wave size —
  the trajectory view ("accelerating or stalling") that the funnel snapshot
  cannot show. Cross-repo: needs a `first_activity_at` field (min of first
  clock / first session / first app assessment) added to
  `mobile_user_health_domain_v2` and passed through Django; the chart itself
  is frontend. Explicitly skipped for now: a first-app-open reach curve
  (`first_app_open_at` is already in the payload if this changes).

## Data-quality findings — ECD self-setup blind spot (confirmed 2026-08-13)

Root-caused with read-only production queries after User health showed EAs
with 13–17 app assessments but 0 classes / children / groups. Not a timing
issue, and **not an app defect** — the mobile app faithfully writes every
assignment. Confirmed mechanism:

- The app's canonical mobile-writable assignment table is `staff_children`
  (plus `classes.staff_id` for class ownership); `child_ea_assignments` /
  `class_ea_assignments` are a **server-managed read model**, documented as
  such in `offlineSync.js` ("never pushed up, never in the outbox"). The
  2026-05-04 domain-refactor migration populated the read model with a
  **one-time** `INSERT … SELECT … ON CONFLICT DO NOTHING` copy and installed
  **no ongoing projection** — so every assignment written after that date
  reaches `staff_children` and stops there. The TeamPact seed wrote the read
  model directly, which masked the gap for seeded EAs.
- Measured drift (2026-08-13, production): **854 child assignments across 35
  EAs** missing from the read cache — including seeded EAs who added
  children in-app after seeding, so this is not ECD-specific and grows
  monotonically — plus **34 active classes across 33 EAs**. The v2
  user-health RPC (and any other consumer of the read model) undercounts all
  of it. 0 of 27 ZZ ECD wave members have any read-model row while 22 of 27
  have created children.
- Separately: all 27 ECD roster rows have `school_id IS NULL`, so the
  expectation CASE (roster school `school_type = 'ecd'` → self_setup) can
  never fire — every ECD EA renders "Unattributed" / "unknown".

Fix direction (server-only; no app changes, no OTA, no mixed-fleet risk).
Design spec: docs/superpowers/specs/2026-08-13-assignment-projection-design.md
(v2 after adversarial review round 1 — trigger/soft-close design withdrawn:
the domain tables turned out to be the RLS authorization substrate and
`unassigned_at` a device revocation signal, so v1 would have caused
irreversible access loss; see the spec's "Why not triggers"):

- [ ] Insert-only reconciliation: a SECURITY DEFINER
  `reconcile_assignment_read_models()` function running three idempotent
  INSERT…SELECT statements (canonical lock order, timestamp clamps), called
  once in the migration as the catch-up backfill (854 + 34 + 40 rows,
  measured authorization-neutral) and hourly via pg_cron thereafter; plus a
  permanent drift-monitoring view. Never writes `unassigned_at` — it cannot
  revoke access. Groups drift too (40 groups / 8 EAs), so all three domain
  tables are covered. Unassignment/handover semantics are Phase 2, deferred,
  and require app-side changes. Coordinate migration timestamps with the
  `feat/ea-profile-rpc` workstream; brief the team that Server Data numbers
  jump on deploy.
- [ ] Populate `school_id` on the ECD roster rows (centres as schools), and
  derive expectation from rollout-wave membership (already joined in the
  RPC) instead of roster school type so cohort classification stops
  depending on roster completeness.
- [ ] Hidden good news to surface once fixed: 22 of 27 ECD EAs have already
  created children in-app — real self-setup adoption the dashboard currently
  renders as emptiness.
