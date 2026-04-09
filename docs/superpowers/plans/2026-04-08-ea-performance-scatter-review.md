# EA Performance Scatter Plan Review (Updated)

Date: 2026-04-08  
Plan reviewed: `docs/superpowers/plans/2026-04-08-ea-performance-scatter.md`

## Current Mobile Tabs

The current 4 mobile tabs in `components/pm/layout/pm-sidebar.tsx` are:

1. Overview
2. Schools
3. Sessions
4. Letter Progress

Reason: mobile renders `NAV_ITEMS.slice(0, 4)`.

## Updated Findings (with your constraints)

### High Priority

- Mobile tab behavior must be made explicit if Sessions should be excluded.
  - If you only add "Education Assistants" into `NAV_ITEMS`, `slice(0, 4)` behavior can produce an unintended set/order.
  - Recommended plan update: define a dedicated mobile tab list (explicit items), instead of relying on the first 4 desktop items.

- Backend metric should explicitly exclude check-in sessions in the new `ea_performance` endpoint.
  - Existing PM session logic excludes check-ins; this endpoint should match that to keep scatter X-axis comparable and avoid inflated dosage.
  - Add explicit excludes for `class_name` null/blank/check-in variants in the endpoint query.

- Two-repo delivery sequencing should be explicit in the plan.
  - This work spans `/Zazi_iZandi_Website_2025` (Django API) and `/zazi-izandi-nextjs` (frontend).
  - Add rollout order: backend implementation + deploy first, then frontend page and nav changes.

### Medium Priority

- Potential React key collisions in detail panel:
  - Planned key: `key={group.class_name}`
  - Safer key: include school/program + class (for stable uniqueness when names repeat).

- Query efficiency can be improved in the Django endpoint:
  - Current approach in the draft plan materializes large lists before filtering.
  - Prefer queryset-level filtering where possible to reduce Python-side work as data grows.

### Resolved/Accepted by Product Decision

- `summary.total_eas` can intentionally represent EAs plotted (with alignment), which is now aligned with your direction.

## Concrete Plan Edits to Add

1. Add a short "Delivery order" block before Task 1:
   - Backend endpoint + URL + verification + deploy
   - Frontend types/api/components/page
   - Final E2E check

2. In Task 1 endpoint code, include check-in exclusions:
   - exclude null/blank class
   - exclude class names containing `check-in` and `check in`

3. In Task 5 nav step, explicitly define mobile tabs without Sessions:
   - e.g. Overview, Schools, Education Assistants, Letter Progress
   - do not rely on `NAV_ITEMS.slice(0, 4)` for mobile behavior

4. In Task 3 detail panel, use a composite key for group rows.

5. In verification, include:
   - `npm run lint`
   - endpoint shape check for `/api/ea-performance/` (required keys and non-null invariants where expected)

