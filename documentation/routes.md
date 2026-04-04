# Routes & Pages

All pages follow the same pattern: `<Header /> <main className="pt-20"> ... </main> <Footer />`.

| Route | Page | Description | Auth | Rendering |
|-------|------|-------------|------|-----------|
| `/` | `app/page.tsx` | Home — hero video, DoE partnership, impact stats, research, partners | Public | Static |
| `/about` | `app/about/page.tsx` | Mission, values, program timeline/milestones | Public | Static |
| `/impact` | `app/impact/page.tsx` | KPIs, benchmarks, before/after, charts, success stories, YoY trends | Public | Static |
| `/methodology` | `app/methodology/page.tsx` | Program overview, DoE partnership, TaRL, EA training, EGRA, games/videos | Public | Static |
| `/media` | `app/media/page.tsx` | Videos, news/press coverage, testimonials, photo gallery | Public | Static |
| `/resources` | `app/resources/page.tsx` | Open-source training guides (EN/isiXhosa/Afrikaans), games, activities, datasets | Public | Static |
| `/schools` | `app/schools/page.tsx` | Interactive Mapbox map (140+ schools), EA cards with performance data | Protected | Static (data from `data/`) |
| `/schools-2025` | `app/schools-2025/page.tsx` | Placeholder "coming soon" page | Protected | Static |
| `/schools-2026` | `app/schools-2026/page.tsx` | Live 2026 school data — stats summary + school cards grid | Protected | ISR (300s), fetches from Django API |
| `/data-portal` | `app/data-portal/page.tsx` | Full-page iframe embedding `https://data.zazi-izandi.co.za/` | Public | Static |
| `/login` | `app/login/[[...sign-in]]/page.tsx` | Clerk sign-in page (catch-all for Clerk routing) | Public | Client |

## Protected Routes

All `/schools*` routes require Clerk authentication with minimum role `funder`. See `middleware.ts` for the RBAC logic. Unauthenticated users are redirected to `/login?redirect_url=<path>`.

## Data Sources by Route

- **Static pages** (`/`, `/about`, `/impact`, `/methodology`, `/media`, `/resources`): Content is hardcoded in components. No CMS.
- **`/schools`**: Reads from `data/ea-data.json` and `data/school-locations.json` at build time.
- **`/schools-2026`**: Server component fetches from `DJANGO_API_URL/api/schools-2026/` with `revalidate: 300`.
- **`/data-portal`**: Embeds external URL via iframe. No data fetching.
