# ETL & Data Flow

End-to-end documentation of how data moves from external APIs into the PostgreSQL database, gets processed into summary tables, and is served to the Next.js frontend pages.

---

## Overview

```
┌──────────────────────────────┐     ┌──────────────────────────────┐
│     Teampact Platform        │     │     SurveyCTO Platform       │
│  (session attendance,        │     │  (2025 TA sessions via       │
│   assessments, surveys)      │     │   ta_sessions form)          │
└──────────┬───────────────────┘     └──────────┬───────────────────┘
           │                                     │
           │  REST API calls                     │  REST API calls
           │  (nightly cron, 02:00 UTC)          │  (manual / separate cron)
           ▼                                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Django Management Commands                        │
│                                                                      │
│  sync_teampact_sessions_2026    sync_assessments_2026               │
│  sync_assessment_cells_2026     sync_mentor_visits_2026             │
│  compute_school_summaries_2026  fetch_ta_sessions                   │
│  backup_*_to_parquet                                                │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       │  Django ORM writes
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    PostgreSQL (zazi_izandi_db)                        │
│                                                                      │
│  Raw tables:              │  Pre-computed:       │  Backups:          │
│  sessions_2026            │  school_summaries_   │  Parquet files     │
│  assessments_2026         │  2026                │  (for Streamlit    │
│  assessment_cells_2026    │                      │   data site)       │
│  mentor_visits_2026       │                      │                    │
│  ta_sessions              │                      │                    │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       │  Django API endpoints (read-only JSON)
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Next.js Server Components                         │
│                                                                      │
│  /schools-2026  →  fetch(DJANGO_API_URL/api/schools-2026/)          │
│                    ISR: revalidate every 5 minutes                   │
│                                                                      │
│  /schools       →  Static JSON import (ea-data.json)                │
│                    Build-time only, no API calls                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 1. External Data Sources

### Teampact API
- **Base URL:** `https://teampact.co/api/analytics/v1/`
- **Auth:** Bearer token (`TEAMPACT_API_TOKEN`)
- **Endpoints used:**
  - `sessions/attendance` — Paginated participant attendance records (100 per page)
  - `surveys/{id}/responses` — Assessment and survey response data
  - `groups/{id}` — Group/class metadata (used to resolve class names)
- **Surveys:**
  - 815 — Baseline Full Assessment: isiXhosa
  - 816 — Baseline Full Assessment: Afrikaans
  - 817 — Baseline Full Assessment: English
  - 805 — ZZ ECD Baseline 2026
  - 824 — Mentor Visit Tracker

### SurveyCTO API
- **Domain:** `zaziizandi.surveycto.com`
- **Auth:** Username/password (`SURVEYCTO_USERNAME` / `SURVEYCTO_PASSWORD`)
- **Form:** `ta_sessions` — 2025 TA session data (letters worked on, flash cards, board game usage)

---

## 2. Nightly Cron Job

**Service:** `nightly_zz_sync_2026` on Render (Cron Job, Standard tier)
**Schedule:** Daily at 02:00 UTC
**Repo:** `JimMcKeown17/zazi-izandi-website-main` (main branch)

### Execution Order

Commands run sequentially. Order matters — some commands depend on data from earlier ones.

```bash
# Step 1: Pull raw data from Teampact API
python manage.py sync_teampact_sessions_2026      # Sessions → sessions_2026
python manage.py sync_assessments_2026             # Assessments → assessments_2026
python manage.py sync_assessment_cells_2026        # Cell details → assessment_cells_2026 (depends on Step 1b)
python manage.py sync_mentor_visits_2026           # Mentor visits → mentor_visits_2026

# Step 2: Pre-compute aggregated data
python manage.py compute_school_summaries_2026     # Summaries + flags → school_summaries_2026 (depends on Step 1a)

# Step 3: Backup to parquet for Streamlit data site
python manage.py backup_2026_to_parquet
python manage.py backup_assessments_2026_to_parquet
python manage.py backup_mentor_visits_2026_to_parquet
```

---

## 3. Management Commands in Detail

### sync_teampact_sessions_2026

| | |
|---|---|
| **Source** | Teampact API `sessions/attendance` |
| **Destination** | `sessions_2026` table (`TeampactSession2026` model) |
| **Dedup key** | `attendance_id` (skips if exists) |
| **Filtering** | Only saves sessions where `session_started_at` falls within 2026 |
| **Key logic** | Flattens deeply nested API response: session → participant, user, class, program, organization. Parses datetime strings, handles empty strings in numeric fields. Stops early after 2 consecutive pages with no 2026 records. Rate-limit retry on 429 (10s backoff). |

Each row in `sessions_2026` is a **participant attendance record** — one row per participant per session. A single session with 8 children produces 8 rows sharing the same `session_id`. To count unique sessions, always deduplicate by `session_id`.

**Key fields:** `session_id`, `participant_name`, `user_name` (EA), `program_name` (school), `class_name` (group), `session_started_at`, `letters_taught`, `latitude`, `longitude`

### sync_assessments_2026

| | |
|---|---|
| **Source** | Teampact API `surveys/{id}/responses` (surveys 815, 816, 817, 805) |
| **Destination** | `assessments_2026` table (`Assessment2026` model) |
| **Dedup key** | `response_id` |
| **Key logic** | NMB surveys (815/816/817): resolves `group_id` → class/program via `/groups/{id}` API. Extracts grade from class name. ECD survey (805): parses learner name/grade/gender from free-text answers. Parses EGRA sub-test scores (letters, nonwords, words). Batch saves every 50 responses. |

### sync_assessment_cells_2026

| | |
|---|---|
| **Source** | Teampact API (same surveys as above) |
| **Destination** | `assessment_cells_2026` table (`AssessmentCell2026` model) |
| **Depends on** | `sync_assessments_2026` must run first |
| **Key logic** | Creates cell-level detail (individual letter/word results) for assessments that exist but don't have cells yet. Memory-efficient: fetches one page at a time, flushes every 10 responses (~1,800 cells). |

### sync_mentor_visits_2026

| | |
|---|---|
| **Source** | Teampact API `surveys/824/responses` |
| **Destination** | `mentor_visits_2026` table (`MentorVisit2026` model) |
| **Dedup key** | `response_id` |
| **Key logic** | Maps survey question labels + IDs to observation fields (grouping, letter tracker, learner engagement, session quality, etc). |

### compute_school_summaries_2026

| | |
|---|---|
| **Source** | `sessions_2026` table (local DB read) |
| **Destination** | `school_summaries_2026` table (`SchoolSummary2026` model) |
| **Depends on** | `sync_teampact_sessions_2026` must run first |
| **Key logic** | Single bulk query → pandas DataFrame → in-memory aggregation. Computes per-school: EA list, child count, group count, session counts (week/month/total), avg dosage, flag calculations. Atomic replace: deletes all existing rows, bulk-creates new ones. |

**Flag calculations (see [backend.md](./backend.md) for full details):**
- **Same Letter Group:** Per EA, if 3+ groups are at the same letter progress index
- **Moving Too Fast:** Per EA per group, if >70% of session transitions have zero letter overlap

### fetch_ta_sessions (2025, SurveyCTO)

| | |
|---|---|
| **Source** | SurveyCTO API (`ta_sessions` form) |
| **Destination** | `ta_sessions` table (`TASession` model) |
| **Dedup key** | `key` (update_or_create) |
| **Key logic** | Fetches ~250 records per batch. Auto-links to `TAProfile` via `ta_name_name`. |

### Backup Commands

All three backup commands (`backup_2026_to_parquet`, `backup_assessments_2026_to_parquet`, `backup_mentor_visits_2026_to_parquet`) follow the same pattern:

1. Read entire table into a pandas DataFrame
2. Write to `{ZZ_DATA_SITE_PATH}/data/parquet/raw/` as a current snapshot
3. Write a dated copy to `{ZZ_DATA_SITE_PATH}/data/parquet/2026/`
4. Rotate dated snapshots older than 7 days

These parquet files are consumed by the **Streamlit data site** for interactive dashboards and flag analysis.

---

## 4. Database Tables

### Raw Data (populated by sync commands)

| Table | Model | Source | Rows represent |
|-------|-------|--------|----------------|
| `sessions_2026` | `TeampactSession2026` | Teampact API | One participant attendance per session |
| `assessments_2026` | `Assessment2026` | Teampact API | One learner EGRA assessment |
| `assessment_cells_2026` | `AssessmentCell2026` | Teampact API | One letter/word/nonword attempt per assessment |
| `mentor_visits_2026` | `MentorVisit2026` | Teampact API | One mentor visit observation |
| `ta_sessions` | `TASession` | SurveyCTO | One TA session (2025, letters worked on) |

### Pre-computed (populated by compute commands)

| Table | Model | Source | Rows represent |
|-------|-------|--------|----------------|
| `school_summaries_2026` | `SchoolSummary2026` | `sessions_2026` | One school summary with stats + flags |

### Static Reference Data

| File | Location | Used by |
|------|----------|---------|
| `ea-data.json` | `data/ea-data.json` (Next.js) | `/schools` page (2025 EA performance) |
| `school-locations.json` | `data/school-locations.json` (Next.js) | `/schools` page map + coordinate fallback |

---

## 5. API Endpoints

All Django endpoints are under `/api/` (see `api/urls.py`).

| Endpoint | What it reads | Response time | Used by |
|----------|---------------|---------------|---------|
| `GET /api/schools-2026/` | `school_summaries_2026` table | ~50ms (pre-computed) | Next.js `/schools-2026` page |
| `GET /api/letter-progress/` | `TAProfile` + `TASession` tables | Slow (N+1 queries) | Legacy |
| `GET /api/sessions/` | `teampact_sessions` table | Varies | Legacy |

---

## 6. Next.js Pages & Data Consumption

### `/schools-2026` — Live 2026 Data

```
Django API (/api/schools-2026/)
    │
    │  fetch() with { next: { revalidate: 300 } }
    ▼
page.tsx (server component)
    │
    ├── StatsSummary2026        ← summary.total_schools, total_eas, etc.
    │
    └── SchoolCardsGrid2026     ← schools[] array (client component)
            │
            ├── Search input     ← client-side text filter
            ├── Type filter       ← "All" / "Primary School" / "ECD"
            ├── Dosage filter     ← "On Track" / "Needs Attention" / "Low Dosage"
            │
            └── SchoolCard2026[]  ← one per school
                    │
                    ├── Dosage color coding (green/yellow/red by avg_sessions_per_child_per_week)
                    ├── Session stats (this week / this month)
                    ├── Children, groups, EAs
                    └── Flag badges (Same Letter Group, Moving Too Fast)
```

**Caching:** ISR with 5-minute revalidation. First visitor after 5 minutes triggers a background re-render; stale page is served until the new one is ready.

**Error state:** If the Django API is unreachable (Render cold start, deploy), the page shows a "Data Unavailable" message.

### `/schools` — Static 2025 Data

```
ea-data.json (build-time import)
school-locations.json (build-time import)
    │
    ▼
page.tsx (server component, static)
    │
    ├── Stats grid              ← computed inline from eaData array
    ├── SchoolMap               ← schoolLocations[] (Mapbox, client component)
    │
    └── EACard[]                ← one per EA entry
            │
            ├── Improvement color coding (green/yellow/red by EGRA gain)
            ├── Baseline / Endline / Gain scores
            ├── Session count, assessment count
            └── Flag badges (Moving Too Fast, Same Letter Groups)
```

**No API calls.** Data is bundled into the build from static JSON files. To update, regenerate the JSON and redeploy.

### `/schools-2025` — Placeholder

Static "coming soon" page with no data.

---

## 7. Data Freshness Timeline

```
02:00 UTC  Cron starts
           ├── sync_teampact_sessions_2026 (~5-10 min)
           ├── sync_assessments_2026 (~2-5 min)
           ├── sync_assessment_cells_2026 (~5-10 min)
           ├── sync_mentor_visits_2026 (~1-2 min)
           ├── compute_school_summaries_2026 (~1-2 min)
           └── backup_*_to_parquet (~1-2 min)
~02:25 UTC Cron finishes, DB is up to date

           Next.js ISR cache (5 minutes)
           └── First visitor after cron triggers re-render
               └── Page shows data from ~02:25 UTC snapshot

           Throughout the day:
           └── Page continues to serve the morning snapshot
               (ISR revalidation reads the same summary table
                until the next cron run)
```

The `/schools-2026` page shows data that is **at most ~24 hours old** (from the last cron run). Within a day, the ISR cache refreshes every 5 minutes, but the underlying data doesn't change until the next nightly sync.
