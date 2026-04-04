# Data & Backend

## Static Data Files (`data/`)

Imported directly in page components at build time — no runtime fetching.

| File | Used By | Contents |
|------|---------|----------|
| `ea-data.json` | `/schools` page | Education Assistant records: school names, grades, EGRA scores, session counts, language, EA names, improvement metrics |
| `school-locations.json` | `/schools` map | School GPS coordinates, enrollment, circuit, performance ratings (high/low), grade levels |
| `school-locations-no-color.json` | — | Alternative without performance color coding |
| `all-sites-coordinates.csv` | — | Coordinate data for all sites |
| `NMB Site Coordinates.csv` | — | Nelson Mandela Bay site coordinates |

**Data filtering:** Done inline at the top of page components (e.g., filtering out EA entries without a school name). No separate data layer.

## Django Backend

A separate Django application handles backend logic, data management, and API serving.

| | |
|---|---|
| **Repo** | `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025` |
| **Hosting** | Render.com (Starter tier) |
| **URL** | Set via `DJANGO_API_URL` env var |
| **Database** | PostgreSQL on Render |

### API Consumption

The Next.js frontend calls the Django API in **one place**:

- **`/schools-2026` page** (`app/schools-2026/page.tsx`)
  - Fetches: `${DJANGO_API_URL}/api/schools-2026/`
  - Server component with ISR: `revalidate: 300` (5-minute cache)
  - Falls back to error UI if the API is unavailable
  - Data includes: school names, EA counts, child counts, session counts, performance metrics

### Render Infrastructure

- Django app on Starter tier with nightly cron job
- Pattern: pre-compute data in cron, serve via API
- PostgreSQL database on Render (connection via `DATABASE_INTERNAL_URL`)

## External Services

| Service | Env Vars | Status |
|---------|----------|--------|
| **Mapbox** | `NEXT_PUBLIC_MAPBOX_TOKEN` | Active — school map on `/schools` |
| **Clerk** | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Active — auth & RBAC |
| **Twilio** | `TWILIO_*` | Configured but not used in frontend |
| **TeampAct** | `TEAMPACT_*` | Backend/analytics only |
| **SurveyCTO** | `SURVEYCTO_*` | Backend only |
| **Google OAuth** | `GOOGLE_CLIENT_*` | Configured but inactive |
| **OpenAI** | `OPENAI_API_KEY` | Backend only |
