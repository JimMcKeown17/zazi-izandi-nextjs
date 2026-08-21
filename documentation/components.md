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

### Mobile-app operations (`components/mobile-app/`)

| Component | Type | Purpose |
|-----------|------|---------|
| `layout/mobile-sidebar.tsx` | Client | Capability-gated desktop/mobile reporting navigation |
| `attendance/attendance-filters.tsx` | Server | Bounded activity-window and current-school filters plus export placement |
| `attendance/attendance-summary.tsx` | Server | Shift, EA, open-shift, automatic-clock-out, and completed-duration totals |
| `attendance/clock-entries-table.tsx` | Client | Paginated desktop shift table and responsive evidence cards |
| `attendance/time-entry-export-button.tsx` | Client | Same-origin CSV download with visible pending/failure states |
| `user-health/user-health-summary.tsx` | Client subtree | Four population-scoped adoption, activity, and attention cards |
| `user-health/user-health-technical-evidence.tsx` | Client subtree | Collapsed authentication, app-open, push-reachability, and version coverage |
| `user-health/user-health-tabs.tsx` | Server | Route-backed Overview and Sync diagnostics navigation |
| `user-health/user-health-board.tsx` | Client | Unified population scope and triage controls plus the paginated EA evidence board |

The Clock In/Out and User health pages are server components. Client components
receive already-validated response data and handle only local interaction;
they do not fetch Supabase or Django directly.

## UI Primitives (`components/ui/`)

Radix UI + shadcn "new-york" style. Configured in `components.json`.

`badge` · `button` · `card` · `carousel` (Embla) · `dialog` · `navigation-menu` · `separator` · `tabs`

Add new components via: `npx shadcn@latest add <component-name>`
