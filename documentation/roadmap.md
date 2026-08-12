# Zazi iZandi Website Roadmap

_Updated: 2026-08-11_

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
- [ ] Slice 2: Clock In/Out reporting and CSV.
  - [x] Frontend contract and local UI: shift-level rows, bounded date/current-
    school filters, reconciled summaries, open and automatic-clock-out states,
    responsive table/cards, sanitized error state, and capability-restricted
    same-origin CSV download.
  - [ ] Upstream and live proof: implement/verify the service-role Supabase
    reporting function and CSV query, Clerk-authorized Django endpoints, hosted
    integration, populated browser semantics, and deployment.
- [ ] User onboarding and health board.
  - [x] Frontend contract and local UI: searchable UUID/name/email identity,
    auth readiness and last-sign-in evidence, positive device registration,
    seeded/self-setup data expectations, app activity, attention reasons, and
    responsive row/card presentation.
  - [ ] Upstream and live proof: implement and privilege-test the domain
    aggregation, join it to auth-account evidence in Django, verify real
    self-setup and seeded cohorts, and deploy.
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

- [ ] Per-EA profile pages (`/mobile-app/users/<id>`, fills the "Users — soon"
  nav placeholder): one EA's full clock history, sessions, and user-health
  snapshot on a single page; cross-links from the health board and clock
  ledger land here instead of on filtered global pages. Needs a design pass
  and likely a dedicated per-EA Django/Supabase endpoint (full history, not
  the windowed global feeds).
- [ ] Part B rollout waves (gated spec in
  docs/superpowers/plans/2026-08-11-mobile-ops-usability.md): stored wave
  membership + per-wave coverage; restores the evidence-coverage strip as the
  wave-scoped instrument.
