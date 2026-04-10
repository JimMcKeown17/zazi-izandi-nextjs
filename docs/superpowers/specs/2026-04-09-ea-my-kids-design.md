# EA "My Kids" Page — Design Spec

> Date: 2026-04-09
> Status: Approved
> Related: `documentation/ea-my-kids-plan.md`, `documentation/ea-my-kids-plan-review.md`

---

## Overview

A mobile-first, personalized experience for Education Assistants (EAs) to see their groups, children, letter mastery, session history, and coaching-framed quality tips. Reusable components also power a PM-facing EA detail view.

**Scope of this spec:** Phase 0 (backend prep) and Phase 1A–1D (frontend). AI features (insights, chatbot, badges) are deferred to future specs.

---

## 1. Identity & Data Scoping

### Clerk publicMetadata for EAs

```json
{
  "role": "ea",
  "teampact_user_id": 28764,
  "teampact_user_name": "Asemahle Mancayi"
}
```

- `teampact_user_id` is the numeric user ID from TeamPact's `/users` API
- TeamPact role `"coach"` = EA in our system
- `teampact_user_name` is for display/audit only — never used for data scoping
- EAs are preloaded into Clerk by an admin with their TeamPact user ID and email

### Role Hierarchy

```typescript
const ROLE_LEVELS: Record<Role, number> = {
  ea: 0,
  funder: 1,
  junior_staff: 2,
  senior_staff: 3,
  admin: 4
};
```

### Scoping Chain

1. Clerk session → read `teampact_user_id` from `publicMetadata`
2. Pass `teampact_user_id` to Django endpoint
3. Django filters `GroupSummary2026` by `ea_user_id`
4. If no `teampact_user_id` in metadata → "Account not linked" state
5. **Never** fall back to name matching or broader queries (fail closed)

### Backend Model Changes

`GroupSummary2026` gains two new fields:

| Field | Type | Source |
|---|---|---|
| `ea_user_id` | BigIntegerField (indexed, nullable) | From `TeampactSession2026.user_id` — the user with the most sessions for this group |
| `class_id` | BigIntegerField (indexed, nullable) | From `TeampactSession2026.class_id` — the TeamPact class ID |

Both populated in `compute_group_summaries_2026` from existing `TeampactSession2026` data using the same logic that currently derives `ea_name`.

### Data Validation Checks (Phase 0)

Before shipping, validate:

- EAs in TeamPact (role "coach") without email addresses
- EAs with sessions in `TeampactSession2026` whose `user_id` doesn't appear in TeamPact users API
- Groups where majority session creator (`ea_user_id`) doesn't match TeamPact `managers` list
- `GroupSummary2026` rows where `ea_name` resolves to a different `user_id` than expected
- Groups with no `class_id` resolvable from session data

These checks inform the future `/pm/data-quality` page (separate deliverable, not a blocker).

---

## 2. Route Structure & Layout

### Routes

```
/my-kids                                        → Overview (EA landing page)
/my-kids/groups/[class_id]                       → Group detail
/my-kids/profile                                 → (future)
/my-kids/chat                                    → (future, Phase 2+)

/pm/education-assistants                         → EA Performance Summary (existing scatter plot, renamed)
/pm/education-assistants/[user-id]               → EA detail (group cards, click-through from scatter plot panel)
/pm/education-assistants/[user-id]/groups/[class_id] → Group detail (PM view, shared components)
```

### Layout

`/my-kids/*` uses a **standalone layout** — no sidebar, no shared marketing site header.

Top bar:
- Zazi iZandi logo (small)
- EA name + school name
- Clerk UserButton (logout/profile)
- On detail pages: back arrow to overview

### Login Redirect

**Precedence (highest to lowest):**

1. **`redirect_url` query param** — if present in the login URL (set by `middleware.ts` when an unauthenticated user hits a protected route), the user is redirected there after login. This preserves deep-links: e.g., an EA opening `/my-kids/groups/67610` from a WhatsApp link lands on that specific group after signing in.
2. **Role-based default** — if no `redirect_url`, users with `role === 'ea'` redirect to `/my-kids`. Other roles use the existing default (home page or dashboard).
3. **Fallback** — if neither applies, land on `/`.

**Implementation note:** Clerk's `SignIn` component respects the `redirect_url` query param out of the box. The role-based default is applied via a custom post-login handler (or `afterSignInUrl` computed at request time). Do not override `redirect_url` when it is explicitly set by middleware.

### Route Protection

```typescript
const PROTECTED_ROUTES: Record<string, Role> = {
  "/schools": "funder",
  "/pm": "funder",
  "/my-kids": "ea"  // accessible to ea (0) and above
};
```

---

## 3. Django API Endpoints

### Trust Model

Django doesn't know about Clerk. Auth is handled by the **Next.js layer**: the server component reads `teampact_user_id` from Clerk session metadata (or from a URL param in PM flows) and calls Django with the concrete user ID. This matches the existing PM dashboard pattern (Next.js → Django server-to-server via `DJANGO_API_URL`, no forwarded auth).

**Security requirements** — because the EA endpoints expose child-level data (names, attendance, session notes), the trust boundary must be explicit:

1. **Django is never publicly accessible for these endpoints.** The Django API lives behind a service URL and is only reachable from the Next.js server (via the `DJANGO_API_URL` env var, server-side only — never exposed to the browser).
2. **Middleware gates access at the Next.js edge.** `/my-kids/*` and `/pm/education-assistants/*` are protected in `middleware.ts`. No unauthenticated request ever reaches the fetcher that calls Django.
3. **The Next.js server component is the sole caller.** All EA data fetching happens in server components (`lib/ea/api.ts`), never via client-side fetch or a Next.js proxy route. This means the `teampact_user_id` used for scoping is always resolved server-side from the authenticated Clerk session (EA view) or from a URL param guarded by `funder+` middleware (PM view).
4. **Service-level auth on Django is a future hardening step.** Phase 0 ships with the existing trust model (network isolation + `DJANGO_API_URL` as the sole access vector). Adding a shared-secret header or signed service token between Next.js and Django is tracked as a separate hardening task, not a Phase 0 blocker, but **must** be added before any public/partner access to the Django API is considered.
5. **Audit:** all Django views for these endpoints log `user_id` and `class_id` parameters so we can audit access if needed.


### `GET /api/ea/<user_id>/`

**Returns:** EA profile + array of group summaries for this EA.

**Response:**
```json
{
  "ea_name": "Asemahle Mancayi",
  "primary_school": "Canzibe Primary School",
  "teampact_user_id": 28764,
  "last_updated": "2026-04-09T02:00:00Z",
  "groups": [
    {
      "class_id": 67610,
      "group_name": "Asemahle Mancayi-Letters-Group 1",
      "school_name": "Canzibe Primary School",
      "grade": "Grade R",
      "phase": "letters",
      "children_count": 7,
      "current_letter": "i",
      "progress_index": 2,
      "progress_pct": 11.5,
      "sessions_this_week": 4,
      "total_sessions": 18,
      "last_session_date": "2026-04-09",
      "dosage_status": "on_track",
      "flags": ["moving_too_fast"],
      "language": "isiXhosa"
    },
    {
      "class_id": 67620,
      "group_name": "Asemahle Mancayi-Blending-Group 1",
      "school_name": "Canzibe Primary School",
      "grade": "Grade 1",
      "phase": "blending",
      "children_count": 7,
      "sessions_this_week": 3,
      "total_sessions": 12,
      "blending_start_date": "2026-03-18",
      "last_session_date": "2026-04-09",
      "dosage_status": "on_track",
      "flags": [],
      "language": "isiXhosa"
    }
  ]
}
```

**Notes on multi-school EAs:**
- `primary_school` at the top level is the school with the most sessions (for the top bar display)
- Each group carries its own `school_name` (required — some EAs teach across multiple programs)
- The overview page shows school name on each card when an EA has groups across multiple schools (suppressed when they're all at one school to reduce clutter)

**Usage:**
- EA view: Next.js reads `teampact_user_id` from Clerk metadata → calls `/api/ea/<user_id>/`
- PM view: Next.js reads `user_id` from URL param → calls same endpoint (requires `funder+` role check in Next.js middleware)

### `GET /api/ea/<user_id>/groups/<class_id>/`

**Returns:** Group detail including children, recent sessions, and letter mastery. Returns 404 if `class_id` doesn't belong to this EA's groups.

**Response:**
```json
{
  "class_id": 67610,
  "group_name": "Asemahle Mancayi-Letters-Group 1",
  "school_name": "Canzibe Primary School",
  "grade": "Grade R",
  "phase": "letters",
  "language": "isiXhosa",
  "progress": {
    "current_letter": "i",
    "progress_index": 2,
    "progress_pct": 11.5
  },
  "dosage_status": "on_track",
  "sessions_this_week": 4,
  "total_sessions": 18,
  "flags": ["moving_too_fast"],
  "children": [
    {
      "participant_id": 351499,
      "name": "Natalie Chivasa",
      "sessions_attended": 12,
      "sessions_total": 14,
      "attendance_rate": 0.86,
      "last_attended": "2026-04-09"
    }
  ],
  "recent_sessions": [
    {
      "session_id": 4451630,
      "date": "2026-04-09",
      "letters_taught": ["a", "u"],
      "attendance_count": 6,
      "attendance_total": 7,
      "notes": "Covered A and U, reviewed O and I. Played hopscotch and snap",
      "attendees": [
        {"participant_id": 351499, "name": "Natalie Chivasa", "present": true},
        {"participant_id": 439556, "name": "Iminathi Joe", "present": false}
      ]
    }
  ],
  "letter_mastery": [
    {
      "letter": "a",
      "children_mastered": 6,
      "children_total": 7,
      "mastery_pct": 86,
      "sessions_taught": 5
    },
    {
      "letter": "e",
      "children_mastered": 5,
      "children_total": 7,
      "mastery_pct": 71,
      "sessions_taught": 4
    },
    {
      "letter": "i",
      "children_mastered": 3,
      "children_total": 7,
      "mastery_pct": 43,
      "sessions_taught": 3
    },
    {
      "letter": "o",
      "children_mastered": 1,
      "children_total": 7,
      "mastery_pct": 14,
      "sessions_taught": 0
    }
  ]
}
```

**Notes:**
- `letter_mastery` is aggregated from `ChildLetterAlignment2026` per group per letter
- `recent_sessions` returns last 10 sessions, newest first
- `attendees` in each session is available but hidden by default in the UI (expand on tap)
- Letter mastery array follows the language-appropriate letter sequence
- Letters with no assessment data and no sessions taught are omitted
- Both endpoints are used by EA view and PM view — the only difference is how Next.js resolves the `user_id` (from Clerk metadata vs URL param)

---

## 4. Overview Page (`/my-kids`)

### Data Flow

Server component reads `teampact_user_id` from Clerk session metadata, then calls Django `/api/ea/<user_id>/` at request time (no ISR cache — user-specific data).

### Page Structure

```
┌─────────────────────────────────┐
│ [logo]  Asemahle · Canzibe PS  │  ← top bar
├─────────────────────────────────┤
│ My Groups                       │
│ Wednesday, 9 April 2026         │
│ Last updated: 2 hours ago       │  ← subtle, only if stale
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Group 1 (Grade R)           │ │
│ │ a─e─i─[●]──────────────── │ │  ← progress bar
│ │ 12% · 4 sessions · 7 kids  │ │
│ │ ✅ On track                  │ │
│ │ 💡 Only 3/7 children know   │ │  ← coaching tip
│ │    'i' — keep reviewing it  │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Group 6 (Grade 1, Blending) │ │
│ │ 🔤 Blending                 │ │  ← phase badge
│ │ ████████░░░░░ 12/50 sessions│ │  ← session bar
│ │ 3 this week · 7 kids        │ │
│ │ ✅ On track                  │ │
│ └─────────────────────────────┘ │
│                                 │
│ ... more group cards            │
└─────────────────────────────────┘
```

### Letter-Phase Card Elements

1. Group name + grade
2. Simple progress bar (position on 26-letter sequence)
3. Progress percentage · sessions this week · children count
4. Status badge (on track / needs attention / low dosage)
5. Coaching tip (reframed quality flag — friendly icon, kind wording)

### Blending Card Elements

1. Group name + grade
2. "Blending" phase badge
3. Session progress bar (capped at 50)
4. Sessions this week · children count
5. Status badge

### Coaching Tip Mapping

| Backend Flag | EA Sees |
|---|---|
| `moving_too_fast` | 💡 Try spending a few more sessions on each letter before moving on |
| `stagnation` | 💡 This group has been on the same letter for a while — try a different game |
| `curriculum_gaps` | 💡 Some letters may have been skipped — consider going back to review |
| `ghost_group` | 💡 This group hasn't had a session recently — try to schedule one soon |
| No flags | No tip shown |

When multiple flags apply, show the most important one on the overview card: `ghost_group` > `moving_too_fast` > `curriculum_gaps` > `stagnation`.

---

## 5. Group Detail Page (`/my-kids/groups/[class_id]`)

### Data Flow

Server component reads `teampact_user_id` from Clerk session metadata, then calls Django `/api/ea/<user_id>/groups/<class_id>/` at request time.

### Page Structure — Four Sections

#### Section 1: Header + Coaching Tips

- Back arrow → returns to overview
- Group name, grade, school
- Sessions this week · children count · status badge
- **All** applicable coaching tips shown (not just the top one)

#### Section 2: Letter Mastery Path

The "average group mastery tracker" visualization:

- Each letter in the language-appropriate sequence shown as a rounded square
- Color-coded by mastery percentage:
  - Green (>70%) — most children know this letter
  - Orange (30-70%) — some children know it
  - Red (<30%) — few children know it
  - Grey — not assessed / no data
- Mastery percentage shown above each letter
- Blue dots below each letter = number of sessions taught
- Legend: dots = sessions taught

**No-assessment fallback:** All letters show as grey with session dots only. Note: "Assessment data will appear here after assessments are completed."

**Blending groups:** This section is hidden for blending-phase groups.

#### Section 3: Children

- Sorted by attendance rate, lowest first (surface those who need attention)
- Each row: name, sessions attended/total, attendance percentage, last attended date
- ⚠ indicator for low attendance or haven't attended recently

#### Section 4: Recent Sessions

- Last 10 sessions, newest first
- Each session shows: date, letters taught, attendance count
- EA's session notes (if any)
- Per-child attendance hidden by default, expandable on tap

---

## 6. PM View of EA Data

### Entry Point

The existing `/pm/education-assistants` page (scatter plot) is renamed to **"EA Performance Summary"** in the sidebar/title.

When a PM clicks a dot on the scatter plot, the existing detail panel below is **enhanced** with:

**Kept from current panel:**
- EA name + school
- Sessions/day badge + alignment % badge
- Summary stats: groups, total sessions, children, active flags
- Group list with flag pills (raw flag names — useful for PM quick-scanning)

**Added:**
- Progress bar on each group row
- Status badge per group
- Each group row is clickable → navigates to `/pm/education-assistants/[user-id]/groups/[class_id]`

### PM Group Detail Page

`/pm/education-assistants/[user-id]/groups/[class_id]`

- Lives inside the PM layout (with sidebar)
- Renders the **same components** as `/my-kids/groups/[class_id]`
- Shows coaching-framed language (same as EA view)
- Data fetched from `/api/ea/<user_id>/groups/<class_id>/`

### Shared Components

The following components are data-driven and context-agnostic — they work in both `/my-kids` and `/pm/`:

- `GroupCard` — overview card with progress bar, status, coaching tip
- `GroupDetail` — full detail view (header, mastery path, children, sessions)
- `LetterMasteryPath` — mastery visualization
- `ChildrenList` — attendance table
- `RecentSessions` — session history with expandable attendance
- `CoachingTip` — flag → friendly language translator

---

## 7. Edge States

| State | Where | What the user sees |
|---|---|---|
| **Not linked** — no `teampact_user_id` in metadata | `/my-kids` | "Your account isn't linked to your teaching profile yet. Please contact your programme manager." |
| **Zero groups** — linked but no groups in GroupSummary | `/my-kids` | "No groups yet — your groups will appear here once you start teaching." |
| **Stale data** — nightly compute is old | `/my-kids` | Subtle text: "Last updated: 14 hours ago" |
| **No assessments** — group has no alignment data | Group detail | Letter mastery path shows session-only view (grey letters, dots only). Note about assessments. |
| **Multiple schools** — EA in groups across programs | `/my-kids` | Groups from all schools shown. `school_name` displayed on each group card (suppressed when all groups are at the same school to reduce clutter). Top bar shows `primary_school` (the school with most sessions). |
| **Backend unavailable** — API error/timeout | `/my-kids` | "We're having trouble loading your data. Please try again in a few minutes." |
| **Invalid group** — class_id not found or not this EA's (EA view) | `/my-kids/groups/[class_id]` | Redirect to `/my-kids`. |
| **Invalid group** — class_id not found or not this EA's (PM view) | `/pm/education-assistants/[user-id]/groups/[class_id]` | Redirect to `/pm/education-assistants/[user-id]` (back to the PM's EA detail view, not to `/my-kids`). |
| **Staff with no EA link** — PM visits `/my-kids` | `/my-kids` | Same as "not linked" state. |

---

## 8. Implementation Phases

### Phase 0: Backend Prep (Django)

*Prerequisite — must complete before any frontend work.*

1. Add `ea_user_id` (BigIntegerField, indexed, nullable) to `GroupSummary2026`
2. Add `class_id` (BigIntegerField, indexed, nullable) to `GroupSummary2026`
3. Update `compute_group_summaries_2026` to populate both fields
4. Add group-level letter mastery aggregation (aggregate `ChildLetterAlignment2026` per group per letter, combine with session letter counts)
5. Build `GET /api/ea/<user_id>/` endpoint (EA overview — used by both EA and PM views)
6. Build `GET /api/ea/<user_id>/groups/<class_id>/` endpoint (group detail — used by both EA and PM views)
7. Run data validation checks (see Section 1)
8. Run nightly compute, verify data correctness

### Phase 1A: Auth & Routing (Next.js)

1. Add `ea: 0` to role hierarchy in `middleware.ts` and `header.tsx`
2. Preload EA accounts in Clerk with `teampact_user_id` in publicMetadata
3. Add `/my-kids` to protected routes (minimum role: `ea`)
4. Add EA login redirect to `/my-kids`
5. Create standalone `/my-kids` layout (top bar, no sidebar)
6. Build "not linked" and "backend error" edge states

### Phase 1B: Overview Page

1. Create `lib/ea/api.ts` with server-side fetcher for `/api/ea/<user_id>/` (reads `teampact_user_id` from Clerk session)
2. Build `GroupCard` component (letter-phase variant)
3. Build `GroupCard` component (blending variant with session bar capped at 50)
4. Build coaching tip translator (flag → friendly language + icon)
5. Build `/my-kids/page.tsx` server component
6. Edge states: zero groups, stale data
7. Mobile-first responsive design and testing

### Phase 1C: Group Detail Page

1. Add server-side fetcher for `/api/ea/<user_id>/groups/<class_id>/`
2. Build `LetterMasteryPath` component (mastery colors + session dots + no-assessment fallback)
3. Build `ChildrenList` component (sorted by attendance, ⚠ indicators)
4. Build `RecentSessions` component (expandable per-child attendance)
5. Build detail header with all coaching tips
6. Build `/my-kids/groups/[class_id]/page.tsx` server component
7. Back navigation to overview
8. Mobile-first responsive design and testing

### Phase 1D: PM View of EA Data

1. Rename existing EA page title to "EA Performance Summary"
2. Enhance scatter plot detail panel (progress bars, status badges, clickable group rows)
3. Build `/pm/education-assistants/[user-id]/page.tsx` — reuses `GroupCard` components
4. Build `/pm/education-assistants/[user-id]/groups/[class_id]/page.tsx` — reuses `GroupDetail` components
5. Add fetchers for `/api/ea/<user_id>/` and `/api/ea/<user_id>/groups/<class_id>/`
6. Wire scatter plot dot click → enhanced panel → group detail navigation

### Phase 2+: AI Features (Future — Separate Spec)

**Pre-Computed AI Insights:**
- Nightly `generate_ea_insights` management command (Claude Haiku)
- `EADailyInsight` model
- Coaching tips and "Today's Plan" surface on overview cards and group detail

**AI Chatbot:**
- Vercel AI SDK with tool-calling
- Separate spec document when the time comes

**AI Principles (non-negotiable):**
1. All recommendations must cite retrieved evidence
2. Never suggest violating programme rules (max 2 new letters, review expectations, letter sequence)
3. When data is missing, state the limitation clearly
4. Supportive coaching tone always
5. English first, architecture supports isiXhosa toggle later

---

## 9. Related Work (Not In Scope)

- **`/pm/data-quality` page** — exportable lists of unmatched children, unassessed groups, groups with >12 kids, EAs without groups. Informed by Phase 0 validation checks. Separate deliverable.
- **Badge system** — motivational badges for EAs. Deferred to post-Phase 2.
- **Child-level mastery capture** — digitizing LKPT. Deferred to Phase 4.
- **isiXhosa translations** — future toggle for UI and AI responses.
- **PWA / offline support** — future enhancement for rural connectivity.
