# Zazi iZandi Website Build Log

## 2026-08-12 — User-health population policy made explicit

- Added an operator-facing disclosure that banned accounts and known synthetic
  identities are excluded from the User health rows and every summary total.
  The filtering remains server-authoritative in Django; the React page does not
  duplicate identity-policy logic or recompute the response.
- The focused mobile reporting suite passed 27 tests. The production build
  compiled, passed TypeScript, and emitted all 44 routes using non-secret local
  placeholder configuration. Expected existing static-page warnings came from
  the deliberately unreachable placeholder Django host.

## 2026-08-11 — Clock In/Out and user-health reports activated end to end

- The paired service-role-only Supabase functions are live on the pinned ZZ
  project, and Django production release `47e4881` is live on Render. The
  existing Next.js pages now complete the intended server-only path:
  browser → Clerk-protected Next.js → Clerk-verified Django → Supabase RPC.
- An authenticated production session for an administrator rendered exactly
  one success landmark and no error landmark on both `/mobile-app/attendance`
  and `/mobile-app/user-health`; neither page retained the former `Status 404`
  state.
- The 30-day Clock In/Out report rendered five separate shift rows, including
  one completed automatic clock-out and four open shifts. The page exposed the
  administrator-only CSV control and kept coordinates out of the visible
  ledger. The hosted CSV RPC returned a non-empty scalar response; saved-file
  inspection remains separate from the browser-page proof.
- The User health board rendered 397 accounts, name/email/UUID search, 50-row
  pagination, auth/login evidence, device signals, seeded/self-setup data
  readiness, and clock/session/app-assessment usage. The production summary
  reported 187 auth-ready accounts, 397 accounts with recorded sign-in
  evidence, one positive device signal, four users active in the 30-day
  window, 141 of 152 expected seeded users data-ready, and 221 accounts needing
  attention.
- Evidence remains deliberately qualified: a push token is positive app-device
  evidence but is not an install denominator; a missing token is unknown. The
  server-data readiness column proves stored ownership/count evidence, not what
  one physical device rendered. A production denied-role smoke and per-EA
  signed-in mobile browse remain useful follow-ups.

## 2026-08-11 — Clock In/Out and user-health frontends implemented locally

- Added a protected shift-level Clock In/Out report with 1–90 day and current-
  school filters, reconciled open/completed/automatic totals, human-readable
  durations, desktop/mobile results, and an explicit current-roster attribution
  disclosure. Legitimate multiple shifts per EA/day remain separate records.
- Added a same-origin CSV route which rechecks `mobile.csv.export`, accepts only
  fixed bounded filters and a `text/csv` upstream response, and keeps Django,
  Clerk, and internal-service credentials server-side. Coordinate-bearing CSV
  is limited to senior staff, admin, and ZZ data manager; junior staff retain
  read-only clock-report access.
- Added a least-privilege User health board for senior staff, admin, and ZZ data
  manager. It exposes UUID/name/email, auth readiness and last sign-in, positive
  push-device evidence, seeded/self-setup data readiness, clock/session/app-
  created assessment activity, and explicit attention reasons. Imported
  TeamPact assessments are shown as data evidence and excluded from usage.
- Preserved the evidence boundary: download/install is not directly observable;
  no push token means unknown, and server-side ownership counts do not prove
  what a physical signed-in device renders.
- Local gates passed: 27/27 focused mobile contract tests, standalone
  TypeScript, focused ESLint, and a Next.js 16 production build emitting
  dynamic attendance, CSV-export, and user-health routes. Expected build-only
  warnings came from existing static/PM pages calling the deliberately invalid
  placeholder Django URL.
- Repository-wide `npm run lint` remains non-green on the pre-existing
  `react/no-unescaped-entities` error in `app/pm/data-quality/page.tsx`; the
  changed TypeScript, React, and Playwright file set has no lint errors.
- Fixture-backed browser QA passed at 1440px and 390px for both new reports.
  User search reduced the healthboard to the matching UUID/name/email row. A
  discovered mobile offscreen-render/accessibility defect was fixed by removing
  `content-visibility`; all preview-only auth bypass and fixture route code was
  removed before the production gates.
- The 24-test Clerk route matrix is registered but all 24 cases were explicitly
  skipped because this worktree has no Clerk keys or role identities. Django
  endpoints, Supabase functions/ACL proof, a real cross-source response,
  authenticated populated browser proof, deployment, and live semantics remain
  unverified dependencies—not frontend claims.

## 2026-08-11 — Mobile sessions report deployed and verified in production

- Published exact reporting SHA `c1cb9ec` as a three-commit fast-forward of
  GitHub `main`. Vercel built the production deployment from `main`, associated
  it with the canonical `www.zazi-izandi.co.za` domain, and marked it Ready.
- The paired Django boundary was deployed first at `3d80fb6`. Render reported no
  migrations to apply, and a sanitized production-shell probe resolved the new
  route and returned the complete hosted Supabase report envelope through
  Django's service-role adapter.
- Final exact-candidate gates passed: 11/11 focused mobile-report tests,
  TypeScript, Git whitespace checks, and a production Next.js build emitting
  dynamic `/mobile-app` and `/mobile-app/sessions` routes. Expected local build
  warnings came only from deliberately unreachable build-only backend values.
- A cookie-free production request to `/mobile-app/sessions` returned `307` to
  `/login` with Clerk's signed-out reason. In the authenticated browser, an
  existing authorized staff session rendered exactly one success landmark and
  no error landmark. The page displayed the complete zero-state report, and
  changing the reporting window from 30 to seven days produced the expected
  query URL and another validated success response.
- Desktop visual inspection found a coherent dedicated reporting shell,
  capability-gated navigation, filters, summary cards, zero-state charts,
  heatmap, and current-school table. The production report currently contains
  zero qualifying sessions, so populated visuals and metric semantics remain
  explicitly unverified. Narrow/mobile viewport proof and a production
  disallowed-role smoke remain follow-ups; the development Clerk integration
  previously proved EA and teacher denial.

## 2026-08-11 — Backend reporting dependency activated and frontend branch published

- The exact Supabase sessions-reporting migration is now live on the pinned ZZ
  project with PostgreSQL 17 catalog/effective-role proof, exact stored-SQL
  checksum evidence, anonymous and unauthenticated PostgREST denial, and a
  validated service-role response.
- Aggregate hosted response evidence contains 30 daily cells, 10 heatmap
  weekdays, 160 rostered EAs, 327 school options, 60 school summaries, six
  distribution buckets, and zero reported sessions. The empty activity set
  means representative populated rendering and live metric semantics remain
  open gates.
- Pushed clean branch `feat/mobile-app-admin-reporting-phase1` at `e879637` and
  opened draft GitHub PR `#4`. It is exactly two commits ahead of current
  GitHub `main`. No merge or Vercel deployment occurred.
- Jim's separate `design/programme-scoped-closures` checkout remains untouched.
  A whole-branch merge would surface two unrelated pre-existing support-email
  conflicts, so reporting activation must continue in a clean release worktree
  and keep that design branch separate unless both workstreams are deliberately
  combined.
- The available Vercel dashboard session is signed out and the saved Vercel CLI
  token is invalid. The repository does not version its Vercel project link,
  production branch, automatic-deploy setting, or hosted environment values;
  those settings remain unverified. Django must be integrated, configured, and
  deployed before Next.js.
- The eight Clerk role tests remain registered but unexecuted because the seven
  test-user identities are not configured locally. No deployed role, responsive
  browser, or end-to-end Next.js → Django → Supabase claim is made.

## 2026-08-10 — Slice 1 independent-review corrections

Closed the material frontend findings from the independent cross-repository
review without changing the Django/Supabase contracts.

### Corrections

- Preserved `employment_status` through the UUID display adapter and added
  explicit Active, Inactive, Resigned, and Status unknown badges to mobile
  heatmap rows. Existing PM rows omit the optional property and retain their
  previous rendering.
- Extracted a response-decoding boundary backed by one complete valid frozen
  payload fixture. Upstream HTTP failures plus 2xx empty, malformed, or
  schema-invalid JSON now return the sanitized report-unavailable result rather
  than throwing through the server component.
- Added mutually exclusive success/error report landmarks. Allowed-role
  Playwright cases now require the success landmark and absence of the error
  landmark instead of accepting the shared Sessions heading.

### Evidence

- Focused RED/GREEN captured the dropped employment status, missing status-label
  behavior, upstream response accepted as success, JSON parse exception, and
  schema-invalid payload accepted as success.
- `npm run test:mobile`: 11 tests passed.
- `npx tsc --noEmit`: passed.
- Focused ESLint over every correction file: passed.
- Production build with clearly fake, build-only Clerk/Django values: passed;
  `/mobile-app` and `/mobile-app/sessions` remain dynamic routes. Expected
  handled warnings came from existing static PM pages calling the intentionally
  unreachable placeholder Django URL.
- Playwright listed all eight authorization cases, then explicitly skipped all
  eight because Clerk keys and role identities are absent from this worktree.

### Evidence boundary

The response decoder and rendering contracts are locally proven. Credentialed
Clerk behavior, a successful Django/Supabase report response in the browser,
responsive visual inspection with real data, deployment, and live behavior
remain unverified.

## 2026-08-10 — Mobile-app admin reporting, Slice 1 frontend

Implemented the first vertical frontend slice on
`feat/mobile-app-admin-reporting-phase1` in the isolated
`/Users/jimmckeown/Development/zazi-mobile-admin-nextjs` worktree.

### Delivered

- Added the exact `mobile.sessions.read` capability allowlist for junior staff,
  senior staff, admin, and ZZ data manager without inventing a rank for the new
  role.
- Replaced `middleware.ts` with the single Next.js 16 `proxy.ts` boundary while
  retaining the prior protected-route behavior and adding `/mobile-app`.
- Added after-login and header discovery for users with the capability, plus a
  capability-gated responsive mobile-report shell.
- Added the Sessions report with server-only Clerk token forwarding through
  `djangoFetch`, no-store reads, runtime response validation, UUID row identity,
  stable school filters, and explicit current-roster disclosure.
- Kept PM session visuals backward compatible while adding truthful nullable
  school-type badges, an Other/unattributed trend series, and full-window EA
  totals alongside the latest-ten-weekday cells.
- Reworked Clerk Playwright setup into a setup-project shape and added the
  unauthenticated deep-link plus four allowed/three denied role cases. Missing
  credentials produce explicit skips.

### Evidence

- TDD RED was observed first for capability import/behavior, UUID presentation,
  nullable school types, Other-series visibility, Django request construction,
  and the full-window heatmap total adapter.
- `npm run test:mobile`: 6 tests passed.
- `npx tsc --noEmit`: passed.
- Focused ESLint over every changed TypeScript/React/Playwright file: passed.
- `npm run build` with clearly fake, build-only Clerk/Django values: passed and
  emitted `/mobile-app` plus `/mobile-app/sessions` as dynamic routes. Expected
  connection warnings came from pre-existing statically generated PM pages
  attempting the intentionally unreachable placeholder Django URL.
- Repository-wide `npm run lint`: not green because of the pre-existing
  `react/no-unescaped-entities` error in `app/pm/data-quality/page.tsx`; the
  Slice 1 file set has no lint errors.
- `npx playwright test e2e/mobile-app-auth.spec.ts`: 8 tests explicitly skipped
  because this isolated worktree has no Clerk keys/test-user identities.

### Evidence boundary

The results above prove local contracts, type safety, focused lint, and a
production compilation/prerender with build-only configuration. They do not
prove a live Clerk session, a running Django/Supabase integration, responsive
browser rendering with report data, deployment configuration, or live data.
