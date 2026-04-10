# EA My Kids — Phase 0: Backend Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the Django backend and Next.js service-auth layer so that Phase 1 (EA "My Kids" frontend) can be built against stable, ID-scoped, secure endpoints.

**Architecture:** Phase 0 is a cross-codebase prep phase. It spans the Django project at `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025` (models, compute command, endpoints, middleware) and the Next.js project at `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs` (shared-secret helper, 7 callsite refactors). It ships as a unit so the Django middleware and updated fetchers go live together.

**Tech Stack:** Django 5, Python 3.13, Postgres, Render hosting (Django). Next.js 16 (App Router), TypeScript, Clerk, Render hosting (Next.js).

**Related spec:** `docs/superpowers/specs/2026-04-09-ea-my-kids-design.md` (Sections 1, 3, and Phase 0 in Section 8).

**Phases not covered by this plan:** Phase 1A (Auth & Routing), 1B (Overview Page), 1C (Group Detail), 1D (PM View). Each will be written as a separate plan after Phase 0 ships and is verified.

---

## Scope and Ordering

Phase 0 is organized into five groups:

1. **Service auth setup** (Tasks 1–6) — shared secret between Next.js and Django. Must ship atomically.
2. **Model changes** (Tasks 7–9) — add `ea_user_id` and `class_id` to `GroupSummary2026`.
3. **Compute command updates** (Tasks 10–11) — populate new fields during nightly compute.
4. **New endpoints** (Tasks 12–16) — `/api/ea/<user_id>/` and `/api/ea/<user_id>/groups/<class_id>/`.
5. **Data validation and deploy** (Tasks 17–19) — run checks, deploy, verify.

**Important:** Group 1 must ship atomically (middleware + fetcher refactor together). Groups 2–5 can ship incrementally after that, but they also depend on Group 1 being live.

---

## File Structure

### Next.js project (`/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs`)

- **Create:** `lib/django-fetch.ts` — shared-secret helper wrapping `fetch`
- **Modify:** `lib/pm/api.ts` — refactor all Django `fetch` calls to use the helper
- **Modify:** `app/schools-2026/page.tsx` — refactor direct Django fetch
- **Modify:** `app/api/letter-alignment/route.ts` — refactor proxy fetch
- **Modify:** `app/api/letter-alignment/unmatched/route.ts` — refactor proxy fetch
- **Modify:** `app/api/mentor-visits-summary/route.ts` — refactor proxy fetch
- **Modify:** `app/api/assessments-summary/route.ts` — refactor proxy fetch
- **Modify:** `app/api/flag-evidence/route.ts` — refactor proxy fetch
- **Modify:** `.env.example` — document `INTERNAL_API_SECRET`
- **Modify:** `.env.local` — add `INTERNAL_API_SECRET` for local dev

### Django project (`/Users/jimmckeown/Development/Zazi_iZandi_Website_2025`)

- **Create:** `api/middleware.py` — `InternalAuthMiddleware` rejecting unauthenticated `/api/*` requests
- **Modify:** `config/settings/base.py` — register new middleware, add `INTERNAL_API_SECRET` setting
- **Create:** `api/migrations/0038_add_ea_user_id_and_class_id_to_groupsummary2026.py` — schema migration
- **Modify:** `api/models.py` — add `ea_user_id` and `class_id` fields to `GroupSummary2026`
- **Modify:** `api/management/commands/compute_group_summaries_2026.py` — populate new fields
- **Create:** `api/ea_mastery.py` — helper that aggregates group-level letter mastery from `ChildLetterAlignment2026` + session letter counts
- **Modify:** `api/views.py` — add `ea_detail_overview` and `ea_group_detail` view functions
- **Modify:** `api/urls.py` — register new URL routes
- **Create:** `api/management/commands/validate_ea_data_2026.py` — data validation checks command

---

## Group 1: Service Auth Setup (Tasks 1–6)

### Task 1: Generate the shared secret and document it

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/.env.example`
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/.env.local`

- [ ] **Step 1: Generate a secret**

Run:
```bash
openssl rand -hex 32
```

Expected: a 64-character hex string like `3f7a9c...e8b4`. Save this — you'll use it in Step 2 and Step 3.

- [ ] **Step 2: Add the secret to local `.env.local`**

Add this line to `.env.local` (replace with the value from Step 1):
```
INTERNAL_API_SECRET=<paste_value_from_step_1>
```

- [ ] **Step 3: Add the secret to Django's local env**

In the Django project at `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025`, check whether there's an `.env` or `.env.local` file. If it exists, add:
```
INTERNAL_API_SECRET=<same_value_from_step_1>
```

If there's no env file pattern for Django, export it in the shell you'll use to run `manage.py runserver`:
```bash
export INTERNAL_API_SECRET=<same_value_from_step_1>
```

Both sides MUST use the same secret value.

- [ ] **Step 4: Document the env var in `.env.example`**

Open `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/.env.example` and add this line (anywhere near `DJANGO_API_URL`):
```
INTERNAL_API_SECRET=<generate_with_openssl_rand_hex_32>
```

- [ ] **Step 5: Commit the `.env.example` change**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs
git add .env.example
git commit -m "chore: document INTERNAL_API_SECRET env var"
```

**Note:** `.env.local` is gitignored — do not commit it.

---

### Task 2: Create the `lib/django-fetch.ts` helper

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/lib/django-fetch.ts`

- [ ] **Step 1: Create the helper file**

Create `lib/django-fetch.ts` with the following content:

```typescript
/**
 * Server-side helper for calling the Django backend.
 *
 * Always injects the X-Internal-Auth shared-secret header so that the
 * Django InternalAuthMiddleware accepts the request. Never use raw
 * `fetch` to call Django — this helper is the only sanctioned path.
 *
 * Usage:
 *   const res = await djangoFetch("/api/schools-2026/", { next: { revalidate: 300 } });
 *   if (!res.ok) { ... }
 *   const data = await res.json();
 */
export async function djangoFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const baseUrl = process.env.DJANGO_API_URL;
  if (!baseUrl) {
    throw new Error("DJANGO_API_URL is not set");
  }

  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error(
      "INTERNAL_API_SECRET is not set — Django calls will be rejected"
    );
  }

  // Ensure the path starts with "/"
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;

  const headers = new Headers(init?.headers);
  headers.set("X-Internal-Auth", secret);

  return fetch(url, { ...init, headers });
}
```

- [ ] **Step 2: Verify the file compiles**

Run:
```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs
npx tsc --noEmit lib/django-fetch.ts
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add lib/django-fetch.ts
git commit -m "feat: add djangoFetch helper with shared-secret auth"
```

---

### Task 3: Create the Django `InternalAuthMiddleware`

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/middleware.py`

- [ ] **Step 1: Create the middleware file**

Create `api/middleware.py` with the following content:

```python
"""
Internal auth middleware.

Rejects any request to /api/* paths that doesn't carry a valid
X-Internal-Auth header matching settings.INTERNAL_API_SECRET.

This is NOT user-level auth — it is a service-level shared secret
between the Next.js frontend and Django backend. The Next.js layer
is the sole authorized caller; it handles user-level auth via Clerk
before forwarding requests here.
"""
from django.conf import settings
from django.http import JsonResponse


class InternalAuthMiddleware:
    """
    Require the X-Internal-Auth header on all /api/* requests.

    Paths not starting with /api/ are passed through unchanged (admin,
    auth views, etc. remain accessible via Django's own auth).
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.expected_secret = getattr(settings, "INTERNAL_API_SECRET", None)
        if not self.expected_secret:
            # Fail loud in logs at startup — don't let a missing secret
            # silently disable auth.
            import logging
            logging.getLogger(__name__).error(
                "INTERNAL_API_SECRET is not set — all /api/* requests will be rejected"
            )

    def __call__(self, request):
        if request.path.startswith("/api/"):
            provided = request.headers.get("X-Internal-Auth")
            if not self.expected_secret or provided != self.expected_secret:
                return JsonResponse(
                    {"error": "unauthorized"}, status=401
                )
        return self.get_response(request)
```

- [ ] **Step 2: Verify the file is syntactically valid**

Run:
```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
source venv/bin/activate
python -c "import ast; ast.parse(open('api/middleware.py').read()); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit (Django repo)**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
git add api/middleware.py
git commit -m "feat(api): add InternalAuthMiddleware for service auth"
```

---

### Task 4: Register the middleware in Django settings

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/config/settings/base.py`

- [ ] **Step 1: Read the current MIDDLEWARE list**

Open `config/settings/base.py`. Find the `MIDDLEWARE` list (around line 63). It currently looks like:

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]
```

- [ ] **Step 2: Add the InternalAuthMiddleware**

Insert `'api.middleware.InternalAuthMiddleware',` immediately after `'django.middleware.security.SecurityMiddleware',`. The list should become:

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'api.middleware.InternalAuthMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]
```

- [ ] **Step 3: Add the `INTERNAL_API_SECRET` setting**

At the bottom of `config/settings/base.py` (or near any other `os.environ.get` lookups), add:

```python
# Shared secret for server-to-server auth with the Next.js frontend.
# Must match INTERNAL_API_SECRET on the Next.js side. See api/middleware.py.
INTERNAL_API_SECRET = os.environ.get("INTERNAL_API_SECRET", "")
```

If `os` is not imported at the top of the file, add `import os` at the top.

- [ ] **Step 4: Verify Django can still start**

Run:
```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
source venv/bin/activate
python manage.py check
```

Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 5: Test the middleware locally — rejection path**

Start the dev server in one shell:
```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
source venv/bin/activate
python manage.py runserver 8000
```

In another shell, hit an API endpoint WITHOUT the header:
```bash
curl -i http://localhost:8000/api/programme-overview/
```

Expected: `HTTP/1.1 401 Unauthorized` and body `{"error": "unauthorized"}`.

- [ ] **Step 6: Test the middleware locally — success path**

In the same second shell, hit the same endpoint WITH the header (replace the secret with your actual value):
```bash
curl -i -H "X-Internal-Auth: <your_secret_value>" http://localhost:8000/api/programme-overview/
```

Expected: `HTTP/1.1 200 OK` and a JSON response body.

Stop the dev server (Ctrl+C).

- [ ] **Step 7: Commit (Django repo)**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
git add config/settings/base.py
git commit -m "feat(config): register InternalAuthMiddleware and INTERNAL_API_SECRET setting"
```

---

### Task 5: Refactor all 7 Next.js → Django callsites to use `djangoFetch`

**Files:**
- Modify: `lib/pm/api.ts` (multiple fetchers)
- Modify: `app/schools-2026/page.tsx`
- Modify: `app/api/letter-alignment/route.ts`
- Modify: `app/api/letter-alignment/unmatched/route.ts`
- Modify: `app/api/mentor-visits-summary/route.ts`
- Modify: `app/api/assessments-summary/route.ts`
- Modify: `app/api/flag-evidence/route.ts`

**Refactor pattern:** Replace the existing pattern
```typescript
const apiUrl = process.env.DJANGO_API_URL;
if (!apiUrl) { /* error handling */ }
const res = await fetch(`${apiUrl}/api/some-endpoint/`, { next: { revalidate: 300 } });
```
with
```typescript
import { djangoFetch } from "@/lib/django-fetch";
// ...
const res = await djangoFetch("/api/some-endpoint/", { next: { revalidate: 300 } });
```

`djangoFetch` throws if `DJANGO_API_URL` or `INTERNAL_API_SECRET` is missing, so the existing `if (!apiUrl)` branches can be removed and replaced with `try/catch` around the call. Keep existing 404/5xx handling via `res.ok` checks as-is.

- [ ] **Step 1: Refactor `lib/pm/api.ts`**

Open `lib/pm/api.ts`. For every function that reads `process.env.DJANGO_API_URL` and calls `fetch(...)`, apply the refactor pattern above. Example conversion for `getProgrammeOverview` (around lines 83–103):

Before:
```typescript
const apiUrl = process.env.DJANGO_API_URL;
if (!apiUrl) {
  console.warn("[pm/api] DJANGO_API_URL not set — data unavailable");
  return { data: MOCK_OVERVIEW, isLive: false };
}
try {
  const res = await fetch(
    `${apiUrl}/api/programme-overview/`,
    { next: { revalidate: 300 } }
  );
  // ...
} catch (error) {
  console.error("[pm/api] Failed to fetch programme overview:", error);
  return { data: MOCK_OVERVIEW, isLive: false };
}
```

After:
```typescript
import { djangoFetch } from "@/lib/django-fetch";
// ... (add the import at the top of the file)

try {
  const res = await djangoFetch(
    "/api/programme-overview/",
    { next: { revalidate: 300 } }
  );
  // ...
} catch (error) {
  console.error("[pm/api] Failed to fetch programme overview:", error);
  return { data: MOCK_OVERVIEW, isLive: false };
}
```

Apply this refactor to **every** fetcher in `lib/pm/api.ts`. Leave the mock-fallback behavior intact — if `djangoFetch` throws (missing env vars or network error), the `catch` block still returns mock data.

- [ ] **Step 2: Refactor `app/schools-2026/page.tsx`**

Open `app/schools-2026/page.tsx` and apply the same refactor to `getSchools2026Data` (around lines 23–28 and wherever `fetch` is called).

- [ ] **Step 3: Refactor each proxy route**

For each of these 5 files, apply the refactor:
- `app/api/letter-alignment/route.ts`
- `app/api/letter-alignment/unmatched/route.ts`
- `app/api/mentor-visits-summary/route.ts`
- `app/api/assessments-summary/route.ts`
- `app/api/flag-evidence/route.ts`

Each of these is a short Next.js route handler that currently does:
```typescript
const apiUrl = process.env.DJANGO_API_URL;
if (!apiUrl) return NextResponse.json({ error: "..." }, { status: 503 });
try {
  const res = await fetch(`${apiUrl}/api/some-path/`);
  // ...
} catch (e) { ... }
```

Convert to:
```typescript
import { djangoFetch } from "@/lib/django-fetch";
// ...
try {
  const res = await djangoFetch("/api/some-path/");
  // ...
} catch (e) {
  return NextResponse.json({ error: "backend unreachable" }, { status: 502 });
}
```

- [ ] **Step 4: Verify Next.js still compiles**

Run:
```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs
npm run lint
npx tsc --noEmit
```

Expected: both commands exit 0 with no errors.

- [ ] **Step 5: Verify locally against Django**

Start Django locally (in one shell):
```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
source venv/bin/activate
python manage.py runserver 8000
```

Start Next.js locally (in another shell), ensuring `INTERNAL_API_SECRET` and `DJANGO_API_URL=http://localhost:8000` are both set in `.env.local`:
```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs
npm run dev
```

In a browser (or `curl`), hit `http://localhost:3000/pm` as an authenticated user. Verify the PM dashboard loads with real data (not the mock fallback banner).

Also hit `http://localhost:3000/schools-2026`. Verify it loads with real data.

Stop both servers (Ctrl+C).

- [ ] **Step 6: Commit (Next.js repo)**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs
git add lib/pm/api.ts app/schools-2026/page.tsx app/api/letter-alignment/ app/api/mentor-visits-summary/route.ts app/api/assessments-summary/route.ts app/api/flag-evidence/route.ts
git commit -m "refactor: route all Django calls through djangoFetch helper"
```

---

### Task 6: Deploy Group 1 atomically and smoke-test

**Files:** No new code. This task is an operational checkpoint.

- [ ] **Step 1: Set `INTERNAL_API_SECRET` on both Render services**

In the Render dashboard:
1. Navigate to the Django service → Environment → add `INTERNAL_API_SECRET` with the value from Task 1 Step 1
2. Navigate to the Next.js service → Environment → add `INTERNAL_API_SECRET` with the **same value**
3. Do NOT trigger a redeploy yet — just save the env var on both

- [ ] **Step 2: Push both repos and deploy**

```bash
# Next.js repo
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs
git push

# Django repo
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
git push
```

Both services will rebuild automatically on Render. Wait for both deploys to finish (check the Render dashboard — both should be green).

- [ ] **Step 3: Smoke-test PM pages**

In a browser, visit (as an authenticated user):
- `https://<your-next-domain>/pm` → should load overview with real data
- `https://<your-next-domain>/pm/schools` → should load schools list
- `https://<your-next-domain>/pm/sessions` → should load sessions activity
- `https://<your-next-domain>/pm/education-assistants` → should load EA scatter plot
- `https://<your-next-domain>/schools-2026` → should load with real data

Expected: all pages load successfully. If any show the "mock data" banner or 502/503 errors, stop and diagnose before continuing.

- [ ] **Step 4: Verify Django rejects unauthenticated requests**

From a terminal:
```bash
curl -i https://<your-django-domain>/api/programme-overview/
```

Expected: `HTTP/1.1 401 Unauthorized` and body `{"error": "unauthorized"}`.

Group 1 is complete. The service-auth boundary is live in production. ✅

---

## Group 2: Model Changes (Tasks 7–9)

### Task 7: Add `ea_user_id` and `class_id` fields to `GroupSummary2026`

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/models.py`

- [ ] **Step 1: Locate `GroupSummary2026`**

Open `api/models.py`. Find `class GroupSummary2026(models.Model):` (around line 1035).

- [ ] **Step 2: Add the new fields**

After the `ea_name = models.CharField(...)` field (around line 1043), add these two fields:

```python
    # EA identity (Phase 0 — replaces name-based scoping with ID-based)
    ea_user_id = models.BigIntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text="TeamPact user_id of the primary EA for this group (from TeampactSession2026.user_id). Authoritative scoping key."
    )

    # Group identity (Phase 0 — stable URL-safe key)
    class_id = models.BigIntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text="TeamPact class_id for this group. Used as the URL parameter in /my-kids/groups/[class_id]."
    )
```

- [ ] **Step 3: Verify the model change is syntactically valid**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
source venv/bin/activate
python manage.py check
```

Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 4: Commit (Django repo)**

```bash
git add api/models.py
git commit -m "feat(models): add ea_user_id and class_id to GroupSummary2026"
```

---

### Task 8: Generate and run the migration

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/migrations/0038_add_ea_user_id_and_class_id_to_groupsummary2026.py`

- [ ] **Step 1: Generate the migration**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
source venv/bin/activate
python manage.py makemigrations api --name add_ea_user_id_and_class_id_to_groupsummary2026
```

Expected output:
```
Migrations for 'api':
  api/migrations/0038_add_ea_user_id_and_class_id_to_groupsummary2026.py
    - Add field ea_user_id to groupsummary2026
    - Add field class_id to groupsummary2026
```

- [ ] **Step 2: Inspect the generated migration**

Open `api/migrations/0038_add_ea_user_id_and_class_id_to_groupsummary2026.py`. Verify it only contains `AddField` operations for `ea_user_id` and `class_id`. No other changes should be present.

- [ ] **Step 3: Apply the migration locally**

```bash
python manage.py migrate api
```

Expected:
```
Operations to perform:
  Apply all migrations: api
Running migrations:
  Applying api.0038_add_ea_user_id_and_class_id_to_groupsummary2026... OK
```

- [ ] **Step 4: Verify the columns were added**

```bash
python manage.py shell -c "from api.models import GroupSummary2026; print([f.name for f in GroupSummary2026._meta.get_fields() if f.name in ('ea_user_id', 'class_id')])"
```

Expected: `['ea_user_id', 'class_id']`

- [ ] **Step 5: Commit (Django repo)**

```bash
git add api/migrations/0038_add_ea_user_id_and_class_id_to_groupsummary2026.py
git commit -m "feat(migrations): add ea_user_id and class_id to GroupSummary2026"
```

---

### Task 9: Update `compute_group_summaries_2026` to populate the new fields

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/management/commands/compute_group_summaries_2026.py`

- [ ] **Step 1: Read the current EA detection logic**

Open `api/management/commands/compute_group_summaries_2026.py`. Find the section around lines 289–295 where `ea_name` is computed:

```python
# EA: who has the most sessions for this group
ea_name = ''
if not group_sessions.empty and 'user_name' in group_sessions.columns:
    name_counts = group_sessions['user_name'].value_counts()
    if not name_counts.empty:
        ea_name = name_counts.index[0]
```

- [ ] **Step 2: Add `ea_user_id` and `class_id` derivation**

Immediately after the `ea_name` computation, add this block:

```python
# EA user_id: the TeamPact user_id of the same primary EA (for ID-based scoping)
ea_user_id = None
if not group_sessions.empty and 'user_id' in group_sessions.columns:
    # Filter to the primary EA's rows, then take the most common user_id
    # (handles edge case where the same user_name maps to different user_ids)
    if ea_name:
        primary_rows = group_sessions[group_sessions['user_name'] == ea_name]
        if not primary_rows.empty:
            id_counts = primary_rows['user_id'].dropna().astype('Int64').value_counts()
            if not id_counts.empty:
                ea_user_id = int(id_counts.index[0])

# class_id: the TeamPact class_id for this group (stable URL key)
class_id = None
if not group_sessions.empty and 'class_id' in group_sessions.columns:
    class_id_counts = group_sessions['class_id'].dropna().astype('Int64').value_counts()
    if not class_id_counts.empty:
        class_id = int(class_id_counts.index[0])
```

- [ ] **Step 3: Pass the new fields into the `GroupSummary2026(...)` constructor**

Find the `GroupSummary2026(...)` instantiation (around lines 385–395). Add `ea_user_id=ea_user_id,` and `class_id=class_id,` to the kwargs. The resulting block should include:

```python
summaries.append(GroupSummary2026(
    program_name=program,
    class_name=class_name,
    ea_name=ea_name,
    ea_user_id=ea_user_id,        # NEW
    class_id=class_id,             # NEW
    language=language,
    grade=grade,
    phase=phase,
    blending_start_date=blending_start,
    children_count=len(children),
    children_names=children,
    current_letter=current_letter,
    # ... rest of existing kwargs ...
))
```

- [ ] **Step 4: Verify the command parses**

```bash
python -c "import ast; ast.parse(open('api/management/commands/compute_group_summaries_2026.py').read()); print('OK')"
```

Expected: `OK`

- [ ] **Step 5: Run the command locally**

```bash
source venv/bin/activate
DJANGO_ENV=production python manage.py compute_group_summaries_2026
```

Expected: runs to completion with the usual summary output (e.g., "Computed N group summaries...").

- [ ] **Step 6: Verify the new fields are populated**

```bash
python manage.py shell -c "
from api.models import GroupSummary2026
qs = GroupSummary2026.objects.exclude(ea_user_id__isnull=True)
print(f'Rows with ea_user_id: {qs.count()} / {GroupSummary2026.objects.count()}')
qs2 = GroupSummary2026.objects.exclude(class_id__isnull=True)
print(f'Rows with class_id: {qs2.count()} / {GroupSummary2026.objects.count()}')
sample = GroupSummary2026.objects.exclude(ea_user_id__isnull=True).first()
if sample:
    print(f'Sample: ea_name={sample.ea_name} ea_user_id={sample.ea_user_id} class_id={sample.class_id}')
"
```

Expected: most rows should have `ea_user_id` and `class_id` populated. A sample row should show the EA name plus matching IDs.

If some rows have null `ea_user_id` or `class_id`, that is **acceptable** — it means those groups only have sessions where `user_id` or `class_id` was missing in the source data. Record the count in your notes; Phase 0 Task 17 (data validation) will surface these for investigation.

- [ ] **Step 7: Commit (Django repo)**

```bash
git add api/management/commands/compute_group_summaries_2026.py
git commit -m "feat(compute): populate ea_user_id and class_id in group summaries"
```

---

## Group 3: Letter Mastery Aggregation (Tasks 10–11)

### Task 10: Create the letter mastery aggregation helper

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/ea_mastery.py`

**Important data notes (verified against models.py and sync code):**
- `TeampactSession2026` is **one row per participant per session** (not one row per session). Each row has `session_id`, `participant_id`, `attendance_status`, `class_id`, and session-level fields like `letters_taught` that repeat across rows with the same `session_id`. To count unique sessions taught, deduplicate on `session_id`.
- `TeampactSession2026.letters_taught` is a **CSV string** (e.g., `"a,e,i"`), not a list/JSON. Parse with `.split(",")`.
- `ChildLetterAlignment2026` has **no `class_id` field**. It uses `program_name + class_name` as the composite key. Query using both fields.
- `ChildLetterAlignment2026.letters_mastered` is a JSONField containing a list of letter strings.

- [ ] **Step 1: Create the helper module**

Create `api/ea_mastery.py` with the following content:

```python
"""
Group-level letter mastery aggregation for the EA My Kids page.

Combines per-child mastery data from ChildLetterAlignment2026 with
per-letter session counts from TeampactSession2026 to produce a single
array describing the "average letter tracker" for a group.

Used by the /api/ea/<user_id>/groups/<class_id>/ endpoint.
"""
from collections import Counter
from typing import List, Dict, Any

from api.models import ChildLetterAlignment2026, TeampactSession2026, GroupSummary2026
from api.letter_constants import get_sequence, DEFAULT_LANGUAGE


def compute_group_letter_mastery(
    class_id: int,
    group_summary: GroupSummary2026,
) -> List[Dict[str, Any]]:
    """
    Return a list of per-letter mastery dicts for the given group.

    Each entry has:
      - letter: the letter (lowercase)
      - children_mastered: number of children in the group who have mastered this letter
      - children_total: total children in the group
      - mastery_pct: int 0..100
      - sessions_taught: number of unique sessions (by session_id) where this letter was taught

    The list is ordered by the group's language letter sequence, and
    includes only letters that have either mastery data OR session data
    (letters with neither are omitted).

    If the group has no ChildLetterAlignment2026 rows (i.e., no assessments
    yet), mastery fields are reported as 0 but sessions_taught still reflects
    real data. Callers can detect the "no assessment data" state by checking
    whether any entry has mastery_pct > 0 or children_mastered > 0.
    """
    language = group_summary.language or DEFAULT_LANGUAGE
    letter_sequence = get_sequence(language)
    children_total = group_summary.children_count or 0

    # --- Per-letter session counts (deduplicated by session_id) ---
    # TeampactSession2026 has one row per participant per session, so the same
    # letters_taught string appears on many rows with the same session_id.
    # Query distinct (session_id, letters_taught) pairs to count each session once.
    session_rows = (
        TeampactSession2026.objects
        .filter(class_id=class_id)
        .exclude(letters_taught__isnull=True)
        .exclude(letters_taught__exact="")
        .values('session_id', 'letters_taught')
        .distinct()
    )
    letter_session_counts: Counter = Counter()
    for row in session_rows:
        csv = row.get('letters_taught') or ""
        letters = [l.strip().lower() for l in csv.split(",") if l.strip()]
        for letter in letters:
            letter_session_counts[letter] += 1

    # --- Per-letter mastery counts (how many children mastered each letter) ---
    # ChildLetterAlignment2026 has no class_id; use program_name + class_name.
    alignment_qs = ChildLetterAlignment2026.objects.filter(
        program_name=group_summary.program_name,
        class_name=group_summary.class_name,
    )
    letter_mastery_counts: Counter = Counter()
    for row in alignment_qs.only("letters_mastered"):
        mastered = row.letters_mastered or []
        if isinstance(mastered, str):
            # Defensive: handle unexpected string storage
            mastered = [l.strip() for l in mastered.split(",") if l.strip()]
        for letter in mastered:
            letter_mastery_counts[letter.lower()] += 1

    # --- Build the result in letter_sequence order ---
    result: List[Dict[str, Any]] = []
    for letter in letter_sequence:
        mastered = letter_mastery_counts.get(letter.lower(), 0)
        taught = letter_session_counts.get(letter.lower(), 0)
        if mastered == 0 and taught == 0:
            continue  # Omit letters with neither data source
        mastery_pct = (
            round((mastered / children_total) * 100) if children_total else 0
        )
        result.append({
            "letter": letter.lower(),
            "children_mastered": mastered,
            "children_total": children_total,
            "mastery_pct": mastery_pct,
            "sessions_taught": taught,
        })

    return result
```

- [ ] **Step 2: Verify the file parses**

```bash
python -c "import ast; ast.parse(open('api/ea_mastery.py').read()); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Spot-check `ChildLetterAlignment2026` fields (sanity)**

```bash
source venv/bin/activate
python manage.py shell -c "
from api.models import ChildLetterAlignment2026
fields = set(f.name for f in ChildLetterAlignment2026._meta.get_fields())
for name in ['program_name', 'class_name', 'letters_mastered']:
    print(f'{name}:', name in fields)
"
```

Expected: all three `True`. If `letters_mastered` is missing or named differently, update `api/ea_mastery.py` to match.

- [ ] **Step 4: Commit (Django repo)**

```bash
git add api/ea_mastery.py
git commit -m "feat(api): add group letter mastery aggregation helper"
```

---

### Task 11: Smoke-test the mastery helper against a real group

**Files:** No new code. Verification only.

- [ ] **Step 1: Pick a real group with known data**

```bash
python manage.py shell -c "
from api.models import GroupSummary2026
sample = GroupSummary2026.objects.exclude(class_id__isnull=True).filter(phase='letters').first()
if sample:
    print(f'class_id={sample.class_id} ea_name={sample.ea_name} program={sample.program_name} class_name={sample.class_name}')
else:
    print('No sample group found — check Task 9 data')
"
```

Record the `class_id` from the output.

- [ ] **Step 2: Run the helper against that group**

```bash
python manage.py shell -c "
from api.ea_mastery import compute_group_letter_mastery
from api.models import GroupSummary2026

CLASS_ID = <paste_class_id_from_step_1>
gs = GroupSummary2026.objects.get(class_id=CLASS_ID, phase='letters')
mastery = compute_group_letter_mastery(CLASS_ID, gs)
print(f'Letters in result: {len(mastery)}')
for entry in mastery[:8]:
    print(entry)
"
```

Expected: a non-empty list of per-letter dicts. Each dict should have `letter`, `children_mastered`, `children_total`, `mastery_pct`, `sessions_taught`. The first few letters should typically have higher `sessions_taught` values (since the group has taught them more) and possibly higher `mastery_pct`. If `children_total` is 0, investigate the group's children list.

- [ ] **Step 3: Run against a group with no alignment data (if one exists)**

Repeat Step 2 with a `class_id` of a group where `ChildLetterAlignment2026` has no rows (e.g., a newly-started group). The result should still contain entries for letters that have been taught, with `mastery_pct: 0` and `children_mastered: 0`.

If all groups currently have alignment data, skip this step and verify instead in Task 12 when the endpoint is live.

- [ ] **Step 4: Note completion (no commit — verification only)**

The helper works. Proceed to the endpoints.

---

## Group 4: Endpoints (Tasks 12–16)

### Task 12: Add the `ea_detail_overview` view

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/views.py`

- [ ] **Step 1: Add the new view function at the end of `api/views.py`**

Append this to `api/views.py`:

```python
def ea_detail_overview(request, user_id):
    """
    GET /api/ea/<user_id>/

    Returns the EA's profile plus an array of their group summaries
    for the EA "My Kids" overview page and the PM EA detail view.

    Scoped strictly by ea_user_id — no name matching fallback.
    """
    from api.models import GroupSummary2026
    from collections import Counter

    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        return JsonResponse({"error": "invalid user_id"}, status=400)

    groups_qs = (
        GroupSummary2026.objects
        .filter(ea_user_id=user_id_int)
        .order_by('program_name', 'class_name')
    )

    group_list = list(groups_qs)

    # EA display name: most common ea_name across this user's groups
    ea_name = ""
    if group_list:
        name_counter = Counter(g.ea_name for g in group_list if g.ea_name)
        if name_counter:
            ea_name = name_counter.most_common(1)[0][0]

    # Primary school: the one with the most groups (proxy for "most sessions")
    primary_school = ""
    if group_list:
        school_counter = Counter(g.program_name for g in group_list if g.program_name)
        if school_counter:
            primary_school = school_counter.most_common(1)[0][0]

    # Last updated: max updated_at across this user's group summaries
    last_updated = None
    if group_list:
        updated_values = [g.updated_at for g in group_list if getattr(g, "updated_at", None)]
        if updated_values:
            last_updated = max(updated_values).isoformat()

    def serialize_group(g: GroupSummary2026) -> dict:
        base = {
            "class_id": g.class_id,
            "group_name": g.class_name,
            "school_name": g.program_name,
            "grade": g.grade,
            "phase": g.phase,
            "children_count": g.children_count,
            "sessions_this_week": g.sessions_this_week,
            "total_sessions": getattr(g, "total_sessions", 0),
            "last_session_date": g.last_session_date.isoformat() if getattr(g, "last_session_date", None) else None,
            "dosage_status": getattr(g, "dosage_status", ""),
            "flags": [
                f for f in [
                    "moving_too_fast" if getattr(g, "flag_moving_too_fast", False) else None,
                    "stagnation" if getattr(g, "flag_stagnation", False) else None,
                    "curriculum_gaps" if getattr(g, "flag_curriculum_gaps", False) else None,
                    "ghost_group" if getattr(g, "flag_ghost_group", False) else None,
                ] if f
            ],
            "language": g.language,
        }
        if g.phase == "letters":
            base.update({
                "current_letter": g.current_letter,
                "progress_index": g.progress_index,
                "progress_pct": g.progress_pct,
            })
        else:  # blending
            base.update({
                "blending_start_date": g.blending_start_date.isoformat() if g.blending_start_date else None,
            })
        return base

    response = {
        "ea_name": ea_name,
        "primary_school": primary_school,
        "teampact_user_id": user_id_int,
        "last_updated": last_updated,
        "groups": [serialize_group(g) for g in group_list],
    }
    return JsonResponse(response)
```

- [ ] **Step 2: Verify the file parses**

```bash
python -c "import ast; ast.parse(open('api/views.py').read()); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Check the flag field names match the model**

The view references `flag_moving_too_fast`, `flag_stagnation`, `flag_curriculum_gaps`, `flag_ghost_group`. Verify these are the actual field names on `GroupSummary2026`:

```bash
python manage.py shell -c "
from api.models import GroupSummary2026
fields = [f.name for f in GroupSummary2026._meta.get_fields() if f.name.startswith('flag_')]
print(fields)
"
```

Expected output should include `flag_moving_too_fast`, `flag_stagnation`, `flag_curriculum_gaps`, `flag_ghost_group`. If names differ, update the view accordingly.

Also verify `dosage_status`, `total_sessions`, `last_session_date`, `updated_at` exist:
```bash
python manage.py shell -c "
from api.models import GroupSummary2026
fields = set(f.name for f in GroupSummary2026._meta.get_fields())
for name in ['dosage_status', 'total_sessions', 'last_session_date', 'updated_at']:
    print(f'{name}:', name in fields)
"
```

If any are missing, update the view to remove them (using `getattr(g, name, default)` as the view already does) or match the correct field name.

- [ ] **Step 4: Commit (Django repo)**

```bash
git add api/views.py
git commit -m "feat(api): add ea_detail_overview view"
```

---

### Task 13: Register the `ea_detail_overview` URL route

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/urls.py`

- [ ] **Step 1: Add the URL pattern**

Open `api/urls.py`. In the `urlpatterns` list, add this line (after the existing `ea-performance/` entry):

```python
    path('ea/<int:user_id>/', views.ea_detail_overview, name='ea-detail-overview'),
```

- [ ] **Step 2: Verify the URL is registered**

```bash
python manage.py shell -c "
from django.urls import reverse
print(reverse('ea-detail-overview', kwargs={'user_id': 28764}))
"
```

Expected: `/api/ea/28764/` (or similar depending on root URL prefix).

- [ ] **Step 3: Smoke-test the endpoint locally**

Start the dev server:
```bash
python manage.py runserver 8000
```

In another shell:
```bash
curl -i -H "X-Internal-Auth: <your_secret>" http://localhost:8000/api/ea/28764/
```

Expected: `HTTP/1.1 200 OK` and a JSON body with `ea_name`, `primary_school`, `teampact_user_id`, `last_updated`, and `groups` array. If `user_id 28764` has no groups in your local data, try another user_id from the `GroupSummary2026.ea_user_id` column.

If you get `404` or `500`, stop and debug before continuing.

Stop the dev server.

- [ ] **Step 4: Commit (Django repo)**

```bash
git add api/urls.py
git commit -m "feat(api): register ea_detail_overview URL route"
```

---

### Task 14: Add the `ea_group_detail` view

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/views.py`

**Important data notes (must match model shape):**
- `TeampactSession2026` is **one row per participant per session**. To show "last 10 sessions," aggregate by `session_id` (distinct sessions), not by row. To build the children list, aggregate rows by `participant_id`.
- `attendance_status` is a CharField with values like `PRESENT_BOTH`, `PRESENT_PRE`, `PRESENT_POST`, `ABSENT`. Treat any value starting with `PRESENT_` as present.
- `letters_taught` is a **CSV string**. Parse with `.split(",")`.
- Session notes live in `session_text` (not `text`).
- The `participant_name` field exists directly on each row.

- [ ] **Step 1: Append the second view function**

Append this to `api/views.py` (after `ea_detail_overview`):

```python
def ea_group_detail(request, user_id, class_id):
    """
    GET /api/ea/<user_id>/groups/<class_id>/

    Returns detailed info for a single group: children list, recent sessions,
    letter mastery aggregation, and dosage/flag info.

    Returns 404 if the class_id does not belong to this user.

    Data shape note: TeampactSession2026 has one row per participant per
    session. We aggregate by session_id for the "recent sessions" list and
    by participant_id for the children list.
    """
    from collections import defaultdict
    from api.models import GroupSummary2026, TeampactSession2026
    from api.ea_mastery import compute_group_letter_mastery

    try:
        user_id_int = int(user_id)
        class_id_int = int(class_id)
    except (TypeError, ValueError):
        return JsonResponse({"error": "invalid user_id or class_id"}, status=400)

    # Scope check — this class must belong to this user
    try:
        group = GroupSummary2026.objects.get(
            ea_user_id=user_id_int,
            class_id=class_id_int,
        )
    except GroupSummary2026.DoesNotExist:
        return JsonResponse({"error": "group not found"}, status=404)

    def is_present(status: str) -> bool:
        return bool(status) and status.upper().startswith("PRESENT")

    def parse_letters(csv: str) -> list[str]:
        if not csv:
            return []
        return [l.strip() for l in csv.split(",") if l.strip()]

    # --- Load all rows for this class_id in one query, newest first ---
    rows = list(
        TeampactSession2026.objects
        .filter(class_id=class_id_int)
        .order_by('-session_started_at')
        .values(
            'session_id',
            'session_started_at',
            'session_text',
            'letters_taught',
            'participant_id',
            'participant_name',
            'attendance_status',
        )
    )

    # --- Aggregate by session_id to reconstruct session-level records ---
    sessions_by_id: dict = {}
    for row in rows:
        sid = row['session_id']
        if sid is None:
            continue
        if sid not in sessions_by_id:
            sessions_by_id[sid] = {
                'session_id': sid,
                'session_started_at': row['session_started_at'],
                'session_text': row['session_text'],
                'letters_taught': row['letters_taught'],
                'attendees': [],
            }
        sessions_by_id[sid]['attendees'].append({
            'participant_id': row['participant_id'],
            'name': row['participant_name'] or '',
            'present': is_present(row['attendance_status'] or ''),
        })

    # Sort sessions newest first (dict is insertion-ordered but defensively sort)
    sessions_sorted = sorted(
        sessions_by_id.values(),
        key=lambda s: s['session_started_at'] or '',
        reverse=True,
    )

    recent_sessions = []
    for s in sessions_sorted[:10]:
        letters = parse_letters(s['letters_taught'])
        attendees = s['attendees']
        present_count = sum(1 for a in attendees if a['present'])
        recent_sessions.append({
            'session_id': s['session_id'],
            'date': s['session_started_at'].date().isoformat() if s['session_started_at'] else None,
            'letters_taught': letters,
            'attendance_count': present_count,
            'attendance_total': len(attendees),
            'notes': s['session_text'] or '',
            'attendees': attendees,
        })

    # --- Aggregate by participant_id to build the children list ---
    per_child: dict = defaultdict(lambda: {
        'name': '',
        'sessions_attended': 0,
        'sessions_total_seen': set(),  # unique session_ids this child appeared in
        'sessions_attended_ids': set(),
        'last_attended': None,
    })
    for row in rows:
        pid = row['participant_id']
        if pid is None:
            continue
        sid = row['session_id']
        rec = per_child[pid]
        if row['participant_name'] and not rec['name']:
            rec['name'] = row['participant_name']
        if sid is not None:
            rec['sessions_total_seen'].add(sid)
        if is_present(row['attendance_status'] or ''):
            if sid is not None:
                rec['sessions_attended_ids'].add(sid)
            session_date = row['session_started_at'].date().isoformat() if row['session_started_at'] else None
            if session_date and (rec['last_attended'] is None or session_date > rec['last_attended']):
                rec['last_attended'] = session_date

    children = []
    for pid, rec in per_child.items():
        total = len(rec['sessions_total_seen'])
        attended = len(rec['sessions_attended_ids'])
        children.append({
            'participant_id': pid,
            'name': rec['name'],
            'sessions_attended': attended,
            'sessions_total': total,
            'attendance_rate': round(attended / total, 2) if total else 0,
            'last_attended': rec['last_attended'],
        })
    # Sort by attendance rate ascending (lowest first — surface at-risk children)
    children.sort(key=lambda c: (c['attendance_rate'], -c['sessions_attended']))

    # --- Letter mastery ---
    letter_mastery = compute_group_letter_mastery(class_id_int, group)

    response = {
        "class_id": group.class_id,
        "group_name": group.class_name,
        "school_name": group.program_name,
        "grade": group.grade,
        "phase": group.phase,
        "language": group.language,
        "progress": {
            "current_letter": group.current_letter,
            "progress_index": group.progress_index,
            "progress_pct": group.progress_pct,
        },
        "dosage_status": getattr(group, "dosage_status", ""),
        "sessions_this_week": group.sessions_this_week,
        "total_sessions": getattr(group, "total_sessions", 0),
        "flags": [
            f for f in [
                "moving_too_fast" if getattr(group, "flag_moving_too_fast", False) else None,
                "stagnation" if getattr(group, "flag_stagnation", False) else None,
                "curriculum_gaps" if getattr(group, "flag_curriculum_gaps", False) else None,
                "ghost_group" if getattr(group, "flag_ghost_group", False) else None,
            ] if f
        ],
        "children": children,
        "recent_sessions": recent_sessions,
        "letter_mastery": letter_mastery,
    }
    return JsonResponse(response)
```

- [ ] **Step 2: Verify the file parses**

```bash
python -c "import ast; ast.parse(open('api/views.py').read()); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Spot-check field names on `TeampactSession2026`**

```bash
python manage.py shell -c "
from api.models import TeampactSession2026
fields = set(f.name for f in TeampactSession2026._meta.get_fields())
for name in ['session_id', 'session_started_at', 'session_text', 'class_id', 'letters_taught', 'participant_id', 'participant_name', 'attendance_status']:
    print(f'{name}:', name in fields)
"
```

Expected: all `True`. If any field has a different name, update the view's `.values(...)` call accordingly. Use `compute_group_summaries_2026.py` and `sync_teampact_sessions_2026.py` as canonical references for field names.

- [ ] **Step 4: Commit (Django repo)**

```bash
git add api/views.py
git commit -m "feat(api): add ea_group_detail view"
```

---

### Task 15: Register the `ea_group_detail` URL route

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/urls.py`

- [ ] **Step 1: Add the URL pattern**

Open `api/urls.py`. In the `urlpatterns` list, add this line immediately after the `ea/<int:user_id>/` entry from Task 13:

```python
    path('ea/<int:user_id>/groups/<int:class_id>/', views.ea_group_detail, name='ea-group-detail'),
```

- [ ] **Step 2: Verify the URL is registered**

```bash
python manage.py shell -c "
from django.urls import reverse
print(reverse('ea-group-detail', kwargs={'user_id': 28764, 'class_id': 67610}))
"
```

Expected: `/api/ea/28764/groups/67610/`

- [ ] **Step 3: Commit (Django repo)**

```bash
git add api/urls.py
git commit -m "feat(api): register ea_group_detail URL route"
```

---

### Task 16: Smoke-test both endpoints end-to-end locally

**Files:** No new code. Verification only.

- [ ] **Step 1: Start Django locally**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
source venv/bin/activate
python manage.py runserver 8000
```

- [ ] **Step 2: Pick a real user_id and class_id combo**

In another shell:
```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
source venv/bin/activate
python manage.py shell -c "
from api.models import GroupSummary2026
sample = GroupSummary2026.objects.exclude(ea_user_id__isnull=True).exclude(class_id__isnull=True).first()
if sample:
    print(f'user_id={sample.ea_user_id} class_id={sample.class_id}')
"
```

Record both values.

- [ ] **Step 3: Hit the overview endpoint**

```bash
curl -s -H "X-Internal-Auth: <your_secret>" http://localhost:8000/api/ea/<user_id>/ | python3 -m json.tool
```

Expected: a JSON object with `ea_name`, `primary_school`, `teampact_user_id`, `last_updated`, and a non-empty `groups` array. Each group in the array should have `class_id`, `group_name`, `school_name`, `grade`, `phase`, etc.

- [ ] **Step 4: Hit the group detail endpoint**

```bash
curl -s -H "X-Internal-Auth: <your_secret>" http://localhost:8000/api/ea/<user_id>/groups/<class_id>/ | python3 -m json.tool
```

Expected: a JSON object with `class_id`, `group_name`, `children` (array), `recent_sessions` (array of up to 10), and `letter_mastery` (array). Each child should have `participant_id`, `name`, `sessions_attended`, `attendance_rate`, `last_attended`.

- [ ] **Step 5: Hit the scoping check — should 404**

```bash
curl -i -H "X-Internal-Auth: <your_secret>" http://localhost:8000/api/ea/<user_id>/groups/99999999/
```

Expected: `HTTP/1.1 404 Not Found` with `{"error": "group not found"}`.

- [ ] **Step 6: Hit the scoping check — wrong user**

Pick a `class_id` that does NOT belong to `<user_id>` (use another EA's class_id):
```bash
curl -i -H "X-Internal-Auth: <your_secret>" http://localhost:8000/api/ea/<user_id>/groups/<other_users_class_id>/
```

Expected: `HTTP/1.1 404 Not Found` (scoping is enforced — the wrong user cannot read another user's group).

- [ ] **Step 7: Hit without the auth header**

```bash
curl -i http://localhost:8000/api/ea/<user_id>/
```

Expected: `HTTP/1.1 401 Unauthorized`.

Stop the dev server.

If any check failed, stop and debug before continuing to Task 17.

---

## Group 5: Data Validation and Deploy (Tasks 17–19)

### Task 17: Create the data validation checks command

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/management/commands/validate_ea_data_2026.py`

- [ ] **Step 1: Create the command file**

Create `api/management/commands/validate_ea_data_2026.py`:

```python
"""
Data validation checks for the EA My Kids feature.

Surfaces anomalies that would cause EA-facing pages to show empty or
incorrect data. Intended to be run manually before cutting EA access,
and informs the future /pm/data-quality page.

Usage:
    DJANGO_ENV=production python manage.py validate_ea_data_2026
"""
from collections import Counter, defaultdict

from django.core.management.base import BaseCommand

from api.models import GroupSummary2026, TeampactSession2026


class Command(BaseCommand):
    help = "Run EA data validation checks for the My Kids feature."

    def handle(self, *args, **options):
        out = self.stdout.write

        out("\n=== EA Data Validation (2026) ===\n")

        # --- Check 1: GroupSummary rows missing ea_user_id ---
        total = GroupSummary2026.objects.count()
        missing_ea = GroupSummary2026.objects.filter(ea_user_id__isnull=True).count()
        missing_class = GroupSummary2026.objects.filter(class_id__isnull=True).count()
        out(f"Total group summaries: {total}")
        out(f"  Missing ea_user_id:  {missing_ea}  ({missing_ea/total*100:.1f}%)" if total else "  Missing ea_user_id: 0")
        out(f"  Missing class_id:    {missing_class}  ({missing_class/total*100:.1f}%)" if total else "  Missing class_id: 0")

        if missing_ea:
            out("\n  Sample rows missing ea_user_id:")
            for g in GroupSummary2026.objects.filter(ea_user_id__isnull=True)[:5]:
                out(f"    - {g.program_name} / {g.class_name} (ea_name={g.ea_name!r})")

        if missing_class:
            out("\n  Sample rows missing class_id:")
            for g in GroupSummary2026.objects.filter(class_id__isnull=True)[:5]:
                out(f"    - {g.program_name} / {g.class_name} (ea_name={g.ea_name!r})")

        # --- Check 2: Same ea_name mapping to multiple ea_user_ids ---
        out("\nName-to-ID conflicts (same ea_name, multiple ea_user_ids):")
        name_to_ids: dict[str, set[int]] = defaultdict(set)
        for g in GroupSummary2026.objects.exclude(ea_user_id__isnull=True).exclude(ea_name=""):
            name_to_ids[g.ea_name].add(g.ea_user_id)
        conflicts = {name: ids for name, ids in name_to_ids.items() if len(ids) > 1}
        if conflicts:
            for name, ids in list(conflicts.items())[:10]:
                out(f"  {name!r} -> {sorted(ids)}")
            out(f"  Total conflicts: {len(conflicts)}")
        else:
            out("  None — all EA names map to a single user_id. ✓")

        # --- Check 3: ea_user_ids in summaries but missing from sessions ---
        session_user_ids = set(
            TeampactSession2026.objects
            .exclude(user_id__isnull=True)
            .values_list('user_id', flat=True)
            .distinct()
        )
        summary_user_ids = set(
            GroupSummary2026.objects
            .exclude(ea_user_id__isnull=True)
            .values_list('ea_user_id', flat=True)
            .distinct()
        )
        orphaned = summary_user_ids - session_user_ids
        out(f"\nEA user_ids in summaries but missing from sessions: {len(orphaned)}")
        if orphaned:
            for uid in list(orphaned)[:10]:
                out(f"  - {uid}")

        # --- Check 4: Groups with more than 12 children ---
        oversized = GroupSummary2026.objects.filter(children_count__gt=12).order_by('-children_count')
        out(f"\nGroups with >12 children: {oversized.count()}")
        for g in oversized[:10]:
            out(f"  - {g.children_count} kids in {g.class_name} ({g.program_name})")

        # --- Check 5: EAs with zero groups linked ---
        session_eas = {
            (row['user_id'], row['user_name'])
            for row in TeampactSession2026.objects
            .exclude(user_id__isnull=True)
            .values('user_id', 'user_name')
            .distinct()
        }
        eas_with_groups = set(GroupSummary2026.objects.exclude(ea_user_id__isnull=True).values_list('ea_user_id', flat=True).distinct())
        session_only = [(uid, name) for (uid, name) in session_eas if uid not in eas_with_groups]
        out(f"\nEAs with sessions but no group summary rows: {len(session_only)}")
        for uid, name in session_only[:10]:
            out(f"  - {uid} ({name!r})")

        out("\n=== Validation complete ===\n")
```

- [ ] **Step 2: Verify the command parses**

```bash
python -c "import ast; ast.parse(open('api/management/commands/validate_ea_data_2026.py').read()); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Run the command locally**

```bash
DJANGO_ENV=production python manage.py validate_ea_data_2026
```

Expected: prints all 5 checks with counts and sample rows. Review the output:
- Record any counts that look unexpectedly high (e.g., >10% of groups missing `ea_user_id`).
- Save the output to a file for later reference:
```bash
DJANGO_ENV=production python manage.py validate_ea_data_2026 > /tmp/ea_validation_$(date +%Y%m%d).txt
```

Any anomalies surfaced here should be investigated but are NOT blockers for Phase 0 deploy (unless they indicate a bug in the compute command). The future `/pm/data-quality` page will surface these lists to the field team.

- [ ] **Step 4: Commit (Django repo)**

```bash
git add api/management/commands/validate_ea_data_2026.py
git commit -m "feat(api): add EA data validation checks command"
```

---

### Task 18: Deploy Django changes to Render and verify nightly compute

**Files:** No new code. Operational checkpoint.

- [ ] **Step 1: Push Django repo**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
git push
```

Render will rebuild and deploy automatically. Wait for the deploy to go green.

- [ ] **Step 2: Verify the migration ran on production**

Render typically runs migrations via the build script. Check the deploy logs and confirm you see:
```
Applying api.0038_add_ea_user_id_and_class_id_to_groupsummary2026... OK
```

If migrations are NOT run automatically, ssh into the Django service (or use Render's shell) and run:
```bash
python manage.py migrate api
```

- [ ] **Step 3: Trigger the nightly compute manually to populate new fields**

Use Render's shell or the cron one-off trigger to run:
```bash
DJANGO_ENV=production python manage.py compute_group_summaries_2026
```

Expected: the command completes successfully (same output as Task 9 Step 5 but against production data).

- [ ] **Step 4: Verify new fields are populated in production**

Via Render shell:
```bash
python manage.py shell -c "
from api.models import GroupSummary2026
total = GroupSummary2026.objects.count()
with_ea = GroupSummary2026.objects.exclude(ea_user_id__isnull=True).count()
with_class = GroupSummary2026.objects.exclude(class_id__isnull=True).count()
print(f'Total: {total}')
print(f'With ea_user_id: {with_ea} ({with_ea/total*100:.1f}%)')
print(f'With class_id: {with_class} ({with_class/total*100:.1f}%)')
"
```

Expected: ≥90% coverage on both fields. Anything lower indicates a data gap worth investigating (run `validate_ea_data_2026` to see details).

- [ ] **Step 5: Run the validation command on production**

```bash
DJANGO_ENV=production python manage.py validate_ea_data_2026
```

Review the output. Record any anomalies but do not block deploy on them.

---

### Task 19: Smoke-test production endpoints

**Files:** No new code. Verification only.

- [ ] **Step 1: Hit the overview endpoint on production**

From a local terminal:
```bash
curl -s -H "X-Internal-Auth: <your_prod_secret>" https://<your-django-domain>/api/ea/<real_user_id>/ | python3 -m json.tool | head -40
```

Expected: valid JSON with `ea_name`, `primary_school`, `teampact_user_id`, `last_updated`, `groups` array.

- [ ] **Step 2: Hit the group detail endpoint on production**

```bash
curl -s -H "X-Internal-Auth: <your_prod_secret>" https://<your-django-domain>/api/ea/<real_user_id>/groups/<real_class_id>/ | python3 -m json.tool | head -60
```

Expected: valid JSON with `class_id`, `children`, `recent_sessions`, `letter_mastery`.

- [ ] **Step 3: Verify auth still gates everything**

```bash
curl -i https://<your-django-domain>/api/ea/<real_user_id>/
```

Expected: `HTTP/1.1 401 Unauthorized`.

- [ ] **Step 4: Verify PM pages still work (regression check)**

In a browser (authenticated), visit:
- `https://<your-next-domain>/pm`
- `https://<your-next-domain>/schools-2026`

Both should load with real data, not mock fallbacks.

- [ ] **Step 5: Mark Phase 0 complete**

Phase 0 is done. The backend is ready for Phase 1A (Auth & Routing). Write a short note in the project's CHANGELOG or next team update describing what shipped:

> Phase 0 backend prep for EA "My Kids" is live. New endpoints `/api/ea/<user_id>/` and `/api/ea/<user_id>/groups/<class_id>/` are available. All Next.js → Django calls now require the `X-Internal-Auth` shared-secret header. `GroupSummary2026` now stores `ea_user_id` and `class_id` for ID-based scoping.

---

## Phase 0 Completion Criteria

Phase 0 is done when all of the following are true:

- [ ] `INTERNAL_API_SECRET` is set on both Render services and all Next.js → Django callsites route through `lib/django-fetch.ts`.
- [ ] Django middleware rejects `/api/*` requests without the valid header (401) in production.
- [ ] `GroupSummary2026` has `ea_user_id` and `class_id` columns populated for ≥90% of rows.
- [ ] The `compute_group_summaries_2026` command populates both fields on every run.
- [ ] `/api/ea/<user_id>/` returns the expected shape with real production data.
- [ ] `/api/ea/<user_id>/groups/<class_id>/` returns the expected shape including `children`, `recent_sessions`, and `letter_mastery`.
- [ ] Scoping is enforced: requesting a `class_id` that doesn't belong to the given `user_id` returns 404.
- [ ] PM pages (`/pm/*`) and `/schools-2026` still load correctly (regression check).
- [ ] `validate_ea_data_2026` command runs successfully and surfaces known anomalies for future investigation.

---

## Next Plan

Once Phase 0 is complete and verified, the next plan (`docs/superpowers/plans/YYYY-MM-DD-ea-my-kids-phase1a.md`) will cover:

- Adding the `ea` role to the Clerk/middleware hierarchy
- Preloading EA accounts in Clerk with `teampact_user_id`
- Creating the standalone `/my-kids/*` layout
- Login redirect precedence (`redirect_url` > role default)
- "Not linked" and "backend error" edge states

Phase 1A does not touch any data models or endpoints — it is pure frontend auth + layout work built on the Phase 0 foundation.
