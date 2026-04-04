# Component Architecture

## Layout (`components/layout/`)

| Component | Type | Purpose |
|-----------|------|---------|
| `header.tsx` | Client | Fixed nav with scroll behavior, active link highlighting, mobile menu |
| `footer.tsx` | Server | Footer with links and branding |

Imported manually in every `page.tsx` — not injected by `layout.tsx`.

## Page Sections

Each page has a dedicated component directory. Components are named `*-section.tsx` and composed in the page's `page.tsx`.

### Home (`components/home/`)
`hero-section` · `doe-partnership-section` · `stats-section` · `impact-section` · `research-section` · `video-section` · `partners-section` · `cta-section`

### About (`components/about/`)
`mission-section` · `program-timeline` · `timeline-milestone`

### Impact (`components/impact/`)
`hero-section` · `kpi-section` · `benchmark-section` · `before-after-section` · `charts-section` · `success-stories-section` · `year-over-year-section`

### Methodology (`components/methodology/`)
`hero-section` · `programme-overview` · `doe-partnership-section` · `tarl-section` · `ea-training-section` · `egra-section` · `structured-literacy-section` · `data-driven-section` · `games-videos-section` · `games-videos-cta` · `methodology-cta`

### Media (`components/media/`)
`hero-section` · `video-section` · `all-videos-section` · `news-section` · `testimonials-section` · `gallery-section`

### Schools (`components/schools/`)
| Component | Type | Purpose |
|-----------|------|---------|
| `school-map.tsx` | Client | Mapbox GL map with clustered school markers, color-coded by performance |
| `ea-card.tsx` | Server | Education Assistant card showing performance metrics |

### Schools 2026 (`components/schools-2026/`)
| Component | Type | Purpose |
|-----------|------|---------|
| `stats-summary-2026.tsx` | Server | Aggregate stats (total schools, EAs, children, sessions) |
| `school-cards-grid-2026.tsx` | Server | Responsive grid of school cards |
| `school-card-2026.tsx` | Server | Individual school card with live data from Django API |

## UI Primitives (`components/ui/`)

Radix UI + shadcn "new-york" style. Configured in `components.json`.

`badge` · `button` · `card` · `carousel` (Embla) · `dialog` · `navigation-menu` · `separator` · `tabs`

Add new components via: `npx shadcn@latest add <component-name>`
