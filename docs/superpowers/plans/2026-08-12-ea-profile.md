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
- **Contract stability:** every response key always present; null when unknown. New endpoint has no legacy consumers — rollback of any layer is redeploying that layer's previous release; deploy order additive-RPC → Django → frontend.
- **Git:** feature branches (`feat/ea-profile-rpc` app repo, `feat/ea-profile-api` django, `feat/ea-profile` frontend — already created off fresh main); no agent trailers; commit messages as given.

## Repo map

| Role | Path | Branch |
|---|---|---|
| Supabase/app (zazi-izandi-app) | /Users/jimmckeown/Development/zazi-mobile-clock-reporting-supabase | feat/ea-profile-rpc @ 6e5a826 |
| Django | /Users/jimmckeown/Development/zazi-mobile-clock-reporting-django | feat/ea-profile-api @ a60edf4 |
| Frontend | /Users/jimmckeown/Development/zazi-mobile-clock-reporting-nextjs/.worktrees/mobile-ops | feat/ea-profile @ 2911e8e (spec committed e80a675) |

Coordinator re-runs gates and commits (codex sandbox cannot write linked-worktree git indexes). Test-runner quirks: frontend fallback `node --import tsx --test lib/mobile/*.test.ts lib/mobile/*/*.test.ts`; always `npx tsc --noEmit --incremental false`.

---

### Task 1: Supabase — `mobile_user_profile` RPC migration + contract tests

**Files:**
- Create: `supabase/migrations/20260813100000_mobile_user_profile_rpc.sql`
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
      "'generated_at'", "'identity'", "'wave'", "'app_device'",
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

1. `identity_row` — the `identity_population` CTE from v2 (20260813092000) with `AND identity.user_id = p_user_id` replacing the `ANY (p_included_user_ids)` + school-filter predicates; same COALESCE display-name cascade, same `data_expectation` CASE. Emits ≤ 1 row.
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
        COALESCE(attendee_groups.names, fallback_groups.names) AS group_name,
        COALESCE(present_counts.present_attendees, 0)::INTEGER AS present_attendees
      FROM public.sessions AS session_row
      LEFT JOIN LATERAL (
        SELECT pg_catalog.string_agg(DISTINCT group_row.name, ', ') AS names
        FROM public.session_attendees AS attendee
        JOIN public.groups AS group_row ON group_row.id = attendee.group_id
        WHERE attendee.session_id = session_row.id
      ) AS attendee_groups ON TRUE
      LEFT JOIN LATERAL (
        SELECT pg_catalog.string_agg(DISTINCT group_row.name, ', ') AS names
        FROM pg_catalog.unnest(session_row.group_ids) AS legacy(group_id)
        JOIN public.groups AS group_row ON group_row.id = legacy.group_id
      ) AS fallback_groups ON TRUE
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
11. `clock_entries_json` — the entry-shape idiom from `mobile_time_entries_activity` (local_date/sign_in_time/sign_out_time/duration_minutes/auto_clocked_out/is_active — NO roster, NO lat/lon) scoped `WHERE entry.user_id = p_user_id`, `ORDER BY entry.sign_in_time DESC, entry.id LIMIT 100`, plus that RPC's invalid-interval EXISTS guard (ERRCODE 22000, message `mobile_user_profile_invalid_interval`) placed before the main RETURN, scoped to this user's rows.

Final SELECT: `jsonb_build_object` of all top-level keys; `identity` = row-to-jsonb of `identity_row` or NULL when absent (`CASE WHEN identity.user_id IS NULL THEN NULL::JSONB ELSE jsonb_build_object(…) END` via LEFT JOIN of a `(SELECT 1)` anchor — or aggregate `MAX`-style scalars; keep it simple with one `LEFT JOIN identity_row ON TRUE` from a single-row anchor CTE); `wave` = the v2 CASE idiom; `ever_registered_device` = `EXISTS`-driven boolean; `data` includes `children_assessed`. Footer: REVOKE/GRANT/COMMENT/NOTIFY per Global Constraints.

- [ ] **Step 4: Run to verify GREEN**

Run: `npm test -- __tests__/mobileUserProfileSqlContract.test.js` → PASS, and the sibling suites must not regress: `npm test -- __tests__/rolloutWavesAppOpenSqlContract.test.js __tests__/mobileRealUserReportingSqlContract.test.js __tests__/mobileOperationalReportingSqlContract.test.js __tests__/mobileSessionsActivitySqlContract.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260813100000_mobile_user_profile_rpc.sql __tests__/mobileUserProfileSqlContract.test.js
git commit -m "feat(profile): add mobile_user_profile RPC"
```

---

### Task 2: Supabase — behavioral harness scenarios + post-apply verification

**Files:**
- Create: `scripts/mobile-user-profile-postgres-harness.cjs`
- Create: `supabase/verification/mobile-user-profile-post-apply-verification.sql`
- Modify: `scripts/wave2-combined-postgres-release-harness.cjs` (register descriptor `MOBILE_USER_PROFILE` after `MOBILE_ROLLOUT_WAVES`; add the verification file beside its siblings)
- Read first: `scripts/rollout-waves-postgres-harness.cjs` (the structural model: env gating on `MOBILE_OPERATIONAL_REPORTING_DATABASE_URL` + `_DISPOSABLE_CONFIRM`, localhost refusal, randomUUID fixtures, JSON summary line, teardown ordering)

**Interfaces:**
- Consumes: Task 1's RPC by exact name/payload.
- Produces: descriptor `MOBILE_USER_PROFILE` in the combined harness; a green combined run is the behavioral gate for this feature's SQL.

- [ ] **Step 1: Write the harness**

Fixture (randomUUID, one profile EA + one control EA): school; identity link (role `ea`) + `education_assistants` roster row; wave + live membership (direct service inserts — the loader is already proven); classes/children/groups/assignments — 3 children assigned, 2 of them with an `assessments` row EACH (one imported `capture_mode NULL` by another user, one app-captured by the EA) so `children_assessed = 2` while `children = 3`; sessions: one letters-level session (activities `{"letters_focused": ["a","b"], "blend_categories": null, …}`) with 2 present + 1 absent attendees in group A, one blending session (`{"letters_focused": null, "blend_categories": ["short vowels"], …}`) in group B, one LEGACY session with NO attendee rows and `group_ids = ARRAY[groupA]` (fallback path), one session dated 60 days back (outside strip, inside lifetime/weekly range); time entries: completed (65 min), active (`sign_out_time NULL`), auto-clocked-out completed, one 60 days back; app_open rows ×2; one invalidated push token only.

Scenario assertions (each a named key in the summary object):
1. `argValidation` — NULL arg raises `mobile_user_profile_user_id_required`.
2. `identityAndWave` — display name, school, expectation `seeded`; `wave.name`; control EA's uuid returns `identity` null-free but the UNKNOWN random uuid returns `"identity": null` with all counts zero and empty lists (RPC is population-agnostic).
3. `dataCounts` — children 3, `children_assessed` 2, groups/classes/grouped counts as seeded.
4. `lifetimeAndTotals` — totals match seeded rows exactly (clock_entries incl. active + old; clock_days distinct SAST dates; clock_minutes_completed excludes the active entry; sessions 4; app_assessments 1); `first/last_ever_activity_at` bracket the 60-day-old and newest rows; app_open first/last match.
5. `weeklyBuckets` — exactly 26 rows, strictly-increasing Mondays ending at the current SAST week; the buckets containing the seeded weeks carry the right counts; all others zero.
6. `weekdayStrip` — 10 ascending weekday dates; cells reflect the seeded session dates (and 0 elsewhere); weekend session (seed one on a Saturday) NOT counted in any cell.
7. `recentSessions` — 4 rows ordered newest-first; letters session emits `letters_focused` array + `blend_categories` null; blending session the reverse; legacy session resolves `group_name` via the `group_ids` fallback; present_attendees 2 for the letters session; notes passthrough.
8. `clockEntries` — ordered newest-first; pairing (`is_active` ⟺ null sign_out ⟺ null duration); `auto_clocked_out` flag present; NO `lat`/`lon` keys anywhere in the payload (assert via jsonb path scan of the whole payload text).
9. `crossUserIsolation` — the control EA's payload contains none of the profile EA's session/clock counts.
10. `zeroResidue` — teardown removes every fixture row (append-only wave trigger disabled only for scoped deletes inside the teardown transaction, per the rollout-waves harness precedent).

- [ ] **Step 2: Write the post-apply verification SQL**

`supabase/verification/mobile-user-profile-post-apply-verification.sql` mirroring the rollout-waves verifier (BEGIN-only, DO assertions, final NOTICE `mobile_user_profile_structure_verified residue_free`): function exists with exactly 1 overload, args `(UUID)`, returns jsonb, `prosecdef = false`, `provolatile = 's'`, `search_path` proconfig empty, service_role EXECUTE effective, anon/authenticated/authenticator NOT; `prosrc` contains `children_assessed`, `recent_weekday_sessions`, and NOT `sign_in_lat`.

- [ ] **Step 3: Register in the combined harness**

Descriptor `MOBILE_USER_PROFILE` (copy the `MOBILE_ROLLOUT_WAVES` entry shape) + verification file registration.

- [ ] **Step 4: Run the proof**

`npm test -- __tests__/mobileUserProfileSqlContract.test.js` stays green. Then attempt `npm run verify:wave2:combined-postgres` with the documented env (`WAVE2_RELEASE_ADMIN_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`, fresh `WAVE2_RELEASE_DATABASE_NAME` beginning `zazi_wave2_release_`, the documented confirm value). If the sandbox blocks the DB connection, report exactly that — the coordinator runs it un-sandboxed before committing (proven flow).

- [ ] **Step 5: Commit**

```bash
git add scripts/mobile-user-profile-postgres-harness.cjs supabase/verification/mobile-user-profile-post-apply-verification.sql scripts/wave2-combined-postgres-release-harness.cjs
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

In `api/tests_mobile_operational_reports.py`, add fixture builder `user_profile_payload()` returning a fully-populated spec-shaped dict for `SEEDED_USER_ID` (26 weekly buckets generated in code — Mondays ending at a fixed "current" week matching the fixture `generated_at`; 10 strip dates; 2 recent sessions covering letters vs blending mutual exclusion; 2 clock entries covering completed + active), and `MobileUserProfileTests(SimpleTestCase)` using the existing `reporting_client(...)` fake (its `.rpc` side_effect must now also dispatch `"mobile_user_profile"`):

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

def test_profile_invariants_fail_closed(self):
    # subTest table with __cause__ substring pinning:
    #  - weekly length 25            -> "weekly must have 26 buckets"
    #  - non-Monday week_start       -> "weekly buckets must be Mondays"
    #  - strip dates length 9        -> "weekday strip must have 10 dates"
    #  - strip cells/dates mismatch  -> "weekday strip cells mismatch"
    #  - clock entry sign_out None with duration set -> "incomplete clock entry"
    #  - children_assessed > children -> "children_assessed exceeds children"
    #  - a session with BOTH letters_focused and blend_categories non-null
    #                                 -> "session focus must be exclusive"

def test_endpoint_requires_capability_and_maps_statuses(self):
    # endpoint test class: senior_staff 200; junior_staff 403; bad uuid segment 404 by URL conv;
    # MobileReportingNotFound -> 404 {"error": "user not found"};
    # MobileReportingError -> 502 sanitized (patch fetch_user_profile like the health tests do)
```

Write these as full real tests following the file's existing conventions (module constants, `assertRaisesRegex`, `@override_settings`, patched Clerk verifier). In `api/tests_mobile_reports.py`, add `test_user_profile_rpc_is_admitted_with_exact_args` next to the existing allowlist-boundary tests (real `SupabaseNotificationClient.rpc("mobile_user_profile", {"p_user_id": "<uuid>"})` with the HTTP layer mocked; asserts the request is issued).

- [ ] **Step 2: Run to verify RED**

`/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/venv/bin/python manage.py test api.tests_mobile_operational_reports api.tests_mobile_reports -v 1` → new tests FAIL (missing function/schema/route), existing 49 PASS.

- [ ] **Step 3: Implement**

- `MobileReportingNotFound(Exception)` with `status_code = 404` next to `MobileReportingError`.
- `MOBILE_USER_PROFILE_SCHEMA`: Draft 2020-12, `additionalProperties: False` at every level, reusing the `$defs` idioms (`uuid`, `nullable_timestamp`, `count`, the wave def). All top-level keys required (the RPC always emits the full shape). `letters_focused`/`blend_categories`: `{"anyOf": [{"type": "array", "items": {"type": "string"}}, {"type": "null"}]}`.
- `_validate_user_profile_payload(payload)`: schema validation + the invariants pinned in Step 1's `__cause__` table (Monday check via `date.fromisoformat(week_start).weekday() == 0`; strictly increasing +7 days; strip dates ascending weekdays `weekday() < 5`; clock pairing `is_active ⟺ sign_out_time is None ⟺ duration_minutes is None`; `children_assessed <= children`; per-session focus exclusivity; lifetime pair/order rules reused from the Part B helpers). Wrap in the same try/except → sanitized `MobileReportingError`.
- `fetch_user_profile(user_id, *, client=None)`: resolve client like `fetch_user_health`; `included_user_ids` + auth users via the existing `_eligible_reporting_population` flow; `str(user_id) not in included` → `MobileReportingNotFound`; call RPC; validate; if `identity` is None, synthesize from the GoTrue display-name fallback exactly as the health board's auth-only path (`"Unattributed"`, expectation `"unknown"`); build the `auth` block via `_normalized_auth_user` + `_with_provisioning_auth_evidence` (construct the wrapper dict it expects: `{"auth": …, "data": {"expectation": …}}` and take its enriched `auth`); attach `email`.
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
- Produces (Task 5 imports these): `MobileUserProfileResponse` / `MobileUserProfile*` types; `mobileUserProfileSchema`; `buildUserProfileRequest(token, userId)` (throws on non-uuid userId); `decodeMobileUserProfileResponse` result union including `{ ok: false; status: 404; notFound: true }`; `getMobileUserProfile(userId)` in `api.ts`; presentation helpers `formatSessionFocus(letters: string[] | null, blends: string[] | null): string` ("A, B" | "Blending: short vowels" | "—"), `formatDurationMinutes(minutes: number | null): string`, `formatDurationSeconds(seconds: number | null): string`, `toHealthRowShape(profile): MobileUserHealthRow`-compatible object (explicit field mapping so `getActivityStage`/`isQuiet`/`hasEverOpenedApp` work unmodified on profile data).

- [ ] **Step 1: Write the failing tests**

Real node:test files mirroring `user-health`'s style. Fixture `VALID_MOBILE_USER_PROFILE_PAYLOAD` in `test-fixtures.ts`: full response for one seeded EA — 26 weekly buckets (generate in code), 10 strip dates, 3 recent sessions (letters / blending / legacy-fallback group), 3 clock entries (completed / active / auto), wave + auth blocks. Tests pin:
- schema RETAINS values (parse output deep-equals the significant fields — zod strips unknowns, so retention is the point) and rejects: 25 weekly buckets; non-Monday `week_start`; strip length 9; both-focus-non-null session; `children_assessed > children`; active clock entry with non-null duration.
- request: builds `/api/mobile/users/<uuid>/` with bearer header; throws `RangeError` on a non-uuid id.
- response: 404 maps to the notFound variant; non-OK and malformed JSON map to the existing 502-style error message pattern.
- presentation: `formatSessionFocus(["a","b"], null) === "A, B"`; `(null, ["short vowels"]) === "Blending: short vowels"`; `(null, null) === "—"`; `toHealthRowShape` round-trips stage semantics (a profile with only `last_app_open_at` → `getActivityStage === "reached"`; lifetime activity → `"active"`; quiet case).

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
- Create: `components/mobile-app/user-profile/profile-header.tsx`, `evidence-panel.tsx`, `weekday-session-strip.tsx`, `weekly-bar-chart.tsx`, `recent-sessions-table.tsx`, `clock-history-table.tsx`, `profile-how-to-panel.tsx`
- Modify: `components/mobile-app/layout/mobile-sidebar.tsx` (activate "Users" → `/mobile-app/users`, drop its SOON state; leave "Schools — soon" untouched)
- Modify: `components/mobile-app/user-health/user-health-board.tsx` (EA display name → `<Link href={/mobile-app/users/${user.user_id}}>`)
- Modify: the attendance ledger component that renders EA names (locate the junior_staff plain-text conditional; add profile links ONLY on the branch where names are already interactive/senior — thread a `canViewProfiles: boolean` prop from the attendance page derived the same way the existing conditional is)
- Create tests in: `lib/mobile/user-profile/profile-render.test.ts` (renderToStaticMarkup component tests, board-copy style) and extend `lib/mobile/user-health/board-copy.test.ts` for the board link
- Read first: `app/mobile-app/user-health/page.tsx` (server-component page pattern: session→token→fetch→error states), `components/pm/sessions/ea-heatmap.tsx` (cell-color idiom to borrow for the strip), `components/mobile-app/attendance/attendance-trend-chart.tsx` (Recharts idiom for `weekly-bar-chart`), `components/mobile-app/user-health/how-to-read-panel.tsx` (honesty-panel style)

**Interfaces:**
- Consumes: everything Task 4 produces; `getWaveDayNumber`; `getActivityStage`/`isQuiet` via `toHealthRowShape`; the user-health feed for the index page (`getMobileUserHealth`).

- [ ] **Step 1: Write the failing render tests**

`profile-render.test.ts` over the shared fixture: header shows name · school · wave chip (`ZZ Primary 2026 · launched … · day n`) · stage badge `Activated`/`Reached` with the SAME wording rules as the board (windowed suffix only on windowed indicators); evidence panel shows the tri-state login line, device current+ever, `Opened` first/last, and the coverage line exactly `"2 of 3 children have assessment info"`; strip renders 10 cells with the seeded counts; recent-sessions table renders letters uppercased (`A, B`), `Blending: short vowels`, the fallback group name, present counts, duration; clock table renders in/out/duration/auto marker and no `lat`/`lon` text; how-to panel contains the lifetime-vs-windowed note and NEVER the words `mastered`/`learned` (negative assertions); index page test: renders roster rows as links to `/mobile-app/users/<id>`; board-copy test: EA names on the health board are links.

- [ ] **Step 2: RED** — `npm run test:mobile` → new tests fail.

- [ ] **Step 3: Implement**

- Pages mirror the user-health page skeleton (auth → `getMobileUserProfile(params.id)` → error/notFound/other states; index uses `getMobileUserHealth` and renders name/school/wave/stage rows sorted by name). `[id]` validated by the request helper (throws → notFound state).
- `weekly-bar-chart.tsx`: small client component `WeeklyBarChart({ title, description, series, dataKey })` with `series: Array<{week_start: string} & Record<string, number>>` — Recharts BarChart per the attendance idiom; rendered three times from the page (clock_days, sessions, app_assessments).
- `weekday-session-strip.tsx`: server-compatible, `{ dates: string[]; cells: number[] }`, one row of colored cells + date labels (borrow `cellColor` thresholds from `ea-heatmap.tsx`).
- Tables/panels server-compatible (no hooks). Copy rules from Global Constraints verbatim.
- Sidebar + link integrations per Files list.

- [ ] **Step 4: Gates** — `npm run test:mobile` PASS · `npx tsc --noEmit --incremental false` clean · `npx eslint app/mobile-app components/mobile-app lib/mobile/user-profile` clean.

- [ ] **Step 5: Commit**

```bash
git add app/mobile-app/users/ components/mobile-app/user-profile/ components/mobile-app/layout/mobile-sidebar.tsx components/mobile-app/user-health/user-health-board.tsx lib/mobile/user-profile/ lib/mobile/user-health/board-copy.test.ts
git add -u components/mobile-app/attendance/
git commit -m "feat(profile): per-EA profile and users index pages"
```

---

### Task 6: Deploy runbook (coordinator + Jim)

- [ ] 1. Merge `feat/ea-profile-rpc` → app `main`; apply `20260813100000` hosted via the proven psql `--single-transaction` + ledger-row flow (Jim authorizes; coordinator executes); run the new post-apply verifier against hosted (expect `mobile_user_profile_structure_verified residue_free`).
- [ ] 2. Merge `feat/ea-profile-api` → django `main`; push (Render deploys). Order matters: RPC first, else the new endpoint 502s.
- [ ] 3. Merge `feat/ea-profile` → frontend `main`; push (Vercel deploys).
- [ ] 4. Smoke on production: open `/mobile-app/users`, click into one seeded EA and one ECD EA; confirm sessions table letters/groups look right; append a build-log entry (migration SHA, verifier line, harness evidence) to the app repo.

## Task dependency order

1 → 2 (supabase chain) · 3 (django; needs only Task 1's contract, buildable in parallel with 2) · 4 → 5 (frontend chain; needs only Task 3's contract) · 6 last with Jim's deploy authorization.
