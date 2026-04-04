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
├── layout.tsx              # Root layout (fonts only — no Header/Footer)
├── page.tsx                # Home (/)
├── about/ impact/ methodology/ media/ resources/
├── schools/                # Protected (Clerk RBAC, min role: funder)
├── schools-2025/           # Placeholder "coming soon"
├── schools-2026/           # Live data from Django API (ISR, 300s)
├── data-portal/            # Embedded iframe to external BI tool
└── login/[[...sign-in]]/   # Clerk sign-in
components/
├── layout/                 # header.tsx (client), footer.tsx
├── home/ about/ impact/ methodology/ media/   # Page-specific sections
├── schools/                # School map (Mapbox), EA cards
├── schools-2026/           # 2026 school cards (live Django data)
└── ui/                     # Radix/shadcn primitives
data/                       # Static JSON/CSV consumed at build time
middleware.ts               # Clerk RBAC — protects /schools* routes
```

See: [Routes](documentation/routes.md) · [Components](documentation/components.md)

### Key Patterns

- **No shared Header/Footer in layout.** Each `page.tsx` renders `<Header />`, `<main className="pt-20">`, `<Footer />` manually.
- **Color theming** via CSS custom properties in `globals.css`. Use `text-primary`, `bg-primary`, `bg-accent-yellow`, etc.
- **Fonts:** Roboto (`--font-roboto`) for sans/headings, Open Sans (`--font-open-sans`) as body default. Loaded in `layout.tsx`.
- **Path alias:** `@/` maps to project root.
- **Static data** imported directly in page components (no API). Only `/schools-2026` fetches from Django.
- **Client components** used for browser APIs: Mapbox map, scroll animations, header nav.
- **shadcn config:** `components.json` — style "new-york", RSC enabled, Lucide icons, aliases at `@/components`, `@/lib`, `@/components/ui`.

## Authentication (Clerk RBAC)

Middleware at `middleware.ts` protects `/schools*` routes with role-based access:

| Role | Level | Notes |
|------|-------|-------|
| `funder` | 1 | Minimum for `/schools*` |
| `junior_staff` | 2 | Future route expansion |
| `senior_staff` | 3 | |
| `admin` | 4 | Full access |

Roles set in **Clerk Dashboard** → User → publicMetadata: `{ "role": "funder" }`.
Session token must include custom claim: `{ "metadata": "{{user.public_metadata}}" }`.
Unauthenticated users redirect to `/login?redirect_url=...`.

## Django Backend

A separate Django app at `DJANGO_API_URL` (hosted on Render) serves live school data. The Next.js frontend consumes it in one place:

- **`/schools-2026`** — Server component fetches `/api/schools-2026/` with ISR (`revalidate: 300`).

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
