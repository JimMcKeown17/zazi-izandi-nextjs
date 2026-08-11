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
- [ ] Slice 3: Session CSV exports.
- [ ] Slice 4: Add-school workflow and audit trail.
- [ ] Slice 5: Add-user invite workflow and public set-password page.

## Explicitly outside Slice 1

Attendance, CSV exports, school/user writes, and the public invite page remain
unimplemented. Disabled sidebar labels are discovery-only and do not link to
placeholder write or export routes.
