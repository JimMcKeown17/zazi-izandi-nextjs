# Per-EA Profile Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/mobile-app/users/<id>` shows one EA's full picture — clock history, sessions with groups/letters, assessment activity, evidence state — so a PM can judge performance from one page; `/mobile-app/users` activates the "Users — soon" sidebar item.

**Architecture:** One new additive Supabase RPC (`mobile_user_profile(p_user_id)`) feeds one new Django endpoint (`GET /api/mobile/users/<uuid>/`, population-gated, GoTrue-joined) consumed by a new `lib/mobile/user-profile/` frontend module and two server-component pages. Same three-repo pipeline, review gates, and deploy order as Part B; no existing endpoint changes.

**Tech Stack:** Postgres 17 plpgsql RPC · Django 5.2 jsonschema validators · Next.js 16 / React 19 / Zod v4 / Recharts / node:test · Jest SQL-contract tests + disposable-Postgres harness.

**Spec:** `docs/superpowers/specs/2026-08-12-ea-profile-design.md` — binding; read it before any task.

## Global Constraints

- **Supabase house pattern:** bare `CREATE FUNCTION`, `STABLE`, `SECURITY INVOKER`, `SET search_path = ''`, every call schema-qualified (`pg_catalog.` for builtins; bare `LEAST`/`GREATEST` — grammar constructs), `$function$` quoting, `REVOKE ALL … FROM PUBLIC, anon, authenticated, authenticator`, `GRANT EXECUTE … TO service_role`, `COMMENT ON`, one trailing `NOTIFY pgrst, 'reload schema';`. Migration filename sorts after `20260813092000`. Arg validation raises ERRCODE `22023` with message `mobile_user_profile_user_id_required`.
- **All date/week math in `Africa/Johannesburg`** (same idioms as `mobile_time_entries_activity` / `mobile_sessions_activity`).
- **No GPS anywhere** in the RPC payload, Django response, or UI. No per-child assessment output — only the `children_assessed` count.
- **Access:** reuse capability `mobile.user_health.read`; no new capability. Unknown/excluded uuid → Django 404 `{"error": "user not found"}`.
- **Honesty/copy rules:** durable vs windowed labeling identical to the user-health board (Activated = lifetime, windowed claims carry the window); assessment copy is counts/coverage only — never "mastered/learned/on track" (documentation/letter-mastery-data-model.md governs); letters render uppercased comma-joined (app parity with `formatLetters`); blending sessions show `Blending: <categories>`.
- **Payload cardinalities (exact):** `weekly` = 26 ISO-week buckets (Mon start, SAST), oldest→newest, zero-filled, ending at the current week; `recent_weekday_sessions` = 10 dates ascending + 10 cells; `recent_sessions` ≤ 20; `clock_entries` ≤ 100.
- **`letters_focused` and `blend_categories` are mutually exclusive per session** (the app writes exactly one, by level) — validators enforce never-both-non-null.
- **Contract stability:** every response key always present; null when unknown. Deploy order additive-RPC → Django → frontend. **Rollback order is the REVERSE: frontend first, then Django** (a Django-only rollback after the frontend ships turns every profile request into a route-level 404 — round-2 finding). The frontend therefore treats a 404 as not-found ONLY when the body is exactly `{"error": "user not found"}`; any other 404 maps to the sanitized service-unavailable state. The applied RPC is additive/inert and is never removed by code redeploys — removal would be its own reviewed forward migration.
- **Git:** feature branches (`feat/ea-profile-rpc` app repo, `feat/ea-profile-api` django, `feat/ea-profile` frontend — already created off fresh main); no agent trailers; commit messages as given.

## Repo map

| Role | Path | Branch |
|---|---|---|
| Supabase/app (zazi-izandi-app) | /Users/jimmckeown/Development/zazi-mobile-clock-reporting-supabase | feat/ea-profile-rpc @ 304668d (fast-forwarded to current origin/main — round-8 finding; re-sync before dispatch if main moves again) |
| Django | /Users/jimmckeown/Development/zazi-mobile-clock-reporting-django | feat/ea-profile-api @ a60edf4 |
| Frontend | /Users/jimmckeown/Development/zazi-mobile-clock-reporting-nextjs/.worktrees/mobile-ops | feat/ea-profile @ 2911e8e (spec committed e80a675) |

Coordinator re-runs gates and commits (codex sandbox cannot write linked-worktree git indexes). Test-runner quirks: frontend fallback `node --import tsx --test lib/mobile/*.test.ts lib/mobile/*/*.test.ts`; always `npx tsc --noEmit --incremental false`.

---

### Task 1: Supabase — `mobile_user_profile` RPC migration + contract tests

**Files:**
- Create: `supabase/migrations/20260813100000_mobile_user_profile_rpc.sql`
- Modify: `scripts/seed-verification/backup-archive-sequences.json` (round-9 finding — this artifact binds a `migration_manifest_digest` over EVERY sorted migration timestamp; `__tests__/seedBackupArchiveSequences.test.js` and the runtime `scripts/provision-seed-restore.mjs` both fail closed on drift. AFTER the migration filename is final, regenerate ONLY the migration-manifest digest — recompute it the way the test does, never hard-code a value from review notes — retaining the reviewed DDL hash and the empty sequence inventory)
- Create: `__tests__/mobileUserProfileSqlContract.test.js`
- Read first: `supabase/migrations/20260813092000_mobile_user_health_waves_lifetime.sql` (v2 — source of the identity/lifetime/app_open/ever_device/wave CTE idioms) and `supabase/migrations/20260812120000_mobile_reporting_real_user_population.sql` (`mobile_sessions_activity`'s `heatmap_dates` idiom; `mobile_time_entries_activity`'s entry/duration/invalid-interval idioms)

**Interfaces:**
- Produces: `public.mobile_user_profile(p_user_id UUID) RETURNS JSONB` emitting EXACTLY the spec's payload (top-level keys `generated_at, identity, wave, app_device, ever_registered_device, data, lifetime, weekly, recent_weekday_sessions, recent_sessions, clock_entries`). Tasks 2–3 depend on this shape.

- [ ] **Step 1: Write the failing contract tests**

`__tests__/mobileUserProfileSqlContract.test.js`, following `__tests__/rolloutWavesAppOpenSqlContract.test.js`'s file-reading style:

```js
const fs = require('fs');
const path = require('path');

const migrationText = () =>
  fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '20260813100000_mobile_user_profile_rpc.sql'),
    'utf8'
  );

describe('mobile_user_profile RPC contract', () => {
  test('creates only the new profile function with house posture', () => {
    const text = migrationText();
    expect(text).toMatch(/CREATE FUNCTION public\.mobile_user_profile\(\s*p_user_id UUID\s*\)/);
    expect(text).not.toMatch(/CREATE OR REPLACE/);
    expect(text).not.toMatch(/DROP /i);
    expect(text).toMatch(/SECURITY INVOKER/);
    expect(text).toMatch(/SET search_path = ''/);
    expect(text).toMatch(/mobile_user_profile_user_id_required/);
    expect(text).toMatch(/REVOKE ALL ON FUNCTION public\.mobile_user_profile\(UUID\)\s+FROM PUBLIC, anon, authenticated, authenticator/);
    expect(text).toMatch(/GRANT EXECUTE ON FUNCTION public\.mobile_user_profile\(UUID\)\s+TO service_role/);
    expect(text).toMatch(/NOTIFY pgrst, 'reload schema';/);
  });

  test('emits every top-level payload key', () => {
    const text = migrationText();
    for (const key of [
      "'generated_at'", "'user_id'", "'days'", "'windowed_activity'",
      "'identity'", "'wave'", "'app_device'",
      "'ever_registered_device'", "'data'", "'lifetime'", "'weekly'",
      "'recent_weekday_sessions'", "'recent_sessions'", "'clock_entries'",
    ]) {
      expect(text).toContain(key);
    }
    expect(text).toContain("'children_assessed'");
    expect(text).toContain("'clock_minutes_completed'");
    expect(text).toContain("'letters_focused'");
    expect(text).toContain("'blend_categories'");
  });

  test('identity uses the FULL OUTER identity/roster population rule', () => {
    const text = migrationText();
    expect(text).toMatch(/FULL OUTER JOIN public\.education_assistants/);
  });

  test('legacy group fallback reads only the first group_ids element', () => {
    expect(migrationText()).toMatch(/group_ids\[1\]/);
  });

  test('lifetime CTEs are unwindowed and device history includes invalidated tokens', () => {
    const text = migrationText();
    const lifetimeClock = text.match(/lifetime_clock_activity AS \(([\s\S]*?)\),/);
    expect(lifetimeClock).not.toBeNull();
    expect(lifetimeClock[1]).not.toMatch(/v_start_at|v_end_at/);
    const everDevice = text.match(/ever_device AS \(([\s\S]*?)\),/);
    expect(everDevice[1]).not.toMatch(/invalidated_at/);
  });

  test('excludes GPS and per-child assessment output', () => {
    const text = migrationText();
    expect(text).not.toMatch(/sign_in_lat|sign_in_lon|sign_out_lat|sign_out_lon/);
    // children appear only as counts: no child_id may be emitted as a JSON key
    expect(text).not.toMatch(/'child_id'/);
  });

  test('recent sessions resolve groups via attendees with group_ids fallback', () => {
    const text = migrationText();
    expect(text).toMatch(/session_attendees/);
    expect(text).toMatch(/group_ids/);
    expect(text).toMatch(/string_agg/);
    expect(text).toMatch(/attendance_status = 'present'/);
  });
});
```

- [ ] **Step 2: Run to verify RED**

Run from the supabase worktree: `npm test -- __tests__/mobileUserProfileSqlContract.test.js`
Expected: FAIL — ENOENT on the migration file. (node_modules already installed.)

- [ ] **Step 3: Write the migration**

`supabase/migrations/20260813100000_mobile_user_profile_rpc.sql`. Structure (plpgsql, one function; copy idioms verbatim from the named sources, scoped to `p_user_id`):

Header + declarations:

```sql
-- Per-EA profile evidence for the operations dashboard.
-- Read-only, single-user variant of the reporting RPC family; Django joins
-- GoTrue auth state and applies population gating.

CREATE FUNCTION public.mobile_user_profile(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_generated_at TIMESTAMPTZ := pg_catalog.statement_timestamp();
  v_end_date DATE := (v_generated_at AT TIME ZONE 'Africa/Johannesburg')::DATE;
  v_days CONSTANT INTEGER := 30;                        -- fixed windowed_activity window
  v_start_date DATE := v_end_date - (v_days - 1);
  v_start_at TIMESTAMPTZ := v_start_date::TIMESTAMP AT TIME ZONE 'Africa/Johannesburg';
  v_end_at TIMESTAMPTZ := (v_end_date + 1)::TIMESTAMP AT TIME ZONE 'Africa/Johannesburg';
  v_strip_start DATE := v_end_date - 13;                -- 14-day span guarantees >= 10 weekdays
  v_week_end DATE := (pg_catalog.date_trunc(
    'week', (v_generated_at AT TIME ZONE 'Africa/Johannesburg')))::DATE;  -- current ISO Monday
  v_week_start DATE := v_week_end - (25 * 7);           -- 26 buckets inclusive
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'mobile_user_profile_user_id_required';
  END IF;

  RETURN ( WITH ... );
END;
$function$;
```

CTEs, in order (each anchored to an existing idiom — copy that code and scope it):

1. `identity_row` — start from the FULL OUTER identity/roster rule of `mobile_reporting_identity_population` (in `20260812120000`): `FROM public.staff_identity_links AS identity FULL OUTER JOIN public.education_assistants AS roster ON roster.user_id = identity.user_id WHERE COALESCE(identity.user_id, roster.user_id) = p_user_id AND (identity.role = 'ea' OR roster.user_id IS NOT NULL)` — so roster-only EAs keep their roster name/school/status (round-1 adversarial finding; v2's identity_population starts from identity links only and would drop them). Onto that base, graft v2's profile fields: the COALESCE display-name cascade (roster→identity→concat fallbacks→uuid), `roster.employment_status`, school join for `current_school_id`/`current_school`/`school_type` (COALESCE `'Unattributed'`), and the `data_expectation` CASE (`identity.teampact_user_id IS NOT NULL → 'seeded'`; ECD school_type → `'self_setup'`; else `'unknown'`). Emits ≤ 1 row.
1b. `windowed_activity` block — copy v2's THREE windowed CTE idioms (`clock_activity`, `session_activity`, `assessment_activity` in 20260813092000 — window predicates on `v_start_at`/`v_end_at`/`v_start_date`/`v_end_date`) scoped `WHERE …user_id = p_user_id`, and emit the SAME seven-key object shape as a health row's `activity` (counts + three per-source timestamps + `last_activity_at` = bare `GREATEST` of the three). Top level also emits `'user_id', p_user_id` and `'days', v_days`.
2. `wave_membership` — verbatim from v2, plus `AND member.user_id = p_user_id`.
3. `current_push_token` — the `LEFT JOIN LATERAL` push-token idiom from v2's `health_rows` recast as a CTE: newest non-invalidated token for `p_user_id` (registered/platform/app_version/last_seen_at).
4. `ever_device` — verbatim from v2 (`SELECT DISTINCT user_id FROM public.notification_push_tokens`) with `WHERE push_token_row.user_id = p_user_id`.
5. `data_counts` — v2's `class_counts`/`child_counts`/`group_counts`/`grouped_child_counts`/`imported_assessment_counts` collapsed to single-user scalars (same joins/filters: live assignments, unarchived rows, `capture_mode IS NULL` for imported), PLUS:

```sql
    children_assessed_count AS (
      SELECT COUNT(*)::INTEGER AS children_assessed
      FROM public.child_ea_assignments AS assignment
      JOIN public.children AS child
        ON child.id = assignment.child_id
       AND child.archived_at IS NULL
      WHERE assignment.ea_user_id = p_user_id
        AND assignment.unassigned_at IS NULL
        AND EXISTS (
          SELECT 1 FROM public.assessments AS assessment
          WHERE assessment.child_id = assignment.child_id
        )
    ),
```

6. `lifetime_clock_activity` / `lifetime_session_activity` / `lifetime_assessment_activity` / `app_open_activity` — verbatim from v2 with `WHERE …user_id = p_user_id` added (keep `session_type = 'Literacy Coach'`, `capture_mode IS NOT NULL`, `event = 'app_open'`).
7. `lifetime_totals`:

```sql
    lifetime_totals AS (
      SELECT
        (SELECT COUNT(*)::INTEGER FROM public.time_entries AS entry
          WHERE entry.user_id = p_user_id) AS clock_entries,
        (SELECT COUNT(DISTINCT (entry.sign_in_time AT TIME ZONE 'Africa/Johannesburg')::DATE)::INTEGER
          FROM public.time_entries AS entry
          WHERE entry.user_id = p_user_id) AS clock_days,
        (SELECT COALESCE(SUM(pg_catalog.floor(
            EXTRACT(EPOCH FROM (entry.sign_out_time - entry.sign_in_time)) / 60))::INTEGER, 0)
          FROM public.time_entries AS entry
          WHERE entry.user_id = p_user_id AND entry.sign_out_time IS NOT NULL) AS clock_minutes_completed,
        (SELECT COUNT(*)::INTEGER FROM public.sessions AS session_row
          WHERE session_row.user_id = p_user_id
            AND session_row.session_type = 'Literacy Coach') AS sessions,
        (SELECT COUNT(*)::INTEGER FROM public.assessments AS assessment
          WHERE assessment.user_id = p_user_id
            AND assessment.capture_mode IS NOT NULL) AS app_assessments
    ),
```

8. `week_series` + per-source weekly aggregates + `weekly_json` — exactly 26 zero-filled buckets:

```sql
    week_series AS (
      SELECT (v_week_start + (week_offset * 7))::DATE AS week_start
      FROM pg_catalog.generate_series(0, 25) AS week_offset
    ),
    weekly_clock AS (
      SELECT
        (pg_catalog.date_trunc('week',
          (entry.sign_in_time AT TIME ZONE 'Africa/Johannesburg')))::DATE AS week_start,
        COUNT(DISTINCT (entry.sign_in_time AT TIME ZONE 'Africa/Johannesburg')::DATE)::INTEGER AS clock_days,
        COALESCE(SUM(pg_catalog.floor(
          EXTRACT(EPOCH FROM (entry.sign_out_time - entry.sign_in_time)) / 60))
          FILTER (WHERE entry.sign_out_time IS NOT NULL), 0)::INTEGER AS clock_minutes_completed
      FROM public.time_entries AS entry
      WHERE entry.user_id = p_user_id
      GROUP BY 1
    ),
    weekly_sessions AS (
      SELECT (pg_catalog.date_trunc('week', session_row.session_date))::DATE AS week_start,
        COUNT(*)::INTEGER AS sessions
      FROM public.sessions AS session_row
      WHERE session_row.user_id = p_user_id
        AND session_row.session_type = 'Literacy Coach'
      GROUP BY 1
    ),
    weekly_assessments AS (
      SELECT (pg_catalog.date_trunc('week',
          (assessment.created_at AT TIME ZONE 'Africa/Johannesburg')))::DATE AS week_start,
        COUNT(*)::INTEGER AS app_assessments
      FROM public.assessments AS assessment
      WHERE assessment.user_id = p_user_id
        AND assessment.capture_mode IS NOT NULL
      GROUP BY 1
    ),
    weekly_json AS (
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'week_start', week.week_start,
          'clock_days', COALESCE(clock.clock_days, 0),
          'clock_minutes_completed', COALESCE(clock.clock_minutes_completed, 0),
          'sessions', COALESCE(sessions.sessions, 0),
          'app_assessments', COALESCE(assessments.app_assessments, 0)
        ) ORDER BY week.week_start
      ) AS value
      FROM week_series AS week
      LEFT JOIN weekly_clock AS clock ON clock.week_start = week.week_start
      LEFT JOIN weekly_sessions AS sessions ON sessions.week_start = week.week_start
      LEFT JOIN weekly_assessments AS assessments ON assessments.week_start = week.week_start
    ),
```

9. `strip_dates` + `strip_json` — the `heatmap_dates` idiom from `mobile_sessions_activity` (20260812120000) applied to `generate_series` over `v_strip_start..v_end_date`, `EXTRACT(ISODOW …) BETWEEN 1 AND 5`, `ORDER BY … DESC LIMIT 10`, re-sorted ascending; cells = per-date Literacy Coach session counts for `p_user_id`; emit `jsonb_build_object('dates', …, 'cells', …)` with both arrays date-ordered ascending.
10. `recent_sessions_json` — last 20:

```sql
    recent_sessions_rows AS (
      SELECT
        session_row.id,
        session_row.session_date,
        session_row.started_at,
        session_row.duration_seconds,
        session_row.notes,
        session_row.activities->'letters_focused' AS letters_focused,
        session_row.activities->'blend_categories' AS blend_categories,
        COALESCE(attendee_groups.names, fallback_group.name) AS group_name,
        COALESCE(present_counts.present_attendees, 0)::INTEGER AS present_attendees
      FROM public.sessions AS session_row
      LEFT JOIN LATERAL (
        SELECT pg_catalog.string_agg(DISTINCT group_row.name, ', ' ORDER BY group_row.name) AS names
        FROM public.session_attendees AS attendee
        JOIN public.groups AS group_row ON group_row.id = attendee.group_id
        WHERE attendee.session_id = session_row.id
      ) AS attendee_groups ON TRUE
      -- Legacy fallback (sessions with no attendee rows): the FIRST
      -- group_ids element only, per the binding spec — never the whole array.
      LEFT JOIN public.groups AS fallback_group
        ON fallback_group.id = session_row.group_ids[1]
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::INTEGER AS present_attendees
        FROM public.session_attendees AS attendee
        WHERE attendee.session_id = session_row.id
          AND attendee.attendance_status = 'present'
      ) AS present_counts ON TRUE
      WHERE session_row.user_id = p_user_id
        AND session_row.session_type = 'Literacy Coach'
      ORDER BY session_row.session_date DESC,
        session_row.started_at DESC NULLS LAST, session_row.id
      LIMIT 20
    ),
```

then `jsonb_agg` of `jsonb_build_object('session_date', …, 'started_at', …, 'duration_seconds', …, 'group_name', …, 'letters_focused', …, 'blend_categories', …, 'present_attendees', …, 'notes', …)` preserving the same ORDER BY, COALESCE `'[]'::JSONB`.
11. `clock_entries_json` — the entry-shape idiom from `mobile_time_entries_activity` (local_date/sign_in_time/sign_out_time/duration_minutes/auto_clocked_out/is_active — NO roster, NO lat/lon) scoped `WHERE entry.user_id = p_user_id`, `ORDER BY entry.sign_in_time DESC, entry.id LIMIT 100`. The invalid-interval EXISTS guard (ERRCODE 22000, message `mobile_user_profile_invalid_interval`, placed before the main RETURN) covers BOTH invalid shapes (`sign_out_time < sign_in_time`; `auto_clocked_out AND sign_out_time IS NULL`) and scans EVERY `time_entries` row for `p_user_id` with **NO date-window predicate** — do NOT copy the source guard's `v_start_at`/`v_end_at` bounds (round-4 finding: this profile aggregates lifetime/weekly/last-100 data, so a corrupt 60-day-old row must fail closed here, not leak into totals).

Final SELECT: `jsonb_build_object` of all top-level keys incl. `'user_id', p_user_id`, `'days', v_days`, and `'windowed_activity', …`; `identity` = row-to-jsonb of `identity_row` or NULL when absent (`CASE WHEN identity_anchor.user_id IS NULL THEN NULL::JSONB ELSE jsonb_build_object(…) END` via one `LEFT JOIN identity_row … ON TRUE` from a single-row anchor CTE — note the anchor tests `COALESCE(identity.user_id, roster.user_id)`); `wave` = the v2 CASE idiom; `ever_registered_device` = `EXISTS`-driven boolean; `data` includes `children_assessed`. Footer: REVOKE/GRANT/COMMENT/NOTIFY per Global Constraints.

- [ ] **Step 4: Run to verify GREEN**

Run: `npm test -- __tests__/mobileUserProfileSqlContract.test.js __tests__/seedBackupArchiveSequences.test.js __tests__/seedRestoreProvisioning.test.js` → PASS (the seed pins prove the regenerated digest; round-9 finding), and the sibling suites must not regress: `npm test -- __tests__/rolloutWavesAppOpenSqlContract.test.js __tests__/mobileRealUserReportingSqlContract.test.js __tests__/mobileOperationalReportingSqlContract.test.js __tests__/mobileSessionsActivitySqlContract.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260813100000_mobile_user_profile_rpc.sql __tests__/mobileUserProfileSqlContract.test.js scripts/seed-verification/backup-archive-sequences.json
git commit -m "feat(profile): add mobile_user_profile RPC"
```

---

### Task 2: Supabase — behavioral harness scenarios + post-apply verification

**Files:**
- Create: `scripts/mobile-user-profile-postgres-harness.cjs`
- Create: `supabase/verification/mobile-user-profile-post-apply-verification.sql`
- Modify: `scripts/wave2-combined-postgres-release-harness.cjs` (register descriptor `MOBILE_USER_PROFILE` after `MOBILE_ROLLOUT_WAVES`; add the verification file beside its siblings)
- Modify: `__tests__/wave2CombinedPostgresReleaseHarness.test.js` (round-8 finding — this LIVE test pins the verifier and descriptor arrays by exact ordered equality; extend BOTH pinned arrays with `mobile-user-profile-post-apply-verification.sql` and `MOBILE_USER_PROFILE` in the same positions as the registration, or the registration necessarily fails the release suite)
- Read first: `scripts/rollout-waves-postgres-harness.cjs` (the structural model: env gating on `MOBILE_OPERATIONAL_REPORTING_DATABASE_URL` + `_DISPOSABLE_CONFIRM`, localhost refusal, randomUUID fixtures, JSON summary line, teardown ordering)

**Interfaces:**
- Consumes: Task 1's RPC by exact name/payload.
- Produces: descriptor `MOBILE_USER_PROFILE` in the combined harness; a green combined run is the behavioral gate for this feature's SQL.

- [ ] **Step 1: Write the harness**

Fixture (randomUUID). Users:
- **Profile EA** (auth user + trigger-created identity link with role `ea` + `teampact_user_id` set + roster row): the main subject. Wave + live membership (direct service inserts — the loader is proven elsewhere). classes/children/groups/assignments — 3 children assigned, 2 with an `assessments` row EACH (one imported `capture_mode NULL` by another user, one app-captured by the EA) → `children_assessed = 2`, `children = 3`. Time entries: completed 65-min (in-window weekday), active `sign_out_time NULL` (in-window), auto-clocked-out completed (in-window), one 60 days back. app_open ×2; TWO push tokens — one older INVALIDATED and one LIVE current token with exact platform/app_version/last_seen_at (round-6 finding: the profile's current-device fields must be positively asserted, not just absence-tested).
- **ROSTER-ONLY EA** — the only persistable roster-only shape under the live FK (`education_assistants.user_id REFERENCES auth.users`; round-2 finding): insert the auth user (the `on_auth_user_created` trigger creates its identity link), insert the roster row, then DELETE that fixture's `staff_identity_links` row. Assert the auth + roster rows exist and the identity-link row is absent BEFORE calling the RPC. Document this sequence in the harness comments; all three rows join scoped teardown.
- **IDENTITY-ONLY user** — auth user + trigger identity link (role `ea`), NO roster row.
- **AUTH-ONLY-equivalent** — an unknown random uuid (no rows anywhere; RPC is population-agnostic).
- **QUIET EA** — auth user + identity link + roster; lifetime clock/session rows 60+ days old, ZERO rows in the last 30 days; ONE invalidated-only push token (`registered = false`, `ever_registered_device = true` — the reach-ratchet case moves here).
- **Control EA** — identity+roster+data, used only for cross-user isolation.
- **CORRUPT-CLOCK EA** — identity+roster + one valid entry + one corrupt COMPLETED entry dated 60+ days back (`sign_out_time < sign_in_time`); a second variant swaps the corruption to `auto_clocked_out = TRUE AND sign_out_time IS NULL` (update the row between the two assertions). Proves the guard is unwindowed (round-4 finding).

**Session inventory for the Profile EA (exactly these six, each with a unique `notes` marker used by the assertions; all Literacy Coach):**
| id | notes | date | attendees | activities | role |
|---|---|---|---|---|---|
| S1 | `fx-letters` | in-window weekDAY | 2 present + 1 absent, group A | `letters_focused: ["a","b"]`, blends null | letters + present-count case |
| S2 | `fx-blend` | in-window weekday | 1 present, group B | letters null, `blend_categories: ["short vowels"]` | blending case |
| S3 | `fx-legacy` | in-window weekday | NONE; `group_ids = ARRAY[groupB, groupA]` | letters null, blends null | fallback names ONLY groupB (first element) |
| S4 | `fx-twogroup` | in-window weekday | present attendees in BOTH groups | letters `["c"]` | ONE row, deterministic `"<A-name>, <B-name>"` alphabetical join |
| S5 | `fx-old` | 60 days back | 1 present, group A | letters `["d"]` | outside strip AND 30-day window; inside lifetime + 26-week range |
| S6 | `fx-saturday` | in-window SATURDAY | 1 present, group A | letters `["e"]` | counted in totals/windowed/recent but NOT in any weekday-strip cell |

Derived expectations (single source of truth — every scenario reconciles against THIS table): `lifetime.totals.sessions = 6`; `windowed_activity.sessions = 5` (S5 excluded); strip cells sum = 4 (S1–S4; S6 is Saturday); `recent_sessions` = exactly 6 rows newest-first, asserted by their `notes` markers as an ordered identity set.

Scenario assertions (each a named key in the summary object):
1. `argValidation` — NULL arg raises `mobile_user_profile_user_id_required`.
2. `identityAndWave` — display name, school, expectation `seeded`; `wave.name`; `user_id` echoes the input; `days = 30`.
2b. `populationVariants` — identity+roster EA: full identity; ROSTER-ONLY EA: identity NON-null with roster name/school/status (never synthesized); IDENTITY-ONLY user: identity non-null with identity-cascade name and `Unattributed`; UNKNOWN random uuid: `"identity": null`, zero counts, empty lists (RPC is population-agnostic).
2c. `windowedVsLifetime` — the QUIET fixture user: `windowed_activity` counts all zero with null timestamps while `lifetime.totals` are nonzero and `first/last_ever_activity_at` non-null; the main EA: windowed counts match only the rows inside the last 30 SAST days.
2d. `deviceEvidence` (round-6 finding) — Profile EA: `app_device.registered = true` with the LIVE token's exact `platform`/`app_version`/`last_seen_at` values asserted AND `ever_registered_device = true`; QUIET EA (invalidated-only): `registered = false` with null current fields AND `ever_registered_device = true`; UNKNOWN uuid: `registered = false`, `ever = false`.
3. `dataCounts` — children 3, `children_assessed` 2, groups/classes/grouped counts as seeded.
4. `lifetimeAndTotals` — totals match the fixture inventory exactly (clock_entries incl. active + old; clock_days distinct SAST dates; clock_minutes_completed excludes the active entry; sessions 6 per the S1–S6 table; app_assessments 1); `windowed_activity.sessions = 5` (S5 outside the window); `first/last_ever_activity_at` bracket the 60-day-old and newest rows; app_open first/last match.
5. `weeklyBuckets` — exactly 26 rows, strictly-increasing Mondays ending at the current SAST week; the buckets containing the seeded weeks carry the right counts; all others zero.
6. `weekdayStrip` — 10 ascending weekday dates; cells reflect exactly S1–S4's dates (and 0 elsewhere); S6 (Saturday) appears in totals and recent_sessions but in NO strip cell.
7. `recentSessions` — exactly 6 rows, newest-first, identified as the ordered set of `notes` markers `fx-*` from the inventory table (no scenario can be silently dropped); S1 emits `letters_focused` + null blends and `present_attendees = 2`; S2 the reverse focus shape; S3 resolves `group_name` to ONLY groupB (first `group_ids` element); S4 emits ONE row with the deterministic alphabetical `"<A-name>, <B-name>"` join; notes passthrough on every row.
8. `clockEntries` — ordered newest-first; pairing (`is_active` ⟺ null sign_out ⟺ null duration); `auto_clocked_out` flag present; NO `lat`/`lon` keys anywhere in the payload (assert via jsonb path scan of the whole payload text).
8b. `invalidIntervalGuardUnwindowed` — the CORRUPT-CLOCK EA's profile call raises `mobile_user_profile_invalid_interval` for BOTH corruption variants (60+ days old — outside any window), and the Profile EA's own call still succeeds (guard is per-user scoped).
9. `crossUserIsolation` — the control EA's payload contains none of the profile EA's session/clock counts.
10. `zeroResidue` — teardown removes every fixture row (append-only wave trigger disabled only for scoped deletes inside the teardown transaction, per the rollout-waves harness precedent).

- [ ] **Step 2: Write the post-apply verification SQL**

`supabase/verification/mobile-user-profile-post-apply-verification.sql` mirroring the rollout-waves verifier (BEGIN-only, DO assertions, final NOTICE `mobile_user_profile_structure_verified residue_free`): function exists with exactly 1 overload, args `(UUID)`, returns jsonb, `prosecdef = false`, `provolatile = 's'`, `search_path` proconfig empty, service_role EXECUTE effective, anon/authenticated/authenticator NOT; `prosrc` contains `children_assessed`, `recent_weekday_sessions`, and NOT `sign_in_lat`.

- [ ] **Step 3: Register in the combined harness**

Descriptor `MOBILE_USER_PROFILE` (copy the `MOBILE_ROLLOUT_WAVES` entry shape) + verification file registration.

- [ ] **Step 4: Run the proof**

`npm test -- __tests__/mobileUserProfileSqlContract.test.js __tests__/wave2CombinedPostgresReleaseHarness.test.js` stays green (the second is the pinned registry contract — round-8 finding). Then attempt `npm run verify:wave2:combined-postgres` with the documented env (`WAVE2_RELEASE_ADMIN_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`, fresh `WAVE2_RELEASE_DATABASE_NAME` beginning `zazi_wave2_release_`, the documented confirm value). If the sandbox blocks the DB connection, report exactly that — the coordinator runs it un-sandboxed before committing (proven flow). The coordinator additionally runs the FULL `npm test` suite before committing this task (release-pin regressions must not ride in).

- [ ] **Step 5: Commit**

```bash
git add scripts/mobile-user-profile-postgres-harness.cjs supabase/verification/mobile-user-profile-post-apply-verification.sql scripts/wave2-combined-postgres-release-harness.cjs __tests__/wave2CombinedPostgresReleaseHarness.test.js
git commit -m "test(profile): behavioral harness and post-apply verification for mobile_user_profile"
```

---

### Task 3: Django — `GET /api/mobile/users/<uuid>/`

**Files:**
- Modify: `api/mobile/reports.py` (new `MOBILE_USER_PROFILE_SCHEMA` + validator, `fetch_user_profile`, `MobileReportingNotFound`)
- Modify: `api/views_mobile.py` (new view `mobile_user_profile`), `api/urls.py` (`path('mobile/users/<uuid:user_id>/', …, name='mobile-user-profile')`)
- Modify: `api/services/mobile_notifications.py` (`ALLOWED_REPORTING_RPCS` += `"mobile_user_profile": {"p_user_id"}`)
- Create tests in: `api/tests_mobile_operational_reports.py` (new `MobileUserProfileTests` class + endpoint tests) and one real-client allowlist regression in `api/tests_mobile_reports.py`
- Read first: `api/mobile/reports.py` — `fetch_user_health` (population + auth-join flow), `_eligible_reporting_population`, `_normalized_auth_user`, `_with_provisioning_auth_evidence`, `_parse_timestamp`; the validator style of `MOBILE_USER_HEALTH_DOMAIN_SCHEMA`

**Interfaces:**
- Consumes: Task 1's RPC payload.
- Produces: `fetch_user_profile(user_id, *, client=None)` returning the RPC payload + `"auth"` block (same shape as a health row's auth: `state, created_at, last_sign_in_at, provisioning_cutoff_at, authenticated_after_provisioning`) + `"email"`; raises `MobileReportingNotFound` (new exception, `status_code = 404`, message `"user not found"`) for uuids outside the eligible population; raises `MobileReportingError` (sanitized 502) on any contract violation. Task 4's zod schema mirrors this response.

- [ ] **Step 1: Write the failing tests**

In `api/tests_mobile_operational_reports.py`, add fixture builder `user_profile_payload()` returning a fully-populated spec-shaped dict for `SEEDED_USER_ID`. **`generated_at` is PINNED to `"2026-08-16T22:30:00+00:00"`** — Sunday in UTC but Monday 00:30 in Africa/Johannesburg (round-5 finding: this boundary makes a UTC-date implementation of the chronology validator fail loudly): the 26 weekly buckets are Mondays ending at `2026-08-17`, and the 10 strip weekdays end at Monday `2026-08-17` — generate both in code FROM the SAST date and additionally assert the literal endpoints (`weekly[-1]["week_start"] == "2026-08-17"`; `dates[-1] == "2026-08-17"`) so the derivation itself is pinned; 2 recent sessions covering letters vs blending mutual exclusion; 2 clock entries covering completed + active), and `MobileUserProfileTests(SimpleTestCase)` using the existing `reporting_client(...)` fake (its `.rpc` side_effect must now also dispatch `"mobile_user_profile"`):

```python
def test_profile_joins_auth_and_passes_payload_through(self):
    client = reporting_client(user_profile_payload())
    result = fetch_user_profile(SEEDED_USER_ID, client=client)
    self.assertEqual(result["identity"]["display_name"], "Asemahle M")   # match the fixture builder
    self.assertEqual(result["auth"]["state"], "ready")
    self.assertIs(result["auth"]["authenticated_after_provisioning"], True)
    self.assertEqual(len(result["weekly"]), 26)
    self.assertEqual(len(result["recent_weekday_sessions"]["dates"]), 10)
    client.rpc.assert_any_call("mobile_user_profile", {"p_user_id": SEEDED_USER_ID})

def test_unknown_or_excluded_user_is_not_found(self):
    # a uuid absent from the eligible population -> MobileReportingNotFound
    # an excluded synthetic account (FAKE_DATA_USER_ID) -> MobileReportingNotFound

def test_auth_only_user_gets_synthesized_identity(self):
    # payload with "identity": null for AUTH_ONLY_USER_ID -> display name from GoTrue,
    # current_school "Unattributed", expectation "unknown", counts/lists passthrough

def test_rpc_receives_canonical_string_for_uuid_object_input(self):
    # Round-1 finding: the URL converter passes uuid.UUID, which is not JSON
    # serializable — fetch_user_profile must normalize FIRST.
    import uuid as uuid_module
    client = reporting_client(user_profile_payload())
    fetch_user_profile(uuid_module.UUID(SEEDED_USER_ID), client=client)
    client.rpc.assert_any_call("mobile_user_profile", {"p_user_id": SEEDED_USER_ID})

def test_profile_invariants_fail_closed(self):
    # subTest table with __cause__ substring pinning:
    #  - weekly length 25            -> "weekly must have 26 buckets"
    #  - non-Monday week_start       -> "weekly buckets must be Mondays"
    #  - EVERY weekly date shifted back exactly one week (internally valid,
    #    but not ending at generated_at's SAST week)
    #                                 -> "weekly must end at the current week"
    #  - strip dates length 9        -> "weekday strip must have 10 dates"
    #  - strip = 10 valid weekdays all one week older than generated_at implies
    #                                 -> "weekday strip must be current"
    #  - strip cells/dates mismatch  -> "weekday strip cells mismatch"
    #  - clock entry sign_out None with duration set -> "incomplete clock entry"
    #  - windowed_activity count>0 with null matching timestamp
    #                                 -> "incomplete windowed activity"
    #  - payload user_id != requested id -> "user id mismatch"
    #  - days != 30                  -> "unexpected activity window"
    #  - children_assessed > children -> "children_assessed exceeds children"
    #  - a session with BOTH letters_focused and blend_categories non-null
    #                                 -> "session focus must be exclusive"
    #  - app_device.registered true with platform or last_seen_at null
    #                                 -> "incomplete device evidence"   (round-6: carry the
    #    live user-health rule: registered ⟺ platform AND last_seen_at present)
    #  - app_device.registered FALSE with non-null platform AND last_seen_at
    #                                 -> "incomplete device evidence"   (round-7: the rule is
    #    BIDIRECTIONAL — evidence without registration is the same drift)
    #  - app_device.registered true with ever_registered_device false
    #                                 -> "registered device must imply ever registered"

def test_endpoint_requires_capability_and_maps_statuses(self):
    # endpoint test class: senior_staff 200; junior_staff 403; bad uuid segment 404 by URL conv;
    # MobileReportingNotFound -> 404 {"error": "user not found"};
    # MobileReportingError -> 502 sanitized (patch fetch_user_profile like the health tests do)

def test_endpoint_serializes_uuid_through_the_real_adapter(self):
    # UNPATCHED view->fetch_user_profile path (round-1 finding): patch only the
    # SupabaseNotificationClient construction (the layer BELOW the adapter) with the
    # reporting_client fake, hit the endpoint with a real uuid URL, and assert 200 +
    # the fake's rpc received {"p_user_id": "<canonical string>"} — proving the
    # uuid.UUID from the URL converter never reaches the JSON body unserialized.
```

Write these as full real tests following the file's existing conventions (module constants, `assertRaisesRegex`, `@override_settings`, patched Clerk verifier). In `api/tests_mobile_reports.py`, add `test_user_profile_rpc_is_admitted_with_exact_args` next to the existing allowlist-boundary tests (real `SupabaseNotificationClient.rpc("mobile_user_profile", {"p_user_id": "<uuid>"})` with the HTTP layer mocked; asserts the request is issued).

- [ ] **Step 2: Run to verify RED**

`/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/venv/bin/python manage.py test api.tests_mobile_operational_reports api.tests_mobile_reports -v 1` → new tests FAIL (missing function/schema/route), existing 49 PASS.

- [ ] **Step 3: Implement**

- `MobileReportingNotFound(Exception)` with `status_code = 404` next to `MobileReportingError`.
- `MOBILE_USER_PROFILE_SCHEMA`: Draft 2020-12, `additionalProperties: False` at every level, reusing the `$defs` idioms (`uuid`, `nullable_timestamp`, `count`, the wave def). All top-level keys required (the RPC always emits the full shape). `letters_focused`/`blend_categories`: `{"anyOf": [{"type": "array", "items": {"type": "string"}}, {"type": "null"}]}`.
- `_validate_user_profile_payload(payload, *, user_id)`: schema validation + the invariants pinned in Step 1's `__cause__` table. Chronology is anchored on the payload's own `generated_at` (NOT wall clock — deterministic for fixtures and midnight-crossing requests; round-1 finding): compute the SAST date of `generated_at`, derive the expected current ISO Monday and expected exact last-10-weekday list from it, and compare the COMPLETE `weekly` week_start array (26 Mondays ending at that expected Monday) and the COMPLETE `recent_weekday_sessions.dates` array against the derived values. Other invariants: clock pairing `is_active ⟺ sign_out_time is None ⟺ duration_minutes is None`; `windowed_activity` count⟺timestamp pairing per source + `last_activity_at` = max (reuse the health-domain pairing rules verbatim); `payload["user_id"] == user_id`; `payload["days"] == 30`; `children_assessed <= children`; per-session focus exclusivity; lifetime pair/order rules reused from the Part B helpers. Wrap in the same try/except → sanitized `MobileReportingError`.
- `fetch_user_profile(user_id, *, client=None)`: FIRST normalize `user_id = str(uuid.UUID(str(user_id)))` (the URL converter passes a `uuid.UUID` object, which is not JSON serializable — round-1 finding); resolve client like `fetch_user_health`; `included_user_ids` + auth users via the existing `_eligible_reporting_population` flow; `user_id not in included` → `MobileReportingNotFound`; call RPC with `{"p_user_id": user_id}` (the normalized string); validate with `user_id=user_id`; if `identity` is None, synthesize from the GoTrue display-name fallback exactly as the health board's auth-only path (`"Unattributed"`, expectation `"unknown"`); build the `auth` block via `_normalized_auth_user` + `_with_provisioning_auth_evidence` (construct the wrapper dict it expects: `{"auth": …, "data": {"expectation": …}}` and take its enriched `auth`); attach `email`.
- View + URL + allowlist entry per the Files list; the view mirrors `mobile_user_health`'s authorization (`MOBILE_USER_HEALTH_READ`) and error mapping, adding the 404 branch.

- [ ] **Step 4: Run to verify GREEN**

Same command → all tests pass (49 existing + new).

- [ ] **Step 5: Commit**

```bash
git add api/mobile/reports.py api/views_mobile.py api/urls.py api/services/mobile_notifications.py api/tests_mobile_operational_reports.py api/tests_mobile_reports.py
git commit -m "feat(api): per-EA profile endpoint reading mobile_user_profile"
```

---

### Task 4: Frontend — `lib/mobile/user-profile/` module

**Files:**
- Create: `lib/mobile/user-profile/schema.ts`, `types.ts`, `request.ts`, `response.ts`, `presentation.ts`, `test-fixtures.ts`, and colocated `schema.test.ts`, `request.test.ts`, `response.test.ts`, `presentation.test.ts`
- Modify: `lib/mobile/api.ts` (add `getMobileUserProfile`)
- Read first: `lib/mobile/user-health/{schema,types,request,response}.ts` (the house module pattern to mirror exactly), `lib/mobile/user-health/presentation.ts` (`getActivityStage`, `isQuiet`, `hasEverOpenedApp` signatures), `lib/mobile/user-health/wave.ts` (`getWaveDayNumber`)

**Interfaces:**
- Consumes: Task 3's response contract.
- Produces (Task 5 imports these): `MobileUserProfileResponse` / `MobileUserProfile*` types incl. `MobileUserProfileWeeklyRow { week_start: string; clock_days: number; clock_minutes_completed: number; sessions: number; app_assessments: number }` (an explicit interface — NEVER `{week_start: string} & Record<string, number>`, which is unsatisfiable in TS; round-1 finding); `mobileUserProfileSchema`; `validateProfileUserId(rawId: string): string | null` in `request.ts` — the PURE malformed-id boundary (canonical lowercase uuid, or null for anything else; round-4 finding: `lib/mobile/api.ts` imports `server-only` and cannot be loaded by the node:test runner, so the short-circuit logic must live in a pure module — the same seam split the user-health module already uses); `buildUserProfileRequest(token, userId)` (throws `RangeError` on non-uuid — callers pass a validated id); `decodeMobileUserProfileResponse` result union including `{ ok: false; status: 404; notFound: true }` (exact-body rule); `getMobileUserProfile(userId)` in `api.ts` — a THIN server-only wrapper mirroring `getMobileUserHealth` (which likewise has no unit test — the pure seams carry the coverage) with this EXACT ordering (round-5 finding): `requireMobileUserHealthSession()` FIRST (the /mobile-app layout only enforces the broad any-mobile-capability boundary, so skipping this on the malformed path would let junior_staff reach the profile not-found page), THEN `validateProfileUserId`, returning the notFound variant on null without fetching — so for capability-holders a malformed id and an unknown uuid are indistinguishable, and non-holders are redirected for BOTH id shapes; presentation helpers `formatSessionFocus(letters: string[] | null, blends: string[] | null): string` ("A, B" | "Blending: short vowels" | "—"), `formatDurationMinutes(minutes: number | null): string`, `formatDurationSeconds(seconds: number | null): string`, and `toHealthRowShape(profile): MobileUserHealthRow` — a FULLY faithful mapping now that the contract carries what the board needs: `user_id` ← `profile.user_id`, `activity` ← `profile.windowed_activity` (the board's exact 30-day semantics — never lifetime totals), `app_device`/`ever_registered_device`/`last_app_open_at`/lifetime fields/`auth`/`wave` ← same-named fields, `data.expectation` ← identity (or `"unknown"`), remaining `data` counts ← `profile.data`, `display_name`/`email`/`employment_status`/school fields ← identity/auth. `getActivityStage`/`isQuiet`/`hasEverOpenedApp` then run UNMODIFIED with board meaning; windowed indicators are labeled `· 30d` (`profile.days`).

- [ ] **Step 1: Write the failing tests**

Real node:test files mirroring `user-health`'s style. Fixture `VALID_MOBILE_USER_PROFILE_PAYLOAD` in `test-fixtures.ts`: full response for one seeded EA — **`generated_at` PINNED to the SAME UTC/SAST boundary as the Django fixture: `"2026-08-16T22:30:00+00:00"`** (Sunday UTC / Monday 00:30 SAST — a UTC-date zod implementation must fail on it; round-5 finding), with the 26 weekly buckets and 10 strip dates DERIVED in code from that `generated_at`'s SAST date and the literal endpoints additionally asserted (`week_start` array ends `"2026-08-17"`; strip ends `"2026-08-17"`), `user_id`, `days: 30`, a `windowed_activity` block consistent with the newest in-window rows, 3 recent sessions (letters / blending / legacy-fallback group), 3 clock entries (completed / active / auto), wave + auth blocks. Also export a `QUIET_MOBILE_USER_PROFILE_PAYLOAD` variant: `windowed_activity` all-zero/null while lifetime totals are nonzero. Tests pin:
- schema RETAINS values (parse output deep-equals the significant fields — zod strips unknowns, so retention is the point) and rejects: 25 weekly buckets; non-Monday `week_start`; ALL weekly dates shifted back one week (internally consistent but not ending at `generated_at`'s SAST week); strip length 9; strip dates one week stale; both-focus-non-null session; `children_assessed > children`; active clock entry with non-null duration; `windowed_activity` count>0 with null timestamp; `days !== 30`; `app_device.registered` true with null `platform`/`last_seen_at` AND the reverse — `registered` false with BOTH `platform` and `last_seen_at` non-null (the biconditional's other direction; round-7 finding); `registered` true with `ever_registered_device` false (round-6 finding — all carried from the live user-health rules).
- request: builds `/api/mobile/users/<uuid>/` with bearer header; throws `RangeError` on a non-uuid id.
- response: a 404 maps to the notFound variant ONLY when its JSON body is exactly `{"error": "user not found"}` (the endpoint's contract); a 404 with any other body — HTML, empty, or different JSON (the Django-rollback route-404 case) — maps to the service-unavailable error variant, with tests for both 404 shapes (round-2 finding); non-OK and malformed JSON map to the existing 502-style error message pattern.
- pure malformed-id boundary (node:test-runnable; round-4 finding): `validateProfileUserId("not-a-uuid") === null`, `validateProfileUserId("<UPPERCASE uuid>")` returns the canonical lowercase string, and `buildUserProfileRequest` throws on a non-validated id — the server-only `api.ts` wrapper is deliberately untested at unit level, matching the module convention.
- presentation: `formatSessionFocus(["a","b"], null) === "A, B"`; `(null, ["short vowels"]) === "Blending: short vowels"`; `(null, null) === "—"`; `toHealthRowShape`: main fixture → `getActivityStage === "active"` AND `isQuiet === false`; QUIET fixture → stage `"active"` (lifetime) AND `isQuiet === true`; an app_open-only variant → `"reached"` — proving windowed vs lifetime semantics survive the mapping exactly.

- [ ] **Step 2: Run to verify RED** — `npm run test:mobile` (glob covers the new dir) → new tests fail (modules missing).

- [ ] **Step 3: Implement** the module per the interfaces above, mirroring `user-health` file-for-file (zod v4, `z.iso.date()` / `z.iso.datetime({offset:true})`, superRefine invariants matching Task 3's Django list, issue paths in house style). `getMobileUserProfile` mirrors `getMobileUserHealth` (session capability check `mobile.user_health.read`, token, `djangoFetch`, error mapping + the notFound branch).

- [ ] **Step 4: Gates** — `npm run test:mobile` PASS · `npx tsc --noEmit --incremental false` clean · `npx eslint lib/mobile/user-profile` clean.

- [ ] **Step 5: Commit**

```bash
git add lib/mobile/user-profile/ lib/mobile/api.ts
git commit -m "feat(profile): user-profile data module with schema and presentation"
```

---

### Task 5: Frontend — profile + index pages, components, links

**Files:**
- Create: `app/mobile-app/users/page.tsx`, `app/mobile-app/users/[id]/page.tsx`
- Create: `components/mobile-app/user-profile/profile-header.tsx`, `evidence-panel.tsx`, `lifetime-summary.tsx` (round-6 finding — the KPI owner of `profile.lifetime.totals`: clock days, completed clock time via `formatDurationMinutes`, total clock entries, total sessions, total app assessments — every tile explicitly labeled `Lifetime`), `weekday-session-strip.tsx`, `weekly-bar-chart.tsx`, `recent-sessions-table.tsx`, `clock-history-table.tsx`, `profile-how-to-panel.tsx`, `users-index-table.tsx` (round-6 finding — PURE component taking already-fetched health rows, so the node render test can import it; the server page only does auth/fetch/branching), `profile-not-found.tsx` (pure shared not-found state, rendered by the page for BOTH the malformed-id and unknown-uuid variants)
- Modify: `components/mobile-app/layout/mobile-sidebar.tsx` (activate "Users" → `/mobile-app/users`, drop its SOON state; leave "Schools — soon" untouched; add an EXPLICIT `/mobile-app/users` branch to `canOpenItem` returning the user-health capability. Binding authorization behavior = the component's EXISTING convention for enabled-but-unauthorized items (round-3 finding): the desktop renderer returns null and the mobile renderer filters by `canOpenItem`, so Users is a LINK for capability-holders and simply ABSENT for junior_staff — never a disabled/"Soon" item, which would falsely promise a later release. **Mobile nav capacity (round-4 finding):** a capability-holder now gets six `min-w-20` items (≥504px with padding) in a non-wrapping bar that clips at 320–430px phone widths — make the mobile item row horizontally scrollable (`overflow-x-auto`, items `shrink-0`, `scrollbar-none` style consistent with the section, plus a right-edge fade gradient as the scroll affordance) so every destination stays reachable. Pin the classes in the sidebar render test AND prove the behavior in the EXISTING authenticated Playwright suite (round-5 correction — `e2e/test.ts` provides `signInAsRole`, `e2e/mobile-app-auth.spec.ts` already exercises role-gated /mobile-app routes, `playwright.config.ts` wires Clerk setup): see the e2e additions in this task's Files/tests.)
- Modify: `components/mobile-app/user-health/user-health-board.tsx` (EA display name → `<Link href={/mobile-app/users/${user.user_id}}>`)
- Modify: the attendance ledger components that render EA names — the capability-gated names ALREADY link to the filtered user-health board (`/mobile-app/user-health?days=…&school_id=…&q=<uuid>`); RETARGET those links to `/mobile-app/users/<id>` on the same capability branch, in BOTH the by-shift and per-EA views (all four desktop/mobile renderings), leaving the without-capability plain-text branch untouched
- Modify: `lib/mobile/time-entries/ledger.test.ts` — its existing assertion pins the OLD user-health destination and runs inside `npm run test:mobile` (round-3 finding): rewrite the link expectation to the exact profile URL for both views, and KEEP the negative assertion that no link renders without the capability
- Create tests in: `lib/mobile/user-profile/profile-render.test.ts` (renderToStaticMarkup component tests, board-copy style) and extend `lib/mobile/user-health/board-copy.test.ts` for the board link
- Create/extend: `e2e/mobile-app-users.spec.ts` (authenticated Playwright, using the existing `signInAsRole` + config; round-5 findings): (a) senior-role at 375×812 viewport — `/mobile-app` mobile nav overflows horizontally, scrolls to the end, and Users + Site are visible and clickable; `/mobile-app/users` loads; (b) senior-role visiting `/mobile-app/users/not-a-uuid` sees the shared not-found state; (c) junior-staff role is redirected (insufficient role) for BOTH `/mobile-app/users/<valid-uuid>` AND `/mobile-app/users/not-a-uuid`, and the Users nav item is absent. Follow the existing spec file's skip-when-unconfigured convention but treat skipped Clerk cases as UNVERIFIED in the report, never as green.
- Read first: `app/mobile-app/user-health/page.tsx` (server-component page pattern: session→token→fetch→error states), `components/pm/sessions/ea-heatmap.tsx` (cell-color idiom to borrow for the strip), `components/mobile-app/attendance/attendance-trend-chart.tsx` (Recharts idiom for `weekly-bar-chart`), `components/mobile-app/user-health/how-to-read-panel.tsx` (honesty-panel style)

**Interfaces:**
- Consumes: everything Task 4 produces; `getWaveDayNumber`; `getActivityStage`/`isQuiet` via `toHealthRowShape`; the user-health feed for the index page (`getMobileUserHealth`).

- [ ] **Step 1: Write the failing render tests**

`profile-render.test.ts` over the shared fixture: header shows name · school · wave chip (`ZZ Primary 2026 · launched … · day n`) · stage badge `Activated`/`Reached` with the SAME wording rules as the board (windowed suffix only on windowed indicators); evidence panel shows the tri-state login line, device current+ever, `Opened` first/last, and the coverage line exactly `"2 of 3 children have assessment info"`; strip renders 10 cells with the seeded counts; recent-sessions table renders letters uppercased (`A, B`), `Blending: short vowels`, the fallback group name, present counts, duration; clock table renders in/out/duration/auto marker and no `lat`/`lon` text; how-to panel contains the lifetime-vs-windowed note and NEVER the words `mastered`/`learned` (negative assertions); windowed Active/Quiet indicators carry the `· 30d` suffix and the QUIET fixture renders the Quiet indicator; index page test: renders roster rows as links to `/mobile-app/users/<id>`; board-copy test: EA names on the health board are links; sidebar render tests: with user-health capability the Users item is an enabled link; without it (junior_staff shape) Users is ABSENT entirely (desktop renders null, mobile filters it out — the component's existing unauthorized convention) — asserted on BOTH nav variants, and the mobile item row pins the `overflow-x-auto` + `shrink-0` capacity classes (round-4 finding); lifetime-summary render test (round-6 finding): the KPI tiles show the fixture's exact lifetime clock days, completed time, entries, sessions, and assessments, each carrying the literal word `Lifetime`; weekly-charts render test (round-8 finding — the dataKey union is not an exhaustiveness proof): the rendered page section contains EXACTLY FOUR distinct weekly chart blocks with the literal titles for clock days, completed clock minutes, sessions, and app assessments, and each block renders its OWN fixture metric value (distinct per-metric fixture numbers so a duplicated dataKey cannot satisfy two assertions — keep the completed-clock-minutes assertion literal); users-index test targets the PURE `UsersIndexTable` (health-row fixtures in, roster rows out as `/mobile-app/users/<id>` links); not-found coverage targets the PURE `profile-not-found.tsx` rendered identically for the malformed-id and unknown-uuid variants (pages are server-only and stay outside the node:test runner; `validateProfileUserId` carries the malformed-id logic).

- [ ] **Step 2: RED** — `npm run test:mobile` → new tests fail.

- [ ] **Step 3: Implement**

- Pages mirror the user-health page skeleton (auth → `getMobileUserProfile(params.id)` → error/notFound/other states; index uses `getMobileUserHealth` and renders name/school/wave/stage rows sorted by name). `[id]` validated by the request helper (throws → notFound state).
- `weekly-bar-chart.tsx`: small client component `WeeklyBarChart({ title, description, series, dataKey })` with `series: MobileUserProfileWeeklyRow[]` and `dataKey: "clock_days" | "clock_minutes_completed" | "sessions" | "app_assessments"` (explicit union — the intersection-with-index-signature form cannot typecheck; round-1 finding); Recharts BarChart per the attendance idiom; rendered FOUR times from the page — clock_days, clock_minutes_completed, sessions, app_assessments — so every union key is compile-checked and no computed weekly metric goes unrendered (round-6 finding).
- `weekday-session-strip.tsx`: server-compatible, `{ dates: string[]; cells: number[] }`, one row of colored cells + date labels (borrow `cellColor` thresholds from `ea-heatmap.tsx`).
- Tables/panels server-compatible (no hooks). Copy rules from Global Constraints verbatim.
- Sidebar + link integrations per Files list.

- [ ] **Step 4: Gates** — `npm run test:mobile` PASS · `npx tsc --noEmit --incremental false` clean · `npx eslint app/mobile-app components/mobile-app lib/mobile/user-profile e2e` clean · `npx playwright test e2e/mobile-app-users.spec.ts` with the Clerk role credentials configured (report each case's real status; a Clerk-skip is UNVERIFIED, not green — the coordinator runs this gate with the configured env if the sandbox cannot).

- [ ] **Step 5: Commit**

```bash
git add app/mobile-app/users/ components/mobile-app/user-profile/ components/mobile-app/layout/mobile-sidebar.tsx components/mobile-app/user-health/user-health-board.tsx lib/mobile/user-profile/ lib/mobile/user-health/board-copy.test.ts lib/mobile/time-entries/ledger.test.ts e2e/mobile-app-users.spec.ts
git add -u components/mobile-app/attendance/
git commit -m "feat(profile): per-EA profile and users index pages"
```

---

### Task 6: Deploy runbook (coordinator + Jim)

- [ ] 1. Merge `feat/ea-profile-rpc` → app `main`; apply `20260813100000` hosted via the proven psql `--single-transaction` + ledger-row flow (Jim authorizes; coordinator executes); run the new post-apply verifier against hosted (expect `mobile_user_profile_structure_verified residue_free`).
- [ ] 2. Merge `feat/ea-profile-api` → django `main`; push (Render deploys). Order matters: RPC first, else the new endpoint 502s.
- [ ] 3. Merge `feat/ea-profile` → frontend `main`; push (Vercel deploys). **Rollback during/after this step is REVERSE order: frontend first, then Django; the RPC stays (additive, inert) — removal would be its own reviewed forward migration.**
- [ ] 4. Smoke on production: open `/mobile-app/users`, click into one seeded EA and one ECD EA; confirm sessions table letters/groups look right; on a phone-width viewport (~375px) confirm the mobile nav scrolls to reach Users and Site without clipping — this production device smoke is SEPARATE evidence on top of the committed authenticated Playwright gate, not a substitute for it; append a build-log entry (migration SHA, verifier line, harness evidence) to the app repo.

## Task dependency order

1 → 2 (supabase chain) · 3 (django; needs only Task 1's contract, buildable in parallel with 2) · 4 → 5 (frontend chain; needs only Task 3's contract) · 6 last with Jim's deploy authorization.
