# Zazi iZandi Web — Lean Field v1 Implementation Plan

> **Status:** Governing implementation plan. Jim selected the lean transport on
> 2026-08-20 after protocol-v2 adversarial review. The earlier wrapper/sidecar
> plan is retained only as v2 research and is not an executable task list.
>
> **Primary outcome:** An EA who cannot install or reliably run the Expo app can
> open a link, sign in with the same Supabase account, clock in/out, and record a
> complete live teaching session into the existing operational data universe.
>
> **Safety outcome:** Field v1 makes zero functional change to the installed
> mobile app and zero write-side change to the battle-tested protocol-v2 engine.
> The browser uses the exact existing time-entry and session write RPCs and
> envelopes through fixed, typed adapters. No Letter Mastery writer, provenance
> tag, writer wrapper, stale-clock sweep, Django
> write cron, service-role browser credential, PWA, or historical-entry flow is
> part of v1.

## 1. Version sequence

The product sequence is now explicit:

| Version | Product promise | Server/data boundary |
|---|---|---|
| **v1 — lean field capture** | Install-free, online-first live clock and complete session/attendance/activity capture with durable exact retry | Unchanged time-entry/session protocol-v2 writers plus one bounded actor-scoped read-only bootstrap/resolution RPC |
| **v2 — fuller web lane** | Add only the server-side browser safeguards, evidence, and operational automation that v1 field data proves valuable | Separately reviewed wrappers/attestation/locking or an all-writer policy; still no silent edits to v2 envelopes |
| **v3 — offline PWA** | Cold-start offline roster, durable offline work, visible outbox, reconnect and convergence | Versioned IndexedDB/outbox and service-worker lifecycle built on the stabilized web transport |

Historical entry is a separate product decision. It may become a v1.x or v2
slice if real expired work makes it urgent, but it is not implied by this
version numbering and is not in field v1.

## 2. Why lean v1 is the correct boundary

The immediate field problem is distribution and device reliability: Play Store
eligibility, Huawei devices, storage pressure, and mobile-app defects. A browser
link avoids an install while Masi can provide roster/group data operationally
during the first month or two.

The existing protocol-v2 engine already provides the difficult write
properties the browser needs: actor checks, atomic session families, stable
mutation identity, receipts, generation/head rules, replay, and integration
with the operational store. Reusing that contract has a smaller blast radius
than surrounding it with new writer wrappers, ledgers, locks, seed/backup
changes, and an out-of-band clock sweeper.

The deciding mental model is **protocol reuse, not protocol modification**. The
browser is another client of the existing public contract. It is not a new sync
engine and does not own SQLite, mobile pull/reconcile, background sync, or Expo
infrastructure.

The lean choice gives up three things in v1:

1. Web-specific rules are supported-UI preconditions, not database-wide
   invariants. A browser bug or second device can attempt a command the UI meant
   to prevent.
2. There is no reliable database label saying a row came from web. Existing
   mobile receipts prove command identity and result, not client software.
3. Forgotten clock-outs are handled visibly and operationally, not by an
   automatic database job.

Those losses are proportionate for a controlled first cohort. The fuller lane
does not make browser origin globally unbypassable either, because web and
mobile use the same `authenticated` Supabase authority and the original mobile
RPCs remain available.

## 3. Locked product decisions

| # | Area | Lean field-v1 decision |
|---|---|---|
| 1 | Product name | **Zazi iZandi Web** |
| 2 | Repository | Local sibling `/Users/jimmckeown/Development/zazi-izandi-web`; separate remote/project when explicitly created |
| 3 | Production domain | `app.zazi-izandi.co.za` |
| 4 | Hosting | Separate Vercel project; no coupling to the public/PM website release |
| 5 | Audience | EAs; launch begins with a controlled cohort, not all EAs at once |
| 6 | Authentication | Supabase email/password using the same account as mobile; Clerk remains unchanged elsewhere |
| 7 | Authorization | Supabase JWT plus existing RPC/RLS checks; UI never supplies a selectable actor |
| 8 | Write destination | Existing `time_entries`, `sessions`, and `session_attendees` operational tables; no v1 Letter Mastery write |
| 9 | Write transport | Exact unchanged time-entry and session RPCs behind two fixed typed browser adapter methods |
| 10 | Read transport | One new bounded read-only `web_capture_bootstrap_v1` RPC supplies readiness and exact ambiguity resolution; there is no second resolver |
| 11 | Django | No interactive capture path and no stale-clock command/cron in v1 |
| 12 | Session scope | Complete session, attendance, activity, reading-level, and notes record; all Letter Mastery writes, paper assessments, and grouping remain outside v1 |
| 13 | Timer | Simple elapsed display; no pause/resume or background-timer promise |
| 14 | Geolocation | Attempt for clocks; denial/unavailability/timeout does not block; coordinates are a complete valid pair or both null |
| 15 | Historical entry | No date picker or historical writer in v1; preserve expired evidence for support |
| 16 | Retry | Exact same command/UUID/envelope is persisted before I/O and reused after ambiguous failure |
| 17 | Provisioning | Account, class, roster, and groups are provisioned and read back before an EA receives the link |
| 18 | Offline | No service worker, cached roster promise, background sync, or cold-start-offline claim |
| 19 | Provenance | No source column, sidecar, badge, source filter, or automated source-based policy in v1 |
| 20 | Pilot concurrency | One active capture browser/device per pilot EA; same-browser tabs are fenced locally |
| 21 | Field proof | Huawei and low-storage Android plus a controlled real-EA school day; staff-only testing is not field proof |

## 4. Guarantees and honest non-guarantees

### 4.1 What v1 guarantees on the supported path

- The authenticated actor is the EA whose existing Supabase session is used.
- Every write is sent to one of two compile-time-fixed RPC names.
- The outgoing payload shape matches the pinned mobile v2 contract exactly.
- A command is materialized and durably stored before its first network call.
- A timeout/lost response never causes new record IDs or a new mutation ID.
- A session and attendance family use the existing atomic bundle writer.
- The UI never implies that a session save updated Letter Mastery.
- Capture controls stay unavailable until provisioning/readiness is proven.
- No browser bundle contains a service-role or Django internal secret.
- No mobile production source, SQLite schema, RPC mapping, serializer, or
  acknowledgement vocabulary changes for this feature.

### 4.2 What v1 does not guarantee

- The JWT proves the EA, not that the caller is the supported browser build.
- UI-only current-day, clock-coverage, and one-device rules are not global
  database security invariants.
- Absence of a web marker cannot classify a row as mobile; v1 creates no marker.
- Two distinct devices can create distinct UUIDs. Existing idempotency prevents
  replay of one command, not every semantically duplicate command.
- A stale browser clock is not automatically corrected.
- A fresh cold start without network is not supported.
- A command still unresolved after Johannesburg date rollover is not silently
  submitted as live work.

## 5. Protocol-v2 compatibility freeze

The contract snapshot is maintained in the mobile/Supabase repository at
`documentation/plans/2026-08-20-web-capture-contract-snapshot.md`. It records
the hosted/local preflight and exact function digests.

The following five functions are release-blocking frozen interfaces:

1. `public.apply_mobile_time_entry_mutation`
2. `private.apply_mobile_session_bundle_mutation_core`
3. `public.apply_mobile_session_bundle_mutation`
4. `public.apply_mobile_session_bundle_mutation_capture_flag_v1`
5. `public.apply_mobile_letter_mastery_mutation`

The browser calls only public functions 1 and 3. Functions 4 and 5 remain
frozen upstream compatibility evidence but are not browser-v1 capabilities.
Function 4 remains frozen even though the installed mobile mapping intentionally
still targets function 3. The private core remains frozen because both public
session functions depend on it.

Also frozen:

- exact time-entry, session-root, attendee, and mastery payload key sets;
- RPC argument names and types;
- canonical record keys and normalized hash documents;
- hash/contract versions and receipt/head ordering;
- exact canonical result envelopes and `{kind, code}` classifications;
- serializer normalization and timestamp rules;
- installed mobile RPC mapping and acknowledgement inventory;
- SQLite schemas, pull mappings, repositories, and reconciliation behavior;
- function signatures, owners, configuration, effective grants, and bodies.

Adding a database column later is not categorically forbidden. The unsafe action
is changing the historical meaning/hash grammar of an already receipted v2
request. A genuinely client-supplied field requires a separately versioned
successor contract; pending v2 commands must remain v2 forever.

## 6. Lean architecture

```text
EA browser
  └─ Zazi iZandi Web (Next.js)
      ├─ public Supabase URL + anon key only
      ├─ Supabase email/password session
      ├─ actor-scoped IndexedDB draft + exact command journal
      ├─ same-browser capture lease
      ├─ bounded actor-scoped read adapter
      └─ two fixed write methods
           ├─ submitTimeEntry()
           │    └─ apply_mobile_time_entry_mutation()       UNCHANGED
           └─ submitSessionBundle()
                └─ apply_mobile_session_bundle_mutation()   UNCHANGED
                       │
                       ▼
Supabase operational store and existing protocol-v2 receipts/heads
  ├─ existing mobile pull/reconcile → real SQLite
  └─ existing reporting surfaces → Django/PM site
```

React components never receive an RPC name and never call `.rpc()` or `.from()`
directly. Supabase details stay behind `lib/supabase`, read models behind
`lib/data`, and mutation materialization/state behind `lib/capture`.

There is no generic `rpc(name, args)` method exported from the capture adapter.
The two v1 RPC constants are module-private. Each method accepts one exact typed
command, serializes one exact argument object, applies a finite timeout, and
strictly decodes the result. HTTP 2xx alone is never treated as protocol
success.

The only accepted result pairs are pinned explicitly:

| Descriptor | Accepted result |
|---|---|
| `TIME_ENTRIES` | `{kind: "success", code: "accepted"}` |
| `SESSIONS` | `{kind: "success", code: "accepted"}` |
| `LETTER_MASTERY` | `{kind: "success", code: "mastery_recorded"}` — frozen upstream evidence only; not a v1 browser capability |

Receipt existence, `stale_generation`, `protocol_violation`, `needs_parent`,
an unknown pair, or a malformed body is not success. The adapter returns a
typed classification; React never interprets raw response JSON.

The existing RPCs support more operations than lean v1 exposes. The fixed web
adapter rejects outside the narrower product allowlist before network I/O:

| Descriptor | Lean-v1 operations |
|---|---|
| `TIME_ENTRIES` | `insert`, `update` (update only for the locally marked accepted web clock) |
| `SESSIONS` | `insert` only |
| `LETTER_MASTERY` | none |

The upstream contract snapshot may retain fixtures for other installed-mobile
operations, but those do not become browser capabilities by being documented.
The unchanged mastery writer uses a natural-key upsert even when the protocol
operation says `insert`, so a browser pre-read cannot guarantee an additive-only
write across client streams. Mastery waits for a server-enforced conditional
v2 capability.

## 7. Single read-only bootstrap/resolution contract

The current mobile source has no browser-safe coherent read contract. Lean v1
therefore adds exactly one read-only RPC, `web_capture_bootstrap_v1`. It is the
only Supabase migration/function addition permitted in v1. It combines the
readiness snapshot with optional exact receipt resolution so rollover never
creates pressure for a second helper.

Before capture is enabled, the authenticated EA must receive one coherent,
bounded readiness snapshot containing only the teaching data v1 needs:

- server timestamp and Johannesburg date;
- authenticated actor ID;
- active class/group identifiers and display names;
- roster member IDs, first names, group membership, and required teaching
  fields;
- every current open time entry for that actor, with deterministic order and no
  `LIMIT 1` masking of duplicates;
- the exact actor-owned wire fields/record identity needed to close a visible
  entry that this browser journal previously clocked in and the row's
  `server_updated_at` freshness signal;
- bounded recent time-entry/session roots needed for duplicate warnings; and
- an explicit schema version and truncation/count metadata.

The snapshot must not include surnames, dates of birth, TeamPact
`participant_id` values, contact details, or unrestricted historical data. The
opaque operational `child_id` UUIDs required for actor-scoped selection and
exact protocol commands are a separate permitted identifier class.

The single function accepts one optional argument:

```text
p_resolution_requests jsonb DEFAULT '[]'::jsonb
```

The array contains at most 20 exact-key objects, each with:

```text
schema_version          1
descriptor_key          TIME_ENTRIES | SESSIONS
mutation_id             lowercase UUID
client_stream_id        lowercase UUID
canonical_record_key    bounded exact string
client_generation       positive safe integer
operation               descriptor-supported operation
audit_sequence          positive safe integer
```

Duplicate requests, extra/missing keys, malformed values, oversized strings,
or more than 20 items fail closed. The actor is never an argument.

The versioned response returns readiness plus exactly one resolution item in
input order for every request:

```text
{request_index, state: "resolved", canonical_result}
{request_index, state: "not_found"}
```

`resolved` requires an exact completed actor-owned receipt match across the
submitted identity tuple. Its stored canonical result is then passed through
the same strict browser result classifier as a write response. Receipt
existence is not itself success. Wrong actor, absence, or any identity mismatch
returns the same `not_found` shape. The ordinary recent-history bounds never
truncate or substitute for the per-request resolution list.

Every invocation is a fresh authenticated POST and is treated as `no-store` by
the web data adapter. The function is `SECURITY DEFINER` only because exact
resolution reads private protocol receipts. It must derive `auth.uid()`,
schema-qualify all objects, set a safe search path, accept no caller-selected
actor, use no dynamic SQL, perform no DML, call no writer, cap every collection,
and fail closed on malformed shape/counts. Only its exact signature receives
`authenticated` execute; no existing writer/table/RLS grant changes.

Capture is blocked when any of these are true:

- authentication is absent/expired;
- actor ID mismatches the local namespace;
- no provisioned class/roster/group is visible;
- membership references are orphaned or ambiguous;
- more than one open clock exists;
- snapshot version/count/truncation semantics are invalid; or
- durable local persistence is unavailable.

Provisioning is an operational release prerequisite, not a UI feature. The
first cohort receives the link only after a manifest and EA-token readback prove
the expected roster/group counts.

## 8. Browser persistence and command model

### 8.1 Storage boundary

Use IndexedDB through a narrow, versioned adapter. The app is still online-first:
IndexedDB protects a loaded workflow and ambiguous request, not offline roster
operation.

All records are keyed by authenticated actor UUID and schema version. Persist:

- the minimum learner-linked draft state required to resume the loaded flow;
- exact materialized command envelopes and operation order;
- immutable UUIDs, mutation IDs, stream IDs, generations, and audit sequences;
- submission status, retry count, timestamps, and expected result class; and
- a bounded PII-free diagnostic ring.

#### Journal data classification

The exact retry journal is **temporary learner-linked operational data**, not a
PII-free store. Its permitted fields are narrowly enumerated:

| Command | Permitted persisted learner-linked fields |
|---|---|
| Time entry | Actor UUID, time-entry UUID, exact clock timestamps/GPS/nulls and protocol identity |
| Session bundle | Group UUID, child UUIDs, stable attendee UUIDs, attendance, reading-level snapshots, teaching selections, notes, exact root/member payloads and protocol identity |

These opaque UUIDs and learning facts are permitted only because byte-exact
retry is impossible without them. TeamPact `participant_id`, learner/staff
names, dates of birth, email/contact details, full roster/bootstrap responses,
auth/access/refresh tokens, and raw server responses are forbidden.

The diagnostic ring is a different data class and remains PII-free: it contains
no actor/child/group/record UUID, notes, attendance, teaching selections, token,
raw payload, or raw response.

Retention is state-based:

- accepted `TIME_ENTRIES`: immediately purge the exact command payload,
  timestamp/GPS envelope, mutation ID, and raw result after strict accepted
  classification. Retain only the actor-scoped stream/audit counter, per-key
  generation counter, and a minimal local marker containing the accepted open
  entry ID; after accepted clock-out, clear that marker and per-key counter;
- accepted session: purge the exact command immediately after authoritative
  accepted classification;
- classified refusal with no accepted family: retain only while the EA corrects
  or deliberately dispositions the intent, then purge the refused envelope;
- ambiguous/integrity/historical-entry-required: retain exact evidence until a
  preservation-first support disposition; never expire or clear it silently;
  and
- confirmed sign-out may delete unresolved evidence only after a specific
  warning and explicit confirmation.

Task 6 tests must prove that no fields beyond the command-specific allowlists
enter IndexedDB. The UI warns against sensitive notes; browser storage is not
marketed as encrypted or as a secure vault.

The time-entry retention tests additionally prove that accepted clock-in and
clock-out GPS/timestamp envelopes disappear immediately, ambiguous entries keep
their exact envelopes until resolution/disposition, and an IndexedDB inspection
after acceptance contains no completed location payload. A later clock-out is
materialized from a fresh bootstrap row plus the minimal accepted-web-clock
marker and generation counter, never from a retained clock-in request.

On actor change, the new actor cannot enumerate, render, or dispatch another
actor's records. Sign-out with unresolved work requires an explicit warning;
support guidance preserves evidence before any deletion.

### 8.2 Command state machine

```text
draft
  → materialized
  → submitting_session
      ├─ ambiguous_same_day → retryable_same_day → submitting_session
      ├─ classified_refusal → correct_or_support
      ├─ integrity_fault    → support_only
      └─ accepted           → complete

At Johannesburg rollover before session confirmation:
  materialized | submitting_session | retryable_same_day
    → readback_pending
       ├─ exact resolved accepted receipt → complete
       └─ not provable → historical_entry_required
```

The only rollover mechanism is the optional resolution list inside a fresh
`web_capture_bootstrap_v1` call. There is no separate resolver, automatic replay,
or fallback writer. A `not_found` result preserves local evidence and moves to
`historical_entry_required`.

### 8.3 Materialization rule

Before the first network call, generate and persist every identity and exact
wire argument once. Every retry reloads the stored command. UI edits never
mutate an in-flight command. If nothing was accepted and the EA deliberately
edits, the old intent is dispositioned and a new command receives new identity.

The browser owns one durable stream UUID per actor/browser installation. Audit
sequence is monotonically allocated across that stream. Generation is allocated
per stream + descriptor + canonical record key, including the exact root/member
rules of a session family. The first intent for a key in a fresh stream starts
at the contract's initial generation; a later new intent for the same key
increments it. Retry never increments either counter. Stream, audit, generation,
and command persistence are one IndexedDB transaction so a crash cannot reuse a
counter for different work.

Losing the browser store does not permit reconstruction of an unresolved
command under a new stream. Preserve/read back authoritative actor-owned state
or route to support. A fresh stream may create new work only after readiness is
refreshed and no unresolved prior intent is being inferred from memory.

A completed receipt does not automatically mean success: it resolves ambiguity
to its stored canonical result. Only the descriptor-specific accepted
`{kind, code}` is success. Stale, rejected, integrity, or pre-receipt outcomes
retain their exact classification.

### 8.4 Same-browser concurrency

Only one capture surface may own the actor's local lease. A second tab is
read-only and explains where capture is active. The implementation uses a
tested browser lock/heartbeat boundary with takeover after a stale lease without
changing any command identity.

This does not coordinate different phones or browsers. The pilot operating rule
is one active capture device/browser per EA, with a fresh bootstrap before clock
or session materialization.

## 9. Live-day, clock, and session behavior

### 9.1 Time authority

All supported-UI day decisions use the server-provided Johannesburg timestamp,
never device locale or clock. There is no editable date/time field.

This is a UI safety rule, not a global database invariant in lean v1. Tests must
say that explicitly.

### 9.2 Clock flow

- Read the current actor-scoped open clock before enabling clock-in.
- Refresh the readiness/open-clock snapshot immediately before materializing a
  clock-in or session command; stale UI state is not sufficient authority.
- If exactly one exists and its ID matches this actor/browser journal's minimal
  accepted-web-clock marker, display it prominently and offer clock-out; never
  generate a second clock merely because local state is empty.
- If an open entry is mobile-created or its local origin marker was lost, show
  it read-only and route the EA to mobile/support. Lean v1 must not submit a
  full-row clock-out from another stream because a concurrent mobile clock-out
  could be silently overwritten.
- If more than one exists, block capture and route to support.
- Obtain geolocation with a finite timeout. A complete valid pair is sent; denial
  or failure sends null/null and is visible but non-blocking.
- Materialize and persist the exact v2 time-entry command before dispatch.
- Immediately before clock-out materialization, re-read the row, require the
  same `server_updated_at` freshness value and `sign_out_time IS NULL`, then send
  all 11 exact writer fields. This narrows but does not eliminate the race; the
  one-active-device rule remains part of the field boundary.
- A lost response remains ambiguous and retries the same command.
- Do not allow clock-out while a session command is unresolved.
- No stale-clock auto-close exists in v1. Returning EAs see the open clock before
  any other capture action.

### 9.3 Session flow

The web UI captures the same complete session/attendance family expected by the
existing mobile writer:

- group selection from the provisioned snapshot;
- attendance with at least one present child;
- letters or blend category according to the current validator;
- blend examples where required;
- attendee reading levels;
- notes; and
- a simple elapsed timer.

At session start, pin the group/roster snapshot and the server Johannesburg
date. Stable attendee/member IDs are materialized before network I/O. Submit the
session/attendance bundle atomically through the unchanged session RPC.

Letter Tracker changes are not collected or written in lean v1. The unchanged
mastery writer performs `ON CONFLICT ... DO UPDATE` even for a claimed `insert`,
so browser-side absence checks cannot prevent a concurrent mobile operation from
being overwritten. The UI says plainly that v1 saved the session record but did
not update Letter Tracker, and points the pilot EA to the agreed paper/support
process. A server-enforced conditional mastery capability belongs in v2.

### 9.4 Duplicate warnings

Recent actor-scoped history may warn about a likely duplicate group/time window,
but does not silently merge or mutate records. The warning is advisory because
the server does not gain a new semantic-deduplication rule in v1.

## 10. UI and field design

Use one authenticated client shell so an ordinary route transition does not
require a new application chunk mid-session.

Routes:

- `/login` — Supabase email/password sign-in and reset initiation.
- `/reset-password` — fixed-origin recovery callback and password update.
- `/` — authenticated Today/Clock/Session shell.
- `/support` — static preservation-first help with no learner data.

There is no historical route or date query mode.

Field UI requirements:

- 320 CSS-pixel width without horizontal overflow;
- minimum 48px labelled touch targets;
- high contrast and visible 3px keyboard focus;
- direct language and explicit saving/accepted/pending/fault states;
- current open-clock state always visible;
- no hover-only action, decorative animation, or desktop marketing shell;
- safe-area-aware padding and low-end-device rendering;
- support copy never instructs an EA to clear storage before unresolved evidence
  is preserved or deliberately dispositioned; and
- no claim that “online-first” means offline capable.

## 11. Test strategy and proof boundaries

### 11.1 Frozen-contract RED gate

Before auth or capture UI, commit a failing contract suite in the web repository
that proves:

- only the exact time-entry and session public RPC names can be dispatched, and
  any Letter Mastery dispatch attempt is rejected before transport;
- no caller-selected function/table/path reaches the transport;
- exact RPC argument names and exact payload key sets are required;
- the v1 operation allowlist rejects session update/upsert and every Letter
  Mastery operation before transport;
- missing/extra keys, wrong UUID/timestamp types, malformed pairs, unsupported
  versions, and boolean-as-number fail closed before dispatch;
- retries produce byte-for-byte equivalent serialized arguments;
- the exact current result vocabulary is classified explicitly;
- HTTP success plus malformed/unknown protocol JSON is failure;
- timeout/network loss is ambiguous and does not regenerate identity;
- a fake credential never appears in logs, errors, diagnostics, snapshots, or
  rendered output; and
- the pinned mobile contract commit and file digests are recorded and a
  developer-side cross-repository checker fails on drift.

The test is non-vacuous only if changing one pinned RPC name/key/result code or
serializer digest makes it fail.

### 11.2 Pure/domain tests

Use `node:test` through `tsx` for exact serialization, date handling,
materialization, state-machine, storage, actor isolation, tab lease,
geolocation, validation, completion, and redaction logic.

Johannesburg day tests run under at least UTC and America/New_York process
timezones to catch device-local assumptions.

### 11.3 Real Supabase/PostgreSQL contract proof

Before any hosted web use, run the exact browser-generated fixtures against the
unchanged migration chain in disposable PostgreSQL 17 and prove:

- actor A cannot write actor B's data;
- exact retry returns the canonical stored result without duplication;
- same mutation ID with changed content fails closed;
- accepted pre-web baseline fixtures still replay identically;
- session/attendance remains atomic;
- the browser fixture path invokes no Letter Mastery writer, and the session
  result remains independent of the deliberately absent tracker update;
- historical/current-day UI tests are not mislabeled as SQL enforcement;
- all five frozen function signatures/owners/config/grants/body digests remain
  unchanged; and
- no v1 migration performs write-side schema/RPC/grant/trigger changes.

The one read-only bootstrap/resolution migration has a separate harness proving
actor scope, exact request/result schemas, request/history/roster bounds, stable
ordering, fresh non-cached resolution, effective grants, anti-oracle behavior,
zero DML on resolved/not-found/error, and no delegation to any writer.

### 11.4 Real mobile convergence proof

Using disposable server fixtures created through the exact browser adapter:

1. pull into real mobile SQLite;
2. close/reopen the database;
3. read through domain repositories/UI selectors;
4. prove the rows do not become outbound mobile mutations;
5. run ordinary subsequent mobile writes; and
6. rerun the combined PostgreSQL release harness and focused v2 suites.

This proof may add fixtures/tests/documentation on an isolated mobile branch.
It does not edit mobile production code, change client mapping, publish an OTA,
or claim installed-phone uptake.

### 11.5 Browser E2E

Use production `next build`/`next start`, not only development mode. Cover:

- login/reset and session expiry;
- unprovisioned/readiness-blocked state;
- web-journal-owned open clock and manual clock-out;
- mobile-created/unknown-origin open clock shown read-only with support route;
- GPS success, denial, and timeout;
- full letters and blends sessions;
- attendance/reading-level/activity variants and explicit no-Letter-Tracker
  copy;
- response-lost exact retry with one authoritative session;
- reload from durable journal;
- Johannesburg rollover readback and historical-entry-required paths;
- two-tab fencing and actor switch isolation;
- malformed server payloads and integrity faults;
- 320×740 overflow/touch/focus/contrast; and
- strict CSP/HSTS with no unsafe script directive in production.

Mocks prove UI behavior, not PostgreSQL compatibility. The real database and
real SQLite gates remain separate.

### 11.6 Device and field proof

Minimum device matrix:

- Huawei/Android Chrome on the target field class;
- low-storage Samsung/Android Chrome;
- current desktop Chrome for support reproduction; and
- one iPhone/Safari sanity pass if EAs may use iOS.

Test login/reset, foreground/background return, killed-tab recovery, denied
location, intermittent network, low storage, tab duplication, clock status,
web-owned versus unknown-origin open entries, complete session, explicit
no-Letter-Tracker behavior, and sign-out warning.

The controlled field gate requires at least three provisioned EAs to complete
one school day. Compare browser state, Supabase rows, mobile pull, and existing
business reporting. Review their open clocks daily during the pilot.

## 12. Repository and branch boundaries

### Planning repository

- Repository: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs`
- Branch: `feat/web-capture-field-v1-foundation`
- Owns this governing plan and design history only.

### Web repository

- Repository: `/Users/jimmckeown/Development/zazi-izandi-web`
- Branch: `feat/field-capture-v1`
- Current foundation commit: `9be35c8`
- Owns auth, bounded reads, IndexedDB journal, fixed write adapters, UI, E2E,
  security headers, and rollout documentation.
- Has no remote/hosted project at this checkpoint.

### Mobile/Supabase repository

- Active user checkout `/Users/jimmckeown/Development/zazi-izandi-app` remains
  untouched on its existing field-bug branch.
- Isolated worktree: `/private/tmp/zazi-web-capture-supabase`
- Branch: `feat/web-capture-contract-v1`
- Documentation checkpoint: `a5fce72`
- Owns cross-repository contract fixtures/tests and the single read-only
  bootstrap/resolution migration/harness.
- No mobile production edit, writer SQL, hosted apply, merge, push, or release is
  implied by this plan.

### Django repository

Django is no-touch for field v1. The unrelated dirty active checkout remains
untouched. There is no v1 Django branch, service-role adapter, management
command, or Render cron.

## 13. Ordered implementation tasks

Each task is RED → GREEN → relevant regression → review → commit. Later-task
green cannot excuse an earlier missing gate.

### Task 0 — Freeze baseline and reject unsafe provenance design — complete

- [x] Revalidate current repository bases.
- [x] Run bounded hosted read-only PostgreSQL preflight.
- [x] Match five hosted function bodies to source digests.
- [x] Run 7 focused suites / 51 tests including combined PostgreSQL 17 baseline.
- [x] Record the protocol-v2 no-touch snapshot.
- [x] Reject `capture_source` changes to existing v2 payload/hash documents.
- [x] Independently adversarially review wrapper, provenance, locks, receipt,
      seed/wipe, grants, and stale-sweep risks.
- [x] Leave active mobile and dirty Django checkouts untouched.

### Task 1 — Ratify lean v1 and retire the wrapper plan as executable work

- [x] Jim selects pure lean v1, fuller lane v2, offline/PWA v3.
- [x] Mark the former wrapper plan superseded and update both roadmaps.
- [x] Update the mobile contract snapshot to pure-lean terminology.
- [x] Independently review this plan for internal consistency and v2 safety.
- [x] Merge/push planning documentation only after that review is clean.

### Task 2 — Commit the non-vacuous web protocol RED gate

Planned web files:

- `lib/protocol-v2/contract.ts`
- `lib/protocol-v2/schemas.ts`
- `lib/protocol-v2/outcomes.ts`
- `lib/protocol-v2/fixtures/*.json`
- `lib/protocol-v2/*.test.ts`
- `scripts/check-mobile-contract.mjs`
- `documentation/protocol-v2-pin.md`

Requirements:

- pin the reviewed upstream commit and exact source-file digests;
- encode exact argument/payload/result contracts without importing Expo/SQLite;
- export no generic dispatcher;
- start with tests that demonstrably fail because adapters do not exist;
- make a one-key/one-code mutation fail the suite as a falsifiability check;
- review fixture provenance against current mobile serializers and migrations;
- do not call Supabase or add credentials in this task; and
- commit RED separately before GREEN adapter implementation.

### Task 3 — Implement pure materialization and fixed write adapters to GREEN

Planned web files:

- `lib/capture/ids.ts`
- `lib/capture/materialize-time-entry.ts`
- `lib/capture/materialize-session.ts`
- `lib/capture/result-classifier.ts`
- `lib/supabase/capture-writes.ts`
- focused tests beside each module.

The adapter exposes only `submitTimeEntry` and `submitSessionBundle`. Tests
inject a fake transport and assert exact RPC name, arguments, timeout behavior,
strict decoding, error sanitization, immutable retry identity, and refusal of
any Letter Mastery dispatch. No React component or generic data layer can
choose a writer.

Run pure tests, typecheck, lint, build, and dependency audit. Commit after an
independent contract review.

### Task 4 — Implement Supabase auth and actor namespace

Planned web files:

- `lib/supabase/client.ts`
- `lib/auth/session.ts`
- `components/auth/auth-provider.tsx`
- `app/login/page.tsx`
- `app/reset-password/page.tsx`
- auth/browser tests.

RED cases include session absence/expiry, actor bind/unbind, cross-actor local
state denial, sign-out with unresolved evidence, reset open-redirect refusal,
and service-secret absence. Configure hosted reset redirects only during an
authorized deployment gate.

### Task 5 — Freeze and implement the readiness snapshot

Write the exact schema/semantic RED tests for the single combined
`web_capture_bootstrap_v1` contract before its migration.

Planned web files:

- `lib/data/bootstrap-schema.ts`
- `lib/data/bootstrap.ts`
- `lib/data/bootstrap.test.ts`
- `components/field/readiness-state.tsx`
- `components/field/today-dashboard.tsx`

The only allowed Supabase files are one additive read-only migration, one
dedicated PostgreSQL harness, one verifier, and registry documentation. The
migration may grant `authenticated` execute on only the new exact function; any
writer/table/RLS/existing-grant change fails scope review. No hosted apply occurs
in this task.

### Task 6 — Implement the actor-scoped durable journal

Planned web files:

- `lib/storage/database.ts`
- `lib/storage/journal.ts`
- `lib/storage/lease.ts`
- `lib/capture/state-machine.ts`
- `lib/capture/retry-policy.ts`
- `components/field/submission-status.tsx`
- storage/state tests.

Prove storage capability before capture, immutable materialized commands,
byte-equivalent retry, reload recovery, rollover resolution,
actor isolation, tab fencing, bounded PII-free diagnostics, exact journal field
allowlists/retention rules, and evidence-preserving sign-out. Do not add
service-worker/background-sync code.

### Task 7 — Implement live clock flow

Planned web files:

- `lib/capture/geolocation.ts`
- `lib/capture/time-entry-command.ts`
- `components/field/clock-card.tsx`
- focused unit/E2E tests.

GREEN requires accepted-web-clock marker matching, unknown/mobile-origin
view-only handling, duplicate-open block, just-in-time freshness read, GPS
pair/null rules, authoritative acceptance, immediate accepted-envelope purge,
exact lost-response retry, unresolved-session clock-out block, strong
returning-EA reminder, and no date editor or sweeper.

### Task 8 — Implement complete session capture without Letter Mastery writes

Planned web components under `components/field/session/` cover group,
attendance, letters, blends, reading level, notes, review, submission, and
explicit no-Letter-Tracker guidance. Pure command/draft modules live under
`lib/capture/`.

GREEN requires validator parity, stable attendee IDs, exact language
normalization, server-date pinning, atomic session bundle, duplicate warning,
reload/exact retry, rollover resolution, full letters/blends E2E flows, and an
executable proof that no Letter Mastery RPC is reachable. Historical entry,
Letter Mastery changes, and assessment mode are absent.

### Task 9 — Add preservation-first support and diagnostics

- bounded actor-scoped PII-free diagnostic ring;
- human-readable reference code without raw payload/token;
- `Historical entry required` state;
- support, rollout, privacy/storage, and daily open-clock review runbooks;
- no instruction to clear storage before unresolved evidence is retained; and
- no centralized telemetry sink or provenance store without a separate privacy
  and architecture decision.

### Task 10 — Prove PostgreSQL and real-SQLite compatibility

- run exact web-generated fixtures against disposable PostgreSQL 17;
- rerun pre-web accepted receipt replay and all five digest pins;
- prove actor isolation, replay, collision, and atomic family;
- prove two streams can overwrite one time entry, opposing mastery operations
  are last-writer-wins, and distinct IDs can create duplicate open clocks; these
  threat pins enforce the v1 UI/operational restrictions rather than pretending
  the original RPCs serialize product intent globally;
- prove a same-natural-key mastery race can mutate the pre-existing row through
  the unchanged writer, which is the threat pin keeping mastery out of v1;
- pull web rows into real SQLite, close/reopen, read through repositories, and
  prove no outbound mutation materializes;
- exercise ordinary subsequent mobile writes; and
- run focused plus combined v2 release suites.

Any mobile production diff, writer-function diff, hash drift, or unexplained
result-vocabulary mismatch stops the release.

### Task 11 — Adversarial review and local release gate

Review attack surfaces independently:

- exact serializer/argument/result parity;
- replay, generation, receipt/head ordering, and rollover honesty;
- actor scoping, RLS, credential exposure, and auth state changes;
- IndexedDB PII, actor purge, quota/private-mode behavior, and tampering;
- same-tab/multi-tab/multi-device concurrency;
- session completion and ambiguous-result handling;
- Johannesburg/device timezone divergence;
- old mobile client pull/reconcile behavior;
- production CSP and dependency supply-chain state; and
- every scope/no-touch assertion against Git diffs and function digests.

Fix all Critical/Important findings, rerun relevant/full suites, production
build, Playwright, `git diff --check`, and record exact SHAs/results.

### Task 12 — Authorized deployment and controlled field pilot

Requires explicit authorization for remote creation, push, the hosted read-only
migration, Vercel, DNS, Supabase Auth redirects, and production pilot.

Order:

1. Revalidate current bases and hosted frozen-function digests read-only.
2. Apply/postflight only the reviewed read-only bootstrap/resolution migration.
3. Create/configure the web remote and Vercel project.
4. Configure public environment values and exact Auth redirect allowlist.
5. Configure DNS/HTTPS and read back deployment/security headers.
6. Provision disposable test EA data and run production browser smoke.
7. Pass the real-device matrix.
8. Provision/read back three pilot EAs and distribute the link with one-device
   and paper-fallback instructions.
9. Run one controlled school day; inspect open clocks daily.
10. Compare Supabase, mobile pull, and business reporting.
11. Record separate migration/deploy/device/field receipts.

Rollback is link withdrawal/Vercel disable first. Preserve accepted rows,
receipts, and unresolved local evidence. There is no v1 cron to disable and no
provenance schema to unwind.

### Task 13 — Evidence-led v2 decision

After at least two school weeks, measure:

- duplicate or inconsistent clock attempts;
- forgotten clock-outs;
- ambiguous responses and unresolved rollover cases;
- support cases where client-path evidence would change the outcome;
- need for source-specific reporting;
- multi-device switching;
- cold-start/no-signal failures and paper fallback;
- browser storage/quota failures; and
- capture completion time and support burden by device.

Use those data to choose specific v2 server-lane features. Do not automatically
carry the entire old wrapper design forward. The stale-clock race with delayed
mobile sessions must be solved or its automation omitted even in v2.

## 14. Controlled-cohort release acceptance

Every item must be true:

- [ ] Each pilot EA has a signed/read-back provisioning manifest.
- [ ] The EA-token readiness snapshot returns the expected actor, roster, group,
      clock, and bounded-history shape.
- [ ] Browser source/bundle/env/logs contain no service-role or Django secret.
- [ ] The adapter can dispatch only the exact unchanged time-entry and session
      RPCs; Letter Mastery dispatch is impossible.
- [ ] Exact payload/result fixtures and upstream digests are pinned and
      independently reviewed.
- [ ] All five function identities and bodies are unchanged from the recorded
      baseline.
- [ ] Pre-web accepted v2 receipts replay to their canonical results.
- [ ] Same-command retry creates at most one time entry/session.
- [ ] Session/attendance remains atomic and the UI states truthfully that Letter
      Tracker was not updated.
- [ ] Web closes only a locally attested accepted web clock; unknown/mobile
      entries are view-only, and accepted time-entry GPS envelopes purge.
- [ ] No Letter Mastery mutation is materialized or dispatched by v1.
- [ ] The single bootstrap/resolution RPC resolves only an exact completed
      actor-owned receipt identity; an unresolved rollover never invokes a
      writer.
- [ ] Real SQLite pull/close/reopen and subsequent ordinary mobile writes pass.
- [ ] No mobile production code, SQLite, mapping, or release change is present.
- [ ] No write-side Supabase migration, provenance sidecar, sweep, or Django cron
      is present.
- [ ] Production 320px browser E2E and device matrix pass.
- [ ] At least three real EAs complete a controlled school day.
- [ ] Open clocks are reviewed operationally during the pilot.
- [ ] No Critical/Important adversarial finding remains.
- [ ] Hosted deployment, actual phone loading, real-EA use, and no-recurrence are
      reported as separate claims.

## 15. Deferred v2 — fuller server-governed web lane

V2 is not “implement all previously designed machinery.” It is a measured
decision about which safeguards solve observed field problems.

Candidate v2 capabilities:

- server-side same-actor browser concurrency/admission checks;
- compare-and-set closure of a mobile-created/unknown-origin open clock;
- safe existing-key Letter Mastery update/restore/archive across client streams;
- atomic supported-path command attestation and positive web-origin evidence;
- more complete ambiguous-result resolution;
- web-specific operational reporting and support diagnostics;
- historical-session creation with an all-writer server-derived review flag;
- carefully scoped forgotten-clock handling; and
- stronger server enforcement of current-day/clock-coverage rules for the
  supported web path.

Any provenance statement remains asymmetric: positive attestation can prove a
command passed through the supported wrapper, while absence means
`mobile_or_legacy`, not proven mobile. If a rule must be globally authoritative,
it belongs at a boundary every writer crosses or requires a new authority model.

A post-save receipt-verified sidecar is a possible intermediate feature, but it
is not free: it adds write SQL, grants, retention/backup/seed scope, browser
retry state, and eventual consistency. It may support adoption reporting, but a
missing marker cannot prove source and the marker alone must not authorize a
high-consequence payroll mutation.

Automatic stale-clock closure is not accepted merely because positive web
attestation exists. A delayed ordinary mobile session can arrive after a sweep
and end later than the chosen closure. V2 must solve or explicitly accept that
cross-writer race before any recurring job is enabled.

## 16. Deferred v3 — offline PWA

V3 begins only when measured connectivity failures justify the additional state
machine. An icon/manifest alone is not offline support.

Minimum v3 proof:

- cold-start without network;
- actor-scoped cached roster and expiry policy;
- durable versioned IndexedDB outbox and migrations;
- visible pending count and manual retry;
- auth expiry/re-authentication while work is pending;
- service-worker update and rollback safety;
- cross-account purge/isolation;
- storage pressure/eviction handling;
- reconnect without duplication;
- real device killed-app/reopen behavior; and
- convergence with existing server/mobile records.

## 17. Estimate and realism

The inert foundation is working, but the remaining work is not merely forms.
Exact protocol materialization, durable ambiguity handling, complete session
capture, auth/reset, readiness, PostgreSQL proof, real SQLite proof, low-end
device testing, and a real school-day gate remain.

A happy-path internal demo in roughly two weeks is plausible. A controlled,
field-safe lean pilot is more honestly **three to five weeks** with available
testers and already provisioned roster/groups. That estimate is shorter than
the full lane because it removes writer SQL, provenance, seed/backup changes,
locking, sweep reconciliation, and Django operations; it is not a promise.

Providing data to EAs operationally for the first month or two is a sound
bridge. It buys time to learn whether install-free online capture solves the
actual field problem before investing in server-channel or offline machinery.

## 18. Closure statement

Lean field v1 is an **install-free browser client of the unchanged protocol-v2
write contract**. It succeeds when a provisioned EA can safely complete a normal
live school day, recover an ambiguous request without duplication, and see the
same records through existing mobile/reporting systems—while the installed
mobile engine remains functionally untouched.
