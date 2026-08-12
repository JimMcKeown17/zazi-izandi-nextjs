# Mobile Ops Usability — User Health & Clock In/Out Implementation Plan

> **For agentic workers:** This plan is orchestrated by a lead session dispatching one `codex:codex-rescue` subagent per task, with review between tasks. Steps use checkbox (`- [ ]`) syntax for tracking. Every task ends with tests green and a commit.

**Goal:** Turn the User Health and Clock In/Out reports from evidence audits into operational tools a project/data manager can act on during cohort rollouts — filterable, sortable, exportable, cross-linked, and honest about what each signal proves.

**Architecture:** All Part A work is frontend-only in this repo, consuming the existing Django/Supabase response contracts unchanged. Derivation logic lives in pure functions under `lib/mobile/**` with colocated `node:test` tests; pages stay server components that parse URL params and pass initial state to client components. Part B (cohort/wave model) is cross-repo (Supabase migration → Django passthrough → frontend) and is gated separately.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · Recharts 3 (already a dependency) · `node:test` via `tsx`.

## Global Constraints

- **Branch/worktree:** Work on a fresh branch `feat/mobile-ops-usability` in an isolated worktree. Base it on the latest `fix/mobile-report-real-users` tip (or `main` if that branch has merged).
- **Codex collision guard:** A separate Codex session is actively changing the user-health login-evidence surface (`lib/mobile/user-health/presentation.ts`, `presentation.test.ts`, `test-fixtures.ts`, `types.ts`, `schema.ts`, `user-health-summary.tsx`, `user-health-board.tsx`). **Wave 1 (Tasks 1–4, attendance only) may start immediately. Wave 2 (Tasks 5–12) must not start until that work has landed and `npm run test:mobile` is green on the base branch.** Before each Wave 2 task, re-read the current file contents — do not assume the snapshots in this plan are current.
- **Terminology:** User-facing copy says "EA"/"EAs", never "youth" (CLAUDE.md rule; EAs are called LCs in other Masi programmes but this codebase says EA).
- **Honesty invariants (do not weaken):** a missing device signal is *unknown*, never "not installed"; imported TeamPact assessments are data evidence, never usage; a Supabase Auth timestamp at/before the provisioning cutoff is never login proof; server-data readiness proves stored counts, not what a device rendered. Existing tests assert some of this copy — keep them passing.
- **Tests:** `npm run test:mobile` (runs `tsx --test lib/mobile/*.test.ts lib/mobile/*/*.test.ts`). Component render tests use `createElement` + `renderToStaticMarkup` (see `lib/mobile/user-health/summary.test.ts` for the idiom — no JSX in `.ts` test files).
- **Verification per task:** `npm run test:mobile` and `npx tsc --noEmit` must pass before each commit. Run focused ESLint (`npx eslint <changed files>`) — repo-wide lint has a known pre-existing failure in `app/pm/data-quality/page.tsx`; do not fix or worsen it.
- **No new dependencies.** Recharts is already installed and used under `components/pm/`.
- **Charts:** single hue (brand `primary` #2c5aa0), one axis, tooltips on, integer ticks, zero-filled series, no legend for single-series charts, thin rounded-top bars.
- **Dates:** display via `Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", ... })` exactly like existing components.
- **Commits:** conventional prefix per task, no Co-Authored-By trailers, no agent names.
- **Backend contract facts (verified against the Django + Supabase sources; do not "fix" these from the frontend):**
  - Per-user `activity.*` counts AND `last_*_at` timestamps are **windowed to `days`**. Django rejects the payload (502) if a count is 0 while its timestamp is non-null, so a lifetime timestamp can never appear under the current contract. Copy must qualify "last activity" with the window.
  - Without a `school_id` filter the population is every (non-synthetic, non-banned) Supabase Auth account; with a `school_id` it collapses to rostered domain rows only. Totals are not comparable across that toggle.
  - `junior_staff` holds `mobile.time_entries.read` but **not** `mobile.user_health.read` — any link from the attendance page into user health must be capability-gated or it 403s for them.
  - The login-evidence branch (`fix/mobile-report-real-users`, Django + Supabase sides) adds `auth.provisioning_cutoff_at`, `auth.authenticated_after_provisioning`, and summary keys `authentication_measurable` / `authenticated_after_provisioning`. Wave 2 assumes these have landed.
- **Repo map (for Part B and context):** Next.js frontend = this repo. Django = `/Users/jimmckeown/Development/zazi-mobile-clock-reporting-django` (worktree of `Zazi_iZandi_Website_2025`, branch `fix/mobile-report-real-users`). Supabase RPC SQL = `/Users/jimmckeown/Development/zazi-mobile-clock-reporting-supabase/supabase/migrations/` (worktree of the mobile-app repo `zazi-izandi-app`). Part A never touches the other repos.

---

## Wave 1 — Clock In/Out (no collision risk, start immediately)

### Task 1: Per-EA clock rollup derivation

**Files:**
- Create: `lib/mobile/time-entries/rollup.ts`
- Test: `lib/mobile/time-entries/rollup.test.ts`

**Interfaces:**
- Consumes: `MobileTimeEntryRow` from `lib/mobile/time-entries/types.ts`, fixture `VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD` from `lib/mobile/time-entries/test-fixtures.ts`.
- Produces: `interface EaClockRollup { user_id: string; ea_name: string; current_school: string; employment_status: string | null; days_clocked: number; completed_entries: number; total_completed_minutes: number; average_shift_minutes: number | null; automatic_clock_outs: number; automatic_rate: number | null; open_now: boolean; last_clock_in_at: string }` and `function buildEaClockRollups(entries: MobileTimeEntryRow[]): EaClockRollup[]` (sorted by `days_clocked` desc, ties by `ea_name` asc). Task 2 renders this; Task 12 links from it.

- [ ] **Step 1: Write the failing test**

```ts
// lib/mobile/time-entries/rollup.test.ts
import assert from "node:assert/strict";
import test from "node:test";

import { buildEaClockRollups } from "./rollup";
import { VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD } from "./test-fixtures";

test("rollups aggregate shifts per EA with distinct days and completed-only durations", () => {
  const rollups = buildEaClockRollups(
    VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD.entries
  );
  assert.equal(rollups.length, 2);

  const [asemahle, lihle] = rollups;
  assert.equal(asemahle.ea_name, "Asemahle Mancayi");
  assert.equal(asemahle.days_clocked, 2);
  assert.equal(asemahle.completed_entries, 1);
  assert.equal(asemahle.total_completed_minutes, 480);
  assert.equal(asemahle.average_shift_minutes, 480);
  assert.equal(asemahle.automatic_clock_outs, 0);
  assert.equal(asemahle.automatic_rate, 0);
  assert.equal(asemahle.open_now, true);
  assert.equal(asemahle.last_clock_in_at, "2026-08-11T06:10:00.000Z");

  assert.equal(lihle.ea_name, "Lihle Jacobs");
  assert.equal(lihle.days_clocked, 1);
  assert.equal(lihle.automatic_clock_outs, 1);
  assert.equal(lihle.automatic_rate, 1);
  assert.equal(lihle.open_now, false);
});

test("an EA with no completed shifts has null averages, not divide-by-zero artifacts", () => {
  const openOnly = VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD.entries.filter(
    (entry) => entry.duration_minutes === null
  );
  const [rollup] = buildEaClockRollups(openOnly);
  assert.equal(rollup.completed_entries, 0);
  assert.equal(rollup.average_shift_minutes, null);
  assert.equal(rollup.automatic_rate, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test lib/mobile/time-entries/rollup.test.ts`
Expected: FAIL — cannot find module `./rollup`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/mobile/time-entries/rollup.ts
import type { MobileTimeEntryRow } from "./types";

export interface EaClockRollup {
  user_id: string;
  ea_name: string;
  current_school: string;
  employment_status: string | null;
  days_clocked: number;
  completed_entries: number;
  total_completed_minutes: number;
  average_shift_minutes: number | null;
  automatic_clock_outs: number;
  automatic_rate: number | null;
  open_now: boolean;
  last_clock_in_at: string;
}

export function buildEaClockRollups(
  entries: MobileTimeEntryRow[]
): EaClockRollup[] {
  const byUser = new Map<string, MobileTimeEntryRow[]>();
  for (const entry of entries) {
    const existing = byUser.get(entry.user_id);
    if (existing) existing.push(entry);
    else byUser.set(entry.user_id, [entry]);
  }

  const rollups: EaClockRollup[] = [];
  for (const rows of byUser.values()) {
    const latest = rows.reduce((a, b) =>
      a.sign_in_time >= b.sign_in_time ? a : b
    );
    const completed = rows.filter((row) => row.duration_minutes !== null);
    const totalMinutes = completed.reduce(
      (sum, row) => sum + (row.duration_minutes ?? 0),
      0
    );
    const automatic = rows.filter((row) => row.auto_clocked_out).length;
    rollups.push({
      user_id: latest.user_id,
      ea_name: latest.ea_name,
      current_school: latest.current_school,
      employment_status: latest.employment_status,
      days_clocked: new Set(rows.map((row) => row.local_date)).size,
      completed_entries: completed.length,
      total_completed_minutes: totalMinutes,
      average_shift_minutes:
        completed.length > 0 ? Math.round(totalMinutes / completed.length) : null,
      automatic_clock_outs: automatic,
      automatic_rate:
        completed.length > 0 ? automatic / completed.length : null,
      open_now: rows.some((row) => row.is_active),
      last_clock_in_at: latest.sign_in_time,
    });
  }

  return rollups.sort(
    (a, b) =>
      b.days_clocked - a.days_clocked || a.ea_name.localeCompare(b.ea_name)
  );
}
```

Note the automatic-rate denominator is *completed* entries: an open shift can't yet be automatic, and dividing by all entries would understate the forgetting-to-clock-out habit the metric exists to expose.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test lib/mobile/time-entries/rollup.test.ts` then `npm run test:mobile` and `npx tsc --noEmit`.
Expected: PASS, whole suite green.

- [ ] **Step 5: Commit**

```bash
git add lib/mobile/time-entries/rollup.ts lib/mobile/time-entries/rollup.test.ts
git commit -m "feat: derive per-EA clock rollups"
```

### Task 2: Attendance ledger with By shift / By EA toggle and search

**Files:**
- Create: `components/mobile-app/attendance/attendance-ledger.tsx`
- Create: `components/mobile-app/attendance/ea-rollup-table.tsx`
- Modify: `app/mobile-app/attendance/page.tsx` (replace the bare `<ClockEntriesTable entries={data.entries} />` with the ledger wrapper; parse `q` and `view` search params)
- Modify: `components/mobile-app/attendance/attendance-filters.tsx` (two changes: (a) one static sentence under the export control: "Exports every entry in the selected window and school — including GPS coordinates. On-page search does not narrow it." — the export's true scope must be stated **at the button**, not only at the faraway search box; (b) the same merge-not-replace state contract as the user-health filters — see the state-contract block in step 3)
- Test: `lib/mobile/time-entries/ledger.test.ts`

**Attendance state contract (adversarial-review finding, adopted — mirrors Task 6's user-health contract exactly):** a PM who arrives via a cross-link (`q=<user_id>&view=ea`) and then changes the window or school must not lose the EA filter or view. Three parts:
1. `AttendanceLedger` mirrors `q` and `view` into the URL on every change via the same `window.history.replaceState` helper shape as Task 6's `syncUrl` (delete `q` when empty, delete `view` when `"shifts"`).
2. `AttendanceFilters` becomes a client component whose submit/clear handlers merge into the **current** `window.location.search` (Task 6's `navigateMerged` pattern, target `/mobile-app/attendance`), with controlled selects.
3. The page mounts both with remount keys from the applied params: `<AttendanceFilters key={`${data.days}|${data.applied_filters.school_id ?? ""}`} …/>` and `<AttendanceLedger key={`${initialQuery}|${view}`} …/>`.

**Interfaces:**
- Consumes: `buildEaClockRollups`, `EaClockRollup` (Task 1); `ClockEntriesTable` (existing, unchanged); `formatDuration` from `lib/mobile/time-entries/presentation.ts`.
- Produces: `AttendanceLedger` client component with props `{ entries: MobileTimeEntryRow[]; initialQuery?: string; initialView?: "shifts" | "ea" }`; `EaRollupTable` with props `{ rollups: EaClockRollup[] }`. Task 3 mounts the trend chart above this; Task 12 adds cross-links inside `EaRollupTable`/`ClockEntriesTable`.

- [ ] **Step 1: Write the failing render test**

```ts
// lib/mobile/time-entries/ledger.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AttendanceLedger } from "@/components/mobile-app/attendance/attendance-ledger";
import { VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD } from "./test-fixtures";

const entries = VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD.entries;

test("the EA view renders one aggregated row per EA", () => {
  const html = renderToStaticMarkup(
    createElement(AttendanceLedger, { entries, initialView: "ea" })
  );
  assert.match(html, /Asemahle Mancayi/);
  assert.match(html, /Lihle Jacobs/);
  assert.match(html, /Days clocked/i);
  assert.match(html, /Auto clock-outs/i);
});

test("an initial query narrows both views and explains the summary scope", () => {
  const html = renderToStaticMarkup(
    createElement(AttendanceLedger, { entries, initialQuery: "Lihle" })
  );
  assert.match(html, /Lihle Jacobs/);
  assert.doesNotMatch(html, /Asemahle Mancayi/);
  assert.match(html, /does not change the summary tiles/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test lib/mobile/time-entries/ledger.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the components**

`components/mobile-app/attendance/ea-rollup-table.tsx` — a server-compatible presentational table (no hooks): columns EA (name + school + employment badge via `getEmploymentStatusDisplay`), Days clocked, Completed shifts, Recorded hours (`formatDuration(total_completed_minutes)`), Avg shift, Auto clock-outs (count, and percentage when `automatic_rate !== null`, e.g. `1 (100%)`), Last clock-in (reuse the `DATE_FORMAT`/`TIME_FORMAT` idiom from `clock-entries-table.tsx`), and a Live badge when `open_now`. Include the same desktop-table / mobile-card split pattern used by `ClockEntriesTable`. Empty state: "No EAs match this search."

`components/mobile-app/attendance/attendance-ledger.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";

import { buildEaClockRollups } from "@/lib/mobile/time-entries/rollup";
import type { MobileTimeEntryRow } from "@/lib/mobile/time-entries/types";
import { cn } from "@/lib/utils";
import { ClockEntriesTable } from "./clock-entries-table";
import { EaRollupTable } from "./ea-rollup-table";

type LedgerView = "shifts" | "ea";

function syncUrl(next: { q: string; view: LedgerView }) {
  const url = new URL(window.location.href);
  if (next.q === "") url.searchParams.delete("q");
  else url.searchParams.set("q", next.q);
  if (next.view === "shifts") url.searchParams.delete("view");
  else url.searchParams.set("view", next.view);
  window.history.replaceState(null, "", url.toString());
}

export function AttendanceLedger({
  entries,
  initialQuery = "",
  initialView = "shifts",
}: {
  entries: MobileTimeEntryRow[];
  initialQuery?: string;
  initialView?: LedgerView;
}) {
  const [view, setView] = useState<LedgerView>(initialView);
  const [query, setQuery] = useState(initialQuery);
  const needle = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      needle.length === 0
        ? entries
        : entries.filter(
            (entry) =>
              entry.ea_name.toLowerCase().includes(needle) ||
              entry.current_school.toLowerCase().includes(needle) ||
              entry.user_id.toLowerCase() === needle
          ),
    [entries, needle]
  );
  const rollups = useMemo(() => buildEaClockRollups(filtered), [filtered]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
          {(
            [
              ["shifts", "By shift"],
              ["ea", "By EA"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setView(value);
                syncUrl({ q: query, view: value });
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold",
                view === value
                  ? "bg-primary text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="sm:w-72">
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              syncUrl({ q: event.target.value, view });
            }}
            placeholder="Search EA or school"
            aria-label="Search EA or school"
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Search narrows the ledger and per-EA view; it does not change the
            summary tiles above{" "}
            <strong>or the CSV export, which always covers the full window and
            school scope, including GPS coordinates</strong>.
          </p>
        </div>
      </div>
      {view === "shifts" ? (
        <ClockEntriesTable entries={filtered} />
      ) : (
        <EaRollupTable rollups={rollups} />
      )}
    </div>
  );
}
```

In `app/mobile-app/attendance/page.tsx`, parse the params next to the existing `days` parsing and swap the table, **mounting with a remount key so URL-supplied values are reapplied after same-route navigation** (a `useState` initializer ignores new props on a preserved mount):

```ts
const initialQuery = firstValue(params.q) ?? "";
const view = firstValue(params.view) === "ea" ? "ea" : "shifts";
```

```tsx
<AttendanceLedger
  key={`${initialQuery}|${view}`}
  entries={data.entries}
  initialQuery={initialQuery}
  initialView={view}
/>
```

And `AttendanceFilters` gets the same client-side merge contract as Task 6's user-health filters, so applying/clearing window or school never wipes `q`/`view` — mounted keyed as `<AttendanceFilters key={`${data.days}|${data.applied_filters.school_id ?? ""}`} …/>`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { MobileSchoolOption } from "@/lib/mobile/types";
import { TimeEntryExportButton } from "./time-entry-export-button";

const DAY_OPTIONS = [7, 14, 30, 60, 90] as const;

export function AttendanceFilters({
  days,
  selectedSchoolId,
  schoolOptions,
  canExport,
}: {
  days: number;
  selectedSchoolId: string | null;
  schoolOptions: MobileSchoolOption[];
  canExport: boolean;
}) {
  const router = useRouter();
  const [pendingDays, setPendingDays] = useState(String(days));
  const [pendingSchoolId, setPendingSchoolId] = useState(selectedSchoolId ?? "");
  const hasCustomDays = !DAY_OPTIONS.some((option) => String(option) === pendingDays);

  function navigateMerged(updates: Record<string, string | null>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    router.push(`/mobile-app/attendance?${params.toString()}`);
  }

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          navigateMerged({ days: pendingDays, school_id: pendingSchoolId || null });
        }}
        className="grid gap-3 sm:grid-cols-[10rem_minmax(15rem,1fr)_auto_auto] sm:items-end"
      >
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Reporting window
          <select
            name="days"
            value={pendingDays}
            onChange={(event) => setPendingDays(event.target.value)}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {hasCustomDays ? <option value={pendingDays}>{pendingDays} days</option> : null}
            {DAY_OPTIONS.map((option) => (
              <option key={option} value={String(option)}>
                Last {option} days
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Current school
          <select
            name="school_id"
            value={pendingSchoolId}
            onChange={(event) => setPendingSchoolId(event.target.value)}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All current schools</option>
            {schoolOptions.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2"
        >
          Apply filters
        </button>

        {selectedSchoolId ? (
          <button
            type="button"
            onClick={() => {
              setPendingSchoolId("");
              navigateMerged({ school_id: null });
            }}
            className="flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Clear school
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
      </form>

      {canExport ? (
        <div>
          <TimeEntryExportButton days={days} schoolId={selectedSchoolId} />
          <p className="mt-1 max-w-64 text-xs leading-relaxed text-slate-500">
            Exports every entry in the selected window and school — including
            GPS coordinates. On-page search does not narrow it.
          </p>
        </div>
      ) : (
        <p className="max-w-64 text-xs leading-relaxed text-slate-500">
          CSV export is restricted because it includes clock-location data.
        </p>
      )}
    </div>
  );
}
```

(The submit and clear handlers both go through `navigateMerged`, so `q` and `view` in the current URL always survive; the page's remount key resets the controlled state after each navigation.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test lib/mobile/time-entries/ledger.test.ts`, then `npm run test:mobile`, `npx tsc --noEmit`, and `npx eslint components/mobile-app/attendance app/mobile-app/attendance/page.tsx lib/mobile/time-entries`.
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add components/mobile-app/attendance app/mobile-app/attendance/page.tsx lib/mobile/time-entries/ledger.test.ts
git commit -m "feat: add per-EA view and search to the clock ledger"
```

### Task 3: Daily clocking trend

**Files:**
- Create: `lib/mobile/time-entries/daily-series.ts`
- Create: `components/mobile-app/attendance/attendance-trend-chart.tsx`
- Modify: `app/mobile-app/attendance/page.tsx` (mount the chart between `<AttendanceSummary />` and the open-shift banner)
- Test: `lib/mobile/time-entries/daily-series.test.ts`

**Interfaces:**
- Consumes: `MobileTimeEntryRow.local_date` (already a SAST `YYYY-MM-DD` string) and `user_id`; `data.days` and `data.generated_at` from the page.
- Produces: `interface DailyClockPoint { date: string; distinct_eas: number }` and `function buildDailyClockSeries(entries: MobileTimeEntryRow[], days: number, generatedAt: string): DailyClockPoint[]` (one point per calendar day, oldest first, zero-filled); `AttendanceTrendChart` client component with props `{ series: DailyClockPoint[] }`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/mobile/time-entries/daily-series.test.ts
import assert from "node:assert/strict";
import test from "node:test";

import { buildDailyClockSeries } from "./daily-series";
import { VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD } from "./test-fixtures";

test("the series zero-fills every SAST day in the window and counts distinct EAs", () => {
  const series = buildDailyClockSeries(
    VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD.entries,
    7,
    "2026-08-11T14:30:00.000Z"
  );
  assert.equal(series.length, 7);
  assert.equal(series[0].date, "2026-08-05");
  assert.equal(series[6].date, "2026-08-11");
  assert.deepEqual(
    series.map((point) => point.distinct_eas),
    [0, 0, 0, 0, 1, 1, 1]
  );
});

test("two shifts by one EA on one day count once", () => {
  const [entry] = VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD.entries;
  const series = buildDailyClockSeries(
    [entry, { ...entry, id: "duplicate-day" }],
    1,
    "2026-08-11T14:30:00.000Z"
  );
  assert.deepEqual(series, [{ date: "2026-08-11", distinct_eas: 1 }]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test lib/mobile/time-entries/daily-series.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the series builder and chart**

```ts
// lib/mobile/time-entries/daily-series.ts
import type { MobileTimeEntryRow } from "./types";

export interface DailyClockPoint {
  date: string;
  distinct_eas: number;
}

const SAST_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Johannesburg",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function buildDailyClockSeries(
  entries: MobileTimeEntryRow[],
  days: number,
  generatedAt: string
): DailyClockPoint[] {
  const easByDate = new Map<string, Set<string>>();
  for (const entry of entries) {
    const set = easByDate.get(entry.local_date) ?? new Set<string>();
    set.add(entry.user_id);
    easByDate.set(entry.local_date, set);
  }

  const end = new Date(generatedAt);
  const series: DailyClockPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(end.getTime() - offset * 24 * 60 * 60 * 1000);
    const date = SAST_DATE.format(day);
    series.push({ date, distinct_eas: easByDate.get(date)?.size ?? 0 });
  }
  return series;
}
```

`components/mobile-app/attendance/attendance-trend-chart.tsx` (client component). Single series → no legend; the heading names it. Brand primary fill, rounded tops, integer y-axis, per-bar tooltip:

```tsx
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DailyClockPoint } from "@/lib/mobile/time-entries/daily-series";

const LABEL_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  day: "2-digit",
  month: "short",
});

function formatDay(date: string): string {
  return LABEL_FORMAT.format(new Date(`${date}T12:00:00+02:00`));
}

export function AttendanceTrendChart({ series }: { series: DailyClockPoint[] }) {
  return (
    <div
      data-testid="attendance-trend"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="font-bold text-slate-900">EAs clocking in per day</h2>
      <p className="mt-1 text-xs text-slate-500">
        Distinct EAs with at least one clock-in, per SAST calendar day. During a
        rollout this line rising is the adoption signal.
      </p>
      <div className="mt-3 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDay}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              // Params stay inferred and are normalized inside: Recharts 3 types
              // them as broad ValueType/label unions, so annotating them as
              // number/string fails the strict tsc gate.
              formatter={(value) => [`${Number(value)} EAs`, "Clocked in"]}
              labelFormatter={(label) => formatDay(String(label))}
              cursor={{ fill: "rgba(44, 90, 160, 0.08)" }}
            />
            <Bar dataKey="distinct_eas" fill="#2c5aa0" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

In the page, compute the series server-side and mount:

```tsx
const trendSeries = buildDailyClockSeries(data.entries, data.days, data.generated_at);
```

```tsx
<AttendanceTrendChart series={trendSeries} />
```

- [ ] **Step 4: Run tests and eyeball the render**

Run: `npx tsx --test lib/mobile/time-entries/daily-series.test.ts`, `npm run test:mobile`, `npx tsc --noEmit`.
Then `npm run dev` and view `/mobile-app/attendance` (or the fixture-backed preview if Clerk keys are absent locally) to check label collisions at `days=90` — `minTickGap` should thin the ticks.
Expected: tests PASS; chart renders with no overlapping labels.

- [ ] **Step 5: Commit**

```bash
git add lib/mobile/time-entries/daily-series.ts lib/mobile/time-entries/daily-series.test.ts components/mobile-app/attendance/attendance-trend-chart.tsx app/mobile-app/attendance/page.tsx
git commit -m "feat: add daily clocking trend chart"
```

### Task 4: Attendance CSV parity check + copy touch-up

**Files:**
- Modify: `app/mobile-app/attendance/page.tsx` (only if copy drifts from the new components)
- Verify: `components/mobile-app/attendance/time-entry-export-button.tsx`, `app/mobile-app/exports/[kind]/route.ts`

This is a verification task, not a build task: confirm the existing CSV export still works after the ledger refactor (the export button takes `days`/`schoolId` and is independent of client-side search — confirm by reading, then exercise the route in dev). Confirm the page's `q`/`view` params round-trip (load `/mobile-app/attendance?q=Lihle&view=ea`, see the filtered EA view). Fix anything broken; otherwise commit nothing.

- [ ] **Step 1:** Read the export button and route; confirm neither consumes the removed direct `<ClockEntriesTable>` mount.
- [ ] **Step 2:** In dev, load `/mobile-app/attendance?q=Lihle&view=ea` and confirm the EA view opens pre-filtered, **and** that the export-scope disclosure ("always covers the full window and school scope, including GPS coordinates") is visible next to the search while a query is active. Then exercise the state contract: with the query and `By EA` view active, change the activity window, change the school, and clear the school — `q` and `view` must survive all three transitions in both the URL and the rendered ledger, and typing in the search must update the URL. The export deliberately ignores client-side search — a search-scoped, GPS-bearing export requires a validated `user_id` filter through the Django/RPC contract and is listed under deferred work; until then the UI must say what the file will contain.
- [ ] **Step 3:** If and only if changes were needed: `npm run test:mobile`, `npx tsc --noEmit`, commit as `fix: attendance ledger param handling`.

---

## Wave 2 — User Health (gated: start only after the login-evidence branch has landed and `npm run test:mobile` is green on base)

> **Contract note for all Wave 2 tasks:** the login-evidence work adds `auth.provisioning_cutoff_at`, `auth.authenticated_after_provisioning`, and summary counts `authentication_measurable` / `authenticated_after_provisioning` (see `lib/mobile/user-health/test-fixtures.ts`), plus a `getProvisioningAuthenticationPresentation` helper. Re-read `types.ts`, `presentation.ts`, and both components before starting each task. If a named field is absent after landing, follow the fallback noted in the task.

### Task 5: Two-axis health model (stage × blockers)

**Files:**
- Modify: `lib/mobile/user-health/presentation.ts`
- Modify: `lib/mobile/user-health/presentation.test.ts`
- Modify: `components/mobile-app/user-health/user-health-board.tsx` (badge + filter select)

**Interfaces:**
- Consumes: `MobileUserHealthRow` (landed shape), existing `getUserAttentionReasons`, `hasSeededDataReady`, `getProvisioningAuthenticationPresentation` (keep all three working).
- Produces (later tasks depend on these exact names):
  - `type ActivityStage = "not_started" | "reached" | "active"`
  - `type UserHealthPredicate = "all" | "has_blockers" | "active" | "reached" | "not_started"`
  - `function getActivityStage(user: MobileUserHealthRow): ActivityStage`
  - `function matchesUserHealthPredicate(user: MobileUserHealthRow, predicate: UserHealthPredicate): boolean`
  - `getUserHealthState` and `UserHealthState` are **deleted**; `getUserAttentionReasons` keeps its name.

**Why:** the current single state conflates two orthogonal facts — blockers swallow activity (an EA actively teaching but with one ungrouped child renders "Needs attention", hiding that she uses the app). Stage and blockers become independent axes.

**Honesty boundary (adversarial-review findings, adopted):** Part A's stage is a **current-evidence classification, not a lifetime ratchet**. Specifically: (a) activity evidence is windowed — `active` means "usage evidence in the selected window" and every user-facing label carries the window (`Active · {days}d`); shrinking `days` can demote `active` → `reached`, visibly. (b) `reached` inputs are non-windowed but not all durable: `authenticated_after_provisioning` is durable (a sign-in timestamp only moves forward), but `app_device.registered` reflects the latest **non-invalidated** push token — the system invalidates tokens on device loss/replacement and `DeviceNotRegistered` receipts, so a device-only EA can legitimately regress `reached` → `not_started` when their token dies. That regression is correct behavior (the evidence genuinely went away) and is documented in the how-to panel, not hidden. A true lifetime ratchet plus a "quiet" (activated-then-dormant) state requires the Part B durable/lifetime fields and ships there, not here.

- [ ] **Step 1: Rewrite the presentation tests, preserving the landed tests' intent**

Replace the state-related tests in `lib/mobile/user-health/presentation.test.ts` (keep the `hasSeededDataReady`, attention-reason, and `getProvisioningAuthenticationPresentation` tests as they landed, adjusting only renamed imports). The intents that MUST survive, re-expressed against the new API:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  getActivityStage,
  getUserAttentionReasons,
  matchesUserHealthPredicate,
} from "./presentation";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "./test-fixtures";

const base = VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0];
const noDevice = {
  registered: false as const,
  platform: null,
  app_version: null,
  last_seen_at: null,
};
const noActivity = {
  clock_entries: 0,
  sessions: 0,
  app_assessments: 0,
  last_clock_in_at: null,
  last_session_at: null,
  last_app_assessment_at: null,
  last_activity_at: null,
};

test("usage evidence in the window means active", () => {
  assert.equal(getActivityStage(base), "active");
});

test("without in-window activity, remaining reach evidence yields reached, not not_started", () => {
  // Simulates the same EA viewed through a window that excludes her activity:
  // device/auth evidence still present → reached.
  const outsideWindow = { ...base, activity: noActivity };
  assert.equal(getActivityStage(outsideWindow), "reached");
});

test("stage is current-evidence: an invalidated device token with no durable auth proof regresses to not_started", () => {
  // Documented semantics, not a bug: if the only reach evidence was a push token
  // and it is invalidated (device lost/replaced), the evidence is gone.
  const deviceLost = {
    ...base,
    auth: { ...base.auth, authenticated_after_provisioning: false },
    app_device: noDevice,
    activity: noActivity,
  };
  assert.equal(getActivityStage(deviceLost), "not_started");
});

test("a provisioning-check timestamp alone does not advance the stage", () => {
  const preCutoff = {
    ...base,
    auth: { ...base.auth, authenticated_after_provisioning: false },
    app_device: noDevice,
    activity: noActivity,
  };
  assert.equal(getActivityStage(preCutoff), "not_started");
});

test("post-provisioning authentication or a device signal reaches the EA without proving usage", () => {
  const authOnly = { ...base, app_device: noDevice, activity: noActivity };
  assert.equal(getActivityStage(authOnly), "reached");
  const deviceOnly = {
    ...base,
    auth: { ...base.auth, authenticated_after_provisioning: false },
    activity: noActivity,
  };
  assert.equal(getActivityStage(deviceOnly), "reached");
});

test("blockers are reported independently of the stage", () => {
  const blockedButActive = {
    ...base,
    auth: { ...base.auth, state: "unconfirmed" as const },
  };
  assert.equal(getActivityStage(blockedButActive), "active");
  assert.deepEqual(getUserAttentionReasons(blockedButActive), ["auth_blocked"]);
  assert.equal(matchesUserHealthPredicate(blockedButActive, "has_blockers"), true);
  assert.equal(matchesUserHealthPredicate(blockedButActive, "active"), true);
});
```

(If the landed fixture's `users[0]` no longer has activity + device + post-provisioning auth, pick or construct a row that does; the point is explicit evidence objects, not fixture indices.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test lib/mobile/user-health/presentation.test.ts`
Expected: FAIL — new exports missing.

- [ ] **Step 3: Implement the model**

In `presentation.ts`, delete `UserHealthState`/`getUserHealthState`, add:

```ts
export type ActivityStage = "not_started" | "reached" | "active";
export type UserHealthPredicate =
  | "all"
  | "has_blockers"
  | "active"
  | "reached"
  | "not_started";

function hasUsageEvidenceInWindow(user: MobileUserHealthRow): boolean {
  return (
    user.activity.clock_entries +
      user.activity.sessions +
      user.activity.app_assessments >
    0
  );
}

export function getActivityStage(user: MobileUserHealthRow): ActivityStage {
  if (hasUsageEvidenceInWindow(user)) return "active";
  if (user.app_device.registered) return "reached";
  if (user.auth.authenticated_after_provisioning) return "reached";
  return "not_started";
}

export function matchesUserHealthPredicate(
  user: MobileUserHealthRow,
  predicate: UserHealthPredicate
): boolean {
  if (predicate === "all") return true;
  if (predicate === "has_blockers")
    return getUserAttentionReasons(user).length > 0;
  return getActivityStage(user) === predicate;
}
```

Fallback: if the landed `auth` type has no `authenticated_after_provisioning`, drop that clause so `reached` requires a device signal (the `fa5a40c` rule).

- [ ] **Step 4: Rewire the board**

In `user-health-board.tsx`: replace `HealthBadge` with a stage badge that takes `{ user, days }` — labels `{ active: `Active · ${days}d`, reached: "Onboarding", not_started: "Not started" }`, tones `{ active: emerald, reached: blue, not_started: slate }` (reuse the existing ring/pill classes). The window lives **in the badge text** so a PM narrowing to 7 days sees "Active · 7d" and cannot mistake it for a lifetime claim. Keep `AttentionReasons` chips rendered for every row regardless of stage. **Also render an employment badge in the identity cell** using `getEmploymentStatusDisplay` from `@/lib/mobile/presentation` — the same pattern as `EmploymentBadge` in `clock-entries-table.tsx` (hidden when active/unknown-null, a slate pill labeling Inactive/Resigned/Status unknown otherwise). The report population is every non-banned Auth account, so resigned or inactive EAs appear here; without the badge a PM would chase a resigned EA as a "Not started" rollout target. Replace the `stateFilter` select with a `predicate` select over `UserHealthPredicate` (labels: All EAs / Has blockers / Active in window / Onboarding / Not started) filtering via `matchesUserHealthPredicate`.

- [ ] **Step 5: Run everything**

Run: `npm run test:mobile`, `npx tsc --noEmit`, `npx eslint lib/mobile/user-health components/mobile-app/user-health`.
Expected: PASS. `summary.test.ts` must still pass untouched.

- [ ] **Step 6: Commit**

```bash
git add lib/mobile/user-health/presentation.ts lib/mobile/user-health/presentation.test.ts components/mobile-app/user-health/user-health-board.tsx
git commit -m "feat: split user health into independent stage and blockers"
```

### Task 6: URL-initialized board filters + clickable summary tiles

**Files:**
- Modify: `app/mobile-app/user-health/page.tsx` (parse `q`, `state`, `cohort`; pass to board and summary)
- Modify: `components/mobile-app/user-health/user-health-board.tsx` (initial state props)
- Modify: `components/mobile-app/user-health/user-health-summary.tsx` (tiles become links)
- Modify: `components/mobile-app/user-health/user-health-filters.tsx` (must preserve board params — see step 3.3)
- Test: extend `lib/mobile/user-health/summary.test.ts`

**Interfaces:**
- Consumes: `UserHealthPredicate`, `matchesUserHealthPredicate` (Task 5).
- Produces: board props `{ users, days, initialQuery?: string, initialPredicate?: UserHealthPredicate, initialCohort?: MobileUserHealthRow["data"]["expectation"] | "all" }`. The summary keeps its existing `{ data }` prop unchanged — `days` and the applied school come from `data.days` and `data.applied_filters.school_id`, which are already in the payload, so the existing render tests keep compiling untouched. Task 12 relies on `initialQuery` for inbound cross-links.

- [ ] **Step 1: Write the failing test** — extend `summary.test.ts`:

```ts
test("summary tiles deep-link into board filters using the payload's own scope", () => {
  const html = renderToStaticMarkup(
    createElement(UserHealthSummary, { data: VALID_MOBILE_USER_HEALTH_PAYLOAD })
  );
  // days=30 comes from data.days; no school param because applied_filters.school_id is null
  assert.match(html, /href="\/mobile-app\/user-health\?days=30&amp;state=has_blockers"/);
  assert.match(html, /href="\/mobile-app\/user-health\?days=30&amp;state=active"/);
});
```

- [ ] **Step 2:** Run `npx tsx --test lib/mobile/user-health/summary.test.ts` — FAIL (props/links missing).

- [ ] **Step 3: Implement.** Page additions:

```ts
const PREDICATES = ["all", "has_blockers", "active", "reached", "not_started"] as const;
const COHORTS = ["all", "seeded", "self_setup", "unknown"] as const;
function parsePredicate(value: string | undefined): UserHealthPredicate {
  return (PREDICATES as readonly string[]).includes(value ?? "")
    ? (value as UserHealthPredicate)
    : "all";
}
function parseCohort(value: string | undefined) {
  return (COHORTS as readonly string[]).includes(value ?? "")
    ? (value as (typeof COHORTS)[number])
    : "all";
}
```

**State-sync design (adversarial-review finding, adopted — a `useState` initializer ignores new props after mount, so naive initial-prop seeding makes tile clicks silently dead):**

1. The page mounts the board with a **remount key** derived from the URL-supplied filters:

```tsx
<UserHealthBoard
  key={`${initialPredicate}|${initialCohort}|${initialQuery}`}
  users={data.users}
  days={data.days}
  initialQuery={initialQuery}
  initialPredicate={initialPredicate}
  initialCohort={initialCohort}
/>
```

Clicking a summary tile navigates (App Router `<Link>`), the server re-renders the page, the key changes, and the board remounts with the new filters — no stale client state possible.

2. Inside the board, every filter change (predicate/cohort select, search input) also mirrors itself into the URL **without navigation** via the App Router-supported shallow update, so the current view is always shareable and the back button behaves:

```ts
function syncUrl(next: { q: string; predicate: string; cohort: string }) {
  const url = new URL(window.location.href);
  const setOrDelete = (key: string, value: string, empty: string) => {
    if (value === empty) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  };
  setOrDelete("q", next.q, "");
  setOrDelete("state", next.predicate, "all");
  setOrDelete("cohort", next.cohort, "all");
  window.history.replaceState(null, "", url.toString());
}
```

Call `syncUrl` in each `onChange` handler after `setState`. `replaceState` (not `pushState`): keystrokes must not pollute history. Guard with `typeof window !== "undefined"` is unnecessary inside event handlers.

3. **The server filter form must not wipe board params (adversarial-review finding, adopted).** The existing `UserHealthFilters` is a plain GET form submitting only `days` + `school_id` — submitting it (or clicking "Clear school") would discard `q`/`state`/`cohort` and the keyed remount would reset the board. And because the board mirrors its live values into the URL via `replaceState`, server-rendered hidden inputs would be stale. Fix: convert `UserHealthFilters` to a client component that merges instead of replacing —

```tsx
"use client";
import { useRouter } from "next/navigation";

// inside the component:
const router = useRouter();
function navigateMerged(updates: Record<string, string | null>) {
  // window.location.search is current even after the board's replaceState calls
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
  }
  router.push(`/mobile-app/user-health?${params.toString()}`);
}
```

The form's submit handler calls `event.preventDefault()` then `navigateMerged({ days: String(days), school_id: schoolId || null })` from the two controls' values; "Clear school" becomes a button calling `navigateMerged({ school_id: null })`. Board params (`q`, `state`, `cohort`) survive untouched because they were never removed from the merged set.

Because `router.push` here is a same-route navigation, React preserves this mounted client component — `defaultValue` on the selects would go stale (the selector could still show the cleared school, and re-submitting would silently restore it). Two required guards: the two selects become **controlled** (`value` + `onChange` local state), and the page mounts the filters with a remount key from the applied server scope so incoming navigation resets them:

```tsx
<UserHealthFilters
  key={`${data.days}|${data.applied_filters.school_id ?? ""}`}
  days={data.days}
  selectedSchoolId={data.applied_filters.school_id}
  schoolOptions={data.school_options}
/>
```

In the summary, build each tile's `href` with a helper that always carries `days` (from `data.days`) and `school_id` (from `data.applied_filters.school_id`, only when non-null) — no new props, so every existing `UserHealthSummary` render call and test keeps compiling: "Needs attention" → `state=has_blockers`; `Active · Nd` → `state=active`; "Seeded data ready" → `cohort=seeded`; "EA accounts" → no extra params (clears filters). "Mobile logins" and "Device signals" tiles stay non-links until a matching predicate exists. Wrap linked tiles in `<Link>` with `hover:border-primary/40 transition-colors` on the card and a `text-[10px]` "Filter ↓" affordance so clickability is discoverable.

- [ ] **Step 4:** `npm run test:mobile`, `npx tsc --noEmit`. Then a manual browser pass in dev (this is the part static tests cannot see): (a) change the predicate select, edit the search, confirm the URL mirrors both; (b) click two different summary tiles in a row and confirm the board matches each after every click; (c) copy the URL into a fresh tab and confirm the identical filtered view; (d) press back and confirm URL and board agree; (e) with "Has blockers" and a search query active, change the activity window, change the school, then clear the school via the filter form — the board's predicate/cohort/query must survive all three transitions, **and after clearing, the school selector must read "All current schools" (not the stale school), and pressing Apply again must not reintroduce the cleared school**.

- [ ] **Step 5: Commit** — `git commit -m "feat: clickable summary tiles drive shareable board filters"`

### Task 7: Onboarding evidence coverage strip

**Framing (adversarial-review finding, adopted):** these five counts are **independent, non-nested populations** — an auth-blocked EA can be active; an active EA can lack a device signal (notification permission denied). Rendering them as a conversion funnel would invite PMs to read differences as stage drop-off. The component therefore presents them as parallel "evidence coverage" indicators: same at-a-glance bar layout, ordered by the onboarding journey for scanability, but with uniform styling (no darkening progression), each labeled as an independent share of all accounts, and a one-line caption stating they are not subsets of each other.

**Files:**
- Create: `components/mobile-app/user-health/user-health-funnel.tsx`
- Modify: `app/mobile-app/user-health/page.tsx` (mount above the evidence-stage cards; the cards are removed later in Task 11)
- Test: `lib/mobile/user-health/funnel.test.ts`

**Interfaces:**
- Consumes: `MobileUserHealthRow[]` and `hasSeededDataReady` (existing).
- Produces: `interface FunnelCounts { accounts: number; auth_ready: number; logged_in_after_provisioning: number | null; device_signal: number; active_in_window: number; seeded_expected: number; seeded_data_ready: number }`, `function buildFunnelCounts(users: MobileUserHealthRow[]): FunnelCounts` in `lib/mobile/user-health/funnel.ts`, and `UserHealthFunnel` component with props `{ counts: FunnelCounts; days: number }`. **Design intent:** counts are derived from rows, not from the server summary, so Part B can render the identical funnel for a wave subset by passing filtered rows. (Django computes its summary from these same rows, so the numbers agree; if they ever diverge that is a backend bug, not a display choice.)

- [ ] **Step 1: Failing test**

```ts
// lib/mobile/user-health/funnel.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { UserHealthFunnel } from "@/components/mobile-app/user-health/user-health-funnel";
import { buildFunnelCounts } from "./funnel";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "./test-fixtures";

test("funnel counts derived from rows match the server summary", () => {
  const counts = buildFunnelCounts(VALID_MOBILE_USER_HEALTH_PAYLOAD.users);
  const summary = VALID_MOBILE_USER_HEALTH_PAYLOAD.summary;
  assert.equal(counts.accounts, summary.total_users);
  assert.equal(counts.auth_ready, summary.auth_ready);
  assert.equal(counts.device_signal, summary.registered_devices);
  assert.equal(counts.active_in_window, summary.active_in_window);
  assert.equal(counts.seeded_expected, summary.seeded_expected);
  assert.equal(counts.seeded_data_ready, summary.seeded_data_ready);
  // Tri-state: null = unmeasured (no trusted provisioning cutoff), never a failure.
  assert.equal(
    counts.authentication_measurable,
    summary.authentication_measurable
  );
  assert.equal(
    counts.logged_in_after_provisioning,
    summary.authenticated_after_provisioning
  );
});

test("unmeasured authentication is excluded from the login denominator, not counted as failed", () => {
  const users = VALID_MOBILE_USER_HEALTH_PAYLOAD.users;
  const counts = buildFunnelCounts(users);
  const html = renderToStaticMarkup(
    createElement(UserHealthFunnel, { counts, days: 30 })
  );
  // Fixture: 2 authenticated of 3 measurable of 4 accounts → must read 2/3, never 2 · 50%.
  assert.match(html, /2\/3/);

  const allUnmeasured = users.map((user) => ({
    ...user,
    auth: { ...user.auth, authenticated_after_provisioning: null },
  }));
  const unmeasuredHtml = renderToStaticMarkup(
    createElement(UserHealthFunnel, {
      counts: buildFunnelCounts(allUnmeasured),
      days: 30,
    })
  );
  assert.match(unmeasuredHtml, /Not measured/i);
  assert.doesNotMatch(unmeasuredHtml, /0\/0|NaN/);
});

test("the funnel renders each evidence stage as count and share of accounts", () => {
  const counts = buildFunnelCounts(VALID_MOBILE_USER_HEALTH_PAYLOAD.users);
  const html = renderToStaticMarkup(
    createElement(UserHealthFunnel, { counts, days: 30 })
  );
  assert.match(html, /Accounts/);
  assert.match(html, /Auth ready/);
  assert.match(html, /Logged in after provisioning/i);
  assert.match(html, /Device signal/);
  assert.match(html, /Active · 30d/);
  assert.match(html, /Seeded data ready/);
});
```

- [ ] **Step 2:** Run it — FAIL.

- [ ] **Step 3: Implement.**

```ts
// lib/mobile/user-health/funnel.ts
import { hasSeededDataReady } from "./presentation";
import type { MobileUserHealthRow } from "./types";

export interface FunnelCounts {
  accounts: number;
  auth_ready: number;
  // Tri-state source: per-row authenticated_after_provisioning is true | false | null,
  // where null means "no trusted provisioning cutoff for this account" — unmeasured,
  // never failed. The login share is therefore over measurable accounts only.
  logged_in_after_provisioning: number;
  authentication_measurable: number;
  device_signal: number;
  active_in_window: number;
  seeded_expected: number;
  seeded_data_ready: number;
}

export function buildFunnelCounts(users: MobileUserHealthRow[]): FunnelCounts {
  let authReady = 0;
  let loggedIn = 0;
  let authMeasurable = 0;
  let deviceSignal = 0;
  let active = 0;
  let seededExpected = 0;
  let seededReady = 0;
  for (const user of users) {
    if (user.auth.state === "ready") authReady += 1;
    if (user.auth.authenticated_after_provisioning !== null) {
      authMeasurable += 1;
      if (user.auth.authenticated_after_provisioning) loggedIn += 1;
    }
    if (user.app_device.registered) deviceSignal += 1;
    if (
      user.activity.clock_entries +
        user.activity.sessions +
        user.activity.app_assessments >
      0
    )
      active += 1;
    if (user.data.expectation === "seeded") {
      seededExpected += 1;
      if (hasSeededDataReady(user)) seededReady += 1;
    }
  }
  return {
    accounts: users.length,
    auth_ready: authReady,
    logged_in_after_provisioning: loggedIn,
    authentication_measurable: authMeasurable,
    device_signal: deviceSignal,
    active_in_window: active,
    seeded_expected: seededExpected,
    seeded_data_ready: seededReady,
  };
}
```

(Fallback: if the landed `auth` type has no `authenticated_after_provisioning`, count nothing — `authentication_measurable: 0` — which renders as "Not measured".)

The component: under the heading "Onboarding evidence coverage" and the caption "Each row is independent evidence over all accounts — rows are not subsets of each other (an EA can be active without a device signal)." **Four bar rows share the all-accounts denominator**; for each `{ label, count, caveat }` render a track (`bg-slate-100`) with a filled bar `width: max(count/accounts*100, count>0 ? 2 : 0)%` in uniform `bg-primary/70` (deliberately no darkening progression — that reads as funnel conversion), and a right-aligned direct label `"{count} · {pct}%"` in slate ink (never on the fill). Bar rows, in journey order:

1. `Accounts` — `counts.accounts`, caveat "excludes synthetic and banned".
2. `Auth ready` — `counts.auth_ready`.
3. `Device signal` — `counts.device_signal`, caveat "positive evidence only — absence is unknown, not 'not installed'".
4. `Active · {days}d` — `counts.active_in_window`.

Below the bars, **two annotation rows — no bars, because each has a different denominator and drawing them on the all-accounts canvas would misstate the share**:

- `Logged in after provisioning: {logged_in_after_provisioning}/{authentication_measurable} of measurable accounts · {pct}%` where the percentage divides by `authentication_measurable`. When `authentication_measurable === 0`, render dashed grey "Not measured — no trusted provisioning cutoff for these accounts" instead (never `0/0`, never a failure claim). Unmeasured ≠ not-logged-in: `null` rows are excluded from the denominator entirely.
- `Seeded data ready: {seeded_data_ready}/{seeded_expected} of the seeded cohort`.

Bar percentages: `Math.round((count / Math.max(accounts, 1)) * 100)`. Page: `const funnelCounts = buildFunnelCounts(data.users)` server-side, mount `<UserHealthFunnel counts={funnelCounts} days={data.days} />` above the evidence-stage cards. (File/component names keep `funnel` for brevity; all user-facing copy says "evidence coverage".)

- [ ] **Step 4:** `npm run test:mobile`, `npx tsc --noEmit`; eyeball in dev — bars must not overflow their track at 100%, labels must not collide on mobile (stack label above track below `sm:`).

- [ ] **Step 5: Commit** — `git commit -m "feat: add onboarding funnel strip to user health"`

### Task 8: Board sorting

**Files:**
- Modify: `lib/mobile/user-health/presentation.ts`
- Modify: `components/mobile-app/user-health/user-health-board.tsx`
- Test: extend `lib/mobile/user-health/presentation.test.ts`

**Interfaces:**
- Produces: `type UserHealthSortKey = "urgency" | "last_activity" | "name" | "school"` and `function sortUserHealthRows(rows: MobileUserHealthRow[], key: UserHealthSortKey): MobileUserHealthRow[]` (pure, returns a new array). Task 9's export follows the current sort order.

- [ ] **Step 1: Failing test**

```ts
test("urgency sort puts blocked EAs first, then the least-advanced stages", () => {
  const rows = VALID_MOBILE_USER_HEALTH_PAYLOAD.users;
  const sorted = sortUserHealthRows(rows, "urgency");
  const blockedCount = sorted.filter(
    (user) => getUserAttentionReasons(user).length > 0
  ).length;
  assert.deepEqual(
    sorted.slice(0, blockedCount).map((u) => getUserAttentionReasons(u).length > 0),
    Array(blockedCount).fill(true)
  );
  assert.notEqual(sorted, rows); // pure — no in-place mutation
});

test("last_activity sort is newest first with never-active EAs last", () => {
  const sorted = sortUserHealthRows(VALID_MOBILE_USER_HEALTH_PAYLOAD.users, "last_activity");
  const stamps = sorted.map((u) => u.activity.last_activity_at);
  const nonNull = stamps.filter((s): s is string => s !== null);
  assert.deepEqual(nonNull, [...nonNull].sort().reverse());
  assert.equal(stamps.indexOf(null), stamps.length - stamps.filter((s) => s === null).length);
});
```

- [ ] **Step 2:** Run — FAIL.

- [ ] **Step 3: Implement**

```ts
export type UserHealthSortKey = "urgency" | "last_activity" | "name" | "school";

const STAGE_URGENCY: Record<ActivityStage, number> = {
  not_started: 0,
  reached: 1,
  active: 2,
};

export function sortUserHealthRows(
  rows: MobileUserHealthRow[],
  key: UserHealthSortKey
): MobileUserHealthRow[] {
  const sorted = [...rows];
  if (key === "name") {
    return sorted.sort((a, b) => a.display_name.localeCompare(b.display_name));
  }
  if (key === "school") {
    return sorted.sort(
      (a, b) =>
        a.current_school.localeCompare(b.current_school) ||
        a.display_name.localeCompare(b.display_name)
    );
  }
  if (key === "last_activity") {
    return sorted.sort((a, b) => {
      const left = a.activity.last_activity_at;
      const right = b.activity.last_activity_at;
      if (left === right) return a.display_name.localeCompare(b.display_name);
      if (left === null) return 1;
      if (right === null) return -1;
      return right.localeCompare(left);
    });
  }
  return sorted.sort((a, b) => {
    const blockerGap =
      getUserAttentionReasons(b).length - getUserAttentionReasons(a).length;
    if (blockerGap !== 0) return blockerGap;
    const stageGap =
      STAGE_URGENCY[getActivityStage(a)] - STAGE_URGENCY[getActivityStage(b)];
    if (stageGap !== 0) return stageGap;
    return a.display_name.localeCompare(b.display_name);
  });
}
```

Board: add a "Sort by" select (Most urgent / Last activity / Name / School), default `urgency`, applied after filtering and before pagination.

- [ ] **Step 4:** `npm run test:mobile`, `npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `git commit -m "feat: sort user health board by urgency, activity, name, or school"`

### Task 9: Chase-list export (CSV + copyable text)

**Files:**
- Create: `lib/mobile/user-health/export.ts`
- Modify: `lib/mobile/user-health/presentation.ts` (add the shared `selectBoardRows` selector)
- Modify: `components/mobile-app/user-health/user-health-board.tsx` (two buttons beside the result count; filtering refactored onto the shared selector)
- Modify: `lib/mobile/user-health/summary.test.ts` — its existing `UserHealthBoard` render mounts only `users` and `days`; once the board's new props are **required** (keep them required so export scope can never silently be `undefined`), that mount must add `generatedAt: VALID_MOBILE_USER_HEALTH_PAYLOAD.generated_at`, `schoolId: null`, `schoolName: null`, or the task's own `npx tsc --noEmit` gate fails
- Test: `lib/mobile/user-health/export.test.ts`, extend `lib/mobile/user-health/presentation.test.ts`

**Deferred-render race (adversarial-review finding, adopted at the root):** the board currently renders its table from `useDeferredValue(query)`, and React legitimately leaves the deferred value one step behind during urgent updates — so "export what's on screen" could serialize the *previous*, broader row set the instant after a PM narrows the search. The fix is to **delete `useDeferredValue` from the board entirely**: filtering ~400 in-memory rows is microseconds of work, so the deferral was an optimization with no payload — and it was the only thing creating two competing query versions. With a single immediate `query`, the table and both export handlers cannot disagree, by construction rather than by test coverage. One pure selector then becomes the single definition of "the rows a PM is acting on":

```ts
// in lib/mobile/user-health/presentation.ts
export interface BoardSelection {
  query: string;
  predicate: UserHealthPredicate;
  cohort: MobileUserHealthRow["data"]["expectation"] | "all";
  sortKey: UserHealthSortKey;
}

export function selectBoardRows(
  users: MobileUserHealthRow[],
  selection: BoardSelection
): MobileUserHealthRow[] {
  const needle = selection.query.trim().toLowerCase();
  const filtered = users.filter((user) => {
    const matchesQuery =
      needle.length === 0 ||
      user.display_name.toLowerCase().includes(needle) ||
      (user.email?.toLowerCase().includes(needle) ?? false) ||
      user.user_id.toLowerCase() === needle;
    return (
      matchesQuery &&
      matchesUserHealthPredicate(user, selection.predicate) &&
      (selection.cohort === "all" || user.data.expectation === selection.cohort)
    );
  });
  return sortUserHealthRows(filtered, selection.sortKey);
}
```

The board computes `const rows = useMemo(() => selectBoardRows(users, selection), [users, selection-parts])` **once**, from the immediate query (`useDeferredValue` and `deferredQuery` are removed in this task), and the table, the pagination count, and both export handlers all consume that same `rows` value — there is no second query version left to race. Add to `presentation.test.ts`:

```ts
test("selectBoardRows with the immediate query is what exports must use", () => {
  const users = VALID_MOBILE_USER_HEALTH_PAYLOAD.users;
  const narrowed = selectBoardRows(users, {
    query: users[1].user_id,
    predicate: "all",
    cohort: "all",
    sortKey: "urgency",
  });
  assert.deepEqual(narrowed.map((u) => u.user_id), [users[1].user_id]);
});
```

**Interfaces:**
- Consumes: `getActivityStage`, `getUserAttentionReasons`, `ATTENTION_LABELS` (Task 5).
- Produces: `interface ChaseListContext { days: number; generatedAt: string; schoolId: string | null; schoolName: string | null }`, `function buildChaseListCsv(rows: MobileUserHealthRow[], context: ChaseListContext): string`, and `function buildChaseListText(rows: MobileUserHealthRow[], context: ChaseListContext): string`.

**Portability rule (adversarial-review finding, adopted):** the moment a chase list leaves the page (file download, WhatsApp paste) it loses the on-screen context, so both artifacts must carry their own: the CSV gets `activity_window_days`, `generated_at`, `scope_school_id`, and `scope_school_name` columns (scope columns say `all` / `all schools` when unfiltered — per-row `current_school` cannot recover the applied filter, and a one-school result is otherwise indistinguishable from a school-filtered one) plus a scope-bearing filename; the copyable text gets a header line naming the window, generation time, and school scope. Two exports differing only in window **or only in school filter** must remain distinguishable forever; a zero-row export stays self-describing via header + filename.

- [ ] **Step 1: Failing test**

```ts
// lib/mobile/user-health/export.test.ts
import assert from "node:assert/strict";
import test from "node:test";

import { buildChaseListCsv, buildChaseListText } from "./export";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "./test-fixtures";

const context = {
  days: 30,
  generatedAt: VALID_MOBILE_USER_HEALTH_PAYLOAD.generated_at,
  schoolId: null,
  schoolName: null,
};

test("the CSV has a header, one line per EA, and self-describing window and scope columns", () => {
  const csv = buildChaseListCsv(VALID_MOBILE_USER_HEALTH_PAYLOAD.users, context);
  const lines = csv.trimEnd().split("\r\n");
  assert.equal(
    lines[0],
    '"name","email","current_school","employment_status","status_in_window","blockers","last_activity_at","activity_window_days","generated_at","scope_school_id","scope_school_name","user_id"'
  );
  assert.equal(lines.length, VALID_MOBILE_USER_HEALTH_PAYLOAD.users.length + 1);
  assert.match(lines[1], /"30","2026-08-11T14:30:00\.000Z","all","all schools"/);
});

test("exports differing only in window or only in school scope stay distinguishable", () => {
  const users = VALID_MOBILE_USER_HEALTH_PAYLOAD.users;
  const sevenDay = buildChaseListCsv(users, { ...context, days: 7 });
  const ninetyDay = buildChaseListCsv(users, { ...context, days: 90 });
  assert.notEqual(sevenDay, ninetyDay);

  const schoolScoped = buildChaseListCsv(users, {
    ...context,
    schoolId: "a0c54f15-e176-42c5-ad0e-300947557005",
    schoolName: "Charles Duna Primary",
  });
  assert.notEqual(schoolScoped, buildChaseListCsv(users, context));
  assert.match(schoolScoped, /"Charles Duna Primary"/);
});

test("cells that could execute as spreadsheet formulas are neutralized", () => {
  const hostile = {
    ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0],
    display_name: "=HYPERLINK(evil)",
  };
  const csv = buildChaseListCsv([hostile], context);
  assert.match(csv, /"'=HYPERLINK\(evil\)"/);
});

test("the copyable text opens with its own window context and reads one line per EA", () => {
  const text = buildChaseListText(
    [VALID_MOBILE_USER_HEALTH_PAYLOAD.users[1]],
    context
  );
  const [header] = text.split("\n");
  assert.match(header, /last 30 days/i);
  assert.match(text, / — /);
  assert.match(text, /Groups missing|Group memberships incomplete/);
});

test("a blocked-but-active EA shows both axes in copied text", () => {
  const blockedButActive = {
    ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0], // has in-window activity
    auth: {
      ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0].auth,
      state: "unconfirmed" as const,
    },
  };
  const text = buildChaseListText([blockedButActive], context);
  assert.match(text, /active · 30d/);
  assert.match(text, /blockers: Auth blocked/);
});

test("a resigned EA is never exported as if they were current staff", () => {
  const resigned = {
    ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0],
    employment_status: "resigned",
  };
  const csv = buildChaseListCsv([resigned], context);
  assert.match(csv, /"resigned"/);
  const text = buildChaseListText([resigned], context);
  assert.match(text, /Resigned/);
});
```

- [ ] **Step 2:** Run — FAIL.

- [ ] **Step 3: Implement**

First, move the existing `ATTENTION_LABELS` map out of `user-health-board.tsx` into `lib/mobile/user-health/presentation.ts` (exported, same content) and import it back into the board — one label map, used by the board, the CSV, and later the playbook panel.

```ts
// lib/mobile/user-health/export.ts
import { getEmploymentStatusDisplay } from "../presentation";
import {
  ATTENTION_LABELS,
  getActivityStage,
  getUserAttentionReasons,
} from "./presentation";
import type { MobileUserHealthRow } from "./types";

function csvCell(value: string | null): string {
  const raw = value ?? "";
  const guarded = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replaceAll('"', '""')}"`;
}

function describeBlockers(user: MobileUserHealthRow): string {
  return getUserAttentionReasons(user)
    .map((reason) => ATTENTION_LABELS[reason])
    .join("; ");
}

export interface ChaseListContext {
  days: number;
  generatedAt: string;
  schoolId: string | null;
  schoolName: string | null;
}

export function buildChaseListCsv(
  rows: MobileUserHealthRow[],
  context: ChaseListContext
): string {
  const header = [
    "name", "email", "current_school", "employment_status",
    "status_in_window", "blockers",
    "last_activity_at", "activity_window_days", "generated_at",
    "scope_school_id", "scope_school_name", "user_id",
  ].map(csvCell).join(",");
  const lines = rows.map((user) =>
    [
      user.display_name,
      user.email,
      user.current_school,
      user.employment_status,
      getActivityStage(user),
      describeBlockers(user),
      user.activity.last_activity_at,
      String(context.days),
      context.generatedAt,
      context.schoolId ?? "all",
      context.schoolName ?? "all schools",
      user.user_id,
    ].map(csvCell).join(",")
  );
  return [header, ...lines].join("\r\n") + "\r\n";
}

export function buildChaseListText(
  rows: MobileUserHealthRow[],
  context: ChaseListContext
): string {
  const scope = context.schoolName ?? "all schools";
  const header = `User health chase list · last ${context.days} days · ${scope} · generated ${context.generatedAt}`;
  const lines = rows.map((user) => {
    // Both axes always: a blocked-but-active EA must never read as non-adopted.
    const stage = `${getActivityStage(user)} · ${context.days}d`;
    const blockers = describeBlockers(user);
    const status = blockers.length > 0 ? `${stage} — blockers: ${blockers}` : stage;
    // Non-current staff must be visibly labeled — never chased as rollout targets.
    const employment = getEmploymentStatusDisplay(user.employment_status);
    const name =
      employment && employment.kind !== "active"
        ? `${user.display_name} (${employment.label})`
        : user.display_name;
    return `${name} — ${status} — ${user.current_school}`;
  });
  return [header, ...lines].join("\n");
}
```

Board buttons (client-side, act on the same `rows` value the table renders — the single `selectBoardRows` result across all pages, not just the visible 50): the board gains `generatedAt: string`, `schoolId: string | null`, and `schoolName: string | null` props (user-health page passes `data.generated_at`, `data.applied_filters.school_id`, and the selected school's name or null; Task 12 reuses `schoolId` for cross-links) and assembles `const context = { days, generatedAt, schoolId, schoolName }`. "Download CSV" creates `new Blob([buildChaseListCsv(rows, context)], { type: "text/csv" })`, object URL, `<a download>` click, revoke; the filename carries window AND school scope: `user-health-chase-list-${days}d-${schoolSlug}-${generatedAt.slice(0, 10)}.csv` where `schoolSlug` is the school name lowercased with non-alphanumerics collapsed to `-` (e.g. `charles-duna-primary`), or `all-schools` when unfiltered — so two same-day exports with different school filters can never be confused, even at zero rows. "Copy list" is an **async** handler: `await navigator.clipboard.writeText(buildChaseListText(rows, context))`, flipping to "Copied ✓" (2s) **only after the promise resolves**; on rejection (permissions, document policy) it shows a retryable "Copy failed — tap to retry" state instead — a false success here means a PM pastes stale clipboard contents into WhatsApp and nobody gets chased. Cover both paths with resolved/rejected clipboard stubs in the task's tests. No capability gate: the export contains exactly what the viewer already sees, and this page is already restricted to senior staff/admin/ZZ data manager.

- [ ] **Step 4:** `npm run test:mobile`, `npx tsc --noEmit`; in dev, download and open the CSV, and paste the copied list into a text editor.
- [ ] **Step 5: Commit** — `git commit -m "feat: export the filtered user health board as a chase list"`

### Task 10: App-version distribution card

**Files:**
- Create: `lib/mobile/user-health/devices.ts`
- Modify: `app/mobile-app/user-health/page.tsx` (render beside/below the funnel)
- Test: `lib/mobile/user-health/devices.test.ts`

**Interfaces:**
- Produces: `interface DeviceVersionCount { label: string; count: number }` and `function buildDeviceVersionBreakdown(users: MobileUserHealthRow[]): DeviceVersionCount[]` (registered devices only, count desc then label asc).

- [ ] **Step 1: Failing test**

```ts
// lib/mobile/user-health/devices.test.ts
import assert from "node:assert/strict";
import test from "node:test";

import { buildDeviceVersionBreakdown } from "./devices";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "./test-fixtures";

test("only registered devices are counted, grouped by platform and version", () => {
  const breakdown = buildDeviceVersionBreakdown(
    VALID_MOBILE_USER_HEALTH_PAYLOAD.users
  );
  const registered = VALID_MOBILE_USER_HEALTH_PAYLOAD.users.filter(
    (user) => user.app_device.registered
  ).length;
  assert.equal(
    breakdown.reduce((sum, row) => sum + row.count, 0),
    registered
  );
  assert.match(breakdown[0].label, /^(android|ios) · v/);
});

test("a registered device without a version reports an unknown version", () => {
  const user = {
    ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0],
    app_device: {
      registered: true as const,
      platform: "android" as const,
      app_version: null,
      last_seen_at: null,
    },
  };
  assert.deepEqual(buildDeviceVersionBreakdown([user]), [
    { label: "android · unknown version", count: 1 },
  ]);
});
```

- [ ] **Step 2:** Run — FAIL.

- [ ] **Step 3: Implement**

```ts
// lib/mobile/user-health/devices.ts
import type { MobileUserHealthRow } from "./types";

export interface DeviceVersionCount {
  label: string;
  count: number;
}

export function buildDeviceVersionBreakdown(
  users: MobileUserHealthRow[]
): DeviceVersionCount[] {
  const counts = new Map<string, number>();
  for (const user of users) {
    if (!user.app_device.registered) continue;
    const platform = user.app_device.platform ?? "unknown platform";
    const version = user.app_device.app_version
      ? `v${user.app_device.app_version}`
      : "unknown version";
    const label = `${platform} · ${version}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
```

Page: a small card titled "App versions in the field", listing up to 6 rows (`label — count`), with the caveat "Registered devices only — a rollout risk signal, not an install census." If the breakdown is empty render "No registered devices yet."

- [ ] **Step 4:** `npm run test:mobile`, `npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `git commit -m "feat: show app version distribution from registered devices"`

### Task 11: Copy consolidation — "How to read this evidence" + blocker playbook + terminology

**Files:**
- Modify: `app/mobile-app/user-health/page.tsx` (remove the blue population banner, the four evidence-stage cards, and the bottom footnote; add one `<details>` panel below the funnel)
- Modify: `components/mobile-app/user-health/user-health-board.tsx` ("Find a youth" → "Find an EA"; add `title` attributes to blocker chips)
- Test: extend `lib/mobile/user-health/summary.test.ts` (board copy assertions live fine beside it) or a new `lib/mobile/user-health/board-copy.test.ts`

**Playbook copy (exact strings, used as chip `title` and in the panel):**

```ts
const BLOCKER_PLAYBOOK: Record<UserAttentionReason, string> = {
  auth_blocked:
    "The EA cannot log in. Check the email address in Supabase Auth, resend the confirmation, or lift the ban — then re-check this board.",
  seeded_classes_missing:
    "No class landed for this EA. Confirm their class assignment in TeamPact, then re-run the seed for this EA.",
  seeded_children_missing:
    "No children landed for this EA. Confirm the TeamPact roster, then re-run the seed for this EA.",
  seeded_groups_missing:
    "Children exist but no groups landed. Check the seeding manifest for this EA's groups.",
  seeded_memberships_incomplete:
    "Some children are not in any group. Re-check group memberships in the seed for this EA.",
};
```

- [ ] **Step 1: Failing test** — assert the page-level panel content via a render test of the new panel component (extract the panel as `components/mobile-app/user-health/how-to-read-panel.tsx` so it is testable without the async page):

```ts
test("the how-to-read panel keeps every honesty caveat and maps blockers to actions", () => {
  const html = renderToStaticMarkup(createElement(HowToReadPanel));
  assert.match(html, /How to read this evidence/i);
  assert.match(html, /synthetic/i);
  assert.match(html, /not proof that the app is absent|unknown/i);
  assert.match(html, /provisioning/i);
  assert.match(html, /re-run the seed/i);
  assert.doesNotMatch(html, /youth/i);
});
```

- [ ] **Step 2:** Run — FAIL.

- [ ] **Step 3: Implement.** `HowToReadPanel` is a server-compatible component: a styled `<details className="rounded-xl border border-slate-200 bg-white shadow-sm">` with `<summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">How to read this evidence</summary>` and a body containing six short titled paragraphs carrying over the existing banner/footnote copy **rewritten to say "EA," not "youth"**: Population (synthetic + banned exclusion); Device signals (absence is unknown, and a signal can disappear when a device is lost or replaced — the stage tracks current evidence, not history); Auth history & provisioning (cutoff logic); Server data (counts, not screens); **Windowing** ("Activity numbers and 'last activity' cover only the selected window — changing the window changes them"); **School filter** ("With no school selected, every real Auth account is listed, including EAs not yet on a roster; selecting a school narrows to rostered EAs, so totals are not comparable across that toggle"); plus a two-column `<dl>` of blocker label → playbook sentence. Remove the old banner, the `evidenceStages` card grid, and the bottom footnote from the page; mount `<HowToReadPanel />` directly under the funnel. In the board, set `title={BLOCKER_PLAYBOOK[reason]}` on each chip (export `BLOCKER_PLAYBOOK` from `lib/mobile/user-health/presentation.ts` so both import one copy) and change the search label to "Find an EA".

- [ ] **Step 4:** `npm run test:mobile`, `npx tsc --noEmit`; `grep -ri "youth" app/mobile-app components/mobile-app` must return nothing.
- [ ] **Step 5: Commit** — `git commit -m "feat: consolidate user health caveats into a playbook panel"`

### Task 12: Cross-links between the two reports

**Files:**
- Modify: `components/mobile-app/user-health/user-health-board.tsx` (activity cell gains a link when `clock_entries > 0`)
- Modify: `components/mobile-app/attendance/ea-rollup-table.tsx` and `components/mobile-app/attendance/clock-entries-table.tsx` (EA name links to the health board)
- Test: extend `lib/mobile/time-entries/ledger.test.ts`

**Link contract (both sides already parse these params after Tasks 2 and 6). Scope preservation is mandatory (adversarial-review finding, adopted): both directions carry the source page's `days` AND `school_id`, so following a link never silently widens the school scope (which would also widen the GPS-bearing CSV's population) and never resets a 90-day view to the 30-day default (which would make an EA look inactive purely because the window changed).** The board already has `schoolId` (introduced in Task 9); the attendance page passes its own `days`/`schoolId` into `AttendanceLedger`; both link builders include `school_id` only when non-null.
- Health board → ledger: `/mobile-app/attendance?days={days}&school_id={school_id}&q={user_id}` (the ledger search matches `user_id` exactly — Task 2's filter already does). Unconditional: every role that can see user health also holds `mobile.time_entries.read`.
- Ledger/rollup → health board: `/mobile-app/user-health?days={days}&school_id={school_id}&q={user_id}` (the board search already matches `user_id`). **Capability-gated:** `junior_staff` can read the clock report but NOT user health, so these links render only when the viewer holds `mobile.user_health.read`. `AttendanceLedger` (and `EaRollupTable`/`ClockEntriesTable`) gain an optional `userHealthLinksEnabled?: boolean` prop (default `false`); the attendance page passes `hasCapability(session.role, "mobile.user_health.read")` — verify the exact capability id in `lib/mobile/capabilities.ts` first and use whatever string that file defines.

- [ ] **Step 1: Failing test**

```ts
test("ledger rows link each EA to their user health row, preserving window and school scope", () => {
  const withLinks = renderToStaticMarkup(
    createElement(AttendanceLedger, {
      entries,
      days: 7,
      schoolId: "a0c54f15-e176-42c5-ad0e-300947557005",
      initialView: "ea",
      userHealthLinksEnabled: true,
    })
  );
  assert.match(
    withLinks,
    /href="\/mobile-app\/user-health\?days=7&amp;school_id=a0c54f15-e176-42c5-ad0e-300947557005&amp;q=3eb26195-c9b4-41a2-a01d-3b341a28177e"/
  );

  const withoutLinks = renderToStaticMarkup(
    createElement(AttendanceLedger, { entries, days: 7, schoolId: null, initialView: "ea" })
  );
  assert.doesNotMatch(withoutLinks, /\/mobile-app\/user-health\?/);
});
```

- [ ] **Step 2:** Run — FAIL. (Adding required `days`/`schoolId` props to `AttendanceLedger` here means updating the earlier ledger tests and the attendance page mount in the same commit.)
- [ ] **Step 3: Implement.** `AttendanceLedger` gains `days: number` and `schoolId: string | null` props (attendance page passes `data.days` and `data.applied_filters.school_id`); build hrefs with a helper that appends `school_id` only when non-null. Wrap EA names in `next/link` `<Link>` with `className="hover:underline"` when `userHealthLinksEnabled`, plain text otherwise. In the health board's `ActivityEvidence`, when `user.activity.clock_entries > 0`, add `<Link href={...} className="mt-1 inline-block text-xs font-semibold text-primary hover:underline">View clock ledger →</Link>` — built from the board's existing `days` and `schoolId` props (the latter introduced in Task 9).
- [ ] **Step 4:** `npm run test:mobile`, `npx tsc --noEmit`; in dev, click through in both directions and confirm the destination arrives pre-filtered.
- [ ] **Step 5: Commit** — `git commit -m "feat: cross-link user health and clock ledger"`

---

## Part B — Rollout waves become first-class data — **SPECIFICATION (gated, not yet dispatched)**

**Gates (all three, in order):** (1) `fix/mobile-report-real-users` merged and deployed on all three services; (2) Jim supplies wave definitions — name, launch date, member list (emails or auth user ids) per wave; (3) Jim approves the production Supabase migration + Django deploy window. When the gates clear, this section is expanded into checkbox tasks in a follow-up plan (`2026-XX-XX-rollout-waves.md`) using the file anchors below — it is deliberately a contract spec here, not executable steps, because the three-repo code will have moved by then.

**Why waves must be stored, not inferred:** today "cohort" exists only as hardcoded provisioning-cutoff timestamp constants in Django (`api/mobile/reports.py`, `PRIMARY_PROVISIONING_CUTOFF_AT` / `ECD_PROVISIONING_CUTOFF_AT` on the unmerged branch) — request-time inference from `auth.created_at`. That cannot answer "how is wave 3 doing, 6 days after launch," and every future cohort would mean another code constant. A stored wave is the root-cause fix and makes every summary number denominator-correct.

**B1 — Supabase migration** (repo `zazi-mobile-clock-reporting-supabase`, new file in `supabase/migrations/`, following the house pattern of the existing `mobile_*` reporting migrations: `SECURITY INVOKER`, `STABLE`, `SET search_path = ''`, `REVOKE ALL FROM PUBLIC, anon, authenticated, authenticator`, `GRANT EXECUTE TO service_role`):

```sql
CREATE TABLE public.app_rollout_waves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  launch_date date NOT NULL,
  notes text
);

-- Append-only: reassignment closes the old row (superseded_at) and inserts a
-- new one, so historical wave denominators stay reconstructable.
CREATE TABLE public.app_rollout_wave_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wave_id uuid NOT NULL REFERENCES public.app_rollout_waves(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  source_note text NOT NULL  -- e.g. 'manifest 2026-08-15 wave-3.csv'
);
-- exactly one live assignment per EA
CREATE UNIQUE INDEX app_rollout_wave_members_live_user_idx
  ON public.app_rollout_wave_members (user_id)
  WHERE superseded_at IS NULL;
CREATE INDEX app_rollout_wave_members_wave_id_idx
  ON public.app_rollout_wave_members (wave_id);

ALTER TABLE public.app_rollout_waves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_rollout_wave_members ENABLE ROW LEVEL SECURITY;
-- no policies: service-role reporting access only, same posture as the RPCs
```

The reporting RPC joins only rows `WHERE superseded_at IS NULL`. **Membership loading is authoritative set reconciliation, never fire-and-forget** (adversarial-review findings, adopted): a manifest for wave W declares that wave's **complete** membership. Inside one transaction: load the manifest into a temp staging table; resolve every entry against `auth.users` by id or lower-normalized email, aborting if any entry resolves to zero or multiple accounts, or is already live in a *different* wave without an explicit move flag; then reconcile **both directions** — insert live rows for staged users not yet live in W, and set `superseded_at = now()` on live W rows whose user is absent from staging (a removed EA must stop counting, loudly visible in the load report); finish by asserting the live membership set of W equals the staged set exactly, else raise. A misspelled email or a stale member therefore fails or surfaces in the same load, never silently skewing a denominator. Immutability of historical rows (`assigned_at`, `source_note`, closed rows) is enforced by a simple `BEFORE UPDATE OR DELETE` trigger that permits only `superseded_at: NULL → timestamp`; that one trigger is cheap insurance against ad-hoc SQL, while concurrent-loader locking is deliberately omitted — a single operator runs these loads. The follow-up plan includes the loader SQL and trigger verbatim.

Then `CREATE OR REPLACE` the current `mobile_user_health_domain` (the 3-arg overload from `20260812120000_mobile_reporting_real_user_population.sql`) to add, per user, `"wave": {"id": …, "name": …, "launch_date": …}` or `null` (LEFT JOIN through `app_rollout_wave_members`), plus a top-level `"wave_options": [{id, name, launch_date}]` array (all waves, ordered by `launch_date`). Same change adds **durable evidence fields** — this is what makes a true ratchet possible, covering both axes of reach as well as usage: per user `"first_ever_activity_at"` / `"last_ever_activity_at"` (same three-source `GREATEST`/`LEAST` shape as the windowed fields, without the window predicate — and **outside** the windowed count⟺timestamp invariant), and `"ever_registered_device"` (an `EXISTS` over `notification_push_tokens` **including invalidated rows** — a token that later died still proves the app was once installed).

**B2 — Django passthrough** (repo `zazi-mobile-clock-reporting-django`): extend the user-health schema/validators in `api/mobile/reports.py` to accept the new optional fields and pass them through; `_empty_domain_user` gains `wave: None` and null lifetime fields; the count⟺timestamp 502 invariant explicitly excludes the `_ever_` fields. Tests in `api/tests_mobile_operational_reports.py` cover: wave present, wave null, wave_options ordering, lifetime fields independent of `days`. **Deploy order that never breaks:** Django first (tolerates absent fields), Supabase migration second (fields appear), frontend last.

**B3 — Frontend:** `schema.ts`/`types.ts` gain the optional fields. Board adds a Wave filter (options from `wave_options`, plus "No wave"); selecting a wave narrows rows client-side and re-renders `UserHealthFunnel` with `buildFunnelCounts(filteredRows)` (already row-derived — zero component changes) plus a context chip "Wave 3 · launched {launch_date} · day {n}" where `n` is whole days between `launch_date` and `generated_at` in SAST. **This is also where the stage becomes a true lifetime ratchet, on every branch:** `getActivityStage` switches its usage test to `last_ever_activity_at !== null` and its device test to `ever_registered_device` (post-provisioning auth was already durable) — so no window change and no token invalidation can regress any stage. Two regression tests pin it: (a) same EA, `days` shrunk, stage unchanged; (b) a device-only `reached` EA whose current token is invalidated (`app_device.registered: false`, `ever_registered_device: true`) stays `reached`. A windowed-recency axis returns as a separate indicator, and a "quiet" predicate (activated ever, silent in window) joins the filter and CSV. Summary tiles stay global; the coverage strip becomes the wave-scoped instrument.

**Definition of done for Part B:** a PM can answer "of the EAs in the newest wave, how many are auth-ready / logged in / on a device / active, and who exactly is stuck at which stage" in two clicks, with no number whose denominator is the entire historical account list.

## Explicitly deferred (documented so nobody "helpfully" adds them)

- **App-owned `app_open` event** (mobile repo + Supabase migration + EAS OTA update) — the root fix for the login metric; awaiting Jim's brief.
- **Sentry page integration** — instead: tag mobile Sentry events with `user_id`/`app_version`/wave; alerts to Slack. No dashboard clone.
- **Search-scoped attendance CSV** — a validated `user_id` filter through the export RPC + Django contract, so the GPS-bearing download can match a narrowed ledger view. Until then the UI discloses the export's true scope (Task 2).
- **Expected-school-days denominator** on the clock report (reuse Django closures) — Part C candidate.
- **Daily rollout digest** (cron → Slack/WhatsApp) — after Part B.
