# Zazi iZandi Web Field v1 — Implementation Plan

> **SUPERSEDED FOR IMPLEMENTATION — 2026-08-20.** Jim selected pure lean field
> v1, a fuller server-governed lane for v2, and offline/PWA capability for v3.
> The governing executable plan is now
> [2026-08-20-web-capture-lean-v1.md](2026-08-20-web-capture-lean-v1.md).
> Everything below is retained as the adversarially reviewed full-lane design
> record and future-v2 research. Its wrapper, sidecar, provenance, sweeper,
> Django-cron, deployment, and acceptance tasks are **not authorized v1 work**.
> References below to “field v1” describe the superseded proposal and must not
> be used to override the lean plan.
>
> **Primary outcome:** Give an EA who cannot install or reliably run the Expo app
> a small, mobile-first browser surface that records live work into the same
> Supabase operational tables, under the EA's own Supabase identity, without
> creating a second data universe.
>
> **Deliberate boundary:** The superseded proposal was online-first and
> install-free. It was not a cold-start-offline PWA. The governing lean plan now
> names true offline/PWA capture v3.
>
> **Decision amendment — 2026-08-20:** The proposed line-manager correction
> product was rescinded before implementation. Field v1 still has no historical
> entry. A later, separately gated phase may let the EA create a historical
> session directly; the server will derive an immutable review flag so the
> business backend can surface it for legitimacy checks. That later phase is
> create-only, not staff impersonation and not an edit/delete mechanism.
>
> **Protocol-v2 safety decision — 2026-08-20:** Hosted read-only inspection, a
> cold protocol inventory, and an independent adversarial review rejected the
> original provenance-column/RPC-extension design. Adding provenance to the
> existing exact mobile payload/hash documents could invalidate replay of
> already accepted mutations. Separately named wrappers and private attestation
> sidecars remain future-v2 research. The selected lean v1 makes no write-side
> SQL change and exposes only the unchanged time-entry and session writers.
> Existing mobile RPC
> bodies, public names, payload shapes, hash documents, receipt/head semantics,
> serializers, acknowledgment inventory, and client mapping are frozen. No SQL
> may be authored from the superseded task list below; the governing lean plan's
> RED gates control its single read-only helper.
>
> **Threat-boundary decision — 2026-08-20:** Web and mobile use the same
> Supabase `authenticated` identity. A deliberately modified browser can call
> the still-granted mobile RPCs directly and bypass web-only admission rules.
> Field v1 therefore promises a safe **supported web lane**, not unbypassable
> proof of client origin. Under the wrapper option, a web sidecar would attest
> that an exact command passed through the wrapper; absence would mean
> `mobile_or_legacy`, not proven mobile. Selected lean v1 makes no source claim.

## 0. Superseded transport decision record

**Decision closed:** use the lean transport defined in the governing plan.
Do not implement this document's wrapper/sidecar path unless a future v2 plan
selects individual capabilities after field evidence and closes the outstanding
review findings.

The second independent review found the hardened wrapper design substantially
safer than changing an existing RPC, but still too much write-side surface for
the stated v1 priority. Jim selected this lean boundary:

- make no write-side Supabase migration;
- keep all five measured function bodies/hashes, three mobile serializers,
  session mapping, acknowledgment inventory, grants, receipts/heads, SQLite,
  and pull/reconcile behavior unchanged;
- have one fixed typed browser adapter call only the exact existing time-entry
  and session-bundle RPC names/envelopes;
- expose no Letter Mastery writer in v1 because its current natural-key upsert
  can change a row won concurrently by mobile even after a browser absence
  check;
- add one bounded actor-scoped **read-only** bootstrap/resolution RPC;
- resolve an ambiguous command after rollover only from that helper's exact
  actor-owned receipt readback; if absent, retain local evidence and require
  support/historical entry rather than call a writer;
- defer web provenance, sidecars, wrapper locks, stale-clock automation, and the
  Django cron; and
- provision one active capture browser/device per pilot EA, because the existing
  protocol gives idempotency per command/record identity, not global prevention
  of two distinct clock UUIDs from two devices.

This is the selected scope because the wrapper cannot make its policies
globally authoritative while original mobile RPCs—and potentially raw RLS DML—
remain available to the same EA token. Lean v1 gives up server-enforced current-day
and clock-coverage rules for browser calls; those become supported-UI
preconditions with honest limitations. In exchange, the battle-tested write
engine has zero migration diff.

The wrapper/sidecar design below remains a documented higher-assurance option
for supported web calls, not an authorized task list. None of its numbered
tasks may be started from this document. The governing lean plan alone defines
current implementation order and gates.

## 1. Executive decision

Build a separate Next.js application, `zazi-izandi-web`, for EAs only. It uses
the same Supabase email/password account as the mobile app and writes to the
mobile operational store through new authenticated web wrapper RPCs. Each
wrapper delegates atomically to an unchanged protocol-v2 mobile RPC and then
binds the completed mobile receipt to private web-command evidence in the same
transaction. It does not use Clerk, Django as a capture proxy, a service-role
key, or raw sequential multi-table inserts.

Field v1 provides:

- Supabase login and password reset;
- a readiness-checked roster/group bootstrap;
- live clock-in and clock-out with lenient geolocation;
- live session capture with attendance, letters or blends, blend examples,
  child reading levels, Letter Tracker changes, notes, and a simple elapsed
  timer;
- a durable, actor-scoped draft and command journal;
- idempotent same-day retry when a request fails or its outcome is ambiguous;
- recent web/mobile history and duplicate warnings;
- explicit submission states, server-derived metrics, and local diagnostic
  evidence;
- immutable wrapper-attested evidence for supported web commands and
  web-created clock/session roots; and
- a web-only stale-clock server sweeper.

Field v1 does **not** allow an EA to enter a historical date or time. It also
does not implement staff-entered backfill. A later phase may add the simplest
EA-owned, create-only historical-session flow with a server-derived review flag
visible in the business backend. It will not let staff impersonate EAs, and it
will not add historical clock entries, edits, or deletes by implication.

## 2. Why this is the v1 boundary

The immediate failures are distribution and client reliability: Play Store
eligibility, Huawei devices, storage pressure, and mobile-app defects. A URL in
the browser avoids all four without requiring an install.

Providing mobile data to EAs for the first one or two months makes online-first
capture a workable rollout bridge. It does not fix schools with no signal, so
paper remains the declared cold-start-offline backstop until field evidence
justifies v2.

The v1 quality investment goes into submission correctness rather than PWA
machinery. The app's `submitSessionDraft()` builds one session family and then
separate Letter Tracker mutations. A response can be lost after the server
commits. Therefore a retry must resend the exact same command and UUIDs; it must
never regenerate a second session. This is the load-bearing v1 resilience
feature.

## 3. Locked decisions

| # | Area | Field-v1 decision |
|---|---|---|
| 1 | Product | Name presented to EAs: **Zazi iZandi Web** |
| 2 | Repository | New sibling GitHub repository and local checkout: `zazi-izandi-web` |
| 3 | Domain | `app.zazi-izandi.co.za` |
| 4 | Hosting | New Vercel project; no coupling to the public/PM website release |
| 5 | Audience | EAs only; every EA may use it, with no fallback-cohort flag |
| 6 | Authentication | Supabase email/password, same account as the mobile app; Clerk remains unchanged for staff, funders, and partners |
| 7 | Authorization | The EA's Supabase JWT and the existing server-side actor/RLS checks; `user_id` is never selectable or trusted from UI state |
| 8 | Write destination | Existing Supabase `time_entries`, `sessions`, `session_attendees`, and `letter_mastery` tables |
| 9 | Write transport | New authenticated `apply_web_*_v1` wrappers that call unchanged protocol-v2 mobile RPCs atomically; no raw sequential session-family DML |
| 10 | Django | Out of the interactive capture path; used only for the web-only stale-clock cron in v1 |
| 11 | Session scope | Full instructional session capture, including Letter Tracker; assessments remain out |
| 12 | Timer | Simple start-to-submit elapsed time; no pause/resume polish, background timer promises, or 20-minute coaching UI |
| 13 | Geolocation | Attempt it; denial, unavailability, or timeout does not block clock-in; coordinates are either a complete pair or both null |
| 14 | Historical entry | No historical entry in v1; a later phase may add EA-owned, create-only historical sessions with a server-derived review flag |
| 15 | Retry | Same-day delayed delivery is allowed only for a command materialized during a live, clocked-in flow; unresolved day-expired commands remain local evidence for support or later historical re-entry |
| 16 | Provisioning | Supabase account, class, roster, and groups must be provisioned and read back before the EA receives the link |
| 17 | Offline | No service worker, offline app shell, cached roster, background sync, or cold-start-offline promise |
| 18 | Shared logic | Pinned copy plus checksum guard now; separate shared package only after the mobile app stabilizes |
| 19 | Provenance | Private immutable wrapper-command and accepted-root sidecars; no column or payload change to the mobile domain/protocol surface |
| 20 | Field proof | Huawei and low-storage Samsung plus real EAs completing a school day; staff-only testing is not field proof |

## 4. Definitions that must not blur

### 4.1 Live capture

A live web event is initiated in Zazi iZandi Web on the current Johannesburg
calendar day. Clock-in must receive an authoritative Supabase success before a
session can start. A session has no date picker and no editable start/end time.

### 4.2 Delayed delivery

The EA started the workflow live, but a request failed or its response was
lost. The browser retains the exact command, including its UUIDs, mutation ID,
stream ID, generation, audit sequence, actor, and timestamps, and retries that
same command.

Delayed delivery is not backfill. In v1 it is eligible only while the command's
Johannesburg capture date is still the server's current Johannesburg date.
After rollover, the EA client may call a **read-only receipt resolver** with the
exact immutable command arguments. The resolver recomputes the wrapper-command
digest and reads only an existing web sidecar plus its linked completed mobile
receipt. It never calls an `apply_mobile_*` function and never creates a domain
row, receipt, or head. It can discover that yesterday's command committed
despite a lost response, but a miss returns `web_capture_receipt_not_found` and
the client moves to `historical_entry_required`. The local evidence remains
available for support and, once separately implemented, deliberate historical
re-entry by that EA.

### 4.3 Historical session entry

A person intentionally creates a session for a historical day. EAs cannot do
this in field v1. A later phase may permit the authenticated EA to create the
historical session directly. The minimum safe version must:

- remain actor-owned: `auth.uid()` is the session owner;
- be create-only, with no historical time-entry, edit, or delete capability;
- accept an explicit historical session date and require an explicit reason;
- derive the historical/review status on the server rather than trust a client
  flag;
- preserve immutable created-at, capture-date, source, and reason evidence; and
- surface flagged records in the business backend without making prior
  approval a prerequisite for storage.

That later phase requires a separate migration, RPC contract, UI, reporting
query, and legitimacy-review policy. It is deliberately not staff
impersonation. Historical classification must be derived at a boundary that
observes every relevant writer; merely using a dedicated web wrapper would be
bypassable under the shared authenticated authority model.

### 4.4 PWA / offline

An icon or web manifest is not offline support. Field v2 will be considered
offline-capable only when an EA can cold-start without a network, load an
actor-scoped cached roster, create work, see a durable pending count, reconnect,
and receive authoritative success without duplication or cross-account leakage.

## 5. Non-negotiable invariants

1. **One operational universe:** all EA-owned capture rows land in the existing
   mobile Supabase tables. No Django-only capture rows and no dual writes.
2. **Actor equality:** the authenticated Supabase actor must equal every root
   row's `user_id`. The browser cannot choose another EA.
3. **No service role in web:** only the public Supabase URL and anon key may be
   exposed to the browser.
4. **Atomic session family:** a session and its attendee set succeed or fail as
   one protocol-v2 bundle. Raw parent-then-child requests are forbidden.
5. **Stable retry identity:** IDs and envelopes are created once, persisted
   before network I/O, and reused verbatim after timeouts.
6. **Replay honesty:** a matching protocol receipt is success; mutation-ID,
   generation, or payload-hash reuse with different content is an integrity
   failure, never silently retried.
7. **Full-save honesty:** the UI may say "Session saved" after the session bundle
   succeeds, but may say "Everything saved" only after all Letter Tracker
   mutations are authoritatively accepted.
8. **Supported-lane live-day admission:** the supported web clock-in/session
   wrappers reject historical Johannesburg creation. A modified browser can
   bypass those rules by calling an unchanged mobile RPC directly; preventing
   that requires a separately approved authority redesign. The post-rollover
   resolver is read-only and can acknowledge only an already attested command.
9. **Clock coverage:** a web session is accepted only when an EA-owned time entry
   covers its start/end interval. An open entry covers through server `now()`;
   a closed entry covers only through its `sign_out_time`.
10. **No half-GPS:** latitude and longitude are both present and in range or both
    null.
11. **Roster authority:** session children and group must be writable/visible to
    the actor under the existing assignment model.
12. **PII minimization:** no `participant_id`, surname, date of birth, or other
    unnecessary child fields enter browser persistence or diagnostics. UI reads
    first name and teaching fields only.
13. **Actor-scoped browser state:** drafts, command journals, and stream metadata
    are keyed by `auth.uid()`. A different login cannot read or send them.
14. **No personalized HTTP caching:** v1 has no service worker. A future service
    worker may cache the static shell but never authenticated learner responses.
15. **Clock sweep scope:** v1 server auto-close touches only time entries with
    immutable accepted web-creation evidence. Sidecar absence is never treated
    as permission to sweep. Changing mobile/mobile-or-legacy payroll records is
    a separate decision.
16. **Mobile protocol freeze:** existing `apply_mobile_*` bodies and names,
    private session core, exact payload keys, canonical hash documents,
    receipt/head behavior, serializers, mappings, acknowledgment vocabulary,
    SQLite schema, and pull/reconcile mappings have zero functional diff.
17. **No false rollout claims:** local tests, disposable PostgreSQL, hosted
    migration, Vercel deployment, device loading, real-EA use, and no-recurrence
    evidence are separate gates.

## 6. Measured repository foundations

Revalidate these immediately before implementation because the mobile app is
actively changing.

### Mobile app and Supabase source

Repository: `/Users/jimmckeown/Development/zazi-izandi-app`

Revalidated read-only on 2026-08-20 against `origin/main` at
`1021d99f0264b2f53aac95bb3a16dc06d4251c0f` and the hosted database at 67
migrations through `20260820220000_reporting_school_attribution_option_b`:

- `src/utils/activeSessionState.js` builds the session row and attendee array,
  then applies Letter Tracker mutations separately.
- `src/utils/sessionCaptureValidator.js` requires at least one present child and
  letters or a blend category according to group level.
- `src/db/repositories/sessionsRepository.js` defines the exact session and
  attendee wire columns and stable-attendee-ID requirement.
- `src/services/syncProtocolV2TimeEntryRpc.js` targets
  `apply_mobile_time_entry_mutation`.
- `src/services/syncProtocolV2SessionBundleRpc.js` intentionally still targets
  `apply_mobile_session_bundle_mutation`; the current session implementation is
  generated by `20260819140000_session_capture_flag_v1.sql` and must not be
  replaced or remapped by this work.
- `src/services/syncProtocolV2LetterMasteryRpc.js` targets
  `apply_mobile_letter_mastery_mutation` with exact-key payload validation.
- `supabase/migrations/20260729200000_wave2b_sync_timestamp_contract.sql`
  contains the installed Letter Mastery body and the shared protocol-v2
  receipt/head model.
- `supabase/migrations/20260818120000_time_entry_insert_upsert.sql` is the latest
  reviewed and hosted-matching time-entry body.
- RLS permits actor-owned capture rows, but protocol-v2 RPCs are the current
  canonical production transport and give the web client the idempotency it
  needs.
- The five relevant local function bodies matched hosted `pg_proc` SHA-256
  digests exactly during the read-only preflight; those digests are recorded in
  the app-repository contract snapshot.
- `capture_source` does not exist in the migration chain today and field v1 no
  longer adds it.
- Hosted aggregate evidence showed 35 open entries older than ten hours and no
  current provenance discriminator. That is proof that an unscoped sweeper is
  unsafe, not proof that those rows are invalid.

### Existing Next.js house standard

Planning repository:
`/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs`

- Next.js 16, React 19, TypeScript, Tailwind v4, shadcn `new-york`, Lucide.
- `tsx` + `node:test` is already the lightweight pure-module testing pattern.
- Playwright is the browser E2E pattern.
- This existing site stays Clerk-only for its protected staff/EA reporting
  surfaces. The new app is a separate repository to avoid two auth models in
  one deployment.

### Django

Repository: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025`

- `ZZ_SUPABASE_URL` and `ZZ_SUPABASE_SERVICE_ROLE_KEY` already exist in settings.
- Existing service-role clients provide patterns in
  `api/services/mobile_notifications.py` and
  `api/mobile/handover_supabase.py`.
- No existing management command closes stale web entries.
- There is no checked-in Render cron manifest in this checkout; cron scheduling
  is therefore a separately recorded Render dashboard action.

### New repository

The authorized foundation scaffold is preserved in the permanent local sibling
repository `/Users/jimmckeown/Development/zazi-izandi-web` on
`feat/field-capture-v1` at `9be35c8`. It has no auth, capture, Supabase call,
PWA, hosted project, or production credential. Creating its GitHub repository
and configuring hosting remain explicit future actions.

## 7. Architecture

```text
EA browser
  └─ Zazi iZandi Web (Next.js, Vercel)
      ├─ public anon key only
      ├─ Supabase email/password session
      ├─ actor-scoped local draft + exact command journal
      └─ direct authenticated web RPC calls
           │
           ▼
Supabase operational store
  ├─ web_capture_bootstrap_v1()                bounded read model
  ├─ resolve_web_capture_receipt_v1()          read-only rollover resolver
  ├─ apply_web_time_entry_mutation_v1()        supported web admission
  │    └─ apply_mobile_time_entry_mutation()   UNCHANGED v2 mutation
  ├─ apply_web_session_bundle_mutation_v1()    supported web admission
  │    └─ apply_mobile_session_bundle_mutation() UNCHANGED v2 mutation
  ├─ apply_web_letter_mastery_mutation_v1()    supported web admission
  │    └─ apply_mobile_letter_mastery_mutation() UNCHANGED v2 mutation
  ├─ private web command/origin/sweep evidence
  └─ time_entries / sessions / session_attendees / letter_mastery
           │
           ├─ mobile app pull → real SQLite → EA history
           └─ existing reporting RPCs → Django/PM reporting

Django Render cron (not interactive)
  └─ close_stale_web_time_entries_v1() via service role
```

The web client reuses protocol semantics, not mobile infrastructure. It does not
copy SQLite, the general mobile outbox, circuit breakers, pull/reconcile logic,
or Expo modules.

Each write wrapper and the unchanged inner mobile RPC execute in one PostgreSQL
transaction. If wrapper evidence cannot be bound after inner success, the outer
function raises an internal invariant error and PostgreSQL rolls back the
domain mutation, receipt/head updates, and sidecar work together. Ordinary web
policy refusals are typed JSON results, not raised SQLSTATEs.

This architecture separates **identity** from **client path**. The Supabase JWT
proves which EA is acting. It does not prove whether the request originated in
Expo or a browser. Because the same actor can execute the original mobile RPCs,
the database cannot make web-only rules unbypassable without a different
authority model. Field v1 deliberately avoids revoking or narrowing those
mobile grants because installed-client compatibility is the higher-order
constraint.

All Supabase-specific calls stay behind `lib/supabase`, `lib/data`, and
`lib/capture` adapters. React components consume typed domain results and never
call `.from()`/`.rpc()` directly. This keeps the January-2027 data-residency
risk bounded to a transport/data layer instead of spreading Supabase throughout
the UI; it does not pretend that a future store migration would be free.

## 8. Supabase contract changes

### 8.1 Frozen mobile compatibility surface

Field v1 adds no `capture_source` column and no key to a mobile payload. The
following surface is an explicit no-touch boundary:

- public `apply_mobile_time_entry_mutation` body, name, signature, grants, and
  result vocabulary;
- public `apply_mobile_session_bundle_mutation` and private
  `apply_mobile_session_bundle_mutation_core` bodies, names, signatures,
  grants, and result vocabulary;
- public `apply_mobile_letter_mastery_mutation` body, name, signature, grants,
  and result vocabulary;
- the exact 11-key time-entry, 14-key session-root, and 10-key Letter Mastery
  payload contracts;
- canonical envelope/hash documents, hash versions, receipt/head ordering, and
  replay semantics;
- mobile JavaScript serializers, RPC mapping constants, and acknowledgment
  inventory;
- local SQLite schema, repository projections, pull/reconcile mappings, and
  installed-client behavior.

The migration must preflight and postflight the reviewed signatures,
`SECURITY DEFINER` attributes, empty search paths, owners, execute grants, and
exact hosted-matching `prosrc` digests. A mismatch aborts before any DDL. The
three public mobile functions must have identical `prosrc` hashes before and
after field-v1 migration application.

### 8.2 Private immutable web evidence

Add three zero-direct-grant private ledgers. Names are versioned so later
authority or provenance models do not silently change their meaning.

`private.web_capture_command_receipts_v1` records one exact wrapper command
that reached a durable completed mobile receipt:

- mobile mutation ID as the unique command identity and foreign key to
  `private.mobile_sync_receipts`;
- actor, wrapper name and contract version;
- descriptor, stream, canonical identity, generation, and operation;
- a server-computed SHA-256 wrapper-command digest and digest version;
- the linked mobile canonical hash version/hash;
- the exact canonical mobile result JSON plus indexed `kind` and `code`;
- wrapper-observed server timestamp and Johannesburg date.

The digest document includes the wrapper contract version/name, authenticated
actor, every unchanged mobile RPC argument in exact type/order, the exact raw
`p_payload` text as a text value, and any wrapper-only parent-session mutation
ID. The server computes it; the client never supplies or selects a digest.

`private.web_capture_entity_origins_v1` records creator-path evidence only when
the wrapper proves that it created a previously absent root:

- entity kind limited to `time_entry` or `session`;
- entity UUID and actor;
- the creating web-command mutation ID;
- immutable server creation time and fixed source `web`.

Here, “creator-path evidence” means the wrapper observed the UUID absent and
received the accepted insert result while holding every lock available to the
supported web lane. It is not forensic proof against a deliberately concurrent
direct call to an original mobile RPC, which does not take the web actor lock.
That residual race is part of the shared-authority limitation and remains an
explicit executable threat-model case.

There is no Letter Mastery entity-origin row. Letter Mastery uses a mutable
natural-key record, so web mastery activity is represented by immutable command
events, not misleading last-writer/creator metadata. Clock-out also never
changes or creates root-origin evidence.

`private.web_capture_sweep_audit_v1` records each automatic closure with the
time-entry/actor identifiers, previous and new closure values, the creating web
origin, sweep timestamp, and fixed policy version. It contains no learner data.

All three tables are immutable after insert and have no direct privilege for
`PUBLIC`, `anon`, `authenticated`, `authenticator`, or `service_role`. Only the
reviewed `SECURITY DEFINER` functions may read or write them. Foreign keys are
not omitted merely to avoid migration work: every new table must be added to
the current `private.seed_wipe_primary` atomic truncate and zero-count lists,
the seed backup/restore manifest and digest, and relevant auditor/backup
contracts. Disposable PostgreSQL must prove wipe and restore. `ON DELETE
CASCADE` is not a substitute for deliberate immutable-evidence semantics.

### 8.3 Web wrapper execution contract

Add separately named, non-overloaded public wrappers:

- `apply_web_time_entry_mutation_v1`;
- `apply_web_session_bundle_mutation_v1`;
- `apply_web_letter_mastery_mutation_v1`.

Each takes the unchanged mobile envelope arguments in the same types and order.
Wrapper-only linkage uses an explicit additional argument, never a key inside
`p_payload`. Functions schema-qualify every object, set `search_path = ''` and
timezone UTC, revoke from `PUBLIC`/`anon`, and grant only to `authenticated`.

The fixed execution order is:

1. Read `auth.uid()` and require a non-null exact match to the envelope actor
   before payload parsing or private lookup.
2. Compute the server-side wrapper-command digest over all exact arguments.
3. Resolve a prior web command before applying live-day rules: the same actor,
   mutation ID, and digest returns the stored canonical result; a same-actor
   digest mismatch returns `web_capture_integrity_fault`; a different actor
   receives the same generic refusal/not-found shape used for absence.
4. If a mobile receipt already exists without a matching web sidecar, reject it
   as source/collision ambiguity. Never attach web evidence retroactively.
5. Parse only the raw payload fields needed by web policy using the mobile
   functions' safety order: byte cap, valid JSON text, duplicate-key rejection,
   top-level/type checks, then guarded casts in exception blocks. Do not rely on
   Boolean short-circuit evaluation for safe casts.
6. Acquire locks in the documented global order. Web clock commands first lock
   the actor's stable `public.staff_identity_links` row and then re-read open
   entries. Session admission locks the covering time entry through the nested
   session call. Clock-out and sweep take the same row lock before closure.
7. Apply the supported web policy and return typed web-only refusal JSON for an
   ordinary rejection; do not raise an ordinary policy SQLSTATE.
8. Call the unchanged, schema-qualified mobile RPC with the unchanged mobile
   arguments. Nested `SECURITY DEFINER` execution must preserve the request JWT;
   no wrapper may alter `request.jwt.*` GUCs.
9. Classify the exact inner `{kind, code}` and bind command evidence with
   `INSERT ... SELECT` from the completed mobile receipt. Receipt existence or
   HTTP 200 alone is not acceptance.
10. Insert entity-origin evidence only for a proven previously absent root and
    the exact accepted result: TIME_ENTRIES `{kind:"success",code:"accepted"}`
    or SESSIONS `{kind:"success",code:"accepted"}`. LETTER_MASTERY acceptance
    is `{kind:"success",code:"mastery_recorded"}` but creates command evidence
    only.
11. Return the inner canonical result unchanged. A sidecar binding/invariant
    failure raises and rolls back the whole outer transaction.

The browser maintains a small web-wrapper outcome inventory for
`historical_entry_required`, `web_capture_receipt_not_found`, and
`web_capture_integrity_fault`. Those codes are not added to the mobile
acknowledgment inventory. Task 1 must freeze exact `{kind, code}` fixtures for
every additional web-only policy refusal (access, existing root, open-clock
conflict, clock coverage, invalid policy fields, and missing parent session)
before SQL; no free-form database error text reaches the UI.

Supported admission rules are:

- clock-in is insert-only with a previously absent time-entry UUID, current
  Johannesburg day, a fixed skew window of 15 minutes past/5 minutes future,
  complete-or-null GPS, and no other open time entry after actor locking;
- clock-out is an update of one actor-owned existing entry, preserves creator
  origin, and cannot race a locked session admission;
- session capture is create-only with a previously absent session UUID,
  current Johannesburg `session_date`, non-null ordered start/end not after
  server `now()`, authorized group/attendees, and one locked actor-owned time
  entry covering the full interval;
- Letter Mastery uses the unchanged mobile payload and requires a wrapper-only
  parent session mutation ID bound to an accepted same-actor web session. This
  permits exact completion after midnight without creating a new session.

These rules protect the supported web lane and close ordinary multi-tab races;
they do not constrain direct calls to the original mobile RPCs. Mobile
historical behavior and every existing mobile result remain unchanged.

### 8.4 Read-only rollover resolver

Add `public.resolve_web_capture_receipt_v1` with enough original exact arguments
to recompute the wrapper-command digest. It:

- performs no call to any `apply_mobile_*` function;
- performs no receipt, head, domain, or sidecar DML;
- verifies the authenticated actor, mutation ID, digest, linked completed
  receipt identity/hash, and exact stored result;
- returns the stored canonical mobile result only on a full match;
- returns `web_capture_receipt_not_found` on absence or a different actor,
  without exposing an identity oracle; and
- returns `web_capture_integrity_fault` for a same-actor digest/binding
  mismatch.

Only the exact accepted inner result advances the browser from rollover
resolution to saved. A missing sidecar is not permission to write yesterday's
record.

### 8.5 Bootstrap read model

Add `public.web_capture_bootstrap_v1()` for the current authenticated actor. It
returns one bounded, versioned JSON object:

```json
{
  "schema_version": 1,
  "server_now": "2026-08-20T12:00:00.000Z",
  "server_date_sast": "2026-08-20",
  "actor_user_id": "uuid",
  "readiness": {
    "status": "ready",
    "codes": []
  },
  "active_time_entry": null,
  "groups": [
    {
      "id": "uuid",
      "name": "Group 1",
      "programme_level": "letters",
      "language": "isixhosa",
      "children": [
        {
          "id": "uuid",
          "first_name": "Lutho",
          "grade": "Grade R"
        }
      ]
    }
  ],
  "letter_mastery": [],
  "recent_sessions": []
}
```

Properties:

- no input `user_id`;
- `auth.uid()` is the sole actor;
- active assignments and memberships only;
- archived/unassigned entities excluded;
- first names only;
- current live mastery only;
- recent sessions bounded to the current Johannesburg day plus the previous six
  days for duplicate awareness, not backfill;
- stable ordering for groups, children, mastery, and history;
- a byte/count ceiling with a typed fail-closed response rather than truncation;
- readiness codes distinguish missing profile, no class, no roster, no groups,
  orphaned memberships, and inconsistent clock state; and
- duplicate open time entries produce a support-required readiness failure,
  never an arbitrary chosen row.

This RPC is a read optimization, not a new system of record. Its PostgreSQL
harness must compare its sets to the underlying RLS-visible rows.

Because creator-path evidence is private, implement bootstrap as tightly bounded
`SECURITY DEFINER`: schema-qualify every object, set a fixed empty search path,
accept no actor argument, derive `auth.uid()` once, filter every query to that
actor, revoke from `PUBLIC`/`anon`, grant only to `authenticated`, and test the
actual non-owner role. Recent-history source is `web` only with matching
accepted origin evidence; otherwise it is `mobile_or_legacy`. The latter is an
operational label, not proof that the mobile app created the row.

### 8.6 Web-only stale-clock RPC

Add `public.close_stale_web_time_entries_v1()`:

- executable only by `service_role`, not `authenticated`, `authenticator`,
  `anon`, or `PUBLIC`;
- accepts no caller-selected table, function, actor, threshold, or batch size;
- processes at most 100 open entries per call using `FOR UPDATE SKIP LOCKED`;
- joins to immutable accepted `web` time-entry origin evidence and never treats
  sidecar absence as web;
- locks candidate `staff_identity_links` actor rows in UUID order, then their
  time entries in UUID order with `FOR UPDATE SKIP LOCKED`, matching the
  interactive actor-before-entry order;
- selects only entries older than ten hours;
- sets closure to the later of `sign_in_time + interval '10 hours'` and the
  latest ended actor session inside that clock interval, considering **all**
  relevant actor sessions rather than only web-attested sessions, and never
  after server `now()`; an anomalous future session makes the entry
  support-required instead of forcing a misleading close;
- nulls both sign-out coordinates and sets `auto_clocked_out = true`;
- inserts one immutable sweep-audit row per closure;
- is idempotent and concurrency-safe; and
- cannot update `mobile_or_legacy` entries.

Freeze this exact response envelope before Django Task 12 begins:

```json
{
  "schema_version": 1,
  "closed_count": 2,
  "closed_ids": [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002"
  ]
}
```

The object has exactly those three keys. `schema_version` is integer `1`;
`closed_count` is an integer from 0 through 100; `closed_ids` contains unique
lowercase UUID strings in deterministic order; and `closed_count` equals the
array length. Zero work returns count `0` and `[]`, never null/204/empty. Django
may log the count but does not log IDs by default.

The closure is an out-of-band server update with no mobile receipt/head advance.
Before release, real pull/reconcile and subsequent mobile clock-out tests must
prove it cannot silently reopen or overwrite the server closure. If that proof
fails, the cron stays disabled even if its isolated SQL tests pass.

### 8.7 Migration, grant, and collision rules

The app checkout currently contains active work around
`20260819140000_session_capture_flag_v1.sql`, including a private session core
and successor public RPC. Before authoring the web migration:

1. Rebase on the latest merged app `main`.
2. Read the hosted/live migration state.
3. Read the exact current `pg_proc` source/digest with the repository's approved
   read-only path.
4. Add only new sidecars, wrapper/bootstrap/resolver/sweeper functions, current
   seed-wipe/backup integration, and their exact indexes/grants. Never replace
   or extend an existing mobile function body or payload.
5. Verify the wrapper owner can execute the nested definer functions while
   `auth.uid()` still reflects the request JWT; pin trusted owners and never
   mutate request GUCs.
6. Re-read hosted table/function grants. Migration absence is not proof that
   Supabase hosted defaults did not grant raw authenticated DML.
7. Add apply-time digest/preflight and postflight checks so drift or any mobile
   function-body change aborts the transaction.
8. Regenerate the seed archive/backup manifest digest and prove current
   seed-wipe/restore behavior with every new FK-backed table.
9. Rerun the full combined disposable-PostgreSQL harness under PostgreSQL 17.

## 9. Browser state model

### 9.1 Persistent keys

All keys include the authenticated actor UUID:

```text
zz_web:v1:<actor>:stream
zz_web:v1:<actor>:generation:<descriptor>:<canonical-key-hash>
zz_web:v1:<actor>:draft
zz_web:v1:<actor>:commands
zz_web:v1:<actor>:tab-lease
zz_web:v1:<actor>:diagnostics
```

Do not store display names, email addresses, participant identifiers, or full
bootstrap responses. Persist only IDs required by the exact mutation, statuses,
instructional selections, exact wire payloads, and submission metadata.
Rehydrate display names from a fresh authenticated bootstrap.

Free-text session notes are the unavoidable exception: once materialized they
are part of the exact wire payload required for honest retry. The UI tells EAs
not to enter surnames, contact details, health information, or other sensitive
details. Successful drafts/commands, including notes, are purged immediately
after full authoritative completion. An unresolved command retains its exact
payload until authoritative resolution or an explicit evidence-preserving
support disposition; it is never copied into diagnostics or the redacted
support summary. Sign-out names this deletion consequence and requires explicit
confirmation. Browser storage is not described as an encrypted vault.

### 9.2 Command state machine

```text
draft
  → materialized
  → submitting
  → session_confirmed
  → mastery_pending
  → complete

Any network/ambiguous result:
  submitting → retryable_same_day

At Johannesburg rollover:
  materialized | submitting | retryable_same_day
    → receipt_resolution_pending
       ├─ matching attested accepted receipt → session_confirmed
       ├─ attested non-success result         → classified exact result
       └─ no matching web attestation         → historical_entry_required

After an already confirmed session:
  mastery_pending → retryable until accepted or explicitly dispositioned

Integrity response:
  any nonterminal → integrity_fault
```

Nuance: after `session_confirmed`, Letter Tracker mutations may continue after
day rollover because the mastery wrapper verifies their accepted parent web
session; the UI must not create a new session. A day-expired unconfirmed command
is sent only to `resolve_web_capture_receipt_v1`, never to a mutation wrapper or
mobile RPC. A missing sidecar performs zero DML.

### 9.3 Materialization

Before the first network call, materialize and persist:

- command ID;
- actor ID;
- browser stream ID;
- root and member UUIDs;
- mutation IDs;
- canonical record keys;
- per-record generations;
- audit sequences;
- exact payload JSON;
- exact wrapper name/version and wrapper-only parent linkage;
- client timestamps and Johannesburg capture date;
- payload hash;
- ordered operation list; and
- the pinned upstream mobile-core commit.

Every retry loads this object and resends it verbatim. A UI edit after
materialization creates a new command only if nothing has been accepted; it
must never mutate an in-flight envelope.

### 9.4 Multiple tabs and sign-out

- One actor may have one active capture tab lease. A second tab is read-only and
  explains where capture is active.
- A stale lease expires and can be taken over without changing command IDs.
- Sign-out is blocked while unresolved work exists unless the EA explicitly
  confirms that the local evidence will be removed.
- Confirmed sign-out purges that actor's draft, commands, stream metadata, and
  cached UI/diagnostic state.
- Logging in as a different actor never displays or dispatches the first actor's
  commands.

## 10. UI and flow

Use one authenticated client application shell so a signal drop does not cause
Next.js to request a new route chunk midway through a session.

### 10.1 Routes

- `/login` — email/password login and reset link.
- `/reset-password` — Supabase recovery callback and new-password form.
- `/` — authenticated field shell containing Today, Clock, Group selection,
  Session capture, and status/history states.
- `/support` — static troubleshooting and support-contact instructions; no PII.

No historical route or query parameter is accepted.

### 10.2 Today shell

Shows:

- EA first name or email-safe greeting without exposing roster details before
  auth readiness;
- authoritative server date/time freshness;
- clocked-in/out state;
- recent sessions from both mobile and web;
- pending/retry/integrity status;
- group cards; and
- a visible online-required explanation.

If readiness is not `ready`, capture controls stay unavailable. The screen names
the operational prerequisite in plain language and gives a support reference.
It never suggests clearing storage or creating a replacement account.

### 10.3 Clock

Clock-in:

1. Confirm authenticated bootstrap and no unresolved clock anomaly.
2. Request browser geolocation with a ten-second deadline.
3. Use both coordinates or null/null.
4. Materialize the unchanged protocol-v2 time-entry insert envelope plus the
   separately named web-wrapper contract/version.
5. Persist it.
6. Submit and require authoritative success before enabling Start session.

Clock-out:

1. Warn/block while a session command is still being edited or its session
   bundle is unconfirmed.
2. Attempt location, null-tolerant.
3. Materialize the update against the existing entry with its next generation.
4. Submit idempotently.
5. If ambiguous, retain Clocking out state and retry; never fabricate a second
   time entry.

### 10.4 Session capture

Flow:

1. Choose a provisioned group.
2. Start session while authoritative clock coverage exists.
3. Show a simple elapsed counter derived from `started_at`; no pause/resume.
4. Mark each rostered child present, absent, or excused.
5. Letters group: choose at least one letter.
6. Blending group: choose at least one blend category; optionally add examples;
   choose current reading level per child.
7. Apply Letter Tracker changes in the existing paper-tracker order.
8. Add optional notes.
9. Review and submit.
10. Persist the materialized session/attendee bundle and mastery operations
    before sending anything.
11. Show partial truth if the bundle succeeds but mastery is still pending.
12. On full success, clear the draft and refresh bootstrap/history.

There is no session date input, manual clock input, or editable timestamp.

### 10.5 Duplicate warning

Warn, never block, if a recent session exists for the same group on the current
Johannesburg date. Show time, the operational source label (`web` or
`mobile_or_legacy`), and recorded teaching fields so the EA can recognize it.
Two legitimate sessions for one group in a day remain possible.

### 10.6 Day-expired unresolved work

If the server date advances before the session bundle is confirmed:

- stop automatic retries;
- make one exact read-only receipt-resolution call that performs no mutation;
- if that resolves to success, continue only the remaining mastery operations;
- retain the local evidence under the same actor;
- show `Historical entry required` only when no accepted session receipt
  exists;
- show a support/reference code and a read-only summary;
- do not expose a date editor or "submit anyway" button; and
- do not claim the data reached Supabase.

Until the separate EA historical-entry phase exists, the operational fallback
is paper plus support escalation. No one should patch production rows ad hoc
from the browser or be instructed to clear the evidence.

## 11. Operational provisioning release gate

For the initial cohort, operations—not the EA web client—owns account, roster,
and group setup.

An EA receives the link only after all of these are true:

- Supabase Auth user exists and the login credential has been tested;
- the identity is the same UUID intended for the mobile app;
- current class assignment exists;
- active learner roster exists;
- every child needed for teaching has an active group membership;
- at least one active group exists;
- group level and language are populated;
- the EA-token call to `web_capture_bootstrap_v1()` returns `ready` and the
  expected counts; and
- the support owner and data-bundle status are recorded.

The readiness check must run as the EA, not only through service role. A
service-role query proves storage, not RLS visibility.

Keep a rollout manifest outside the web client with, at minimum:

- EA UUID and email under appropriate access controls;
- school/cohort;
- expected class, child, and group counts;
- bootstrap readback counts;
- credential-tested timestamp;
- device/browser class;
- data bundle issued; and
- support owner.

The production provisioning script/workflow is a separate workstream. If it is
built, it must be manifest-driven, dry-runnable, idempotent, one-EA scoped,
target-verified, and receipt-producing. Do not turn the current TestFlight seed
helpers into an unreviewed bulk production writer.

## 12. Test strategy and proof boundaries

### 12.1 Pure/domain tests

- shared session state and validation parity;
- Johannesburg date calculation independent of browser timezone;
- draft serialization strips display PII;
- stable command materialization;
- canonical record keys and lowercase UUIDs;
- generation/audit progression;
- retry sends byte-identical payload;
- day rollover classification;
- partial session/mastery state; and
- actor namespace and sign-out behavior.

### 12.2 Disposable PostgreSQL

Using the app repo's existing combined PostgreSQL harness pattern, prove:

- migration preflight/postflight and byte-identical `prosrc` hashes for all
  three original mobile functions;
- an accepted pre-migration TIME_ENTRIES, SESSIONS, and LETTER_MASTERY receipt
  replays byte-for-byte after the migration through the original RPC names;
- old mobile payloads still succeed and create no web sidecar;
- a supported web success atomically creates domain/receipt/head, command
  evidence, and creator origin where applicable;
- injected failure after inner success rolls back the domain, receipt/head, and
  every sidecar;
- historical web clock/session creation is rejected while direct mobile
  historical behavior remains unchanged;
- the executable threat-model test demonstrates that a direct mobile-RPC call
  can bypass web admission and is labelled `mobile_or_legacy`, so the plan does
  not overclaim source enforcement;
- a pre-existing mobile receipt or root cannot be relabelled web;
- completed deterministic/stale receipts create no entity origin;
- exact wrapper replay returns stored canonical result, while digest/mutation
  reuse mismatch rejects;
- rollover resolution after a lost response is read-only; a miss performs zero
  receipt/head/domain/sidecar DML;
- two concurrent web clock-ins create one accepted open entry;
- session admission locks and requires its covering time entry;
- concurrent session/clock-out preserves coverage;
- actor mismatch, unauthorized group/child, and cross-actor resolver probes
  fail without an identity oracle;
- optional GPS pair rules and guarded raw-JSON cast ordering;
- bootstrap set/count parity, byte/count bounds, stable order, and truthful
  `web`/`mobile_or_legacy` labels;
- stale sweep is bounded, idempotent, concurrency-safe, touches only accepted
  web-origin entries, never closes before the latest covered session, and emits
  the exact three-key response envelope;
- seed wipe/restore includes all new ledgers and its manifest digest is current;
- direct sidecar access fails for every untrusted role and public-function
  grants are exact; and
- the full combined PostgreSQL 17 release harness remains green within the
  existing statement/lock budgets.

### 12.3 Real SQLite mobile compatibility

In the mobile app integration harness:

1. Insert time/session/attendee/mastery rows through the supported authenticated
   web wrappers, with sidecars remaining private and outside the row shape.
2. Pull them through the real mobile repository path into real SQLite.
3. Close/reopen the SQLite database.
4. Assert session history/detail, attendance, teaching fields, reading levels,
   and Letter Tracker render from the pulled rows.
5. Assert no pulled web-created row becomes pending local work and no serializer,
   SQLite schema, repository projection, or mapping changed.
6. Apply the stale-sweeper closure, pull/reconcile, close/reopen, and attempt the
   next ordinary mobile clock action; prove the server closure is not silently
   reopened or overwritten.

This proves row compatibility. It does not prove a physical phone received the
release.

### 12.4 Browser E2E

Use Playwright with a disposable Supabase test actor and deterministic seeded
roster. Cover:

- login, reload, logout, reset callback;
- readiness success and each fail-closed prerequisite state;
- GPS accepted, denied, unavailable, and timeout;
- clock-in response loss followed by exact replay;
- full letters session;
- full blending session;
- partial Letter Tracker response and resume;
- reload during a draft;
- reload after materialization but before response;
- duplicate warning;
- two-tab lease;
- day rollover with an attested receipt and with a read-only not-found result;
- no date/time inputs anywhere;
- actor switch cannot see prior local state; and
- 320px-wide viewport with no horizontal overflow.

Do not mock the final contract proof. Fast UI tests may mock Supabase, but at
least one E2E lane must use the disposable real RPC surface.

### 12.5 Real device

Required devices:

- Huawei/AppGallery-era phone and its actual browser;
- low-storage Samsung A05/A16-class device;
- an ordinary current Android Chrome device;
- iPhone Safari as a secondary compatibility check; and
- desktop Chrome only for operator debugging, not field sign-off.

Scenarios:

- fresh login over cellular;
- denied location;
- signal disabled after roster load and restored before same-day submit;
- tab background/foreground during a session;
- browser/process close and reopen with a draft;
- ambiguous response retry with no duplicate;
- low-storage behavior;
- text zoom and large font;
- keyboard not covering primary actions;
- sunlight/contrast check; and
- full clock-in → session → history → clock-out school-day path.

### 12.6 Real EA field gate

Staff testers are necessary but insufficient. Before broad rollout:

- at least three real EAs use Zazi iZandi Web during actual school work;
- include at least one target-problem device;
- each completes clock-in, at least one full session, history confirmation, and
  clock-out;
- compare the web view, Supabase row, mobile reporting view, and mobile-app pull;
- collect time-to-complete, confusion points, failed/retried submissions, and
  paper fallback occurrences; and
- fix any data-loss, duplicate, cross-actor, or unreadable-UI issue before
  expanding.

No fixed one-week soak is required, but one controlled school day is the minimum
field proof. Subsequent no-recurrence evidence remains separate.

## 13. Implementation branches and repository boundaries

### Planning repository

- Implementation-control branch: `feat/web-capture-field-v1-foundation` from
  merged plan commit `b6ea25a`.
- Artifact: this file only, plus any later approved architecture documentation.
- Do not implement the new app here.

### Mobile/Supabase repository

- Fresh isolated worktree and branch from current merged `main`:
  `feat/web-capture-contract-v1`.
- Owns migration, verification SQL, PostgreSQL harness, RPC serializer contract
  tests, and mobile pull compatibility.
- Must not disturb active bug-fix worktrees.

### New web repository

- Permanent local sibling repository; no remote or hosted project yet:
  `/Users/jimmckeown/Development/zazi-izandi-web`.
- Main feature branch: `feat/field-capture-v1`.
- Owns browser UI, auth, command journal, protocol adapters, E2E, and rollout
  docs.

### Django repository

- Fresh isolated worktree and branch from current merged `main`:
  `feat/web-capture-clock-sweeper-v1`.
- Owns only the bounded service-role RPC client call and management command.
- No capture POST endpoint and no general session writer in this plan.
- Work must not begin until the SQL harness freezes and proves the exact
  no-argument sweeper response contract. Render cron configuration waits until
  the RPC is hosted and postflight-verified.

## 14. Task-level implementation plan

Every task uses RED → GREEN, focused verification, full relevant suites, and a
commit without agent/co-author trailers. Before each task, re-read live files
and `git status`; the filenames below are contracts, but migration timestamps
and current function revisions must be resolved from the live branches.

### Task 0 — Revalidate bases and freeze the contract snapshot

**Files:**

- This plan.
- Create in app repo:
  `documentation/plans/2026-08-20-web-capture-contract-snapshot.md`.

**Steps:**

- [x] Fetch/revalidate the existing repositories without touching dirty active
      worktrees; record local/remote `main` SHAs.
- [x] Confirm which August session-capture migration and RPC mapping are merged.
- [x] Read the hosted migration list and exact relevant `pg_proc` bodies through
      the approved read-only path; record digests without credentials.
- [x] Confirm source configuration authorizes protocol v2. Installed-phone
      uptake remains a separate field fact and is not claimed by this snapshot.
- [x] Confirm `capture_source` is absent and collect bounded aggregate
      row/open-clock evidence read-only.
- [x] Prove all five relevant local function bodies match hosted SHA-256 digests.
- [x] Run the focused pre-change mobile protocol baseline: 7 suites/51 tests
      green, including the combined PostgreSQL 17 release harness.
- [x] Confirm no sibling repository existed and create only an inert staging
      repository after authorization.
- [x] Record exact shared-module upstream SHA and test files.
- [x] Obtain independent protocol-v2 adversarial review and incorporate its
      FIX-FIRST findings into this plan and the snapshot.
- [ ] Commit the reviewed snapshot on `feat/web-capture-contract-v1` after the
      final revised-contract consistency pass.

**Evidence note:** Hosted aggregate inspection found 35 open entries older than
ten hours but no source discriminator. Those rows are not labelled invalid and
must not be touched. No hosted write/apply/deploy/release occurred.

**Stop condition:** If production/client transport differs from this plan, if a
mobile function digest drifts, or if installed-client compatibility needs a
mobile change, revise the plan before SQL. Do not make the plan true by
overwriting live code.

### Task 1 — Write the Supabase wrapper-contract RED harness

**App-repo files:**

- Create: `scripts/web-capture-v1-postgres-harness.cjs`.
- Create: `supabase/verification/web-capture-v1-post-apply-verification.sql`.
- Modify: `package.json` only to add `verify:web-capture:postgres`.

**RED cases:**

- [ ] New web wrapper/bootstrap/resolver/sweeper functions and private ledgers
      are missing.
- [ ] Existing mobile function source hashes must remain byte-identical.
- [ ] Pre-migration accepted receipts replay unchanged after the future
      migration, not merely fresh old payloads.
- [ ] Old mobile calls create no web sidecars.
- [ ] Web command/origin evidence is atomic with accepted domain/receipt/head
      state, including injected rollback after inner success.
- [ ] A pre-existing mobile row/receipt cannot be relabelled web.
- [ ] Completed deterministic/stale receipts create no entity origin.
- [ ] Supported historical web creation rejects, while an explicit direct
      mobile-RPC bypass test documents the shared-authority limit.
- [ ] Rollover resolver success is read-only and a miss performs zero DML.
- [ ] Actor/open-clock/session-coverage locking and concurrency behavior.
- [ ] Exact-key `{kind, code}` fixtures and durability/retry disposition for
      every web-only outcome, separate from the unchanged mobile inventory.
- [ ] Bootstrap shape, bounds, actor scoping, ordering, readiness codes, and
      `web` versus `mobile_or_legacy` labels.
- [ ] Stale-clock scope, coverage floor, audit, response envelope,
      concurrency, and idempotency.
- [ ] Seed wipe/restore, backup manifest, owner/search-path, nested auth, and
      exact grant/revoke contracts.

Run:

```bash
npm run verify:web-capture:postgres
```

Expected: **FAIL with positive missing-surface assertions**, after the
disposable PostgreSQL engine and full existing migration chain start
successfully. Missing PostgreSQL, a missing migration file, or setup failure is
not an acceptable RED.

Commit the executable RED harness before implementation, then independently
review its threat coverage and non-vacuous failure evidence.

### Task 2 — Implement additive wrappers, private evidence, bootstrap, and sweep

**App-repo files:**

- Create: `supabase/migrations/<timestamp>_web_capture_v1.sql`.
- Update: `supabase/verification/web-capture-v1-post-apply-verification.sql`.
- Update only current seed backup/archive manifest artifacts strictly required
  by the new FK-backed ledgers.
- Do **not** edit an existing migration, mobile serializer, RPC mapping,
  acknowledgment inventory, SQLite/repository file, or mobile function
  generator/source.

**Steps:**

- [ ] Preflight exact hosted-matching signatures, owners, security config,
      grants, and `prosrc` digests for the three inner mobile RPCs and session
      core.
- [ ] Add immutable command-receipt, entity-origin, and sweep-audit ledgers with
      zero direct client/service-role grants.
- [ ] Integrate every new FK-backed table into the latest atomic seed wipe,
      zero-count, backup/restore, auditor, and manifest-digest contracts.
- [ ] Add three separately named web write wrappers with server-computed digest,
      collision refusal, guarded parsing, stable lock order, unchanged nested
      mobile calls, exact outcome classification, and atomic evidence.
- [ ] Add the read-only receipt resolver; prove it never delegates to a writer.
- [ ] Add bounded definer bootstrap with actor-derived filtering and truthful
      source labels.
- [ ] Add bounded stale sweep with coverage-preserving close time, audit, fixed
      three-key response, and service-role-only execute.
- [ ] Preserve original mobile result envelopes and return them unchanged from
      nested paths; keep wrapper-only codes in a separate web inventory.
- [ ] Postflight identical mobile function hashes and exact new grants.
- [ ] Run the focused harness to GREEN, seed wipe/restore regression, and the
      complete combined PostgreSQL 17 release harness.
- [ ] Run migration static checks and `git diff --check`.
- [ ] Adversarially review actor/auth semantics, exact-key/cast ordering,
      receipt/replay, origin mislabelling, lock ordering, raw hosted grants,
      service-role exposure, seed/backup effects, and statement-budget latency.
- [ ] Commit only after all Critical/Important findings are fixed.

No hosted apply occurs in this task.

### Task 3 — Freeze and prove mobile non-regression

**App-repo files:**

- Create: `__tests__/webCaptureV1MobileFreeze.test.js`.
- Create: `__tests__/webCaptureServerRows.integration.test.js`.
- Extend the web PostgreSQL harness with pre/post-migration receipt fixtures.
- Modify no production file under `src/services`, no SQLite schema/repository,
  and no mobile RPC mapping or acknowledgment inventory.

**RED/GREEN:**

- [ ] Snapshot exact serializer/mapping/acknowledgment digests and fail on any
      field-v1 diff.
- [ ] Replay already accepted pre-migration TIME_ENTRIES, SESSIONS, and
      LETTER_MASTERY receipts byte-for-byte through original RPC names.
- [ ] Create rows through web wrappers, then pull through the ordinary mobile
      repository into real SQLite.
- [ ] Force close/reopen and assert history/detail, attendance, teaching fields,
      reading levels, and Letter Tracker behavior.
- [ ] Assert sidecars do not alter server row shapes and no pulled row becomes
      pending local work.
- [ ] Sweep a disposable web-origin clock, pull/reconcile it, then exercise the
      next ordinary mobile clock mutation; prove no silent reopen/overwrite.
- [ ] Run focused Jest, full unit/integration suites, the focused web PostgreSQL
      harness, and the full combined PostgreSQL 17 release harness.
- [ ] Record zero production mobile-code diff and commit tests/evidence only.

### Task 4 — Scaffold the separate web repository

**Status:** Inert foundation committed locally at `9be35c8` in
`/Users/jimmckeown/Development/zazi-izandi-web`; no auth, Supabase call, capture
feature, PWA, hosted project, credential, remote, or push. `npm run verify` and
the production-server 320×740 Playwright scaffold check pass from the permanent
path.

**New-repo files:**

- Create repository root, Next.js 16 App Router, TypeScript, Tailwind v4.
- Create `components.json` with shadcn `new-york` and Lucide.
- Create `.env.example`, `.gitignore`, `README.md`, `AGENTS.md`/`CLAUDE.md`,
  `playwright.config.ts`, and CI workflow.
- Create `app/globals.css`, `app/layout.tsx`, and brand tokens matching Zazi
  primary/accent colors and Roboto/Open Sans conventions.

**Packages:**

- runtime: `next`, `react`, `react-dom`, `@supabase/supabase-js`, `zod`,
  `uuid` (the pinned shared module imports it even when factories are injected),
  `lucide-react`, shadcn dependencies;
- development: TypeScript, ESLint, Tailwind, `tsx`, Playwright, and required
  type packages;
- no PWA/service-worker dependency.

Security-maintenance pins at the initial scaffold checkpoint are Next.js
`16.3.1`, `eslint-config-next` `16.3.1`, UUID `11.1.1`, and `tsx` `4.23.12`;
`npm audit` reports zero known vulnerabilities. Supabase JS remains `2.100.1`
for the Node 20 compatibility boundary; upgrading to a release that requires
Node 22 is a deliberate runtime decision, not an opportunistic scaffold bump.

**Scripts:**

```json
{
  "dev": "next dev",
  "build": "next build --webpack",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit --incremental false",
  "test": "node --import tsx --test lib/*/*.test.ts",
  "test:e2e": "playwright test",
  "verify": "npm run test && npm run typecheck && npm run lint && npm run build"
}
```

Task 5 expands the test glob only after the reviewed `shared/*` files exist;
unmatched globs must not make the foundation suite fail for the wrong reason.

**Foundation checks:**

- [x] Initialize `main` plus `feat/field-capture-v1` in isolated staging.
- [x] Implement an inert server-rendered shell, support route, field visual
      tokens, safe-area/320px constraints, security headers, and a request-nonce
      CSP with `strict-dynamic`, no production `unsafe-inline`/`unsafe-eval`, and
      a Supabase-origin-only `connect-src` policy. The nonce makes pages dynamic
      by design before authenticated data exists; production responses also set
      one-year HSTS without claiming preload/subdomain policy.
- [x] Create a pure runtime-contract sentinel that freezes online-first,
      no-PWA, and historical-entry-required boundaries without product DML.
- [x] Generate and inspect `package-lock.json`; CI now uses
      `npm ci --ignore-scripts` on Node 20.19.4.
- [x] Run the pure test, typecheck, lint, production build, and dependency
      audit. The build uses Next's webpack path because Turbopack's CSS worker
      attempts a local port bind denied by this sandbox. Local Node 20.11 is
      below the declared/CI floor and remains an explicit environment caveat,
      not a reason to lower the engine contract.
- [x] Add and pass a responsive 320px Playwright shell smoke covering CSP,
      absence of capture inputs, no horizontal overflow, 48px support target,
      preservation guidance, and the historical-entry-required state. CI
      installs Chromium explicitly and runs this lane against `next start` after
      the production build. GitHub Actions are pinned to immutable v4 commit
      SHAs and push CI is not branch-filtered.
- [x] Independently review the full staged diff, fix all Critical/Important
      findings, and commit locally as `9be35c8` without agent trailers.
- [ ] Move the temporary repository to the planned sibling path, create/read
      back its GitHub remote, and run real CI when repository authentication is
      available. A local commit is not a published repository.

### Task 5 — Pin and guard the shared mobile core

**New-repo files:**

- Create: `shared/zz-core/src/utils/activeSessionState.js`.
- Create: `shared/zz-core/src/utils/sessionCaptureValidator.js`.
- Create: `shared/zz-core/src/utils/localDate.js`.
- Create: required `shared/zz-core/src/constants/egraConstants.js` and literacy
  constants actually imported by the selected flow. Preserve the upstream
  `src/utils` ↔ `src/constants` relative layout so imports work unchanged.
- Create: `shared/zz-protocol/src/services/webCaptureV1Contract.ts`, authored in
  the web repository against the frozen wrapper signatures and exact unchanged
  mobile payload fixtures. It is not copied back into or imported by the mobile
  app.
- Create Node-test parity ports:
  `shared/zz-core/core-parity.test.ts` and
  `shared/zz-protocol/webCaptureV1Contract.test.ts`.
- Create: `shared/zz-core/UPSTREAM.md`.
- Create: `scripts/sync-zz-core.mjs`.
- Create: `scripts/check-zz-core.mjs`.

**Rules:**

- pin an exact merged mobile commit;
- sync script reads an explicit allowlist, never a broad directory;
- `UPSTREAM.md` records the upstream source and focused Jest test paths/digests,
  while the web repo runs equivalent `node:test`/`assert` parity cases rather
  than trying to execute Jest files under the Node test runner;
- check script fails when the pinned upstream files differ;
- the protocol guard separately fails if any frozen mobile serializer, RPC
  mapping, or acknowledgment fixture digest differs from the reviewed snapshot;
- browser adapters are outside `shared/zz-core`;
- injected UUID/time dependencies use Web APIs where supported; and
- Johannesburg date tests run under at least UTC and America/New_York process
  timezones to catch accidental device-local behavior.

Run copied tests and checksum RED/GREEN, then commit.

### Task 6 — Implement Supabase auth and actor isolation

**New-repo files:**

- Create: `lib/supabase/client.ts`.
- Create: `lib/auth/session.ts` and tests.
- Create: `components/auth/auth-provider.tsx`.
- Create: `app/login/page.tsx`.
- Create: `app/reset-password/page.tsx`.
- Create: `app/support/page.tsx`.
- Update: `.env.example` with only
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**RED cases:**

- auth events bind/unbind actor namespace;
- malformed/missing session blocks bootstrap;
- account switch cannot access another actor's local keys;
- sign-out with unresolved work requires explicit confirmation;
- recovery callback cannot become an open redirect; and
- no service-role-like env name or value reaches the client bundle.

Configure the Supabase Auth reset allowlist for local preview and the eventual
production URL only during the authorized deployment step. Run unit, E2E, lint,
typecheck, and build; commit.

### Task 7 — Implement bootstrap and the provisioning/readiness gate

**New-repo files:**

- Create: `lib/data/bootstrap.ts`, schema, fixtures, and tests.
- Create: `components/field/field-shell.tsx`.
- Create: `components/field/readiness-state.tsx`.
- Create: `components/field/today-dashboard.tsx`.
- Create: `app/page.tsx`.

**RED cases:**

- fail closed on non-2xx, Supabase error, bad JSON, wrong schema version,
  semantic count mismatch, duplicate open clocks, orphan memberships, or actor
  mismatch;
- loading never renders capture controls;
- no roster/group renders support guidance rather than an empty usable shell;
- recent history preserves truthful `web`/`mobile_or_legacy` labels; and
- participant identifiers or surnames in a fixture are rejected/stripped.

Use one RPC request, validate with Zod, and render no capture surface until
ready. Run suites and commit.

### Task 8 — Implement the durable command journal and protocol adapters

**New-repo files:**

- Create: `lib/capture/command-types.ts`.
- Create: `lib/capture/materialize.ts` and tests.
- Create: `lib/capture/journal.ts` and tests.
- Create: `lib/capture/generations.ts` and tests.
- Create: `lib/capture/rpc-client.ts` and tests.
- Create: `lib/capture/retry-policy.ts` and tests.
- Create: `components/field/submission-status.tsx`.

**RED cases:**

- stable IDs survive reload;
- retry JSON/args are byte-for-byte equivalent;
- generation increments only on a new accepted intent for the same record;
- timeout remains ambiguous/retryable, not failed-and-regenerated;
- success receipt resolves ambiguous state;
- mismatch response becomes integrity fault;
- session success plus mastery failure is partial, not complete;
- day rollover permits one exact read-only resolver call, never a mutation
  replay;
- a matching attested receipt resolves after rollover;
- a missing sidecar returns not-found and reaches
  `historical_entry_required` without DML;
- confirmed-session mastery completion can continue;
- malformed/tampered local commands fail closed;
- PII display fields never persist; and
- second tab cannot dispatch.

Use actual mobile RPC response vocabulary fixtures plus the separate fixed web
wrapper outcome inventory. Do not infer success from HTTP 200; protocol JSON
`{kind, code}` is authoritative. Run suites and commit.

### Task 9 — Implement live clock-in/out

**New-repo files:**

- Create: `lib/capture/geolocation.ts` and tests.
- Create: `lib/capture/time-entry-command.ts` and tests.
- Create: `components/field/clock-card.tsx`.
- Add clock E2E fixtures/specs.

**RED/GREEN scenarios:**

- successful coordinates;
- denied/timeout → null/null and visible note;
- half coordinate rejected locally;
- clock-in remains disabled until authoritative success;
- existing open entry is reused/displayed, not duplicated;
- clock-out is idempotent;
- unresolved session prevents clock-out;
- lost response exact replay; and
- historical/tampered sign-in rejected by the real supported web wrapper; and
- a separate explicit test records that direct mobile-RPC invocation is outside
  that supported-lane guarantee.

Run unit, real-contract E2E, Playwright, and full web verification; commit.

### Task 10 — Implement full live session capture

**New-repo files:**

- Create components under `components/field/session/`:
  `group-picker.tsx`, `attendance-step.tsx`, `letters-step.tsx`,
  `blending-step.tsx`, `reading-level-step.tsx`,
  `letter-tracker-step.tsx`, `notes-step.tsx`, `review-step.tsx`, and
  `session-capture.tsx`.
- Create: `lib/capture/session-command.ts` and tests.
- Create: `lib/capture/mastery-command.ts` and tests.
- Create: `lib/capture/draft.ts` and tests.
- Add full-flow E2E specs.

**Rules:**

- no date/time input or backfill query mode;
- internal `sessionDate` is pinned from authenticated bootstrap
  `server_date_sast`, never derived from the browser's local timezone and never
  user-editable;
- current group snapshot/roster pinned at session start;
- at least one present child;
- letters/blends validator parity;
- child reading-level keys limited to attendees;
- stable attendee IDs;
- letter language normalized exactly as mobile;
- no timer pause state;
- draft autosaves after meaningful changes, stripped of names;
- review shows exactly what will be sent; and
- submit materializes before network I/O.

**RED/GREEN scenarios:**

- letters session;
- blending session;
- attendance states;
- full Letter Tracker add/restore/archive semantics;
- bundle accepted/mastery pending;
- exact retry after reload;
- day rollover receipt-resolution success and historical-entry-required
  branches;
- duplicate warning without blocking; and
- mobile pull/render integration for resulting rows.

Run copied core tests, web unit suite, browser E2E, disposable PostgreSQL, and
mobile real-SQLite compatibility; commit.

### Task 11 — Add diagnostics, support, and expired-evidence handling

**New-repo files:**

- Create: `lib/diagnostics/event-ring.ts` and tests.
- Create: `components/field/historical-entry-required.tsx`.
- Create: `documentation/field-support-runbook.md`.
- Create: `documentation/rollout-checklist.md`.
- Create: `documentation/privacy-and-local-storage.md`.
- Add WhatsApp-ready login/support copy.

Server-derived v1 observability comes from private immutable web-command/origin
evidence, mobile protocol receipts, web sweep audit/counts, and ordinary Vercel
request/deploy health. The browser also keeps a bounded, actor-scoped, PII-free
local diagnostic ring containing event classes such as bootstrap failure code,
draft recovered, command materialized, retry count, receipt success, integrity
fault, historical-entry-required, and full completion duration. It stores no
child names/IDs, notes, teaching selections, auth tokens, or raw RPC payloads.
The support UI can render a redacted copy for the EA to share deliberately.

Field v1 does not silently add Sentry, a Supabase client-events table, or a
Next.js telemetry proxy. A centralized client-event sink is a later explicit
privacy/operations decision.

The support runbook begins read-only: preserve command/reference evidence, check
authoritative server rows/receipts, and never advise clearing browser storage
until unresolved work is retained or deliberately dispositioned.

Run tests and commit.

### Task 12 — Implement the Django web-only stale-clock command

**Django files:**

- Create: `api/mobile/web_capture_supabase.py` with an exact allowlist for
  `close_stale_web_time_entries_v1` only.
- Create: `api/management/commands/close_stale_web_time_entries.py`.
- Create: `api/tests_web_capture_clock_sweeper.py`.
- Update operational documentation with the Render cron command/schedule.

**RED cases:**

- missing env fails before a request;
- exact no-argument POST to the fixed RPC with `{}`, finite timeout, and
  redirects disabled;
- no arbitrary RPC, table, insert, patch, or update method exists;
- service-role secret, headers, settings, raw response text, and request/exception
  representations never appear in output or errors;
- exact three-key zero/nonzero envelopes decode successfully;
- 204/empty/null/list/scalar, malformed JSON, missing/extra keys, unsupported
  version, bool-as-int, negative/over-100 count, malformed/duplicate/non-lowercase
  UUIDs, oversized ID arrays, and count/length mismatch fail closed;
- timeout, network, and non-2xx failures raise sanitized `CommandError` and exit
  nonzero; and
- command output is bounded aggregate count only and `handle()` returns `None`.

The Django mock suite proves dispatch, strict decoding, redaction, and process
behavior only. Web/mobile selection, concurrency, coverage, and idempotency are
SQL-harness responsibilities; do not claim them from mocked HTTP.

Run focused Django tests, relevant socket-free service regressions,
`manage.py check`, and `git diff --check`; do not invoke the real write-capable
management command as a local smoke test. Commit only after the frozen SQL
contract is GREEN. The proposed Render schedule is hourly at `15 * * * *` UTC
(`:15` each Johannesburg hour), giving at most roughly one hour beyond the
ten-hour eligibility threshold. Render's current
[Cron Jobs documentation](https://render.com/docs/cronjobs) states that all
schedule times use UTC and that one cron service has a single-run guarantee;
record that readback again at configuration time. Alert on nonzero exit and
record count, duration, and build only. Configure the cron only after hosted
Supabase postflight and explicit release authorization.

### Task 13 — Adversarial review and full local release gate

Across all implementation branches:

- [ ] Review auth actor equality and service-role absence.
- [ ] Review every exact-key serializer against current SQL.
- [ ] Review timestamp ordering, Johannesburg day rules, clock coverage, and
      midnight behavior.
- [ ] Review receipt/head ordering and same/different-payload replay.
- [ ] Review the explicit mobile no-touch diff/digests and pre-migration accepted
      receipt replay, not only fresh payload compatibility.
- [ ] Review web-command versus entity-origin semantics and ensure no
      mobile/mobile-or-legacy record can be relabelled.
- [ ] Review the read-only resolver for zero writer delegation/DML.
- [ ] Review lock ordering, concurrent clock/session/sweep behavior, sweep
      coverage floor, and the out-of-band mobile reconciliation consequence.
- [ ] Review seed wipe/restore, backup manifest, and every new ledger FK/grant.
- [ ] Run and preserve the deliberate direct-mobile-RPC bypass proof so the
      shared-authority limitation stays visible.
- [ ] Review session/mastery partial completion and support evidence.
- [ ] Review RLS/SECURITY DEFINER search path and anti-oracle behavior.
- [ ] Review local-storage PII, actor purge, and multi-tab behavior.
- [ ] Review old installed mobile compatibility.
- [ ] Run all focused and full relevant suites.
- [ ] Run production builds.
- [ ] Run `git diff --check` and inspect every changed file.
- [ ] Record exact outputs and SHAs in release receipts.
- [ ] Fix all Critical/Important findings before merge.

Merge and push each repository only after its gates are green and current base
is revalidated. A merged branch is not a hosted migration or field release.

### Task 14 — Authorized deployment and field validation

This task requires explicit authorization for hosted writes, Vercel/DNS/Auth
configuration, and release rollout.

Order:

1. Apply and postflight-verify the Supabase migration.
2. Rerun the hosted authenticated contract canary with disposable test data.
3. Deploy/configure the Django command and Render cron; verify a scoped web-only
   stale row, never a real EA payroll row.
4. Create/configure the Vercel project and environment.
5. Add Supabase Auth reset redirect allowlist.
6. Configure DNS and HTTPS.
7. Seed/provision disposable browser-test EA data.
8. Run production Playwright smoke.
9. Run Huawei/Samsung/iPhone device matrix.
10. Run controlled real-EA school-day pilot.
11. Compare web UI, Supabase, PM reports, and mobile pull.
12. Record separate receipts for schema, deployment, device, and field proof.

Rollback:

- Disable/link-withhold Zazi iZandi Web first.
- Stop the Render cron independently.
- Do not drop private evidence ledgers or accepted rows as an incident reflex.
- Preserve receipts and local evidence.
- Roll forward RPC defects when accepted production data exists; destructive
  schema reversal requires its own reviewed plan.

## 15. Release acceptance criteria

Field v1 is ready for the controlled cohort only when all are true:

- [ ] Operations readiness manifest is complete for each pilot EA.
- [ ] EA-token bootstrap readback returns expected roster/group counts.
- [ ] No service-role secret exists in web source, bundle, environment, logs, or
      Vercel client configuration.
- [ ] Mobile production files have zero field-v1 functional diff, original
      function hashes are unchanged, and pre-migration accepted receipts replay
      byte-for-byte in disposable PostgreSQL.
- [ ] Supported web wrappers reject historical creation; documentation and an
      executable test preserve the direct-mobile-RPC bypass limitation.
- [ ] Exact same-day retry and read-only post-rollover resolution create at most
      one time entry/session.
- [ ] Web-command and creator-origin evidence is atomic, cannot be attached to a
      pre-existing mobile receipt/root, and is labelled honestly.
- [ ] Session-attendee family is atomic.
- [ ] Letter Tracker partial/retry states are honest and recoverable.
- [ ] Real SQLite pull/close/reopen renders web rows and the sweep/reconcile
      scenario cannot silently reopen or overwrite closure.
- [ ] Seed wipe/restore, backup manifest, grants, wrapper locks, and bounded
      sweep concurrency are proven in PostgreSQL 17.
- [ ] Huawei and low-storage Samsung complete the full flow.
- [ ] At least three real EAs complete a controlled school day.
- [ ] No Critical/Important adversarial finding remains.
- [ ] Support and paper fallback instructions are distributed.
- [ ] Hosted migration, Vercel deployment, phone loading, and field use each have
      a separate receipt.

## 16. Deferred work and decision gates

### 16.1 EA historical session entry with review flag

Write a separate plan after field v1 is stable, or sooner if real expired
commands make it operationally urgent.

Expected architecture:

```text
Authenticated EA in Zazi iZandi Web
  → explicit historical-session mode and reason
  → dedicated authenticated historical-session RPC
  → all-writer table boundary independently derives historical/review state
  → EA-owned session family plus immutable capture evidence
  → business backend surfaces flagged rows for legitimacy review
```

Required future decisions:

- permitted historical window and whether future dates always reject;
- required reason vocabulary and minimum free-text evidence;
- whether a historical session must correspond to a time entry;
- the immutable server-derived flag/audit representation at a trigger or other
  boundary every session writer crosses;
- how direct/mobile historical writes receive the same classification, with a
  `reason_missing` state when they did not use the dedicated workflow;
- how the business backend presents, filters, and dispositions suspicious rows;
- whether legitimacy disposition may annotate only or can exclude the session
  from named reports;
- how an expired local command is converted into deliberate historical entry
  without silently reusing a rejected live envelope; and
- whether duplicate warnings become stricter for historical submissions.

The first version is create-only. It does not grant historical time-entry,
session-edit, delete, staff impersonation, or EA-credential-sharing capability.
The dedicated workflow collects the reason, but the historical classification
must not depend on taking that path: the database derives it for every relevant
writer. A modified browser cannot submit `reviewed=true`; a direct mobile-RPC
historical write is still flagged, although its reason may be missing.

### 16.2 Offline/PWA v2

Trigger a separate plan after at least two school weeks of online-first evidence
or earlier if cold-start/no-signal failures materially block capture despite
data provision.

Measure:

- cold-start failures;
- drafts recovered;
- retry rates and time-to-confirm;
- commands expiring into historical-entry-required support state;
- paper fallback specifically caused by absent coverage;
- storage pressure/eviction; and
- support burden by device/browser.

V2 minimum proof includes service-worker update safety, actor-scoped IndexedDB
roster/outbox, schema migration, auth expiry, visible unsent count, manual retry,
storage persistence behavior, cross-account purge, and real offline cold starts.

### 16.3 Paper assessment entry and grouping

Separate from capture v1. Preserve the agreed direction—tick actual letters,
not count-only—but do not combine assessment instrument/version/window
semantics with the two-week field-capture release. Initial cohort uses paper and
the operational provisioning/grouping process.

### 16.4 Production provisioning tooling

Build only from a dedicated manifest/rehearsal plan. It is high-authority learner
data work and must include dry-run, per-EA scoping, idempotency, backup/readback,
receipts, and correction procedures.

## 17. Important estimates and honesty

The independent review makes a field-safe two-week pilot unrealistic. A static
scaffold or happy-path demo in roughly two weeks is plausible; the reviewed v1
also needs new atomic wrappers, provenance ledgers, seed/backup integration,
concurrency and rollover proof, real SQLite non-regression, full session UI,
device testing, and a controlled school day. A focused **four-to-eight-week**
window is a more honest planning range if roster/groups are provisioned outside
the client and testers are continuously available. It is an estimate, not a
ship promise.

The first month or two of providing data directly to EAs is therefore useful
product strategy, not a workaround to be embarrassed about. It buys time to
protect the battle-tested mobile engine and learn whether online-first browser
capture solves enough of the field problem before funding PWA complexity.

A code-complete happy path is not a field-safe release. Any failure in
idempotency, actor isolation, row compatibility, wrapper-evidence integrity,
sweep reconciliation, or low-end-device usability blocks rollout even if the
calendar target is missed. Deliberate direct invocation of the mobile RPC is an
accepted v1 threat-boundary limitation, not a claim that the supported UI is
historical-entry capable.

## 18. Final closure statement

Field v1 is an **install-free, online-first live capture instrument with durable
same-day delivery**, not a second offline mobile app. It succeeds when an EA who
cannot use the Expo app can clock in, conduct and record a complete session,
confirm the authoritative record, and later see that same work in the mobile
universe—without backfill, duplication, hidden partial failure, or a new data
silo.
