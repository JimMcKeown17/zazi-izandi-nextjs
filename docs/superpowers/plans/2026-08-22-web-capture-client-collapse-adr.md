# ADR: Collapse the web capture client behind a deep field service

**Date:** 2026-08-22

**Status:** Accepted by Jim
**Supersedes:** the client command state machine, durable fence/quarantine, and
public journal/runtime contract frozen in `bcfb577` and lean-plan Sections
8.2–8.4
**Does not change:** the two reviewed mobile-v2 writer RPCs, Task 2 wire
contract, Task 3 materializers/classifiers, Task 3A PostgreSQL/SQLite proof,
Task 5 bootstrap response contract, Supabase Auth identity, or the one-client-
per-EA operating rule

## Decision

The web client will expose one deep, actor-scoped `CaptureService`. Its frozen
product boundary is six operation families:

1. read field state;
2. clock in or clock out;
3. begin, update, or cancel a session draft;
4. submit a session;
5. retry the exact saved command; and
6. discard the exact saved draft, or a command with a reviewed definite
   no-family-DML refusal.

React and domain UI must not receive a Journal, database, lease, fence,
evidence ID, reservation handle, quarantine, command revision, attempt counter,
or durable phase union. Internals are deliberately unfrozen. An internal
mechanism may exist only when a failing test at this public boundary proves it
is needed. Storage plus service source exceeding 800 lines is a mandatory
architecture review tripwire, not an automatic failure.

## Durable state

IndexedDB contains one schema-versioned record per verified actor:

```text
actorUserId
streamId
nextAuditSeq
draft | null
pending | null   // exact immutable ten-argument TIME or SESSIONS command
lastFailure | null
revision
```

The pending command is committed before network I/O. Exact retry reuses every
byte, identity, stream, audit sequence, and generation. An identity-bound
accepted result clears it atomically. Transport uncertainty or resolver
`not_found` retains it and permits exact Retry only; the underlying writer may
still complete after the client timeout. A reviewed definite no-family-DML
refusal, including receipt-free `needs_parent`, may permit Retry or explicit
Discard. There is no attempt budget, same-day retry window, or durable
ten-state phase machine.

`web_capture_bootstrap_v1.p_resolution_requests` is accepted-only. `resolved`
must pass the frozen result classifier before clearing. `not_found` never means
accepted or a known refusal: the client keeps the command. Exact writer retry
is safe and informative because completed success and refusal receipts are
idempotent. The receipt-free session `needs_parent` result retries only after a
fresh actor/day/group/complete-roster check and always reuses the exact command.

The actor record retains one stream and next audit sequence. Allocation and
pending-command persistence are one transaction. Audit sequence is stable on
retry. Do not recreate the mobile offline queue or general generation stores;
the supported web operations use the frozen materializer generation rules.

## Ownership and identity

Construct one `CaptureService` instance for one server-verified
`ActorNamespace`. Dispose it before another actor instance is published. A
discarded instance must fail before transport and before local publication and
can address only its own actor partition. This object-identity boundary is
hidden inside the service; consumers do not compare epochs.

Hold one origin-wide exclusive Web Lock for the service lifetime with
`ifAvailable: true`. A second tab is read-only. There is no persisted owner or
fence counter. Page exit releases the lock; BFCache restoration reacquires it
before capture. Same-origin notification channels are advisory only.

Unfinished work is the sign-out evidence. Ordinary sign-out never deletes it:
after an exact revision/evidence-set preflight, the local Auth session ends and
the actor record remains byte-for-byte available to that same verified actor.
Direct draft Cancel is separate. Direct pending-command Discard is available
only after the service has classified an audited definite no-family-DML
refusal; null, network/timeout, resolver `not_found`, malformed/integrity, and
unexpected outcomes are never locally deletable. No dedicated durable
quarantine is created.

## Server and product authority

PostgreSQL owns authorization, transactionality, receipt/head replay,
generation enforcement, and business concurrency. Add a partial unique
constraint for one open time entry per actor only after existing-data preflight
and disposable-PG/mobile-outbox proof; catch the unique violation as a reviewed
typed refusal. This server work runs in parallel with the client collapse and
gates server-enforced concurrency across storage/device loss, not actor-owned
server-row clock-out.

The 2026-08-22 source preflight found that the current mobile-v2 TIME RPC does
not catch this cross-record `23505`: the transaction would roll back its
receipt/head and the installed v2 client would classify the raw PostgREST error
as a generic retryable row failure. The partial index is therefore **held**, not
silently added server-only. Releasing it requires a reviewed TIME-RPC successor
or equivalent typed refusal plus mobile acknowledgement/outbox proof, the exact
zero-duplicate hosted preflight, disposable PostgreSQL verification, and
separate deployment authorization. Until then, duplicate server open rows stay
a hard client block and the product makes no server-enforced cross-device
concurrency claim.

Under the web-only EA operating rule, the actor's single authoritative open
row is sufficient clock-out authority. Do not require an accepted-web marker.
Until the server uniqueness change is released, duplicate open rows remain a
hard block and there is no Start-fresh-clock bypass.

Mutation receipts do not prevent a new session identity after browser storage
loss. V1 therefore keeps the Task 5 recent-session duplicate warning for the
same group/day and requires explicit EA confirmation; it does not
pretend this warning is a uniqueness guarantee.

## Failure vocabulary and UX

Persist only a reviewed `SanitizedCaptureFailure` classification: network
unavailable, timeout, authenticated refusal with an allowlisted code,
already-open-clock, `needs_parent`, reviewed protocol refusal, or unexpected
server failure with a PII-free reference. Never persist or render raw
PostgREST messages/details/hints, JWTs, Session/User/email, request URLs, or
payloads outside the exact pending command.

Session drafts gain Cancel, text is persisted on a short debounce rather than
blur, and bootstrap runs at dashboard load, draft begin, submit, explicit retry,
and completed action refresh—not on every attendance or activity edit.

## Proof and rollout

Keep materializer, classifier, bootstrap-schema, fixed two-route transport,
Task 3A/5 harness, real-SQLite, 320px, auth, clock, and session E2E proof as
characterization evidence. Replace storage-specific tests only after equivalent
public-boundary RED/GREEN proof exists. Local green is not hosted migration,
deployment, device uptake, or field-pilot evidence.

The hosted bootstrap migration, web remote, proof-branch publication, open-
clock server constraint, controlled-cohort decision, and release authorization
remain separate explicit gates.
