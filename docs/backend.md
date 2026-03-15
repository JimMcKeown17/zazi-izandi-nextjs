# Backend Architecture

The Next.js frontend consumes data from a **Django backend** hosted on Render.

## Infrastructure

| Component | Details |
|-----------|---------|
| **Backend** | Django 5.x on Render (Web Service, Starter: 0.5 CPU / 512 MB) |
| **Database** | PostgreSQL on Render (`zazi_izandi_db`) |
| **Cron Job** | Render Cron Job (`nightly_zz_sync_2026`, Standard tier), runs at 02:00 UTC |
| **Frontend** | Next.js 16 on Vercel |
| **Auth** | Clerk (frontend) / Email-based roles (Django admin) |

## Data Flow

```
SurveyCTO / Teampact APIs
        |
        v
Django management commands (nightly cron at 02:00 UTC)
        |
        v
PostgreSQL (zazi_izandi_db)
        |
        v
Django API endpoints (read from pre-computed summary tables)
        |
        v
Next.js server components (fetch + ISR, 5-min revalidation)
```

## Nightly Cron Job

**Service:** `nightly_zz_sync_2026` on Render (Cron Job, Standard tier)
**Schedule:** 02:00 UTC daily
**Repo:** `JimMcKeown17/zazi-izandi-website-main` (main branch)

Commands run sequentially:

```bash
python manage.py sync_teampact_sessions_2026      # Pull sessions from Teampact API
python manage.py sync_assessments_2026             # Pull EGRA assessments
python manage.py sync_assessment_cells_2026        # Pull assessment cell-level data
python manage.py sync_mentor_visits_2026           # Pull mentor visit surveys
python manage.py compute_school_summaries_2026     # Pre-compute school summary + flags
python manage.py backup_2026_to_parquet            # Backup sessions to parquet
python manage.py backup_assessments_2026_to_parquet # Backup assessments to parquet
python manage.py backup_mentor_visits_2026_to_parquet # Backup mentor visits to parquet
```

### Key Management Commands

| Command | Source | Description |
|---------|--------|-------------|
| `sync_teampact_sessions_2026` | Teampact API | Pulls participant attendance records into `sessions_2026` table |
| `sync_assessments_2026` | Teampact API | Pulls EGRA assessment results into `assessments_2026` |
| `sync_assessment_cells_2026` | Teampact API | Pulls individual cell results into `assessment_cells_2026` |
| `sync_mentor_visits_2026` | Teampact API | Pulls mentor visit survey responses into `mentor_visits_2026` |
| `compute_school_summaries_2026` | Local (reads DB) | Pre-computes flag calculations and session stats, writes to `school_summaries_2026`. Must run **after** `sync_teampact_sessions_2026`. |
| `backup_*_to_parquet` | Local (reads DB) | Exports tables to parquet files for the Streamlit data site |

## Key Django Models

### Session Data (2026)
- **`TeampactSession2026`** — Participant-level attendance records from Teampact API. Each row = one participant in one session. Deduplicate by `session_id` for session-level stats. Table: `sessions_2026`.
- **`SchoolSummary2026`** — Pre-computed nightly summary: one row per school with session counts, EA lists, flag results, and coordinates. Table: `school_summaries_2026`. Rebuilt entirely by `compute_school_summaries_2026`.
- **`TeampactSessionComplete`** — Same schema as `TeampactSession2026` but for 2025 data. Frozen/archival.
- **`TeampactSession`** — Legacy 2025 session data (simpler schema).

### Assessment Data
- **`Assessment2026`** — 2026 EGRA baseline assessments from TeamPact surveys.
- **`AssessmentCell2026`** — Individual cell results (letter/word/nonword) per assessment.
- **`EGRAAssessment`** — 2025 EGRA assessment metadata (school, grade, date, assessor).
- **`EGRALearnerScore`** — Individual learner scores per assessment.
- **`TeamPactAssessmentEndline2025`** — 2025 endline assessment results.

### Other
- **`MentorVisit2026`** — Mentor visit tracker responses from TeamPact survey 824.
- **`TAProfile`** — Teaching Assistant profiles (name, school, mentor, grade). Links to `TASession` via FK.
- **`TASession`** — SurveyCTO-sourced session data (2025, separate from Teampact).

## API Endpoints

All endpoints are under `/api/` (configured in `api/urls.py`).

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/schools-2026/` | GET | None | Pre-computed 2026 school summary with session stats and flags. Reads from `school_summaries_2026` table. Used by Next.js `/schools-2026` page. |
| `/api/letter-progress/` | GET | None | Letter progress data per school/TA/group (2025 SurveyCTO data). |
| `/api/sessions/` | GET | None | Raw 2025 session data (TeampactSession). |
| `/api/explore-data/` | GET | Login | HTML table view of EGRA data (admin debugging). |

## Flag Calculations (2026)

Flags are pre-computed nightly by `compute_school_summaries_2026`, not calculated on each API request. The logic is ported from the Streamlit data site.

### Same Letter Group Flag
- Per EA: get the latest session per group, compute `progress_index` (position in the letter sequence)
- **Flagged** if any `progress_index` appears 3+ times across an EA's groups
- Indicates the EA may not be differentiating instruction by group ability

### Moving Too Fast Flag
- Per EA per group (minimum 3 sessions): check consecutive session letter overlap
- **Flagged** if >70% of session transitions have zero letter overlap with the previous session
- Indicates the EA is advancing through letters without adequate review

### Letter Sequence
```
a, e, i, o, u, b, l, m, k, p, s, h, z, n, d, y, f, w, v, x, g, t, q, r, c, j
```

## Authentication (Django)

Django uses email-based authentication with roles:
- **admin** — Full access
- **staff** — Management access
- **manager** — Regional oversight
- **mentor** — TA mentoring
- **funder** — Read-only data access
- **viewer** — Basic read access

The Next.js frontend uses **Clerk** for authentication, with role metadata synced via `publicMetadata.role`. The `/schools-2026` API endpoint does not require authentication (called server-to-server by Next.js).

## Environment Variables

The Next.js app needs `DJANGO_API_URL` in `.env.local` to reach the Django backend:

```
DJANGO_API_URL=https://zazi-izandi-website-main.onrender.com
```
