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
| `/support` | `app/support/page.tsx` | Mobile app support, troubleshooting, and escalation guidance | Public | Static |
| `/privacy` | `app/privacy/page.tsx` | Mobile app privacy notice and POPIA request channel | Public | Static |
| `/terms` | `app/terms/page.tsx` | Terms governing authorised use of the mobile app | Public | Static |
| `/schools` | `app/schools/page.tsx` | Interactive Mapbox map (140+ schools), EA cards with performance data | Protected | Static (data from `data/`) |
| `/schools-2025` | `app/schools-2025/page.tsx` | Placeholder "coming soon" page | Protected | Static |
| `/schools-2026` | `app/schools-2026/page.tsx` | Live 2026 school data — stats summary + school cards grid | Protected | ISR (300s), fetches from Django API |
| `/data-portal` | `app/data-portal/page.tsx` | Full-page iframe embedding `https://data.zazi-izandi.co.za/` | Public | Static |
| `/login` | `app/login/[[...sign-in]]/page.tsx` | Clerk sign-in page (catch-all for Clerk routing) | Public | Client |
| `/mobile-app` | `app/mobile-app/page.tsx` | Mobile-app reporting entry point; redirects to Sessions | Protected: junior staff, senior staff, admin, ZZ data manager | Dynamic |
| `/mobile-app/sessions` | `app/mobile-app/sessions/page.tsx` | Current-roster school views of app-uploaded teaching sessions | Protected: `mobile.sessions.read` | Dynamic, uncached Django API |

## Protected Routes

Role-based route protection is implemented by the single Next.js 16 `proxy.ts`
boundary. `/schools*`, `/pm*`, `/my-kids*`, `/my-classroom*`, and
`/mobile-app*` retain separate allowlists. Unauthenticated users are redirected
to `/login?redirect_url=<path-and-query>`. The mobile-app layout repeats its
capability check server-side before fetching or rendering report data.

## Data Sources by Route

- **Static pages** (`/`, `/about`, `/impact`, `/methodology`, `/media`, `/resources`, `/support`, `/privacy`, `/terms`): Content is hardcoded in components. No CMS.
- **`/schools`**: Reads from `data/ea-data.json` and `data/school-locations.json` at build time.
- **`/schools-2026`**: Server component fetches from `DJANGO_API_URL/api/schools-2026/` with `revalidate: 300`.
- **`/data-portal`**: Embeds external URL via iframe. No data fetching.
- **`/mobile-app/sessions`**: Server-only `lib/mobile/api.ts` forwards the Clerk
  session token and the internal service secret to Django with `cache: no-store`.
  Django is the authorization and reporting middle layer; the browser never
  receives either credential.
