# Per-EA Profile Pages — Design

_Approved direction from brainstorm with Jim (2026-08-12): raw history v1 (benchmarks v2), counts+trends for assessments, per-record detail for clock AND sessions (group, date, letters — PII fine), children-assessment coverage as one number (no per-child data), sessions-per-weekday strip copied from the heatmap idiom, no GPS on-page, keep scope tight._

## Goal

A PM opens `/mobile-app/users/<id>` and gets one EA's full picture — clock history, days worked, sessions done (with groups and letters focused), assessment activity, onboarding/evidence state — enough to judge "is this person doing their job?" without touching three global boards. Fills the "Users — soon" sidebar placeholder.

## Explicitly OUT of v1 (deferred, do not build)

- Peer/school/wave benchmarks (v2, after PMs use v1).
- Per-child assessment rows or any child-level mastery claims (coverage count only).
- GPS coordinates anywhere on the page (the admin clock CSV remains the GPS path).
- CSV export from the profile; school/user writes; invite flows ("Schools — soon" stays soon).
- Expected-days denominators (calendar/holiday logic — separate roadmap item).

## Routes, nav, access

- `/mobile-app/users` — thin roster index: name, school, wave, stage, per-EA link. Data = the existing user-health feed (no new backend). Activates the "Users" sidebar item (removes SOON).
- `/mobile-app/users/[id]` — the profile (id = auth user uuid, validated as uuid).
- EA display names in the user-health board and the attendance/clock ledger become links to profiles for users with the user-health capability; the existing junior_staff plain-text rule in the ledger is unchanged (junior_staff has no user-health read, so no links there).
- Access: reuse capability `mobile.user_health.read` (senior_staff, admin, zz_data_manager). Same data class as the health board — no new capability (YAGNI).
- Unknown/excluded/synthetic uuid → Django 404 → frontend renders a not-found state (no probe distinction between "never existed" and "excluded test account").

## Data contract

### New Supabase RPC — `public.mobile_user_profile(p_user_id UUID)`

Additive migration, house pattern exactly (bare `CREATE FUNCTION`, `STABLE`, `SECURITY INVOKER`, `SET search_path = ''`, schema-qualified calls, `REVOKE … FROM PUBLIC, anon, authenticated, authenticator`, `GRANT EXECUTE … TO service_role`, 22023 arg validation `mobile_user_profile_user_id_required` on NULL, `COMMENT ON`, trailing `NOTIFY pgrst, 'reload schema';`). Returns JSONB:

```jsonc
{
  "generated_at": "...",
  "user_id": "<uuid>",     // echo of p_user_id (canonical lowercase)
  "days": 30,              // the fixed activity window for windowed_activity below
  "windowed_activity": {   // SAME 30-day rules as mobile_user_health_domain_v2's activity block
    "clock_entries": 0, "sessions": 0, "app_assessments": 0,
    "last_clock_in_at": "…" | null, "last_session_at": "…" | null,
    "last_app_assessment_at": "…" | null, "last_activity_at": "…" | null
  },
  "identity": {            // null when the uuid matches NEITHER an identity link NOR a roster row
                           // (population rule = the FULL OUTER identity/roster join of
                           // mobile_reporting_identity_population — roster-only EAs keep their
                           // roster name/school/status and are NOT synthesized as auth-only)
    "display_name": "...", // same COALESCE cascade as mobile_user_health_domain_v2
    "employment_status": "active" | null,
    "current_school_id": "<uuid>" | null,
    "current_school": "…" | "Unattributed",
    "school_type": "…" | null,
    "data_expectation": "seeded" | "self_setup" | "unknown"
  },
  "wave": {"id","name","launch_date"} | null,   // live membership only
  "app_device": { "registered", "platform", "app_version", "last_seen_at" },  // same shape/rules as v2
  "ever_registered_device": true,               // EXISTS incl. invalidated tokens
  "data": {                                     // same counting rules as v2 (live assignments, unarchived)
    "classes": 0, "children": 0, "groups": 0, "grouped_children": 0,
    "imported_assessments": 0,
    "children_assessed": 0     // NEW: distinct currently-assigned, unarchived children of this EA
                               // having >= 1 assessments row (any capture_mode, any assessor).
                               // Answers "do all children have assessment info?" as
                               // children_assessed vs children. No per-child output.
  },
  "lifetime": {
    "first_ever_activity_at": "…" | null,  "last_ever_activity_at": "…" | null,   // same 3-source LEAST/GREATEST as v2
    "first_app_open_at": "…" | null,       "last_app_open_at": "…" | null,
    "totals": {
      "clock_entries": 0,
      "clock_days": 0,              // COUNT(DISTINCT sign_in_time::SAST date)
      "clock_minutes_completed": 0, // SUM over completed entries only (sign_out_time NOT NULL)
      "sessions": 0,                // session_type = 'Literacy Coach'
      "app_assessments": 0          // capture_mode IS NOT NULL
    }
  },
  "weekly": [   // exactly 26 buckets, oldest→newest, ISO weeks (Mon start) in SAST; zero-filled
    { "week_start": "YYYY-MM-DD", "clock_days": 0, "clock_minutes_completed": 0, "sessions": 0, "app_assessments": 0 }
  ],
  "recent_weekday_sessions": {   // the heatmap one-liner, scoped to this EA:
    "dates": ["YYYY-MM-DD" × 10],  // last 10 SAST weekdays ascending — SAME derivation as mobile_sessions_activity's heatmap_dates
    "cells": [0 × 10]              // Literacy Coach session counts per date
  },
  "recent_sessions": [  // last 20 by (session_date DESC, started_at DESC NULLS LAST, id), session_type='Literacy Coach'
    {
      "session_date": "YYYY-MM-DD",
      "started_at": "…" | null,
      "duration_seconds": 0 | null,
      "group_name": "…" | null,      // authoritative: DISTINCT session_attendees.group_id joined to groups.name;
                                     // fallback sessions.group_ids[1]; multiple distinct groups → comma-joined names
      "letters_focused": ["a","b"] | null,   // activities->'letters_focused' (letters-level sessions)
      "blend_categories": ["…"] | null,      // activities->'blend_categories' (blending-level sessions)
      "present_attendees": 0,        // COUNT attendance_status='present'
      "notes": "…" | null
    }
  ],
  "clock_entries": [  // last 100 by sign_in_time DESC; NO lat/lon anywhere
    { "local_date": "YYYY-MM-DD", "sign_in_time": "…", "sign_out_time": "…" | null,
      "duration_minutes": 0 | null, "auto_clocked_out": false, "is_active": false }
  ]
}
```

The RPC returns the payload for ANY uuid (identity null when unknown); population policing happens in Django.

### Django — `GET /api/mobile/users/<uuid>/`

- New view + URL; authorizes `MOBILE_USER_HEALTH_READ`; `ALLOWED_REPORTING_RPCS` gains `"mobile_user_profile": {"p_user_id"}`.
- Population gate: the uuid must be in `_eligible_reporting_population` (identity RPC + GoTrue join, existing exclusions for banned/test/synthetic) — else 404 `{"error": "user not found"}`. This keeps excluded accounts invisible, matching the boards.
- Joins GoTrue auth for the one user and applies the existing helpers verbatim: `_normalized_auth_user`, `_with_provisioning_auth_evidence` (tri-state `authenticated_after_provisioning`). Auth-only accounts (identity null) get the same synthesized identity treatment as the health board (`Unattributed`, expectation `unknown`), with profile evidence retained from the RPC payload.
- Validation, house style (jsonschema Draft 2020-12, `additionalProperties: False`, fail-closed sanitized 502): shapes above, plus invariants — `weekly` has exactly 26 buckets with strictly-increasing Monday `week_start`s ending at the current SAST week; `recent_weekday_sessions.dates` length 10 ascending weekdays and `cells` length 10; clock count⟺timestamp pairing per entry (`sign_out_time NULL ⟺ duration_minutes NULL ⟺ is_active`); `children_assessed <= children`; lifetime pair nullity + ordering (reuse the Part B rules); every `recent_sessions` row: `letters_focused` and `blend_categories` never both non-null.
- Response = validated payload + `"auth"` block; contract stable (all keys always present, null when unknown).

### Deploy order

Forward: additive RPC applied hosted first (same psql+ledger flow as Part B, post-apply verifier extended) → Django (new endpoint; nothing existing changes) → frontend. **Rollback is REVERSE order**: frontend first, then Django — once the frontend ships, rolling Django back alone turns every profile request into a route-level 404, so the frontend must additionally treat only the endpoint's exact `{"error": "user not found"}` 404 body as not-found and map any other 404 (route/HTML/malformed) to the sanitized service-unavailable state. The applied RPC is additive and inert when uncalled — it is never "rolled back" by redeploying code; removing it would require a separately reviewed forward migration.

## Frontend

New module `lib/mobile/user-profile/` (house pattern mirroring `user-health/`): `schema.ts` (zod + superRefine mirroring Django invariants), `types.ts`, `request.ts` (`/api/mobile/users/<uuid>/`), `response.ts` (decode union incl. 404 → not-found), `presentation.ts` (formatting: letters uppercased comma-join — same rule as the app's `formatLetters`; blending label `Blending: <categories>`; duration/hours formatting), colocated `*.test.ts`.

Components `components/mobile-app/user-profile/`:
- **Profile header** — name, school, employment status, wave chip (`name · launched date · day n`, reuse `getWaveDayNumber`), durable stage badge + windowed Active/Quiet indicators labeled `· 30d` — IDENTICAL semantics and labels as the user-health board. The `windowed_activity` block + `user_id` + evidence fields map onto a `MobileUserHealthRow`-compatible shape (`toHealthRowShape`) so `getActivityStage`/`isQuiet`/`hasEverOpenedApp` run UNMODIFIED with the board's exact windowed meaning; lifetime totals are never used for windowed claims.
- **Evidence panel** — auth state + post-provisioning tri-state (existing presentation helper), device (current + ever), app_open first/last ("Opened" language, reach-not-usage framing), data setup incl. `children_assessed / children` coverage line ("12 of 14 children have assessment info").
- **Ten-weekday strip** — new small `WeekdaySessionStrip` component (dates + cells props) reusing the `EAHeatmap` cell-color idiom; one row, no table/search.
- **Weekly trends** — one small reusable `WeeklyBarChart` (Recharts, modeled on `AttendanceTrendChart`) rendered three times: clock days/week, sessions/week, assessments/week (26 weeks).
- **Recent sessions table** — date, group, focus (letters or blending), present count, duration, notes. The team's primary inspection surface.
- **Clock history table** — date, in, out, duration, auto-clockout flag, active marker (mirrors ledger presentation, minus GPS).
- **How-to panel** — honesty notes: which numbers are lifetime vs windowed; assessment counts are activity counts, never mastery claims (letter-mastery language rules apply); app_open absence-is-not-proof note.

Index page `app/mobile-app/users/page.tsx` — server component using the existing user-health feed; table of name (link), school, wave, stage; sidebar item activated. Profile page `app/mobile-app/users/[id]/page.tsx` — server component, uuid param validation, not-found state.

Link integration: user-health board rows and attendance ledger EA names link to `/mobile-app/users/<id>` (ledger links only when the viewer has the user-health capability — thread a boolean from the page, preserving the junior_staff plain-text behavior).

## Language & honesty constraints

- Assessment copy: counts/coverage only — "assessments captured", "children with assessment info"; never "mastered/learned/on track" (documentation/letter-mastery-data-model.md governs).
- Durable vs windowed labeling rules identical to the board (Activated = lifetime; windowed claims carry the window).
- Letters render uppercased comma-joined (app parity); blending sessions show their categories, never an empty letters cell implying "no focus".

## Testing

- Supabase: SQL-contract Jest suite for the new migration; new postgres-harness scenario set (fixture EA with letters + blending sessions, attendees across two groups, clock incl. auto-clockout + active entry, imported + app assessments, wave membership, app_open rows; assert weekly bucket math, weekday strip vs seeded dates, group-name fallback path, children_assessed, clock pairing; zero residue) wired into the combined harness; post-apply verifier additions.
- Django: SimpleTestCase suite — passthrough happy path, 404 for non-population uuid, auth-only synthesis, each invariant fail-closed with `__cause__` pinning, allowlist boundary regression with the real client.
- Frontend: schema retention + rejection tests; presentation tests (letters/blending/duration/day math); render tests for header/evidence/tables/strip (board-copy style); index + link-integration render tests.

## Risks / notes

- `weekly` and strip math must use `Africa/Johannesburg` calendar days consistently (same idiom as existing RPCs).
- `recent_sessions.group_name` fallback (legacy sessions without attendee rows) must not fan out rows — aggregate DISTINCT group names per session.
- The profile reuses user-health presentation helpers — any field-shape mismatch is a compile-time error, not a runtime drift (map explicitly in `presentation.ts`).
