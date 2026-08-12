# Part B — Rollout Waves + app_open Event Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make rollout waves first-class stored data (tables + transactional loader + RPC/wave filter through Django to the user-health board), turn the activity stage into a true lifetime ratchet, and ship the app-owned `app_open` event as the root fix for login evidence.

**Architecture:** Four repos in a strict deploy order: the purely ADDITIVE Supabase migrations (new tables + new `mobile_user_health_domain_v2`; v1 untouched) are applied and post-apply-verified FIRST, then Django switches its call to v2, then the Next.js user-health board deploys LAST, with the Expo app feeding `app_open` events via OTA update. Django rollback is always safe (v1 is never modified). Wave membership is loaded by an authoritative one-transaction set-reconciliation script, never ad-hoc SQL.

**Tech Stack:** Postgres 17 (Supabase, plpgsql RPCs, RLS) · Django 5.2 (jsonschema Draft 2020-12 validators, SimpleTestCase) · Next.js 16 / React 19 / TypeScript / Zod v4 / node:test · Expo SDK 54 / supabase-js v2 / Jest (jest-expo)

## Global Constraints

- **Deploy order that never breaks (do not reorder):** Supabase migrations (purely ADDITIVE — new tables + new `mobile_user_health_domain_v2`; the existing v1 RPC is untouched) → Django Part B (switches to v2) → manifest sanity-check by Jim → wave loader → frontend → mobile OTA (`eas update`). Part A gates come first: Django `fix/mobile-report-real-users` deployed, then frontend `fix/mobile-report-real-users` and `feat/mobile-ops-usability` merged/deployed. **Rollback story (round-6 adversarial finding — this ordering replaces the spec's original "Django tolerate-first" sequence):** because v1 is never modified, redeploying the previous Django release works at ANY point with zero database action; the migration itself never needs reverting (unused tables + an uncalled v2 are inert). Compatibility matrix: old Django + unmigrated DB ✓ (status quo) · old Django + migrated DB ✓ (v1 unchanged) · new Django + migrated DB ✓ (v2) · new Django + unmigrated DB ✗ (v2 absent) — the ✗ cell is excluded by the deploy order and is the ONLY forbidden state.
- **Supabase house pattern** (every reporting migration): `SET search_path = ''` with every identifier schema-qualified (`public.*`, `pg_catalog.*` for builtins), `$function$` dollar-quoting, `REVOKE ALL … FROM PUBLIC, anon, authenticated, authenticator` + `GRANT EXECUTE … TO service_role` for functions, `COMMENT ON`, one trailing `NOTIFY pgrst, 'reload schema';` per file. Migration filenames match `^\d{14}_[a-z0-9_]+\.sql$` and must sort after `20260812120000`.
- **No existing RPC is modified or dropped.** Structural verifiers assert overload count = 2 per report function; the 3-arg `mobile_user_health_domain(INTEGER, UUID, UUID[])` keeps its exact current body (it is the Django rollback target). Part B ships as a NEW function `mobile_user_health_domain_v2(INTEGER, UUID, UUID[])` following the house bare-`CREATE FUNCTION` pattern.
- **Django `MOBILE_USER_HEALTH_DOMAIN_SCHEMA` keeps `additionalProperties: False` everywhere.** New fields are added to `properties` but NOT to `required` — v2 always emits them, but keeping them optional (with presence-conditional invariants and null normalization) keeps one Django release valid against BOTH RPC generations, which is what makes the deploy/rollback matrix in the first bullet all-green. The count⟺timestamp 502 invariant continues to exclude all `_ever_`/app-open fields.
- **PII:** wave manifests contain emails — they are generated into a gitignored directory and NEVER committed. `app_open` events carry only `user_id`, `event`, `app_version`, `platform`.
- **No direct client table writes.** The mobile app's only server-write precedent is a SECURITY DEFINER RPC deriving `auth.uid()` (`register_notification_push_token`); `app_open` follows it via `record_app_open(p_app_version, p_platform)` — server-derived identity, length-bounded metadata, 5-minute per-user rate bound. `authenticated` gets NO table privileges on `app_events`. (Deliberate hardening over the original spec's direct-INSERT+RLS sentence — same trust boundary, server-enforced abuse bounds; adversarial-review round 1 finding.)
- **Wave loads are single-flight.** The loader takes `pg_try_advisory_xact_lock(815001, 0)` first and fails fast if another load holds it — two concurrent reconciliations under READ COMMITTED could otherwise both pass their final asserts and commit a corrupt union (adversarial-review round 1 finding).
- **Frontend predicate values keep their URL identities AND their meanings.** `state=active` stays WINDOWED (it is what the "Active · Nd" summary tile links to and counts — tile count and drill-down rows must reconcile); the lifetime stage gets its own new predicate `activated`; `quiet` = activated-ever but silent in window. `hasRecentAppActivity` stays windowed (it feeds the server-summary reconciliation in `schema.ts` — changing it breaks every payload). The row badge shows the durable stage; every windowed claim carries the window (round-2 adversarial finding).
- **Git:** feature branches; no Co-Authored-By/agent trailers; commit messages as given per task.
- **Copy honesty:** "Activated" (durable, lifetime) and "Active · {days}d" (windowed) are different claims — never label a durable stage with a window and vice versa.
- **Degraded mode is announced, never silent (round-8 finding + Jim's standing amber-banner rule):** the frontend detects Part B capability by `wave_options` key presence in the payload (Part B Django ALWAYS emits it, legacy Django never does). When absent — i.e. a post-frontend Django-only rollback — the board falls back to windowed labels, hides the lifetime/wave/app-open surfaces, exports the legacy CSV shape, and shows an amber note explaining the degradation. A Django rollback therefore stays a one-service action and the board stays honest throughout.
- **app_open is REACH evidence and is user-visible** (round-8 finding): a signed-in app open proves the app was installed and opened even when no push token ever existed (notification permission denied). It joins the stage ratchet's `reached` branch, the board row, the CSV, and the wave funnel — it is NOT usage evidence and never makes a row `activated`.
- Jim's wave decisions (2026-08-12): waves **"ZZ Primary 2026"** (seeded cohort: `staff_identity_links.teampact_user_id IS NOT NULL`, ~152) and **"ZZ ECD 2026"** (auth accounts created 2026-08-11T19:18–19:20Z, ~27). Proposed launch dates **2026-08-08** and **2026-08-11** — Jim sanity-checks generated lists + dates BEFORE the loader runs. A Masifunde wave comes later; nothing may hardcode the two initial waves outside the manifests. Sentry tagging is DEFERRED. Filtered summary tiles are NOT approved — the wave funnel is computed from wave-narrowed rows only, never from search/stage-narrowed rows.

## Repo / branch map

| Role | Path | Base branch | Work branch |
|---|---|---|---|
| Supabase migrations + mobile app (same repo: `zazi-izandi-app`) | `/Users/jimmckeown/Development/zazi-mobile-clock-reporting-supabase` (worktree, currently `main`, clean) | `main` | `feat/rollout-waves-app-open` |
| Django | `/Users/jimmckeown/Development/zazi-mobile-clock-reporting-django` (worktree, clean) | `fix/mobile-report-real-users` | `feat/mobile-rollout-waves` |
| Next.js frontend | `/Users/jimmckeown/Development/zazi-mobile-clock-reporting-nextjs/.worktrees/mobile-ops` | `feat/mobile-ops-usability` | `feat/mobile-rollout-waves` |

The Expo app code (Task 10) is edited in the SAME worktree/branch as the Supabase migrations — `zazi-mobile-clock-reporting-supabase` is a full checkout of `zazi-izandi-app`. Do not touch `/Users/jimmckeown/Development/zazi-izandi-app` (Jim's checkout, on `ops/demo-account-access-aug11`).

Coordinator creates all three branches before dispatch:

```bash
git -C /Users/jimmckeown/Development/zazi-mobile-clock-reporting-supabase switch -c feat/rollout-waves-app-open main
git -C /Users/jimmckeown/Development/zazi-mobile-clock-reporting-django switch -c feat/mobile-rollout-waves fix/mobile-report-real-users
git -C /Users/jimmckeown/Development/zazi-mobile-clock-reporting-nextjs/.worktrees/mobile-ops switch -c feat/mobile-rollout-waves feat/mobile-ops-usability
```

## Response contract after Part B (single source of truth for Tasks 3, 6, 7)

Per user (added to today's user-health row; all six keys ALWAYS present in Django's response, `null` when unknown):

```json
{
  "wave": {"id": "<uuid>", "name": "ZZ Primary 2026", "launch_date": "2026-08-08"},
  "first_ever_activity_at": "2026-05-12T08:11:00+00:00",
  "last_ever_activity_at": "2026-08-11T14:02:00+00:00",
  "ever_registered_device": true,
  "first_app_open_at": null,
  "last_app_open_at": null
}
```

Top level: `"wave_options": [{"id", "name", "launch_date"}, …]` ordered by `(launch_date, lower(name), id)`; `[]` when the RPC predates the migration.

**Auth-only accounts (round-3 adversarial finding):** the domain RPC's `identity_population` starts from `staff_identity_links` (`role = 'ea' OR roster`), but Django deliberately synthesizes board rows for eligible auth accounts with no qualifying identity row (`_empty_domain_user` — e.g. self-setup ECD accounts, which the ECD manifest DOES assign to a wave). So the RPC ALSO returns a top-level `"supplemental_users"` array — one entry per `p_included_user_ids` uuid absent from `users[]`, each `{user_id, wave, first_ever_activity_at, last_ever_activity_at, ever_registered_device, first_app_open_at, last_app_open_at}` — and Django merges the matching entry into each synthesized auth-only row before responding. Wave membership and app_open/device/lifetime evidence therefore survive for exactly the broken-or-missing-identity-link accounts the board exists to expose. `supplemental_users` is internal to the RPC→Django hop; the frontend contract above is unchanged.

Semantics: `wave` is the live (`superseded_at IS NULL`) membership or `null`. `first/last_ever_activity_at` are the lifetime (un-windowed) LEAST/GREATEST over the same three activity sources as the windowed fields, and sit OUTSIDE the count⟺timestamp invariant. `ever_registered_device` is an EXISTS over `notification_push_tokens` INCLUDING invalidated rows. `first/last_app_open_at` aggregate `app_events` rows with `event = 'app_open'`. Part B Django reads these from the NEW `mobile_user_health_domain_v2` RPC (same three args; v1 is untouched as the rollback target). Should Django ever face a payload without the new keys (defensive tolerance — the deploy order prevents it), it normalizes all six per-user keys to `null` and `wave_options` to `[]`; `ever_registered_device: null` means "unknown", never "no".

---

### Task 1: Supabase migration — rollout wave tables + immutability guard

**Files:**
- Create: `supabase/migrations/20260813090000_app_rollout_waves.sql`
- Create: `__tests__/rolloutWavesAppOpenSqlContract.test.js` (started here, extended in Tasks 2–3)

Repo: `/Users/jimmckeown/Development/zazi-mobile-clock-reporting-supabase`, branch `feat/rollout-waves-app-open`.

**Interfaces:**
- Produces: tables `public.app_rollout_waves(id, name, launch_date, notes)` and `public.app_rollout_wave_members(id, user_id, wave_id, assigned_at, superseded_at, source_note)`; trigger `app_rollout_wave_members_immutable`; partial unique index `app_rollout_wave_members_live_user_idx`. Tasks 3–5 depend on these exact names.

- [ ] **Step 1: Write the failing SQL-contract test**

Create `__tests__/rolloutWavesAppOpenSqlContract.test.js` following the style of `__tests__/mobileRealUserReportingSqlContract.test.js` (read it first for the file-loading helper):

```js
const fs = require('fs');
const path = require('path');

const readMigration = (name) =>
  fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', name),
    'utf8'
  );

describe('rollout wave tables migration contract', () => {
  const sql = () => readMigration('20260813090000_app_rollout_waves.sql');

  test('creates both tables with append-only member columns', () => {
    const text = sql();
    expect(text).toMatch(/CREATE TABLE public\.app_rollout_waves \(/);
    expect(text).toMatch(/name TEXT NOT NULL UNIQUE/);
    expect(text).toMatch(/launch_date DATE NOT NULL/);
    expect(text).toMatch(/CREATE TABLE public\.app_rollout_wave_members \(/);
    expect(text).toMatch(/wave_id UUID NOT NULL REFERENCES public\.app_rollout_waves\(id\) ON DELETE RESTRICT/);
    expect(text).toMatch(/source_note TEXT NOT NULL/);
  });

  test('enforces exactly one live assignment per user', () => {
    expect(sql()).toMatch(
      /CREATE UNIQUE INDEX app_rollout_wave_members_live_user_idx\s+ON public\.app_rollout_wave_members \(user_id\)\s+WHERE superseded_at IS NULL/
    );
  });

  test('guards history with a BEFORE UPDATE OR DELETE trigger', () => {
    const text = sql();
    expect(text).toMatch(/CREATE FUNCTION public\.app_rollout_wave_members_guard\(\)/);
    expect(text).toMatch(/BEFORE UPDATE OR DELETE ON public\.app_rollout_wave_members/);
    expect(text).toMatch(/app_rollout_wave_members_rows_are_append_only/);
    expect(text).toMatch(/app_rollout_wave_members_only_supersede_transition_allowed/);
  });

  test('locks both tables to service-role reporting posture', () => {
    const text = sql();
    expect(text).toMatch(/ALTER TABLE public\.app_rollout_waves ENABLE ROW LEVEL SECURITY/);
    expect(text).toMatch(/ALTER TABLE public\.app_rollout_wave_members ENABLE ROW LEVEL SECURITY/);
    expect(text).toMatch(/REVOKE ALL ON TABLE public\.app_rollout_waves FROM PUBLIC, anon, authenticated/);
    expect(text).toMatch(/REVOKE ALL ON TABLE public\.app_rollout_wave_members FROM PUBLIC, anon, authenticated/);
    expect(text).not.toMatch(/CREATE POLICY/); // no policies: service_role bypasses RLS
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run from the worktree root: `npm test -- __tests__/rolloutWavesAppOpenSqlContract.test.js`
Expected: FAIL — migration file does not exist. (If `node_modules` is missing in this worktree, run `npm ci` once first.)

- [ ] **Step 3: Write the migration**

`supabase/migrations/20260813090000_app_rollout_waves.sql` — the DDL is the reviewed Part B contract, verbatim, plus the guard trigger:

```sql
-- Rollout waves become first-class data (Part B).
-- Membership rows are append-only: reassignment closes the old row via
-- superseded_at and inserts a new one, so historical wave denominators
-- stay reconstructable. Loads run only through the reconciling loader
-- (scripts/rollout-waves/load-wave-manifest.sql), never ad-hoc SQL.

CREATE TABLE public.app_rollout_waves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  launch_date DATE NOT NULL,
  notes TEXT
);

CREATE TABLE public.app_rollout_wave_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  wave_id UUID NOT NULL REFERENCES public.app_rollout_waves(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  superseded_at TIMESTAMPTZ,
  source_note TEXT NOT NULL
);

-- exactly one live assignment per EA
CREATE UNIQUE INDEX app_rollout_wave_members_live_user_idx
  ON public.app_rollout_wave_members (user_id)
  WHERE superseded_at IS NULL;
CREATE INDEX app_rollout_wave_members_wave_id_idx
  ON public.app_rollout_wave_members (wave_id);

-- Historical rows are immutable; the only permitted change is closing a
-- live row (superseded_at NULL -> timestamp). Cheap insurance against
-- ad-hoc SQL; concurrent-loader locking is deliberately omitted because
-- a single operator runs these loads.
CREATE FUNCTION public.app_rollout_wave_members_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'app_rollout_wave_members_rows_are_append_only';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.wave_id IS DISTINCT FROM OLD.wave_id
    OR NEW.assigned_at IS DISTINCT FROM OLD.assigned_at
    OR NEW.source_note IS DISTINCT FROM OLD.source_note
    OR OLD.superseded_at IS NOT NULL
    OR NEW.superseded_at IS NULL
  THEN
    RAISE EXCEPTION 'app_rollout_wave_members_only_supersede_transition_allowed';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER app_rollout_wave_members_immutable
  BEFORE UPDATE OR DELETE ON public.app_rollout_wave_members
  FOR EACH ROW EXECUTE FUNCTION public.app_rollout_wave_members_guard();

ALTER TABLE public.app_rollout_waves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_rollout_wave_members ENABLE ROW LEVEL SECURITY;
-- no policies: service-role reporting access only, same posture as the RPCs

REVOKE ALL ON TABLE public.app_rollout_waves FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.app_rollout_wave_members FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.app_rollout_waves TO service_role;
GRANT ALL ON TABLE public.app_rollout_wave_members TO service_role;

COMMENT ON TABLE public.app_rollout_waves IS
  'Named rollout waves (launch cohorts) for the mobile app; read by mobile_user_health_domain.';
COMMENT ON TABLE public.app_rollout_wave_members IS
  'Append-only wave membership; live rows have superseded_at IS NULL. Loaded only via the reconciling loader.';

NOTIFY pgrst, 'reload schema';
```

Note the guard function deliberately has no REVOKE/GRANT lines: trigger functions execute as the table operation's role automatically and are not client-callable RPCs, but DO revoke direct execute anyway to keep the posture uniform:

```sql
REVOKE ALL ON FUNCTION public.app_rollout_wave_members_guard()
  FROM PUBLIC, anon, authenticated, authenticator;
```

(Place this immediately after the function definition, before `CREATE TRIGGER`.)

- [ ] **Step 4: Run the contract test to verify it passes**

Run: `npm test -- __tests__/rolloutWavesAppOpenSqlContract.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260813090000_app_rollout_waves.sql __tests__/rolloutWavesAppOpenSqlContract.test.js
git commit -m "feat(waves): add rollout wave tables with append-only membership"
```

---

### Task 2: Supabase migration — app_events table + `record_app_open` RPC

**Files:**
- Create: `supabase/migrations/20260813091000_app_events.sql`
- Modify: `__tests__/rolloutWavesAppOpenSqlContract.test.js` (append a describe block)
- Read first: `supabase/migrations/20260525125500_fix_notification_push_token_rpc_conflict_target.sql` (the house SECURITY DEFINER client-RPC precedent)

Repo/branch: same as Task 1.

**Interfaces:**
- Produces: table `public.app_events(id, user_id, event, app_version, platform, occurred_at)` — NO client privileges — and RPC `public.record_app_open(p_app_version TEXT, p_platform TEXT) RETURNS VOID` (SECURITY DEFINER, derives `auth.uid()`, 5-minute per-user rate bound, EXECUTE granted to `authenticated` only). Task 3's reporting RPC reads the table; Task 10's client calls `record_app_open`.

- [ ] **Step 1: Append the failing contract tests**

```js
describe('app_events migration contract', () => {
  const sql = () => readMigration('20260813091000_app_events.sql');

  test('creates the events table with constrained event, platform, and version length', () => {
    const text = sql();
    expect(text).toMatch(/CREATE TABLE public\.app_events \(/);
    expect(text).toMatch(/user_id UUID NOT NULL REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
    expect(text).toMatch(/CHECK \(event IN \('app_open'\)\)/);
    expect(text).toMatch(/CHECK \(platform IN \('ios', 'android'\)\)/);
    expect(text).toMatch(/char_length\(app_version\) <= 64/);
    expect(text).toMatch(/occurred_at TIMESTAMPTZ NOT NULL DEFAULT now\(\)/);
  });

  test('clients get no table access at all — writes only through the RPC', () => {
    const text = sql();
    expect(text).toMatch(/ALTER TABLE public\.app_events ENABLE ROW LEVEL SECURITY/);
    expect(text).not.toMatch(/CREATE POLICY/);
    expect(text).toMatch(/REVOKE ALL ON TABLE public\.app_events FROM PUBLIC, anon, authenticated/);
    expect(text).not.toMatch(/GRANT INSERT[\s\S]*TO authenticated/);
  });

  test('record_app_open derives identity, bounds metadata, and rate-limits per user', () => {
    const text = sql();
    expect(text).toMatch(/CREATE FUNCTION public\.record_app_open\(\s*p_app_version TEXT,\s*p_platform TEXT\s*\)/);
    expect(text).toMatch(/SECURITY DEFINER/);
    expect(text).toMatch(/SET search_path = ''/);
    expect(text).toMatch(/auth\.uid\(\)/);
    expect(text).toMatch(/record_app_open_requires_authentication/);
    expect(text).toMatch(/pg_advisory_xact_lock\(\s*815002,/);
    expect(text).toMatch(/INTERVAL '5 minutes'/);
    expect(text).toMatch(/REVOKE ALL ON FUNCTION public\.record_app_open\(TEXT, TEXT\)\s+FROM PUBLIC, anon, authenticator, service_role/);
    expect(text).toMatch(/GRANT EXECUTE ON FUNCTION public\.record_app_open\(TEXT, TEXT\)\s+TO authenticated/);
  });
});
```

- [ ] **Step 2: Run to verify the new block fails**

Run: `npm test -- __tests__/rolloutWavesAppOpenSqlContract.test.js`
Expected: FAIL — `20260813091000_app_events.sql` missing; Task 1 tests still pass.

- [ ] **Step 3: Write the migration**

```sql
-- App-owned lifecycle events (root fix for mobile login evidence).
-- Clients never touch the table: the only write path is record_app_open,
-- which derives the user from auth.uid(), bounds metadata, and enforces a
-- server-side per-user rate limit (a modified client or stolen token can
-- therefore not grow the table unboundedly). Reads are service-role only.

CREATE TABLE public.app_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN ('app_open')),
  app_version TEXT CHECK (app_version IS NULL OR char_length(app_version) <= 64),
  platform TEXT CHECK (platform IN ('ios', 'android')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Serves the per-user first/last aggregation in mobile_user_health_domain,
-- the RPC's rate-bound lookup, and the auth.users cascade.
CREATE INDEX app_events_user_event_occurred_idx
  ON public.app_events (user_id, event, occurred_at DESC);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;
-- no policies: no client role reaches the table directly

REVOKE ALL ON TABLE public.app_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.app_events TO service_role;

COMMENT ON TABLE public.app_events IS
  'App lifecycle events (app_open), written only via record_app_open; read via service-role reporting only.';

-- Follows the register_notification_push_token precedent: SECURITY DEFINER
-- client RPC keyed on auth.uid(), raising if unauthenticated.
CREATE FUNCTION public.record_app_open(
  p_app_version TEXT,
  p_platform TEXT
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_app_version TEXT :=
    pg_catalog.left(NULLIF(pg_catalog.btrim(p_app_version), ''), 64);
  v_platform TEXT := CASE
    WHEN p_platform IN ('ios', 'android') THEN p_platform
    ELSE NULL
  END;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'record_app_open_requires_authentication';
  END IF;

  -- Serialize per user: check-then-insert is not atomic on its own, so
  -- concurrent calls could all pass the EXISTS and burst past the rate
  -- bound. The lock is transaction-scoped; a concurrent caller blocks
  -- until this transaction commits and then sees the committed row.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    815002,
    pg_catalog.hashtext(v_user_id::TEXT)
  );

  -- Server-side rate bound: at most one app_open per user per 5 minutes.
  -- Reporting consumes only first/last open times, so collapsed duplicates
  -- lose nothing; the bound caps abuse from any authenticated credential.
  IF EXISTS (
    SELECT 1
    FROM public.app_events AS recent
    WHERE recent.user_id = v_user_id
      AND recent.event = 'app_open'
      AND recent.occurred_at > pg_catalog.now() - INTERVAL '5 minutes'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.app_events (user_id, event, app_version, platform)
  VALUES (v_user_id, 'app_open', v_app_version, v_platform);
END;
$function$;

REVOKE ALL ON FUNCTION public.record_app_open(TEXT, TEXT)
  FROM PUBLIC, anon, authenticator, service_role;
GRANT EXECUTE ON FUNCTION public.record_app_open(TEXT, TEXT)
  TO authenticated;

COMMENT ON FUNCTION public.record_app_open(TEXT, TEXT) IS
  'Rate-bounded client emission of an app_open event for the calling authenticated user.';

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 4: Run the contract test to verify it passes**

Run: `npm test -- __tests__/rolloutWavesAppOpenSqlContract.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260813091000_app_events.sql __tests__/rolloutWavesAppOpenSqlContract.test.js
git commit -m "feat(events): add app_events table with rate-bounded record_app_open RPC"
```

---

### Task 3: Supabase migration — new `mobile_user_health_domain_v2` (waves, lifetime, app_open)

**Files:**
- Create: `supabase/migrations/20260813092000_mobile_user_health_waves_lifetime.sql`
- Modify: `__tests__/rolloutWavesAppOpenSqlContract.test.js` (append a describe block)
- Read first: `supabase/migrations/20260812120000_mobile_reporting_real_user_population.sql` (the current 3-arg function body to copy)

Repo/branch: same as Task 1. Depends on Tasks 1–2 (reads their tables).

**Interfaces:**
- Produces: NEW function `public.mobile_user_health_domain_v2(p_days INTEGER, p_school_id UUID, p_included_user_ids UUID[])` — the v1 body plus: per-user six keys, top-level `wave_options` AND `supplemental_users` (Part B evidence for included uuids absent from `users[]`), exactly per the "Response contract after Part B" section above. The existing v1 function is NOT modified (it is the Django rollback target; round-6 adversarial finding). Tasks 5 and 6 depend on this shape.

- [ ] **Step 1: Append the failing contract tests**

```js
describe('user-health RPC extension contract', () => {
  const sql = () => readMigration('20260813092000_mobile_user_health_waves_lifetime.sql');

  test('creates only the new v2 function and never touches v1', () => {
    const text = sql();
    expect(text).toMatch(/CREATE FUNCTION public\.mobile_user_health_domain_v2\(\s*p_days INTEGER,\s*p_school_id UUID,\s*p_included_user_ids UUID\[\]\s*\)/);
    expect(text).not.toMatch(/DROP FUNCTION/i);
    expect(text).not.toMatch(/CREATE OR REPLACE/);
    // Rollback contract: v1 must remain byte-identical, so this migration
    // may reference the v1 name ONLY as part of the v2 identifier.
    expect(text.replace(/mobile_user_health_domain_v2/g, '')).not.toMatch(/mobile_user_health_domain/);
  });

  test('joins live wave membership and exposes wave_options', () => {
    const text = sql();
    expect(text).toMatch(/FROM public\.app_rollout_wave_members AS member/);
    expect(text).toMatch(/WHERE member\.superseded_at IS NULL/);
    expect(text).toMatch(/'wave_options', wave_options\.value/);
    expect(text).toMatch(/ORDER BY wave\.launch_date, pg_catalog\.lower\(wave\.name\), wave\.id/);
  });

  test('included users without an identity row keep their evidence via supplemental_users', () => {
    const text = sql();
    expect(text).toMatch(/supplemental_population AS \(/);
    expect(text).toMatch(/FROM pg_catalog\.unnest\(p_included_user_ids\)/);
    expect(text).toMatch(/NOT EXISTS[\s\S]*identity_population/);
    expect(text).toMatch(/'supplemental_users', supplemental_users\.value/);
  });

  test('lifetime evidence is unwindowed and device history includes invalidated tokens', () => {
    const text = sql();
    expect(text).toMatch(/'first_ever_activity_at', health\.first_ever_activity_at/);
    expect(text).toMatch(/'last_ever_activity_at', health\.last_ever_activity_at/);
    expect(text).toMatch(/'ever_registered_device', health\.ever_registered_device/);
    expect(text).toMatch(/'first_app_open_at', health\.first_app_open_at/);
    expect(text).toMatch(/'last_app_open_at', health\.last_app_open_at/);
    // ever_device CTE must NOT filter invalidated_at
    const everDevice = text.match(/ever_device AS \(([\s\S]*?)\),/);
    expect(everDevice).not.toBeNull();
    expect(everDevice[1]).not.toMatch(/invalidated_at/);
    // lifetime CTEs must not reference the report window bounds
    const lifetimeClock = text.match(/lifetime_clock_activity AS \(([\s\S]*?)\),/);
    expect(lifetimeClock[1]).not.toMatch(/v_start_at|v_end_at/);
  });

  test('keeps the service-role-only grant posture', () => {
    const text = sql();
    expect(text).toMatch(/REVOKE ALL ON FUNCTION public\.mobile_user_health_domain_v2\(INTEGER, UUID, UUID\[\]\)\s+FROM PUBLIC, anon, authenticated, authenticator/);
    expect(text).toMatch(/GRANT EXECUTE ON FUNCTION public\.mobile_user_health_domain_v2\(INTEGER, UUID, UUID\[\]\)\s+TO service_role/);
    expect(text).toMatch(/NOTIFY pgrst, 'reload schema';/);
  });
});
```

- [ ] **Step 2: Run to verify the new block fails**

Run: `npm test -- __tests__/rolloutWavesAppOpenSqlContract.test.js`
Expected: FAIL on the new describe block only.

- [ ] **Step 3: Write the migration**

Copy the ENTIRE `mobile_user_health_domain(INTEGER, UUID, UUID[])` function from `20260812120000_mobile_reporting_real_user_population.sql` (from its leading comment `-- Mobile-app onboarding and operational-health domain evidence.` through its `NOTIFY`) into the new file, rename EVERY occurrence of `mobile_user_health_domain` to `mobile_user_health_domain_v2` (the `CREATE FUNCTION`, the error-message prefixes in the RAISE blocks, the REVOKE/GRANT signatures, and the COMMENT — the original function is never referenced again in this file), and apply exactly these edits (everything else stays byte-identical):

**(a)** After the `identity_population` CTE, insert five new CTEs (before `class_counts`):

```sql
    wave_membership AS (
      SELECT
        member.user_id,
        wave.id AS wave_id,
        wave.name AS wave_name,
        wave.launch_date AS wave_launch_date
      FROM public.app_rollout_wave_members AS member
      JOIN public.app_rollout_waves AS wave
        ON wave.id = member.wave_id
      WHERE member.superseded_at IS NULL
    ),
    lifetime_clock_activity AS (
      SELECT
        entry.user_id,
        MIN(entry.sign_in_time) AS first_at,
        MAX(entry.sign_in_time) AS last_at
      FROM public.time_entries AS entry
      GROUP BY entry.user_id
    ),
    lifetime_session_activity AS (
      SELECT
        session_row.user_id,
        MIN(
          COALESCE(
            session_row.started_at,
            session_row.created_at,
            session_row.session_date::TIMESTAMP
              AT TIME ZONE 'Africa/Johannesburg'
          )
        ) AS first_at,
        MAX(
          COALESCE(
            session_row.started_at,
            session_row.created_at,
            session_row.session_date::TIMESTAMP
              AT TIME ZONE 'Africa/Johannesburg'
          )
        ) AS last_at
      FROM public.sessions AS session_row
      WHERE session_row.session_type = 'Literacy Coach'
      GROUP BY session_row.user_id
    ),
    lifetime_assessment_activity AS (
      SELECT
        assessment.user_id,
        MIN(assessment.created_at) AS first_at,
        MAX(assessment.created_at) AS last_at
      FROM public.assessments AS assessment
      WHERE assessment.capture_mode IS NOT NULL
      GROUP BY assessment.user_id
    ),
    ever_device AS (
      -- Includes invalidated tokens: a token that later died still proves
      -- the app was once installed.
      SELECT DISTINCT push_token_row.user_id
      FROM public.notification_push_tokens AS push_token_row
    ),
    app_open_activity AS (
      SELECT
        app_event.user_id,
        MIN(app_event.occurred_at) AS first_app_open_at,
        MAX(app_event.occurred_at) AS last_app_open_at
      FROM public.app_events AS app_event
      WHERE app_event.event = 'app_open'
      GROUP BY app_event.user_id
    ),
```

**(b)** In the `health_rows` CTE select list, after `last_activity_at`, add:

```sql
        wave_link.wave_id,
        wave_link.wave_name,
        wave_link.wave_launch_date,
        LEAST(
          lifetime_clock.first_at,
          lifetime_session.first_at,
          lifetime_assessment.first_at
        ) AS first_ever_activity_at,
        GREATEST(
          lifetime_clock.last_at,
          lifetime_session.last_at,
          lifetime_assessment.last_at
        ) AS last_ever_activity_at,
        ever_device.user_id IS NOT NULL AS ever_registered_device,
        app_open.first_app_open_at,
        app_open.last_app_open_at
```

and after the existing `LEFT JOIN LATERAL (…) AS push_token ON TRUE`, add:

```sql
      LEFT JOIN wave_membership AS wave_link
        ON wave_link.user_id = identity.user_id
      LEFT JOIN lifetime_clock_activity AS lifetime_clock
        ON lifetime_clock.user_id = identity.user_id
      LEFT JOIN lifetime_session_activity AS lifetime_session
        ON lifetime_session.user_id = identity.user_id
      LEFT JOIN lifetime_assessment_activity AS lifetime_assessment
        ON lifetime_assessment.user_id = identity.user_id
      LEFT JOIN ever_device
        ON ever_device.user_id = identity.user_id
      LEFT JOIN app_open_activity AS app_open
        ON app_open.user_id = identity.user_id
```

(`LEAST`/`GREATEST` are written bare, never `pg_catalog.`-qualified: they are grammar constructs, not functions — qualifying them is a syntax error, and they are safe under `search_path = ''` because grammar constructs do not resolve via search_path. The existing windowed `GREATEST(` call in this same function is the precedent; `LEAST`/`GREATEST` also ignore NULL arguments, so a user with only clock history still gets lifetime bounds and all-NULL yields NULL.)

**(c)** In `users_json`'s `jsonb_build_object`, after the `'activity'` object, add six keys:

```sql
            'wave', CASE
              WHEN health.wave_id IS NULL THEN NULL::JSONB
              ELSE pg_catalog.jsonb_build_object(
                'id', health.wave_id,
                'name', health.wave_name,
                'launch_date', health.wave_launch_date
              )
            END,
            'first_ever_activity_at', health.first_ever_activity_at,
            'last_ever_activity_at', health.last_ever_activity_at,
            'ever_registered_device', health.ever_registered_device,
            'first_app_open_at', health.first_app_open_at,
            'last_app_open_at', health.last_app_open_at
```

**(d)** Add a `wave_options` CTE next to `school_options`:

```sql
    wave_options AS (
      SELECT COALESCE(
        pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', wave.id,
            'name', wave.name,
            'launch_date', wave.launch_date
          )
          ORDER BY wave.launch_date, pg_catalog.lower(wave.name), wave.id
        ),
        '[]'::JSONB
      ) AS value
      FROM public.app_rollout_waves AS wave
    )
```

and in the final `jsonb_build_object`, after `'school_options', school_options.value,` add `'wave_options', wave_options.value,` plus `CROSS JOIN wave_options` in the final FROM.

**(e)** Add the supplemental-evidence CTEs AFTER `users_json` (they reference `identity_population` and all the Part B evidence CTEs; round-3 adversarial finding — Django synthesizes rows for eligible auth accounts with no qualifying identity row, and those rows must keep their wave/evidence):

```sql
    supplemental_population AS (
      -- Included users with no identity_population row: Django renders
      -- these as synthesized auth-only rows and merges this evidence in.
      -- Under a school filter this also catches other-school users;
      -- Django drops auth-only rows in filtered views, so those entries
      -- are simply ignored.
      SELECT included.user_id
      FROM pg_catalog.unnest(p_included_user_ids) AS included(user_id)
      WHERE NOT EXISTS (
        SELECT 1
        FROM identity_population AS identity
        WHERE identity.user_id = included.user_id
      )
    ),
    supplemental_users AS (
      SELECT COALESCE(
        pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'user_id', supplemental.user_id,
            'wave', CASE
              WHEN wave_link.wave_id IS NULL THEN NULL::JSONB
              ELSE pg_catalog.jsonb_build_object(
                'id', wave_link.wave_id,
                'name', wave_link.wave_name,
                'launch_date', wave_link.wave_launch_date
              )
            END,
            'first_ever_activity_at', LEAST(
              lifetime_clock.first_at,
              lifetime_session.first_at,
              lifetime_assessment.first_at
            ),
            'last_ever_activity_at', GREATEST(
              lifetime_clock.last_at,
              lifetime_session.last_at,
              lifetime_assessment.last_at
            ),
            'ever_registered_device', ever_device.user_id IS NOT NULL,
            'first_app_open_at', app_open.first_app_open_at,
            'last_app_open_at', app_open.last_app_open_at
          )
          ORDER BY supplemental.user_id
        ),
        '[]'::JSONB
      ) AS value
      FROM supplemental_population AS supplemental
      LEFT JOIN wave_membership AS wave_link
        ON wave_link.user_id = supplemental.user_id
      LEFT JOIN lifetime_clock_activity AS lifetime_clock
        ON lifetime_clock.user_id = supplemental.user_id
      LEFT JOIN lifetime_session_activity AS lifetime_session
        ON lifetime_session.user_id = supplemental.user_id
      LEFT JOIN lifetime_assessment_activity AS lifetime_assessment
        ON lifetime_assessment.user_id = supplemental.user_id
      LEFT JOIN ever_device
        ON ever_device.user_id = supplemental.user_id
      LEFT JOIN app_open_activity AS app_open
        ON app_open.user_id = supplemental.user_id
    )
```

and in the final `jsonb_build_object` add `'supplemental_users', supplemental_users.value,` (after `'wave_options'`) plus `CROSS JOIN supplemental_users` in the final FROM.

**(f)** The function's `COMMENT ON` becomes:

```sql
COMMENT ON FUNCTION public.mobile_user_health_domain_v2(INTEGER, UUID, UUID[]) IS
  'Part B user-health evidence: v1 shape plus rollout wave, lifetime activity, app_open aggregates, and supplemental auth-only evidence. v1 stays unchanged as the Django rollback target.';
```

Keep the (renamed) REVOKE/GRANT block and the trailing `NOTIFY pgrst, 'reload schema';`.

- [ ] **Step 4: Run the contract test to verify it passes**

Run: `npm test -- __tests__/rolloutWavesAppOpenSqlContract.test.js`
Expected: PASS (all describe blocks).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260813092000_mobile_user_health_waves_lifetime.sql __tests__/rolloutWavesAppOpenSqlContract.test.js
git commit -m "feat(waves): add user-health v2 RPC with wave, lifetime, and app_open evidence"
```

---

### Task 4: Wave manifest generator + reconciling loader scripts

**Files:**
- Create: `scripts/rollout-waves/generate-wave-manifests.sql`
- Create: `scripts/rollout-waves/load-wave-manifest.sql`
- Create: `scripts/rollout-waves/README.md`
- Modify: `.gitignore` (add `scripts/rollout-waves/manifests/`)

Repo/branch: same as Task 1. No Jest cycle here (pure SQL scripts); behavioral proof happens in Task 5's harness, which exercises the loader end-to-end. The deliverable of this task is the exact SQL below on disk.

**Interfaces:**
- Consumes: tables from Task 1.
- Produces: `load-wave-manifest.sql` invoked as
  `psql "$DB_URL" -v wave_name='…' -v launch_date='YYYY-MM-DD' -v source_note='…' -v allow_moves='false' -v manifest_path='…csv' -f scripts/rollout-waves/load-wave-manifest.sql`
  with a single-column CSV of auth user ids or emails (no header). Task 5 and the deploy runbook call it exactly this way.

- [ ] **Step 1: Write the generator**

`scripts/rollout-waves/generate-wave-manifests.sql` (read-only; run with `psql "$DB_URL" -f …` from `scripts/rollout-waves/`, writes into gitignored `manifests/`):

```sql
-- Generate the two initial wave manifests FROM existing data for Jim's
-- sanity check. Read-only. Outputs land in scripts/rollout-waves/manifests/
-- (gitignored: manifests contain emails).
--
--   ZZ Primary 2026 = seeded cohort (staff_identity_links.teampact_user_id IS NOT NULL)
--   ZZ ECD 2026     = auth accounts created in the ECD provisioning batch
--                     window 2026-08-11T19:18:00Z .. 2026-08-11T19:20:00Z
-- These are the same signals Django's _provisioning_cutoff_at() uses.

\set ON_ERROR_STOP on

\echo '--- ZZ Primary 2026 (expected ~152) ---'
SELECT COUNT(*) AS primary_count
FROM public.staff_identity_links AS identity
JOIN auth.users AS auth_user ON auth_user.id = identity.user_id
WHERE identity.teampact_user_id IS NOT NULL;

\echo '--- ZZ ECD 2026 (expected ~27) ---'
SELECT COUNT(*) AS ecd_count
FROM auth.users AS auth_user
WHERE auth_user.created_at >= '2026-08-11T19:18:00Z'
  AND auth_user.created_at <= '2026-08-11T19:20:00Z';

\echo '--- overlap check (must be 0) ---'
SELECT COUNT(*) AS overlap_count
FROM public.staff_identity_links AS identity
JOIN auth.users AS auth_user ON auth_user.id = identity.user_id
WHERE identity.teampact_user_id IS NOT NULL
  AND auth_user.created_at >= '2026-08-11T19:18:00Z'
  AND auth_user.created_at <= '2026-08-11T19:20:00Z';

-- Loader inputs: one auth user id per line, no header.
\copy (SELECT identity.user_id FROM public.staff_identity_links AS identity JOIN auth.users AS auth_user ON auth_user.id = identity.user_id WHERE identity.teampact_user_id IS NOT NULL ORDER BY identity.user_id) TO 'manifests/zz-primary-2026-manifest.csv' WITH (FORMAT csv)
\copy (SELECT auth_user.id FROM auth.users AS auth_user WHERE auth_user.created_at >= '2026-08-11T19:18:00Z' AND auth_user.created_at <= '2026-08-11T19:20:00Z' ORDER BY auth_user.id) TO 'manifests/zz-ecd-2026-manifest.csv' WITH (FORMAT csv)

-- Human review files for Jim (id, email, display name).
\copy (SELECT auth_user.id, auth_user.email, COALESCE(NULLIF(pg_catalog.btrim(identity.display_name), ''), pg_catalog.concat_ws(' ', identity.first_name, identity.last_name)) AS display_name FROM public.staff_identity_links AS identity JOIN auth.users AS auth_user ON auth_user.id = identity.user_id WHERE identity.teampact_user_id IS NOT NULL ORDER BY pg_catalog.lower(auth_user.email)) TO 'manifests/zz-primary-2026-review.csv' WITH (FORMAT csv, HEADER true)
\copy (SELECT auth_user.id, auth_user.email, COALESCE(NULLIF(pg_catalog.btrim(identity.display_name), ''), pg_catalog.concat_ws(' ', identity.first_name, identity.last_name)) AS display_name FROM auth.users AS auth_user LEFT JOIN public.staff_identity_links AS identity ON identity.user_id = auth_user.id WHERE auth_user.created_at >= '2026-08-11T19:18:00Z' AND auth_user.created_at <= '2026-08-11T19:20:00Z' ORDER BY pg_catalog.lower(auth_user.email)) TO 'manifests/zz-ecd-2026-review.csv' WITH (FORMAT csv, HEADER true)

\echo 'Wrote manifests/ (4 files). Review the *-review.csv files with Jim before loading.'
```

- [ ] **Step 2: Write the loader**

`scripts/rollout-waves/load-wave-manifest.sql` — authoritative bidirectional set reconciliation in ONE transaction (the reviewed contract, verbatim intent):

```sql
-- Authoritative wave membership load. A manifest for wave W declares W's
-- COMPLETE membership. One transaction: stage -> resolve (abort on any
-- zero/ambiguous/duplicate entry) -> reconcile BOTH directions (insert
-- missing live rows; supersede live rows absent from staging; move rows
-- live in another wave only when allow_moves=true) -> assert live set ==
-- staged set exactly. A misspelled email or stale member fails or
-- surfaces in the same load, never silently skewing a denominator.
--
-- Usage:
--   psql "$DB_URL" \
--     -v wave_name='ZZ Primary 2026' \
--     -v launch_date='2026-08-08' \
--     -v source_note='manifest 2026-08-13 zz-primary-2026-manifest.csv' \
--     -v allow_moves='false' \
--     -v manifest_path='manifests/zz-primary-2026-manifest.csv' \
--     -f load-wave-manifest.sql
--
-- Manifest: plain text, one entry per line, no header; each line an auth
-- user id (uuid) or an email (matched lower-normalized).
--
-- NOTE (round-5 adversarial finding): psql's \copy performs NO variable
-- interpolation in its arguments, so `\copy ... FROM :'manifest_path'`
-- would read a file literally named :'manifest_path'. Backquote
-- expansion DOES interpolate variables, so the file is read client-side
-- via `cat` and staged with a regular INSERT — same transaction, no
-- \copy. A missing/unreadable file yields empty content and aborts as
-- rollout_wave_load_empty_manifest.

\set ON_ERROR_STOP on

\set manifest_content `cat :'manifest_path'`

BEGIN;

SELECT set_config('rollout.wave_name', :'wave_name', true);
SELECT set_config('rollout.launch_date', :'launch_date', true);
SELECT set_config('rollout.source_note', :'source_note', true);
SELECT set_config('rollout.allow_moves', :'allow_moves', true);

CREATE TEMP TABLE staged_manifest_entries (
  entry TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO staged_manifest_entries (entry)
SELECT manifest.entry
FROM pg_catalog.string_to_table(:'manifest_content', E'\n') AS manifest(entry)
WHERE pg_catalog.btrim(manifest.entry) <> '';

DO $load$
DECLARE
  v_wave_name TEXT := current_setting('rollout.wave_name');
  v_launch_date DATE := current_setting('rollout.launch_date')::DATE;
  v_source_note TEXT := current_setting('rollout.source_note');
  v_allow_moves BOOLEAN := current_setting('rollout.allow_moves')::BOOLEAN;
  v_wave_id UUID;
  v_staged_count INTEGER;
  v_inserted INTEGER;
  v_superseded INTEGER;
  v_moved INTEGER;
  v_bad RECORD;
BEGIN
  -- Single-flight guard: two concurrent reconciliations under READ
  -- COMMITTED could each pass their final set-equality assert against
  -- independent snapshots and commit a corrupt union. One global
  -- transaction-scoped advisory lock serializes every wave load,
  -- including cross-wave moves; fail fast so an operator never stacks a
  -- second load behind a stalled one.
  IF NOT pg_catalog.pg_try_advisory_xact_lock(815001, 0) THEN
    RAISE EXCEPTION 'rollout_wave_load_concurrent_load_in_progress';
  END IF;

  IF v_source_note IS NULL OR btrim(v_source_note) = '' THEN
    RAISE EXCEPTION 'rollout_wave_load_source_note_required';
  END IF;

  -- Wave row: create on first load; on later loads the launch_date must match.
  SELECT wave.id INTO v_wave_id
  FROM public.app_rollout_waves AS wave
  WHERE wave.name = v_wave_name;
  IF v_wave_id IS NULL THEN
    INSERT INTO public.app_rollout_waves (name, launch_date)
    VALUES (v_wave_name, v_launch_date)
    RETURNING id INTO v_wave_id;
    RAISE NOTICE 'created wave "%" (%) launch_date=%',
      v_wave_name, v_wave_id, v_launch_date;
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.app_rollout_waves AS wave
    WHERE wave.id = v_wave_id AND wave.launch_date = v_launch_date
  ) THEN
    RAISE EXCEPTION 'rollout_wave_load_launch_date_mismatch for wave "%"', v_wave_name;
  END IF;

  CREATE TEMP TABLE staged_normalized ON COMMIT DROP AS
  SELECT DISTINCT btrim(stage.entry) AS entry
  FROM staged_manifest_entries AS stage
  WHERE btrim(stage.entry) <> '';

  SELECT COUNT(*) INTO v_staged_count FROM staged_normalized;
  IF v_staged_count = 0 THEN
    RAISE EXCEPTION 'rollout_wave_load_empty_manifest';
  END IF;

  -- Resolve every entry against auth.users by id (compared as text, so a
  -- malformed uuid simply fails to match) or lower-normalized email.
  CREATE TEMP TABLE staged_resolved ON COMMIT DROP AS
  SELECT
    staged.entry,
    resolved.user_id,
    resolved.match_count
  FROM staged_normalized AS staged
  CROSS JOIN LATERAL (
    SELECT
      (MIN(auth_user.id::TEXT))::UUID AS user_id,
      COUNT(*)::INTEGER AS match_count
    FROM auth.users AS auth_user
    WHERE auth_user.id::TEXT = lower(staged.entry)
       OR lower(auth_user.email) = lower(staged.entry)
  ) AS resolved;

  FOR v_bad IN
    SELECT bad.entry, bad.match_count
    FROM staged_resolved AS bad
    WHERE bad.match_count <> 1
    ORDER BY bad.entry
  LOOP
    RAISE WARNING 'unresolved manifest entry "%" (matched % accounts)',
      v_bad.entry, v_bad.match_count;
  END LOOP;
  IF EXISTS (SELECT 1 FROM staged_resolved WHERE match_count <> 1) THEN
    RAISE EXCEPTION 'rollout_wave_load_unresolved_entries';
  END IF;

  IF EXISTS (
    SELECT resolved.user_id
    FROM staged_resolved AS resolved
    GROUP BY resolved.user_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'rollout_wave_load_duplicate_users_in_manifest';
  END IF;

  -- Members live in a DIFFERENT wave require an explicit move flag.
  IF NOT v_allow_moves AND EXISTS (
    SELECT 1
    FROM public.app_rollout_wave_members AS member
    JOIN staged_resolved AS staged ON staged.user_id = member.user_id
    WHERE member.superseded_at IS NULL
      AND member.wave_id <> v_wave_id
  ) THEN
    RAISE EXCEPTION
      'rollout_wave_load_members_live_in_other_wave (rerun with -v allow_moves=true to move them)';
  END IF;

  UPDATE public.app_rollout_wave_members AS member
  SET superseded_at = now()
  FROM staged_resolved AS staged
  WHERE member.user_id = staged.user_id
    AND member.superseded_at IS NULL
    AND member.wave_id <> v_wave_id;
  GET DIAGNOSTICS v_moved = ROW_COUNT;

  -- Reconcile direction 1: a removed EA must stop counting, loudly.
  UPDATE public.app_rollout_wave_members AS member
  SET superseded_at = now()
  WHERE member.wave_id = v_wave_id
    AND member.superseded_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM staged_resolved AS staged
      WHERE staged.user_id = member.user_id
    );
  GET DIAGNOSTICS v_superseded = ROW_COUNT;

  -- Reconcile direction 2: insert live rows for staged users not yet live in W.
  INSERT INTO public.app_rollout_wave_members (user_id, wave_id, source_note)
  SELECT staged.user_id, v_wave_id, v_source_note
  FROM staged_resolved AS staged
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.app_rollout_wave_members AS member
    WHERE member.user_id = staged.user_id
      AND member.wave_id = v_wave_id
      AND member.superseded_at IS NULL
  );
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- Final assert: live membership of W equals the staged set exactly.
  IF EXISTS (
    (SELECT member.user_id
     FROM public.app_rollout_wave_members AS member
     WHERE member.wave_id = v_wave_id AND member.superseded_at IS NULL
     EXCEPT
     SELECT staged.user_id FROM staged_resolved AS staged)
    UNION ALL
    (SELECT staged.user_id FROM staged_resolved AS staged
     EXCEPT
     SELECT member.user_id
     FROM public.app_rollout_wave_members AS member
     WHERE member.wave_id = v_wave_id AND member.superseded_at IS NULL)
  ) THEN
    RAISE EXCEPTION 'rollout_wave_load_reconciliation_mismatch';
  END IF;

  RAISE NOTICE 'wave "%": staged=% inserted=% superseded_absent=% moved_from_other_waves=%',
    v_wave_name, v_staged_count, v_inserted, v_superseded, v_moved;
END;
$load$;

COMMIT;
```

- [ ] **Step 3: Write the README and gitignore entry**

`scripts/rollout-waves/README.md`: document the two scripts' usage exactly as their headers show, the deploy-order rule (loader runs only AFTER the Task 1 migration is applied and AFTER Jim signs off the review CSVs + launch dates), the re-run semantics (loader is idempotent for an unchanged manifest: 0 inserted / 0 superseded), the move semantics (`allow_moves=true` supersedes the other wave's row and inserts into the target — history preserved), and the single-flight rule (loads serialize on advisory lock `(815001, 0)`; a concurrent load aborts immediately with `rollout_wave_load_concurrent_load_in_progress` — rerun after the other load finishes). Append `scripts/rollout-waves/manifests/` to the repo `.gitignore` with a comment `# wave manifests contain emails — never commit`.

- [ ] **Step 4: Syntax-smoke the loader locally**

If the local Supabase stack is running (`supabase status` from the worktree; else skip — Task 5 proves behavior): run the loader against the local DB with a throwaway one-line manifest of a nonexistent email and confirm it aborts with `rollout_wave_load_unresolved_entries` and leaves no rows:

```bash
cd scripts/rollout-waves && mkdir -p manifests
echo 'nobody@example.invalid' > manifests/smoke.csv
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -v wave_name='Smoke Wave' -v launch_date='2026-01-01' \
  -v source_note='smoke' -v allow_moves='false' \
  -v manifest_path='manifests/smoke.csv' -f load-wave-manifest.sql
```

Expected: ERROR `rollout_wave_load_unresolved_entries` (transaction rolled back — `SELECT COUNT(*) FROM public.app_rollout_waves WHERE name = 'Smoke Wave'` returns 0). Delete `manifests/smoke.csv`.

- [ ] **Step 5: Commit**

```bash
git add scripts/rollout-waves/ .gitignore
git commit -m "feat(waves): add manifest generator and reconciling wave loader"
```

---

### Task 5: Postgres behavioral harness + post-apply verification for waves/app_events

**Files:**
- Create: `scripts/rollout-waves-postgres-harness.cjs`
- Create: `supabase/verification/rollout-waves-post-apply-verification.sql`
- Modify: `scripts/wave2-combined-postgres-release-harness.cjs` (register the new harness after the `MOBILE_OPERATIONAL_REPORTING` entry, same descriptor pattern)
- Read first: `scripts/mobile-operational-reporting-postgres-harness.cjs` (the model to follow: psql spawn helper, localhost refusal, env-var gating, fixture style, JSON summary line)

Repo/branch: same as Task 1. Depends on Tasks 1–4.

**Interfaces:**
- Consumes: tables (Task 1), app_events (Task 2), RPC (Task 3), loader (Task 4) — all by their exact names.
- Produces: `MOBILE_ROLLOUT_WAVES` descriptor in the combined harness; a green run is the behavioral gate for the whole Supabase stack of this plan.

- [ ] **Step 1: Write the harness**

`scripts/rollout-waves-postgres-harness.cjs`, cloned structurally from `mobile-operational-reporting-postgres-harness.cjs` (same env vars `MOBILE_OPERATIONAL_REPORTING_DATABASE_URL` + `MOBILE_OPERATIONAL_REPORTING_DISPOSABLE_CONFIRM=I_UNDERSTAND_THIS_IS_DISPOSABLE`, same localhost-only refusal, same randomUUID fixture + zero-residue teardown). It must assert, in order:

1. **Loader initial load:** write a temp manifest of 3 fixture auth users (2 by uuid, 1 by email) under a DYNAMICALLY named temp directory (`fs.mkdtempSync` — proves the manifest_path plumbing actually resolves, catching any literal-path/interpolation regression; round-5 finding), run `load-wave-manifest.sql` via psql for wave `Harness Wave A` / launch `2026-08-01`; assert 3 live rows, `source_note` recorded, wave row created.
2. **Idempotent re-run:** same manifest again → NOTICE reports `inserted=0 superseded_absent=0`; still 3 live rows, still 3 total rows (no duplicate inserts).
3. **Absent-member supersede:** manifest with only 2 of the 3 → 2 live, 1 superseded (superseded_at NOT NULL), 3 total rows.
4. **Unresolved abort:** manifest containing a misspelled email → psql exits nonzero with `rollout_wave_load_unresolved_entries`; live membership unchanged.
5. **Ambiguity abort:** manifest containing an email held by two fixture auth users (create the duplicate-email pair in the fixture; GoTrue does not enforce email uniqueness at the SQL layer) → abort `rollout_wave_load_unresolved_entries`.
6. **Cross-wave guard:** load one of Wave A's users into `Harness Wave B` with `allow_moves=false` → abort `rollout_wave_load_members_live_in_other_wave`; with `allow_moves=true` → user moves (A row superseded, B row live), and Wave A's next full-manifest load must be run to keep A reconciled (assert the loader's final-assert catches A now being stale only when A is reloaded — i.e. reload A's original manifest and expect `rollout_wave_load_reconciliation_mismatch` NOT to fire; the moved user is simply superseded-absent on that reload).
7. **Single-flight loader lock:** in a SECOND psql connection, open a transaction and take the lock (`BEGIN; SELECT pg_advisory_xact_lock(815001, 0);`, connection held open); run the loader in the primary connection → it aborts immediately with `rollout_wave_load_concurrent_load_in_progress` and membership is unchanged; close the second connection; rerun the loader → succeeds. (Deterministic serialization proof — the mechanism, not a timing race.)
8. **Immutability trigger:** direct `UPDATE … SET assigned_at = now()` on a live row → error `app_rollout_wave_members_only_supersede_transition_allowed`; `DELETE` → `app_rollout_wave_members_rows_are_append_only`; `UPDATE … SET superseded_at = NULL` on a superseded row → error; `UPDATE … SET superseded_at = now()` on a live row → allowed.
9. **record_app_open behavior:** using `SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub = '<fixture uuid>'` (mirror how the existing harness impersonates authenticated callers): first call `record_app_open('1.1.1', 'ios')` → one row with the derived `user_id`; immediate second call → still exactly one row (rate bound); call with a 100-char version string → stored value is 64 chars; call with platform `'web'` → row stored with `platform NULL`; call with no jwt claim (unauthenticated) → raises `record_app_open_requires_authentication`; direct `INSERT INTO public.app_events …` as authenticated → permission denied; `SELECT` as authenticated → permission denied; `SELECT` via the default service connection → succeeds. Then clear the rate window for the reporting fixture by seeding the second `app_open` row directly via the service connection with an explicit older `occurred_at`.
9b. **record_app_open concurrency proof (round-2 finding):** for a FRESH fixture user, spawn a background psql running one transaction `BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub = '<uuid>'; SELECT public.record_app_open('1.1.1','ios'); SELECT pg_sleep(2); COMMIT;` and, while it sleeps, run the same call for the same user from the primary connection. The second call blocks on the per-user advisory lock until the first commits, then its rate-bound EXISTS sees the committed row. After both complete, assert EXACTLY one `app_open` row exists for that user.
10. **RPC fields:** seed `app_events` rows (two `app_open` for one user — see case 9), an invalidated push token for a second user (`invalidated_at = now()`, no live token), lifetime activity older than the window (a `time_entries` row 60 days back), then call `mobile_user_health_domain_v2(7, NULL, ARRAY[…])` and assert for the relevant users: `wave.name = 'Harness Wave A'`; `wave_options` lists both harness waves ordered by launch_date; user with no wave has `"wave": null`; `first/last_app_open_at` match the seeded min/max; invalidated-token user has `app_device.registered = false` but `ever_registered_device = true`; out-of-window-activity user has `activity.clock_entries = 0` (windowed) but non-null `first/last_ever_activity_at`; `last_ever_activity_at >= last_activity_at` for every user with windowed activity.
10a. **v1 untouched (round-6 finding, rollback contract):** with the full Part B fixture in place (waves loaded, app_events seeded), call the ORIGINAL `mobile_user_health_domain(7, NULL, ARRAY[…])` and assert its payload still has NO `wave_options`, NO `supplemental_users`, and user rows WITHOUT any of the six Part B keys — the pre-Part-B Django release must be able to consume v1 unchanged at any time.
10b. **Auth-only supplemental evidence (round-3 finding):** include in the fixture one auth user whose `staff_identity_links` row does NOT qualify for `identity_population` (set its `role` to a non-`'ea'` value and create no `education_assistants` row — mirrors a self-setup ECD account), give it a wave membership (loader or direct service insert) and an `app_open` row, and pass its uuid in `p_included_user_ids`. Assert: it is ABSENT from `users[]`; `supplemental_users` contains exactly one entry for it carrying `wave.name`, `ever_registered_device`, and the `first/last_app_open_at` values; and every `supplemental_users[].user_id` is disjoint from `users[].user_id`.
11. **Zero residue** after teardown (including `app_events`, `app_rollout_waves`, `app_rollout_wave_members`).

Emit the same single JSON summary line shape as the sibling harness.

- [ ] **Step 2: Write the post-apply verification SQL**

`supabase/verification/rollout-waves-post-apply-verification.sql`, mirroring `mobile-operational-reporting-post-apply-verification.sql` (a `BEGIN;`-only script of `DO` assertions that never commits): assert both wave tables AND `app_events` exist with RLS enabled and zero policies; the partial unique index, the wave_id index, and `app_events_user_event_occurred_idx` exist; the trigger `app_rollout_wave_members_immutable` exists with `tgtype` covering UPDATE and DELETE; `mobile_user_health_domain` still has exactly 2 overloads and the 3-arg v1 overload's `prosrc` contains NONE of `app_rollout_wave_members` / `app_events` / `wave_options` (proves v1 is byte-untouched — it is the Django rollback target); `mobile_user_health_domain_v2(INTEGER, UUID, UUID[])` exists with exactly 1 overload, `prosecdef = false`, `search_path` proconfig set, service_role EXECUTE, and `prosrc` containing `app_rollout_wave_members`, `app_events`, `wave_options`, and `supplemental_users`; `record_app_open(TEXT, TEXT)` exists with `prosecdef = true`, `search_path` proconfig set, EXECUTE for `authenticated` and NOT for `anon`/`service_role`; authenticated has zero table privileges on `app_events` and on both wave tables.

- [ ] **Step 3: Register in the combined harness**

In `scripts/wave2-combined-postgres-release-harness.cjs`, add a descriptor entry after `MOBILE_OPERATIONAL_REPORTING` (copy its shape exactly): `descriptorKey: 'MOBILE_ROLLOUT_WAVES'`, script `rollout-waves-postgres-harness.cjs`, and add `supabase/verification/rollout-waves-post-apply-verification.sql` to the post-apply verification list where the two existing verification files run.

- [ ] **Step 4: Run the proof**

Run: `npm run verify:wave2:combined-postgres` with the env the repo documents for it (`WAVE2_RELEASE_ADMIN_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`, `WAVE2_RELEASE_DATABASE_NAME=wave2_release_check`, `WAVE2_RELEASE_DISPOSABLE_CONFIRM` per the script's required value — read the script header for exact names; start the local stack with `supabase start` first if needed).
Expected: exit 0; the new `MOBILE_ROLLOUT_WAVES` section green; existing sections still green (proves the migration chain including the three new files applies cleanly from scratch and nothing regressed).

- [ ] **Step 5: Run the full repo contract suite**

Run: `npm test -- __tests__/rolloutWavesAppOpenSqlContract.test.js __tests__/mobileRealUserReportingSqlContract.test.js __tests__/mobileOperationalReportingSqlContract.test.js __tests__/mobileSessionsActivitySqlContract.test.js`
Expected: PASS — the pre-existing contract suites must not regress.

- [ ] **Step 6: Commit**

```bash
git add scripts/rollout-waves-postgres-harness.cjs supabase/verification/rollout-waves-post-apply-verification.sql scripts/wave2-combined-postgres-release-harness.cjs
git commit -m "test(waves): behavioral harness and post-apply verification for waves and app_events"
```

---

### Task 6: Django — tolerant passthrough of wave/lifetime/app_open fields

**Files:**
- Modify: `api/mobile/reports.py` (schema `$defs` ~line 481, top-level schema ~line 594, `_validate_health_domain_payload` ~line 668, `_empty_domain_user` ~line 847, `_build_user_health_payload` ~line 949, `fetch_user_health` ~line 1031 — RPC name)
- Modify: `api/services/mobile_notifications.py` (`ALLOWED_REPORTING_RPCS` ~lines 19–32 — add the v2 entry)
- Modify: `api/tests_mobile_operational_reports.py` (fixture builders ~line 84, `MobileUserHealthReportTests` ~line 259, and the existing `assert_has_calls` RPC-name expectations)
- Modify: `documentation/mobile-app-reporting-configuration.md` (prose contract, ~lines 70–95)

Repo: `/Users/jimmckeown/Development/zazi-mobile-clock-reporting-django`, branch `feat/mobile-rollout-waves`.

**Interfaces:**
- Consumes: `mobile_user_health_domain_v2` from Task 3 (deployed BEFORE this Django release per the round-6 rollback ordering; the optional-field tolerance is defensive, not a deploy state).
- Produces: the "Response contract after Part B" exactly — every user row always carries the six keys (null when unknown), top level always carries `wave_options` (default `[]`). Task 7's zod schema depends on this.

- [ ] **Step 1: Write the failing tests**

Add to `api/tests_mobile_operational_reports.py`. Extend `user_health_domain_payload()` with an OPTIONAL richer builder rather than changing the default (the default builder becomes the "legacy RPC" fixture — that asymmetry is itself a test asset). Add module constant `WAVE_PRIMARY_ID = "aaaaaaaa-0000-4000-8000-000000000001"` and `WAVE_ECD_ID = "aaaaaaaa-0000-4000-8000-000000000002"`. New builder:

```python
def part_b_user_fields(*, wave=None):
    # last_ever_activity_at must COVER the default fixture row's windowed
    # last_activity_at (2026-08-11T10:00:00+00:00) or the new lifetime
    # invariant rejects the "valid" fixture (round-5 adversarial finding).
    # Equal is allowed; derive rather than guess if the fixture changes.
    return {
        "wave": wave,
        "first_ever_activity_at": "2026-05-01T08:00:00+00:00",
        "last_ever_activity_at": "2026-08-11T10:00:00+00:00",
        "ever_registered_device": True,
        "first_app_open_at": "2026-08-09T06:45:00+00:00",
        "last_app_open_at": "2026-08-11T06:45:00+00:00",
    }


def primary_wave():
    return {
        "id": WAVE_PRIMARY_ID,
        "name": "ZZ Primary 2026",
        "launch_date": "2026-08-08",
    }


def ecd_wave():
    return {
        "id": WAVE_ECD_ID,
        "name": "ZZ ECD 2026",
        "launch_date": "2026-08-11",
    }
```

New tests (all in `MobileUserHealthReportTests`; use the existing `reporting_client(...)` fake and `assertRaisesRegex(MobileReportingError, "^mobile reporting service unavailable$")` convention):

```python
def test_wave_lifetime_and_app_open_fields_pass_through(self):
    payload = user_health_domain_payload()
    payload["users"][0].update(part_b_user_fields(wave=primary_wave()))
    payload["wave_options"] = [primary_wave(), ecd_wave()]
    client = reporting_client(payload)

    result = fetch_user_health(days=30, school_id=None, client=client)

    self.assertEqual(result["wave_options"], [primary_wave(), ecd_wave()])
    seeded = next(u for u in result["users"] if u["user_id"] == SEEDED_USER_ID)
    self.assertEqual(seeded["wave"], primary_wave())
    self.assertEqual(seeded["last_ever_activity_at"], "2026-08-11T10:00:00+00:00")
    self.assertIs(seeded["ever_registered_device"], True)
    self.assertEqual(seeded["last_app_open_at"], "2026-08-11T06:45:00+00:00")

def test_legacy_domain_payload_normalizes_part_b_fields_to_null(self):
    client = reporting_client(user_health_domain_payload())

    result = fetch_user_health(days=30, school_id=None, client=client)

    self.assertEqual(result["wave_options"], [])
    for user in result["users"]:
        self.assertIsNone(user["wave"])
        self.assertIsNone(user["first_ever_activity_at"])
        self.assertIsNone(user["last_ever_activity_at"])
        self.assertIsNone(user["ever_registered_device"])
        self.assertIsNone(user["first_app_open_at"])
        self.assertIsNone(user["last_app_open_at"])

def test_wave_options_must_be_ordered_and_cover_user_waves(self):
    for mutate in (
        lambda p: p.__setitem__("wave_options", [ecd_wave(), primary_wave()]),  # unordered
        lambda p: p.__setitem__("wave_options", [primary_wave(), primary_wave()]),  # duplicate id
        lambda p: (
            p["users"][0].update(part_b_user_fields(wave=ecd_wave())),
            p.__setitem__("wave_options", [primary_wave()]),  # user wave not in options
        ),
    ):
        with self.subTest(mutate=mutate):
            payload = user_health_domain_payload()
            mutate(payload)
            client = reporting_client(payload)
            with self.assertRaisesRegex(
                MobileReportingError, "^mobile reporting service unavailable$"
            ):
                fetch_user_health(days=30, school_id=None, client=client)

def test_part_b_baseline_fixture_validates(self):
    # Guard for the negative cases below: the UNMUTATED Part B payload
    # must pass, so each negative case fails for its own mutation and
    # not for a broken baseline (round-5 adversarial finding).
    payload = user_health_domain_payload()
    payload["users"][0].update(part_b_user_fields())
    payload["wave_options"] = []
    client = reporting_client(payload)

    result = fetch_user_health(days=30, school_id=None, client=client)

    self.assertEqual(result["wave_options"], [])

def test_lifetime_and_app_open_invariants_fail_closed(self):
    def with_fields(**overrides):
        payload = user_health_domain_payload()
        payload["users"][0].update({**part_b_user_fields(), **overrides})
        payload["wave_options"] = []
        return payload

    # label -> (payload, expected substring of the sanitized error's CAUSE)
    cases = {
        "lifetime pair mismatch": (
            with_fields(first_ever_activity_at=None),
            "lifetime pair mismatch",
        ),
        "lifetime order inverted": (
            with_fields(
                first_ever_activity_at="2026-08-11T00:00:00+00:00",
                last_ever_activity_at="2026-05-01T00:00:00+00:00",
            ),
            "lifetime order inverted",
        ),
        "app_open pair mismatch": (
            with_fields(last_app_open_at=None),
            "app_open pair mismatch",
        ),
        "windowed activity without lifetime cover": (
            with_fields(first_ever_activity_at=None, last_ever_activity_at=None),
            "lifetime must cover windowed activity",
        ),
        "registered device without ever flag": (
            with_fields(ever_registered_device=False),
            "registered device must imply ever registered",
        ),
    }
    for label, (payload, expected_cause) in cases.items():
        with self.subTest(label=label):
            client = reporting_client(payload)
            with self.assertRaisesRegex(
                MobileReportingError, "^mobile reporting service unavailable$"
            ) as caught:
                fetch_user_health(days=30, school_id=None, client=client)
            # The public message is sanitized; the specific reason rides
            # the exception chain. Pin it so each case proves ITS rule.
            self.assertIn(expected_cause, str(caught.exception.__cause__))

def test_lifetime_fields_are_independent_of_the_window(self):
    # Lifetime evidence with ZERO windowed activity must validate: the
    # _ever_ fields sit OUTSIDE the count<->timestamp invariant.
    payload = user_health_domain_payload(days=7)
    user = payload["users"][0]
    user["activity"] = {
        "clock_entries": 0,
        "sessions": 0,
        "app_assessments": 0,
        "last_clock_in_at": None,
        "last_session_at": None,
        "last_app_assessment_at": None,
        "last_activity_at": None,
    }
    user.update(part_b_user_fields())
    payload["wave_options"] = []
    client = reporting_client(payload)

    result = fetch_user_health(days=7, school_id=None, client=client)

    row = next(u for u in result["users"] if u["user_id"] == SEEDED_USER_ID)
    self.assertEqual(row["last_ever_activity_at"], "2026-08-11T10:00:00+00:00")
    self.assertEqual(row["activity"]["clock_entries"], 0)

def test_auth_only_wave_member_keeps_wave_and_evidence(self):
    # Round-3 adversarial finding: the ECD manifest assigns auth accounts
    # that have no qualifying staff_identity_links row; their wave and
    # app_open/device/lifetime evidence ride supplemental_users and must
    # survive onto the synthesized board row (and its wave denominator).
    payload = user_health_domain_payload()
    payload["wave_options"] = [primary_wave(), ecd_wave()]
    payload["supplemental_users"] = [{
        "user_id": AUTH_ONLY_USER_ID,
        "wave": ecd_wave(),
        "first_ever_activity_at": None,
        "last_ever_activity_at": None,
        "ever_registered_device": True,
        "first_app_open_at": "2026-08-12T05:00:00+00:00",
        "last_app_open_at": "2026-08-12T05:00:00+00:00",
    }]
    client = reporting_client(payload)

    result = fetch_user_health(days=30, school_id=None, client=client)

    auth_only = next(
        u for u in result["users"] if u["user_id"] == AUTH_ONLY_USER_ID
    )
    self.assertEqual(auth_only["current_school"], "Unattributed")
    self.assertEqual(auth_only["wave"], ecd_wave())
    self.assertIs(auth_only["ever_registered_device"], True)
    self.assertEqual(auth_only["last_app_open_at"], "2026-08-12T05:00:00+00:00")
    self.assertNotIn("supplemental_users", result)

def test_supplemental_user_colliding_with_domain_user_fails_closed(self):
    payload = user_health_domain_payload()
    payload["wave_options"] = []
    payload["supplemental_users"] = [{
        "user_id": SEEDED_USER_ID,  # already a domain user
        "wave": None,
        "first_ever_activity_at": None,
        "last_ever_activity_at": None,
        "ever_registered_device": False,
        "first_app_open_at": None,
        "last_app_open_at": None,
    }]
    client = reporting_client(payload)
    with self.assertRaisesRegex(
        MobileReportingError, "^mobile reporting service unavailable$"
    ):
        fetch_user_health(days=30, school_id=None, client=client)
```

Notes for the "windowed activity without lifetime cover" case: the default seeded fixture has windowed activity, so nulling the lifetime pair while the keys are PRESENT must 502 (windowed count > 0 requires a covering non-null `last_ever_activity_at` — but only when the key is present; the legacy test above proves absence stays valid). The "registered device without ever flag" case relies on the default fixture's `app_device.registered` being `True` — verify that when reading the builder; if it is False, flip the override to target a fixture user with a registered device.

- [ ] **Step 2: Run to verify they fail**

Run:
```bash
cd /Users/jimmckeown/Development/zazi-mobile-clock-reporting-django
/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/venv/bin/python manage.py test api.tests_mobile_operational_reports.MobileUserHealthReportTests -v 2
```
Expected: the new tests FAIL (schema rejects unknown properties → `MobileReportingError` raised where success expected, and KeyErrors on missing normalized keys); existing tests PASS.

- [ ] **Step 3: Implement in `api/mobile/reports.py`**

**(a) Schema `$defs`** — add:

```python
"wave": {
    "type": "object",
    "required": ["id", "name", "launch_date"],
    "additionalProperties": False,
    "properties": {
        "id": {"$ref": "#/$defs/uuid"},
        "name": {"type": "string", "minLength": 1},
        "launch_date": {"type": "string", "format": "date"},
    },
},
"nullable_wave": {"anyOf": [{"$ref": "#/$defs/wave"}, {"type": "null"}]},
```

**(b) `domain_user` properties** — add (do NOT touch `required`):

```python
"wave": {"$ref": "#/$defs/nullable_wave"},
"first_ever_activity_at": {"$ref": "#/$defs/nullable_timestamp"},
"last_ever_activity_at": {"$ref": "#/$defs/nullable_timestamp"},
"ever_registered_device": {"type": "boolean"},
"first_app_open_at": {"$ref": "#/$defs/nullable_timestamp"},
"last_app_open_at": {"$ref": "#/$defs/nullable_timestamp"},
```

**(c) Top-level properties** — add (not required):

```python
"wave_options": {
    "type": "array",
    "items": {"$ref": "#/$defs/wave"},
},
"supplemental_users": {
    "type": "array",
    "items": {"$ref": "#/$defs/supplemental_user"},
},
```

with the matching `$defs` entry (all keys required here — the RPC always emits the full shape for each supplemental entry):

```python
"supplemental_user": {
    "type": "object",
    "required": [
        "user_id",
        "wave",
        "first_ever_activity_at",
        "last_ever_activity_at",
        "ever_registered_device",
        "first_app_open_at",
        "last_app_open_at",
    ],
    "additionalProperties": False,
    "properties": {
        "user_id": {"$ref": "#/$defs/uuid"},
        "wave": {"$ref": "#/$defs/nullable_wave"},
        "first_ever_activity_at": {"$ref": "#/$defs/nullable_timestamp"},
        "last_ever_activity_at": {"$ref": "#/$defs/nullable_timestamp"},
        "ever_registered_device": {"type": "boolean"},
        "first_app_open_at": {"$ref": "#/$defs/nullable_timestamp"},
        "last_app_open_at": {"$ref": "#/$defs/nullable_timestamp"},
    },
},
```

**(d) `_validate_health_domain_payload`** — inside the per-user loop, after the existing `last activity mismatch` check, add presence-conditional invariants (the count⟺timestamp invariant above stays untouched — add the comment `# The count<->timestamp invariant deliberately excludes the _ever_ /` `# app_open lifetime fields: they are unwindowed by design.`):

```python
if ("first_ever_activity_at" in user) != ("last_ever_activity_at" in user):
    raise ValueError("lifetime fields must ship together")
if "last_ever_activity_at" in user:
    first_ever = user["first_ever_activity_at"]
    last_ever = user["last_ever_activity_at"]
    if (first_ever is None) != (last_ever is None):
        raise ValueError("lifetime pair mismatch")
    if first_ever is not None and (
        _parse_timestamp(first_ever) > _parse_timestamp(last_ever)
    ):
        raise ValueError("lifetime order inverted")
    if expected_last_activity is not None and (
        last_ever is None
        or _parse_timestamp(last_ever) < expected_last_activity
    ):
        raise ValueError("lifetime must cover windowed activity")
if "ever_registered_device" in user:
    if user["app_device"]["registered"] and user["ever_registered_device"] is not True:
        raise ValueError("registered device must imply ever registered")
if ("first_app_open_at" in user) != ("last_app_open_at" in user):
    raise ValueError("app_open fields must ship together")
if "last_app_open_at" in user:
    first_open = user["first_app_open_at"]
    last_open = user["last_app_open_at"]
    if (first_open is None) != (last_open is None):
        raise ValueError("app_open pair mismatch")
    if first_open is not None and (
        _parse_timestamp(first_open) > _parse_timestamp(last_open)
    ):
        raise ValueError("app_open order inverted")
```

After the user loop, add the top-level wave checks:

```python
if "wave_options" in payload:
    wave_options = payload["wave_options"]
    option_ids = [option["id"] for option in wave_options]
    if len(option_ids) != len(set(option_ids)):
        raise ValueError("duplicate wave option")
    launch_dates = [
        datetime.date.fromisoformat(option["launch_date"])
        for option in wave_options
    ]
    if launch_dates != sorted(launch_dates):
        raise ValueError("wave options out of order")
    known_wave_ids = set(option_ids)
    for user in payload["users"]:
        wave = user.get("wave")
        if wave is not None and wave["id"] not in known_wave_ids:
            raise ValueError("user wave missing from wave_options")
else:
    for user in payload["users"]:
        if user.get("wave") is not None:
            raise ValueError("user wave present without wave_options")

if "supplemental_users" in payload:
    domain_user_ids = {user["user_id"] for user in payload["users"]}
    supplemental_ids = set()
    for entry in payload["supplemental_users"]:
        if entry["user_id"] in domain_user_ids:
            raise ValueError("supplemental user collides with domain user")
        if entry["user_id"] in supplemental_ids:
            raise ValueError("duplicate supplemental user")
        supplemental_ids.add(entry["user_id"])
        first_ever = entry["first_ever_activity_at"]
        last_ever = entry["last_ever_activity_at"]
        if (first_ever is None) != (last_ever is None):
            raise ValueError("supplemental lifetime pair mismatch")
        if first_ever is not None and (
            _parse_timestamp(first_ever) > _parse_timestamp(last_ever)
        ):
            raise ValueError("supplemental lifetime order inverted")
        first_open = entry["first_app_open_at"]
        last_open = entry["last_app_open_at"]
        if (first_open is None) != (last_open is None):
            raise ValueError("supplemental app_open pair mismatch")
        if first_open is not None and (
            _parse_timestamp(first_open) > _parse_timestamp(last_open)
        ):
            raise ValueError("supplemental app_open order inverted")
        wave = entry["wave"]
        if wave is not None:
            if "wave_options" not in payload:
                raise ValueError("supplemental wave present without wave_options")
            if wave["id"] not in known_wave_ids:
                raise ValueError("supplemental wave missing from wave_options")
```

(`known_wave_ids` is defined in the `wave_options` branch above; guard the reference as shown — a supplemental wave with no `wave_options` key is itself the error.)

(Import `datetime` if the module does not already import it — check the imports at the top of `reports.py` and follow its existing style, e.g. `from datetime import date` → `date.fromisoformat`.)

**(e) Normalization helper** — add next to `_empty_domain_user`:

```python
def _with_part_b_defaults(user):
    return {
        **user,
        "wave": user.get("wave"),
        "first_ever_activity_at": user.get("first_ever_activity_at"),
        "last_ever_activity_at": user.get("last_ever_activity_at"),
        "ever_registered_device": user.get("ever_registered_device"),
        "first_app_open_at": user.get("first_app_open_at"),
        "last_app_open_at": user.get("last_app_open_at"),
    }
```

**(f) `_empty_domain_user`** — add the six keys with `None` values (after `"current_school": "Unattributed",`):

```python
"wave": None,
"first_ever_activity_at": None,
"last_ever_activity_at": None,
"ever_registered_device": None,
"first_app_open_at": None,
"last_app_open_at": None,
```

**(g) `_build_user_health_payload`** — ⚠️ the RPC payload parameter inside THIS function is named **`domain_payload`** (the validator's parameter is `payload` — the snippets in (d) are correct as written; do not blindly reuse names across functions, and verify both against the live source before editing; round-4 finding — writing `payload` here is a `NameError` on every request). Wrap every domain-derived user row with `_with_part_b_defaults(...)` at the point where domain rows are merged with auth evidence (the same place `_with_provisioning_auth_evidence` is applied — apply `_with_part_b_defaults` FIRST, then the auth wrapper, so ordering of dict keys stays stable). Near the top of the function build:

```python
supplemental_by_user_id = {
    entry["user_id"]: entry
    for entry in domain_payload.get("supplemental_users", [])
}
```

For SYNTHESIZED auth-only rows, rewrite the existing `_empty_domain_user` call site so wave/evidence survive for accounts with no identity row (round-3 finding). The live line is:

```python
domain_user = domain_by_id.get(user_id) or _empty_domain_user(user_id, auth_user["display_name"])
```

Replace it with exactly:

```python
domain_user = domain_by_id.get(user_id)
if domain_user is None:
    domain_user = _empty_domain_user(user_id, auth_user["display_name"])
    supplement = supplemental_by_user_id.get(user_id)
    if supplement is not None:
        domain_user.update(
            {key: value
             for key, value in supplement.items()
             if key != "user_id"}
        )
```

The SAME `domain_user` object then continues through the existing pipeline unchanged — `_with_part_b_defaults(domain_user)` first, then `_with_provisioning_auth_evidence(...)`, then the append to the users list — so the merged evidence reaches the response (the auth-only regression asserts it there). If the live line differs from the quoted form, stop and reconcile against the actual source before editing. Add to the returned top-level dict, after `"school_options"`:

```python
"wave_options": domain_payload.get("wave_options", []),
```

(`supplemental_users` itself is NOT forwarded to the frontend — it is consumed here.) Both the legacy-payload test and the auth-only supplemental test already exercise the full `fetch_user_health` path, so a naming slip here fails loudly in Step 4.

**(h) Switch the RPC name to v2 (round-6 rollback design).** In `fetch_user_health`, change the reporting call from `"mobile_user_health_domain"` to `"mobile_user_health_domain_v2"` (same three args). In `api/services/mobile_notifications.py`, add to `ALLOWED_REPORTING_RPCS`:

```python
"mobile_user_health_domain_v2": {"p_days", "p_school_id", "p_included_user_ids"},
```

(keep the existing v1 entry — it is dead code for this release but harmless, and deleting it would churn the rollback diff). Update the existing `assert_has_calls` expectations in `test_health_report_joins_auth_and_domain_users_and_recomputes_summary` (and any other test pinning the RPC name) to `call("mobile_user_health_domain_v2", {...})` — those tests failing on the name is the RED step for this change.

The report-layer tests use a MOCKED client, so they cannot catch a missing allowlist entry — the real `SupabaseNotificationClient.rpc()` rejects unallowlisted functions BEFORE any network request (round-7 finding). Add a runtime-boundary regression to `api/tests_mobile_reports.py`, next to its existing allowlist-boundary tests (`test_unallowlisted_function_is_rejected_before_network` is the model — copy its network-mocking approach):

```python
def test_user_health_v2_rpc_is_admitted_with_exact_args(self):
    # The real client boundary must admit the v2 call fetch_user_health
    # makes; a mocked-client suite passes even if this allowlist entry is
    # missing, which would 502 every request in production.
    # Mock the HTTP layer exactly as the neighboring allowlist tests do,
    # call SupabaseNotificationClient.rpc(
    #     "mobile_user_health_domain_v2",
    #     {"p_days": 30, "p_school_id": None, "p_included_user_ids": []},
    # ), and assert the request is issued (no allowlist rejection).
```

(Write it as a real test following that file's conventions; the comment block above states the required behavior, not literal code.)

- [ ] **Step 4: Run the suite to verify green**

Run: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/venv/bin/python manage.py test api.tests_mobile_operational_reports -v 2`
Expected: PASS, including all pre-existing tests (the summary in `test_health_report_joins_auth_and_domain_users_and_recomputes_summary` is unchanged — summaries do not read the new fields).

Also run the sibling mobile suite to prove no contract drift: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/venv/bin/python manage.py test api.tests_mobile_reports -v 2` → PASS.

- [ ] **Step 5: Update the prose contract**

In `documentation/mobile-app-reporting-configuration.md`, extend the user-health section: list the six new per-user fields + `wave_options` with the exact semantics from the "Response contract after Part B" block (including that Django reads `mobile_user_health_domain_v2` while v1 stays untouched as the rollback target, and "null means unknown, never 'no'"), and REPLACE the sentence claiming `last_sign_in_at` alone cannot prove a mobile-app login with: it still cannot — but `first/last_app_open_at` (client-emitted `app_events`) now CAN prove the app was opened by a signed-in user, once the mobile OTA ships; absence of app_open evidence is not absence of use for devices that have not yet applied the OTA update.

- [ ] **Step 6: Commit**

```bash
git add api/mobile/reports.py api/services/mobile_notifications.py api/tests_mobile_operational_reports.py api/tests_mobile_reports.py documentation/mobile-app-reporting-configuration.md
git commit -m "feat(api): read user-health v2 with wave, lifetime, and app_open passthrough"
```

---

### Task 7: Frontend — schema, types, fixtures for the new contract

**Files:**
- Modify: `lib/mobile/user-health/schema.ts`, `lib/mobile/user-health/types.ts`, `lib/mobile/user-health/test-fixtures.ts`
- Modify: `lib/mobile/user-health/response.test.ts` (or wherever schema acceptance is pinned — check `response.test.ts` + `presentation.test.ts` imports of the fixture)

Repo: `/Users/jimmckeown/Development/zazi-mobile-clock-reporting-nextjs/.worktrees/mobile-ops`, branch `feat/mobile-rollout-waves`.

**Interfaces:**
- Consumes: Django's normalized contract (Task 6): six per-user keys always present but nullable; `wave_options` always present (possibly `[]`). Model them as OPTIONAL+nullable in zod anyway (`.nullable().optional()`) so a not-yet-redeployed Django cannot 502 the board.
- Produces: `MobileRolloutWave` type `{id: string; name: string; launch_date: string}`; `MobileUserHealthRow` gains `wave?: MobileRolloutWave | null; first_ever_activity_at?: string | null; last_ever_activity_at?: string | null; ever_registered_device?: boolean | null; first_app_open_at?: string | null; last_app_open_at?: string | null`; `MobileUserHealthResponse` gains `wave_options?: MobileRolloutWave[]`. Tasks 8–9 import these names.

- [ ] **Step 1: Write the failing tests**

In `response.test.ts` (follow its existing decode-success/decode-failure pattern with `VALID_MOBILE_USER_HEALTH_PAYLOAD`):

```ts
test("decoding RETAINS wave, lifetime, and app_open values exactly", () => {
  const payload = structuredClone(VALID_MOBILE_USER_HEALTH_PAYLOAD);
  const primaryWave = {
    id: "aaaaaaaa-0000-4000-8000-000000000001",
    name: "ZZ Primary 2026",
    launch_date: "2026-08-08",
  };
  payload.wave_options = [primaryWave];
  payload.users[0].wave = primaryWave;
  payload.users[0].first_ever_activity_at = "2026-05-01T08:00:00+00:00";
  payload.users[0].last_ever_activity_at =
    payload.users[0].activity.last_activity_at ?? "2026-08-10T11:30:00+00:00";
  payload.users[0].ever_registered_device = true;
  payload.users[0].first_app_open_at = "2026-08-09T06:45:00+00:00";
  payload.users[0].last_app_open_at = "2026-08-11T06:45:00+00:00";
  const parsed = mobileUserHealthSchema.parse(payload);
  // Value-retention assertions are the point: plain z.object STRIPS unknown
  // keys, so a schema that omits (or misspells) a field passes a bare
  // "decodes successfully" check while silently dropping production data.
  assert.deepEqual(parsed.wave_options, [primaryWave]);
  assert.deepEqual(parsed.users[0].wave, primaryWave);
  assert.equal(parsed.users[0].first_ever_activity_at, "2026-05-01T08:00:00+00:00");
  assert.equal(parsed.users[0].ever_registered_device, true);
  assert.equal(parsed.users[0].first_app_open_at, "2026-08-09T06:45:00+00:00");
  assert.equal(parsed.users[0].last_app_open_at, "2026-08-11T06:45:00+00:00");
});

test("accepts the pre-wave legacy payload unchanged", () => {
  // VALID_MOBILE_USER_HEALTH_PAYLOAD without any new key must still parse
});

test("rejects inverted lifetime bounds", () => {
  // first_ever_activity_at after last_ever_activity_at -> parse failure
});

test("rejects one-sided lifetime and app_open nullity", () => {
  // first_ever_activity_at null + last_ever_activity_at non-null -> failure
  // first_app_open_at non-null + last_app_open_at null -> failure
});

test("rejects inverted app_open bounds", () => {
  // first_app_open_at after last_app_open_at -> parse failure
});

test("rejects a user wave missing from wave_options", () => {
  // user.wave set, wave_options: [] -> parse failure
});

test("rejects a registered device that claims never-registered", () => {
  // app_device.registered true + ever_registered_device false -> failure
});
```

Write these as real tests against `mobileUserHealthSchema.parse`/`safeParse` (the same entry point the existing schema-acceptance tests use — check how `response.test.ts` currently exercises the schema and follow it).

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test:mobile`
Expected: new tests FAIL for the RIGHT reasons — the retention test fails because plain `z.object` silently strips the unknown keys (parsed output has `undefined`, not the values); the rejection tests fail because parse currently succeeds (fields stripped, no superRefine rules yet). The legacy-payload test passes from the start (that is expected — it pins backward compatibility, not new behavior).

- [ ] **Step 3: Implement**

`types.ts`:

```ts
export interface MobileRolloutWave {
  id: string;
  name: string;
  launch_date: string;
}
```

plus the optional fields on `MobileUserHealthRow` / `MobileUserHealthResponse` exactly as the Interfaces block above.

`schema.ts`:

```ts
const waveSchema = z.object({
  id: uuid,
  name: z.string().min(1),
  launch_date: z.iso.date(),
});
```

Per-user additions: `wave: waveSchema.nullable().optional()`, the four timestamps as `absoluteTimestamp.nullable().optional()`, `ever_registered_device: z.boolean().nullable().optional()`. Top level: `wave_options: z.array(waveSchema).optional()`.

In the `superRefine`, add per-user checks mirroring Django (Task 6d) — pair-nullity and ordering for the lifetime pair and app_open pair; `last_activity_at` (when non-null) must be `<=` `last_ever_activity_at` when the lifetime key is present non-null, and windowed activity with a present-but-null lifetime pair is an issue; `app_device.registered && ever_registered_device === false` is an issue; every non-null `user.wave.id` must appear in `wave_options` when `wave_options` is present, and `wave_options` must be sorted by `(launch_date, name.toLowerCase(), id)` with unique ids. Issue paths follow the existing style (`["users", index, "last_ever_activity_at"]` etc.).

`test-fixtures.ts`: extend `VALID_MOBILE_USER_HEALTH_PAYLOAD` — add `wave_options` with the two waves ("ZZ Primary 2026" 2026-08-08, "ZZ ECD 2026" 2026-08-11) and give each user coherent new fields (at least: one user in Primary wave with lifetime activity matching their windowed activity, one in ECD, one with `wave: null`, one with `ever_registered_device: true` but `app_device.registered: false` and empty windowed activity but non-null lifetime bounds — that user is the "quiet + token-died" fixture for Tasks 8–9). ADD a FIFTH user whose ONLY evidence is app_open (round-8 finding): `app_device.registered: false`, `ever_registered_device: false`, zero activity, null lifetime bounds, `authenticated_after_provisioning` not `true`, but non-null `first/last_app_open_at` — the direct-open-only case for the stage/board/CSV pins; update the `summary` block so reconciliation stays green (`total_users`, `auth_ready`, etc. — the superRefine recomputes from rows). ALSO export `LEGACY_MOBILE_USER_HEALTH_PAYLOAD`: a deep-cloned variant with every Part B key deleted (no `wave_options`, none of the six per-user keys) — the degraded-mode fixture for Task 9. Keep the summary reconciling in both fixtures (the new fields do not enter any summary count — `needs_attention`/`active_in_window` reconciliation only uses `getUserAttentionReasons`/`hasRecentAppActivity`, which do not change).

- [ ] **Step 4: Run the gates**

Run: `npm run test:mobile` → PASS. `npx tsc --noEmit --incremental false` → clean. `npx eslint lib/mobile/user-health` → clean.

- [ ] **Step 5: Commit**

```bash
git add lib/mobile/user-health/schema.ts lib/mobile/user-health/types.ts lib/mobile/user-health/test-fixtures.ts lib/mobile/user-health/response.test.ts
git commit -m "feat(user-health): model wave, lifetime, and app_open contract fields"
```

---

### Task 8: Frontend — lifetime ratchet stage, quiet predicate, wave day helper

**Files:**
- Modify: `lib/mobile/user-health/presentation.ts`, `lib/mobile/user-health/presentation.test.ts`
- Modify: `lib/mobile/user-health/funnel.ts`, `lib/mobile/user-health/funnel.test.ts`
- Create: `lib/mobile/user-health/wave.ts`, `lib/mobile/user-health/wave.test.ts`

Repo/branch: same as Task 7. Depends on Task 7's types.

**Interfaces:**
- Consumes: Task 7's optional fields.
- Produces: `hasEverUsedApp(user)`, `hasEverRegisteredDevice(user)`, `hasEverOpenedApp(user)`, `isQuiet(user)` in `presentation.ts`; `UserHealthPredicate` union gains `"activated"` and `"quiet"` — **`"active"` keeps its windowed meaning** (`hasRecentAppActivity`), `"activated"` carries the lifetime stage, and `hasEverOpenedApp` feeds the `reached` branch; `FunnelCounts` gains `activated_ever: number` and `opened_app_ever: number` and `device_signal` becomes ratcheted; `getWaveDayNumber(launchDate: string, generatedAt: string): number`, `filterRowsByWave(users, wave: "all" | "none" | string)`, and `hasPartBCapability(response)` in `wave.ts`. Task 9 imports all of these.

- [ ] **Step 1: Write the failing tests**

`presentation.test.ts` additions (build rows via the existing local row-builder helpers in that file — read them first):

```ts
test("stage is a lifetime ratchet: shrinking the window cannot regress active", () => {
  // Row with zero windowed activity counts + null windowed timestamps but
  // last_ever_activity_at set -> getActivityStage === "active"
});

test("stage is a lifetime ratchet: token invalidation cannot regress reached", () => {
  // app_device.registered false, ever_registered_device true, no auth proof,
  // no activity -> getActivityStage === "reached"
});

test("a signed-in app open alone proves reached", () => {
  // No push token ever (notification permission denied), no auth proof,
  // no activity, but last_app_open_at set -> getActivityStage === "reached"
  // (round-8 finding: app_open is reach evidence, never usage evidence —
  // the same row must NOT be "active"/"activated")
});

test("legacy rows without lifetime fields keep their windowed stage", () => {
  // No new fields at all: windowed activity -> active; registered device -> reached
});

test("quiet means activated ever but silent in the window", () => {
  // last_ever_activity_at set + zero windowed counts -> isQuiet true
  // windowed activity present -> isQuiet false
  // never activated -> isQuiet false
});

test("the active predicate stays windowed and excludes quiet rows", () => {
  // A quiet row (lifetime activity, zero windowed counts):
  //   matchesUserHealthPredicate(row, "active") === false
  //   matchesUserHealthPredicate(row, "activated") === true
  //   matchesUserHealthPredicate(row, "quiet") === true
  // A windowed-active row:
  //   "active" === true, "activated" === true, "quiet" === false
});

test("the active predicate count reconciles with the summary tile count", () => {
  // Over the shared fixture's users: rows matching "active" must equal
  // summary.active_in_window — the "Active · Nd" tile links state=active,
  // so its count and its drill-down rows must agree (round-2 finding).
});
```

`funnel.test.ts`: extend the surviving reconciliation test's expectations: `activated_ever` counts rows where `hasEverUsedApp`, `device_signal` counts rows where `hasEverRegisteredDevice` (assert specifically that the fixture user with `ever_registered_device: true` + `registered: false` is counted).

`wave.test.ts`:

```ts
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getWaveDayNumber, filterRowsByWave } from "./wave";

test("wave day number is whole days between launch and generated_at in SAST", () => {
  assert.equal(getWaveDayNumber("2026-08-08", "2026-08-12T10:00:00+02:00"), 4);
  // SAST rollover: 23:30 UTC on the 11th is already the 12th in SAST
  assert.equal(getWaveDayNumber("2026-08-08", "2026-08-11T23:30:00+00:00"), 4);
  assert.equal(getWaveDayNumber("2026-08-08", "2026-08-08T06:00:00+02:00"), 0);
  assert.equal(getWaveDayNumber("2026-08-20", "2026-08-12T10:00:00+02:00"), -8);
});

test("filterRowsByWave narrows to a wave, to no-wave, or passes all", () => {
  // rows from the shared fixture: "all" -> identity; "none" -> wave == null;
  // "<wave id>" -> wave?.id matches
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test:mobile` → new tests FAIL (`wave.ts` missing; ratchet not implemented). NOTE: `test:mobile`'s glob `lib/mobile/*/*.test.ts` already covers `wave.test.ts` — no script change needed.

- [ ] **Step 3: Implement**

`presentation.ts` — replace the stage internals, keeping every exported name:

```ts
export function hasEverUsedApp(user: MobileUserHealthRow): boolean {
  return (
    hasUsageEvidenceInWindow(user) ||
    (user.last_ever_activity_at ?? null) !== null
  );
}

export function hasEverRegisteredDevice(user: MobileUserHealthRow): boolean {
  return user.ever_registered_device === true || user.app_device.registered;
}

export function isQuiet(user: MobileUserHealthRow): boolean {
  return hasEverUsedApp(user) && !hasRecentAppActivity(user);
}

export function hasEverOpenedApp(user: MobileUserHealthRow): boolean {
  return (user.last_app_open_at ?? null) !== null;
}

export function getActivityStage(user: MobileUserHealthRow): ActivityStage {
  if (hasEverUsedApp(user)) return "active";
  if (hasEverRegisteredDevice(user)) return "reached";
  // A signed-in app open proves reach even when no push token ever
  // existed (e.g. notification permission denied) — round-8 finding.
  if (hasEverOpenedApp(user)) return "reached";
  if (user.auth.authenticated_after_provisioning) return "reached";
  return "not_started";
}
```

`UserHealthPredicate` gains `"activated"` and `"quiet"`, and `matchesUserHealthPredicate` becomes explicit about which axis each predicate reads — the old stage-equality fallthrough must NOT silently give `"active"` the new lifetime meaning:

```ts
export function matchesUserHealthPredicate(
  user: MobileUserHealthRow,
  predicate: UserHealthPredicate
): boolean {
  if (predicate === "all") return true;
  if (predicate === "has_blockers") {
    return getUserAttentionReasons(user).length > 0;
  }
  // WINDOWED: "active" is what the "Active · Nd" summary tile links to;
  // its count and drill-down must reconcile with summary.active_in_window.
  if (predicate === "active") return hasRecentAppActivity(user);
  // LIFETIME: the durable stage axis.
  if (predicate === "activated") return getActivityStage(user) === "active";
  if (predicate === "quiet") return isQuiet(user);
  return getActivityStage(user) === predicate; // "reached" | "not_started"
}
```

`hasRecentAppActivity` and `hasUsageEvidenceInWindow` stay exactly as they are (summary reconciliation depends on them).

`funnel.ts` — `FunnelCounts` gains `activated_ever: number` AND `opened_app_ever: number`; the loop counts `hasEverUsedApp(user)` and `hasEverOpenedApp(user)` into them and switches the `device_signal` increment to `hasEverRegisteredDevice(user)` (import all from `./presentation`; delete the drift-prone inline active arithmetic in favor of `hasRecentAppActivity(user)` while in the file — same semantics, one source of truth). Update the header comment: the strip is now the wave-scoped instrument with durable axes.

`wave.ts` also gains the Part B capability probe (round-8 finding — drives the announced degraded mode in Task 9):

```ts
// Part B Django always emits wave_options (possibly []); a legacy payload
// (post-frontend Django rollback) never does. Absence = degrade honestly.
export function hasPartBCapability(
  response: Pick<MobileUserHealthResponse, "wave_options">
): boolean {
  return response.wave_options !== undefined;
}
```

with tests: `wave_options: []` → true; key absent → false.

`wave.ts`:

```ts
import type { MobileRolloutWave, MobileUserHealthRow } from "./types";

export type WaveSelection = "all" | "none" | string;

const SAST_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Johannesburg",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Whole days between the wave launch date and generated_at, both read as
// SAST calendar dates. Launch day is day 0. Negative before launch.
export function getWaveDayNumber(launchDate: string, generatedAt: string): number {
  const generatedSastDate = SAST_DATE_FORMAT.format(new Date(generatedAt));
  return Math.round(
    (Date.parse(generatedSastDate) - Date.parse(launchDate)) / MS_PER_DAY
  );
}

export function filterRowsByWave(
  users: MobileUserHealthRow[],
  wave: WaveSelection
): MobileUserHealthRow[] {
  if (wave === "all") return users;
  if (wave === "none") return users.filter((user) => (user.wave ?? null) === null);
  return users.filter((user) => user.wave?.id === wave);
}

export function findWaveOption(
  waveOptions: MobileRolloutWave[] | undefined,
  wave: WaveSelection
): MobileRolloutWave | null {
  if (wave === "all" || wave === "none") return null;
  return waveOptions?.find((option) => option.id === wave) ?? null;
}
```

(`en-CA` formats as `YYYY-MM-DD`; `Date.parse` of a bare date is UTC midnight on both sides, so the difference is exact whole days.)

- [ ] **Step 4: Run the gates**

Run: `npm run test:mobile` → PASS, including the two pinned ratchet regressions. `npx tsc --noEmit --incremental false` → clean. `npx eslint lib/mobile/user-health` → clean.

- [ ] **Step 5: Commit**

```bash
git add lib/mobile/user-health/presentation.ts lib/mobile/user-health/presentation.test.ts lib/mobile/user-health/funnel.ts lib/mobile/user-health/funnel.test.ts lib/mobile/user-health/wave.ts lib/mobile/user-health/wave.test.ts
git commit -m "feat(user-health): lifetime ratchet stage, quiet predicate, wave helpers"
```

---

### Task 9: Frontend — wave filter UI, wave-scoped funnel, CSV/copy, honesty copy

**Files:**
- Modify: `components/mobile-app/user-health/user-health-board.tsx`
- Create: `components/mobile-app/user-health/user-health-wave-funnel.tsx`
- Modify: `app/mobile-app/user-health/page.tsx`
- Modify: `lib/mobile/user-health/export.ts`, `lib/mobile/user-health/export.test.ts`
- Modify: `components/mobile-app/user-health/how-to-read-panel.tsx`
- Modify: `lib/mobile/user-health/board-copy.test.ts` (stage label assertions)
- Read first: `git show a1a72bb:components/mobile-app/user-health/user-health-funnel.tsx` (the deleted strip — reuse its row rendering)

Repo/branch: same as Task 7. Depends on Tasks 7–8.

**Interfaces:**
- Consumes: `filterRowsByWave`, `findWaveOption`, `getWaveDayNumber`, `WaveSelection`, `isQuiet`, `FunnelCounts.activated_ever`, `buildFunnelCounts`.
- Produces: URL param `wave` (`none` or a wave id; absent = all); `UserHealthBoard` props gain `waveOptions: MobileRolloutWave[]` and `initialWave: WaveSelection`; CSV gains three columns.

- [ ] **Step 1: Write the failing tests**

`export.test.ts`: rework the CSV stage contract (round-2 finding — the current CSV writes `getActivityStage` into a windowed-named column, which becomes a lie once the stage is lifetime). First READ `export.ts` to see the current column set and exact header string, then assert: the windowed-named stage column (`status_in_window` or whatever the current header names it) is REPLACED by three explicit columns — `stage` (durable: `not_started|reached|activated`, mapping stage value `active` → the string `activated`), `active_in_window` (`true|false` from `hasRecentAppActivity`), `quiet` (`true|false` from `isQuiet`) — plus appended `wave_name`, `last_ever_activity_at`, and `last_app_open_at` (empty string when null/absent; round-8 finding — app-open evidence must reach the chase list). Pin: a quiet fixture row exports `stage=activated, active_in_window=false, quiet=true`; a windowed-active row exports `active_in_window=true, quiet=false`; NO row can ever export `active_in_window=true` AND `quiet=true` (assert over every fixture row); the app-open-only fixture row exports `stage=reached` with its `last_app_open_at` value. `buildChaseListText`: the `· Nd` window suffix moves off the stage word onto the windowed marker (e.g. `active 30d` / `quiet 30d`), and a quiet row's line carries `quiet`. DEGRADED branch (round-8 finding): `buildChaseListCsv(rows, context, { partB: false })` produces the EXACT pre-Part-B column set (keep the existing Part A implementation as this branch); pin its header string equality against the current header.

`board-copy.test.ts` (this file renders the board via `renderToStaticMarkup`): add — board rendered with `waveOptions` shows a wave `<select>` including "All waves", "No wave", and each wave name; rendering with `initialWave` set to the Primary wave id shows the context chip text `ZZ Primary 2026 · launched 2026-08-08 · day 4` (fixture `generated_at` must make the day number 4 — set `generatedAt` accordingly) and renders the funnel section with the wave-scoped counts; a quiet row shows the `Quiet · 30d` indicator; the stage badge for an activated row reads `Activated`, never `Active · 30d`; the predicate `<select>` lists both `Active · in window` and `Activated (ever)` options; **tile↔filter reconciliation:** rendering the board with `initialPredicate: "active"` over the shared fixture shows exactly `summary.active_in_window` rows (the quiet fixture row is absent), pinning that the "Active · Nd" tile deep-link still lands on a set whose size matches the tile; **app-open visibility (round-8 finding):** the app-open-only fixture row renders stage badge `Reached` AND an `Opened {date}` marker in its evidence cell; **degraded mode (round-8 finding):** rendering the board with `lifetimeEvidence: false` (legacy fixture, no `wave_options` key) shows the amber degradation note, the windowed `Active · 30d` badge (never `Activated`), NO `Activated (ever)`/`Quiet` dropdown options, NO wave select, and NO `Opened`/quiet markers.

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test:mobile` → new assertions FAIL.

- [ ] **Step 3: Implement**

**Board (`user-health-board.tsx`):**
- Props: add `waveOptions: MobileRolloutWave[]` (default `[]`), `initialWave: WaveSelection` (default `"all"`), and `lifetimeEvidence: boolean` (default `true`; the page passes `hasPartBCapability(data)`).
- Degraded mode (`lifetimeEvidence === false`; round-8 finding): render an amber note above the filters — `Lifetime rollout evidence is temporarily unavailable — showing the window-scoped view.` (reuse the styling of the existing selected-school/amber banner pattern); the stage badge for stage `active` renders the windowed `Active · {days}d` (never `Activated`); the predicate dropdown omits `Activated (ever)` and `Quiet` (and the page treats those URL values as `all` when capability is absent); the wave select, context chip, funnel, quiet badges, and `Opened` markers do not render; `handleDownload` calls the CSV with `{ partB: false }`. All lifetime UI is gated on this one prop — no scattered conditionals on individual fields.
- App-open evidence (round-8 finding): in each row's device/auth evidence cell, when `user.last_app_open_at` is non-null render `Opened {date}` (date-only, SAST — reuse the row's existing timestamp formatting helper). This is the direct signed-in-open proof for accounts with no push token and no teaching activity.
- State: `wave` (a `WaveSelection`), initialized from `initialWave`; every change calls `setPage(1)` and extends `syncUrl` to write/delete the `wave` URL param (delete when `"all"`, same pattern as the existing `q`/`state`/`cohort` params).
- Row pipeline: `const waveRows = filterRowsByWave(users, wave);` then feed `waveRows` (not `users`) into the existing `selectBoardRows(waveRows, selection)` call. The funnel is computed from `waveRows` ONLY — never from the search/stage-filtered rows (filtered tiles are explicitly not approved).
- Wave control: a `<select>` alongside the existing stage/cohort selects with options `All waves` (`all`), `No wave` (`none`), and one per `waveOptions` entry labeled `{name}` — reuse the exact classNames of the neighboring selects.
- Context chip + funnel: when `wave !== "all"`, render above the table:

```tsx
{wave !== "all" ? (
  <UserHealthWaveFunnel
    counts={buildFunnelCounts(waveRows)}
    days={days}
    wave={findWaveOption(waveOptions, wave)}
    generatedAt={generatedAt}
  />
) : null}
```

- Predicate dropdown: relabel `active` to `Active · in window` (its meaning is unchanged and still matches the summary tile), add `Activated (ever)` (`activated`) and `Quiet (activated, silent in window)` (`quiet`). Render a per-row indicator badge `Quiet · {days}d` next to the stage badge when `isQuiet(user)`, and an `Active · {days}d` indicator when `hasRecentAppActivity(user)` — the windowed claims live on these indicators only.
- Stage labels: change the displayed stage badge text for stage `active` to `Activated` (grep the board for the current active-stage label rendering — Part A shipped it as window-suffixed; the badge is now the durable claim).
- Summary tiles (`user-health-summary.tsx`): NO change — the `Active · Nd` tile still links `{ state: "active" }`, which still means windowed, so tile counts keep reconciling with their drill-downs. The board-copy reconciliation test pins this.

**Wave funnel (`user-health-wave-funnel.tsx`):** new server-compatible component (no hooks), props:

```ts
interface UserHealthWaveFunnelProps {
  counts: FunnelCounts;
  days: number;
  wave: MobileRolloutWave | null; // null when the "No wave" subset is shown
  generatedAt: string;
}
```

Recreate the deleted strip's bar-row rendering (`git show a1a72bb:components/mobile-app/user-health/user-health-funnel.tsx`) with rows: `Accounts` (`counts.accounts`), `Auth ready`, `Device signal (ever)` (`counts.device_signal`), `Opened app (ever)` (`counts.opened_app_ever` — the wave-scoped direct-open rollout metric; round-8 finding), `Activated (ever)` (`counts.activated_ever`), `Active · {days}d` (`counts.active_in_window`) — each `count · share%` of `counts.accounts` with the same `Math.max(accounts, 1)` guard; keep the two footer lines (logged-in-after-provisioning over measurable with the "Not measured" branch, seeded-ready over seeded-expected). Header: when `wave` is non-null render `{wave.name} · launched {wave.launch_date} · day {getWaveDayNumber(wave.launch_date, generatedAt)}` (when the day number is negative render `{wave.name} · launches {wave.launch_date}`); when `wave` is null render `No wave · {counts.accounts} accounts`.

**Page (`page.tsx`):** extend the `PREDICATES` parse list with `"activated"` and `"quiet"` (accepted only when `hasPartBCapability(data)`; otherwise they parse to `"all"`); parse the `wave` param — `parseWave(value, waveOptionIds)` returns `"all"` when absent/unknown, `"none"`, or a validated wave id; pass `waveOptions={data.wave_options ?? []}`, `initialWave`, and `lifetimeEvidence={hasPartBCapability(data)}` to `UserHealthBoard`; add the wave value and the capability boolean to the board remount key string.

**CSV (`export.ts`):** `buildChaseListCsv(rows, context, options?: { partB?: boolean })` (default `{ partB: true }`). Part B branch: replace the windowed-named stage column with the three-column contract pinned in Step 1 — `stage` (durable, stage value `active` written as `activated`), `active_in_window` (`hasRecentAppActivity`), `quiet` (`isQuiet`) — and append `wave_name` (`user.wave?.name ?? ""`), `last_ever_activity_at` (`?? ""`), and `last_app_open_at` (`?? ""`), all threaded through the existing quote/injection-guard pipeline. Degraded branch (`partB: false`): keep the CURRENT Part A column set and header byte-identical (retain the existing code path rather than re-deriving it). `buildChaseListText`: move the `· Nd` suffix from the stage word to the windowed markers and add `quiet` to quiet rows (match the file's existing line-composition style).

**How-to panel (`how-to-read-panel.tsx`):** update the stage explanation: stages are now durable — `Activated` means the EA has EVER produced app activity (it can never go backwards; shrinking the window cannot demote anyone); `Reached` includes devices whose push token later died (`ever_registered_device`); windowed claims live in the separate indicators — `Active · {days}d` (usage in the selected window, the same number the summary tile counts) and `Quiet · {days}d` (activated-ever but silent in the window). State plainly that the `Active` filter and tile are windowed while the stage badge is lifetime — they answer different questions. Add a wave paragraph: the wave filter scopes the board and the evidence strip to one rollout wave; `day n` counts whole days since launch in SAST; "No wave" shows accounts not assigned to any wave. Add an app_open note: once the app update ships, `app opens` become direct evidence of signed-in use; older app versions do not emit it, so its absence is not proof of absence.

- [ ] **Step 4: Run the gates**

Run: `npm run test:mobile` → PASS. `npx tsc --noEmit --incremental false` → clean. `npx eslint app/mobile-app components/mobile-app lib/mobile/user-health` → clean.

- [ ] **Step 5: Commit**

```bash
git add components/mobile-app/user-health/ app/mobile-app/user-health/page.tsx lib/mobile/user-health/export.ts lib/mobile/user-health/export.test.ts lib/mobile/user-health/board-copy.test.ts
git commit -m "feat(user-health): wave filter with wave-scoped evidence strip and quiet indicator"
```

---

### Task 10: Mobile app — app_open emitter

**Files:**
- Create: `src/services/appOpenEvents.js`
- Create: `src/components/AppOpenReporter.js`
- Modify: `App.js` (mount the reporter inside `AuthProvider`)
- Create: `__tests__/appOpenEvents.test.js`
- Create: `__tests__/AppOpenReporter.test.js`
- Read first: `src/services/notifications/notificationRegistration.js` (the injectable-deps house style AND the `.rpc()` call shape to copy), `src/context/AuthContext.js` (confirm `useAuth()` exposes `session` — the offline-restore path sets `user` while `session` stays null, and the reporter MUST key on session identity, not user identity)

Repo: `/Users/jimmckeown/Development/zazi-mobile-clock-reporting-supabase` (same checkout of `zazi-izandi-app`), branch `feat/rollout-waves-app-open`. Depends on Task 2 for the RPC contract only (code ships independently; a failed RPC against a not-yet-migrated DB is swallowed by design).

**Interfaces:**
- Consumes: RPC `record_app_open(app_version, platform)` (Task 2 — identity derived server-side).
- Produces: `reportAppOpenOnce({ userId, client, constants, platform })` → `Promise<{reported: boolean, reason?: string}>`; `resetAppOpenReportForTests()`.

- [ ] **Step 1: Write the failing tests**

`__tests__/appOpenEvents.test.js` (jest; inject all deps — never import the real supabase client, mirroring `notificationRegistration`'s test style):

```js
import {
  reportAppOpenOnce,
  resetAppOpenReportForTests,
} from '../src/services/appOpenEvents';

const buildClient = ({ session = { user: { id: 'user-1' } }, rpcError = null } = {}) => ({
  auth: { getSession: jest.fn().mockResolvedValue({ data: { session } }) },
  rpc: jest.fn().mockResolvedValue({ error: rpcError }),
});

const constants = { expoConfig: { version: '1.1.1' } };

beforeEach(() => resetAppOpenReportForTests());

test('records one app_open for the signed-in user via the RPC', async () => {
  const client = buildClient();
  const result = await reportAppOpenOnce({
    userId: 'user-1', client, constants, platform: 'ios',
  });
  expect(result).toEqual({ reported: true });
  expect(client.rpc).toHaveBeenCalledWith('record_app_open', {
    p_app_version: '1.1.1',
    p_platform: 'ios',
  });
});

test('reports at most once per launch', async () => {
  const client = buildClient();
  await reportAppOpenOnce({ userId: 'user-1', client, constants, platform: 'ios' });
  const second = await reportAppOpenOnce({ userId: 'user-1', client, constants, platform: 'ios' });
  expect(second).toEqual({ reported: false, reason: 'already-reported' });
  expect(client.rpc).toHaveBeenCalledTimes(1);
});

test('skips WITHOUT burning the launch flag when there is no live session', async () => {
  const client = buildClient({ session: null });
  const result = await reportAppOpenOnce({ userId: 'user-1', client, constants, platform: 'ios' });
  expect(result).toEqual({ reported: false, reason: 'no-session' });
  expect(client.rpc).not.toHaveBeenCalled();
  // A later call in the same launch (session now live) must still report:
  const live = buildClient();
  const retry = await reportAppOpenOnce({ userId: 'user-1', client: live, constants, platform: 'ios' });
  expect(retry).toEqual({ reported: true });
});

test('skips when the session belongs to a different user', async () => {
  const client = buildClient({ session: { user: { id: 'someone-else' } } });
  const result = await reportAppOpenOnce({ userId: 'user-1', client, constants, platform: 'ios' });
  expect(result).toEqual({ reported: false, reason: 'no-session' });
});

test('swallows RPC failures', async () => {
  const client = buildClient({ rpcError: { message: 'function does not exist' } });
  const result = await reportAppOpenOnce({ userId: 'user-1', client, constants, platform: 'ios' });
  expect(result).toEqual({ reported: false, reason: 'error' });
});

test('a transient failure is retryable and still records exactly once', async () => {
  // Round-2 finding: getSession resolves LOCALLY, so an offline launch with
  // a valid cached session passes the session guard and then fails the
  // network RPC — the common field case. Failure must not end the launch.
  const failing = buildClient({ rpcError: { message: 'gateway timeout' } });
  const first = await reportAppOpenOnce({ userId: 'user-1', client: failing, constants, platform: 'ios' });
  expect(first).toEqual({ reported: false, reason: 'error' });
  const retry = await reportAppOpenOnce({ userId: 'user-1', client: buildClient(), constants, platform: 'ios' });
  expect(retry).toEqual({ reported: true });
  const after = await reportAppOpenOnce({ userId: 'user-1', client: buildClient(), constants, platform: 'ios' });
  expect(after).toEqual({ reported: false, reason: 'already-reported' });
});

test('concurrent calls collapse to a single attempt when it succeeds', async () => {
  const client = buildClient();
  const [a, b] = await Promise.all([
    reportAppOpenOnce({ userId: 'user-1', client, constants, platform: 'ios' }),
    reportAppOpenOnce({ userId: 'user-1', client, constants, platform: 'ios' }),
  ]);
  expect([a.reported, b.reported].filter(Boolean)).toHaveLength(1);
  expect(client.rpc).toHaveBeenCalledTimes(1);
});

test('a trigger during a FAILING in-flight attempt is queued, not lost', async () => {
  // Round-3 finding: without coalescing, a foreground event consumed by
  // the in-flight guard while the first RPC was pending-then-failing
  // left the launch permanently unreported.
  let settleFirstRpc;
  const pendingRpc = new Promise((resolve) => { settleFirstRpc = resolve; });
  const rpc = jest.fn()
    .mockImplementationOnce(() => pendingRpc)          // 1st: pending, will fail
    .mockResolvedValue({ error: null });               // queued follow-up: succeeds
  const client = {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
      }),
    },
    rpc,
  };
  const first = reportAppOpenOnce({ userId: 'user-1', client, constants, platform: 'ios' });
  await Promise.resolve(); // let the first attempt pass its session check
  const during = await reportAppOpenOnce({ userId: 'user-1', client, constants, platform: 'ios' });
  expect(during).toEqual({ reported: false, reason: 'in-flight' });
  settleFirstRpc({ error: { message: 'timeout' } });   // first attempt fails
  await first;
  await new Promise((resolve) => setTimeout(resolve, 0)); // queued follow-up runs
  expect(rpc).toHaveBeenCalledTimes(2);                // exactly one follow-up, no third
  const after = await reportAppOpenOnce({ userId: 'user-1', client, constants, platform: 'ios' });
  expect(after).toEqual({ reported: false, reason: 'already-reported' });
});

test('normalizes missing version and non-mobile platforms to null', async () => {
  const client = buildClient();
  await reportAppOpenOnce({ userId: 'user-1', client, constants: {}, platform: 'web' });
  expect(client.rpc).toHaveBeenCalledWith('record_app_open', {
    p_app_version: null,
    p_platform: null,
  });
});

test('an in-process account switch reports for the second user too', async () => {
  // Round-4 finding: launch state is per USER, not per device. After
  // user A records, a sign-out and login as user B must produce B's own
  // evidence, not "already-reported".
  const clientA = buildClient({ session: { user: { id: 'user-a' } } });
  const first = await reportAppOpenOnce({ userId: 'user-a', client: clientA, constants, platform: 'ios' });
  expect(first).toEqual({ reported: true });
  const clientB = buildClient({ session: { user: { id: 'user-b' } } });
  const second = await reportAppOpenOnce({ userId: 'user-b', client: clientB, constants, platform: 'ios' });
  expect(second).toEqual({ reported: true });
  expect(clientB.rpc).toHaveBeenCalledTimes(1);
});

test('a different user is not blocked by another user\'s in-flight attempt', async () => {
  let settleA;
  const pendingA = new Promise((resolve) => { settleA = resolve; });
  const clientA = {
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-a' } } } }) },
    rpc: jest.fn().mockImplementationOnce(() => pendingA),
  };
  const clientB = buildClient({ session: { user: { id: 'user-b' } } });
  const aAttempt = reportAppOpenOnce({ userId: 'user-a', client: clientA, constants, platform: 'ios' });
  const bResult = await reportAppOpenOnce({ userId: 'user-b', client: clientB, constants, platform: 'ios' });
  expect(bResult).toEqual({ reported: true });
  settleA({ error: null });
  await expect(aAttempt).resolves.toEqual({ reported: true });
});
```

`__tests__/AppOpenReporter.test.js` — the offline→live regression pinned at component level (adversarial-review round 1 finding: an effect keyed on `user.id`+`loading` alone never re-fires when an offline-restored user later gains a live session, because neither dep changes). Mock the auth context and the service module; drive rerenders with `react-test-renderer` (bundled with jest-expo — mirror whatever `__tests__/BootstrapGate.test.js` uses to render):

```js
import { act, create } from 'react-test-renderer';

jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/services/appOpenEvents', () => ({
  reportAppOpenOnce: jest.fn().mockResolvedValue({ reported: true }),
}));

import AppOpenReporter from '../src/components/AppOpenReporter';
import { useAuth } from '../src/context/AuthContext';
import { reportAppOpenOnce } from '../src/services/appOpenEvents';

const renderWith = (authValue, tree = null) => {
  useAuth.mockReturnValue(authValue);
  if (tree) {
    act(() => tree.update(<AppOpenReporter />));
    return tree;
  }
  let created;
  act(() => { created = create(<AppOpenReporter />); });
  return created;
};

beforeEach(() => jest.clearAllMocks());

test('does not report during loading or offline restore, reports once the session goes live', () => {
  const user = { id: 'user-1' };
  // 1: still restoring
  const tree = renderWith({ user: null, session: null, loading: true });
  expect(reportAppOpenOnce).not.toHaveBeenCalled();
  // 2: offline restore — user known, NO live session
  renderWith({ user, session: null, loading: false }, tree);
  expect(reportAppOpenOnce).not.toHaveBeenCalled();
  // 3: session arrives for the SAME user (network back / token refresh)
  renderWith({ user, session: { user }, loading: false }, tree);
  expect(reportAppOpenOnce).toHaveBeenCalledTimes(1);
  expect(reportAppOpenOnce).toHaveBeenCalledWith({ userId: 'user-1' });
  // 4: unrelated rerender with same session identity does not re-call
  renderWith({ user, session: { user }, loading: false }, tree);
  expect(reportAppOpenOnce).toHaveBeenCalledTimes(1);
});

test('reports immediately when cold start restores a live session', () => {
  const user = { id: 'user-1' };
  renderWith({ user, session: { user }, loading: false });
  expect(reportAppOpenOnce).toHaveBeenCalledTimes(1);
});

test('retries when connectivity returns while still foregrounded', () => {
  // Round-8 finding: offline cold start passes the local session check,
  // fails the RPC, then the network returns with NO AppState event and
  // NO session change. The online-state dependency must re-fire the
  // effect. Drive the mocked OfflineContext/online hook from false to
  // true across a rerender with the SAME session, and assert
  // reportAppOpenOnce is invoked again (exactly 2 calls total).
});

test('retries on app-foreground so a failed offline attempt recovers', () => {
  // Round-2 finding: without a retrigger, a launch that failed its RPC
  // (offline with a locally-valid session) could never emit. The service
  // self-guards after success, so extra foreground calls are no-ops.
  const user = { id: 'user-1' };
  const handlers = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((type, handler) => {
    handlers.push(handler);
    return { remove: jest.fn() };
  });
  renderWith({ user, session: { user }, loading: false });
  expect(reportAppOpenOnce).toHaveBeenCalledTimes(1);
  act(() => handlers.forEach((handler) => handler('active')));
  expect(reportAppOpenOnce).toHaveBeenCalledTimes(2);
});
```

(add `import { AppState } from 'react-native';` to the test imports.)

- [ ] **Step 2: Run to verify they fail**

Run from the worktree root: `npm test -- appOpenEvents AppOpenReporter`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement the service**

`src/services/appOpenEvents.js`:

```js
// One app_open event per launch, recorded once a live authenticated
// session exists. Identity is derived server-side by the record_app_open
// RPC. Failures are swallowed (evidence collection must never affect app
// behavior) but RETRYABLE: getSession resolves locally, so an offline
// launch with a valid cached session reaches the RPC and fails on the
// network — the launch flag is only set on confirmed success, and the
// reporter retries on app-foreground. The server-side 5-minute rate
// bound absorbs any duplicate that slips through.
// All state is keyed by userId: "once per launch" means once per launch
// PER AUTHENTICATED USER — an in-process sign-out and login as another
// account must produce that account's own evidence (round-4 finding).
const recordedUserIds = new Set();
const inFlightUserIds = new Set();
const queuedRetryUserIds = new Set();

export const resetAppOpenReportForTests = () => {
  recordedUserIds.clear();
  inFlightUserIds.clear();
  queuedRetryUserIds.clear();
};

const resolveClient = (client) => client || require('./supabaseClient').supabase;

const resolveAppVersion = (constants) => {
  const resolved = constants || require('expo-constants').default;
  const version = resolved?.expoConfig?.version;
  return typeof version === 'string' && version.trim() ? version.trim() : null;
};

const resolvePlatform = (platform) => {
  const resolved = platform || require('react-native').Platform.OS;
  return resolved === 'ios' || resolved === 'android' ? resolved : null;
};

export const reportAppOpenOnce = async ({ userId, client, constants, platform } = {}) => {
  if (!userId) {
    return { reported: false, reason: 'no-user' };
  }
  if (recordedUserIds.has(userId)) {
    return { reported: false, reason: 'already-reported' };
  }
  if (inFlightUserIds.has(userId)) {
    // A trigger arriving mid-attempt for the SAME user (e.g. app
    // foregrounded while the first RPC is still pending) is COALESCED,
    // not dropped: if the in-flight attempt fails, one bounded follow-up
    // runs afterwards. A different user is never blocked by this guard.
    queuedRetryUserIds.add(userId);
    return { reported: false, reason: 'in-flight' };
  }
  inFlightUserIds.add(userId);
  let result;
  try {
    const supabaseClient = resolveClient(client);
    const { data: { session } = {} } = await supabaseClient.auth.getSession();
    if (!session?.user?.id || session.user.id !== userId) {
      // Offline restore keeps user without a live session; the reporter
      // retries when a session appears.
      result = { reported: false, reason: 'no-session' };
      return result;
    }
    const { error } = await supabaseClient.rpc('record_app_open', {
      p_app_version: resolveAppVersion(constants),
      p_platform: resolvePlatform(platform),
    });
    if (error) {
      console.log('[AppOpen] record failed:', error?.message);
      result = { reported: false, reason: 'error' }; // retryable
      return result;
    }
    recordedUserIds.add(userId);
    result = { reported: true };
    return result;
  } catch (error) {
    console.log('[AppOpen] unexpected failure:', error?.message);
    result = { reported: false, reason: 'error' }; // retryable
    return result;
  } finally {
    inFlightUserIds.delete(userId);
    if (queuedRetryUserIds.has(userId)) {
      queuedRetryUserIds.delete(userId);
      if (!recordedUserIds.has(userId) && result?.reason === 'error') {
        // One follow-up for the coalesced trigger; if it also fails, the
        // next foreground/session event is the retry trigger.
        reportAppOpenOnce({ userId, client, constants, platform });
      }
    }
  }
};
```

- [ ] **Step 4: Implement the reporter and mount it**

`src/components/AppOpenReporter.js` — keyed on SESSION identity, not user identity (the offline-restore path sets `user` with `session` null and neither `loading` nor `user.id` changes when the session later appears — an effect keyed on those would never retry):

```js
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { reportAppOpenOnce } from '../services/appOpenEvents';

// Renders nothing; records at most one app_open event per user per launch, once a
// LIVE session exists (offline restore alone never fires — the effect
// re-runs when the session arrives later in the same launch). App
// foregrounding retries a launch whose first attempt failed offline; the
// service self-guards after success, and the server rate bound absorbs
// any duplicate.
const AppOpenReporter = () => {
  const { session, loading } = useAuth();
  const sessionUserId = session?.user?.id ?? null;
  const isOnline = useOfflineOnlineState(); // see note below — from OfflineContext

  useEffect(() => {
    if (loading || !sessionUserId) return undefined;
    reportAppOpenOnce({ userId: sessionUserId });
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        reportAppOpenOnce({ userId: sessionUserId });
      }
    });
    return () => subscription.remove();
  }, [loading, sessionUserId, isOnline]);

  return null;
};

export default AppOpenReporter;
```

**Connectivity retry (round-8 finding):** a cold launch can pass the local session check, fail the RPC offline, and then regain connectivity while still foregrounded — with no AppState event and no session change, nothing would retry. `OfflineContext` sits ABOVE `AuthProvider` in the provider order, so the reporter may consume it: read `src/context/OfflineContext.js` and use whatever online/offline state it actually exports (shown here as `useOfflineOnlineState()` — substitute the real hook/selector name; the effect re-runs on the offline→online transition because `isOnline` is a dependency, and the service's per-user recorded/in-flight guards make the extra invocations no-ops after success). If OfflineContext exports no consumable online-state hook, fall back to a bounded interval INSIDE the effect (retry every 60s while unrecorded, max 5 attempts, cleared on unmount and on success) instead of adding new context surface.

FIRST confirm `useAuth()` exposes `session` (AuthContext holds `setSession` state; check the provider's value object). If it does NOT expose `session`, do not add it speculatively to the context — instead have the reporter own a `supabase.auth.onAuthStateChange` subscription (copy the exact subscribe/unsubscribe shape from `src/context/OfflineContext.js:160-172`) that calls `reportAppOpenOnce({ userId: nextSession.user.id })` on `SIGNED_IN` / `INITIAL_SESSION`-with-session / `TOKEN_REFRESHED`, and adjust the component test to drive the mocked subscription instead of context values. Mount the component in `App.js` directly inside `AuthProvider`, as a sibling rendered alongside the existing children (provider order is load-bearing — do not reorder anything; add `<AppOpenReporter />` immediately before the navigator subtree inside the innermost point that is below `AuthProvider`).

- [ ] **Step 5: Run the gates**

Run: `npm test -- appOpenEvents AppOpenReporter` → PASS. Then the neighbor suites that mount App-level trees: `npm test -- AuthContext BootstrapGate` → PASS (catches a bad mount). Then `npm run lint` → clean.

- [ ] **Step 6: Commit**

```bash
git add src/services/appOpenEvents.js src/components/AppOpenReporter.js App.js __tests__/appOpenEvents.test.js __tests__/AppOpenReporter.test.js
git commit -m "feat(events): report one app_open per launch via rate-bounded RPC"
```

---

### Task 11: Deploy runbook (coordinator + Jim; no code)

Nothing here is dispatched to an implementer. The coordinator walks this with Jim, in order, each step gated on the previous:

- [ ] **0. Part A gates (unchanged, critical):** Django `fix/mobile-report-real-users` deployed on Render → frontend `fix/mobile-report-real-users` then `feat/mobile-ops-usability` merged to `main` and deployed on Vercel. Remind Jim of the outstanding manual browser checklist in `.superpowers/sdd/2026-08-11-mobile-ops-usability/progress.md` (items 1–6 + version-card reflow) before the production merge.
- [ ] **1. Supabase migrations (FIRST — purely additive, round-6 ordering):** merge `feat/rollout-waves-app-open` to `main` (app repo), apply the three migrations to hosted (`supabase db push` from the linked worktree — same flow as `20260812120000`), then run `supabase/verification/rollout-waves-post-apply-verification.sql` against hosted and record the output in the repo build log. The running (pre-Part-B) Django is untouched by this step: v1 is byte-identical and the new objects are uncalled.
- [ ] **2. Django Part B:** merge `feat/mobile-rollout-waves` → `fix/mobile-report-real-users` (or directly to `main` if Part A already merged), deploy on Render. Django now calls `mobile_user_health_domain_v2`. **Rollback at any later point = redeploy the previous Django release** (it calls the untouched v1); no database action is ever required to roll back. If this happens AFTER the Part B frontend is live (step 5), the board detects the legacy payload (`wave_options` absent) and switches itself into the announced amber degraded mode — window-scoped labels, lifetime/wave/app-open surfaces hidden — so reporting stays honest without a coordinated frontend rollback (round-8 finding).
- [ ] **3. Manifests — JIM GATE:** run `generate-wave-manifests.sql` against hosted (read-only), send Jim the two `*-review.csv` files + counts + the proposed launch dates (**2026-08-08** Primary, **2026-08-11** ECD). STOP until Jim confirms lists and dates.
- [ ] **4. Loader:** run `load-wave-manifest.sql` for ZZ Primary 2026 then ZZ ECD 2026 with `allow_moves=false`, `source_note='manifest <today's date> <file>'`. Paste both load-report NOTICE lines to Jim. Verify: board's `wave_options` shows both waves; per-wave live counts match the manifests.
- [ ] **5. Frontend:** merge `feat/mobile-rollout-waves` → `main`, deploy. Verify wave filter + strip on production data.
- [ ] **6. Mobile OTA:** `feat/rollout-waves-app-open` is already in `main` (step 1); from Jim's app checkout on `main`, `npm run eas:update` (production channel; the script enforces branch `main` + up-to-date). `runtimeVersion.policy: appVersion` means the update reaches runtime `1.1.1` — check the EAS dashboard for any other live runtime/channel (e.g. `wave2-canary`) and publish per live runtime/channel as needed. Devices emit `app_open` from launch N+1.
- [ ] **7. Docs:** record the deploy in the app repo `documentation/build-log.md` house style; note in the frontend how-to panel review that app_open evidence begins at OTA date (already written in Task 9's copy).

---

## Verification gates (every code task, coordinator re-runs before commit)

| Repo | Gates |
|---|---|
| Supabase/app worktree | `npm test -- __tests__/<touched>.test.js`; Task 5 additionally the combined postgres harness |
| Django | `manage.py test api.tests_mobile_operational_reports api.tests_mobile_reports -v 2` via the 2025 venv python |
| Frontend | `npm run test:mobile` && `npx tsc --noEmit --incremental false` && scoped `npx eslint` |
| Mobile app | `npm test -- appOpenEvents AppOpenReporter AuthContext BootstrapGate` && `npm run lint` |

Codex sandbox notes (from Part A): forwarders cannot write the linked-worktree git index — the coordinator re-runs gates and commits with the exact message given per task. If `npx tsx`/`npm run test:mobile` hits sandbox IPC EPERM inside codex, `node --import tsx --test lib/mobile/*.test.ts lib/mobile/*/*.test.ts` is the accepted equivalent; plain `npx tsc --noEmit` can fail on a stale incremental cache — always pass `--incremental false`.

## Task dependency order

1 → 2 → 3 → 4 → 5 (Supabase chain, sequential) · 6 (Django, independent of 1–5) · 7 → 8 → 9 (frontend chain, independent of 1–6) · 10 (mobile, after 2 lands for column names; code-independent otherwise) · 11 last, with Jim.
