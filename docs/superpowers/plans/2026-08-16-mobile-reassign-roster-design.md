# Mobile-app "EA left — reassign roster" — implementation design (Slice 1, step 4)

**Status:** DESIGN / revision 1 — not yet adversarially reviewed.
**Date:** 2026-08-16 · **Repos:** this PM site (`zazi-izandi-nextjs`, dir
`zazi-mobile-clock-reporting-nextjs`) + Django
(`Zazi_iZandi_Website_2025`). **Decided by Jim (2026-08-16):** Option 1 —
PM site through Django ("keep things in Django"); authorization by explicit
role **allow-list `{zz_data_manager, admin}`** (no rank minimums — his
standing preference now); scope = **whole roster** plus **single class** ("in
reality [whole roster is] the only situation that's ever arisen but moving
the single class should be fine"); the deactivate-account reminder ships only
as a zero-cost static note. Decision record:
app repo `documentation/plans/2026-08-16-pm-reassignment-action-options.md`.
The consumed primitive `public.transfer_assignment` is **live in production**
(applied + verified 2026-08-16, incl. a PostgREST transport smoke).
Nothing here authorizes deploys; build lands behind review + tests.

## 1. Measured foundations (all verified in-repo today)

- **Middleware** (`proxy.ts:8-14`): route allow-lists already, no rank math;
  `/mobile-app` admits `["junior_staff","senior_staff","admin","zz_data_manager"]`.
  `zz_data_manager` already exists in the `Role` union
  (`lib/mobile/capabilities.ts:1-8`).
- **Capabilities twin**: Next `lib/mobile/capabilities.ts`
  (`ROLE_CAPABILITIES` + `hasCapability`) for UI gating, and Django
  `api/mobile/auth.py:11-20` (`ROLE_CAPABILITIES` frozensets +
  `require_mobile_capability`) for enforcement — Django **verifies the
  browser's Clerk JWT itself** via JWKS (`CachedClerkJwksClient`), so the
  role check is server-enforced, not proxied trust.
- **Data path**: `lib/mobile/api.ts` gets the Clerk session token and calls
  Django through `djangoFetch` (Bearer + `X-Internal-Auth`); pages under
  `app/mobile-app/{sessions,user-health,attendance,exports}` all use it.
- **Django ↔ mobile Supabase**: `settings.ZZ_SUPABASE_URL` +
  `settings.ZZ_SUPABASE_SERVICE_ROLE_KEY`, already used for REST by
  `SupabaseNotificationClient`
  (`api/services/mobile_notifications.py:130-131`). No new secret anywhere.
- **The primitive's contract** (app repo, wrapper design §2-§4): per-entity
  atomic transfer; replay only on identical `request_id` **and** args hash;
  typed refusals incl. `target_name_collision`, `shared_class_unsupported`,
  `group_class_holder_mismatch`, `no_current_holder`,
  `request_id_reuse_mismatch`; zero-history transfers pass
  `p_expected_assignment_id = NULL` (CAS on emptiness);
  `remaining_foreign_claims` reported on child successes.

## 2. Architecture

```
/mobile-app/reassign (Next, UI-gated by capability)
   → lib/mobile/api.ts helper (Clerk token + djangoFetch)
      → Django api/mobile/handover.py endpoints
         (Clerk JWT verify + capability mobile.assignments.reassign)
         → durable HandoverJob/HandoverItem rows (Django Postgres)
         → Supabase REST rpc/transfer_assignment (ZZ service key), item by item
```

### 2.1 Capability (both twins)

`mobile.assignments.reassign`, granted to **`zz_data_manager` and `admin`
only** — in Next `ROLE_CAPABILITIES` (UI: the page and its nav entry render
only with the capability; middleware section gate already covers the route)
and in Django `ROLE_CAPABILITIES` (enforcement — junior/senior staff get
nothing new).

### 2.2 Durable handover job (Django models, new app-local migration)

- `MobileHandoverJob`: `id` (uuid pk), `from_ea_user_id`, `to_ea_user_id`
  (mobile `auth.users` uuids), `scope` (`roster` | `class`),
  `scope_class_id` (nullable uuid), `reason` (text), `requested_by`
  (Clerk user id + email snapshot), `status`
  (`created`/`running`/`complete`/`complete_with_refusals`/`integrity_fault`),
  timestamps. Partial-unique: at most one non-terminal job per
  `from_ea_user_id` (serializes concurrent operators).
- `MobileHandoverItem`: `job` FK, `position` (int — execution order),
  `entity_kind`/`entity_id`, **immutable dispatch payload** captured at job
  creation: `request_id` (uuid4, server-generated), `expected_assignment_id`
  (nullable — NULL for the scalar-only set), plus the shared from/to/reason;
  `state` (`pending`/`transferred`/`refused`/`error`), `result_json`,
  `refusal_code`. Retry **resends the stored payload verbatim** — the
  wrapper's replay contract makes that idempotent;
  `request_id_reuse_mismatch` flips the job to `integrity_fault` and stops.

### 2.3 Endpoints (`api/mobile/handover.py`, wired in `api/urls.py`)

1. `GET  api/mobile/handover/roster/?from_ea=<uuid>` — the preview. One
   Supabase REST round per set (service key):
   - **ledger-backed**: A's active rows in the three ledgers;
   - **scalar-only**: unarchived classes/groups with `staff_id = A` and no
     ledger history (the wrapper's zero-history branch — without this set a
     "complete" handover could strand backlog roots with A);
   - **children**: active `child_ea_assignments` for A;
   - **parent-misaligned groups**: groups held by A whose parent class is
     not A's → returned as `unresolved`, never silently dropped;
   - EA name resolution and the successor candidate list come from the same
     source the user-health page already renders EAs from (reuse, don't
     invent — confirmed at build).
   Response: grouped roster + counts + unresolved list.
2. `POST api/mobile/handover/jobs/` `{from_ea, to_ea, scope, scope_class_id?,
   reason}` — re-runs the roster query server-side (never trusts the
   browser's list), materializes items in execution order — classes →
   parented groups (each after its class) → classless groups → children —
   with per-item `request_id` + CAS token captured **now**; returns job id.
   For `scope=class`: that class, its groups, and the children assigned to A
   who are members of that class (`child_class_memberships` join) — the
   membership join is what bounds "the class's children".
3. `POST api/mobile/handover/jobs/<id>/execute/` — processes `pending` items
   in `position` order, one wrapper RPC each; per-item outcome recorded;
   refusals do **not** stop the run (they are per-entity final states) except
   `request_id_reuse_mismatch` → `integrity_fault`, stop. Safe to call again
   after interruption: `transferred`/`refused` items are skipped
   (`transferred` re-sends would replay identically anyway — skipping is
   just cheaper), `pending`/`error` items are re-dispatched with their
   stored payloads.
4. `GET  api/mobile/handover/jobs/<id>/` — status + per-item results +
   plain-English summary.

All four: `require_mobile_capability(request, MOBILE_ASSIGNMENTS_REASSIGN)`.

### 2.4 UI (`app/mobile-app/reassign/`)

Pick A (searchable EA list) → **preview** (counts + grouped lists + any
unresolved items, scope selector: whole roster / one class) → pick B →
type-the-reason + confirm dialog → execute with per-item progress → summary:
transferred / refused with plain-English messages / unresolved, plus a static
closing note: "If this EA is leaving permanently, also deactivate their
account in Clerk" (link to the Clerk dashboard — the zero-cost version of the
reminder). Refusal copy map (EA-facing language rules don't bind staff pages,
but keep it plain): `target_name_collision` → "B already has a class with
this name at this school — rename one first"; `shared_class_unsupported` →
"this class shows two active holders — needs manual repair";
`no_current_holder` → "nobody currently holds this record — nothing to move";
`remaining_foreign_claims > 0` → informational flag on the child row.

## 3. What this deliberately does not do

- No direct Supabase access from Next (the boundary stays: one backend holds
  the key).
- No Clerk account deactivation, no EA-account lifecycle.
- No partial-failure rollback: each item is atomic in the database; the job
  records exactly what happened; retry completes the remainder. Divergence
  between a moved class and not-yet-moved groups is transient, visible, and
  converges on completion (the wrapper's alignment rule enforces the safe
  order).
- No use against archived entities (`entity_archived` refusals surface
  as-is).

## 4. Verification

- **Django unit tests** (mocked Supabase client, the notifications test
  pattern): capability enforcement (`zz_data_manager`/`admin` pass; every
  other role 403); roster union incl. the scalar-only set and the
  parent-misaligned bucket; job creation captures immutable payloads +
  execution order (class before its groups); execute happy path; refusal
  recording without stopping; interrupted-then-retried job resends stored
  payloads verbatim (assert byte-equal RPC bodies) and skips terminal items;
  `request_id_reuse_mismatch` → `integrity_fault` + stop; concurrent-job
  refusal (unique active job per from-EA); `scope=class` membership join.
- **Next**: capability-gated rendering test; one route-handler test per
  helper; e2e smoke of the page shell (Playwright, mocked API).
- **Live supervised smoke** (with Jim, post-deploy): a refusal-path preview +
  a job against a **seed/test EA** roster first; the wrapper's production
  audit table then shows the real transfers when a genuine handover happens.

## 5. Build order

1. Django: capability + models + migration + endpoints + tests.
2. Next: capability + page + helpers + tests.
3. Review (adversarial, both diffs), gates, deploy Django then Next.
