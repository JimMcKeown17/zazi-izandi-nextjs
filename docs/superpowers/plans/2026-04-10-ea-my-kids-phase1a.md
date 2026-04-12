# EA My Kids — Phase 1A: Auth & Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `ea` role to the Clerk/middleware hierarchy, protect `/my-kids`, redirect EAs to `/my-kids` on login, and ship a standalone `/my-kids` layout with a minimal landing page that handles the "not linked" edge state. No Django data fetching — Phase 1B builds that.

**Architecture:** Pure Next.js work. Extend the existing `middleware.ts` role-gating pattern with a new lowest-rank role `ea: 0`. Build a `/my-kids` route segment with its own layout (mirroring the `/pm/*` standalone-layout pattern). Use a server-rendered `/after-login` route to do role-based post-login redirect so Clerk's `fallbackRedirectUrl` can point to a single URL but still route EAs and staff to different pages. The `teampact_user_id` for scoping is read from Clerk `sessionClaims.metadata` server-side — never from the client.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Clerk, Tailwind CSS v4, Radix UI, Playwright. No backend changes.

**Related spec:** `docs/superpowers/specs/2026-04-09-ea-my-kids-design.md` (Sections 1, 2, 7 — edge states, and Phase 1A in Section 8).

**Prerequisite:** Phase 0 must be deployed and live. The new Django endpoints are NOT called in Phase 1A, but the shared-secret auth layer from Phase 0 must still work for the existing PM pages (regression surface).

**Phases not covered:** 1B (Overview page rendering group cards), 1C (Group detail), 1D (PM view of EA data). Each is a separate plan.

---

## Scope and Ordering

Phase 1A is organized into three groups, with two letter-suffixed tasks (2b, 11b) for closely-related side-fixes:

1. **Auth layer** (Tasks 1–5, with 2b for `redirect_url` query-string preservation) — extend role hierarchy, protect `/my-kids`, preserve deep-link query strings, wire role-based post-login redirect.
2. **Layout + page** (Tasks 6–8) — standalone `/my-kids` layout, top bar component, minimal landing page with the "not linked" edge state.
3. **Tests + deploy** (Tasks 9–12, with 11b for `CLAUDE.md` update) — Playwright redirect tests, operational Clerk setup, manual smoke-test checklist, doc refresh, merge, deploy, verify.

Letter-suffixed tasks follow the Phase 0 convention: they sit directly after the task they extend (Task 2b after Task 2, Task 11b after Task 11), so each subsystem ships with its own follow-through.

No file in Phase 1A depends on a Django endpoint. The landing page is a **stub** that Phase 1B will replace with full group-card content. That stub still has to handle the "not linked" case correctly, because that's the only edge state Phase 1A can actually test end-to-end.

**Deliberately deferred to Phase 1B:**

- The "backend error" edge state (there is no backend call in 1A, so nothing to error on).
- Fetching from `/api/ea/<user_id>/` — that's the first thing 1B does.
- `GroupCard` component — built in 1B once there is real data to render.

---

## File Structure

### Next.js project (`/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs`)

**Modify (auth layer):**

- `middleware.ts` — add `ea` to Role type, add `/my-kids` to PROTECTED_ROUTES, add `/my-kids(.*)` to the route matcher, and preserve query strings in `redirect_url` (Task 2b).
- `components/layout/header.tsx` — add `ea` to the mirrored Role type so the two stay in sync. (No visible header change for EAs — the standalone `/my-kids` layout doesn't render this header, and on marketing pages EAs will just see the guest nav because `ea: 0` is below `funder: 1`.)
- `app/login/[[...sign-in]]/page.tsx` — set `fallbackRedirectUrl="/after-login"` on the `SignIn` component.
- `CLAUDE.md` — update the Authentication section to mention `/my-kids*`, the `ea` role, and the `/after-login` post-login redirect pattern (Task 11b).

**Create (auth layer):**

- `app/after-login/page.tsx` — server component that reads the session role and redirects based on it (`ea → /my-kids`, otherwise `/`).

**Create (layout + page):**

- `app/my-kids/layout.tsx` — standalone layout (no marketing Header/Footer, no PM sidebar). Renders `<MyKidsTopBar>` + `{children}`.
- `app/my-kids/page.tsx` — server component stub. Checks `sessionClaims.metadata.teampact_user_id`; if missing, renders the "not linked" edge state; otherwise renders a simple welcome placeholder (Phase 1B replaces this).
- `components/my-kids/top-bar.tsx` — small top bar: Zazi iZandi logo, EA name, school slot (empty for now — 1B fills it from the API), Clerk `<UserButton>`.
- `components/my-kids/not-linked-state.tsx` — the "Account not linked" edge state UI (kind wording, contact link).

**Create (tests):**

- `e2e/my-kids-auth.spec.ts` — Playwright test that unauthenticated requests to `/my-kids` redirect to `/login` with `redirect_url` preserved.

**No file changes outside `app/my-kids`, `app/after-login`, `app/login`, `components/my-kids`, `components/layout/header.tsx`, `middleware.ts`, `CLAUDE.md`, or `e2e/`.** This keeps the blast radius tight. `CLAUDE.md` is included because it is loaded as context in every new Claude session — leaving it stale after an auth-model change would quietly break future sessions.

---

## Task 1: Extend the Role type in `middleware.ts`

**Goal:** Add `ea` as the lowest-rank role so the rest of the auth chain can reference it.

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/middleware.ts`

- [ ] **Step 1: Create a feature branch**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs
git checkout main
git pull --ff-only
git checkout -b ea-phase1a-auth
```

- [ ] **Step 2: Update the Role type and ROLE_LEVELS**

Open `middleware.ts` and replace lines 4–16 with:

```typescript
// Role hierarchy — higher number = more access
// Assign roles in Clerk Dashboard → User → Metadata:
//   publicMetadata: { "role": "funder" }
// Roles: ea | funder | junior_staff | senior_staff | admin
// Guest = not signed in
type Role = "ea" | "funder" | "junior_staff" | "senior_staff" | "admin";

const ROLE_LEVELS: Record<Role, number> = {
  ea: 0,
  funder: 1,
  junior_staff: 2,
  senior_staff: 3,
  admin: 4,
};
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors. TypeScript will now recognize `"ea"` as a valid `Role`.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat(middleware): add ea role at rank 0 in role hierarchy"
```

---

## Task 2: Protect `/my-kids` routes in middleware

**Goal:** Unauthenticated requests to `/my-kids` redirect to `/login` with `redirect_url` preserved; signed-in users without `ea` access get redirected to `/login?error=insufficient_role`.

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/middleware.ts`

- [ ] **Step 1: Add `/my-kids` to PROTECTED_ROUTES**

In `middleware.ts`, replace lines 20–23 with:

```typescript
// Route → minimum role required to access it
// Easy to adjust — add or remove entries here to change access control
const PROTECTED_ROUTES: Record<string, Role> = {
  "/schools": "funder",
  "/pm": "funder",
  "/my-kids": "ea",
};
```

- [ ] **Step 2: Add `/my-kids(.*)` to the route matcher**

Replace line 29:

```typescript
const isProtectedRoute = createRouteMatcher([
  "/schools(.*)",
  "/pm(.*)",
  "/my-kids(.*)",
]);
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat(middleware): protect /my-kids with minimum role ea"
```

---

## Task 2b: Preserve query strings when redirecting to login

**Goal:** When unauthenticated users are bounced from a protected route, the `redirect_url` query param passed to `/login` must include the original query string, not just the pathname. Otherwise deep links like `/my-kids/groups/67610?tab=sessions` lose their query state after sign-in.

**Why this is in the Phase 1A plan:** The plan (and Task 9) explicitly claims "deep-link preservation" as a feature. The existing middleware preserves only `req.nextUrl.pathname`, which silently drops the search string. This is a pre-existing bug that affects `/schools` and `/pm` today, but Phase 1A is the first plan that tests deep-link preservation and therefore the first opportunity to catch and fix it. The fix also benefits the existing routes for free.

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/middleware.ts`

- [ ] **Step 1: Update the `redirect_url` construction**

In `middleware.ts`, find line 40:

```typescript
loginUrl.searchParams.set("redirect_url", req.nextUrl.pathname);
```

Replace with:

```typescript
loginUrl.searchParams.set(
  "redirect_url",
  req.nextUrl.pathname + req.nextUrl.search
);
```

**Why `req.nextUrl.search` and not `req.nextUrl.searchParams.toString()`:** `search` already includes the leading `?` when a query string exists and returns an empty string otherwise, so concatenation produces the right result in both cases. Using `searchParams.toString()` would require manually prepending `?` only when non-empty.

**Clerk compatibility note:** Clerk's `<SignIn>` component treats `redirect_url` as a same-origin relative path by default. Query strings in relative paths are preserved through Clerk's internal routing because the whole string is passed through `searchParams.set()` as an opaque URL-encoded value — the `?` and `&` inside the inner URL get percent-encoded in the outer `/login?redirect_url=...` URL, and Clerk decodes them back when it performs the final redirect. No additional Clerk configuration is required.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "fix(middleware): preserve query strings in redirect_url"
```

---

## Task 3: Keep `components/layout/header.tsx` Role type in sync

**Goal:** The marketing header's mirrored Role type needs the same `ea` entry, or TypeScript will complain and the `hasAccess` helper will crash at runtime if an EA logs in and visits a public page.

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/layout/header.tsx`

- [ ] **Step 1: Find the existing Role type declaration**

It is around line 31:

```typescript
// Role hierarchy — mirrors middleware.ts
type Role = "funder" | "junior_staff" | "senior_staff" | "admin";
```

- [ ] **Step 2: Replace it with the ea-aware version**

```typescript
// Role hierarchy — mirrors middleware.ts
type Role = "ea" | "funder" | "junior_staff" | "senior_staff" | "admin";
```

- [ ] **Step 3: Find the ROLE_LEVELS constant and add ea**

It is around line 33–38. Replace:

```typescript
const ROLE_LEVELS: Record<Role, number> = {
  funder: 1,
  junior_staff: 2,
  senior_staff: 3,
  admin: 4,
};
```

with:

```typescript
const ROLE_LEVELS: Record<Role, number> = {
  ea: 0,
  funder: 1,
  junior_staff: 2,
  senior_staff: 3,
  admin: 4,
};
```

- [ ] **Step 4: Type-check and lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: zero TypeScript errors. Lint should pass (unchanged from baseline).

- [ ] **Step 5: Manual sanity check — EAs should see the same links as guests on marketing pages**

Because `ea: 0 < funder: 1`, the Schools group in the marketing header is still hidden. The `hasAccess(userRole, "funder")` check returns false for `ea`. That is correct — EAs have no business on marketing-site staff pages. The only route an EA can access is `/my-kids`.

No code change — this step is a reasoning check. If something felt off you would stop here and re-read `header.tsx`.

- [ ] **Step 6: Commit**

```bash
git add components/layout/header.tsx
git commit -m "feat(header): mirror ea role in header role hierarchy"
```

---

## Task 4: Create the `/after-login` role-based redirect route

**Goal:** After a successful Clerk sign-in with no `redirect_url` query param, land on `/after-login` which reads the session and sends EAs to `/my-kids`, everyone else to `/`. Clerk's built-in `redirect_url` handling still wins when the user was bounced from a protected route (deep-link preservation — e.g. an EA opening `/my-kids/groups/67610` from a WhatsApp link lands on that specific group after signing in).

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/app/after-login/page.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

type Role = "ea" | "funder" | "junior_staff" | "senior_staff" | "admin";

export default async function AfterLoginPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const role = (sessionClaims?.metadata as { role?: Role } | undefined)?.role;

  if (role === "ea") {
    redirect("/my-kids");
  }

  redirect("/");
}
```

**Why a server component and not client-side:** Reading `sessionClaims.metadata.role` must happen server-side — the client would need the role pushed down via a prop, which we'd have to fetch anyway. A server-side `redirect()` in a page component is the simplest pattern and matches how Clerk's server helpers are designed.

**Why `redirect("/login")` when `!userId`:** A signed-out user should never reach `/after-login` normally — middleware would have sent them to `/login` first. This is belt-and-braces, and it keeps TypeScript happy because without the guard, `sessionClaims` is `null`.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/after-login/page.tsx
git commit -m "feat(auth): add /after-login role-based redirect"
```

---

## Task 5: Wire the login page to use `/after-login` as the fallback redirect

**Goal:** When a user signs in at `/login` with no `redirect_url` in the query string, Clerk falls back to `/after-login` instead of `/`.

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/app/login/[[...sign-in]]/page.tsx`

- [ ] **Step 1: Update the `<SignIn>` component**

Replace the current `<SignIn />` (line 15) with:

```typescript
<SignIn fallbackRedirectUrl="/after-login" />
```

**Why `fallbackRedirectUrl` and not `afterSignInUrl`:** In Clerk v5+, `fallbackRedirectUrl` is the prop that is only used when the URL has no `redirect_url` query param. `afterSignInUrl` is deprecated. Using `fallbackRedirectUrl` preserves the middleware-set `redirect_url` for deep-linked EAs while still giving us a role-based default for plain logins.

- [ ] **Step 2: Verify no other `<SignIn>` instances exist**

```bash
grep -rn "SignIn" app/ components/ --include="*.tsx" | grep -v "SignInButton\|node_modules"
```

Expected: only the one line in `app/login/[[...sign-in]]/page.tsx`. If you see another `<SignIn>`, update it too.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add app/login/\[\[...sign-in\]\]/page.tsx
git commit -m "feat(login): set fallbackRedirectUrl to /after-login"
```

---

## Task 6: Build the `MyKidsTopBar` component

**Goal:** A small, mobile-first top bar for the `/my-kids` layout with the Zazi iZandi logo, EA name, an empty school slot (Phase 1B will fill), and Clerk's `<UserButton>` for sign-out.

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/my-kids/top-bar.tsx`

- [ ] **Step 1: Create the file**

```typescript
"use client";

import Image from "next/image";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

interface MyKidsTopBarProps {
  eaName: string;
  schoolName?: string;
}

export function MyKidsTopBar({ eaName, schoolName }: MyKidsTopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
      <Link
        href="/my-kids"
        className="flex items-center gap-3 min-w-0"
        aria-label="My Kids home"
      >
        <Image
          src="/zazi_izandi_logo.png"
          alt="Zazi iZandi"
          width={120}
          height={40}
          className="h-8 w-auto shrink-0"
          priority
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {eaName}
          </p>
          {schoolName ? (
            <p className="truncate text-xs text-slate-500">{schoolName}</p>
          ) : null}
        </div>
      </Link>

      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: "h-9 w-9",
          },
        }}
      />
    </header>
  );
}
```

**Design notes:**

- `sticky top-0 z-40` keeps the bar in view as the page scrolls on mobile.
- `min-w-0` on the flex child + `truncate` on the text prevents long EA or school names from pushing the UserButton off-screen.
- The logo uses the existing `public/zazi_izandi_logo.png` asset, the same one the marketing header at `components/layout/header.tsx:179` renders. Sized smaller (`h-8`, ~120×40 intrinsic) for the mobile top-bar context. `priority` is appropriate because the top bar is above the fold on every `/my-kids` page.
- `afterSignOutUrl="/"` sends signed-out users to the public home page, not back to `/my-kids` (which would just bounce them to `/login`).
- `eaName` is required; `schoolName` is optional because in Phase 1A we don't have it yet (there is no Django call). Phase 1B will pass it once the endpoint is wired.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/my-kids/top-bar.tsx
git commit -m "feat(my-kids): add MyKidsTopBar component"
```

---

## Task 7: Build the `NotLinkedState` component

**Goal:** Friendly, kind edge-state UI for EAs who are signed in with `role=ea` but have no `teampact_user_id` in their Clerk `publicMetadata`. Per the design spec Section 7, the copy is: "Your account isn't linked to your teaching profile yet. Please contact your programme manager."

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/my-kids/not-linked-state.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { LinkIcon } from "lucide-react";

export function NotLinkedState() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
        <LinkIcon className="h-8 w-8 text-amber-600" aria-hidden="true" />
      </div>
      <h1 className="mb-2 text-xl font-semibold text-slate-900">
        Your account isn&apos;t linked to your teaching profile yet
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-slate-600">
        Please contact your programme manager.
      </p>
      <a
        href="mailto:info@zaziizandi.org"
        className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
      >
        Contact team
      </a>
    </div>
  );
}
```

**Copy notes:**

- The heading and paragraph together are the exact copy from design spec § 7: *"Your account isn't linked to your teaching profile yet. Please contact your programme manager."* — split at the period so the state is the heading and the action is the body. No added or softened phrasing.
- The contact link (`info@zaziizandi.org`) mirrors the one on `/login` so EAs have a consistent escalation path.
- `mailto:` is used because EAs read this on mobile and we want one-tap contact — a form would be more friction.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/my-kids/not-linked-state.tsx
git commit -m "feat(my-kids): add NotLinkedState edge-state component"
```

---

## Task 8: Build the `/my-kids` standalone layout and landing page

**Goal:** Create `app/my-kids/layout.tsx` (standalone, no Header/Footer/sidebar) and `app/my-kids/page.tsx` (stub landing page that handles the "not linked" edge state and shows a welcome placeholder otherwise). Phase 1B will replace the welcome placeholder with real group cards — do **not** build group cards here.

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/app/my-kids/layout.tsx`
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/app/my-kids/page.tsx`

- [ ] **Step 1: Create the layout**

Create `app/my-kids/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { MyKidsTopBar } from "@/components/my-kids/top-bar";

export const metadata: Metadata = {
  title: "My Kids | Zazi iZandi",
};

type EaMetadata = {
  role?: string;
  teampact_user_id?: number;
  teampact_user_name?: string;
};

export default async function MyKidsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sessionClaims } = await auth();
  const metadata = sessionClaims?.metadata as EaMetadata | undefined;
  const eaName = metadata?.teampact_user_name ?? "Welcome";

  return (
    <div className="min-h-screen bg-slate-50">
      <MyKidsTopBar eaName={eaName} />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20">{children}</main>
    </div>
  );
}
```

**Why `teampact_user_name` as the primary display name:** The design spec Section 1 defines it as "for display/audit only — never used for data scoping". It is the exact TeamPact name which matches how EAs will see themselves in other programme materials. If missing, `"Welcome"` is a safe fallback — Phase 1B can improve this by falling back to the Clerk user's first name if needed.

**Why `max-w-2xl`:** Mobile-first — even on desktop the content reads best at a narrow width. Matches the phone-centric reading context described in the letter-mastery-data-model doc.

**Why `pb-20` on main:** Leaves breathing room at the bottom for mobile browser chrome (iOS Safari address bar, Android bottom nav). Matches the pattern in `/pm` layout.

- [ ] **Step 2: Create the landing page**

Create `app/my-kids/page.tsx`:

```typescript
import { auth } from "@clerk/nextjs/server";
import { NotLinkedState } from "@/components/my-kids/not-linked-state";

type EaMetadata = {
  role?: string;
  teampact_user_id?: number;
  teampact_user_name?: string;
};

export default async function MyKidsOverviewPage() {
  const { sessionClaims } = await auth();
  const metadata = sessionClaims?.metadata as EaMetadata | undefined;

  if (!metadata?.teampact_user_id) {
    return <NotLinkedState />;
  }

  // Phase 1B will replace this stub with real group cards fetched from
  // /api/ea/<teampact_user_id>/ via lib/ea/api.ts.
  return (
    <div className="py-8 text-center">
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">My Groups</h1>
      <p className="text-sm text-slate-600">
        Your groups will appear here shortly.
      </p>
    </div>
  );
}
```

**Why check `teampact_user_id` and not `role === "ea"`:** The middleware already guarantees `role` is `ea` or higher — we would never reach this page without that. The only remaining failure mode is "role is set but metadata didn't get the user_id", which is exactly the "not linked" state. Checking `teampact_user_id` is what actually matters for Phase 1B data scoping, and it is the correct guard here.

**Why the stub copy is deliberately minimal:** Phase 1B ships real content in a few days. Anything more elaborate would be code we throw away.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Run the dev server and manually smoke test**

```bash
npm run dev
```

Open `http://localhost:3000/my-kids` in a fresh incognito window. Expected: redirect to `/login?redirect_url=%2Fmy-kids`.

Stop the dev server (Ctrl-C) for now — you will do the full authenticated smoke test in Task 11.

- [ ] **Step 5: Commit**

```bash
git add app/my-kids/layout.tsx app/my-kids/page.tsx
git commit -m "feat(my-kids): add standalone layout and stub landing page"
```

---

## Task 9: Playwright test — unauthenticated `/my-kids` redirects to login

**Goal:** Automated regression coverage for the middleware change. Mirrors the existing `/schools` test in `e2e/auth.spec.ts`.

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/e2e/my-kids-auth.spec.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "@playwright/test";

test.describe("/my-kids auth", () => {
  test("unauthenticated users are redirected to /login with redirect_url preserved", async ({
    page,
  }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/my-kids");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("redirect_url=%2Fmy-kids");
  });

  test("unauthenticated deep link to a group redirects with full path preserved", async ({
    page,
  }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/my-kids/groups/67610");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("redirect_url=%2Fmy-kids%2Fgroups%2F67610");
  });

  test("unauthenticated deep link with query string preserves pathname and search", async ({
    page,
  }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/my-kids/groups/67610?tab=sessions");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
    // The whole path+search string is URL-encoded into the redirect_url param.
    // Expect the inner `?` to become %3F and `=` to become %3D.
    expect(page.url()).toContain(
      "redirect_url=%2Fmy-kids%2Fgroups%2F67610%3Ftab%3Dsessions"
    );
  });
});
```

**Why three tests:**

1. **Base redirect** — the fundamental "unauthenticated → login" contract.
2. **Deep-link path preservation** — guards against a regression where someone adds `isProtectedRoute` logic that matches `/my-kids` but not `/my-kids/groups/[id]`. That would silently break deep-linking for EAs opening WhatsApp links — the exact scenario design spec § 2 "Login Redirect" calls out.
3. **Query-string preservation** — guards against the Task 2b fix regressing back to `req.nextUrl.pathname`. This test is the reason Task 2b exists.

- [ ] **Step 2: Run the test**

Make sure the dev server is NOT running (Playwright has its own webServer config), then:

```bash
npx playwright test e2e/my-kids-auth.spec.ts
```

Expected: 3 tests pass. If they fail with a timeout on `waitForURL`, check that Task 1 (role type), Task 2 (matcher + route), Task 2b (query-string preservation), and Task 8 (layout + page) are all committed — the page has to exist for the redirect chain to complete.

- [ ] **Step 3: Commit**

```bash
git add e2e/my-kids-auth.spec.ts
git commit -m "test(e2e): add /my-kids unauthenticated redirect tests"
```

---

## Task 10: Create a test EA user in Clerk Dashboard (operational)

**Goal:** Set up one real test account in production Clerk so Task 11 can exercise the full happy path end-to-end. This is an **operational** task — no code.

- [ ] **Step 1: Open the Clerk Dashboard**

Go to https://dashboard.clerk.com, select the Zazi iZandi application.

- [ ] **Step 2: Create or find a test user**

Either create a new user (`Users → Create user`) with an email you control, or pick an existing test account you own. Note the email and set or reset the password so you can sign in.

- [ ] **Step 3: Set publicMetadata**

On that user's page, find `Public metadata` and paste:

```json
{
  "role": "ea",
  "teampact_user_id": 28739,
  "teampact_user_name": "Shadey Africander"
}
```

**Why `28739` / `"Shadey Africander"`:** this is the known-good test EA from Phase 0 — we verified the Django endpoints return real data for this user_id locally and in prod. Using a real EA's ID here means when you land on `/my-kids` (after Phase 1B ships) you will see Shadey's actual groups, not an empty state.

**Make sure the session claim custom claim is in place:** Clerk Dashboard → `Configure → Sessions → Customize session token`. The JSON must include:

```json
{
  "metadata": "{{user.public_metadata}}"
}
```

Phase 0 CLAUDE.md says this is already required for the existing `/schools` and `/pm` role gating, so it should already be there. Double-check.

- [ ] **Step 4: Create a second test user for the "not linked" state**

Create a second user (different email), set `publicMetadata` to:

```json
{
  "role": "ea"
}
```

Note: **no** `teampact_user_id`. This account exercises the NotLinkedState edge case. You do not need a real TeamPact link — that is the point.

- [ ] **Step 5: Record credentials somewhere private**

Write both test-account emails and passwords in your password manager labelled `"ZZ Phase 1A test — EA linked"` and `"ZZ Phase 1A test — EA not linked"`. You will reuse these for Phase 1B+.

- [ ] **Step 6: No git commit — this task has no code changes.**

---

## Task 11: Manual smoke test checklist

**Goal:** End-to-end verification of the full auth + routing flow with the real Clerk session. Playwright covers the unauthenticated cases; these checks cover the authenticated paths that are awkward to automate without Clerk test tokens with custom metadata.

**Prerequisite:** Tasks 1–10 all committed and tests passing.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open `http://localhost:3000` in a **fresh incognito window** (to avoid stale Clerk sessions).

- [ ] **Step 2: Scenario A — Unauthenticated deep-link preservation**

Navigate to `http://localhost:3000/my-kids/groups/67610`.

Expected:
- Redirected to `http://localhost:3000/login?redirect_url=%2Fmy-kids%2Fgroups%2F67610`
- Clerk sign-in form is visible.

- [ ] **Step 3: Scenario A continued — Sign in as the linked EA**

Enter the linked-EA credentials from Task 10. After successful sign-in:

Expected:
- You land on `/my-kids/groups/67610` **not** `/my-kids`.
- Because Phase 1A doesn't have a group detail page yet, you will see a 404 ("This page could not be found"). **That is the correct behaviour for now** — it proves `redirect_url` is honoured. Phase 1C will build the actual group detail page.

Navigate to `http://localhost:3000/my-kids` manually.

Expected:
- Standalone layout visible (top bar with "Shadey Africander", no marketing Header, no PM sidebar).
- Page shows "My Groups" heading and the stub placeholder text.
- No "Not linked" message (because `teampact_user_id` is set).

- [ ] **Step 4: Scenario B — Plain sign-in with no deep link**

Sign out via the `<UserButton>` (top-right of the top bar). You should land on `/`.

Navigate to `http://localhost:3000/login` directly (no `redirect_url` query param).

Sign in as the linked EA.

Expected:
- You land on `/my-kids` (via the `/after-login` redirect → role is `ea`).
- Top bar shows "Shadey Africander".
- Stub content visible.

- [ ] **Step 5: Scenario C — Not-linked EA**

Sign out. Navigate to `http://localhost:3000/login`. Sign in as the not-linked EA (the second test user from Task 10).

Expected:
- You land on `/my-kids` (role is still `ea`, middleware lets you through).
- Top bar shows "Welcome" (because no `teampact_user_name`).
- **The page body renders the `NotLinkedState` component**: amber link icon, "Your account isn't linked yet" heading, contact-team link.

- [ ] **Step 6: Scenario D — Staff user does NOT get sent to /my-kids**

Sign out. Sign in as any existing staff user (`role: funder`, `senior_staff`, etc. — use a known-working account).

Expected:
- You land on `/` (home page), not `/my-kids`.
- The marketing Header shows the usual staff links.
- Navigating manually to `http://localhost:3000/my-kids` **does let you in** (because the role hierarchy makes `funder ≥ ea`).
- The page body renders the **`NotLinkedState`** component (amber link icon, "Your account isn't linked to your teaching profile yet" heading, contact-team link). This is because `app/my-kids/page.tsx` unconditionally returns `NotLinkedState` whenever `teampact_user_id` is missing — regardless of role. Staff users don't have a `teampact_user_id`, so they hit this state.
- This matches design spec § 7 verbatim: *"Staff with no EA link: same as 'not linked' state."*

- [ ] **Step 7: Scenario E — Regression check for /schools and /pm**

Still signed in as staff, navigate to:
- `http://localhost:3000/schools` — should still load (regression check).
- `http://localhost:3000/pm` — should still load.

If either 401s, something in Task 1–3 broke the existing role-gating. Stop and debug.

- [ ] **Step 8: Stop the dev server**

Ctrl-C the terminal running `npm run dev`.

- [ ] **Step 9: No git commit — this task has no code changes.**

If any scenario failed, go back to the relevant task and fix it. The most common failure mode is Clerk's session token custom-claims config not being in place — if `sessionClaims.metadata` is `undefined`, the `/after-login` redirect always falls through to `/` regardless of role.

---

## Task 11b: Update `CLAUDE.md` auth guidance

**Goal:** The project's `CLAUDE.md` is loaded as context in every new Claude session. Its Authentication section currently only mentions `/schools*` and `/pm*` and doesn't mention the `ea` role or the post-login redirect pattern. After Phase 1A ships, future sessions will start with stale assumptions unless we update it.

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/CLAUDE.md`

- [ ] **Step 1: Locate the Authentication section**

Find the section under `## Authentication (Clerk RBAC)` (around line 34). Current text:

```markdown
Middleware at `middleware.ts` protects `/schools*` and `/pm*` routes. Roles: `funder` (min) → `junior_staff` → `senior_staff` → `admin`. Set in Clerk Dashboard → publicMetadata: `{ "role": "funder" }`. Session token needs custom claim: `{ "metadata": "{{user.public_metadata}}" }`.
```

- [ ] **Step 2: Replace with the updated version**

```markdown
Middleware at `middleware.ts` protects `/schools*`, `/pm*`, and `/my-kids*` routes. Roles: `ea` (min, rank 0) → `funder` (1) → `junior_staff` (2) → `senior_staff` (3) → `admin` (4). Set in Clerk Dashboard → publicMetadata:

- **Staff:** `{ "role": "funder" }` (or higher)
- **Education Assistants:** `{ "role": "ea", "teampact_user_id": <number>, "teampact_user_name": "<string>" }` — `teampact_user_id` is the scoping key for `/api/ea/<user_id>/` calls and must match a real TeamPact user.

Session token needs custom claim: `{ "metadata": "{{user.public_metadata}}" }`.

**Post-login redirect:** `/login` uses `fallbackRedirectUrl="/after-login"`. The `/after-login` server component reads `sessionClaims.metadata.role` and redirects EAs to `/my-kids`, everyone else to `/`. Clerk's own `redirect_url` query param takes precedence when set by middleware, which preserves deep links including query strings (e.g. an EA opening `/my-kids/groups/67610?tab=sessions` from WhatsApp lands on that exact URL after signing in).
```

- [ ] **Step 3: Scan for other stale references**

```bash
grep -n "funder\|junior_staff\|/schools\|/pm\|/my-kids\|teampact_user_id" CLAUDE.md
```

Review each hit. The only places that should mention the role hierarchy or protected routes are the Authentication section you just updated and the Further Documentation table. If you see anything else that contradicts the new state, fix it in the same commit.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md auth section for ea role and /my-kids"
```

---

## Task 12: Merge to main and deploy

**Goal:** Ship Phase 1A to production via the standard feature-branch workflow.

**Prerequisite:** All prior tasks committed, Playwright tests pass, manual smoke test clean.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin ea-phase1a-auth
```

- [ ] **Step 2: Run the full Playwright suite one more time**

```bash
npx playwright test
```

Expected: all tests pass (existing + the three new `/my-kids` tests). If the existing `auth.spec.ts` tests fail, something in Task 1–3 broke a shared assumption — stop and debug before merging.

- [ ] **Step 3: Merge to main**

```bash
git checkout main
git pull --ff-only
git merge --no-ff ea-phase1a-auth -m "Merge ea-phase1a-auth: Phase 1A auth, routing, and standalone /my-kids layout"
git push origin main
```

- [ ] **Step 4: Wait for Vercel/Render deploy to go green**

Watch the deploy dashboard. Expected: build passes (no TypeScript errors), deploy goes green.

- [ ] **Step 5: Production smoke test — unauthenticated**

From a fresh incognito window, hit `https://zazi-izandi.co.za/my-kids`.

Expected: redirect to `https://zazi-izandi.co.za/login?redirect_url=%2Fmy-kids`.

- [ ] **Step 6: Production smoke test — linked EA**

Sign in with the linked-EA test account from Task 10 (the Clerk Dashboard is shared between preview and production, so the users you created are already there).

Expected: land on `/my-kids`, see the stub landing page with "Shadey Africander" in the top bar.

- [ ] **Step 7: Production smoke test — not linked EA**

Sign out. Sign in with the not-linked test account.

Expected: land on `/my-kids`, see the `NotLinkedState` edge state.

- [ ] **Step 8: Production regression check**

Sign in as any real staff user. Verify `/schools-2026` and `/pm` still load correctly with real data (no amber mock banner). This is the Phase 0 shared-secret regression surface.

- [ ] **Step 9: Delete the local feature branch**

```bash
git branch -d ea-phase1a-auth
```

- [ ] **Step 10: Mark Phase 1A complete**

Phase 1A is done. The next plan (`docs/superpowers/plans/YYYY-MM-DD-ea-my-kids-phase1b.md`) will cover the real Overview page: fetching from `/api/ea/<user_id>/`, building the `GroupCard` component in both letter-phase and blending variants, the coaching-tip translator, and the zero-groups + backend-error edge states.

---

## Phase 1A Completion Criteria

Phase 1A is done when all of the following are true:

- [ ] `middleware.ts` includes `ea: 0` in `ROLE_LEVELS` and `"/my-kids"` in `PROTECTED_ROUTES`.
- [ ] `middleware.ts` preserves query strings in the `redirect_url` (`pathname + search`), so deep links like `/my-kids/groups/67610?tab=sessions` survive sign-in.
- [ ] `components/layout/header.tsx` role hierarchy mirrors the middleware.
- [ ] `app/after-login/page.tsx` routes signed-in EAs to `/my-kids` and everyone else to `/`.
- [ ] `app/login/[[...sign-in]]/page.tsx` sets `fallbackRedirectUrl="/after-login"`.
- [ ] `app/my-kids/layout.tsx` renders `<MyKidsTopBar>` (with the real `zazi_izandi_logo.png` asset) without the marketing Header or PM sidebar.
- [ ] `app/my-kids/page.tsx` renders the `NotLinkedState` when `teampact_user_id` is missing and a stub placeholder otherwise.
- [ ] `NotLinkedState` copy matches design spec § 7 verbatim ("Your account isn't linked to your teaching profile yet. Please contact your programme manager.").
- [ ] At least one linked test EA and one not-linked test EA exist in Clerk Dashboard.
- [ ] Playwright test `e2e/my-kids-auth.spec.ts` passes (3 tests — base redirect, deep-link path, query-string preservation).
- [ ] All existing Playwright tests in `e2e/auth.spec.ts` still pass (regression check).
- [ ] Manual smoke test scenarios A–E all behave as described in Task 11 (Scenario D expects `NotLinkedState`, not the stub).
- [ ] `CLAUDE.md` Authentication section mentions `/my-kids*`, the `ea` role, the `teampact_user_id` / `teampact_user_name` metadata shape, and the `/after-login` post-login redirect pattern.
- [ ] Production deploy is green and the production smoke tests in Task 12 Steps 5–8 all pass.
- [ ] `/schools-2026` and `/pm` still load with real data in production (Phase 0 regression check).

---

## Next Plan

Once Phase 1A is complete and verified, the next plan will cover **Phase 1B — Overview Page**:

- `lib/ea/api.ts` with a server-side fetcher for `/api/ea/<user_id>/` (using `djangoFetch` from Phase 0).
- `GroupCard` component in two variants: letter-phase (mastery progress bar) and blending (session bar capped at 50).
- Coaching-tip translator (`CoachingTip` component) that turns raw flags (`teaching_known`, `curriculum_gaps`, `ghost_group`, etc.) into friendly icon + sentence per the mapping in design spec Section 4.
- Replace the Phase 1A stub in `app/my-kids/page.tsx` with a grid of `GroupCard`s.
- "Zero groups" and "Backend error" edge states.
- Mobile-first responsive polish and real-device testing.

Phase 1B is where `documentation/letter-mastery-data-model.md` becomes load-bearing — the coaching tips and mastery visualization must respect the "baseline-only" constraint documented there.
