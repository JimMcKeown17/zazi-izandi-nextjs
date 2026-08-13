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
