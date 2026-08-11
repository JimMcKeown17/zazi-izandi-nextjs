# Zazi iZandi Website Build Log

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
