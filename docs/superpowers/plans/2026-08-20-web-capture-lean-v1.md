# Zazi iZandi Web — Lean Field v1 Implementation Plan

> **Status:** Governing implementation plan. Jim selected the lean transport on
> 2026-08-20 after protocol-v2 adversarial review and approved the
> conformance-boundary correction on 2026-08-21. The correction was independently
> reviewed and merged after a clean review. The earlier wrapper/sidecar plan is
> retained only as v2 research and is not an executable task list.
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
| **v2 — fuller web lane** | Add only the server-side browser safeguards and teaching capabilities that field evidence warrants; evaluate a conditional create-only Letter Mastery capability first | Separately named additive capabilities such as conditional Letter Mastery create, wrappers/attestation/locking, or an all-writer policy; still no silent edits to existing v2 envelopes |
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

### 2.1 Conformance boundary, not a second protocol engine

Lean v1 has one deliberately narrow command path:

```text
Controlled browser domain input
        -> one exact materializer
        -> frozen time/session wire contract
        -> unchanged protocol-v2 RPC
        -> identity-bound acknowledgement classification
```

The browser does **not** reproduce every PostgreSQL rule in TypeScript. Each
concern is proved once at its authoritative boundary:

| Concern | Authoritative proof boundary |
|---|---|
| Form and supported-v1 domain rules | Pure materializer tests |
| Exact RPC, envelope, payload, and retry bytes | Frozen conformance fixtures plus materializer tests |
| Corrupt or cross-actor persisted commands | IndexedDB journal decoder and actor namespace |
| Fixed writer selection | Two-method gateway |
| Network result shape and command/family identity | Gateway result classifier |
| Authentication, RLS, receipts, locks, concurrency, SQL byte limits, collision handling, and transactional family integrity | Disposable PostgreSQL 17 |
| Existing-client consumption and no accidental outbound echo | Actual mobile pull mapping and real SQLite repository tests |

Task 2 therefore stops at a non-vacuous conformance gate. It must not grow into
a second independent implementation of the SQL validator. Valid server-specific
findings move to the early disposable-PostgreSQL gate instead of being copied
into browser validation code.

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
- Absence of positive server-side web provenance cannot classify a row as
  mobile. Lean v1 creates no server-side provenance marker or source field. Its
  minimal accepted-web-clock marker is actor/browser-local authority only:
  presence can authorize the supported local clock-out path, while absence
  means unknown origin and keeps the row read-only.
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
- one active academic-year identity and date range when the actor has provisioned
  work;
- active class/group identifiers, display names, class grade/home language, and
  group programme level;
- roster member IDs, first names, authoritative current-year class/group
  membership, and the class grade needed for the session attendee snapshot;
- the exact current open-time-entry count plus at most two deterministic full
  rows for that actor; any count above one blocks capture, so a bounded response
  never lets `LIMIT 1` mask duplicate clocks;
- the exact actor-owned wire fields/record identity needed to close a visible
  entry that this browser journal previously clocked in and the row's current
  `server_updated_at` observation for diagnostics only, never as a server-side
  write precondition or cross-stream compare-and-set;
- bounded recent time-entry/session roots needed for duplicate warnings; and
- an explicit schema version and truncation/count metadata.

Freeze these v1 collection bounds: at most 8 classes, 32 groups, 256 returned
roster members in total, 64 returned members per group, 2 full open-clock rows,
20 recent time entries, 20 recent session roots, and 20 resolution requests.
The provisioned collection reports exact total and returned counts plus one
truncation flag; every group roster and history/open-clock collection reports
the same three values. Critical provisioning is all-or-nothing: if any class,
group, total-roster, or per-group-roster cap is exceeded, or if the
authoritative membership graph is invalid, the server returns no partial
classes/groups/rosters and marks provisioning `over_limit` or `invalid_graph`.
The browser can never turn that prefix into capture authority. Recent-history
truncation is valid because that history is advisory only. The history window
is the current Johannesburg date plus the preceding six Johannesburg dates;
unrestricted history is never returned.

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

The exact canonical key grammar is the descriptor writer's natural-key text,
`[["id","text","<lowercase UUID>"]]`; its embedded ID must match the stored
receipt's local record ID. `TIME_ENTRIES/insert` is generation 1,
`TIME_ENTRIES/update` is generation 2, and `SESSIONS/insert` is generation 1;
no other descriptor/operation/generation pair is accepted. Generations and
audit sequences are positive safe integers no greater than
`9007199254740991`. Duplicate mutation IDs, duplicate complete request
identities, extra/missing keys, malformed values, a request array whose JSONB
text exceeds 32,768 bytes, or more than 20 items fail closed with fixed errors
that do not echo submitted data. The actor is never an argument.

The versioned response returns readiness plus exactly one resolution item in
input order for every request:

```text
{request_index, state: "resolved", canonical_result}
{request_index, state: "not_found"}
```

`resolved` is deliberately narrower than generic receipt lookup. It requires a
completed accepted actor-owned receipt whose mutation, actor, stream,
descriptor, derived local record ID, canonical key, generation, and operation
match the submitted resolution identity, plus an accepted canonical result
whose embedded `audit_seq` equals the requested `audit_sequence` and whose
serialized object is no larger than 131,072 bytes.
For TIME, the stored result must bind actor, mutation, stream, descriptor,
canonical key, generation, operation, audit sequence, and record ID/user. For
SESSIONS, it must bind actor, mutation, stream, audit sequence, root
descriptor/key/generation/operation, and root record ID/user. This is identity
validation, not a duplicate implementation of the complete writer-result
schema; the browser still applies its frozen descriptor-specific classifier.
The read function neither receives the immutable payload nor recomputes or
compares the receipt's canonical envelope hash/hash version; Task 6's immutable
command plus the frozen result classifier remains the complete browser-side
binding boundary.
The v2 receipt table does not persist `audit_sequence`, and some stored refusal
results omit it, so a
completed result whose full requested identity cannot be proven returns the
same `not_found` shape and preserves local evidence; Task 5 does not alter the
receipt table or any writer. The bootstrap/read response is decoded by its own
strict read schema and is never treated as a writer acknowledgment. Only a
matched `resolved.canonical_result`—the stored accepted writer result—is then
passed through the descriptor-specific write-result classifier together with
the later Task 6 immutable command. Receipt existence is not itself success,
and resolution never authorizes a new write. Wrong actor, absence, refusal,
non-provable audit identity, or any submitted identity mismatch returns the
same `not_found` shape. The ordinary recent-history bounds never truncate or
substitute for the per-request resolution list.

Every invocation is a fresh authenticated POST and is treated as `no-store` by
the web data adapter. The function is `SECURITY DEFINER` only because exact
resolution reads private protocol receipts. It must derive `auth.uid()`,
reject a null actor with fixed SQLSTATE `42501`, schema-qualify all objects, set
a safe search path, accept no caller-selected actor, use no dynamic SQL,
perform no DML, call no writer, cap every collection, and fail closed on
malformed shape/counts. Declare it `STABLE` so every SQL statement observes the
calling query's coherent snapshot, and catalog-verify
that volatility. Provisioning is proven through explicit active class, group,
and child assignment-ledger joins plus one active academic year covering the
captured Johannesburg date and an active complete grouping version for every
returned class. Legacy `staff_id`, `staff_children`, `children.created_by`, and
`private.current_user_can_access_*` fallbacks are insufficient for web
readiness. Membership tables—not `children.class_id`, `children.group_name`, or
`children_groups`—are authoritative. Only its exact signature receives
`authenticated` execute; no existing writer/table/RLS grant changes.

Capture is blocked when any of these are true:

- authentication is absent/expired;
- actor ID mismatches the local namespace;
- no provisioned class/roster/group is visible;
- the actor has assignments but there is not exactly one active academic year
  covering the captured Johannesburg date;
- an actor-assigned active child has zero or multiple active current-year class
  memberships, a class outside the actor's active class assignments, zero or
  multiple memberships in that class's active grouping version, a group
  outside the actor's active group assignments, any class/group/version
  mismatch, an archived object on the active path, or a null/unsupported group
  programme level;
- more than one open clock exists;
- any critical provisioning/open-clock bound is exceeded;
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
materialized only from an immediate fresh bootstrap row whose ID and actor
match a minimal marker created after a strictly accepted supported-web clock-in
by this actor/browser stream. It is only that marker-owned entry's
generation-one-to-generation-two update, never a retained clock-in request.

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

A same-day exact writer retry may return any stored canonical result; only the
descriptor-specific accepted `{kind, code}` is success, while stale, rejected,
integrity, or pre-receipt outcomes retain their exact classification. The
read-only rollover resolver is intentionally narrower: it resolves only an
accepted result whose embedded audit sequence and complete persisted identity
can be proven. Refusal receipts without provable audit identity become uniform
`not_found` and preserve the local command for support.

### 8.4 Same-browser concurrency

Only one capture surface may own the actor's local lease. A second tab is
read-only and explains where capture is active. The implementation uses a
tested browser lock/heartbeat boundary with takeover after a stale lease without
changing any command identity.

This does not coordinate different phones or browsers. The pilot operating rule
is one active capture device/browser per EA, with a fresh bootstrap before clock
or session materialization. Cross-client clock handling is prohibited: an open
clock without the current browser's accepted-web marker is read-only and must
be completed in its owning client or through support. Any observed mobile or
second-browser clock handoff/closure is a pilot escalation and requires
re-evaluating a server-governed wrapper/locking lane before the cohort widens.

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
- Immediately before clock-out materialization, require the local marker to
  originate from a strictly accepted supported-web clock-in, then immediately
  re-read the entry and require matching entry/actor identity and
  `sign_out_time IS NULL`. Materialize only the generation-one-to-generation-two
  update and send all 11 exact writer fields. The unchanged old RPC does not
  compare `server_updated_at` as a cross-stream compare-and-set: a mobile or
  second-browser close after this re-read but before the RPC can still be
  overwritten. This is an eligibility check, not a race guarantee; the
  one-active-device rule and cross-client escalation remain field boundaries.
- A lost response remains ambiguous and retries the same command.
- Do not allow clock-out while a session command is unresolved.
- No stale-clock auto-close exists in v1. Returning EAs see the open clock before
  any other capture action.

### 9.3 Session flow

The web UI captures the same complete session/attendance family expected by the
existing mobile writer:

- group selection from the provisioned snapshot;
- attendance with at least one present child;
- letters or blend category according to the frozen Task 3 materializer rules;
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

- only the exact old time-entry and session public RPC names can be dispatched;
- the gateway exposes exactly `submitTimeEntry` and `submitSessionBundle`, with
  no caller-selected function/table/path and no Letter Mastery method;
- exact RPC argument names, exact payload key sets, the supported-v1 operation
  subset, basic UUID/timestamp/generation/audit types, and canonical
  actor/record bindings are frozen in four synthetic golden commands: clock-in,
  clock-out, letters session, and blending session;
- the unchanged old session RPC is distinguished from the unmapped
  capture-flag successor and its successor-only result vocabulary;
- accepted results use the actual PostgreSQL JSONB schemas, tolerate
  non-semantic object-key presentation order, and bind mutation, stream, actor,
  audit, root, and every member identity to the submitted command;
- every known old-RPC `(kind, code)` pair is distinguished from malformed,
  unknown, raw-HTTP, or wrong-command output without leaking a raw response;
- a deliberately shallow fixed-name pass-through adapter fails; and
- the pinned mobile contract commit, complete source-file digest inventory, and
  five function-body digests are recorded, and a developer-side Git-object
  checker fails on relevant drift.

The test is non-vacuous only if changing one pinned RPC name/key/result code or
serializer digest makes it fail. Task 2 is complete when the one missing
production gateway is the only RED and an independent review has no Critical or
Important finding within this boundary.

Task 2 deliberately does **not** mirror PostgreSQL raw-JSON parsing, every
field-byte limit, every SQL rejection branch, RLS, locks, receipt/head races, or
natural-key collision behavior. It also does not defend against contrived hidden
prototype/symbol APIs inside application memory. Those are proved at the
materializer, journal, source-review, or disposable-engine boundary where they
actually matter.

### 11.2 Pure/domain tests

Use `node:test` through `tsx` for exact serialization, date handling,
materialization, state-machine, storage, actor isolation, tab lease,
geolocation, validation, completion, and redaction logic.

Materializer tests—not the transport conformance gate—own the supported-browser
rules: a marker-originated same-browser clock transition only from accepted
generation one to generation two after the immediate reread; fresh
session/root/member generations; one selected provisioned group; attendance/
programme/activity consistency; deduplicated teaching selections, GPS pair/null
semantics, session/clock chronology, and byte-equivalent repeated
materialization from one persisted intent.

Johannesburg day tests run under at least UTC and America/New_York process
timezones to catch device-local assumptions.

### 11.3 Real Supabase/PostgreSQL contract proof

Immediately after Task 3 and before auth or substantial UI, run the exact
browser-generated fixtures against the unchanged migration chain in disposable
PostgreSQL 17 and prove:

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

When Task 5 authors the one read-only bootstrap/resolution migration, its
separate harness proves actor scope, exact request/result schemas,
request/history/roster bounds, stable ordering, fresh non-cached resolution,
effective grants, anti-oracle behavior, accepted-only audit-bound resolution,
active-ledger/grouping-year integrity, catalog-pinned `STABLE` snapshot
semantics, and zero DML/row locks/writer delegation on resolved, not-found,
malformed, overflow, and blocked-integrity paths in read-only transactions. It
also proves a second invocation sees a newly committed receipt, a seed-wiped
database returns a safe blocked snapshot, all frozen/protected mobile
production and protocol source bytes remain unchanged, and all five frozen
function bodies/config/owners/grants plus existing policies, triggers, and
tables remain unchanged. The sole allowed pre-existing repository-artifact
edit is the two-field digest regeneration described in Task 5. That harness
reruns with the Task 10 release regression; it is not a Task 3A
prerequisite for an artifact that does not yet exist.

### 11.4 Real mobile convergence proof

Immediately after the PostgreSQL leg, using disposable server fixtures created
through the exact browser adapter:

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
- Current revision branch: `plan/lean-v1-conformance-boundary`
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
- Documentation checkpoints: `a5fce72`, `8d599c4`
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

Those checkboxes record the initial 2026-08-20 ratification and merge. The
2026-08-21 conformance correction is separately gated:

### Task 1A — Correct the conformance boundary and proof order

- [x] Jim rejects a second browser implementation of the SQL validator.
- [x] Move supported-browser semantics to Task 3 materializers.
- [x] Move disposable PostgreSQL and actual mobile SQLite proof to Task 3A,
      before auth and substantial UI.
- [x] Define conditional create-only Letter Mastery as an evidence-dependent v2
      candidate without promising safe existing-key mutation.
- [x] Independently review the correction with no Critical/Important finding.
- [x] Merge and push the correction only after that review is clean.

### Task 2 — Commit the non-vacuous web protocol RED gate

Current web files:

- `contracts/mobile-v2/<reviewed-commit>/manifest.json`
- `contracts/mobile-v2/<reviewed-commit>/fixtures.json`
- `lib/contracts/mobile-v2-snapshot.ts`
- `lib/contracts/mobile-v2-snapshot.test.ts`
- `scripts/check-mobile-v2-baseline.mjs`
- `documentation/lean-v1-task-2-contract-checkpoint.md`

Requirements:

- pin the reviewed upstream commit, complete source-file digest inventory, and
  five exact function bodies using Git objects rather than the active mobile
  worktree;
- encode the four golden wire commands and identity-bound result contracts
  without importing Expo, SQLite, Supabase, React, or browser storage;
- require a future module exposing only two fixed methods and no generic or
  Letter Mastery dispatcher;
- make shallow pass-through, one-key, one-code, wrong-identity, and relevant
  upstream-digest mutations fail the suite;
- use the exact old-RPC acknowledgement inventory and treat successor-only or
  unknown results as malformed;
- review fixture provenance against current mobile serializers and migrations,
  while keeping SQL-only semantics out of the browser validator;
- do not call Supabase or add credentials in this task; and
- commit RED separately before GREEN adapter implementation.

Hard stopping rule: once all snapshot/conformance assertions pass, the missing
production gateway is the suite's sole intentional RED, the cross-repository
checker passes, and independent review is clean, Task 2 is frozen. Further
PostgreSQL semantics become Task 3A tests rather than new TypeScript validator
branches.

### Task 3 — Implement pure materialization and fixed write adapters to GREEN

Planned web files:

- `lib/capture/ids.ts`
- `lib/capture/materialize-time-entry.ts`
- `lib/capture/materialize-session.ts`
- `lib/capture/result-classifier.ts`
- `lib/supabase/mobile-v2-capture-gateway.ts`
- focused tests beside each module.

The adapter exposes only `submitTimeEntry` and `submitSessionBundle`. Tests
inject a fake transport and assert exact RPC name, arguments, timeout behavior,
strict decoding, error sanitization, immutable retry identity, and refusal of
any Letter Mastery dispatch. No React component or generic data layer can
choose a writer.

Materializers own supported-browser semantics instead of duplicating them in
the gateway: clock-in generation one; same-browser accepted clock-out only from
the marker and immediate reread as generation two; fresh session/root/member
generation one; one selected provisioned group with root `record.group_ids`
exactly that group and matching member `record.group_id` values; complete
attendance with at least one present child; exact letters/blending activity
unions; stable attendee IDs; GPS pair/null rules; and clock/session chronology.
The gateway consumes a validated materialized command and owns only fixed
dispatch plus writer-result classification. Bootstrap/open-clock rereads use
the separate read decoder; the legacy writer is not a cross-stream
`server_updated_at` compare-and-set.

Run pure tests, typecheck, lint, build, and dependency audit. Commit after an
independent contract review.

### Task 3A — Prove browser/server/mobile conformance before auth or UI

This task is intentionally moved forward from the former late Task 10 gate.
It makes engine evidence—not a larger browser validator—the next milestone.

- generate one exact clock-in, clock-out, letters session, and blending session
  through the production Task 3 materializers;
- apply the unchanged mobile migration chain to a guarded disposable PostgreSQL
  17 database and invoke the unchanged old RPCs under synthetic authenticated
  actor claims;
- prove exact replay, changed-payload mutation-ID rejection, actor isolation,
  time-entry lifecycle, atomic session/attendance families, canonical receipts,
  and record heads;
- replay a receipt accepted before web work and recheck all frozen writer-body
  digests;
- pull the resulting rows through the actual mobile pull mapping into real
  SQLite, close/reopen, and read them through production repositories/selectors;
- prove pulled web rows do not materialize as outbound mobile mutations and an
  ordinary subsequent mobile write still works; and
- leave the active mobile checkout, mobile production code, hosted Supabase,
  packages, and releases untouched.

Any writer/source/mapping/SQLite production diff, relevant digest drift,
unexplained result mismatch, or skipped real-engine leg stops work before Task
4. Static fixture/Jest evidence is not a substitute for this gate.

### Task 4 — Implement Supabase auth and actor namespace

Planned web files:

- `lib/supabase/client.ts`
- `lib/auth/session.ts`
- `lib/auth/lifecycle.ts`
- `lib/auth/recovery-marker.ts`
- `components/auth/auth-provider.tsx`
- `components/auth/login-form.tsx`
- `components/auth/reset-password-form.tsx`
- `components/auth/authenticated-field-shell.tsx`
- `app/login/page.tsx`
- `app/reset-password/page.tsx`
- auth/browser tests.

Freeze the following client-auth contract before UI implementation:

- A usable authenticated namespace is created only after definitive
  `auth.getUser()` verification. Bind that verified actor ID to a monotonically
  advancing local actor epoch; a cached session, JWT, or auth-state event alone
  cannot bind or advance an actor namespace.
- Enable password sign-in only after definitive unauthenticated state. Loading,
  recovery, or unverified state is neither sign-in nor capture-ready.
- Use `signOut({ scope: "local" })` only. Web sign-out must not globally revoke
  refresh tokens held by the installed mobile app or another supported client.
- Before ordinary local sign-out, quarantine the current actor namespace: stop
  reads, retries, and dispatch, then require confirmation against an opaque
  actor-bound evidence reference, its exact revision, and its exact evidence
  set. A stale, missing, or mismatched reference before local sign-out requires
  a new warning. If the exact set changes only after preflight and local-only
  sign-out succeeds, compare-and-dispose must preserve the changed evidence,
  finish unauthenticated locally, and route the preserved evidence to later
  recovery/support; it must never delete the changed set. Task 4 withholds the
  ordinary sign-out UI while its default evidence port is fail-closed; Task 6
  exposes that action only after the real journal-backed port and preserved-
  evidence recovery handoff are proven.
- Password recovery uses separate bounded, PII-free durable `exchanging`,
  `active`, and `cleanup` marker phases. Only a purpose-checked PKCE exchange
  whose returned actor exactly matches a server `getUser()` verification may
  promote `exchanging` to `active`, and only the same mounted lifecycle retains
  that password-update authority. Durable `active` state is cleanup evidence,
  not reload authority: reloads and other tabs clean it up and require a fresh
  link. Reload during `exchanging` likewise fails closed through local Auth
  cleanup. A recovery marker written in another tab
  immediately quarantines an ordinary authenticated namespace, every Auth
  event synchronously revokes stale destructive authority before deferred
  `getUser()` verification, and the protected shell independently requires both
  authenticated status and marker absence. Live marker validity is rechecked
  before password update. Recovery never disposes application evidence, and
  required local Auth cleanup is resumable across reload until complete.
- Task 4 tests this transition through an injectable fake evidence port only.
  Task 6 must prove the real IndexedDB composition, including durable
  quarantine/cleanup and reload behavior; Task 4 makes no storage proof claim.
- Password update is fenced to the currently `getUser()`-verified actor and
  epoch. It is refused after an actor/epoch transition and never persists or
  logs the password.
- Use manual exact-route PKCE recovery with `detectSessionInUrl: false`; only
  the reviewed reset route may consume its PKCE state. Pin the reviewed
  auth-js `redirectType` implementation dependency, and treat any auth-js
  upgrade affecting that behavior or PKCE URL handling as a review-blocking
  compatibility gate.
- Login and reset copy is account-enumeration-safe. App context, journal, and
  logs contain no raw session, user object, email address, access token, refresh
  token, or raw auth response.

RED cases include session absence/expiry, definitive actor bind/unbind and epoch
change, cross-actor local-state denial, sign-in while authentication is
unverified, local-only sign-out with unresolved-evidence quarantine, stale
evidence confirmation, reload-resumable cleanup, actor-fenced password update,
manual PKCE exact-route/open-redirect refusal, account-enumeration-safe
messages, and service-secret absence. Configure hosted reset redirect allowlist
only during an authorized deployment gate.

### Task 5 — Freeze and implement the readiness snapshot

Write the exact schema/semantic RED tests for the single combined
`web_capture_bootstrap_v1` contract before its migration.

Planned web files:

- `lib/data/bootstrap-schema.ts`
- `lib/data/bootstrap.ts`
- `lib/data/bootstrap.test.ts`
- `lib/supabase/web-capture-bootstrap-gateway.ts`
- `lib/supabase/web-capture-bootstrap-gateway.test.ts`
- `components/field/readiness-state.tsx`
- `components/field/today-dashboard.tsx`

The exact response is versioned and strict:

```text
{
  schema_version: 1,
  server: {
    observed_at: timestamp,
    johannesburg_date: date,
    history_since_date: date,
    active_academic_year: { id: UUID, starts_on: date, ends_on: date } | null
  },
  actor_user_id: UUID,
  provisioned: {
    state: "ready" | "unprovisioned" | "invalid_graph" | "over_limit",
    total_class_count: integer, returned_class_count: integer,
    total_group_count: integer, returned_group_count: integer,
    total_member_count: integer, returned_member_count: integer,
    truncated: boolean,
    classes: [{
      id: UUID, name: string, grade: string, home_language: string,
      academic_year_id: UUID
    }],
    groups: [{
      id: UUID, class_id: UUID, name: string, display_number: integer,
      programme_level: "letters" | "blending",
      roster: { total_count: integer, returned_count: integer, truncated: boolean,
                members: [{
                  child_id: UUID, first_name: string, class_id: UUID,
                  group_id: UUID, grade_snapshot: string
                }] }
    }]
  },
  open_time_entries: {
    total_count: integer, returned_count: integer, truncated: boolean,
    entries: [{
      id: UUID, user_id: UUID, sign_in_time: timestamp,
      sign_in_lat: number | null, sign_in_lon: number | null,
      sign_out_time: null, sign_out_lat: null, sign_out_lon: null,
      auto_clocked_out: boolean, created_at: timestamp,
      updated_at: timestamp, server_updated_at: timestamp
    }]
  },
  recent_time_entries: {
    total_count: integer, returned_count: integer, truncated: boolean,
    entries: [{
      id: UUID, sign_in_time: timestamp, sign_out_time: timestamp | null,
      auto_clocked_out: boolean
    }]
  },
  recent_sessions: {
    total_count: integer, returned_count: integer, truncated: boolean,
    entries: [{
      id: UUID, session_date: date, started_at: timestamp | null,
      ended_at: timestamp | null, group_ids: UUID[]
    }]
  },
  resolutions: [
    { request_index: integer, state: "resolved", canonical_result: object } |
    { request_index: integer, state: "not_found" }
  ]
}
```

Scalar domains are frozen as follows:

- every UUID is a lowercase canonical UUID string;
- every date is a real `YYYY-MM-DD` calendar date;
- every timestamp is an RFC3339 UTC string rendered with milliseconds and a
  literal `Z` (`YYYY-MM-DDTHH:mm:ss.sssZ`), or `null` only where the response
  block explicitly permits it;
- counts, `display_number`, and `request_index` are safe JSON integers;
  counts are nonnegative, a ready group's display number is positive, and
  `request_index` is zero-based in the closed interval 0–19;
- names, grade, and home-language strings are trimmed, nonempty, and no more
  than 256 UTF-8 bytes; programme level is exactly `letters` or `blending`;
- coordinates are finite JSON numbers in latitude/longitude range or `null`;
  sign-in coordinates are both present or both null; every open row has null
  sign-out time, both sign-out coordinates null, and
  `auto_clocked_out = false`. A legacy open row that violates those invariants
  yields `invalid_snapshot`, never a writable clock capability; and
- recent session `group_ids` is normalized to a sorted, unique UUID array;
  a database null is returned as `[]`. Recent `started_at` and `ended_at`, and
  recent/open time-entry sign-out timestamps, preserve null explicitly.

Response object-key order is not significant because PostgreSQL returns JSONB;
exact key sets are. Class grade/home language and first name are the only human
display strings returned. No nullable `display_number` is exposed as ready: a
null, non-integer, or nonpositive value on an otherwise active group makes the
authoritative graph invalid.

Provisioning state uses this deterministic precedence:

1. Null authentication and malformed resolution input raise fixed exceptions;
   they are not response states.
2. `invalid_graph` wins if any actor-rooted active group or child assignment
   cannot participate in exactly one current-year, active, complete
   class/grouping/membership path, or if the path has any mismatch/archived/
   unsupported value described above. An actor with only an active class
   assignment and no group or child assignment is not contradictory.
3. `over_limit` applies only when the complete authoritative graph is otherwise
   valid and nonempty but exceeds any class/group/total-member/per-group cap.
4. `unprovisioned` applies when no contradictory actor-rooted graph exists but
   there is no nonempty complete class + group + member set.
5. `ready` applies only to a nonempty, complete, valid graph within every cap.

Every non-ready state returns `returned_* = 0` and empty critical class/group/
roster arrays. Its `total_*` fields still report exact actor-rooted active-ledger
counts. `truncated` is true only for `over_limit`; suppression for
`invalid_graph` or `unprovisioned` is not truncation. Per-group roster metadata
therefore exists only in a ready response. Valid `invalid_graph` and
`over_limit` responses map to browser `group_roster_unavailable`; valid
`unprovisioned` maps to `unprovisioned`. `invalid_snapshot` is reserved for a
malformed, unparseable, stale-actor, or internally inconsistent server response,
not for a valid server-declared provisioning state.

All arrays use deterministic ordering and exact key sets. The server timestamp,
Johannesburg date, and seven-day history start must agree; a `ready` response
must contain one academic year whose range covers that date, while a blocked
response may use `null`; the response actor must equal the live actor
namespace; every group references one returned class; every ready roster is
complete and unique, and each member's class/group/grade binding must equal its
containing authoritative group/class; open rows preserve complete-or-null GPS
pair semantics; history contains no notes, activities, attendance, GPS, names,
or unrestricted dates;
and the resolution array is one-for-one in request order. Classes order by
case-folded name then ID; groups by case-folded class name, class ID, display
number, case-folded group name, then group ID; rosters by case-folded first name
then child ID; open entries by sign-in time ascending then ID ascending; recent
time entries by sign-in time descending then ID ascending; recent sessions by
session date descending then ID ascending; and resolutions by zero-based input
index ascending. `unprovisioned`, `invalid_graph`, and `over_limit` provisioning
return empty critical arrays rather than a consumable partial prefix. The web
derives only `ready`, `unprovisioned`, `invalid_snapshot`,
`duplicate_open_clock`, or `group_roster_unavailable` at this stage. It adds no
capture/journal behavior.

The only allowed Supabase files are one additive read-only migration, one
dedicated PostgreSQL harness, one verifier, the required migration-manifest
artifact regeneration in
`scripts/seed-verification/backup-archive-sequences.json`, and registry
documentation. Regeneration recomputes and verifies both
`migration_manifest_digest` and `target_ddl_sha256` (the latter may remain the
same when its source DDL is unchanged); only those two digest fields may differ,
and the existing seed backup/restore verifier must pass. This is the sole
allowlisted modification to a pre-existing non-production mobile-repository
artifact; the migration, verifier, harness, and registry files are additions.
The migration uses bare `CREATE FUNCTION`, not
`CREATE OR REPLACE`, and may grant `authenticated` execute on only the new exact
signature. It explicitly revokes `PUBLIC`, `anon`, `authenticator`, and
`service_role`; accepts no actor; uses no dynamic SQL, DML, row locks, or writer
delegation; and changes no table, RLS, policy, trigger, private-schema grant, or
existing function body/owner/config/grant. The function is `LANGUAGE plpgsql
STABLE SECURITY DEFINER`, with empty search path and UTC timezone. The catalog
verifier pins the exact signature, trusted owner, volatility, security mode,
configuration, and ACL. The disposable-PostgreSQL harness exercises success,
`not_found`, malformed-input, overflow, and integrity-blocked paths inside
read-only transactions; proves foreign/absent/mismatched/non-provable receipt
lookups are indistinguishable; proves legacy-fallback-only and malformed
provisioning cannot become ready; and compares all frozen mobile sources and
function hashes before and after. No hosted apply occurs in this task.

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
view-only handling, duplicate-open block, immediate freshness reread, explicit
surface/block of cross-client clock handling, GPS pair/null rules,
authoritative acceptance, immediate accepted-envelope purge, exact
lost-response retry, unresolved-session clock-out block, strong returning-EA
reminder, and no date editor or sweeper. It states that the reread is not a
cross-stream compare-and-set and routes a detected mobile/second-browser clock
interaction to support/pilot escalation.

### Task 8 — Implement complete session capture without Letter Mastery writes

Planned web components under `components/field/session/` cover group,
attendance, letters, blends, reading level, notes, review, submission, and
explicit no-Letter-Tracker guidance. Pure command/draft modules live under
`lib/capture/`.

GREEN requires UI/E2E use of the already-proven Task 3 materializer, stable
attendee IDs, exact language normalization, server-date pinning, atomic session
bundle, duplicate warning, reload/exact retry, rollover resolution, full
letters/blends E2E flows, and an executable proof that no Letter Mastery RPC is
reachable. Task 8 does not create a second session validator. Historical entry,
Letter Mastery changes, and assessment mode are absent.

### Task 9 — Add preservation-first support and diagnostics

- bounded actor-scoped PII-free diagnostic ring;
- human-readable reference code without raw payload/token;
- `Historical entry required` state;
- support, rollout, privacy/storage, and daily open-clock review runbooks;
- no instruction to clear storage before unresolved evidence is retained; and
- no centralized telemetry sink or provenance store without a separate privacy
  and architecture decision.

### Task 10 — Re-run cross-engine compatibility as a release regression

- rerun the Task 3A exact web-generated fixtures against disposable PostgreSQL
  17 after auth, bootstrap, journal, clock, and session implementation;
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

This is a final regression of the already-required Task 3A proof, not the first
time browser/server/mobile compatibility is attempted. Any mobile production
diff, writer-function diff, hash drift, unexplained result-vocabulary mismatch,
or skipped real-engine leg stops the release.

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
8. Provision/read back three pilot EAs and distribute the link with one-device,
   no cross-client clock handoff/closure, and paper-fallback instructions.
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
- multi-device switching, including any mobile/second-browser attempt to
  inspect, close, or hand off an open web clock; if observed, contain it during
  the pilot and re-evaluate a full server wrapper/concurrency lane before
  widening rollout;
- cold-start/no-signal failures and paper fallback;
- browser storage/quota failures; and
- capture completion time and support burden by device.

Use those data to choose specific v2 server-lane features. Do not automatically
carry the entire old wrapper design forward. Independently of provenance and
clock automation, assess Letter Tracker workflow burden and make the separately
named conditional Letter Mastery capability the first v2 candidate if paper or
mobile follow-up is materially harming teaching operations. The stale-clock
race with delayed mobile sessions must be solved or its automation omitted even
in v2.

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
- [ ] Web closes only a locally attested accepted web clock after its immediate
      reread; unknown/mobile entries are view-only, the UI surfaces and blocks
      cross-client clock handling, accepted time-entry GPS envelopes purge, and
      pilot materials state that legacy v2 has no cross-stream
      `server_updated_at` compare-and-set.
- [ ] No Letter Mastery mutation is materialized or dispatched by v1.
- [ ] The single bootstrap/resolution RPC resolves only an exact completed
      accepted actor-owned receipt whose embedded audit sequence and complete
      persisted identity match; refusals without provable audit identity are
      indistinguishable from absence, preserve local evidence, and an
      unresolved rollover never invokes a writer.
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

- a separately named, server-enforced conditional Letter Mastery capability as
  the first candidate: create-only must never update/restore/archive an existing
  natural key and must consume a bounded authoritative mastery snapshot that
  distinguishes `expected_absent` from a specific existing row/version;
- server-side same-actor browser concurrency/admission checks;
- compare-and-set closure of a mobile-created/unknown-origin open clock;
- existing-key Letter Mastery update/restore/archive only after a boundary that
  every relevant writer crosses can enforce compare-and-set state;
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

The phase-2 Letter Tracker candidate does not modify
`apply_mobile_letter_mastery_mutation`, its payload, canonical hash, receipt,
serializer, acknowledgement vocabulary, or mobile mapping. It uses a new named
create-only contract plus a bounded actor-authorized read contract. The write
requires `expected_absent`, performs one atomic insert-or-typed-conflict, and
never restores, archives, or updates an existing natural key. Disposable
PostgreSQL must race it against the unchanged mobile writer in both orderings:
if mobile creates first, web conflicts without mutation; if web creates first,
the later unchanged mobile writer may still supersede it, which the UI and
operations must not misrepresent as impossible. Idempotency, actor/child
authority, mobile pull, and real-SQLite compatibility are also required before
any hosted apply.

Safe existing-key restore/archive/update is a later protocol decision. A web
compare-and-set RPC alone cannot prevent the unchanged mobile writer from
performing a later last-writer-wins update; that guarantee requires an
all-writer boundary or an explicitly versioned successor adopted by the mixed
fleet. This focused create-only capability is not a reason to resurrect every
wrapper/provenance/cron component from the superseded plan.

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
