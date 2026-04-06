# CLAUDE.md

## Commands

```bash
npm run dev              # Dev server at localhost:3000
npm run build            # Production build
npm run lint             # ESLint
npx playwright test      # E2E tests (requires dev server or uses built-in webServer)
```

No unit test framework is configured.

## Tech Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Clerk auth · Radix UI (shadcn "new-york") · Mapbox GL · Embla Carousel · Lucide icons

## Architecture

Frontend-only Next.js site for **Zazi iZandi**, a South African early literacy intervention program. No custom API routes — all backend logic lives in a separate [Django app on Render](documentation/data-and-backend.md).

### Directory Structure

```
app/                        # App Router pages (each route is a page.tsx)
├── globals.css             # Theme: colors, animations, custom classes
├─�� layout.tsx              # Root layout (fonts only — no Header/Footer)
├── page.tsx                # Home (/)
├── about/ impact/ methodology/ media/ resources/
├── pm/                     # PM Dashboard (protected, min role: funder)
│   ├── layout.tsx          # Dashboard shell — sidebar + content (no Header/Footer)
│   ├── page.tsx            # /pm → Overview command center
│   └── schools/            # /pm/schools, /pm/schools/[school-name]
├── schools/                # Protected (Clerk RBAC, min role: funder)
├── schools-2025/           # Placeholder "coming soon"
├── schools-2026/           # Live data from Django API (ISR, 300s)
├── data-portal/            # Embedded iframe to external BI tool
└── login/[[...sign-in]]/   # Clerk sign-in
components/
├── layout/                 # header.tsx (client), footer.tsx
├── pm/                     # PM Dashboard components
│   ├── layout/             # pm-sidebar.tsx, programme-context-bar.tsx, cohort-selector.tsx
│   ├── shared/             # kpi-card.tsx, health-badge.tsx, dosage-badge.tsx
│   ├── overview/           # overview-kpis.tsx, sessions-chart.tsx, dosage-distribution.tsx, school-table.tsx
│   └── schools/            # school-filters.tsx, school-detail-header.tsx
├── home/ about/ impact/ methodology/ media/   # Page-specific sections
├── schools/                # School map (Mapbox), EA cards
├─�� schools-2026/           # 2026 school cards (live Django data)
└── ui/                     # Radix/shadcn primitives
lib/pm/                     # PM Dashboard data layer
├── types.ts                # All TypeScript interfaces for PM API responses
├── constants.ts            # Dosage thresholds, health status config, chart colors
├── cohorts.ts              # School cohort lists (Treatment/SEF/ECD) and filter logic
├── api.ts                  # Data fetching (Django API + mock fallback)
└── mock-data.ts            # Mock data matching API contracts
data/                       # Static JSON/CSV consumed at build time
middleware.ts               # Clerk RBAC — protects /schools* and /pm* routes
```

See: [Routes](documentation/routes.md) · [Components](documentation/components.md)

### Key Patterns

- **No shared Header/Footer in layout.** Each `page.tsx` renders `<Header />`, `<main className="pt-20">`, `<Footer />` manually. **Exception:** `/pm/*` uses a dashboard layout (sidebar + content) with no Header/Footer.
- **Color theming** via CSS custom properties in `globals.css`. Use `text-primary`, `bg-primary`, `bg-accent-yellow`, etc.
- **Fonts:** Roboto (`--font-roboto`) for sans/headings, Open Sans (`--font-open-sans`) as body default. Loaded in `layout.tsx`.
- **Path alias:** `@/` maps to project root.
- **Static data** imported directly in page components (no API). Only `/schools-2026` and `/pm/*` fetch from Django.
- **Client components** used for browser APIs: Mapbox map, scroll animations, header nav, Recharts charts, interactive filters.
- **shadcn config:** `components.json` — style "new-york", RSC enabled, Lucide icons, aliases at `@/components`, `@/lib`, `@/components/ui`.

### PM Dashboard Architecture

The `/pm/*` pages form a self-contained dashboard app with a distinct layout:
- **Dashboard shell** (`app/pm/layout.tsx`): left sidebar + content area, no Header/Footer
- **Sidebar** (`pm-sidebar.tsx`): dark theme, responsive (full → icon-only → mobile bottom tabs)
- **Programme context bar**: dark header with programme week, cohort selector, health badge, data freshness
- **Cohort filter**: global `?cohort=treatment|sef|ecd|all` URL param, defaults to `treatment`. Cohort lists in `lib/pm/cohorts.ts`.
- **Data fetching**: server components fetch from Django API with ISR (5-min revalidation). API layer returns `{ data, isLive }` — pages show amber banner when using mock data fallback.
- **Charts**: Recharts (client components) for line charts, bar charts. Wrapped in server component pages.
- **Dosage calculation**: per-group `first_session_date` (not global programme start). Teaching start date = 2026-03-08. School holidays excluded from programme-day denominators (see `SCHOOL_HOLIDAYS_2026` in Django `api/views.py`).
- **KPI layout**: 3 rows — aggregate (schools/EAs/children), group performance (dosage/on-track/flags), EA performance (sessions per day worked/on-track EAs/sessions per programme day).
- **Spec**: `docs/superpowers/specs/2026-04-05-pm-dashboard-design.md`
- **Plan**: `docs/superpowers/plans/2026-04-05-pm-dashboard-phase1.md`

## Authentication (Clerk RBAC)

Middleware at `middleware.ts` protects `/schools*` and `/pm*` routes with role-based access:

| Role | Level | Notes |
|------|-------|-------|
| `funder` | 1 | Minimum for `/schools*` and `/pm*` |
| `junior_staff` | 2 | |
| `senior_staff` | 3 | |
| `admin` | 4 | Full access |

Roles set in **Clerk Dashboard** → User → publicMetadata: `{ "role": "funder" }`.
Session token must include custom claim: `{ "metadata": "{{user.public_metadata}}" }`.
Unauthenticated users redirect to `/login?redirect_url=...`.

## Django Backend

A separate Django app at `DJANGO_API_URL` (hosted on Render) serves live school data. The Next.js frontend consumes:

- **`/schools-2026`** — Fetches `/api/schools-2026/` with ISR (300s)
- **`/pm`** — Fetches `/api/programme-overview/` with ISR (300s). Falls back to mock data.
- **`/pm/schools`** — Fetches `/api/schools-2026/` (same endpoint, filtered by cohort in frontend)

Django source repo: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025`

See: [Data & Backend](documentation/data-and-backend.md)

## Brand & Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#2c5aa0` | Primary blue — headings, buttons, borders |
| `accent-yellow` | `#ffd641` | Brand yellow — accents, CTAs, icons. Use liberally. |
| `accent-red` | `#e74c3c` | Alert/emphasis |
| `primary-50`–`primary-900` | — | Full blue palette in `globals.css` |

See: [Styling & Theme](documentation/styling.md)

## Environment Variables

See `.env.example` for all variables. **Required for development:**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox GL map on `/schools` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth (public) |
| `CLERK_SECRET_KEY` | Clerk auth (server) |
| `DJANGO_API_URL` | Django backend for `/schools-2026` |

## Further Documentation

| File | Contents |
|------|----------|
| [documentation/routes.md](documentation/routes.md) | All routes, purpose, protection status |
| [documentation/components.md](documentation/components.md) | Component directories and key components |
| [documentation/styling.md](documentation/styling.md) | CSS custom properties, animations, utility classes |
| [documentation/data-and-backend.md](documentation/data-and-backend.md) | Data files, Django API, ISR |
| [documentation/assets.md](documentation/assets.md) | Static assets in `public/` |
