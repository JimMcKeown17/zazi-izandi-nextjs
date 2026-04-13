# EA My Kids — Phase 1B: Overview Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Phase 1A stub on `/my-kids` with a real overview page that fetches from Django `/api/ea/<user_id>/` and renders group cards showing letter progress, session counts, status badges, and coaching tips.

**Architecture:** Server-side data fetching via a `React.cache()`-wrapped fetcher so both `layout.tsx` (needs EA name + school for the top bar) and `page.tsx` (needs the groups array) can call the same function without a duplicate HTTP request. Components are server-renderable (no `"use client"` needed — the cards are display-only in Phase 1B; Phase 1C adds interactivity via `<Link>` wrappers). All coaching-tip copy respects the mastery-data limitations in `documentation/letter-mastery-data-model.md` — tips reference teaching behaviour, never claim children aren't learning.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Lucide icons, `djangoFetch` helper (from Phase 0), `React.cache()` for request-level dedup.

**Related spec:** `docs/superpowers/specs/2026-04-09-ea-my-kids-design.md` (Section 4 — Overview Page, Section 7 — Edge States, Phase 1B in Section 8).

**Prerequisite:** Phase 1A deployed and verified (role hierarchy, `/my-kids` route protection, standalone layout, `NotLinkedState` edge state, `MyKidsTopBar` component). Django endpoints `/api/ea/<user_id>/` live in production (Phase 0).

**Phases not covered:** 1C (Group Detail Page), 1D (PM View of EA Data). Each is a separate plan.

---

## Scope and Ordering

Phase 1B is organized into three groups:

1. **Data layer** (Tasks 1–2) — shared types and the `React.cache()`-wrapped server-side fetcher.
2. **UI components** (Tasks 3–6) — coaching tip translator, group card (letter-phase + blending variants), edge-state components.
3. **Page wiring + deploy** (Tasks 7–10) — update `layout.tsx` for school name, replace `page.tsx` stub, manual smoke test, merge and deploy.

Each task produces a self-contained, independently testable piece. Tasks 1–6 create leaf files with no side effects; Tasks 7–8 wire them into the existing app shell.

**Deliberately deferred to Phase 1C:**

- `<Link>` wrapping on `GroupCard` (clicking a card to navigate to group detail). Cards are display-only in 1B.
- `/my-kids/groups/[class_id]/page.tsx` — the group detail page itself.
- `LetterMasteryPath` component — the stepping-stones mastery visualization.
- `ChildrenList` and `RecentSessions` components.

---

## File Structure

### Next.js project (`/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs`)

**Create:**

- `lib/ea/types.ts` — TypeScript types for the EA API response (`EaOverviewResponse`, `EaGroup`, `EaMetadata`). Consolidates the `EaMetadata` type currently duplicated inline in `app/my-kids/layout.tsx` and `app/my-kids/page.tsx`.
- `lib/ea/api.ts` — Server-side fetcher wrapping `djangoFetch` with `React.cache()` for request-level dedup. Exports `getEaOverview(userId)`.
- `components/my-kids/coaching-tip.tsx` — Coaching tip translator. Maps backend flag names to EA-friendly icons + copy. Exports `CoachingTip` component and `getTopFlag()` priority selector.
- `components/my-kids/group-card.tsx` — `GroupCard` component rendering both letter-phase and blending variants. Reads `phase` field to determine which layout to render.
- `components/my-kids/zero-groups-state.tsx` — "No groups yet" edge state UI.
- `components/my-kids/backend-error-state.tsx` — "We're having trouble loading your data" edge state UI.

**Modify:**

- `app/my-kids/layout.tsx` — Replace Clerk-only session read with `getEaOverview()` call to populate `schoolName` in `MyKidsTopBar`. Graceful fallback when API fails (show "Welcome" without school, let the page handle the error state).
- `app/my-kids/page.tsx` — Replace Phase 1A stub with real overview page: call `getEaOverview()`, handle zero-groups and backend-error edge states, render `GroupCard` list with coaching tips, show stale-data warning when `last_updated` is old.

**No file changes outside `lib/ea/`, `components/my-kids/`, `app/my-kids/`, or `e2e/`.** Phase 1B doesn't touch middleware, login, header, or Django.

---

## Django API Response Reference

The plan references two response shapes from `GET /api/ea/<user_id>/`:

### Letter-phase group

```json
{
  "class_id": 67982,
  "group_name": "Shadey Africander-Letters-Group 1",
  "school_name": "Abraham Levy Primary School",
  "grade": "Grade R",
  "phase": "letters",
  "children_count": 7,
  "sessions_this_week": 0,
  "total_sessions": 5,
  "last_session_date": "2026-03-19",
  "avg_sessions_per_week": 1.92,
  "flags": ["curriculum_gaps", "ghost_group"],
  "language": "English",
  "current_letter": "j",
  "progress_index": 21,
  "progress_pct": 84.6
}
```

### Blending-phase group

```json
{
  "class_id": 68464,
  "group_name": "Jamie-Lee Adams-Blending-Group 1",
  "school_name": "Astra Primary School",
  "grade": "Grade 1",
  "phase": "blending",
  "children_count": 5,
  "sessions_this_week": 0,
  "total_sessions": 3,
  "last_session_date": "2026-03-25",
  "avg_sessions_per_week": 1.5,
  "flags": ["ghost_group"],
  "language": "English",
  "blending_start_date": "2026-03-18"
}
```

### Top-level wrapper

```json
{
  "ea_name": "Shadey Africander",
  "primary_school": "Abraham Levy Primary School",
  "teampact_user_id": 28739,
  "last_updated": "2026-04-10T19:20:13.182730+00:00",
  "groups": [ /* array of letter-phase and/or blending-phase groups */ ]
}
```

### Available flags (overview endpoint)

`moving_too_fast`, `stagnation`, `curriculum_gaps`, `ghost_group`. These are group-level teaching-behaviour flags. Per-child alignment flags (`teaching_known`, `skipping_needed`) are only in the group-detail endpoint and are NOT used in Phase 1B.

---

## Task 1: Shared types (`lib/ea/types.ts`)

**Goal:** Single source of truth for EA API types. Consolidates the inline `EaMetadata` from Phase 1A and adds the full API response types.

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/lib/ea/types.ts`

- [ ] **Step 1: Create the file**

```typescript
export type EaMetadata = {
  role?: string;
  teampact_user_id?: number;
  teampact_user_name?: string;
};

export type EaFlag =
  | "moving_too_fast"
  | "stagnation"
  | "curriculum_gaps"
  | "ghost_group";

export interface EaGroupBase {
  class_id: number | null;
  group_name: string;
  school_name: string;
  grade: string;
  phase: "letters" | "blending";
  children_count: number;
  sessions_this_week: number;
  total_sessions: number;
  last_session_date: string | null;
  avg_sessions_per_week: number;
  flags: EaFlag[];
  language: string;
}

export interface EaLetterGroup extends EaGroupBase {
  phase: "letters";
  current_letter: string;
  progress_index: number;
  progress_pct: number;
}

export interface EaBlendingGroup extends EaGroupBase {
  phase: "blending";
  blending_start_date: string | null;
}

export type EaGroup = EaLetterGroup | EaBlendingGroup;

export interface EaOverviewResponse {
  ea_name: string;
  primary_school: string;
  teampact_user_id: number;
  last_updated: string | null;
  groups: EaGroup[];
}
```

**Design notes:**

- `EaGroup` is a discriminated union on `phase`. This lets TypeScript narrow correctly: `if (group.phase === "letters") { group.current_letter }` works without casting.
- `EaFlag` is a string literal union matching the exact flag names the Django view produces. This lets the coaching-tip translator be exhaustive.
- `EaMetadata` is the same type that was inline in Phase 1A's `layout.tsx` and `page.tsx` — those files will import it in Tasks 7 and 8.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors. The file is pure types — no runtime code, no imports.

- [ ] **Step 3: Commit**

```bash
git add lib/ea/types.ts
git commit -m "feat(ea): add shared types for EA API response"
```

---

## Task 2: Server-side fetcher (`lib/ea/api.ts`)

**Goal:** A `React.cache()`-wrapped fetcher that both `layout.tsx` and `page.tsx` can call within the same request without making duplicate HTTP calls to Django.

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/lib/ea/api.ts`

- [ ] **Step 1: Create the file**

```typescript
import { cache } from "react";
import { djangoFetch } from "@/lib/django-fetch";
import type { EaOverviewResponse } from "./types";

export type EaOverviewResult =
  | { ok: true; data: EaOverviewResponse }
  | { ok: false; error: string };

export const getEaOverview = cache(
  async (userId: number): Promise<EaOverviewResult> => {
    try {
      const res = await djangoFetch(`/api/ea/${userId}/`, {
        cache: "no-store",
      });

      if (!res.ok) {
        return { ok: false, error: `Django returned ${res.status}` };
      }

      const data: EaOverviewResponse = await res.json();
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
);
```

**Design notes:**

- `React.cache()` memoises by argument (`userId`) within a single server-request lifecycle. Both `layout.tsx` and `page.tsx` calling `getEaOverview(28739)` in the same render produces ONE HTTP call to Django.
- `cache: "no-store"` prevents Next.js from caching user-specific data across requests. EA data changes nightly (compute runs) and the EA should see their latest groups on every page load.
- The result type is a discriminated union (`ok: true | false`) so consumers can branch without try/catch. This follows the "result type" pattern used in the PM dashboard (`ProgrammeOverviewResult` in `lib/pm/api.ts`).
- The Django `ea_detail_overview` view always returns 200 with a `groups` array — even when the EA has no groups (it returns `groups: []`). The view never 404s on "no groups." So any non-200 response is a genuine error. The page treats `groups.length === 0` as the "zero groups" edge state.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/ea/api.ts
git commit -m "feat(ea): add server-side EA overview fetcher with React.cache dedup"
```

---

## Task 3: Coaching tip translator (`components/my-kids/coaching-tip.tsx`)

**Goal:** Translate raw backend flag names into EA-friendly coaching tips with kind wording and icons. Exports both a `CoachingTip` component (renders one tip) and a `getTopFlag()` function (selects the most important flag from a list, for overview cards that show only one tip).

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/my-kids/coaching-tip.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { Lightbulb } from "lucide-react";
import type { EaFlag } from "@/lib/ea/types";

const FLAG_TIPS: Record<EaFlag, string> = {
  ghost_group:
    "This group hasn\u2019t had a session recently \u2014 try to schedule one soon",
  moving_too_fast:
    "Try spending a few more sessions on each letter before moving on",
  curriculum_gaps:
    "Some letters may have been skipped \u2014 consider going back to review",
  stagnation:
    "This group has been on the same letter for a while \u2014 try a different game",
};

const FLAG_PRIORITY: EaFlag[] = [
  "ghost_group",
  "moving_too_fast",
  "curriculum_gaps",
  "stagnation",
];

export function getTopFlag(flags: EaFlag[]): EaFlag | null {
  for (const f of FLAG_PRIORITY) {
    if (flags.includes(f)) return f;
  }
  return null;
}

export function CoachingTip({ flag }: { flag: EaFlag }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
      <span>{FLAG_TIPS[flag]}</span>
    </div>
  );
}
```

**Design notes:**

- The copy is verbatim from design spec § 4 "Coaching Tip Mapping". The spec uses emoji (💡) but we use the Lucide `Lightbulb` icon for consistency with the rest of the codebase's icon system.
- Unicode `\u2019` (right single quote) and `\u2014` (em dash) avoid JSX `&apos;` / `&mdash;` entity gymnastics in component code.
- `FLAG_PRIORITY` order matches the spec: `ghost_group > moving_too_fast > curriculum_gaps > stagnation`.
- `getTopFlag()` is a pure function, not a hook — it can be called in both server and client components.
- The tip styling (`bg-amber-50`, `text-amber-800`) is deliberately warm and non-alarming — EAs read this on mobile and the tone should be supportive, not critical.
- **Mastery-data constraint:** None of these tips make claims about what children know or don't know. They reference the EA's teaching behaviour only (session frequency, letter pacing, curriculum coverage). This is the only safe coaching signal per `documentation/letter-mastery-data-model.md`.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/my-kids/coaching-tip.tsx
git commit -m "feat(my-kids): add coaching tip translator component"
```

---

## Task 4: GroupCard component (`components/my-kids/group-card.tsx`)

**Goal:** The main visual element of the overview page. Renders both letter-phase and blending variants from a single component that branches on `group.phase`. Display-only in Phase 1B (no click-through to group detail — that's Phase 1C).

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/my-kids/group-card.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { BookOpen, Layers } from "lucide-react";
import type { EaGroup } from "@/lib/ea/types";
import { CoachingTip, getTopFlag } from "./coaching-tip";

function StatusBadge({ flags }: { flags: string[] }) {
  if (flags.includes("ghost_group")) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        Low dosage
      </span>
    );
  }
  if (
    flags.includes("moving_too_fast") ||
    flags.includes("stagnation") ||
    flags.includes("curriculum_gaps")
  ) {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
        Needs attention
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
      On track
    </span>
  );
}

function LetterProgressBar({
  progressPct,
  currentLetter,
}: {
  progressPct: number;
  currentLetter: string;
}) {
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span>Letter progress</span>
        <span className="font-medium text-slate-700">
          {Math.round(progressPct)}% · letter {currentLetter}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(progressPct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function BlendingSessionBar({
  totalSessions,
}: {
  totalSessions: number;
}) {
  const cap = 50;
  const pct = Math.min((totalSessions / cap) * 100, 100);
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span className="flex items-center gap-1">
          <Layers className="h-3 w-3" />
          Blending
        </span>
        <span className="font-medium text-slate-700">
          {totalSessions}/{cap} sessions
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-violet-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface GroupCardProps {
  group: EaGroup;
  showSchoolName?: boolean;
}

export function GroupCard({ group, showSchoolName = false }: GroupCardProps) {
  const topFlag = getTopFlag(group.flags);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-900">
            {group.group_name}
          </h2>
          <p className="text-xs text-slate-500">
            {group.grade}
            {showSchoolName ? ` · ${group.school_name}` : ""}
          </p>
        </div>
        <StatusBadge flags={group.flags} />
      </div>

      {group.phase === "letters" ? (
        <LetterProgressBar
          progressPct={group.progress_pct}
          currentLetter={group.current_letter}
        />
      ) : (
        <BlendingSessionBar totalSessions={group.total_sessions} />
      )}

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <BookOpen className="h-3 w-3" />
          {group.sessions_this_week} this week
        </span>
        <span>{group.total_sessions} total</span>
        <span>{group.children_count} kids</span>
      </div>

      {topFlag ? <CoachingTip flag={topFlag} /> : null}
    </article>
  );
}
```

**Design notes:**

- **Discriminated union branching:** `group.phase === "letters"` narrows TypeScript so `group.current_letter` and `group.progress_pct` are available on the `EaLetterGroup` branch. The `BlendingSessionBar` only accesses `group.total_sessions` which is on `EaGroupBase`, so it works for both phases.
- **`showSchoolName` prop:** Design spec § 7 says when an EA has groups across multiple schools, `school_name` is shown on each card. When all groups are at the same school, it's suppressed to reduce clutter. The page (Task 8) computes this flag and passes it down.
- **Progress bar colors:** `bg-primary` (blue, #2c5aa0) for letter progress, `bg-violet-500` for blending. This visual differentiation helps EAs quickly distinguish the two phases.
- **Session bar capped at 50:** The spec says "session progress bar (capped at 50)". `Math.min((totalSessions / 50) * 100, 100)` ensures the bar never exceeds 100%.
- **Status badge mapping:**
  - `ghost_group` → "Low dosage" (amber — most urgent, the EA hasn't held a session recently)
  - Other quality flags → "Needs attention" (yellow — less urgent, it's about letter pacing)
  - No flags → "On track" (green)
- **Coaching tip:** Only the top-priority flag is shown on the overview card (per spec: "When multiple flags apply, show the most important one on the overview card"). Phase 1C's group detail page shows ALL coaching tips.
- **No `<Link>` wrapper.** The card renders as an `<article>` (semantic, no interactivity). Phase 1C wraps it in `<Link href={...}>` to enable navigation to the group detail page.
- **No `"use client"` directive.** Everything here is static render — no hooks, no event handlers, no browser APIs. This is a server component.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/my-kids/group-card.tsx
git commit -m "feat(my-kids): add GroupCard component (letter-phase + blending variants)"
```

---

## Task 5: Edge-state components

**Goal:** Two small components for the "zero groups" and "backend error" edge states from design spec § 7.

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/my-kids/zero-groups-state.tsx`
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/my-kids/backend-error-state.tsx`

- [ ] **Step 1: Create the zero-groups component**

```typescript
import { Users } from "lucide-react";

export function ZeroGroupsState() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <Users className="h-8 w-8 text-slate-400" aria-hidden="true" />
      </div>
      <h1 className="mb-2 text-xl font-semibold text-slate-900">
        No groups yet
      </h1>
      <p className="text-sm leading-relaxed text-slate-600">
        Your groups will appear here once you start teaching.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create the backend-error component**

```typescript
import { AlertTriangle } from "lucide-react";

export function BackendErrorState() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
      </div>
      <h1 className="mb-2 text-xl font-semibold text-slate-900">
        Something went wrong
      </h1>
      <p className="text-sm leading-relaxed text-slate-600">
        We&apos;re having trouble loading your data. Please try again in a few
        minutes.
      </p>
    </div>
  );
}
```

**Copy notes:**

- Zero groups: "No groups yet — your groups will appear here once you start teaching." Verbatim from spec § 7.
- Backend error: "We're having trouble loading your data. Please try again in a few minutes." Verbatim from spec § 7.
- Neither component uses `"use client"` — purely declarative, no hooks.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add components/my-kids/zero-groups-state.tsx components/my-kids/backend-error-state.tsx
git commit -m "feat(my-kids): add zero-groups and backend-error edge-state components"
```

---

## Task 6: Update `layout.tsx` — wire up school name from API

**Goal:** The layout currently reads only `teampact_user_name` from Clerk session claims. Phase 1B needs `primary_school` from the Django API for the top bar. The layout calls `getEaOverview()` (which `React.cache()` will dedup with the page's call in Task 7) and passes the school name to `MyKidsTopBar`.

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/app/my-kids/layout.tsx`

- [ ] **Step 1: Replace the layout contents**

Replace the entire file with:

```typescript
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { MyKidsTopBar } from "@/components/my-kids/top-bar";
import { getEaOverview } from "@/lib/ea/api";
import type { EaMetadata } from "@/lib/ea/types";

export const metadata: Metadata = {
  title: "My Kids | Zazi iZandi",
};

export default async function MyKidsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sessionClaims } = await auth();
  const meta = sessionClaims?.metadata as EaMetadata | undefined;
  const userId = meta?.teampact_user_id;

  let eaName = meta?.teampact_user_name ?? "Welcome";
  let schoolName: string | undefined;

  if (userId) {
    const result = await getEaOverview(userId);
    if (result.ok && result.data.ea_name) {
      eaName = result.data.ea_name;
      schoolName = result.data.primary_school || undefined;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MyKidsTopBar eaName={eaName} schoolName={schoolName} />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20">{children}</main>
    </div>
  );
}
```

**Key changes from Phase 1A:**

- Imports `getEaOverview` and `EaMetadata` from the shared types file (no more inline type).
- Calls `getEaOverview(userId)` if `userId` exists. `React.cache()` ensures this is the same call the page will make — no duplicate HTTP request.
- Prefers `ea_name` from the Django response (authoritative) over the Clerk `teampact_user_name` (which might be stale).
- If the API call fails, falls back silently to the Clerk-based `eaName` and no school name. The top bar still renders — the page is responsible for showing the error state.
- `schoolName` is `undefined` (not `""`) when absent, so `MyKidsTopBar` correctly suppresses the school-name `<p>` via its existing `{schoolName ? ... : null}` conditional.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/my-kids/layout.tsx
git commit -m "feat(my-kids): wire layout to EA API for school name in top bar"
```

---

## Task 7: Replace `page.tsx` stub with real overview page

**Goal:** The main event of Phase 1B. Replace the Phase 1A stub "Your groups will appear here shortly" with real group cards. Handle all three non-auth edge states: zero groups, backend error, stale data.

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/app/my-kids/page.tsx`

- [ ] **Step 1: Replace the page contents**

Replace the entire file with:

```typescript
import { auth } from "@clerk/nextjs/server";
import { getEaOverview } from "@/lib/ea/api";
import type { EaMetadata } from "@/lib/ea/types";
import { NotLinkedState } from "@/components/my-kids/not-linked-state";
import { ZeroGroupsState } from "@/components/my-kids/zero-groups-state";
import { BackendErrorState } from "@/components/my-kids/backend-error-state";
import { GroupCard } from "@/components/my-kids/group-card";

function StaleDataNotice({ lastUpdated }: { lastUpdated: string | null }) {
  if (!lastUpdated) return null;
  const updatedAt = new Date(lastUpdated);
  if (isNaN(updatedAt.getTime())) return null;
  const hoursAgo = Math.floor(
    (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60)
  );
  if (hoursAgo < 12) return null;
  return (
    <p className="text-xs text-slate-400">
      Last updated: {hoursAgo} hours ago
    </p>
  );
}

export default async function MyKidsOverviewPage() {
  const { sessionClaims } = await auth();
  const meta = sessionClaims?.metadata as EaMetadata | undefined;

  if (!meta?.teampact_user_id) {
    return <NotLinkedState />;
  }

  const result = await getEaOverview(meta.teampact_user_id);

  if (!result.ok) {
    return <BackendErrorState />;
  }

  const { data } = result;

  if (data.groups.length === 0) {
    return <ZeroGroupsState />;
  }

  const allSameSchool = data.groups.every(
    (g) => g.school_name === data.groups[0].school_name
  );

  const dateStr = new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(new Date());

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">My Groups</h1>
        <p className="text-sm text-slate-500">{dateStr}</p>
        {data.last_updated ? (
          <StaleDataNotice lastUpdated={data.last_updated} />
        ) : null}
      </div>

      <div className="space-y-4">
        {data.groups.map((group, index) => (
          <GroupCard
            key={group.class_id ?? index}
            group={group}
            showSchoolName={!allSameSchool}
          />
        ))}
      </div>
    </div>
  );
}
```

**Key design decisions:**

- **Edge state cascade:** Not linked → backend error → zero groups → render cards. Each early return is a simpler state — the page never reaches the card-rendering code if a higher-priority state applies.
- **`StaleDataNotice`:** Only renders when `last_updated` is non-null, a valid date, and >12 hours old. The nightly compute runs once per night, so data less than 12h old is "fresh." The spec says "subtle text" — `text-xs text-slate-400` is the lightest tone in our palette. The null guard handles the case where Django returns `last_updated: null` (no groups with `computed_at`) — that path never reaches StaleDataNotice anyway because `groups.length === 0` renders `ZeroGroupsState` first, but the guard is belt-and-braces.
- **`allSameSchool`:** Computes whether all groups share the same school. When true, `showSchoolName` is false on every card, reducing visual clutter. When false (EA has groups at multiple schools), each card shows its school name.
- **Date display:** The spec wireframe shows "Wednesday, 9 April 2026" format. We use `Intl.DateTimeFormat` with `timeZone: "Africa/Johannesburg"` (SAST, UTC+2) so the date is correct regardless of which timezone the Vercel Edge server runs in. The `en-ZA` locale gives "Saturday, 12 April 2026" format which matches the spec.
- **`React.cache()` dedup:** `getEaOverview(meta.teampact_user_id)` is the same call the layout made in Task 6. React memoises by argument, so this resolves instantly from the cache — no second HTTP request.
- **No `"use client"` directive.** `StaleDataNotice` uses `Date.now()` which works on the server (it reads the server's clock, which is fine — the stale-data check is a rough heuristic, not a live clock).

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Start dev server and verify with real data**

```bash
npm run dev
```

Open `http://localhost:3000/my-kids` in an **incognito window** (to avoid cached Clerk sessions).

Sign in as the **linked test EA** (the one with `teampact_user_id=28739`).

Expected (verify structural elements, not specific counts — real data changes nightly):
- Top bar shows the EA name with a school name below.
- Page shows "My Groups" heading with today's date.
- Group cards rendered — each with a group name, grade, progress bar (letter or blending), status badge, and coaching tips for flagged groups.
- If all groups share the same school, school names do NOT appear on individual cards.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add app/my-kids/page.tsx
git commit -m "feat(my-kids): replace stub with real overview page showing group cards"
```

---

## Task 8: Manual smoke test — edge states and mobile viewport

**Goal:** Verify the three non-auth edge states (zero groups, backend error, stale data) and check the responsive layout on a mobile viewport. No code changes in this task — this is a verification checkpoint.

**Prerequisite:** Tasks 1–7 committed and tsc passing.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Scenario A — Linked EA sees real group cards**

Open `http://localhost:3000/my-kids` in incognito, sign in as the linked test EA (Shadey, teampact_user_id=28739).

Expected (structural — do NOT assert specific counts or flag names, since real data changes nightly):
- Top bar: EA name and school name visible.
- "My Groups" heading with today's date in "Saturday, 12 April 2026" format (adjust for the actual day).
- One or more group cards. Each card should have:
  - A group name and grade.
  - Either a letter progress bar (for `phase: letters`) or a blending session bar (for `phase: blending`).
  - A status badge ("On track", "Needs attention", or "Low dosage").
  - A coaching tip (amber box with lightbulb icon) if the group has flags. Some cards may have no tip if they have no flags — that's correct.
- If `last_updated` is >12 hours old, a "Last updated: N hours ago" line should appear below the date. Whether this shows depends on when the nightly compute last ran — if you ran `compute_group_summaries_2026` recently, data will be fresh and the notice won't appear.
- All groups should be at the same school (Shadey's groups are all at Abraham Levy Primary), so school names should NOT appear on individual cards.

- [ ] **Step 3: Scenario B — Not-linked EA sees NotLinkedState**

Sign out (via `<UserButton>` → Sign out). Sign in as the not-linked test EA.

Expected: "Your account isn't linked to your teaching profile yet" (unchanged from Phase 1A).

- [ ] **Step 4: Scenario C — Zero groups**

To simulate the zero-groups edge state without creating a third test user, temporarily change the linked test EA's `teampact_user_id` in Clerk Dashboard:

1. Clerk Dashboard → Users → select the linked test EA → Public metadata → Edit.
2. Change `teampact_user_id` to `99999` (a user_id with no groups in GroupSummary2026).
3. Save. Reload `http://localhost:3000/my-kids` (you may need to sign out and back in for the session claims to refresh).

Expected: "No groups yet — your groups will appear here once you start teaching."

**Restore `teampact_user_id` to `28739` after testing.** Save and sign out/in again.

- [ ] **Step 5: Scenario D — Multi-school EA**

To exercise the `showSchoolName` logic, temporarily change the linked test EA's metadata:

1. Clerk Dashboard → Public metadata → change `teampact_user_id` to `28755` and `teampact_user_name` to `"Busisiwe Kampeni"`.
2. Save. Sign out and back in. Reload `/my-kids`.

Expected:
- Top bar shows "Busisiwe Kampeni" with a primary school name.
- Group cards should appear with **school names on each card** (because Busisiwe has groups at both Esitiyeni Public Primary School and Soweto-On-Sea Primary School).
- Verify the school names are visible as subtitle text below the grade on each card.

**Restore `teampact_user_id` to `28739` and `teampact_user_name` to `"Shadey Africander"` after testing.**

- [ ] **Step 6: Scenario E — Backend error**

To simulate a backend error without actually breaking Django, temporarily set an invalid `DJANGO_API_URL` in `.env.local`:

```
DJANGO_API_URL=http://localhost:9999
```

Restart the dev server (`Ctrl-C` then `npm run dev`). Sign in as the linked test EA.

Expected: "We're having trouble loading your data. Please try again in a few minutes."

**Restore the correct `DJANGO_API_URL` after testing** and restart the dev server.

- [ ] **Step 7: Scenario F — Mobile viewport**

In Chrome DevTools, toggle device toolbar (Ctrl-Shift-M / Cmd-Shift-M). Select "iPhone 14 Pro" or similar ~390px-wide viewport. Reload `/my-kids` (signed in as linked EA with Shadey's user_id restored).

Expected:
- Top bar: logo + name + school + avatar all fit without overflow. Name truncates if too long.
- Group cards: full width, stacked vertically, no horizontal scroll.
- Progress bars render correctly (not squished or overflowing).
- Coaching tips wrap nicely within the card.
- Bottom of page has breathing room (the `pb-20` from the layout).

- [ ] **Step 8: Stop the dev server and confirm**

Ctrl-C. If any scenario failed, go back and fix before Task 9.

- [ ] **Step 9: No git commit — this task has no code changes.**

---

## Task 9: Merge to main and deploy

**Prerequisite:** All smoke tests from Task 8 pass. Playwright tests still green.

- [ ] **Step 1: Run the full Playwright suite**

```bash
npx playwright test
```

Expected: all 11 tests pass (8 from `auth.spec.ts` + 3 from `my-kids-auth.spec.ts`). Phase 1B doesn't add new Playwright tests — the auth redirect tests from Phase 1A still cover the middleware.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin ea-phase1b-overview
```

- [ ] **Step 3: Merge to main**

```bash
git checkout main
git pull --ff-only
git merge --no-ff ea-phase1b-overview -m "Merge ea-phase1b-overview: Phase 1B real overview page with group cards"
git push origin main
```

- [ ] **Step 4: Wait for Vercel deploy**

Watch the deploy dashboard. Expected: build passes, deploy goes green.

- [ ] **Step 5: Production smoke test — mobile on a real phone**

On your phone (not a simulator), open `https://zazi-izandi.co.za/my-kids`. Sign in as the linked test EA.

Expected: same layout as Task 8 Scenario F — real group cards, coaching tips, progress bars. Verify structural elements:
- Top bar shows EA name with school name underneath.
- Group cards with progress bars (letter and/or blending).
- Cards don't horizontally scroll on your screen width.
- Coaching tips are legible on your phone's font size.

- [ ] **Step 6: Production regression check**

Sign in as any staff user. Verify:
- `/pm` loads with real data.
- `/schools-2026` loads with real data.

- [ ] **Step 7: Delete the feature branch**

```bash
git branch -d ea-phase1b-overview
```

- [ ] **Step 8: Mark Phase 1B complete**

Phase 1B is done. The next plan (`docs/superpowers/plans/YYYY-MM-DD-ea-my-kids-phase1c.md`) will cover the Group Detail Page.

---

## Phase 1B Completion Criteria

Phase 1B is done when all of the following are true:

- [ ] `lib/ea/types.ts` exports `EaMetadata`, `EaFlag`, `EaGroup` (discriminated union), and `EaOverviewResponse`. `class_id` is typed `number | null` and `last_updated` is typed `string | null` to match the Django contract.
- [ ] `lib/ea/api.ts` exports a `React.cache()`-wrapped `getEaOverview(userId)` that returns a discriminated `ok/error` result type. No special 404 handling — any non-200 is an error.
- [ ] `app/my-kids/layout.tsx` calls `getEaOverview()` and passes `schoolName` to `MyKidsTopBar` from the Django response.
- [ ] `app/my-kids/page.tsx` renders real group cards from the EA overview endpoint (not a stub).
- [ ] `GroupCard` renders both letter-phase (progress bar + current letter) and blending (session bar capped at 50) variants.
- [ ] `GroupCard` shows the top-priority coaching tip from the flag list (or no tip when flagless).
- [ ] `StatusBadge` maps flags to "On track" / "Needs attention" / "Low dosage" per spec.
- [ ] `showSchoolName` is computed per-EA: shown when groups span multiple schools, suppressed when all same school. Verified with a multi-school EA (Busisiwe Kampeni, 28755) in Task 8 Scenario D.
- [ ] `StaleDataNotice` handles `null` and invalid dates gracefully. Appears when `last_updated` is >12 hours old.
- [ ] Date display uses `Intl.DateTimeFormat` with `timeZone: "Africa/Johannesburg"` so the day is correct regardless of server timezone.
- [ ] Edge states render correctly: `NotLinkedState` (Phase 1A), `ZeroGroupsState` (verified with fake user_id=99999 in Task 8 Scenario C), `BackendErrorState` (verified with invalid DJANGO_API_URL in Task 8 Scenario E).
- [ ] All coaching-tip copy matches spec § 4 and respects the mastery-data limitations in `documentation/letter-mastery-data-model.md`.
- [ ] Inline `EaMetadata` types from Phase 1A are replaced with imports from `lib/ea/types.ts`.
- [ ] All 11 Playwright tests still pass (regression check).
- [ ] Mobile viewport rendering is correct at 390px width (no overflow, truncation, or layout breaks).
- [ ] Production deploy is green. Linked test EA sees real group cards on a physical phone.
- [ ] `/pm` and `/schools-2026` still load with real data (Phase 0 regression check).

---

## Next Plan

Once Phase 1B is complete, the next plan will cover **Phase 1C — Group Detail Page**:

- `/my-kids/groups/[class_id]/page.tsx` — server component fetching from `/api/ea/<user_id>/groups/<class_id>/`.
- `LetterMasteryPath` — the "stepping stones" visualization with mastery colours, session dots, and no-assessment fallback.
- `ChildrenList` — sorted by attendance rate, `⚠` indicators for low attendance.
- `RecentSessions` — last 10 sessions with expandable per-child attendance.
- Back navigation to `/my-kids` overview.
- `GroupCard` wrapped in `<Link>` to enable click-through navigation.
- All coaching tips shown (not just the top one — the detail page shows everything).
