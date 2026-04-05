# PM Dashboard Phase 1: Command Center — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the PM dashboard shell (sidebar layout), overview command center page (`/pm`), enhanced schools page (`/pm/schools`), and school detail page (`/pm/schools/[school-name]`) — the heavily elevated Phase 1 of the PM Dashboard.

**Architecture:** Left sidebar dashboard layout under `/pm/*` with Clerk RBAC protection. Server components fetch from Django API with ISR (5-minute revalidation). Client components for Recharts charts, interactive filters, and sorting. Mock data fallback until Django endpoints are built.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Recharts, Clerk auth, Lucide icons, shadcn/ui primitives

**Spec:** `docs/superpowers/specs/2026-04-05-pm-dashboard-design.md`

---

## File Structure

### New Files

```
lib/pm/
├���─ types.ts                       # All TypeScript interfaces for PM dashboard
├── api.ts                         # Data fetching functions (Django API + mock fallback)
├── mock-data.ts                   # Mock data matching API contracts
└── constants.ts                   # Dosage thresholds, colors, letter sequence

components/pm/
├── layout/
│   ├── pm-sidebar.tsx             # Sidebar navigation with icons, active state, badges
│   └── programme-context-bar.tsx  # Dark bar: week number, health badge, freshness
├── shared/
│   ├── kpi-card.tsx               # Reusable KPI card with optional target bar
│   ├── health-badge.tsx           # Green/amber/red programme health badge
│   └── dosage-badge.tsx           # Dosage color badge (reused from school cards)
├── overview/
│   ├── overview-kpis.tsx          # 6 KPI cards (2 rows of 3)
│   ├── sessions-chart.tsx         # Sessions over time Recharts LineChart
│   ├── dosage-distribution.tsx    # Horizontal bar chart of dosage buckets
│   └── school-table.tsx           # Sortable school performance table
└── schools/
    ├── school-filters.tsx         # Filter controls for schools page
    └── school-detail-header.tsx   # School-level KPI cards for detail page

app/pm/
├── layout.tsx                     # Dashboard shell (sidebar + content slot)
├── page.tsx                       # /pm → Overview command center
├── schools/
│   ├── page.tsx                   # /pm/schools → Enhanced school cards
│   └── [school-name]/
│       └── page.tsx               # /pm/schools/[name] → School detail
```

### Modified Files

```
middleware.ts                      # Add /pm route protection
components/layout/header.tsx       # Add PM sub-pages to navigation
package.json                       # Add recharts dependency
```

---

## Task 1: Install Recharts & Create Directory Structure

**Files:**
- Modify: `package.json`
- Create: directory tree for `lib/pm/`, `components/pm/`, `app/pm/`

- [ ] **Step 1: Install Recharts**

```bash
npm install recharts
```

- [ ] **Step 2: Create directory structure**

```bash
mkdir -p lib/pm
mkdir -p components/pm/layout
mkdir -p components/pm/shared
mkdir -p components/pm/overview
mkdir -p components/pm/schools
mkdir -p app/pm/schools/\[school-name\]
```

- [ ] **Step 3: Verify build still passes**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install recharts for PM dashboard charts"
```

---

## Task 2: TypeScript Types & Constants

**Files:**
- Create: `lib/pm/types.ts`
- Create: `lib/pm/constants.ts`

- [ ] **Step 1: Create PM type definitions**

Create `lib/pm/types.ts`:

```typescript
// ─── Programme Overview API Response ───────────────────────────

export interface ProgrammeOverviewResponse {
  generated_at: string;
  programme: {
    year: number;
    start_date: string;
    end_date: string;
    current_week: number;
    total_weeks: number;
  };
  targets: ProgrammeTargets;
  kpis: ProgrammeKPIs;
  health: HealthSignal;
  data_health: DataHealth;
  sessions_time_series: SessionTimeSeriesPoint[];
  dosage_distribution: DosageBucket[];
}

export interface ProgrammeTargets {
  dosage: number;
  on_track_pct: number;
  flag_resolution_pct: number;
  assessment_coverage_pct: number;
  mentor_coverage_days: number;
}

export interface ProgrammeKPIs {
  total_schools: number;
  total_schools_primary: number;
  total_schools_ecd: number;
  total_eas: number;
  total_children: number;
  weighted_dosage: number;
  on_track_group_rate: number;
  total_sessions_this_week: number;
  total_sessions_this_month: number;
  total_sessions_all_time: number;
  active_flags: number;
  flags_delta_week: number;
  flag_resolution_rate_14d: number;
  flag_lifecycle: {
    new: number;
    acknowledged: number;
    in_progress: number;
    resolved_this_week: number;
  };
}

export interface HealthSignal {
  score: number;
  status: "healthy" | "needs_attention" | "action_required";
  components: {
    dosage: number;
    on_track: number;
    flags: number;
    resolution: number;
  };
}

export interface DataHealth {
  freshness_hours: number;
  last_sync: string;
  join_match_rate: number;
}

export interface SessionTimeSeriesPoint {
  date: string;
  primary: number;
  ecd: number;
  total: number;
}

export interface DosageBucket {
  range: string;
  count: number;
}

// ─── School Data (extends existing School2026Data) ─────────────

export interface SchoolPerformanceRow {
  school_name: string;
  school_type: string;
  ea_count: number;
  children_count: number;
  groups_count: number;
  sessions_this_week: number;
  sessions_this_month: number;
  total_sessions: number;
  avg_sessions_per_group_per_week: number;
  flags_count: number;
}

// ─── School Detail ─────────────────────────────────────────────

export interface SchoolDetailResponse {
  school_name: string;
  school_type: string;
  ea_count: number;
  children_count: number;
  groups_count: number;
  total_sessions: number;
  avg_sessions_per_group_per_week: number;
  eas: EASummary[];
  flags: SchoolFlag[];
  recent_sessions: RecentSessionDay[];
}

export interface EASummary {
  name: string;
  groups_count: number;
  children_count: number;
  total_sessions: number;
  sessions_this_week: number;
  avg_sessions_per_group_per_week: number;
  flags_count: number;
}

export interface SchoolFlag {
  flag_type: string;
  entity: string;
  detail: string;
  status: string;
}

export interface RecentSessionDay {
  date: string;
  session_count: number;
}

// ─── Sidebar Navigation ───────────────────────────────────────

export interface PMNavItem {
  name: string;
  href: string;
  icon: string;
  badge?: number;
}
```

- [ ] **Step 2: Create constants file**

Create `lib/pm/constants.ts`:

```typescript
export const DOSAGE_THRESHOLDS = {
  ON_TRACK: 3,
  NEEDS_ATTENTION: 2,
} as const;

export function getDosageLevel(avg: number): "on_track" | "needs_attention" | "low" {
  if (avg >= DOSAGE_THRESHOLDS.ON_TRACK) return "on_track";
  if (avg >= DOSAGE_THRESHOLDS.NEEDS_ATTENTION) return "needs_attention";
  return "low";
}

export const DOSAGE_COLORS = {
  on_track: {
    bg: "bg-green-50",
    border: "border-green-500",
    text: "text-green-700",
    fill: "#22c55e",
    label: "On Track",
  },
  needs_attention: {
    bg: "bg-yellow-50",
    border: "border-yellow-500",
    text: "text-yellow-700",
    fill: "#f59e0b",
    label: "Needs Attention",
  },
  low: {
    bg: "bg-red-50",
    border: "border-red-500",
    text: "text-red-700",
    fill: "#e74c3c",
    label: "Low Dosage",
  },
} as const;

export const HEALTH_STATUS_CONFIG = {
  healthy: {
    label: "HEALTHY",
    bg: "bg-green-500",
    dot: "text-green-400",
  },
  needs_attention: {
    label: "NEEDS ATTENTION",
    bg: "bg-amber-500",
    dot: "text-amber-400",
  },
  action_required: {
    label: "ACTION REQUIRED",
    bg: "bg-red-500",
    dot: "text-red-400",
  },
} as const;

export const LETTER_SEQUENCE = [
  "a","e","i","o","u","b","l","m","k","p",
  "s","h","z","n","d","y","f","w","v","x",
  "g","t","q","r","c","j",
] as const;

export const CHART_COLORS = {
  primary: "#2c5aa0",
  primaryLight: "#60a5fa",
  ecd: "#8b5cf6",
  total: "#22c55e",
  grid: "#e2e8f0",
  text: "#64748b",
} as const;
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds. Types are importable.

- [ ] **Step 4: Commit**

```bash
git add lib/pm/types.ts lib/pm/constants.ts
git commit -m "feat(pm): add TypeScript types and constants for PM dashboard"
```

---

## Task 3: Mock Data & API Layer

**Files:**
- Create: `lib/pm/mock-data.ts`
- Create: `lib/pm/api.ts`

- [ ] **Step 1: Create mock data**

Create `lib/pm/mock-data.ts`:

```typescript
import type { ProgrammeOverviewResponse, SchoolPerformanceRow, SchoolDetailResponse } from "./types";

export const MOCK_PROGRAMME_OVERVIEW: ProgrammeOverviewResponse = {
  generated_at: new Date().toISOString(),
  programme: {
    year: 2026,
    start_date: "2026-02-23",
    end_date: "2026-11-28",
    current_week: 6,
    total_weeks: 40,
  },
  targets: {
    dosage: 3.5,
    on_track_pct: 85.0,
    flag_resolution_pct: 80.0,
    assessment_coverage_pct: 95.0,
    mentor_coverage_days: 14,
  },
  kpis: {
    total_schools: 61,
    total_schools_primary: 41,
    total_schools_ecd: 20,
    total_eas: 185,
    total_children: 5550,
    weighted_dosage: 3.2,
    on_track_group_rate: 78.0,
    total_sessions_this_week: 420,
    total_sessions_this_month: 1890,
    total_sessions_all_time: 15000,
    active_flags: 12,
    flags_delta_week: -3,
    flag_resolution_rate_14d: 72.0,
    flag_lifecycle: {
      new: 4,
      acknowledged: 2,
      in_progress: 3,
      resolved_this_week: 3,
    },
  },
  health: {
    score: 0.83,
    status: "healthy",
    components: { dosage: 0.91, on_track: 0.92, flags: 0.94, resolution: 0.90 },
  },
  data_health: {
    freshness_hours: 2.0,
    last_sync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    join_match_rate: 0.97,
  },
  sessions_time_series: Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 29 + i);
    const primary = Math.floor(30 + Math.random() * 25 + i * 0.5);
    const ecd = Math.floor(15 + Math.random() * 12 + i * 0.3);
    return {
      date: date.toISOString().split("T")[0],
      primary,
      ecd,
      total: primary + ecd,
    };
  }),
  dosage_distribution: [
    { range: "0-1", count: 3 },
    { range: "1-2", count: 8 },
    { range: "2-3", count: 15 },
    { range: "3-4", count: 25 },
    { range: "4+", count: 10 },
  ],
};

const SCHOOL_NAMES = [
  "Siyazama PS", "Kwanobuhle PS", "Ntaba Maria PS", "Ithembelihle PS",
  "Zanokhanyo PS", "Masibambane PS", "Inkwenkwezi PS", "Ikamva PS",
  "Zamokuhle ECD", "Sinethemba ECD", "Khanyisa PS", "Nonceba PS",
];

export const MOCK_SCHOOL_ROWS: SchoolPerformanceRow[] = SCHOOL_NAMES.map((name, i) => ({
  school_name: name,
  school_type: name.includes("ECD") ? "ECD" : "Primary School",
  ea_count: Math.floor(2 + Math.random() * 5),
  children_count: Math.floor(60 + Math.random() * 150),
  groups_count: Math.floor(4 + Math.random() * 10),
  sessions_this_week: Math.floor(8 + Math.random() * 20),
  sessions_this_month: Math.floor(40 + Math.random() * 100),
  total_sessions: Math.floor(100 + Math.random() * 300),
  avg_sessions_per_group_per_week: parseFloat((1.5 + Math.random() * 3).toFixed(1)),
  flags_count: i < 3 ? Math.floor(Math.random() * 4) : 0,
}));

export function getMockSchoolDetail(schoolName: string): SchoolDetailResponse {
  const row = MOCK_SCHOOL_ROWS.find(
    (s) => s.school_name.toLowerCase().replace(/\s+/g, "-") === schoolName
  ) ?? MOCK_SCHOOL_ROWS[0];

  return {
    school_name: row.school_name,
    school_type: row.school_type,
    ea_count: row.ea_count,
    children_count: row.children_count,
    groups_count: row.groups_count,
    total_sessions: row.total_sessions,
    avg_sessions_per_group_per_week: row.avg_sessions_per_group_per_week,
    eas: Array.from({ length: row.ea_count }, (_, i) => ({
      name: `EA ${i + 1}`,
      groups_count: Math.floor(2 + Math.random() * 4),
      children_count: Math.floor(20 + Math.random() * 40),
      total_sessions: Math.floor(30 + Math.random() * 80),
      sessions_this_week: Math.floor(3 + Math.random() * 10),
      avg_sessions_per_group_per_week: parseFloat((2 + Math.random() * 2.5).toFixed(1)),
      flags_count: Math.random() > 0.7 ? Math.floor(1 + Math.random() * 2) : 0,
    })),
    flags: row.flags_count > 0
      ? [{ flag_type: "same_letter_group", entity: "EA 1", detail: "3 groups at letter 'a'", status: "new" }]
      : [],
    recent_sessions: Array.from({ length: 10 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return { date: date.toISOString().split("T")[0], session_count: Math.floor(2 + Math.random() * 8) };
    }).reverse(),
  };
}
```

- [ ] **Step 2: Create API fetch layer**

Create `lib/pm/api.ts`:

```typescript
import type { ProgrammeOverviewResponse, SchoolPerformanceRow, SchoolDetailResponse } from "./types";
import { MOCK_PROGRAMME_OVERVIEW, MOCK_SCHOOL_ROWS, getMockSchoolDetail } from "./mock-data";

const DJANGO_API_URL = process.env.DJANGO_API_URL;

export async function getProgrammeOverview(): Promise<ProgrammeOverviewResponse> {
  if (!DJANGO_API_URL) {
    console.warn("DJANGO_API_URL not set — using mock data");
    return MOCK_PROGRAMME_OVERVIEW;
  }

  try {
    const res = await fetch(`${DJANGO_API_URL}/api/programme-overview/`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch programme overview:", error);
    return MOCK_PROGRAMME_OVERVIEW;
  }
}

export async function getSchoolPerformanceRows(): Promise<SchoolPerformanceRow[]> {
  if (!DJANGO_API_URL) return MOCK_SCHOOL_ROWS;

  try {
    const res = await fetch(`${DJANGO_API_URL}/api/schools-2026/`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();
    return data.schools.map((s: Record<string, unknown>) => ({
      school_name: s.school_name,
      school_type: s.school_type,
      ea_count: s.ea_count,
      children_count: s.children_count,
      groups_count: s.groups_count,
      sessions_this_week: s.sessions_this_week,
      sessions_this_month: s.sessions_this_month,
      total_sessions: s.total_sessions,
      avg_sessions_per_group_per_week: s.avg_sessions_per_group_per_week,
      flags_count:
        ((s.flags as Record<string, Record<string, number>>)?.same_letter_group?.flagged_eas ?? 0) +
        ((s.flags as Record<string, Record<string, number>>)?.moving_too_fast?.flagged_eas ?? 0),
    }));
  } catch (error) {
    console.error("Failed to fetch school rows:", error);
    return MOCK_SCHOOL_ROWS;
  }
}

export async function getSchoolDetail(schoolSlug: string): Promise<SchoolDetailResponse> {
  // Until dedicated school detail endpoint exists, use mock data
  return getMockSchoolDetail(schoolSlug);
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add lib/pm/mock-data.ts lib/pm/api.ts
git commit -m "feat(pm): add API layer with mock data fallback"
```

---

## Task 4: Middleware & Header Navigation

**Files:**
- Modify: `middleware.ts:20-28`
- Modify: `components/layout/header.tsx:1-131`

- [ ] **Step 1: Add /pm route protection to middleware**

In `middleware.ts`, update the `PROTECTED_ROUTES` object (line 20-22) and the route matcher (line 28):

```typescript
const PROTECTED_ROUTES: Record<string, Role> = {
  "/schools": "funder",
  "/pm": "funder",
};
```

And update the route matcher:

```typescript
const isProtectedRoute = createRouteMatcher(["/schools(.*)", "/pm(.*)"]);
```

- [ ] **Step 2: Add PM sub-pages to header navigation**

In `components/layout/header.tsx`, add these imports at the top (merge with existing lucide imports):

```typescript
import {
  Menu,
  X,
  ChevronDown,
  Users,
  BookOpen,
  TrendingUp,
  LayoutDashboard,
  Newspaper,
  FolderOpen,
  MapPin,
  CalendarDays,
  School,
  Calendar,
  AlertTriangle,
  ClipboardCheck,
  Eye,
  GitCompare,
} from "lucide-react";
```

Then replace the "Project Management" nav group (lines 113-131) with:

```typescript
  {
    label: "Project Management",
    minRole: "funder" as Role,
    items: [
      {
        name: "Overview",
        href: "/pm",
        description: "Programme health at a glance",
        icon: LayoutDashboard,
      },
      {
        name: "Schools",
        href: "/pm/schools",
        description: "School performance and drill-down",
        icon: School,
      },
      {
        name: "Sessions",
        href: "/pm/sessions",
        description: "Session activity and EA heatmap",
        icon: Calendar,
      },
      {
        name: "Letter Progress",
        href: "/pm/letter-progress",
        description: "Curriculum tracking by group",
        icon: BookOpen,
      },
      {
        name: "Quality Flags",
        href: "/pm/quality-flags",
        description: "Quality monitoring and flag lifecycle",
        icon: AlertTriangle,
      },
      {
        name: "Assessments",
        href: "/pm/assessments",
        description: "EGRA scores and outcomes",
        icon: ClipboardCheck,
      },
      {
        name: "Mentor Visits",
        href: "/pm/mentor-visits",
        description: "Mentor quality and coverage",
        icon: Eye,
      },
      {
        name: "Compare",
        href: "/pm/compare",
        description: "Side-by-side region and cohort comparison",
        icon: GitCompare,
      },
      {
        name: "2025 Schools",
        href: "/schools",
        description: "Education assistant data for 2025",
        icon: MapPin,
      },
      {
        name: "2026 Schools (Legacy)",
        href: "/schools-2026",
        description: "Original 2026 school cards view",
        icon: CalendarDays,
      },
    ],
  },
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds. The header navigation now shows PM sub-pages when signed in with funder+ role.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts components/layout/header.tsx
git commit -m "feat(pm): add /pm route protection and header navigation"
```

---

## Task 5: Shared Components — KPI Card & Health Badge

**Files:**
- Create: `components/pm/shared/kpi-card.tsx`
- Create: `components/pm/shared/health-badge.tsx`
- Create: `components/pm/shared/dosage-badge.tsx`

- [ ] **Step 1: Create KPI card component**

Create `components/pm/shared/kpi-card.tsx`:

```typescript
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  borderColor?: string;
  target?: {
    value: number;
    actual: number;
    label: string;
  };
  trend?: {
    value: number;
    label: string;
  };
  badges?: Array<{ label: string; className: string }>;
}

export default function KPICard({
  label,
  value,
  subtitle,
  borderColor = "border-l-primary",
  target,
  trend,
  badges,
}: KPICardProps) {
  const targetPct = target ? Math.min(Math.round((target.actual / target.value) * 100), 100) : null;

  return (
    <div
      className={cn(
        "bg-white rounded-lg border-l-4 p-4 shadow-sm",
        borderColor
      )}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
            {label}
          </p>
          <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
        {target && targetPct !== null && (
          <div className="text-right text-xs">
            <p className={cn(
              "font-semibold",
              targetPct >= 90 ? "text-green-600" : targetPct >= 70 ? "text-amber-600" : "text-red-600"
            )}>
              {targetPct}% of target
            </p>
            <p className="text-slate-400">{target.label}</p>
          </div>
        )}
        {trend && (
          <div className="text-right text-xs">
            <p className={cn(
              "font-semibold",
              trend.value <= 0 ? "text-green-600" : "text-red-600"
            )}>
              {trend.value <= 0 ? "↓" : "↑"} {Math.abs(trend.value)} {trend.label}
            </p>
          </div>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      )}

      {badges && badges.length > 0 && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {badges.map((badge) => (
            <span key={badge.label} className={cn("text-[10px] px-1.5 py-0.5 rounded", badge.className)}>
              {badge.label}
            </span>
          ))}
        </div>
      )}

      {target && targetPct !== null && (
        <div className="h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              targetPct >= 90 ? "bg-green-500" : targetPct >= 70 ? "bg-amber-500" : "bg-red-500"
            )}
            style={{ width: `${targetPct}%` }}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create health badge component**

Create `components/pm/shared/health-badge.tsx`:

```typescript
import { cn } from "@/lib/utils";
import { HEALTH_STATUS_CONFIG } from "@/lib/pm/constants";
import type { HealthSignal } from "@/lib/pm/types";

interface HealthBadgeProps {
  health: HealthSignal;
}

export default function HealthBadge({ health }: HealthBadgeProps) {
  const config = HEALTH_STATUS_CONFIG[health.status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[11px] font-bold tracking-wide",
        config.bg
      )}
    >
      <span className={cn("text-sm", config.dot)}>●</span>
      {config.label}
    </span>
  );
}
```

- [ ] **Step 3: Create dosage badge component**

Create `components/pm/shared/dosage-badge.tsx`:

```typescript
import { cn } from "@/lib/utils";
import { getDosageLevel, DOSAGE_COLORS } from "@/lib/pm/constants";

interface DosageBadgeProps {
  value: number;
  showLabel?: boolean;
}

export default function DosageBadge({ value, showLabel = false }: DosageBadgeProps) {
  const level = getDosageLevel(value);
  const colors = DOSAGE_COLORS[level];

  return (
    <span className={cn("font-bold", colors.text)}>
      {value.toFixed(1)}
      {showLabel && (
        <span className="ml-1 text-xs font-normal">({colors.label})</span>
      )}
    </span>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds. Components are importable.

- [ ] **Step 5: Commit**

```bash
git add components/pm/shared/
git commit -m "feat(pm): add shared KPI card, health badge, and dosage badge components"
```

---

## Task 6: Programme Context Bar

**Files:**
- Create: `components/pm/layout/programme-context-bar.tsx`

- [ ] **Step 1: Create the context bar component**

Create `components/pm/layout/programme-context-bar.tsx`:

```typescript
import HealthBadge from "@/components/pm/shared/health-badge";
import type { ProgrammeOverviewResponse } from "@/lib/pm/types";

interface ProgrammeContextBarProps {
  data: ProgrammeOverviewResponse;
}

export default function ProgrammeContextBar({ data }: ProgrammeContextBarProps) {
  const { programme, health, data_health } = data;
  const progressPct = Math.round((programme.current_week / programme.total_weeks) * 100);

  const lastSync = new Date(data_health.last_sync);
  const syncTimeStr = lastSync.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-lg px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3">
      {/* Left: Programme + Week */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-accent-yellow font-bold text-sm">
          {programme.year} Programme
        </span>
        <span className="text-slate-500 text-sm hidden sm:inline">|</span>
        <div className="flex items-center gap-2">
          <span className="text-sm">
            <span className="text-slate-400">Week</span>{" "}
            <span className="font-bold">{programme.current_week}</span>{" "}
            <span className="text-slate-400">of {programme.total_weeks}</span>
          </span>
          <div className="w-16 h-1 bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-yellow rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Right: Freshness + Health Badge */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11px] text-slate-400">
          Data as of {syncTimeStr} · {data_health.freshness_hours.toFixed(0)}h ago
        </span>
        <HealthBadge health={health} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/pm/layout/programme-context-bar.tsx
git commit -m "feat(pm): add programme context bar with timeline and health signal"
```

---

## Task 7: Dashboard Sidebar & Layout

**Files:**
- Create: `components/pm/layout/pm-sidebar.tsx`
- Create: `app/pm/layout.tsx`

- [ ] **Step 1: Create sidebar component**

Create `components/pm/layout/pm-sidebar.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  School,
  Calendar,
  BookOpen,
  AlertTriangle,
  ClipboardCheck,
  Eye,
  GitCompare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Overview", href: "/pm", icon: LayoutDashboard },
  { name: "Schools", href: "/pm/schools", icon: School },
  { name: "Sessions", href: "/pm/sessions", icon: Calendar },
  { name: "Letter Progress", href: "/pm/letter-progress", icon: BookOpen },
  { name: "Quality Flags", href: "/pm/quality-flags", icon: AlertTriangle, badgeKey: "flags" as const },
  { name: "Assessments", href: "/pm/assessments", icon: ClipboardCheck },
  { name: "Mentor Visits", href: "/pm/mentor-visits", icon: Eye },
];

const SECONDARY_ITEMS = [
  { name: "Compare", href: "/pm/compare", icon: GitCompare },
];

interface PMSidebarProps {
  flagCount?: number;
}

export default function PMSidebar({ flagCount }: PMSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/pm") return pathname === "/pm";
    return pathname.startsWith(href);
  }

  function renderItem(item: typeof NAV_ITEMS[number]) {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
          active
            ? "bg-white/10 text-white font-semibold border-l-3 border-accent-yellow"
            : "text-slate-400 hover:text-white hover:bg-white/5 border-l-3 border-transparent"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="hidden lg:inline">{item.name}</span>
        {"badgeKey" in item && item.badgeKey === "flags" && flagCount != null && flagCount > 0 && (
          <span className="ml-auto hidden lg:inline bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
            {flagCount}
          </span>
        )}
      </Link>
    );
  }

  return (
    <aside className="hidden md:flex flex-col w-12 lg:w-52 bg-slate-900 text-white shrink-0 sticky top-0 h-screen overflow-y-auto">
      {/* Brand */}
      <div className="px-3 py-4">
        <Link href="/pm" className="text-accent-yellow font-bold text-sm hidden lg:block">
          Zazi iZandi PM
        </Link>
        <Link href="/pm" className="text-accent-yellow font-bold text-lg lg:hidden block text-center">
          ZI
        </Link>
      </div>

      {/* Primary Nav */}
      <nav className="flex-1 px-2 space-y-0.5">
        {NAV_ITEMS.map(renderItem)}

        {/* Separator */}
        <div className="border-t border-white/10 my-3" />

        {SECONDARY_ITEMS.map(renderItem)}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <UserButton
            appearance={{
              elements: { avatarBox: "h-7 w-7" },
            }}
          />
          <span className="text-xs text-slate-400 hidden lg:inline truncate">Account</span>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create PM layout**

Create `app/pm/layout.tsx`:

```typescript
import PMSidebar from "@/components/pm/layout/pm-sidebar";
import { getProgrammeOverview } from "@/lib/pm/api";

export const metadata = {
  title: "PM Dashboard | Zazi iZandi",
};

export default async function PMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const overview = await getProgrammeOverview();
  const flagCount = overview.kpis.active_flags;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PMSidebar flagCount={flagCount} />
      <main className="flex-1 min-w-0 p-4 md:p-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Create a placeholder overview page to test the layout**

Create `app/pm/page.tsx` (temporary — will be replaced in Task 10):

```typescript
export default function PMOverviewPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Programme Overview</h1>
      <p className="text-slate-500 mt-2">Dashboard coming soon...</p>
    </div>
  );
}
```

- [ ] **Step 4: Verify build and visual**

Run: `npm run build`
Expected: Build succeeds. Navigating to `/pm` (when signed in as funder+) shows the sidebar on the left with nav items and the placeholder content on the right.

- [ ] **Step 5: Commit**

```bash
git add components/pm/layout/pm-sidebar.tsx app/pm/layout.tsx app/pm/page.tsx
git commit -m "feat(pm): add dashboard sidebar layout and /pm route shell"
```

---

## Task 8: Overview KPI Cards

**Files:**
- Create: `components/pm/overview/overview-kpis.tsx`

- [ ] **Step 1: Create the overview KPIs component**

Create `components/pm/overview/overview-kpis.tsx`:

```typescript
import KPICard from "@/components/pm/shared/kpi-card";
import type { ProgrammeOverviewResponse } from "@/lib/pm/types";

interface OverviewKPIsProps {
  data: ProgrammeOverviewResponse;
}

export default function OverviewKPIs({ data }: OverviewKPIsProps) {
  const { kpis, targets } = data;

  return (
    <div className="space-y-3">
      {/* Top row: actionable metrics with targets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <KPICard
          label="Weighted Dosage"
          value={kpis.weighted_dosage.toFixed(1)}
          borderColor={
            kpis.weighted_dosage >= 3
              ? "border-l-green-500"
              : kpis.weighted_dosage >= 2
                ? "border-l-yellow-500"
                : "border-l-red-500"
          }
          target={{
            value: targets.dosage,
            actual: kpis.weighted_dosage,
            label: `Target: ${targets.dosage}`,
          }}
        />
        <KPICard
          label="On-Track Groups"
          value={`${kpis.on_track_group_rate}%`}
          borderColor={
            kpis.on_track_group_rate >= 80
              ? "border-l-green-500"
              : kpis.on_track_group_rate >= 60
                ? "border-l-yellow-500"
                : "border-l-red-500"
          }
          target={{
            value: targets.on_track_pct,
            actual: kpis.on_track_group_rate,
            label: `Target: ${targets.on_track_pct}%`,
          }}
        />
        <KPICard
          label="Active Flags"
          value={kpis.active_flags}
          borderColor="border-l-red-500"
          trend={{
            value: kpis.flags_delta_week,
            label: "from last week",
          }}
          subtitle={`Resolution: ${kpis.flag_resolution_rate_14d}%`}
          badges={[
            { label: `${kpis.flag_lifecycle.new} new`, className: "bg-red-50 text-red-600" },
            { label: `${kpis.flag_lifecycle.in_progress} in progress`, className: "bg-amber-50 text-amber-600" },
            { label: `${kpis.flag_lifecycle.resolved_this_week} resolved`, className: "bg-green-50 text-green-600" },
          ]}
        />
      </div>

      {/* Bottom row: informational metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <KPICard
          label="Schools"
          value={kpis.total_schools}
          subtitle={`${kpis.total_schools_primary} Primary · ${kpis.total_schools_ecd} ECD`}
          borderColor="border-l-primary"
        />
        <KPICard
          label="EAs & Children"
          value={kpis.total_eas}
          subtitle={`${kpis.total_children.toLocaleString()} children enrolled`}
          borderColor="border-l-purple-500"
        />
        <KPICard
          label="Sessions"
          value={kpis.total_sessions_this_month.toLocaleString()}
          subtitle={`${kpis.total_sessions_this_week} this week · ${kpis.total_sessions_all_time.toLocaleString()} all-time`}
          borderColor="border-l-cyan-500"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/pm/overview/overview-kpis.tsx
git commit -m "feat(pm): add overview KPI cards with target comparison"
```

---

## Task 9: Chart Components

**Files:**
- Create: `components/pm/overview/sessions-chart.tsx`
- Create: `components/pm/overview/dosage-distribution.tsx`

- [ ] **Step 1: Create sessions line chart**

Create `components/pm/overview/sessions-chart.tsx`:

```typescript
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS } from "@/lib/pm/constants";
import type { SessionTimeSeriesPoint } from "@/lib/pm/types";

interface SessionsChartProps {
  data: SessionTimeSeriesPoint[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

export default function SessionsChart({ data }: SessionsChartProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="font-bold text-sm text-slate-900 mb-3">
        Sessions Over Time{" "}
        <span className="font-normal text-xs text-slate-400">Past 30 days</span>
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 10, fill: CHART_COLORS.text }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.text }} />
          <Tooltip
            labelFormatter={formatDate}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend
            iconSize={10}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Line
            type="monotone"
            dataKey="primary"
            name="Primary"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="ecd"
            name="ECD"
            stroke={CHART_COLORS.ecd}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke={CHART_COLORS.total}
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Create dosage distribution chart**

Create `components/pm/overview/dosage-distribution.tsx`:

```typescript
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DosageBucket } from "@/lib/pm/types";

interface DosageDistributionProps {
  data: DosageBucket[];
}

const BUCKET_COLORS: Record<string, string> = {
  "0-1": "#e74c3c",
  "1-2": "#e74c3c",
  "2-3": "#f59e0b",
  "3-4": "#22c55e",
  "4+": "#22c55e",
};

export default function DosageDistribution({ data }: DosageDistributionProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h3 className="font-bold text-sm text-slate-900 mb-3">
        Dosage Distribution
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
          <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} />
          <YAxis
            type="category"
            dataKey="range"
            tick={{ fontSize: 10, fill: "#64748b" }}
            width={35}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(value: number) => [`${value} schools`, "Count"]}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry) => (
              <Cell key={entry.range} fill={BUCKET_COLORS[entry.range] ?? "#94a3b8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-center text-[11px] text-slate-400 mt-1">
        sessions / group / week
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds. Recharts components compile correctly as client components.

- [ ] **Step 4: Commit**

```bash
git add components/pm/overview/sessions-chart.tsx components/pm/overview/dosage-distribution.tsx
git commit -m "feat(pm): add sessions line chart and dosage distribution bar chart"
```

---

## Task 10: School Performance Table

**Files:**
- Create: `components/pm/overview/school-table.tsx`

- [ ] **Step 1: Create sortable school table**

Create `components/pm/overview/school-table.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import DosageBadge from "@/components/pm/shared/dosage-badge";
import type { SchoolPerformanceRow } from "@/lib/pm/types";

interface SchoolTableProps {
  schools: SchoolPerformanceRow[];
}

type SortKey = keyof SchoolPerformanceRow;
type SortDir = "asc" | "desc";

export default function SchoolTable({ schools }: SchoolTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("avg_sessions_per_group_per_week");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    let rows = schools;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((s) => s.school_name.toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [schools, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: "school_name", label: "School", className: "text-left" },
    { key: "school_type", label: "Type" },
    { key: "ea_count", label: "EAs" },
    { key: "children_count", label: "Children" },
    { key: "sessions_this_week", label: "Sess/week" },
    { key: "avg_sessions_per_group_per_week", label: "Dosage" },
    { key: "flags_count", label: "Flags" },
  ];

  function schoolSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-");
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-bold text-sm text-slate-900">School Performance</h3>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search schools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-md w-40 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-xs text-slate-400">
            Click row to drill down
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 rounded">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`px-2 py-2 font-semibold text-slate-500 cursor-pointer hover:text-slate-900 select-none ${col.className ?? "text-right"}`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-0.5">{sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((school) => (
              <tr
                key={school.school_name}
                className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-2 py-2 text-left">
                  <Link
                    href={`/pm/schools/${schoolSlug(school.school_name)}`}
                    className="font-semibold text-slate-900 hover:text-primary"
                  >
                    {school.school_name}
                  </Link>
                </td>
                <td className="px-2 py-2 text-right text-slate-600">{school.school_type}</td>
                <td className="px-2 py-2 text-right">{school.ea_count}</td>
                <td className="px-2 py-2 text-right">{school.children_count}</td>
                <td className="px-2 py-2 text-right">{school.sessions_this_week}</td>
                <td className="px-2 py-2 text-right">
                  <DosageBadge value={school.avg_sessions_per_group_per_week} />
                </td>
                <td className="px-2 py-2 text-right">
                  {school.flags_count > 0 ? (
                    <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                      {school.flags_count}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-[11px] text-slate-400 mt-3">
        Showing {filtered.length} of {schools.length} schools
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/pm/overview/school-table.tsx
git commit -m "feat(pm): add sortable school performance table"
```

---

## Task 11: Overview Page — Compose Everything

**Files:**
- Modify: `app/pm/page.tsx` (replace placeholder from Task 7)

- [ ] **Step 1: Build the full overview page**

Replace `app/pm/page.tsx` with:

```typescript
import ProgrammeContextBar from "@/components/pm/layout/programme-context-bar";
import OverviewKPIs from "@/components/pm/overview/overview-kpis";
import SessionsChart from "@/components/pm/overview/sessions-chart";
import DosageDistribution from "@/components/pm/overview/dosage-distribution";
import SchoolTable from "@/components/pm/overview/school-table";
import { getProgrammeOverview, getSchoolPerformanceRows } from "@/lib/pm/api";

export default async function PMOverviewPage() {
  const [overview, schools] = await Promise.all([
    getProgrammeOverview(),
    getSchoolPerformanceRows(),
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Layer 0: Programme Context Bar */}
      <ProgrammeContextBar data={overview} />

      {/* Layer 1: KPI Cards */}
      <OverviewKPIs data={overview} />

      {/* Layer 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_3fr] gap-3">
        <SessionsChart data={overview.sessions_time_series} />
        <DosageDistribution data={overview.dosage_distribution} />
      </div>

      {/* Layer 3: School Performance Table */}
      <SchoolTable schools={schools} />

      {/* Layer 4: Data Health (collapsed by default) */}
      <details className="bg-white rounded-lg p-4 shadow-sm">
        <summary className="text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-700">
          Data Health
        </summary>
        <div className="grid grid-cols-3 gap-4 mt-3 text-xs">
          <div>
            <p className="text-slate-400">Freshness</p>
            <p className="font-bold text-slate-900">{overview.data_health.freshness_hours.toFixed(0)}h ago</p>
          </div>
          <div>
            <p className="text-slate-400">Last Sync</p>
            <p className="font-bold text-slate-900">
              {new Date(overview.data_health.last_sync).toLocaleString("en-ZA", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Join Match Rate</p>
            <p className="font-bold text-slate-900">{(overview.data_health.join_match_rate * 100).toFixed(0)}%</p>
          </div>
        </div>
      </details>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. The `/pm` page renders with:
- Dark context bar showing "2026 Programme · Week 6 of 40 · HEALTHY"
- 6 KPI cards (2 rows of 3), top row with target bars
- Sessions line chart + dosage distribution bar chart
- Sortable school performance table

- [ ] **Step 3: Commit**

```bash
git add app/pm/page.tsx
git commit -m "feat(pm): build /pm overview page with context bar, KPIs, charts, and table"
```

---

## Task 12: Schools Page with Filters

**Files:**
- Create: `components/pm/schools/school-filters.tsx`
- Create: `app/pm/schools/page.tsx`

- [ ] **Step 1: Create school filter controls**

Create `components/pm/schools/school-filters.tsx`:

```typescript
"use client";

import { getDosageLevel, DOSAGE_COLORS } from "@/lib/pm/constants";

interface SchoolFiltersProps {
  schoolTypes: string[];
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedDosage: string;
  onDosageChange: (level: string) => void;
  selectedSort: string;
  onSortChange: (sort: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export default function SchoolFilters({
  schoolTypes,
  selectedType,
  onTypeChange,
  selectedDosage,
  onDosageChange,
  selectedSort,
  onSortChange,
  search,
  onSearchChange,
}: SchoolFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <input
        type="text"
        placeholder="Search schools or EAs..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="text-sm px-3 py-2 border border-slate-200 rounded-lg w-56 focus:outline-none focus:ring-1 focus:ring-primary"
      />

      <select
        value={selectedType}
        onChange={(e) => onTypeChange(e.target.value)}
        className="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="all">All Types</option>
        {schoolTypes.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <select
        value={selectedDosage}
        onChange={(e) => onDosageChange(e.target.value)}
        className="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="all">All Dosage</option>
        <option value="on_track">{DOSAGE_COLORS.on_track.label}</option>
        <option value="needs_attention">{DOSAGE_COLORS.needs_attention.label}</option>
        <option value="low">{DOSAGE_COLORS.low.label}</option>
      </select>

      <select
        value={selectedSort}
        onChange={(e) => onSortChange(e.target.value)}
        className="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="dosage-desc">Dosage (high → low)</option>
        <option value="dosage-asc">Dosage (low → high)</option>
        <option value="sessions-desc">Sessions (most)</option>
        <option value="children-desc">Children (most)</option>
        <option value="flags-desc">Flags (most)</option>
        <option value="name-asc">Name (A → Z)</option>
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Create schools page**

Create `app/pm/schools/page.tsx`:

```typescript
import { getSchoolPerformanceRows } from "@/lib/pm/api";
import PMSchoolsClient from "./schools-client";

export default async function PMSchoolsPage() {
  const schools = await getSchoolPerformanceRows();
  return <PMSchoolsClient schools={schools} />;
}
```

Create `app/pm/schools/schools-client.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Users, Baby, Layers, Activity } from "lucide-react";
import SchoolFilters from "@/components/pm/schools/school-filters";
import DosageBadge from "@/components/pm/shared/dosage-badge";
import { getDosageLevel } from "@/lib/pm/constants";
import type { SchoolPerformanceRow } from "@/lib/pm/types";

interface PMSchoolsClientProps {
  schools: SchoolPerformanceRow[];
}

export default function PMSchoolsClient({ schools }: PMSchoolsClientProps) {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDosage, setSelectedDosage] = useState("all");
  const [selectedSort, setSelectedSort] = useState("dosage-desc");

  const schoolTypes = useMemo(
    () => [...new Set(schools.map((s) => s.school_type))],
    [schools]
  );

  const filtered = useMemo(() => {
    let rows = schools;

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((s) => s.school_name.toLowerCase().includes(q));
    }
    if (selectedType !== "all") {
      rows = rows.filter((s) => s.school_type === selectedType);
    }
    if (selectedDosage !== "all") {
      rows = rows.filter(
        (s) => getDosageLevel(s.avg_sessions_per_group_per_week) === selectedDosage
      );
    }

    const [key, dir] = selectedSort.split("-") as [string, string];
    return [...rows].sort((a, b) => {
      let aVal: number, bVal: number;
      switch (key) {
        case "dosage": aVal = a.avg_sessions_per_group_per_week; bVal = b.avg_sessions_per_group_per_week; break;
        case "sessions": aVal = a.sessions_this_week; bVal = b.sessions_this_week; break;
        case "children": aVal = a.children_count; bVal = b.children_count; break;
        case "flags": aVal = a.flags_count; bVal = b.flags_count; break;
        case "name": return dir === "asc" ? a.school_name.localeCompare(b.school_name) : b.school_name.localeCompare(a.school_name);
        default: aVal = a.avg_sessions_per_group_per_week; bVal = b.avg_sessions_per_group_per_week;
      }
      return dir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [schools, search, selectedType, selectedDosage, selectedSort]);

  function schoolSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-");
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Schools</h1>
        <p className="text-sm text-slate-500 mt-1">
          {filtered.length} of {schools.length} schools
        </p>
      </div>

      <div className="mb-6">
        <SchoolFilters
          schoolTypes={schoolTypes}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          selectedDosage={selectedDosage}
          onDosageChange={setSelectedDosage}
          selectedSort={selectedSort}
          onSortChange={setSelectedSort}
          search={search}
          onSearchChange={setSearch}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((school) => (
          <Link
            key={school.school_name}
            href={`/pm/schools/${schoolSlug(school.school_name)}`}
            className="block"
          >
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {school.school_name}
                  </h3>
                  <p className="text-xs text-slate-500">{school.school_type}</p>
                </div>
                <DosageBadge value={school.avg_sessions_per_group_per_week} showLabel />
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <Users className="h-3.5 w-3.5 mx-auto text-slate-400 mb-0.5" />
                  <p className="text-sm font-bold">{school.ea_count}</p>
                  <p className="text-[10px] text-slate-400">EAs</p>
                </div>
                <div>
                  <Baby className="h-3.5 w-3.5 mx-auto text-slate-400 mb-0.5" />
                  <p className="text-sm font-bold">{school.children_count}</p>
                  <p className="text-[10px] text-slate-400">Children</p>
                </div>
                <div>
                  <Layers className="h-3.5 w-3.5 mx-auto text-slate-400 mb-0.5" />
                  <p className="text-sm font-bold">{school.groups_count}</p>
                  <p className="text-[10px] text-slate-400">Groups</p>
                </div>
                <div>
                  <Activity className="h-3.5 w-3.5 mx-auto text-slate-400 mb-0.5" />
                  <p className="text-sm font-bold">{school.sessions_this_week}</p>
                  <p className="text-[10px] text-slate-400">Sess/wk</p>
                </div>
              </div>

              {school.flags_count > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100">
                  <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded font-semibold">
                    {school.flags_count} active flag{school.flags_count > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds. `/pm/schools` renders school cards in a grid with filter controls.

- [ ] **Step 4: Commit**

```bash
git add components/pm/schools/school-filters.tsx app/pm/schools/page.tsx app/pm/schools/schools-client.tsx
git commit -m "feat(pm): add /pm/schools page with filter and sort controls"
```

---

## Task 13: School Detail Page

**Files:**
- Create: `components/pm/schools/school-detail-header.tsx`
- Create: `app/pm/schools/[school-name]/page.tsx`

- [ ] **Step 1: Create school detail header component**

Create `components/pm/schools/school-detail-header.tsx`:

```typescript
import KPICard from "@/components/pm/shared/kpi-card";
import DosageBadge from "@/components/pm/shared/dosage-badge";
import type { SchoolDetailResponse } from "@/lib/pm/types";

interface SchoolDetailHeaderProps {
  school: SchoolDetailResponse;
}

export default function SchoolDetailHeader({ school }: SchoolDetailHeaderProps) {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">{school.school_name}</h1>
        <p className="text-sm text-slate-500">{school.school_type}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KPICard label="EAs" value={school.ea_count} borderColor="border-l-primary" />
        <KPICard label="Children" value={school.children_count} borderColor="border-l-purple-500" />
        <KPICard label="Groups" value={school.groups_count} borderColor="border-l-cyan-500" />
        <KPICard label="Total Sessions" value={school.total_sessions} borderColor="border-l-blue-400" />
        <KPICard
          label="Dosage"
          value={school.avg_sessions_per_group_per_week.toFixed(1)}
          borderColor={
            school.avg_sessions_per_group_per_week >= 3
              ? "border-l-green-500"
              : school.avg_sessions_per_group_per_week >= 2
                ? "border-l-yellow-500"
                : "border-l-red-500"
          }
        />
        <KPICard
          label="Flags"
          value={school.flags.length}
          borderColor={school.flags.length > 0 ? "border-l-red-500" : "border-l-slate-300"}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create school detail page**

Create `app/pm/schools/[school-name]/page.tsx`:

```typescript
import Link from "next/link";
import { ChevronRight, Users, Activity } from "lucide-react";
import SchoolDetailHeader from "@/components/pm/schools/school-detail-header";
import DosageBadge from "@/components/pm/shared/dosage-badge";
import { getSchoolDetail } from "@/lib/pm/api";

interface Props {
  params: Promise<{ "school-name": string }>;
}

export default async function SchoolDetailPage({ params }: Props) {
  const { "school-name": schoolSlug } = await params;
  const school = await getSchoolDetail(schoolSlug);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-xs text-slate-400 mb-4">
        <Link href="/pm" className="hover:text-primary">Overview</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/pm/schools" className="hover:text-primary">Schools</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-700 font-medium">{school.school_name}</span>
      </nav>

      <SchoolDetailHeader school={school} />

      {/* EA Cards */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-3">Education Assistants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {school.eas.map((ea) => (
            <div
              key={ea.name}
              className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm text-slate-900">{ea.name}</h3>
                <DosageBadge value={ea.avg_sessions_per_group_per_week} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-900">{ea.groups_count}</p>
                  <p className="text-slate-400">Groups</p>
                </div>
                <div>
                  <p className="font-bold text-slate-900">{ea.children_count}</p>
                  <p className="text-slate-400">Children</p>
                </div>
                <div>
                  <p className="font-bold text-slate-900">{ea.sessions_this_week}</p>
                  <p className="text-slate-400">Sess/wk</p>
                </div>
              </div>
              {ea.flags_count > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded font-semibold">
                    {ea.flags_count} flag{ea.flags_count > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Flags */}
      {school.flags.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Active Flags</h2>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Flag</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Entity</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Detail</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {school.flags.map((flag, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2 capitalize">{flag.flag_type.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2">{flag.entity}</td>
                    <td className="px-3 py-2 text-slate-600">{flag.detail}</td>
                    <td className="px-3 py-2">
                      <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase">
                        {flag.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Recent Activity</h2>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-end gap-1 h-24">
            {school.recent_sessions.map((day) => {
              const maxSessions = Math.max(...school.recent_sessions.map((d) => d.session_count), 1);
              const heightPct = (day.session_count / maxSessions) * 100;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-slate-500">{day.session_count}</span>
                  <div
                    className="w-full bg-primary/80 rounded-t-sm min-h-[2px]"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[8px] text-slate-400 rotate-[-45deg] origin-center">
                    {new Date(day.date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds. `/pm/schools/siyazama-ps` renders with breadcrumbs, school KPIs, EA cards, flags table, and activity chart.

- [ ] **Step 4: Commit**

```bash
git add components/pm/schools/school-detail-header.tsx app/pm/schools/\[school-name\]/page.tsx
git commit -m "feat(pm): add school detail page with EA cards, flags, and activity chart"
```

---

## Task 14: Django Backend — ProgrammeTargets Model & API (Separate Repo)

> **Repo:** `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api`
> This task modifies the Django backend. It can be done in parallel with frontend tasks.

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/models.py`
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/views.py`
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/urls.py`

- [ ] **Step 1: Add ProgrammeTargets model**

Append to `api/models.py`:

```python
class ProgrammeTargets(models.Model):
    """Annual programme targets for dashboard KPI comparisons."""
    year = models.IntegerField(primary_key=True)
    programme_start_date = models.DateField()
    programme_end_date = models.DateField()
    target_dosage = models.FloatField(help_text="Target sessions/group/week, e.g., 3.5")
    target_on_track_pct = models.FloatField(help_text="Target % of groups at 3+ sessions/week")
    target_flag_resolution_pct = models.FloatField(help_text="Target % of flags resolved within 14 days")
    target_assessment_coverage_pct = models.FloatField(help_text="Target % of eligible children assessed")
    target_mentor_coverage_days = models.IntegerField(help_text="Max days between school visits")

    class Meta:
        db_table = "programme_targets"
        verbose_name_plural = "Programme targets"

    def __str__(self):
        return f"Targets {self.year}"
```

- [ ] **Step 2: Run migration**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
python manage.py makemigrations api
python manage.py migrate
```

- [ ] **Step 3: Seed 2026 targets via Django shell**

```bash
python manage.py shell -c "
from api.models import ProgrammeTargets
ProgrammeTargets.objects.update_or_create(
    year=2026,
    defaults={
        'programme_start_date': '2026-02-23',
        'programme_end_date': '2026-11-28',
        'target_dosage': 3.5,
        'target_on_track_pct': 85.0,
        'target_flag_resolution_pct': 80.0,
        'target_assessment_coverage_pct': 95.0,
        'target_mentor_coverage_days': 14,
    }
)
print('Done')
"
```

- [ ] **Step 4: Build /api/programme-overview/ endpoint**

Add to `api/views.py`:

```python
from datetime import date, datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import SchoolSummary2026, GroupSummary2026, ProgrammeTargets
import math


@csrf_exempt
def programme_overview(request):
    """Enhanced programme overview with targets, timeline, and health signal."""
    try:
        targets_obj = ProgrammeTargets.objects.get(year=2026)
    except ProgrammeTargets.DoesNotExist:
        return JsonResponse({"error": "No targets configured for 2026"}, status=500)

    schools = list(SchoolSummary2026.objects.all())
    groups = list(GroupSummary2026.objects.all())

    # Programme timeline
    today = date.today()
    start = targets_obj.programme_start_date
    end = targets_obj.programme_end_date
    current_week = max(1, math.floor((today - start).days / 7) + 1)
    total_weeks = math.floor((end - start).days / 7)
    weeks_elapsed = max(1, current_week)

    # KPIs
    total_schools = len(schools)
    total_primary = sum(1 for s in schools if s.school_type == "Primary School")
    total_ecd = sum(1 for s in schools if s.school_type == "ECD")
    total_eas = sum(s.ea_count for s in schools)
    total_children = sum(s.children_count for s in schools)
    total_groups = sum(s.groups_count for s in schools)
    total_sessions = sum(s.total_sessions for s in schools)
    sessions_week = sum(s.sessions_this_week for s in schools)
    sessions_month = sum(s.sessions_this_month for s in schools)

    # Weighted dosage
    weighted_dosage = round(total_sessions / max(total_groups * weeks_elapsed, 1), 2)

    # On-track groups (>= 3 sessions/week)
    on_track = sum(1 for g in groups if g.avg_sessions_per_week >= 3)
    on_track_rate = round(on_track / max(len(groups), 1) * 100, 1)

    # Flags
    flagged_eas = sum(s.same_letter_group_flagged_eas + s.moving_too_fast_flagged_eas for s in schools)

    # Dosage distribution
    buckets = {"0-1": 0, "1-2": 0, "2-3": 0, "3-4": 0, "4+": 0}
    for s in schools:
        avg = s.avg_sessions_per_group_per_week
        if avg >= 4: buckets["4+"] += 1
        elif avg >= 3: buckets["3-4"] += 1
        elif avg >= 2: buckets["2-3"] += 1
        elif avg >= 1: buckets["1-2"] += 1
        else: buckets["0-1"] += 1

    # Health signal
    dosage_score = min(weighted_dosage / targets_obj.target_dosage, 1.0)
    on_track_score = min(on_track_rate / targets_obj.target_on_track_pct, 1.0)
    flags_score = max(0, 1 - (flagged_eas / max(total_eas, 1)))
    resolution_score = 0.7  # Placeholder until FlagEvent model exists

    health_score = round(0.3 * dosage_score + 0.3 * on_track_score + 0.2 * flags_score + 0.2 * resolution_score, 2)
    if health_score >= 0.8:
        health_status = "healthy"
    elif health_score >= 0.6:
        health_status = "needs_attention"
    else:
        health_status = "action_required"

    # Latest compute timestamp for freshness
    latest_compute = max((s.computed_at for s in schools), default=datetime.now())
    freshness_hours = round((datetime.now(latest_compute.tzinfo) - latest_compute).total_seconds() / 3600, 1)

    return JsonResponse({
        "generated_at": datetime.now().isoformat(),
        "programme": {
            "year": 2026,
            "start_date": str(targets_obj.programme_start_date),
            "end_date": str(targets_obj.programme_end_date),
            "current_week": current_week,
            "total_weeks": total_weeks,
        },
        "targets": {
            "dosage": targets_obj.target_dosage,
            "on_track_pct": targets_obj.target_on_track_pct,
            "flag_resolution_pct": targets_obj.target_flag_resolution_pct,
            "assessment_coverage_pct": targets_obj.target_assessment_coverage_pct,
            "mentor_coverage_days": targets_obj.target_mentor_coverage_days,
        },
        "kpis": {
            "total_schools": total_schools,
            "total_schools_primary": total_primary,
            "total_schools_ecd": total_ecd,
            "total_eas": total_eas,
            "total_children": total_children,
            "weighted_dosage": weighted_dosage,
            "on_track_group_rate": on_track_rate,
            "total_sessions_this_week": sessions_week,
            "total_sessions_this_month": sessions_month,
            "total_sessions_all_time": total_sessions,
            "active_flags": flagged_eas,
            "flags_delta_week": 0,  # Requires historical data, placeholder
            "flag_resolution_rate_14d": 0.0,  # Requires FlagEvent model
            "flag_lifecycle": {"new": flagged_eas, "acknowledged": 0, "in_progress": 0, "resolved_this_week": 0},
        },
        "health": {
            "score": health_score,
            "status": health_status,
            "components": {
                "dosage": round(dosage_score, 2),
                "on_track": round(on_track_score, 2),
                "flags": round(flags_score, 2),
                "resolution": round(resolution_score, 2),
            },
        },
        "data_health": {
            "freshness_hours": freshness_hours,
            "last_sync": latest_compute.isoformat() if latest_compute else datetime.now().isoformat(),
            "join_match_rate": 0.97,  # Placeholder
        },
        "sessions_time_series": [],  # Requires session-level date aggregation, Phase 2
        "dosage_distribution": [{"range": k, "count": v} for k, v in buckets.items()],
    })
```

- [ ] **Step 5: Add URL pattern**

In `api/urls.py`, add:

```python
from .views import programme_overview

urlpatterns = [
    # ... existing patterns ...
    path("programme-overview/", programme_overview, name="programme-overview"),
]
```

- [ ] **Step 6: Verify locally**

```bash
python manage.py runserver 0.0.0.0:8000
curl http://localhost:8000/api/programme-overview/ | python -m json.tool
```

Expected: JSON response with programme, targets, kpis, health, data_health, and dosage_distribution fields.

- [ ] **Step 7: Commit (Django repo)**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
git add api/models.py api/views.py api/urls.py api/migrations/
git commit -m "feat: add ProgrammeTargets model and /api/programme-overview/ endpoint"
```

---

## Task 15: Final Verification

- [ ] **Step 1: Run full Next.js build**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No lint errors.

- [ ] **Step 3: Visual verification checklist**

Start dev server (`npm run dev`) and verify (signed in as funder+ role):

1. `/pm` — sidebar on left, context bar with "Week 6 of 40" + health badge, 6 KPI cards (top 3 with target bars), sessions chart, dosage chart, school table
2. `/pm/schools` — school cards in grid with filter dropdowns and search
3. `/pm/schools/siyazama-ps` — breadcrumbs, school KPIs, EA cards, flags table, activity chart
4. Sidebar — active item highlighted, flag badge count visible
5. Header — "Project Management" dropdown shows all PM sub-pages
6. Middleware — unauthenticated access to `/pm` redirects to login
7. Responsive — at 768px sidebar collapses to icon-only, content takes full width

- [ ] **Step 4: Final commit if any adjustments needed**

```bash
git add -A
git commit -m "feat(pm): Phase 1 complete — PM dashboard command center"
```
