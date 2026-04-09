# EA My Kids Plan - Detailed Review for Next Build Session

Date: 2026-04-08  
Related plan: `documentation/ea-my-kids-plan.md`  
Primary focus: EA login/scoping, quality flags (especially letter alignment), chatbot tool design, and future badges

---

## Purpose of this review

This document captures a coding-ready review of the EA My Kids strategy so a future AI coding session can execute with fewer ambiguities.

Goals of this review:
- Identify plan gaps and risks before implementation
- Define the exact chatbot tools/functions needed
- Ensure letter alignment logic is handled correctly and fairly
- Add a robust identity/scoping model for EA access
- Define a badge model that is motivational and technically reliable

---

## Sources used for this review

- `documentation/ea-my-kids-plan.md`
- `documentation/data-metrics-reference.md`
- `documentation/pm-dashboard-architecture.md`
- `docs/superpowers/specs/2026-04-07-letter-alignment-design.md`
- `lib/pm/types.ts`
- `lib/pm/constants.ts`
- `components/pm/quality-flags/*`
- `components/pm/letter-alignment/*`
- `app/api/flag-evidence/route.ts`
- `app/api/letter-alignment/route.ts`
- `middleware.ts`
- `components/layout/header.tsx`

---

## Executive technical conclusion

The overall direction is strong and aligned with product goals.  
The biggest implementation risks are not UX-related - they are identity-scoping consistency, data-contract consistency, and missing letter-alignment-specific chatbot tooling.

If these are fixed before Phase 3 chatbot work, the plan is very buildable.

---

## Critical and high-priority gaps

## 1) Identity scoping should be ID-enforced, not name-enforced

### Gap
The plan currently uses TeamPact `user_name` matching in multiple places.

### Risk
Name-based links are fragile and create leakage risk (spelling changes, duplicates, punctuation differences).

### Recommended fix
Use this chain:
1. Clerk session user
2. Verified email (for mapping lookup only)
3. Resolve to `teampact_user_id`
4. Enforce all backend scoping by `teampact_user_id`

Important:
- Email is a good onboarding/mapping mechanism
- Email should not be the final access-control key
- Runtime data filters should use TeamPact user ID

### Suggested model for mapping
`EALink` (or equivalent) with:
- `clerk_user_id` (preferred stable join)
- `email_normalized` (lowercase, trimmed)
- `teampact_user_id`
- `teampact_user_name` (display/audit)
- `is_active`
- `updated_at`

Fail closed behavior:
- If no mapping, return "account not linked" state
- Do not fallback to broad queries

---

## 2) API contract mismatch inside plan (must be normalized)

### Gap
Plan defines `/api/ea/me/*`, but sample chat code calls `/api/ea/${eaName}/...`.

### Risk
Inconsistent endpoints lead to implementation drift, potential spoofable path params, and duplicated logic.

### Recommended fix
Standardize on:
- `/api/ea/me/`
- `/api/ea/me/groups/:group_id/`
- `/api/ea/me/insights/`
- `/api/ea/me/chat-context/` (optional helper)

The backend resolves identity from authenticated session mapping, never from request path name.

---

## 3) Chatbot toolset is missing alignment evidence tools

### Gap
Current tool list in plan lacks explicit tools for:
- group-level alignment aggregates
- child-level alignment evidence
- flag-evidence rationale

### Risk
The chatbot cannot explain *why* recommendations are made, especially for the most important quality signal (letter alignment).

### Recommended fix
Add dedicated tools (see full tool spec section below):
- `get_group_alignment_summary(group_id)`
- `get_child_alignment(group_id, participant_id)`
- `get_flag_evidence(group_id, flag_type)`

---

## 4) Threshold definitions are inconsistent across docs/components

### Gap
Not Following Letter Order (curriculum gaps) threshold appears as both:
- 1+ skipped letters
- 2+ skipped letters

### Risk
User trust problem: PM page, EA page, and chatbot can contradict each other.

### Recommended fix
Create one canonical threshold table used by:
- Django compute logic
- PM UI labels/tooltips
- EA AI prompts and chatbot explanations
- Documentation

---

## 5) Alignment score badge rule is currently too naive

### Gap
Proposed badge: "letter alignment score > 70%".

### Risk
Alignment score is context-sensitive (already known letters can lower score even with reasonable teaching). This may unfairly penalize EAs.

### Recommended fix
Use a composite unlock rule, for example:
- Group alignment average >= 70%
- AND no `skipping_needed` flag
- AND minimum assessed children threshold met (e.g. >= 5)
- AND sustained for X days/weeks

This keeps the badge fair and resilient to data gaps.

---

## Medium-priority gaps

- Tool input identifiers should be ID-based (`group_id`, `participant_id`), not names.
- Plan should define explicit "no data/unlinked data" chatbot behavior.
- "Why was I flagged?" evidence flow should be first-class in chatbot tools.
- `ea` role rollout steps should explicitly include all role unions and route protections.
- Badge logic needs persistence/audit model (unlock event history).

---

## Recommended chatbot tool contract (minimum viable set)

These tools should be callable by the AI via Vercel AI SDK tool-calling.

1. `get_me_context()`
- Returns EA profile, school, language preference, data freshness, linked status.

2. `list_my_groups()`
- Returns `group_id`, name, grade, phase, current progress, sessions this week, key flags.

3. `get_group_snapshot(group_id)`
- Returns current state plus pre-computed recommendations ("today plan", coaching tip).

4. `get_group_sessions(group_id, days=10)`
- Returns recent sessions with letters taught, attendance, notes.

5. `get_group_children(group_id)`
- Returns roster with `participant_id`, attendance summary, latest participation.

6. `get_child_profile(participant_id)`
- Returns attendance and progression context for one child.

7. `get_group_flags(group_id)`
- Returns active flags with severity and coaching-framed guidance.

8. `get_flag_evidence(group_id, flag_type)`
- Returns transitions, gaps, stagnation windows, threshold used, and evidence summary.

9. `get_group_alignment_summary(group_id)`
- Returns `alignment_avg_score`, `children_assessed`, `children_total`, `children_with_skips`,
  `flag_teaching_known`, `flag_skipping_needed`.

10. `get_child_alignment(group_id, participant_id)`
- Returns:
  - `letters_mastered`
  - `letters_needed`
  - `letters_taught`
  - `letters_skipped`
  - `teaching_known_letters`
  - `alignment_score`

11. `get_curriculum_rules(language, phase, topic)`
- Retrieves deterministic programme rules from source doc (not model memory guesswork).

12. `get_game_suggestions(language, phase, target_letters, group_size, materials)`
- Returns constrained game options grounded in programme guidance.

13. `get_precomputed_insights(date?)`
- Returns nightly insight payload with generation metadata (`ai_generated` vs `rule_based`).

14. `get_badges_and_progress()`
- Returns unlocked badges, progress-to-next, and evaluation timestamp.

---

## Chatbot behavior rules (non-negotiable)

1. Evidence first  
Every recommendation should cite retrieved evidence (sessions, flags, alignment data).

2. Curriculum guardrails  
Never suggest violating programme constraints (max new letters, review expectations).

3. Alignment nuance  
When explaining low alignment, mention assessed coverage and known-letter effects.

4. Missing-data transparency  
If assessments are missing or unlinked, state the limitation clearly and give next-best action.

5. Supportive coaching tone  
No punitive framing. Actionable, short, concrete guidance.

6. Language strategy  
English first is fine; ensure architecture supports isiXhosa output toggle later.

---

## Badge system design recommendations

## Badge categories

1) Consistency badges
- 30 consecutive workdays active
- 100 sessions completed
- 250 sessions completed

2) Quality badges
- Sustained review practice (few/no moving-too-fast signals)
- Sequence fidelity (no curriculum gaps over a window)
- Alignment strength (composite rule, not raw score only)

3) Growth badges
- Improvement relative to own 4-week baseline (not leaderboard comparison)

## Badge data model (recommended)

`EABadgeProgress`:
- `ea_id` / `teampact_user_id`
- `badge_key`
- `status` (`locked`, `unlocked`)
- `progress_current`
- `progress_target`
- `unlocked_at`
- `last_evaluated_at`
- `evidence_snapshot` (JSON)

## Badge evaluation cadence

- Nightly compute is sufficient for initial release
- Idempotent recalculation
- Explicit handling of backfills and late syncs
- Decide and document revocation policy:
  - "Once unlocked always unlocked" (recommended for motivation), or
  - revocable for ongoing badges

---

## Plan updates recommended in `ea-my-kids-plan.md`

1. Replace identity section with "email for mapping, ID for enforcement".
2. Normalize endpoint contracts to `/api/ea/me/*` only.
3. Expand chat tools list with alignment and flag evidence tools.
4. Add "data unavailable/unlinked handling" section for chatbot.
5. Add canonical threshold appendix (single source of truth).
6. Add badge model section with fairness constraints and data gates.
7. Add explicit RBAC rollout checklist for `ea` role in all role unions.

---

## Suggested acceptance criteria additions

Add these criteria to the Success Criteria section:

- EA data scoping is enforced by `teampact_user_id` in all API queries.
- Chatbot can explain each flag with concrete evidence payloads.
- Chatbot can answer child-level alignment questions for linked assessments.
- Threshold values shown in UI and chatbot responses match backend computations.
- Badge unlock logic is auditable and reproducible from stored evidence snapshots.
- Missing/unlinked data states are explicit and non-blocking.

---

## Suggested implementation order adjustment

Before current Phase 3 (AI chatbot), insert a prep sub-phase:

Phase 2.8 - AI Readiness and Contract Hardening
- finalize EA identity mapping table
- standardize `/api/ea/me/*` contracts
- expose alignment + flag evidence endpoints for EA scope
- define threshold constants shared by backend + prompt/tooling layer
- add "not linked" and "insufficient data" response schema

Then proceed with chatbot UI and tool wiring.

---

## Open decisions to resolve before coding chatbot

1. What is the authoritative key for EA mapping (`clerk_user_id` only vs email + clerk)?  
2. Which threshold is final for curriculum gap flag (1+ or 2+)?  
3. Minimum assessed-child threshold for alignment-driven advice/badges?  
4. Badge revocation policy?  
5. Should mentors later see the same evidence traces as EAs (with elevated scope)?

---

## Final recommendation

Proceed with the EA My Kids roadmap, but harden identity and evidence tooling first.  
If the chatbot can reliably access and explain letter-alignment and flag-evidence data, it will be substantially more useful, trusted, and coach-like for EAs from day one.

