# Part B Handoff — Rollout Waves + app_open Event

_Written 2026-08-12 for a fresh session to pick up after conversation compaction. Read this top to bottom before doing anything._

## Where things stand (Part A: DONE, not merged)

- Branch **`feat/mobile-ops-usability`** at **`b3298ca`** in worktree `/Users/jimmckeown/Development/zazi-mobile-clock-reporting-nextjs/.worktrees/mobile-ops` (a linked worktree inside the launch repo — created there because the Codex sandbox can't write outside it).
- All 12 Part A tasks of `docs/superpowers/plans/2026-08-11-mobile-ops-usability.md` built + per-task reviewed + final whole-branch adversarial review clean after one fix wave. 66/66 mobile tests, tsc (`--incremental false`), scoped eslint green.
- Post-review UX adjustments per Jim: evidence-coverage strip **removed** (component deleted; `buildFunnelCounts` retained in `lib/mobile/user-health/funnel.ts` for the Part B wave view), version card compacted to a slim bottom strip, per-EA profile pages added to `documentation/roadmap.md`.
- SDD ledger (full task/review/fix history + manual browser checklist): `.superpowers/sdd/2026-08-11-mobile-ops-usability/progress.md` in the worktree.
- Jim verified the pages locally with real data — working.

## ⚠️ Merge/deploy order (unchanged, critical)

1. Deploy Django branch `fix/mobile-report-real-users` (worktree `/Users/jimmckeown/Development/zazi-mobile-clock-reporting-django`) — prod Django `main` does NOT emit the provisioning-auth fields this frontend requires.
2. Merge/deploy frontend `fix/mobile-report-real-users`, then `feat/mobile-ops-usability`.
3. Only then Part B's own deploys.

## Jim's decisions (2026-08-12, verbatim intent)

- **Waves (initial two):**
  - **"ZZ Primary 2026"** — the 152 Primary School Zazi iZandi EAs (= the seeded cohort: `staff_identity_links.teampact_user_id IS NOT NULL`).
  - **"ZZ ECD 2026"** — the 27 ECD Zazi iZandi EAs (= the self-setup ECD accounts; auth accounts created in the ECD provisioning batch window ~2026-08-11T19:18–19:20Z).
  - A **Masifunde wave** is coming later — name/date/members TBD, "more to follow". Design must make adding it trivial.
  - Jim said "a name, launch date, and member list is generally what we'd have" but did NOT supply explicit member lists or launch dates. **Proposed approach: generate the two manifests FROM existing data** (seeded ⇒ Primary; ECD batch ⇒ ECD — the same signals Django's `_provisioning_cutoff_at()` uses, hardcoded in `api/mobile/reports.py` on the Django branch: `PRIMARY_PROVISIONING_CUTOFF_AT = 2026-08-08T02:59:03Z`, ECD batch 2026-08-11T19:18–19:20Z), suggest launch dates 2026-08-08 (Primary) and 2026-08-11 (ECD), and have Jim sanity-check the generated lists + dates before the transactional load. The loader must still reconcile exactly (abort on mismatch) per the spec.
- **Deploy sequence:** approved as specced (Django tolerate-first → Supabase migration → frontend last). **Deploy window: immediately, as each piece finishes.**
- **app_open event: GO NOW** — build in the same effort/migration window.
- **Sentry tagging: DEFERRED** (later, on Jim's word).
- **Open question (non-blocking):** attendance "filtered tiles" idea (tiles/trend recompute from search-filtered rows, labeled) — explained to Jim, no yes/no yet. Per-EA profile pages are on the roadmap instead; don't build filtered tiles without his yes.

## Part B specification

Lives in `docs/superpowers/plans/2026-08-11-mobile-ops-usability.md` § "Part B — Rollout waves become first-class data". It went through the same 8-round adversarial review as Part A. Key contracts (already reviewed — keep them):

- **Supabase** (repo `/Users/jimmckeown/Development/zazi-mobile-clock-reporting-supabase`, worktree of the mobile-app repo `zazi-izandi-app`; migrations in `supabase/migrations/`, house pattern = SECURITY INVOKER, `SET search_path = ''`, REVOKE all/grant service_role): `app_rollout_waves` + append-only `app_rollout_wave_members` (unique live row per user via partial index on `superseded_at IS NULL`; BEFORE UPDATE/DELETE trigger allowing only `superseded_at NULL→timestamp`). Loader = authoritative bidirectional set reconciliation in one transaction, aborts on any unresolved identity, superseded rows for absentees, final assert live-set == staged-set.
- **RPC**: `CREATE OR REPLACE` the 3-arg `mobile_user_health_domain` (from `20260812120000_mobile_reporting_real_user_population.sql`) adding per-user `wave {id,name,launch_date}|null`, top-level `wave_options[]`, and durable fields `first_ever_activity_at` / `last_ever_activity_at` (lifetime, OUTSIDE the windowed count⟺timestamp invariant) + `ever_registered_device` (EXISTS over `notification_push_tokens` INCLUDING invalidated rows).
- **Django** (branch `fix/mobile-report-real-users` worktree): schema/validators accept the new optional fields and pass through; `_empty_domain_user` gains null wave/lifetime fields; count⟺timestamp 502 invariant explicitly excludes `_ever_` fields; tests in `api/tests_mobile_operational_reports.py`. **Django deploys BEFORE the Supabase migration** (tolerate-first).
- **Frontend**: `schema.ts`/`types.ts` optional fields; Wave filter on the board (options from `wave_options` + "No wave"); wave selection narrows rows client-side and **restores the evidence-coverage strip as the wave-scoped instrument** (`buildFunnelCounts(filteredRows)` — the lib survived exactly for this; re-add a component, don't resurrect the old global placement Jim rejected); context chip "Wave · launched {date} · day {n}" (SAST); `getActivityStage` becomes a true lifetime ratchet on every branch (usage: `last_ever_activity_at !== null`; device: `ever_registered_device`; auth already durable) with two pinned regressions (days-shrink can't regress stage; token invalidation can't regress a device-only reached EA); windowed recency returns as a separate indicator + "quiet" predicate joins filter/CSV.

## app_open event (approved scope)

Root fix for login evidence. Three pieces:
1. **Supabase migration** (same repo): `app_events` table (id, user_id, event text CHECK e.g. 'app_open', app_version, platform, occurred_at timestamptz default now()) + RLS: authenticated INSERT with `auth.uid() = user_id` only; no select policies (service-role read). Extend the user-health RPC (can ride the same migration as waves) with per-user `first_app_open_at` / `last_app_open_at` (durable).
2. **Mobile app** (`/Users/jimmckeown/Development/zazi-izandi-app`, Expo SDK 54, supabase-js): emit one insert on cold start after auth restore (fire-and-forget, swallow failures, no PII beyond user_id/version/platform). Ship via **`eas update`** (JS-only ⇒ OTA, no store release; `runtimeVersion.policy: appVersion` — publish per live runtime version; devices apply on launch N+1; fresh installs get it from the binary once a new build ships).
3. **Reporting**: Django passthrough + frontend can later prefer `last_app_open_at` as reach evidence. Keep honesty copy in `documentation/`/how-to panel in sync.

Sentry tagging (user_id/app_version/wave + Slack alert rule) is DEFERRED — do not build.

## Process to follow (what worked for Part A)

- Expand Part B into a full checkbox plan (`docs/superpowers/plans/2026-08-12-rollout-waves.md`) per superpowers:writing-plans, run `/codex:adversarial-review` iterations until passing (pause and ask Jim at 7+), then orchestrate with superpowers:subagent-driven-development using **codex:codex-rescue forwarders as implementers** (Jim's standing authorization; saves Claude usage).
- Codex-rescue mechanics: forwarders fire ONE codex task and can't poll — when they return "background task-…", poll `node ~/.claude/plugins/cache/openai-codex/codex/1.0.4/scripts/codex-companion.mjs status|result <task-id>` (Monitor with an until-loop works well). Their sandbox cannot write the linked-worktree git index → **coordinator re-runs gates and commits** with the exact intended message. Codex reports can over-claim evidence — always independently re-run `npm run test:mobile`, `npx tsc --noEmit --incremental false`, scoped eslint before committing. Review gate per task via sonnet subagents; adjudicate; ledger everything.
- Test runner quirk: `npx tsx`/`npm run test:mobile` hit sandbox IPC EPERM inside codex — `node --import tsx --test lib/mobile/*.test.ts lib/mobile/*/*.test.ts` is the accepted equivalent. Plain `npx tsc --noEmit` can fail on a stale incremental cache — always `--incremental false`.
- Git rules: feature branches, no Co-Authored-By/agent trailers, commit messages per plan.

## Local dev environment (working as of today — don't rediscover)

- Frontend: run `npm run dev` from the **worktree**; `.env.local` there = Jim's daily env (dev Clerk instance `wealthy-hippo-62.clerk.accounts.dev`, `pk_test_…`; `DJANGO_API_URL=http://localhost:8000`). Vercel env pull is useless for Clerk keys (marked Sensitive = write-only).
- Backend: run from `/Users/jimmckeown/Development/zazi-mobile-clock-reporting-django` with `source /Users/jimmckeown/Development/Zazi_iZandi_Website_2025/venv/bin/activate` then `python manage.py runserver`. Its `.env` = main-checkout Django env **plus** appended `ZZ_CLERK_ISSUER/JWKS_URL/AUTHORIZED_PARTIES` for the dev Clerk instance (added 2026-08-12). venv gotcha fixed today: impostor `jwt` 1.3.1 package removed, PyJWT 2.6.0 force-reinstalled — don't reinstall `jwt`.
- Prod-as-backend does NOT work locally: prod Django rejects dev-instance Clerk tokens and (until deployed) lacks the new user-health fields.

## Immediately actionable checklist for the fresh session

1. Confirm with Jim: launch dates (proposed 2026-08-08 / 2026-08-11) and how he wants to sanity-check the generated member lists.
2. Write the Part B + app_open plan; adversarial review loop; dispatch.
3. Remind Jim of the pre-Part-B merge/deploy order and the outstanding manual browser checklist items (ledger) before production merge.
