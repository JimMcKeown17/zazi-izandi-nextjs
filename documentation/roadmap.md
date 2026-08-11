# Zazi iZandi Website Roadmap

_Updated: 2026-08-10_

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
  explicit Other/unattributed trend series, and full-window heatmap totals.
- [x] Slice 1 local static gates: focused contracts, TypeScript, focused lint,
  and production build with non-secret build-only configuration.
- [ ] Slice 1 integration gate: exercise the Next.js server against the paired
  Django endpoint and reporting RPC with representative data.
- [ ] Slice 1 browser-auth gate: run the Clerk Playwright role matrix with all
  configured test identities and inspect desktop/mobile responsive rendering.
- [ ] Slice 1 deployment/live gate: configure the deployed environment and
  verify the report with authorized live test users. No deploy is part of the
  current local implementation.
- [ ] Slice 2: Clock In/Out reporting and CSV.
- [ ] Slice 3: Session CSV exports.
- [ ] Slice 4: Add-school workflow and audit trail.
- [ ] Slice 5: Add-user invite workflow and public set-password page.

## Explicitly outside Slice 1

Attendance, CSV exports, school/user writes, and the public invite page remain
unimplemented. Disabled sidebar labels are discovery-only and do not link to
placeholder write or export routes.
