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

Frontend-only Next.js site for **Zazi iZandi**, a South African early literacy intervention program. Proxy routes (`app/api/*/route.ts`) forward client-side requests to Django to avoid CORS. All backend logic lives in a separate [Django app on Render](documentation/data-and-backend.md).

### Key Patterns

- **No shared Header/Footer in layout.** Each `page.tsx` renders `<Header />`, `<main className="pt-20">`, `<Footer />` manually. **Exception:** `/pm/*` uses a dashboard layout (sidebar + content) with no Header/Footer.
- **Color theming** via CSS custom properties in `globals.css`. Use `text-primary`, `bg-primary`, `bg-accent-yellow`, etc.
- **Fonts:** Roboto (`--font-roboto`) for sans/headings, Open Sans (`--font-open-sans`) as body default. Loaded in `layout.tsx`.
- **Path alias:** `@/` maps to project root.
- **Static data** imported directly in page components (no API). Only `/schools-2026` and `/pm/*` fetch from Django.
- **Client components** used for browser APIs: Mapbox map, scroll animations, header nav, Recharts charts, interactive filters.
- **shadcn config:** `components.json` — style "new-york", RSC enabled, Lucide icons, aliases at `@/components`, `@/lib`, `@/components/ui`.

## Authentication (Clerk RBAC)

Middleware at `middleware.ts` protects `/schools*` and `/pm*` routes. Roles: `funder` (min) → `junior_staff` → `senior_staff` → `admin`. Set in Clerk Dashboard → publicMetadata: `{ "role": "funder" }`. Session token needs custom claim: `{ "metadata": "{{user.public_metadata}}" }`.

## Django Backend

Django source: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025`. Hosted on Render at `DJANGO_API_URL`. Nightly cron syncs from TeamPact API + computes group summaries and letter alignment.

**Service auth:** All Next.js → Django calls must include the `X-Internal-Auth: ${INTERNAL_API_SECRET}` header. Django middleware rejects any `/api/*` request without it. Use the `lib/django-fetch.ts` helper — never call Django with raw `fetch` or the header will be missing. Both services must have `INTERNAL_API_SECRET` set in their Render env vars.

## Brand Colors

`primary` (#2c5aa0) · `accent-yellow` (#ffd641) · `accent-red` (#e74c3c). Full palette in `globals.css`.

## Environment Variables

See `.env.example`. Required: `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DJANGO_API_URL`, `INTERNAL_API_SECRET` (must match the value set on the Django service).

## Further Documentation

| File | Contents |
|------|----------|
| [documentation/routes.md](documentation/routes.md) | All routes, purpose, protection status |
| [documentation/components.md](documentation/components.md) | Component directories and key components |
| [documentation/styling.md](documentation/styling.md) | CSS custom properties, animations, utility classes |
| [documentation/data-and-backend.md](documentation/data-and-backend.md) | Data files, Django API, ISR |
| [documentation/assets.md](documentation/assets.md) | Static assets in `public/` |
| [documentation/pm-dashboard-architecture.md](documentation/pm-dashboard-architecture.md) | PM Dashboard pages, data flow, flags, language-aware letters, Django endpoints |
| [documentation/letter-mastery-data-model.md](documentation/letter-mastery-data-model.md) | **IMPORTANT** — how to interpret mastery data, what claims are supportable, and language guidance for EA-facing and AI-generated copy. Read before building anything that displays or reasons about child letter mastery. |

## Terminology

- **EA (Education Assistant)** — the frontline worker who teaches children in the Zazi iZandi programme. In other Masinyusane programmes the same role is called a **Literacy Coach (LC)**. The code and UI use "EA" consistently; if a user says "LCs" they mean EAs.

# git
- Always work on git branches. once code is working, merge back to main & push.
- Do not write co-written by claude etc on git commits.