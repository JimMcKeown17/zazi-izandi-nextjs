# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server at localhost:3000
npm run build     # Production build
npm run lint      # Run ESLint
```

No test framework is configured.

## Architecture

This is a **Next.js 16 App Router** site for Zazi iZandi, a South African early literacy intervention program.

**Tech stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Radix UI primitives (via shadcn-style `components/ui/`), Mapbox GL, Embla Carousel, Lucide icons.

**Fonts:** Roboto (`--font-roboto`) and Open Sans (`--font-open-sans`) loaded via `next/font/google`. Open Sans is the default body font.

**Path alias:** `@/` maps to the project root.

### Directory structure

- `app/` — App Router pages. Each route is a `page.tsx`. Layout wraps pages with font classes but does **not** include `<Header>` or `<Footer>` — each page imports and renders these manually.
- `components/layout/` — `header.tsx` (client component with scroll/active-link logic) and `footer.tsx`.
- `components/home/`, `components/about/`, `components/schools/` — Page-specific sections.
- `components/ui/` — Radix UI-based primitives (Button, Card, Badge, Dialog, Tabs, Carousel, NavigationMenu, Separator).
- `data/` — Static JSON/CSV files consumed directly by page components at build time. `ea-data.json` contains Education Assistant performance records; `school-locations.json` has geo-coordinates for the Mapbox map.

### Key patterns

- Pages **do not** use a shared layout that injects `<Header>`/`<Footer>`. Each `page.tsx` wraps content in `<> <Header /> <main> ... </main> <Footer /> </>`.
- The `<main>` element typically has `pt-20` to clear the fixed header.
- Color theming uses CSS custom properties. `primary` color is referenced throughout as `text-primary`, `bg-primary`, `border-primary`, etc. — defined in `app/globals.css`.
- The Mapbox `SchoolMap` component (`components/schools/school-map.tsx`) is a client component since it requires browser APIs.
- Data filtering (e.g., removing EA entries without a school name) is done inline at the top of page components using the imported JSON.

## Brand & Colors

- **Primary blue:** `#2c5aa0` (referenced as `text-primary`, `bg-primary`, etc.)
- **Accent yellow:** `#ffd641` — the original Zazi iZandi brand yellow. Use liberally for accents, icons, CTAs, and accent bars. Referenced as `text-accent-yellow`, `bg-accent-yellow`.
- Django source for content/design reference: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025`

## Static Assets (public/)

All assets copied from the Django project are organized under `public/`:

| Path | Contents |
|---|---|
| `public/videos/` | `hero-bg.mp4` — hero section video background |
| `public/images/sponsors/` | Partner/funder logos (Masi, TLT, DoE EC, DGMT, Funda Wande) |
| `public/images/children/` | Child progress portraits (Lulo, Mbali, Qhamani, Shalom, Yonela) |
| `public/images/gallery/` | Program photo gallery images |
| `public/images/news/` | Press/news images (Dispatch, President) |
| `public/images/misc/` | Research photos, data charts, SVG icons, misc |
