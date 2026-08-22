# Zazi iZandi Web — Architecture Review at Task 7

**Date:** 2026-08-22
**Reviewed:** `zazi-izandi-web` @ `c2e0344` (`feat/field-capture-v1`, Tasks 0–7 complete) against
[2026-08-20-web-capture-lean-v1.md](2026-08-20-web-capture-lean-v1.md) and the server contract in
`zazi-izandi-app/supabase/migrations`.
**Method:** three independent Opus reviewers (architecture/complexity, plan alignment, server contract),
key claims spot-checked by hand.
**Product goal being judged against:** *a simple but reliable backup web form for EAs who cannot use the mobile app.*

---

## 1. Verdict

**Execution quality: high. Direction: wrong at the client boundary, right at the server boundary.**

Codex has been disciplined — the code matches the plan closely, contract fingerprinting is rigorous, UI copy
is excellent for the audience, and the real-PostgreSQL proof harnesses genuinely exist. But the thing being
built is not "simple but reliable". It is currently neither:

| Axis | Evidence |
|---|---|
| **Not simple** | 6,486 shipped production lines for one working feature (clock in/out). ~85% is infrastructure, ~15% UI. ~30 of ~44 concepts are defensive machinery an online-only form does not need. A hypothetical minimal design is ~1,700 lines. |
| **Not reliable** | Five distinct states where an EA is blocked from clocking in *or* out with no working button, routed to support. The only self-service exit ("Discard unfinished field work and sign out") is never mentioned in the stuck-state copy, and `/support` says "Do not clear browser data". |

The load-bearing finding: **the server already has a `mutation_id` receipt table that makes exact retry
idempotent, and already ships a read-only "was my command accepted?" oracle
(`web_capture_bootstrap_v1.p_resolution_requests`) — which the client parses, batches, and never calls
(`today-dashboard.tsx:44` passes `[]`; `journal.ts:588` computes batches and discards them).**
The browser reimplements, in ~2,400 lines of IndexedDB journal / Web Lock / fence / quarantine / epoch /
CAS, the durable log the database already maintains — and gets the hard cases (next-day, >3 attempts, any
rejection) wrong where the server would get them right.

## 2. Why it went this way (mental model)

**The adversarial-review ratchet.** Each review round surfaces a theoretical edge case; the cheapest local
fix is more client machinery; nobody asks "does this invariant belong on the server?". The plan grew
1,024 → 1,742 lines (+70%) in a single day (2026-08-21) while implementation was underway, with §8 going
128 → 284 lines. The original §8.4 was twelve lines ("a tested browser lock/heartbeat boundary with takeover
after a stale lease"); the current §8.4 is 74 lines that *forbid* what the original mandated. The fence /
epoch / quarantine / `compareAndDisposeExact` architecture was ratified into the plan at 22:00 on 08-21 —
35 minutes *before* the journal commit that implemented it.

Once that text was labelled a "frozen safety contract", every subsequent agent's cheapest path was to
preserve it. The plan has hard stopping rules pointed at *server-rule duplication* (those worked — the
browser genuinely does not re-implement the SQL validator) and **none pointed at client-side state
machinery**. That asymmetry is how a backup form acquired a distributed-systems core.

**The offline-engine port.** The mobile app is genuinely offline-first: it must allocate generation /
audit-sequence / stream counters locally to order N queued mutations against an unreachable server. The
web journal mirrors `sync_record_counters` + `sync_audit_sequence` almost field-for-field
(`journal.ts:362, 369-373`) — but the web has N ≤ 1 (`requireNoUnresolvedTime` blocks a second capture) and
a live server on every action. It carries the ordering apparatus without the ordering problem. Worst of both
worlds: a sync engine's complexity, no offline capability.

## 3. What the server actually guarantees (this reframes the client)

From `20260818120000_time_entry_insert_upsert.sql`:

- **Idempotency key = `p_mutation_id`.** Byte-identical replay returns the stored `canonical_result_json`
  without re-execution (step 5). Refusals are persisted too. Exact retry is safe by construction.
- **Authorization is enforced three times** (`auth.uid()` vs `p_actor_user_id`, payload `user_id`, and
  `WHERE entry.user_id = auth.uid()` on both DML arms). The client cannot forge another EA's row.
- **Generation monotonicity is enforced** per `(actor, stream, descriptor, record)` (steps 8–9). The client's
  `GENERATION_STORE` CAS is a strictly weaker duplicate.
- **`p_audit_seq` is range-checked, hashed, echoed — and never stored or compared.** The client's
  monotonic audit counter is pure ceremony; its only possible effect is to block capture if the local
  counter is ever corrupt.
- **The one real gap: no uniqueness constraint on "one open clock per user".** `time_entries` has PK `id`
  and three plain indexes. A client that mints a fresh record UUID creates a second open row. *Every line of
  the client journal is compensation for this missing server invariant.*

Consequence: the genuinely load-bearing client state is **the record UUID + mutation UUID + exact command
bytes of the one in-flight command**. That is a single key in `localStorage`/IndexedDB, not a journal.

## 4. Field-ops failures the current design creates

1. ~~Mobile clock-in → app dies → open web → web refuses to clock out.~~ **Withdrawn (Jim, 2026-08-22):**
   web is a strict substitute for EAs who *cannot* use mobile (no storage, Huawei, broken install) — a mobile
   EA never falls back to web. The plan's one-client-per-EA rule (#20) and read-only handling of foreign
   clocks are therefore correct product boundaries, not defects. **Corollary:** for a web-only EA, every open
   clock is by construction their own web clock, so the local "accepted-web-clock marker" protects against a
   race that policy already excludes — which makes point 2 below purely self-inflicted.
2. **Lost browser storage strands an EA mid-shift.** `time-entry-command.ts:177` requires the IndexedDB
   marker to clock out, even though the bootstrap RPC returns the authoritative open row. For a web-only EA
   the server's `open_time_entries` is sufficient authority to offer clock-out.
3. **Next-day retry is a silent no-op.** `retryPendingTime` returns `void` on `support` with no phase change
   and no message; the "Retry clock in" button stays visible and does nothing (`time-entry-command.ts:158`).
4. **Every server exception is misfiled as "ambiguous transport failure"** (`client.ts:390` discards the
   PostgREST error; gateway `catch {}` converts everything). A 42501 or statement timeout looks like a dropped
   packet and burns the 3-attempt budget with no diagnostic.
5. **Second tab is bricked** by the origin-wide Web Lock — a support call on a shared phone.
6. **Three `web_capture_bootstrap_v1` round-trips per clock-in** (two back-to-back inside `clockIn`, one from
   the dashboard effect). Visible latency on 3G for zero information.

## 5. Decisions Jim ratified in the design doc that the lean plan silently dropped

| Design-doc answer | Lean plan | Assessment |
|---|---|---|
| Q7/Q16: `capture_source` nullable column — "definitely" | #19 no provenance | Dropped on a payload/hash argument that does not apply to a *table column*; but Django's `additionalProperties: False` schemas mean any server-side field must be added in lockstep. Cheap proxy available now: correlate web Supabase auth logins with `time_entries` by user+day. |
| Q18: full session incl. Letter Tracker | #12 no mastery writes | **Correct to defer** — the mastery writer upserts on natural key even for `insert`, so web can clobber mobile. But the substitute is paper. Pull the create-only v2 capability forward. |
| Q19: 7-day backfill | #15 none | An EA whose signal fails all Tuesday cannot record Tuesday at all. |
| Q20: "No gating — every EA can use either client" | #20 one device per EA; mobile clocks read-only on web | **Plan is right; Q20 is superseded.** Jim clarified 2026-08-22: web is only for EAs who cannot use mobile at all. One client per EA is the operating model. |
| H3: offline Tier 2 by week 3 | §16 v3, gated on v2 | Multi-month deferral of the 25%-offline case, while ~4,850 lines went on same-browser tab fencing. |
| H5: stale-clock sweeper | #11 none | Forgotten clock-outs now "handled visibly and operationally". |

Several removals have merit. None came back as a decision record.

## 6. Timeline reality

Tasks 0–7 in ~36 hours wall-clock is far ahead of the plan's 3–5 week estimate on the code axis. But:

- **Task 8 (session capture — the product) has not started.** `today-dashboard.tsx:100` tells the EA
  "Session capture is not available in this version yet."
- `web_capture_bootstrap_v1` exists only on unmerged `zazi-izandi-app` branch `feat/web-capture-v1-bootstrap`
  (`451acc8`), not hosted-applied. **Deployed today, the app cannot reach `ready`.**
- The web repo has no git remote. The Task 3A and Task 5 real-PostgreSQL harnesses live in unpushed branches
  whose worktrees sit in `/private/tmp` (macOS prunes it). No run receipts exist in `build-log.md`.
- Under the plan's own governance (3-EA controlled pilot, then ≥2 school weeks before widening), the
  40-EA cohort arriving ~2026-09-03 gets paper regardless of velocity. Earliest defensible widening is
  mid-to-late September. **This should be an explicit decision, not a discovery.**

## 7. Recommendations (ordered)

### Do not start Task 8 on this foundation. Decide first.

**A. Move the invariants to where the authority is (server, small).**
1. Add a partial unique index: `CREATE UNIQUE INDEX … ON public.time_entries (user_id) WHERE sign_out_time IS NULL`.
   This closes the only real gap. **Must first verify how the mobile outbox handles a unique-violation from
   the RPC** (it should land in `support_needed`, not loop) — and how `auto_clocked_out` interacts. If the
   bare index is unsafe for mobile, enforce it inside the RPC as a typed refusal instead.
2. Merge + hosted-apply `web_capture_bootstrap_v1`; pin its `prosrcSha256` in `contracts/mobile-v2/`.
3. Correct the stale header on `20260818120000_time_entry_insert_upsert.sql:22-23` (it *is* hosted-applied).

**B. Collapse the client (target ≈ 1,700–2,000 production lines).**
4. Replace journal/database/lease/fence/quarantine/epoch/runtime with one persisted "pending command"
   record (record UUID, mutation UUID, exact bytes). Keep: `ids.ts`, materializers, `bootstrap-schema.ts`,
   `assertTimeAccepted`, the two-name RPC allow-list, public-config validation, CSP.
5. On mount, pass the pending command to `p_resolution_requests` and let the server say
   `resolved` / `not_found`. This eliminates ambiguity phases, attempt budgets, same-day windows, and all five
   stuck states.
6. Clock-out any *own* open clock from the server's `open_time_entries`. Under the one-client-per-EA
   operating model every open clock a web EA sees is their own web clock, so the local marker adds no safety;
   dropping it removes the lost-storage stuck state.
7. Every non-retryable state gets a "Start a fresh clock" action — safe by construction once (A1) exists.
8. Surface the real PostgREST error code in diagnostics; distinguish refusal from transport loss.
9. Delete dead code: `lib/contracts/`, `lib/scaffold/`, rollover/needs-parent/diagnostics surface,
   `hasMemoryFallback`, the `|| true` at `journal.ts:171`.
10. Keep a Web Lock *only* if a second tab should be read-only; drop the fence. (With A1 it is optional.)

**C. Then Task 8 session capture on the simplified base.** Sessions are the RCT/funder data; duplicate
sessions are the harm that matters. The same pattern applies: persist one pending command, exact retry,
server resolution. Sessions have no "open row" analogue, so the server's `mutation_id` idempotency already
suffices.

**D. Governance.**
11. Add a plan stopping rule pointed at *client* complexity ("same-browser fencing is subordinate to the
    one-device operating rule"; "if a client invariant can be a server constraint, it must be").
12. Any future plan amendment that drops a ratified design-doc answer requires a one-line decision record
    surfaced to Jim.
13. Push `feat/web-capture-task3a-v1` and `feat/web-capture-v1-bootstrap`; move worktrees out of
    `/private/tmp`; record harness run receipts in `build-log.md`; add a web-repo CI job that runs the
    Task 3A harness against the web checkout.
14. Create a remote for `zazi-izandi-web`.
15. Decide explicitly whether the 09-03 cohort runs on paper while a 3-EA pilot runs in parallel.

**E. Revisit dropped decisions with the server-first lens.** Offline Tier 1 (app-shell + cached roster) is
small once the client is simple. `capture_source` as a nullable table column + additive RPC param is a v1.1
candidate once Django schemas are updated in lockstep.

## 8. What is genuinely good and should be kept

- `lib/data/bootstrap-schema.ts` strict Zod + cross-field semantics — the only guard on an unmerged contract.
- `result-classifier.ts` `assertTimeAccepted` — re-binds all echoed fields to the submitted command.
- `client.ts` public-config validation, two-name RPC allow-list, account-existence-oracle suppression.
- `ids.ts` `canonicalIdKey` byte-exact reproduction of the SQL key grammar.
- CSP with per-request nonce; accessibility; 320px testing; the tone of every piece of EA-facing copy.
- `e2e/journal.spec.ts` runs real IndexedDB + Web Locks — the strongest test asset, even if the module it
  tests should shrink.
- The mobile-repo harnesses (Task 3A, Task 5) are real Docker PG17 proof, not fabrication.

---

## 9. Addendum — second opinion after Task 8 (c2b7510)

**Product boundary (Jim, 2026-08-22):** web is a strict substitute for EAs who *cannot* use mobile. One
client per EA. Cross-client clock handoff is not a requirement. This *strengthens* the simplification: for a
web-only EA every open clock is their own web clock, so the local accepted-clock marker guards a race that
policy already excludes.

### What Task 8 revealed

Task 8 accidentally drew the correct seam. Of its ~1,010 new production lines:

| Side of the seam | Files | Lines | Imports from storage/runtime |
|---|---|---|---|
| **Domain (keep verbatim)** | `session-draft.ts`, `materialize-session.ts`, ~85% of `session-card.tsx` | ~805 | **none** |
| **Plumbing (delete/rewrite)** | `journal.ts` +317, `capture-runtime.ts` +159, `auth-provider.tsx` +150, `session-command.ts` ~140 | ~760 | all of it |

The plumbing side is almost entirely *clones*: `materializeSessionDraft` forks `materialize`,
`readSessionCaptureState` forks `readClockCaptureState`, `prepareSessionRollover` forks
`applyJohannesburgRollover` (which now has zero production callers), `runSessionAction`/`runSession` are
line-for-line twins of the clock versions. The phase union now exists in four places. Task 9 would fork the
pair a third time.

The one genuinely valuable new piece of plumbing — `resolvePreviousDaySessions`
(`capture-runtime.ts:452–481`), which batches pending commands to the server oracle and applies the
readback — is exactly the behaviour the collapse recommendation calls for. It gets *lifted*, not lost.

### New field-visible defects from the phase machine

- **Terminal phases are never purged** (`retry-policy.ts:97` purges only `accepted`). One unrecoverable
  session permanently blocks *both* new sessions and clock-out in that browser. `e2e/session.spec.ts:293`
  asserts this as the expected end state.
- **Dead retry button** after 3 attempts (`session-command.ts:195` silent return; card still renders it).
- **`retryable_same_day` is unroutable** — a crash between two IndexedDB transactions sends a session to
  support for no reason (`session-command.ts:190–194`, `session-card.tsx:62` vs `journal.ts:635`).
- **No draft cancel/discard.** A roster or grade change makes the draft permanently unsubmittable with only
  a generic banner; the only exit is sign-out → discard everything.
- **Bootstrap storm:** every attendance tap / letter tap / notes blur refires `web_capture_bootstrap_v1`
  with the full roster (`today-dashboard.tsx:56` deps on `session.revision`). ~25 round-trips per session on
  3G. Invisible in tests because the route is mocked.
- Notes/blend text persisted on `blur` only — text lost if the tab is killed from the app switcher.
- Placeholder `<option value="">` is selectable and throws (`session-card.tsx:225`).
- No cap or warning on `duration_seconds` (`materialize-session.ts:106`).

### Options

| | A. Ship on current foundation + surgical fixes | B. Collapse storage/runtime now, then Tasks 9–12 | C. Pilot on A, collapse before widening |
|---|---|---|---|
| Cost | ~8 targeted fixes, each inside the phase machine | ~1–2 Codex days; ~330 lines rewritten, ~2,900 deleted, ~420 test lines discarded | A now + B later |
| Risk | Every fix is a patch on a 10-state machine; Task 9 forks it again | Rewrite immediately before a field pilot | "Temporary" foundations under a live pilot become permanent |
| Fit to "simple but reliable" | No | Yes | Eventually, maybe |

**Recommendation: B.** The surgical-fix list in A is itself the evidence — eight independent symptoms of one
cause. What gets deleted is the code tested only against itself; what survives (materializers, draft,
schema, classifier, e2e flows, the Task 3A PostgreSQL harness pinning the wire bytes) is the code with real
proof. The 09-03 cohort is not served under plan governance either way, so the 1–2 day delta does not move
that decision.

### Target shape (for Codex)

Server:
1. Merge + hosted-apply `web_capture_bootstrap_v1`; pin its digest.
2. Partial unique index on open clocks — **only after** verifying the mobile outbox routes a unique-violation
   to `support_needed` rather than looping. If unsafe for mobile, enforce as a typed refusal inside the RPC.

Client store (`lib/storage`, target ≤ 250 lines): one actor-keyed IndexedDB record
`{ draft | null, pending: { mutationId, recordId, command bytes, descriptor } | null, lastError }`.
No fence, epoch, reservation token, evidence revision, quarantine, or phase machine. Optional: a Web Lock
so a second tab is read-only (≈10 lines).

Flow:
- Materialize → save pending → RPC → on accepted clear pending; on transport loss keep pending and show
  Retry (same bytes); on typed refusal show the *specific* refusal and offer Discard + Start fresh.
- On mount: if pending exists, send it in `p_resolution_requests`; `resolved` → clear; `not_found` → Retry
  or Discard. No attempt budget, no same-day window, no terminal phases.
- Clock-out offered for any own open row in `open_time_entries`.
- Unresolved session still blocks clock-out (keep); Discard is always available.
- Draft: Cancel button; persist text on change (debounced); bootstrap only at begin and at submit.
- Errors carry the PostgREST code; distinct messages; console/telemetry line.

Governance:
- Jim issues a one-paragraph decision record un-freezing §8.4 (`bcfb577`) and replacing §8 with the shape
  above. Without that, Codex will correctly defend the frozen contract.
- Add stopping rule: "a client-side invariant that can be a server constraint must be a server constraint".

---

## 10. Reconciliation with Codex's Option B′ (2026-08-22)

Codex accepted the diagnosis and proposed B′: collapse the phase machine but retain a small safety kernel
(Web Lock, live actor/epoch, exact pending-before-I/O). Corrections accepted and amendments to B′:

### Corrections to this review (accepted)
| Claim in this review | Correction |
|---|---|
| Resolver answers "was my command accepted?" generally | **Accepted-only.** Refusals, wrong identity, malformed → uniform `not_found`. Client must not treat `not_found` as a known refusal or auto-clear. But: exact retry of the same bytes against the *writer* returns the stored refusal (refusal receipts are idempotent), so `not_found → Retry` is always safe and always informative. |
| `needs_parent` is recoverable via resolver | It is receipt-free. Keep the exact pending command; on explicit Retry, refresh readiness, resend same bytes. No phases needed. |
| `p_audit_seq` is pure ceremony | Server never orders on it, but it is hashed and echoed, so it must be **stable across retry**. Exact bytes already guarantee that. Persist `{streamId, nextAuditSeq}` as two fields on the actor record — not separate stores with CAS. Prefer one stream per actor over Codex's "fresh stream per command" (which silently drops generation fencing on clock-out). |
| Sessions need only `mutation_id` idempotency | **Overstated.** Idempotency covers exact retry, not fresh-ID duplicate intent after storage loss. Residual risk needs a product decision. Cheapest real guard: bootstrap returns today's accepted sessions per group; UI warns "You already saved a session for Group X at 09:14 — save another?" (plan §9.4 already contemplates duplicate warnings). Server knows, UI warns, no client state. |
| "Tested only against itself" | Too broad. Applies to `journal.test.ts`/`capture-runtime.test.ts`. The e2e suites, Task 3A/5 harnesses, real-SQLite tests are characterization evidence and must guide the rewrite. |
| Resolver never called | Stale after Task 8 for previous-day sessions; still `[]` on the clock path. |

### Amendments to B′
1. **Actor/epoch → instance-per-actor, not epoch-per-action.** Partition storage by actor (already the case);
   construct one `CaptureService` instance per verified actor; on `onAuthStateChange` user-id change, tear
   down and rebuild. Stale continuations belong to a discarded instance and can only ever write their own
   actor's partition. This gives Codex's guarantee by object identity with no epoch compare in every action.
2. **Web Lock: keep, strip the fence.** `navigator.locks.request(name, {mode:"exclusive", ifAvailable:true})`
   held for page lifetime; not acquired → read-only banner. No persisted owner, no fence counter.
3. **Quarantine = "pending exists".** Sign-out never deletes the actor partition. Next mount of the same actor
   sees `pending` and offers Retry/Discard before any new capture. That is the whole quarantine behaviour
   with zero dedicated machinery. Reject "retain quarantine/fence unless a RED proves unnecessary" — invert
   the burden: add it back only if a RED at the public boundary fails without it.
4. **Sequencing split.** Clock-out from the server's open row can ship now (web-only model makes the marker
   redundant for safety). The "Start a fresh clock" escape hatch waits for the partial unique index. Do the
   index preflight in parallel with, not ahead of, the client collapse.
5. **Public surface is the frozen contract; internals are not.** The six verbs (state, clockIn/Out,
   begin/update/cancel draft, submit, retry, discard) are the only thing the ADR freezes. Every internal
   mechanism must be justified by a failing test at that boundary.
6. **Line-count tripwire, not acceptance criterion.** Storage + service layer > 800 lines triggers a
   conversation with Jim, not a failure. Without a number the ratchet returns.
7. **Sanitized failure allowlist** (Codex's `SanitizedCaptureFailure`) — adopt as written.

### Still open (not addressed by B′)
- Merge + hosted-apply `web_capture_bootstrap_v1`; create the web repo remote; push proof branches.
- Cohort decision for ~2026-09-03 web-only EAs (comparator is paper, not mobile).
- Residual duplicate-session risk: accept for controlled cohort, or add the bootstrap-backed warning in v1.
