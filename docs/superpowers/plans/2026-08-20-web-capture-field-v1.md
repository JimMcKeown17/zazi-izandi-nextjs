# Zazi iZandi Web Field v1 — Implementation Plan

> **Status:** Proposed for implementation after review. This plan was derived from
> `documentation/web-capture-fallback-design-questions.md` and revalidated against
> the live mobile-app, Supabase migration, Django, and Next.js seams on
> 2026-08-20.
>
> **Primary outcome:** Give an EA who cannot install or reliably run the Expo app
> a small, mobile-first browser surface that records live work into the same
> Supabase operational tables, under the EA's own Supabase identity, without
> creating a second data universe.
>
> **Deliberate boundary:** Field v1 is online-first and install-free. It survives a
> network failure after the page and roster have loaded, but it is not a
> cold-start-offline PWA. True offline capture is a separately gated v2.

## 1. Executive decision

Build a separate Next.js application, `zazi-izandi-web`, for EAs only. It uses
the same Supabase email/password account as the mobile app and writes directly
to the mobile operational store through the existing authenticated protocol-v2
RPC boundary. It does not use Clerk, Django as a capture proxy, a service-role
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
- provenance on every web-created clock/session row; and
- a web-only stale-clock server sweeper.

Field v1 does **not** allow an EA to enter a historical date or time. It also
does not implement manager-entered backfill. A future approved-correction flow
will live in the Clerk staff application and write on behalf of an EA through
Django with a durable approval audit. That is a separate product and security
surface, not a date picker hidden in the EA client.

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
| 9 | Write transport | Authenticated Supabase protocol-v2 RPCs with receipts/generation semantics; no raw sequential session-family DML |
| 10 | Django | Out of the interactive capture path; used only for the web-only stale-clock cron in v1 |
| 11 | Session scope | Full instructional session capture, including Letter Tracker; assessments remain out |
| 12 | Timer | Simple start-to-submit elapsed time; no pause/resume polish, background timer promises, or 20-minute coaching UI |
| 13 | Geolocation | Attempt it; denial, unavailability, or timeout does not block clock-in; coordinates are either a complete pair or both null |
| 14 | Backfill | No EA backfill in v1 and no manager backfill implementation in this plan |
| 15 | Retry | Same-day delayed delivery is allowed only for a command materialized during a live, clocked-in flow; day-expired commands require manager review |
| 16 | Provisioning | Supabase account, class, roster, and groups must be provisioned and read back before the EA receives the link |
| 17 | Offline | No service worker, offline app shell, cached roster, background sync, or cold-start-offline promise |
| 18 | Shared logic | Pinned copy plus checksum guard now; separate shared package only after the mobile app stabilizes |
| 19 | Provenance | `capture_source` is constrained and non-null on `time_entries` and `sessions`; mobile remains the default |
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
After rollover, the EA client may make one **receipt-resolution replay** of the
exact immutable command. The RPC must resolve an already accepted matching
receipt before applying the historical-date admission rule. Therefore the
replay can discover that yesterday's command committed despite a lost response,
but it cannot create yesterday's record. If no matching success receipt exists,
the RPC returns `manager_review_required` and the EA client never attempts to
create or alter the historical record.

### 4.3 Backfill / approved correction

A person intentionally creates or changes a record for a historical day. EAs
cannot do this in field v1. The future manager flow must preserve two identities:

- the EA whose operational rows own the work; and
- the authenticated staff actor who entered and approved the correction.

That future flow requires Clerk capability enforcement, a Django-side durable
request/approval record, a dedicated service-role RPC, a reason, before/after
payloads for edits, and immutable audit linkage. `capture_source` alone is not
an approval audit.

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
8. **No historical EA write:** web-source clock-in/session RPC admission rejects
   a historical Johannesburg day even if a modified client sends one. Exact
   receipt resolution occurs first, so an already committed command can still
   be acknowledged after midnight without admitting a new historical write.
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
15. **Clock sweep scope:** v1 server auto-close touches only
    `capture_source = 'web'`. Changing mobile-created payroll records is a
    separate decision.
16. **No false rollout claims:** local tests, disposable PostgreSQL, hosted
    migration, Vercel deployment, device loading, real-EA use, and no-recurrence
    evidence are separate gates.

## 6. Measured repository foundations

Revalidate these immediately before implementation because the mobile app is
actively changing.

### Mobile app and Supabase source

Repository: `/Users/jimmckeown/Development/zazi-izandi-app`

Verified on 2026-08-20 at local branch `fix/bugs-009-017`, commit `39b864d`:

- `src/utils/activeSessionState.js` builds the session row and attendee array,
  then applies Letter Tracker mutations separately.
- `src/utils/sessionCaptureValidator.js` requires at least one present child and
  letters or a blend category according to group level.
- `src/db/repositories/sessionsRepository.js` defines the exact session and
  attendee wire columns and stable-attendee-ID requirement.
- `src/services/syncProtocolV2TimeEntryRpc.js` targets
  `apply_mobile_time_entry_mutation`.
- `src/services/syncProtocolV2SessionBundleRpc.js` targets
  `apply_mobile_session_bundle_mutation`; an in-flight successor RPC exists on
  the reviewed branch and must be reconciled before this plan replaces a body.
- `src/services/syncProtocolV2LetterMasteryRpc.js` targets
  `apply_mobile_letter_mastery_mutation` with exact-key payload validation.
- `supabase/migrations/20260729200000_wave2b_sync_timestamp_contract.sql`
  contains the canonical protocol-v2 receipt/head model and the three relevant
  RPC families.
- `supabase/migrations/20260818120000_time_entry_insert_upsert.sql` is the latest
  reviewed time-entry body in this checkout.
- RLS permits actor-owned capture rows, but protocol-v2 RPCs are the current
  canonical production transport and give the web client the idempotency it
  needs.
- `capture_source` does not exist in the migration chain today.

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

`/Users/jimmckeown/Development/zazi-izandi-web` does not exist yet. Do not
silently place the app inside this planning repository.

## 7. Architecture

```text
EA browser
  └─ Zazi iZandi Web (Next.js, Vercel)
      ├─ public anon key only
      ├─ Supabase email/password session
      ├─ actor-scoped local draft + exact command journal
      └─ direct authenticated RPC calls
           │
           ▼
Supabase operational store
  ├─ web_capture_bootstrap_v1()          read model
  ├─ apply_mobile_time_entry_mutation()  canonical v2 receipt/head path
  ├─ apply_mobile_session_bundle_mutation() canonical v2 bundle path
  ├─ apply_mobile_letter_mastery_mutation() canonical v2 mastery path
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

All Supabase-specific calls stay behind `lib/supabase`, `lib/data`, and
`lib/capture` adapters. React components consume typed domain results and never
call `.from()`/`.rpc()` directly. This keeps the January-2027 data-residency
risk bounded to a transport/data layer instead of spreading Supabase throughout
the UI; it does not pretend that a future store migration would be free.

## 8. Supabase contract changes

### 8.1 Provenance columns

Add to the two operational event tables identified in the design decision:

```sql
capture_source text NOT NULL DEFAULT 'mobile'
  CHECK (capture_source IN ('mobile', 'web'))
```

Tables:

- `public.time_entries`;
- `public.sessions`.

`session_attendees` derives source through `session_id`; do not duplicate it.
Do not overload `letter_mastery.source`, whose values describe pedagogical
origin such as `taught` or `assessment`, not capture client. Also do not add a
misleading scalar source to `letter_mastery`: the natural-key row is mutable, so
a web archive/restore of an existing mobile-created row would make "source"
ambiguous. Field v1 keeps the existing mastery RPC unchanged; a future need for
mastery-level provenance requires an audit history, not last-writer metadata.

`capture_source` is creator provenance and is immutable after insert. Closing a
mobile-created time entry from web does not relabel it as web, and closing a
web-created entry from mobile does not relabel it as mobile.

Enforce immutability at the table boundary with a narrowly scoped `BEFORE
UPDATE` trigger on both tables; RPC carefulness alone is insufficient because
authenticated legacy DML and service-role tools also exist. Test ordinary
authenticated, protocol RPC, and service-role update attempts. A future
correction records a new audit actor/action; it never rewrites creator source.

The migration verification/runbook includes bounded read-only counts by source
and date for the pilot. Adding source filters/columns to the existing PM
reporting APIs and UI is useful follow-up work, not a field-v1 capture blocker.

RPC compatibility rules:

- old insert payload without the key stores the table default `mobile`;
- web insert payload must carry `web`;
- update payload may omit the key, in which case the stored value is preserved;
- if update payload carries the key, it must equal the stored value; and
- no update can change creator provenance.

Existing rows and old clients resolve to `mobile`. The authenticated RPCs must
admit the optional new key for new clients while preserving the exact old wire
shape for installed mobile versions. RPC responses must remain backward
compatible; do not add fields to a result if a strict current client rejects
them.

### 8.2 Web-source admission

When `capture_source = 'web'`:

- a time-entry insert requires `sign_in_time` on the current Johannesburg day
  and within the agreed live-clock skew window around server time;
- coordinates are a complete pair or null;
- a session requires `session_date`, `started_at`, and `ended_at` on the current
  Johannesburg day;
- `started_at <= ended_at <= server now`;
- the group/attendees pass the existing actor and roster authorization;
- one EA-owned time entry covers the full session interval; and
- no payload field may request a historical mode.

For exact replay, receipt lookup and matching-success return happen before the
web live-day check. Only a command with no accepted matching receipt reaches
date admission and DML. This ordering is what lets a post-midnight client
resolve a lost same-day response without opening a historical-create path.

Mobile-source behavior, including the existing mobile backfill capability,
must remain unchanged.

The exact clock-skew tolerance is a build-time constant, not an environment
variable. Start with **15 minutes in the past and 5 minutes in the future** for
clock-in admission, then test on the field device matrix. This tolerance handles
ordinary low-end-phone clock drift without turning the RPC into a backfill path.

### 8.3 Bootstrap read model

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

Implement it as `SECURITY INVOKER` unless live-code proof shows that an explicit
definer is required. In either case, schema-qualify every object, set a fixed
empty search path, accept no actor argument, revoke from `PUBLIC`/`anon`, grant
only to `authenticated`, and test the actual non-owner authenticated role.

### 8.4 Web-only stale-clock RPC

Add `public.close_stale_web_time_entries_v1()`:

- executable only by `service_role`, not `authenticated`, `anon`, or `PUBLIC`;
- fixed rule: open `capture_source = 'web'` entries older than ten hours;
- sets `sign_out_time = sign_in_time + interval '10 hours'`, null sign-out
  coordinates, and `auto_clocked_out = true`;
- returns only a count and bounded IDs suitable for operations, not child data;
- idempotent on repeated runs; and
- cannot update mobile-source entries.

### 8.5 Migration collision rule

The app checkout currently contains active work around
`20260819140000_session_capture_flag_v1.sql`, including a private session core
and successor public RPC. Before authoring the web migration:

1. Rebase on the latest merged app `main`.
2. Read the hosted/live migration state.
3. Read the exact current `pg_proc` source/digest with the repository's approved
   read-only path.
4. Extend the current reviewed body/core; never copy the older July body over a
   newer August fix.
5. Add an apply-time digest/preflight so drift aborts the transaction.
6. Rerun the combined disposable-PostgreSQL harness.

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

Do not store names, email addresses, participant identifiers, or full bootstrap
responses. Persist IDs, statuses, instructional selections, exact wire payloads,
and submission metadata only. Rehydrate display names from a fresh authenticated
bootstrap.

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
       ├─ matching accepted receipt → session_confirmed
       └─ no accepted receipt       → manager_review_required

After an already confirmed session:
  mastery_pending → retryable until accepted or explicitly dispositioned

Integrity response:
  any nonterminal → integrity_fault
```

Nuance: after `session_confirmed`, Letter Tracker mutations may continue after
day rollover because they complete an already accepted live session; the UI
must not create a new session. A day-expired command whose session bundle was
never confirmed may resend the identical envelope only to resolve the existing
receipt. Receipt-first server ordering guarantees that a missing receipt reaches
the historical-write rejection instead of DML.

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
- `/support` — static troubleshooting and manager-contact instructions; no PII.

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
4. Materialize a protocol-v2 time-entry insert with `capture_source = 'web'`.
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
Johannesburg date. Show time, capture source, and recorded teaching fields so the
EA can recognize it. Two legitimate sessions for one group in a day remain
possible.

### 10.6 Day-expired unresolved work

If the server date advances before the session bundle is confirmed:

- stop automatic retries;
- make one exact receipt-resolution replay that cannot pass historical DML
  admission without a pre-existing matching success receipt;
- if that resolves to success, continue only the remaining mastery operations;
- retain the local evidence under the same actor;
- show `Manager review required` only when no accepted session receipt exists;
- show a support/reference code and a read-only summary;
- do not expose a date editor or "submit anyway" button; and
- do not claim the data reached Supabase.

Until the separate manager-correction product exists, the operational fallback
is paper plus manager escalation. No one should patch production rows ad hoc
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
- the manager/support owner and data-bundle status are recorded.

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
- support/line-manager owner.

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

- migration preflight and postflight;
- old mobile payloads still succeed and default to `mobile`;
- web payloads stamp `web`;
- web historical clock/session payloads are rejected;
- mobile historical session behavior remains unchanged;
- web session requires covering time entry;
- auth actor mismatch fails closed;
- unauthorized group/child fails without an oracle leak;
- session plus attendees is atomic;
- exact replay succeeds;
- mutation/payload reuse mismatch rejects;
- optional GPS pair rules;
- bootstrap set/count parity and boundedness;
- stale-clock function touches web only; and
- all grants/revokes are exact.

### 12.3 Real SQLite mobile compatibility

In the mobile app integration harness:

1. Insert web-source time/session/attendee/mastery rows through the authenticated
   PostgreSQL contract.
2. Pull them through the real mobile repository path into real SQLite.
3. Close/reopen the SQLite database.
4. Assert session history/detail, attendance, teaching fields, reading levels,
   and Letter Tracker render from the pulled rows.
5. Assert no web row becomes a pending local mutation merely because the mobile
   client does not store `capture_source` locally.

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
- day rollover to manager review;
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

- Existing branch: `plan/web-capture-field-v1`.
- Artifact: this file only, plus any later approved architecture documentation.
- Do not implement the new app here.

### Mobile/Supabase repository

- Fresh isolated worktree and branch from current merged `main`:
  `feat/web-capture-contract-v1`.
- Owns migration, verification SQL, PostgreSQL harness, RPC serializer contract
  tests, and mobile pull compatibility.
- Must not disturb active bug-fix worktrees.

### New web repository

- Repository: `zazi-izandi-web`.
- Main feature branch: `feat/field-capture-v1`.
- Owns browser UI, auth, command journal, protocol adapters, E2E, and rollout
  docs.

### Django repository

- Fresh isolated worktree and branch from current merged `main`:
  `feat/web-capture-clock-sweeper-v1`.
- Owns only the bounded service-role RPC client call and management command.
- No capture POST endpoint and no general session writer in this plan.

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

- [ ] Fetch all three existing repositories and record local/remote `main` SHAs.
- [ ] Confirm which August session-capture migration and RPC mapping are merged.
- [ ] Read the hosted migration list and exact relevant `pg_proc` bodies through
      the approved read-only path; record digests without credentials.
- [ ] Confirm production protocol-v2 authorization and current fleet transport.
- [ ] Confirm `capture_source` is absent and count current rows/open-clock
      anomalies read-only.
- [ ] Confirm no sibling `zazi-izandi-web` repository exists or reconcile if it
      appeared after this plan.
- [ ] Record exact shared-module upstream SHA and test files.
- [ ] Commit the snapshot on `feat/web-capture-contract-v1`.

**Stop condition:** If production/client transport differs from this plan, revise
the plan before writing SQL. Do not make the plan true by overwriting live code.

### Task 1 — Write the Supabase contract RED harness

**App-repo files:**

- Create: `scripts/web-capture-v1-postgres-harness.cjs`.
- Create: `supabase/verification/web-capture-v1-post-apply-verification.sql`.
- Modify: `package.json` with `verify:web-capture:postgres`.

**RED cases:**

- [ ] `capture_source` columns and constraints are missing.
- [ ] Old mobile payload fixtures are accepted unchanged after the future
      migration.
- [ ] Web payloads stamp provenance.
- [ ] Historical web clock/session payloads reject while mobile backfill fixture
      behavior remains unchanged.
- [ ] Covering-time-entry validation.
- [ ] Session-family transaction rollback on bad attendee.
- [ ] Receipt replay and mutation reuse mismatch.
- [ ] Bootstrap shape, actor scoping, ordering, and readiness codes.
- [ ] Stale-clock RPC grant/scope/idempotency.

Run:

```bash
npm run verify:web-capture:postgres
```

Expected: **FAIL** for the missing migration/RPC surface, not because the harness
cannot start PostgreSQL.

Commit the executable RED harness before implementation.

### Task 2 — Implement provenance, RPC admission, bootstrap, and sweep SQL

**App-repo files:**

- Create: `supabase/migrations/<timestamp>_web_capture_v1.sql`.
- Modify only the exact generator/source files required by the current August
  RPC lineage; do not hand-maintain two divergent giant bodies.
- Update: `supabase/verification/web-capture-v1-post-apply-verification.sql`.

**Steps:**

- [ ] Add constrained, non-null provenance columns with mobile default.
- [ ] Add and verify table-level creator-provenance immutability triggers.
- [ ] Extend time-entry/session payload admission compatibly; keep standalone
      Letter Tracker payload and server semantics unchanged.
- [ ] Add web-only live-day, clock-skew, and clock-coverage rules.
- [ ] Preserve receipt-first replay ordering, then reject an unaccepted
      historical web command before DML.
- [ ] Add `web_capture_bootstrap_v1()`.
- [ ] Add `close_stale_web_time_entries_v1()` with service-role-only execute.
- [ ] Preserve old response envelopes and grants.
- [ ] Add drift/apply-time digests and rollback-safe pre/postflight assertions.
- [ ] Run the focused PostgreSQL harness to GREEN.
- [ ] Run the combined disposable-PostgreSQL release harness.
- [ ] Run migration lint/static verification and `git diff --check`.
- [ ] Adversarially review auth, exact-key admission, replay, RLS bypass, search
      path, lock ordering, and old-client compatibility.
- [ ] Commit.

No hosted apply occurs in this task.

### Task 3 — Add client serializer and mobile compatibility RED/GREEN

**App-repo files:**

- Modify: `src/services/syncProtocolV2TimeEntryRpc.js` only if the canonical
  shared projection needs optional provenance support.
- Modify: `src/services/syncProtocolV2SessionBundleRpc.js` only if required by
  the reconciled current RPC.
- Read/reference unchanged: `src/services/syncProtocolV2LetterMasteryRpc.js`;
  web must use its existing exact standalone mastery shape.
- Create: `src/services/webCaptureV1Contract.js` for pure, browser-copyable
  time-entry, session-bundle, and mastery command projection; it must not import
  React Native, Expo, or SQLite.
- Create: `__tests__/webCaptureV1Contract.test.js`.
- Create: `__tests__/webCaptureServerRows.integration.test.js`.

**RED/GREEN:**

- [ ] Start with fixtures proving exact old/new payload shapes and lowercase
      canonical identities.
- [ ] Implement the smallest pure contract module needed by web.
- [ ] Insert web-shaped rows through disposable PostgreSQL.
- [ ] Pull through real SQLite, force close/reopen, and assert domain reads.
- [ ] Assert web provenance is ignored safely by installed mobile local schemas.
- [ ] Assert no pulled row becomes pending local work.
- [ ] Run focused Jest, `npm test`, `npm run test:integration`, and the web
      PostgreSQL harness.
- [ ] Commit.

### Task 4 — Scaffold the separate web repository

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

**Scripts:**

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit --incremental false",
  "test": "tsx --test lib/*/*.test.ts shared/*/*.test.ts",
  "test:e2e": "playwright test",
  "verify": "npm run test && npm run typecheck && npm run lint && npm run build"
}
```

**RED/GREEN:**

- [ ] First CI run fails for a missing branded shell test/fixture.
- [ ] Implement scaffold and security headers.
- [ ] Add a strict content security policy compatible with Supabase only; no
      arbitrary third-party scripts.
- [ ] Add responsive 320px shell smoke E2E.
- [ ] Run `npm run verify` and `npm run test:e2e`.
- [ ] Commit.

### Task 5 — Pin and guard the shared mobile core

**New-repo files:**

- Create: `shared/zz-core/src/utils/activeSessionState.js`.
- Create: `shared/zz-core/src/utils/sessionCaptureValidator.js`.
- Create: `shared/zz-core/src/utils/localDate.js`.
- Create: required `shared/zz-core/src/constants/egraConstants.js` and literacy
  constants actually imported by the selected flow. Preserve the upstream
  `src/utils` ↔ `src/constants` relative layout so imports work unchanged.
- Create: `shared/zz-protocol/src/services/webCaptureV1Contract.js`, copied from
  the app contract task and included in the same pinned allowlist/checksum
  guard. Any platform-neutral dependency it imports is also explicit in the
  allowlist and keeps its upstream relative path.
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
- recent history preserves web/mobile source; and
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
- day rollover permits one exact receipt-resolution replay;
- a matching pre-existing receipt resolves after rollover;
- a missing receipt reaches historical-write rejection without DML;
- confirmed-session mastery completion can continue;
- malformed/tampered local commands fail closed;
- PII display fields never persist; and
- second tab cannot dispatch.

Use actual RPC response vocabulary fixtures from the app repo. Do not infer
success from HTTP 200; protocol JSON `{kind, code}` is authoritative. Run suites
and commit.

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
- historical/tampered sign-in rejected by real PostgreSQL.

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
- day rollover receipt-resolution success and manager-review branches;
- duplicate warning without blocking; and
- mobile pull/render integration for resulting rows.

Run copied core tests, web unit suite, browser E2E, disposable PostgreSQL, and
mobile real-SQLite compatibility; commit.

### Task 11 — Add diagnostics, support, and expired-evidence handling

**New-repo files:**

- Create: `lib/diagnostics/event-ring.ts` and tests.
- Create: `components/field/manager-review-required.tsx`.
- Create: `documentation/field-support-runbook.md`.
- Create: `documentation/rollout-checklist.md`.
- Create: `documentation/privacy-and-local-storage.md`.
- Add WhatsApp-ready login/support copy.

Server-derived v1 observability comes from constrained `capture_source`, mobile
protocol receipts, web stale-clock counts, and ordinary Vercel request/deploy
health. The browser also keeps a bounded, actor-scoped, PII-free local diagnostic
ring containing event classes such as bootstrap failure code, draft recovered,
command materialized, retry count, receipt success, integrity fault,
manager-review-required, and full completion duration. It stores no child
names/IDs, notes, teaching selections, auth tokens, or raw RPC payloads. The
support UI can render a redacted copy for the EA/manager to share deliberately.

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
- exact RPC and no arbitrary table/update method;
- service-role secret never appears in output;
- zero rows is success;
- web rows close; mobile rows cannot;
- malformed response fails closed;
- timeout/non-2xx exits nonzero; and
- rerun is idempotent.

Run focused Django tests, relevant mobile API/service tests, `manage.py check`,
and commit. Configure the hosted Render cron only after Supabase migration
deployment and explicit release authorization.

### Task 13 — Adversarial review and full local release gate

Across all implementation branches:

- [ ] Review auth actor equality and service-role absence.
- [ ] Review every exact-key serializer against current SQL.
- [ ] Review timestamp ordering, Johannesburg day rules, clock coverage, and
      midnight behavior.
- [ ] Review receipt/head ordering and same/different-payload replay.
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
- Do not drop provenance columns or accepted rows as an incident reflex.
- Preserve receipts and local evidence.
- Roll forward RPC defects when accepted production data exists; destructive
  schema reversal requires its own reviewed plan.

## 15. Release acceptance criteria

Field v1 is ready for the controlled cohort only when all are true:

- [ ] Operations readiness manifest is complete for each pilot EA.
- [ ] EA-token bootstrap readback returns expected roster/group counts.
- [ ] No service-role secret exists in web source, bundle, environment, logs, or
      Vercel client configuration.
- [ ] Old mobile payload compatibility is proven in disposable PostgreSQL.
- [ ] Web-source historical payloads are server-rejected.
- [ ] Exact response-loss replay creates one time entry/session only.
- [ ] Session-attendee family is atomic.
- [ ] Letter Tracker partial/retry states are honest and recoverable.
- [ ] Real SQLite pull/close/reopen renders web rows.
- [ ] Huawei and low-storage Samsung complete the full flow.
- [ ] At least three real EAs complete a controlled school day.
- [ ] No Critical/Important adversarial finding remains.
- [ ] Support and paper fallback instructions are distributed.
- [ ] Hosted migration, Vercel deployment, phone loading, and field use each have
      a separate receipt.

## 16. Deferred work and decision gates

### 16.1 Approved manager correction/backfill

Write a separate plan after field v1 is stable, or sooner if real expired
commands make it operationally urgent.

Expected architecture:

```text
Clerk staff site /mobile-app/corrections
  → Next djangoFetch (Clerk bearer + internal secret)
  → Django capability mobile.capture.approved_backfill
  → durable correction request + approver actor + reason + payload hash
  → dedicated service-role Supabase RPC
  → EA-owned operational rows + immutable audit linkage
```

Required future decisions:

- which roles count as line manager;
- whether requester and approver may be the same person;
- permitted historical window;
- create-only versus edits/deletes;
- required evidence/reason;
- payroll/RCT review flags;
- capture-source vocabulary (`staff_portal`) and approval linkage; and
- how expired local command evidence is safely transferred to the manager.

Do not implement this as Supabase impersonation or by giving managers EA
credentials.

### 16.2 Offline/PWA v2

Trigger a separate plan after at least two school weeks of online-first evidence
or earlier if cold-start/no-signal failures materially block capture despite
data provision.

Measure:

- cold-start failures;
- drafts recovered;
- retry rates and time-to-confirm;
- commands expiring into manager review;
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

An internal online-first pilot within roughly two weeks is plausible if:

- roster/groups are provisioned outside the web client;
- the current mobile protocol RPCs can be compatibly extended;
- full session UI reuses pinned domain logic;
- PWA/offline, assessments, and manager correction remain out; and
- testers/devices are available continuously.

That is a target, not a guarantee. A code-complete happy path is not a field-safe
release. Any failure in idempotency, actor isolation, row compatibility,
historical-write enforcement, or low-end-device usability blocks rollout even
if the calendar target is missed.

## 18. Final closure statement

Field v1 is an **install-free, online-first live capture instrument with durable
same-day delivery**, not a second offline mobile app. It succeeds when an EA who
cannot use the Expo app can clock in, conduct and record a complete session,
confirm the authoritative record, and later see that same work in the mobile
universe—without backfill, duplication, hidden partial failure, or a new data
silo.
