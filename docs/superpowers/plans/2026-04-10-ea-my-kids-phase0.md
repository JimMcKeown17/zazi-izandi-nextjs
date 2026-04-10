# EA My Kids — Phase 0: Backend Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the Django backend and Next.js service-auth layer so that Phase 1 (EA "My Kids" frontend) can be built against stable, ID-scoped, secure endpoints.

**Architecture:** Phase 0 is a cross-codebase prep phase. It spans the Django project at `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025` (models, compute command, endpoints, middleware) and the Next.js project at `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs` (shared-secret helper, 7 callsite refactors). It ships as a unit so the Django middleware and updated fetchers go live together.

**Tech Stack:** Django 5, Python 3.13, Postgres, Render hosting (Django). Next.js 16 (App Router), TypeScript, Clerk, Render hosting (Next.js).

**Related spec:** `docs/superpowers/specs/2026-04-09-ea-my-kids-design.md` (Sections 1, 3, and Phase 0 in Section 8).

**Phases not covered by this plan:** Phase 1A (Auth & Routing), 1B (Overview Page), 1C (Group Detail), 1D (PM View). Each will be written as a separate plan after Phase 0 ships and is verified.

---

## Scope and Ordering

Phase 0 is organized into five groups, with three automated test tasks interleaved (4b, 10b, 15b):

1. **Service auth setup** (Tasks 1–6, with 4b for middleware tests) — shared secret between Next.js and Django. Must ship atomically.
2. **Model changes** (Tasks 7–9) — add `ea_user_id` and `class_id` to `GroupSummary2026`.
3. **Letter mastery aggregation** (Tasks 10–11, with 10b for helper tests) — aggregate per-letter mastery and session counts.
4. **New endpoints** (Tasks 12–16, with 15b for view tests) — `/api/ea/<user_id>/` and `/api/ea/<user_id>/groups/<class_id>/`.
5. **Data validation and deploy** (Tasks 17–19) — run checks, deploy, verify.

**Important:** Group 1 must ship atomically (middleware + fetcher refactor together). Groups 2–5 can ship incrementally after that, but they also depend on Group 1 being live.

**Automated tests** are inserted as letter-suffixed tasks (4b, 10b, 15b) right after the code they cover, so each subsystem ships with its own test gate. The tests run via `python manage.py test api`.

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
- **Modify:** `api/views.py` — add `ea_detail_overview` and `ea_group_detail` view functions (with audit logging via `api.ea` logger)
- **Modify:** `api/urls.py` — register new URL routes
- **Create:** `api/management/commands/validate_ea_data_2026.py` — data validation checks command (DB + TeamPact API checks)
- **Create:** `api/tests_middleware.py` — automated tests for `InternalAuthMiddleware`
- **Create:** `api/tests_ea_mastery.py` — automated tests for `compute_group_letter_mastery`
- **Create:** `api/tests_ea_views.py` — automated tests for both EA endpoints (auth, scoping, shape)

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

Django's `config/settings/base.py` (line 17) hardcodes `dotenv_path = BASE_DIR/.env` — it does **not** read `.env.local`. In the Django project at `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025`, edit (or create) the `.env` file in the project root:

```
INTERNAL_API_SECRET=<same_value_from_step_1>
```

If for some reason you can't use a `.env` file (e.g., running in a subshell), export it before starting `manage.py runserver`:
```bash
export INTERNAL_API_SECRET=<same_value_from_step_1>
python manage.py runserver 8000
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

### Task 4b: Write automated tests for `InternalAuthMiddleware`

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/tests_middleware.py`

**Why:** The middleware is the entire child-data security boundary. Manual curl in Task 4 is insufficient — we want a test that runs on every deploy and catches regressions (e.g., a future refactor that removes the header check).

- [ ] **Step 1: Create the test file**

Create `api/tests_middleware.py`:

```python
"""
Tests for InternalAuthMiddleware.

These tests verify the service-auth boundary: unauthenticated /api/*
requests must be rejected, authenticated ones must pass through, and
non-/api/* paths must remain unaffected.
"""
from django.test import TestCase, override_settings, Client


@override_settings(INTERNAL_API_SECRET="test-secret-123")
class InternalAuthMiddlewareTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_api_path_without_header_returns_401(self):
        """Any /api/* request without the header is rejected."""
        res = self.client.get("/api/programme-overview/")
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.json(), {"error": "unauthorized"})

    def test_api_path_with_wrong_header_returns_401(self):
        """A wrong secret is the same as no secret — rejected."""
        res = self.client.get(
            "/api/programme-overview/",
            HTTP_X_INTERNAL_AUTH="wrong-value",
        )
        self.assertEqual(res.status_code, 401)

    def test_api_path_with_correct_header_passes_through(self):
        """The middleware does not block a valid request.

        We don't care about the downstream view's status here — only that
        the middleware itself returns neither 401 nor blocks the request.
        A 200 OR any other non-401 status means the middleware passed through.
        """
        res = self.client.get(
            "/api/programme-overview/",
            HTTP_X_INTERNAL_AUTH="test-secret-123",
        )
        self.assertNotEqual(res.status_code, 401)

    def test_non_api_path_passes_through_without_header(self):
        """Non-/api/* paths (admin, auth) don't require the header."""
        res = self.client.get("/admin/login/")
        # 200 or 302 — anything other than 401 means the middleware didn't block it
        self.assertNotEqual(res.status_code, 401)


@override_settings(INTERNAL_API_SECRET="")
class InternalAuthMiddlewareWithEmptySecretTests(TestCase):
    """When the secret is unset, all /api/* requests should still be rejected.

    This protects against misconfiguration — you can't accidentally
    disable auth by forgetting to set the env var.
    """

    def test_empty_secret_rejects_everything(self):
        client = Client()
        res = client.get(
            "/api/programme-overview/",
            HTTP_X_INTERNAL_AUTH="anything",
        )
        self.assertEqual(res.status_code, 401)
```

- [ ] **Step 2: Run the tests**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
source venv/bin/activate
python manage.py test api.tests_middleware -v 2
```

Expected:
```
test_api_path_with_correct_header_passes_through ... ok
test_api_path_with_wrong_header_returns_401 ... ok
test_api_path_without_header_returns_401 ... ok
test_non_api_path_passes_through_without_header ... ok
test_empty_secret_rejects_everything ... ok

Ran 5 tests in X.XXXs
OK
```

If any test fails, diagnose and fix the middleware before proceeding.

- [ ] **Step 3: Commit (Django repo)**

```bash
git add api/tests_middleware.py
git commit -m "test(api): add InternalAuthMiddleware tests (401/200/pass-through)"
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

### Task 10b: Write automated tests for `compute_group_letter_mastery`

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/tests_ea_mastery.py`

**Why:** The mastery helper powers the central visualization on the group detail page. A regression here would silently corrupt the "average letter tracker" EAs rely on. Tests cover three critical paths: (1) normal with both mastery and sessions, (2) no-assessment fallback (session-only), (3) deduplication of session rows by `session_id`.

- [ ] **Step 1: Create the test file**

Create `api/tests_ea_mastery.py`:

```python
"""
Tests for compute_group_letter_mastery in api/ea_mastery.py.

Uses an in-memory-style Django TestCase with fabricated rows in
GroupSummary2026, TeampactSession2026, and ChildLetterAlignment2026
to verify the aggregation logic without needing real TeamPact data.
"""
from datetime import datetime, timezone as dt_timezone

from django.test import TestCase
from django.utils import timezone

from api.models import (
    GroupSummary2026,
    TeampactSession2026,
    ChildLetterAlignment2026,
)
from api.ea_mastery import compute_group_letter_mastery


def _make_session_row(
    session_id: int,
    class_id: int,
    letters_taught: str,
    participant_id: int,
    attendance_id: int,
):
    """Create one TeampactSession2026 row (one participant per session)."""
    return TeampactSession2026.objects.create(
        attendance_id=attendance_id,
        session_id=session_id,
        class_id=class_id,
        program_name="Test School",
        class_name="Test Group",
        user_id=12345,
        user_name="Test EA",
        letters_taught=letters_taught,
        session_started_at=timezone.now(),
        attendance_status="PRESENT_BOTH",
        participant_id=participant_id,
        participant_name=f"Child {participant_id}",
    )


class LetterMasteryAggregationTests(TestCase):
    def setUp(self):
        self.group = GroupSummary2026.objects.create(
            program_name="Test School",
            class_name="Test Group",
            ea_name="Test EA",
            ea_user_id=12345,
            class_id=99999,
            grade="Grade R",
            phase="letters",
            language="isiXhosa",
            children_count=4,
            children_names=["Child 1", "Child 2", "Child 3", "Child 4"],
            current_letter="e",
            progress_index=1,
            progress_pct=7.7,
            sessions_this_week=3,
        )

    def test_with_mastery_and_sessions_happy_path(self):
        """Normal case: group has both assessments and sessions."""
        # Session 1: taught "a,e" with 3 participants (3 rows, same session_id)
        _make_session_row(1, 99999, "a,e", 1001, 10001)
        _make_session_row(1, 99999, "a,e", 1002, 10002)
        _make_session_row(1, 99999, "a,e", 1003, 10003)
        # Session 2: taught "a" only, 2 participants
        _make_session_row(2, 99999, "a", 1001, 10004)
        _make_session_row(2, 99999, "a", 1002, 10005)

        # Assessment data: 3/4 children mastered 'a', 1/4 mastered 'e'
        ChildLetterAlignment2026.objects.create(
            participant_id=1001,
            program_name="Test School",
            class_name="Test Group",
            language="isiXhosa",
            letters_mastered=["a", "e"],
        )
        ChildLetterAlignment2026.objects.create(
            participant_id=1002,
            program_name="Test School",
            class_name="Test Group",
            language="isiXhosa",
            letters_mastered=["a"],
        )
        ChildLetterAlignment2026.objects.create(
            participant_id=1003,
            program_name="Test School",
            class_name="Test Group",
            language="isiXhosa",
            letters_mastered=["a"],
        )

        result = compute_group_letter_mastery(99999, self.group)

        # Build a lookup by letter
        by_letter = {r["letter"]: r for r in result}

        # 'a' was taught in 2 unique sessions (dedup by session_id)
        self.assertIn("a", by_letter)
        self.assertEqual(by_letter["a"]["sessions_taught"], 2)
        self.assertEqual(by_letter["a"]["children_mastered"], 3)
        self.assertEqual(by_letter["a"]["children_total"], 4)
        self.assertEqual(by_letter["a"]["mastery_pct"], 75)

        # 'e' was taught in 1 session, mastered by 1 child
        self.assertIn("e", by_letter)
        self.assertEqual(by_letter["e"]["sessions_taught"], 1)
        self.assertEqual(by_letter["e"]["children_mastered"], 1)
        self.assertEqual(by_letter["e"]["mastery_pct"], 25)

    def test_session_id_deduplication(self):
        """Multiple rows with the same session_id count as one session."""
        # 5 participants in the same session should still count as 1 session
        for pid in range(2001, 2006):
            _make_session_row(100, 99999, "a", pid, 20000 + pid)

        result = compute_group_letter_mastery(99999, self.group)
        by_letter = {r["letter"]: r for r in result}
        self.assertEqual(by_letter["a"]["sessions_taught"], 1)

    def test_no_assessment_data_fallback(self):
        """Groups with no ChildLetterAlignment rows still show session data."""
        # Only sessions, no alignment
        _make_session_row(1, 99999, "a", 1001, 10001)
        _make_session_row(2, 99999, "a,e", 1001, 10002)

        result = compute_group_letter_mastery(99999, self.group)
        by_letter = {r["letter"]: r for r in result}

        # Letters should appear with sessions_taught populated...
        self.assertEqual(by_letter["a"]["sessions_taught"], 2)
        self.assertEqual(by_letter["e"]["sessions_taught"], 1)
        # ...but mastery is 0 across the board
        self.assertEqual(by_letter["a"]["children_mastered"], 0)
        self.assertEqual(by_letter["a"]["mastery_pct"], 0)
        self.assertEqual(by_letter["e"]["children_mastered"], 0)

    def test_letters_with_neither_mastery_nor_sessions_are_omitted(self):
        """Letters that never appeared anywhere should not show up."""
        _make_session_row(1, 99999, "a", 1001, 10001)
        result = compute_group_letter_mastery(99999, self.group)
        letters_in_result = {r["letter"] for r in result}
        # 'a' should be present
        self.assertIn("a", letters_in_result)
        # 'z' should be absent (never taught, never mastered)
        self.assertNotIn("z", letters_in_result)

    def test_empty_group_returns_empty_list(self):
        """A group with no sessions and no alignment rows returns []."""
        result = compute_group_letter_mastery(99999, self.group)
        self.assertEqual(result, [])
```

- [ ] **Step 2: Run the tests**

```bash
source venv/bin/activate
python manage.py test api.tests_ea_mastery -v 2
```

Expected: 5 tests pass. If any fail, fix `ea_mastery.py` before proceeding.

- [ ] **Step 3: Commit (Django repo)**

```bash
git add api/tests_ea_mastery.py
git commit -m "test(api): add tests for compute_group_letter_mastery"
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
    import logging
    from api.models import GroupSummary2026
    from collections import Counter

    logger = logging.getLogger("api.ea")

    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        logger.warning("ea_detail_overview: invalid user_id=%r", user_id)
        return JsonResponse({"error": "invalid user_id"}, status=400)

    # Audit log: child-level data access
    logger.info("ea_detail_overview: user_id=%s", user_id_int)

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

    # Primary school: the one where the EA has taught the most sessions
    # (sum total_sessions per school, pick the highest)
    primary_school = ""
    if group_list:
        sessions_per_school: dict[str, int] = {}
        for g in group_list:
            if g.program_name:
                sessions_per_school[g.program_name] = (
                    sessions_per_school.get(g.program_name, 0)
                    + (getattr(g, "total_sessions", 0) or 0)
                )
        if sessions_per_school:
            primary_school = max(sessions_per_school.items(), key=lambda kv: kv[1])[0]

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
    import logging
    from collections import defaultdict
    from api.models import GroupSummary2026, TeampactSession2026
    from api.ea_mastery import compute_group_letter_mastery

    logger = logging.getLogger("api.ea")

    try:
        user_id_int = int(user_id)
        class_id_int = int(class_id)
    except (TypeError, ValueError):
        logger.warning(
            "ea_group_detail: invalid user_id=%r class_id=%r", user_id, class_id
        )
        return JsonResponse({"error": "invalid user_id or class_id"}, status=400)

    # Audit log: child-level data access
    logger.info(
        "ea_group_detail: user_id=%s class_id=%s", user_id_int, class_id_int
    )

    # Scope check — this class must belong to this user
    try:
        group = GroupSummary2026.objects.get(
            ea_user_id=user_id_int,
            class_id=class_id_int,
        )
    except GroupSummary2026.DoesNotExist:
        logger.warning(
            "ea_group_detail: 404 — user_id=%s class_id=%s not found",
            user_id_int,
            class_id_int,
        )
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

### Task 15b: Write automated tests for `ea_detail_overview` and `ea_group_detail`

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/tests_ea_views.py`

**Why:** These views expose child-level data and enforce scoping by `ea_user_id`. Automated tests catch scoping regressions (e.g., a future refactor that accidentally strips the filter) and response-shape drift (fields renamed, missing, or wrong type). Covers letter-phase, blending, no-assessment, and 404 scoping cases.

- [ ] **Step 1: Create the test file**

Create `api/tests_ea_views.py`:

```python
"""
Tests for ea_detail_overview and ea_group_detail views.

Verifies:
- 401 is returned when the service-auth header is missing
- Scoping is enforced by ea_user_id (wrong user = 404)
- Response shape matches the spec for letter-phase groups
- Response shape matches the spec for blending groups
- No-assessment fallback returns session-only mastery data
"""
from django.test import TestCase, override_settings, Client
from django.utils import timezone

from api.models import (
    GroupSummary2026,
    TeampactSession2026,
    ChildLetterAlignment2026,
)


AUTH_HEADERS = {"HTTP_X_INTERNAL_AUTH": "test-secret-123"}


def _make_session_row(
    attendance_id: int,
    session_id: int,
    class_id: int,
    user_id: int,
    letters_taught: str,
    participant_id: int,
    participant_name: str,
    present: bool = True,
):
    return TeampactSession2026.objects.create(
        attendance_id=attendance_id,
        session_id=session_id,
        class_id=class_id,
        program_name="Test School",
        class_name="Test Group",
        user_id=user_id,
        user_name="Test EA",
        letters_taught=letters_taught,
        session_started_at=timezone.now(),
        session_text="Session notes here",
        attendance_status="PRESENT_BOTH" if present else "ABSENT",
        participant_id=participant_id,
        participant_name=participant_name,
    )


@override_settings(INTERNAL_API_SECRET="test-secret-123")
class EaDetailOverviewTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user_id = 28764

        # EA has 2 groups at the same school
        GroupSummary2026.objects.create(
            program_name="Test School",
            class_name="Test Group 1",
            ea_name="Test EA",
            ea_user_id=self.user_id,
            class_id=1001,
            grade="Grade R",
            phase="letters",
            language="isiXhosa",
            children_count=7,
            children_names=[f"Child {i}" for i in range(7)],
            current_letter="e",
            progress_index=1,
            progress_pct=7.7,
            sessions_this_week=4,
            total_sessions=18,
        )
        GroupSummary2026.objects.create(
            program_name="Test School",
            class_name="Test Group 2",
            ea_name="Test EA",
            ea_user_id=self.user_id,
            class_id=1002,
            grade="Grade 1",
            phase="blending",
            language="isiXhosa",
            children_count=6,
            children_names=[f"Child {i}" for i in range(6)],
            sessions_this_week=3,
            total_sessions=12,
        )
        # Another EA's group — must NOT appear in the overview
        GroupSummary2026.objects.create(
            program_name="Other School",
            class_name="Other Group",
            ea_name="Other EA",
            ea_user_id=99999,
            class_id=2001,
            grade="Grade R",
            phase="letters",
            language="isiXhosa",
            children_count=5,
            children_names=[],
            current_letter="a",
            progress_index=0,
            progress_pct=3.8,
            sessions_this_week=2,
            total_sessions=5,
        )

    def test_missing_header_returns_401(self):
        res = self.client.get(f"/api/ea/{self.user_id}/")
        self.assertEqual(res.status_code, 401)

    def test_returns_only_this_users_groups(self):
        res = self.client.get(f"/api/ea/{self.user_id}/", **AUTH_HEADERS)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["teampact_user_id"], self.user_id)
        self.assertEqual(data["ea_name"], "Test EA")
        self.assertEqual(data["primary_school"], "Test School")
        self.assertEqual(len(data["groups"]), 2)
        class_ids = sorted(g["class_id"] for g in data["groups"])
        self.assertEqual(class_ids, [1001, 1002])
        # The other EA's group must be absent
        for g in data["groups"]:
            self.assertNotEqual(g["class_id"], 2001)

    def test_each_group_carries_school_name(self):
        res = self.client.get(f"/api/ea/{self.user_id}/", **AUTH_HEADERS)
        data = res.json()
        for g in data["groups"]:
            self.assertIn("school_name", g)
            self.assertEqual(g["school_name"], "Test School")

    def test_letters_group_has_progress_fields(self):
        res = self.client.get(f"/api/ea/{self.user_id}/", **AUTH_HEADERS)
        data = res.json()
        letters_group = next(g for g in data["groups"] if g["phase"] == "letters")
        self.assertIn("current_letter", letters_group)
        self.assertIn("progress_index", letters_group)
        self.assertIn("progress_pct", letters_group)

    def test_blending_group_has_blending_fields(self):
        res = self.client.get(f"/api/ea/{self.user_id}/", **AUTH_HEADERS)
        data = res.json()
        blending_group = next(g for g in data["groups"] if g["phase"] == "blending")
        self.assertIn("blending_start_date", blending_group)

    def test_unknown_user_returns_empty_groups(self):
        res = self.client.get("/api/ea/888888/", **AUTH_HEADERS)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["groups"], [])


@override_settings(INTERNAL_API_SECRET="test-secret-123")
class EaGroupDetailTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user_id = 28764
        self.other_user_id = 99999
        self.class_id = 1001
        self.other_class_id = 2001

        # Our EA's letters-phase group
        self.group = GroupSummary2026.objects.create(
            program_name="Test School",
            class_name="Test Group 1",
            ea_name="Test EA",
            ea_user_id=self.user_id,
            class_id=self.class_id,
            grade="Grade R",
            phase="letters",
            language="isiXhosa",
            children_count=2,
            children_names=["Child A", "Child B"],
            current_letter="e",
            progress_index=1,
            progress_pct=7.7,
            sessions_this_week=2,
            total_sessions=3,
        )
        # Another EA's group
        GroupSummary2026.objects.create(
            program_name="Other School",
            class_name="Other Group",
            ea_name="Other EA",
            ea_user_id=self.other_user_id,
            class_id=self.other_class_id,
            grade="Grade R",
            phase="letters",
            language="isiXhosa",
            children_count=1,
            children_names=["Someone Else"],
            current_letter="a",
            progress_index=0,
            progress_pct=3.8,
            sessions_this_week=1,
            total_sessions=1,
        )

        # 3 sessions, each with 2 participants (6 rows total for our group)
        # Session 1: a, both present
        _make_session_row(1, 101, self.class_id, self.user_id, "a", 5001, "Child A", True)
        _make_session_row(2, 101, self.class_id, self.user_id, "a", 5002, "Child B", True)
        # Session 2: a,e — A present, B absent
        _make_session_row(3, 102, self.class_id, self.user_id, "a,e", 5001, "Child A", True)
        _make_session_row(4, 102, self.class_id, self.user_id, "a,e", 5002, "Child B", False)
        # Session 3: e — both present
        _make_session_row(5, 103, self.class_id, self.user_id, "e", 5001, "Child A", True)
        _make_session_row(6, 103, self.class_id, self.user_id, "e", 5002, "Child B", True)

    def test_missing_header_returns_401(self):
        res = self.client.get(f"/api/ea/{self.user_id}/groups/{self.class_id}/")
        self.assertEqual(res.status_code, 401)

    def test_wrong_user_returns_404(self):
        """Requesting another user's class_id must return 404 (scoping)."""
        res = self.client.get(
            f"/api/ea/{self.user_id}/groups/{self.other_class_id}/",
            **AUTH_HEADERS,
        )
        self.assertEqual(res.status_code, 404)

    def test_nonexistent_class_returns_404(self):
        res = self.client.get(
            f"/api/ea/{self.user_id}/groups/999999/",
            **AUTH_HEADERS,
        )
        self.assertEqual(res.status_code, 404)

    def test_shape_of_response(self):
        res = self.client.get(
            f"/api/ea/{self.user_id}/groups/{self.class_id}/",
            **AUTH_HEADERS,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        for key in [
            "class_id", "group_name", "school_name", "grade", "phase",
            "language", "progress", "dosage_status", "sessions_this_week",
            "total_sessions", "flags", "children", "recent_sessions", "letter_mastery",
        ]:
            self.assertIn(key, data, f"missing key {key!r}")

    def test_recent_sessions_aggregate_by_session_id(self):
        """3 unique sessions should produce 3 entries, not 6."""
        res = self.client.get(
            f"/api/ea/{self.user_id}/groups/{self.class_id}/",
            **AUTH_HEADERS,
        )
        data = res.json()
        self.assertEqual(len(data["recent_sessions"]), 3)

        # Each session should have 2 attendees
        for s in data["recent_sessions"]:
            self.assertEqual(len(s["attendees"]), 2)

    def test_children_list_aggregates_per_participant(self):
        res = self.client.get(
            f"/api/ea/{self.user_id}/groups/{self.class_id}/",
            **AUTH_HEADERS,
        )
        data = res.json()
        children = data["children"]
        self.assertEqual(len(children), 2)

        by_name = {c["name"]: c for c in children}
        # Child A was present for all 3 sessions → 3/3
        self.assertEqual(by_name["Child A"]["sessions_attended"], 3)
        self.assertEqual(by_name["Child A"]["sessions_total"], 3)
        self.assertEqual(by_name["Child A"]["attendance_rate"], 1.0)
        # Child B was present for 2 of 3 sessions → 2/3
        self.assertEqual(by_name["Child B"]["sessions_attended"], 2)
        self.assertEqual(by_name["Child B"]["sessions_total"], 3)
        self.assertAlmostEqual(by_name["Child B"]["attendance_rate"], 0.67, places=2)

    def test_no_assessment_data_returns_session_only_mastery(self):
        """Without ChildLetterAlignment2026 rows, mastery_pct is 0 but sessions_taught is populated."""
        res = self.client.get(
            f"/api/ea/{self.user_id}/groups/{self.class_id}/",
            **AUTH_HEADERS,
        )
        data = res.json()
        mastery = data["letter_mastery"]
        self.assertGreater(len(mastery), 0, "expected mastery entries for taught letters")
        for entry in mastery:
            self.assertEqual(entry["mastery_pct"], 0)
            self.assertEqual(entry["children_mastered"], 0)
            self.assertGreater(entry["sessions_taught"], 0)

    def test_blending_group_omits_letter_mastery_or_returns_empty(self):
        """Blending groups have progress_index = -1 and no letter sequence progression."""
        blending_group = GroupSummary2026.objects.create(
            program_name="Test School",
            class_name="Blending Group",
            ea_name="Test EA",
            ea_user_id=self.user_id,
            class_id=3001,
            grade="Grade 1",
            phase="blending",
            language="isiXhosa",
            children_count=5,
            children_names=[],
            current_letter="",
            progress_index=-1,
            progress_pct=0,
            sessions_this_week=3,
            total_sessions=10,
        )
        # No sessions created for this class_id
        res = self.client.get(
            f"/api/ea/{self.user_id}/groups/3001/",
            **AUTH_HEADERS,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["phase"], "blending")
        # letter_mastery should be empty (no sessions, no alignment) or a list of 0-session entries
        self.assertIsInstance(data["letter_mastery"], list)
```

- [ ] **Step 2: Run the tests**

```bash
source venv/bin/activate
python manage.py test api.tests_ea_views -v 2
```

Expected: all tests pass. If any fail, diagnose:
- 401 tests — check middleware registration (Task 4)
- 404 scoping tests — check the `.get()` filter in the view
- Shape tests — check the view's response dict
- Aggregation tests — check the `sessions_by_id` and `per_child` logic in `ea_group_detail`
- Mastery tests — check `compute_group_letter_mastery` is called correctly

- [ ] **Step 3: Run the full test suite to catch unintended regressions**

```bash
python manage.py test api -v 1
```

Expected: all tests pass. If any pre-existing test breaks, investigate before continuing.

- [ ] **Step 4: Commit (Django repo)**

```bash
git add api/tests_ea_views.py
git commit -m "test(api): add tests for ea_detail_overview and ea_group_detail"
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

Covers all 5 checks required by the EA My Kids design spec Section 1:
  1. TeamPact coaches without email addresses (cannot link to Clerk)
  2. Our ea_user_ids missing from TeamPact /users API (stale data)
  3. Groups where primary EA doesn't match TeamPact managers list
  4. ea_name rows resolving to multiple ea_user_ids (name collisions)
  5. GroupSummary2026 rows with null class_id (not resolvable from sessions)

Plus two extra checks useful for operations:
  6. Groups with >12 children (regrouping candidates)
  7. EAs with sessions but no group summary rows (compute gaps)

Usage:
    DJANGO_ENV=production python manage.py validate_ea_data_2026
    DJANGO_ENV=production python manage.py validate_ea_data_2026 --skip-api     # offline only
    DJANGO_ENV=production python manage.py validate_ea_data_2026 --manager-sample 25
"""
import os
import time
from collections import Counter, defaultdict

import requests
from django.core.management.base import BaseCommand

from api.models import GroupSummary2026, TeampactSession2026


TEAMPACT_BASE_URL = os.environ.get(
    "TEAMPACT_API_URL_BASE", "https://teampact.co/api/analytics/v1"
)


def _teampact_headers() -> dict:
    token = os.environ.get("TEAMPACT_API_TOKEN")
    if not token:
        raise RuntimeError("TEAMPACT_API_TOKEN is not set — cannot run API checks")
    return {"Authorization": f"Bearer {token}"}


def _fetch_all_users() -> list[dict]:
    """Paginate through TeamPact /users and return the full list."""
    users: list[dict] = []
    page = 1
    while True:
        url = f"{TEAMPACT_BASE_URL}/users?page={page}&per_page=100"
        res = requests.get(url, headers=_teampact_headers(), timeout=30)
        res.raise_for_status()
        payload = res.json()
        batch = payload.get("data", [])
        if not batch:
            break
        users.extend(batch)
        meta = payload.get("meta", {})
        if meta.get("current_page", page) >= meta.get("last_page", page):
            break
        page += 1
        time.sleep(0.5)  # Rate-limit courtesy
    return users


def _fetch_group_managers(class_id: int) -> list[dict]:
    """Return the managers list for a TeamPact group (class)."""
    url = f"{TEAMPACT_BASE_URL}/groups/{class_id}"
    res = requests.get(url, headers=_teampact_headers(), timeout=30)
    res.raise_for_status()
    return res.json().get("data", {}).get("managers", []) or []


class Command(BaseCommand):
    help = "Run EA data validation checks for the My Kids feature."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-api",
            action="store_true",
            help="Skip TeamPact API checks (offline mode — only runs DB checks).",
        )
        parser.add_argument(
            "--manager-sample",
            type=int,
            default=25,
            help="How many groups to sample for the TeamPact managers check (default 25, use 0 for all).",
        )

    def handle(self, *args, **options):
        out = self.stdout.write
        skip_api = options["skip_api"]
        manager_sample = options["manager_sample"]

        out("\n=== EA Data Validation (2026) ===\n")

        # ─── DB-only checks (always run) ──────────────────────────

        total = GroupSummary2026.objects.count()
        if not total:
            out("No GroupSummary2026 rows — nothing to validate.")
            return

        # Check 5: GroupSummary rows with null class_id or ea_user_id
        missing_ea = GroupSummary2026.objects.filter(ea_user_id__isnull=True).count()
        missing_class = GroupSummary2026.objects.filter(class_id__isnull=True).count()
        out(f"Total group summaries: {total}")
        out(f"  [5a] Missing ea_user_id: {missing_ea} ({missing_ea/total*100:.1f}%)")
        out(f"  [5b] Missing class_id:   {missing_class} ({missing_class/total*100:.1f}%)")

        if missing_ea:
            out("\n  Sample rows missing ea_user_id:")
            for g in GroupSummary2026.objects.filter(ea_user_id__isnull=True)[:5]:
                out(f"    - {g.program_name} / {g.class_name} (ea_name={g.ea_name!r})")

        if missing_class:
            out("\n  Sample rows missing class_id:")
            for g in GroupSummary2026.objects.filter(class_id__isnull=True)[:5]:
                out(f"    - {g.program_name} / {g.class_name} (ea_name={g.ea_name!r})")

        # Check 4: Name-to-ID conflicts (same ea_name, multiple ea_user_ids)
        out("\n[4] Name-to-ID conflicts (same ea_name, multiple ea_user_ids):")
        name_to_ids: dict[str, set[int]] = defaultdict(set)
        for g in (
            GroupSummary2026.objects
            .exclude(ea_user_id__isnull=True)
            .exclude(ea_name="")
        ):
            name_to_ids[g.ea_name].add(g.ea_user_id)
        conflicts = {n: ids for n, ids in name_to_ids.items() if len(ids) > 1}
        if conflicts:
            for name, ids in list(conflicts.items())[:10]:
                out(f"  {name!r} -> {sorted(ids)}")
            out(f"  Total conflicts: {len(conflicts)}")
        else:
            out("  None — all EA names map to a single user_id. OK")

        # Extra check 6: Groups with >12 children
        oversized = GroupSummary2026.objects.filter(children_count__gt=12).order_by('-children_count')
        out(f"\n[6] Groups with >12 children: {oversized.count()}")
        for g in oversized[:10]:
            out(f"  - {g.children_count} kids in {g.class_name} ({g.program_name})")

        # Extra check 7: EAs with sessions but no group summary rows
        session_eas = {
            (row['user_id'], row['user_name'])
            for row in TeampactSession2026.objects
            .exclude(user_id__isnull=True)
            .values('user_id', 'user_name')
            .distinct()
        }
        eas_with_groups = set(
            GroupSummary2026.objects
            .exclude(ea_user_id__isnull=True)
            .values_list('ea_user_id', flat=True)
            .distinct()
        )
        session_only = [
            (uid, name) for (uid, name) in session_eas if uid not in eas_with_groups
        ]
        out(f"\n[7] EAs with sessions but no group summary rows: {len(session_only)}")
        for uid, name in session_only[:10]:
            out(f"  - {uid} ({name!r})")

        # ─── TeamPact API checks ──────────────────────────

        if skip_api:
            out("\n--skip-api set — skipping TeamPact API checks.")
            out("\n=== Validation complete ===\n")
            return

        out("\nFetching TeamPact users list (paginated)…")
        try:
            tp_users = _fetch_all_users()
        except Exception as e:
            out(f"  FAILED to fetch TeamPact users: {e}")
            out("  Skipping API-dependent checks. Rerun when TeamPact is reachable.")
            out("\n=== Validation complete (partial) ===\n")
            return

        out(f"  Fetched {len(tp_users)} TeamPact users.")

        coach_users = [
            u for u in tp_users
            if any(r.get("name") == "coach" for r in u.get("roles", []) or [])
        ]
        coach_by_id = {u["id"]: u for u in coach_users}
        out(f"  Of those, {len(coach_users)} have role 'coach'.")

        # Check 1: TeamPact coaches without emails
        out("\n[1] Coaches without email addresses:")
        no_email = [u for u in coach_users if not (u.get("email") or "").strip()]
        if no_email:
            for u in no_email[:20]:
                out(f"  - id={u.get('id')} name={u.get('name')!r}")
            out(f"  Total: {len(no_email)}")
        else:
            out("  None — all coaches have emails. OK")

        # Check 2: Our ea_user_ids missing from TeamPact users API
        out("\n[2] ea_user_ids in our DB but NOT in TeamPact /users:")
        our_user_ids = set(
            GroupSummary2026.objects
            .exclude(ea_user_id__isnull=True)
            .values_list('ea_user_id', flat=True)
            .distinct()
        )
        tp_user_ids = set(u["id"] for u in tp_users)
        stale = our_user_ids - tp_user_ids
        if stale:
            for uid in sorted(stale)[:20]:
                sample = (
                    GroupSummary2026.objects
                    .filter(ea_user_id=uid)
                    .values_list('ea_name', flat=True)
                    .first()
                )
                out(f"  - {uid} (ea_name={sample!r})")
            out(f"  Total stale ids: {len(stale)}")
        else:
            out("  None — all ea_user_ids exist in TeamPact. OK")

        # Check 3: Groups where primary EA doesn't match TeamPact managers
        out("\n[3] Groups where primary EA doesn't match TeamPact managers list:")
        groups_with_ids = list(
            GroupSummary2026.objects
            .exclude(ea_user_id__isnull=True)
            .exclude(class_id__isnull=True)
            .values('class_id', 'ea_user_id', 'ea_name', 'class_name', 'program_name')
        )
        if manager_sample and manager_sample > 0:
            sample_groups = groups_with_ids[:manager_sample]
            out(f"  (Sampling first {len(sample_groups)} of {len(groups_with_ids)} groups — use --manager-sample 0 to check all)")
        else:
            sample_groups = groups_with_ids
            out(f"  (Checking all {len(sample_groups)} groups)")

        mismatches = []
        for idx, g in enumerate(sample_groups, start=1):
            try:
                managers = _fetch_group_managers(g['class_id'])
            except Exception as e:
                out(f"  ! Failed to fetch group {g['class_id']}: {e}")
                continue
            manager_ids = {m.get("id") for m in managers}
            if g['ea_user_id'] not in manager_ids:
                mismatches.append({
                    "class_id": g['class_id'],
                    "class_name": g['class_name'],
                    "program_name": g['program_name'],
                    "our_ea_user_id": g['ea_user_id'],
                    "our_ea_name": g['ea_name'],
                    "tp_manager_ids": sorted(manager_ids),
                })
            if idx % 10 == 0:
                out(f"  …checked {idx}/{len(sample_groups)}")
            time.sleep(0.2)  # Rate-limit courtesy

        if mismatches:
            out(f"  Mismatches: {len(mismatches)}")
            for m in mismatches[:10]:
                out(
                    f"    - class_id={m['class_id']} ({m['class_name']}): "
                    f"ours={m['our_ea_user_id']}/{m['our_ea_name']!r} "
                    f"tp_managers={m['tp_manager_ids']}"
                )
        else:
            out("  None — all sampled groups' primary EA matches a TeamPact manager. OK")

        out("\n=== Validation complete ===\n")
```

- [ ] **Step 2: Verify the command parses**

```bash
python -c "import ast; ast.parse(open('api/management/commands/validate_ea_data_2026.py').read()); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Run the command locally (offline mode first)**

Run without TeamPact API calls so you can verify the DB-only checks quickly:
```bash
source venv/bin/activate
DJANGO_ENV=production python manage.py validate_ea_data_2026 --skip-api
```

Expected: prints DB checks 4, 5a, 5b, 6, 7. No API calls made. Review the output for unexpected counts.

- [ ] **Step 4: Run the command with TeamPact API checks**

Ensure `TEAMPACT_API_TOKEN` is set in your Django `.env` file, then run the full validation (sample 25 groups for the manager check — the default):
```bash
DJANGO_ENV=production python manage.py validate_ea_data_2026
```

Expected: runs all 7 checks, including fetching the full TeamPact users list (paginated) and checking a sample of 25 groups against TeamPact managers. Total runtime: ~1–3 minutes depending on TeamPact response times.

Save the output to a file for later reference:
```bash
DJANGO_ENV=production python manage.py validate_ea_data_2026 \
  > /tmp/ea_validation_$(date +%Y%m%d).txt
```

- [ ] **Step 5: Review anomalies**

Any anomalies surfaced here should be investigated but are NOT blockers for Phase 0 deploy (unless they indicate a bug in the compute command). The future `/pm/data-quality` page will surface these lists to the field team.

Blockers (must fix before deploy):
- Check 5a or 5b showing >10% missing → indicates a bug in `compute_group_summaries_2026`
- Check 2 showing many stale `ea_user_id`s in DB → data drift, may need a resync

Non-blockers (surface and move on):
- Checks 1, 3, 4, 6, 7 — expected to have some entries even in a healthy dataset

- [ ] **Step 6: Commit (Django repo)**

```bash
git add api/management/commands/validate_ea_data_2026.py
git commit -m "feat(api): add EA data validation checks command with TeamPact API checks"
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
- [ ] **Automated tests** for the middleware pass (`api.tests_middleware`).
- [ ] `GroupSummary2026` has `ea_user_id` and `class_id` columns populated for ≥90% of rows.
- [ ] The `compute_group_summaries_2026` command populates both fields on every run.
- [ ] **Automated tests** for `compute_group_letter_mastery` pass (`api.tests_ea_mastery`).
- [ ] `/api/ea/<user_id>/` returns the expected shape with real production data.
- [ ] `/api/ea/<user_id>/groups/<class_id>/` returns the expected shape including `children`, `recent_sessions`, and `letter_mastery`.
- [ ] Scoping is enforced: requesting a `class_id` that doesn't belong to the given `user_id` returns 404.
- [ ] **Automated tests** for both views pass (`api.tests_ea_views`), including 401, 404, scoping, and shape checks.
- [ ] Both views log `user_id` and `class_id` on every call (`api.ea` logger).
- [ ] PM pages (`/pm/*`) and `/schools-2026` still load correctly (regression check).
- [ ] `validate_ea_data_2026` command runs successfully (with `--skip-api` and full mode) and surfaces known anomalies for future investigation.
- [ ] Full test suite passes: `python manage.py test api`.

---

## Next Plan

Once Phase 0 is complete and verified, the next plan (`docs/superpowers/plans/YYYY-MM-DD-ea-my-kids-phase1a.md`) will cover:

- Adding the `ea` role to the Clerk/middleware hierarchy
- Preloading EA accounts in Clerk with `teampact_user_id`
- Creating the standalone `/my-kids/*` layout
- Login redirect precedence (`redirect_url` > role default)
- "Not linked" and "backend error" edge states

Phase 1A does not touch any data models or endpoints — it is pure frontend auth + layout work built on the Phase 0 foundation.
