# Follow-up: scope session-review alerts by the ECD/Primary filter

**Status:** deferred to merge-time (decided 2026-08-20)
**Origin:** adversarial-review round 2, finding M3
**Owner:** whoever integrates `feat/mobile-school-type-filter` with the
`session-review-alerts` feature.

## The gap

The mobile-app Sessions page (`app/mobile-app/sessions/page.tsx`) now filters the
activity report, charts, heatmap, and school table by **school type**
(ECD / Primary). The session-review **alerts** panel on the same page is fetched
by `getMobileSessionReviewFlags({ schoolId })` — it takes only `schoolId`, not
`schoolType`.

Consequently, on a page filtered to (say) ECD, the review-alert panel can render
Primary-school flags above ECD-only charts. This can send staff to investigate
records outside the scope they selected.

## Why it was deferred, not fixed here

The review-flags stack lives on a **separate, concurrent, unmerged branch**:

- Django endpoint `/api/mobile/session-review-flags/` and its Supabase RPC are on
  `fix/session-review-flags` (Django) — **not** in this feature's Django worktree
  (`feat/reporting-school-type-filter`).
- The Next.js side (`session-review-alerts`, `sessions-page-content`, the
  review-flags request/schema/response) is on `fix/session-review-alerts`, which
  this branch was rebased onto.

Threading `school_type` through the alerts path would mean editing another active
session's unmerged work. Both features are unmerged, so the natural integration
point is when they land on their respective `main` branches.

## What to do at merge-time

Thread `school_type` end-to-end through the alerts path, mirroring the reporting
RPCs' contract exactly:

1. **Supabase**: add `p_school_type TEXT` (non-defaulted 4-arg overload, same
   expand/contract pattern) to the session-review-flags RPC; apply the same
   normalized type filter; echo the applied `school_type`.
2. **Django**: parse/validate `school_type` (ecd/primary/null) on
   `/api/mobile/session-review-flags/`, forward it to the RPC, and **fail closed**
   on an echo mismatch (same as `_validate_sessions_activity_payload`).
3. **Next.js**: add `schoolType` to `MobileSessionReviewFlagsFilters`, decode the
   echo in the review-flags schema, and verify it (same `(echo ?? null) !==
   requested` fail-closed check used in `decodeMobileSessionsActivityResponse`).
   Pass `schoolType` from the page to `getMobileSessionReviewFlags`.

Alternative if the product decision is that data-quality alerts are intentionally
cross-school: make that explicit in the UI (label the panel's global scope) and
stop scoping it by `schoolId` too, rather than leaving it partially scoped.
