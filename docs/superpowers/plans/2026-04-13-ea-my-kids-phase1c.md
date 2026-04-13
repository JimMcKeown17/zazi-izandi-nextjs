# EA My Kids — Phase 1C: Group Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/my-kids/groups/[class_id]` group detail page (Phase 1C) AND the matching PM-side route at `/pm/education-assistants/[user-id]/groups/[class_id]` (Phase 1D-lite), both rendering from the same shared components in `components/group-detail/`. The detail page shows: header with all applicable coaching tips (including per-child alignment signals), a `LetterMasteryPath` visualization of the full language-appropriate alphabet, a children list sorted by attendance (with per-child alignment flags), and the last 10 sessions with expandable per-child attendance.

**Architecture:** Server components read Clerk session + route params and call Django `/api/ea/<user_id>/groups/<class_id>/` via a new `React.cache()`-wrapped fetcher `getGroupDetail()` in `lib/ea/api.ts`. All detail-page components are context-agnostic and live in `components/group-detail/` — they render identically inside the `/my-kids` layout (top bar) and the `/pm` layout (sidebar), with only the "back" link differing per route and a PM-only `FlagPillStrip` rendered above the coaching panel. The `LetterMasteryPath` renders the full language-appropriate alphabet as a wrapped grid (≈5 cells per row) by reading from a Django helper that returns ALL letters in the pedagogical sequence — including not-yet-started ones as grey cells. Coaching tips follow the priority order set out in `documentation/letter-mastery-data-model.md` § "Two interpretable signals": **(1) curriculum coverage signals** (`letters_skipped`, `flag_curriculum_gaps`) are the strongest and highest-priority — they're factual statements about EA teaching behavior measured against the programme order, with no inference about child knowledge; **(2) drilling-known-letters signals** (`teaching_known_letters`) are surfaced as a minor secondary observation. Nothing may claim what children currently know — only what they knew at baseline. The PM detail page additionally surfaces raw flag labels via `FlagPillStrip` for fast scanning.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Lucide icons, `djangoFetch` helper, `React.cache()` for request dedup. Backend: Django REST, `GroupSummary2026`, `TeampactSession2026`, `ChildLetterAlignment2026` models, existing `api/ea_mastery.py` helper, existing `api/letter_constants.py` language sequences.

**Related spec:** `docs/superpowers/specs/2026-04-09-ea-my-kids-design.md` sections 4–7.

**Mastery-data constraints (load-bearing):** `documentation/letter-mastery-data-model.md` — this doc governs every string rendered on this page. There are TWO interpretable signal categories: **Category A — curriculum coverage** (`letters_skipped`, `flag_curriculum_gaps`) is the primary coaching signal, framed as factual statements about EA teaching behavior; **Category B — baseline mastery** (`teaching_known_letters`, `letters_mastered`) is a minor secondary signal, requires past-tense framing like "known at baseline" / "knew at baseline assessment". UI copy MUST NOT claim "children aren't learning", "struggling with letter X", or anything implying current knowledge state — we only have baseline assessment data, not post-baseline. The CoachingTipPanel must render curriculum tips first, group flag tips second, drilling-known-letters tips last.

**Prerequisite:** Phase 1B deployed and verified (2026-04-12). Django `/api/ea/<user_id>/groups/<class_id>/` view already exists but needs three small changes before frontend can build faithfully (Tasks 1–4). The language sequences for isiXhosa, English, and Afrikaans are already in the Django helper — ECD groups use the isiXhosa sequence (no special handling).

**Phases not covered:** Full Phase 1D (PM EA detail panel with scatter-plot enhancements, progress bars on each group row in the existing `/pm/education-assistants` page) — this is tracked separately. This plan delivers 1D-lite: just the new `/pm/education-assistants/[user-id]/groups/[class_id]` route reusing the same components as the EA view.

---

## Scope and Ordering

Phase 1C is organized into five groups of tasks:

1. **Django backend prep** (Tasks 1–4) — three view/helper changes land as a single Django PR, then deploy and verify.
2. **Next.js data layer + refactor** (Tasks 5–7) — extend types, add the `getGroupDetail` fetcher, and move shared components into `components/group-detail/` (including a small refactor of Phase 1B code to consolidate `CoachingTip` and `StatusBadge` at the new shared location).
3. **Detail-page UI components** (Tasks 8–13) — header, coaching tip panel, letter mastery path, children list, recent sessions, PM-only flag pill strip. All server-renderable except where native HTML `<details>` handles interactivity.
4. **Route wiring** (Tasks 14–17) — EA route, `GroupCard` click-through, PM EA detail page (1D-lite stub), PM group detail route (1D-lite).
5. **Verification + deploy** (Tasks 18–20) — Playwright e2e regression, manual smoke test, merge + deploy.

Each task produces a self-contained, independently testable piece. Tasks 1–4 (Django) land in a separate PR on the Django repo BEFORE any Next.js work starts — the Next.js types and fetcher depend on the new contract. Tasks 5–17 land in a single Next.js feature branch (`ea-phase1c-detail`).

**Deliberately deferred:**

- Full Phase 1D scatter-plot enhancements (progress bars on each group row in `/pm/education-assistants`, click-through from scatter dots)
- Write-side mastery capture (EAs marking letters as mastered from the detail page) — per `documentation/letter-mastery-data-model.md` § "Future", this requires its own workstream with offline-first considerations
- Child-level intervention tracking
- Any AI-generated coaching tips (Phase 2+)

---

## File Structure

### Django repo (`/Users/jimmckeown/Development/Zazi_iZandi_Website_2025`)

**Modify:**

- `api/ea_mastery.py` — `compute_group_letter_mastery()` helper. Remove the empty-letter skip so all letters in the language sequence are returned (with zero values for untouched ones).
- `api/views.py` — `ea_group_detail` view function. (a) Add per-child alignment data from `ChildLetterAlignment2026` to each item in the `children` list. (b) Include baseline-assessed children who never attended a session in the `children` list.
- `api/tests_ea_views.py` — extend existing tests to cover the new fields.

**Note:** Phase 1B already added `ea_user_id` and `class_id` columns to `GroupSummary2026` and built the `ea_group_detail` view itself. No new fields on the model. No schema migration. Just view/helper logic changes.

### Next.js repo (`/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs`)

**Create:**

- `components/group-detail/coaching-tip.tsx` — **moved** from `components/my-kids/coaching-tip.tsx`. Same content.
- `components/group-detail/status-badge.tsx` — **extracted** from the internal helper in `components/my-kids/group-card.tsx`.
- `components/group-detail/group-detail-header.tsx` — back arrow + group name (EA prefix stripped) + grade + school + status badge + sessions/children counts.
- `components/group-detail/coaching-tip-panel.tsx` — aggregates curriculum coverage tip (highest priority), group-level flag tips, and per-child drilling-known-letters tip into one section.
- `components/group-detail/letter-mastery-path.tsx` — the "stepping stones" visualization. Wrapped grid of letter cells with mastery colour coding, session dots, legend, no-assessment fallback. Blending groups never receive this component (hidden at the page level).
- `components/group-detail/children-list.tsx` — children sorted by attendance ascending, with ⚠ for low attendance or never-attended, per-child curriculum-gap and drilling-known badges inline.
- `components/group-detail/recent-sessions.tsx` — last 10 sessions with session notes and a `<details>`/`<summary>` expandable attendee list.
- `components/group-detail/flag-pill-strip.tsx` — PM-only raw flag label strip (per data doc § "For mentor / PM / funder-facing copy"). Renders only on the PM detail route, not the EA route.
- `app/my-kids/groups/[class_id]/page.tsx` — EA detail route.
- `app/pm/education-assistants/[user-id]/page.tsx` — minimal PM EA detail page (1D-lite stub). Renders EA name + group list. Full Phase 1D will expand this.
- `app/pm/education-assistants/[user-id]/groups/[class_id]/page.tsx` — PM group detail route (1D-lite). Reuses shared components, adds `FlagPillStrip` for raw flag labels.

**Modify:**

- `lib/ea/types.ts` — add `EaChildAlignment`, `EaChild`, `EaLetterMastery`, `EaSessionAttendee`, `EaSession`, `EaGroupProgress`, `EaGroupDetail` types.
- `lib/ea/api.ts` — add `EaGroupDetailResult` type and `getGroupDetail(userId, classId)` fetcher (wrapped in `React.cache()`, with explicit 404 handling for the "not this EA's group" redirect path).
- `components/my-kids/group-card.tsx` — update imports to pull `CoachingTip`, `getTopFlag`, and `StatusBadge` from the new `components/group-detail/` location. Wrap the `<article>` in a `<Link>` to enable click-through to the detail page when `class_id` is non-null.

**Delete:**

- `components/my-kids/coaching-tip.tsx` — replaced by `components/group-detail/coaching-tip.tsx` (Task 7 moves it, then deletes the old file).

**No changes to:** `middleware.ts` (existing `/my-kids*` and `/pm*` matchers already cover the new routes), `app/my-kids/layout.tsx`, `app/my-kids/page.tsx`, `app/pm/layout.tsx`, `app/pm/education-assistants/page.tsx`, `lib/django-fetch.ts`.

---

## Django API Response Reference (post-prep)

After Tasks 1–3 land, `GET /api/ea/<user_id>/groups/<class_id>/` returns this shape. This is the contract the Next.js types must match.

```json
{
  "class_id": 67982,
  "group_name": "Shadey Africander-Letters-Group 1",
  "school_name": "Abraham Levy Primary School",
  "grade": "Grade R",
  "phase": "letters",
  "language": "isiXhosa",
  "progress": {
    "current_letter": "h",
    "progress_index": 11,
    "progress_pct": 44
  },
  "avg_sessions_per_week": 1.92,
  "sessions_this_week": 2,
  "total_sessions": 5,
  "flags": ["curriculum_gaps"],
  "children": [
    {
      "participant_id": 28741,
      "name": "Lerato Mokoena",
      "sessions_attended": 2,
      "sessions_total": 5,
      "attendance_rate": 0.4,
      "last_attended": "2026-04-09",
      "alignment": {
        "flag_teaching_known": true,
        "flag_skipping_needed": false,
        "teaching_known_letters": ["a", "e"],
        "letters_skipped": [],
        "alignment_score": 67
      }
    }
  ],
  "recent_sessions": [
    {
      "session_id": 9912731,
      "date": "2026-04-10",
      "letters_taught": ["h"],
      "attendance_count": 5,
      "attendance_total": 7,
      "notes": "",
      "attendees": [
        { "participant_id": 28741, "name": "Lerato Mokoena", "present": true }
      ]
    }
  ],
  "letter_mastery": [
    {
      "letter": "a",
      "children_mastered": 5,
      "children_total": 7,
      "mastery_pct": 71,
      "sessions_taught": 2
    }
  ]
}
```

**Critical notes:**

- `letter_mastery` is ordered by the Django language sequence (`api/letter_constants.py`) and contains **all letters in the sequence**, not just letters with data. Untouched letters have `children_mastered: 0, sessions_taught: 0`.
- `children` is sorted by attendance rate ascending (lowest first) at the Django layer — the frontend does not re-sort.
- `children[].alignment` is `null` for children who do not have a row in `ChildLetterAlignment2026` (i.e., never completed a baseline assessment).
- `recent_sessions` is newest-first, capped at 10 entries.
- `class_id` on the top-level response is `number | null` (nullable on the Django model).
- `notes` on a session is `string` — empty string when no note exists (not `null`).
- 404 response means the `class_id` does not belong to this user. The frontend must handle this as "redirect to `/my-kids`" for EA view or "redirect to `/pm/education-assistants`" for PM view.

### Available flags (group-level)

Same as Phase 1B: `moving_too_fast`, `stagnation`, `curriculum_gaps`, `ghost_group`. These surface as group-level coaching tips on the detail page.

### Per-child alignment flags

New for Phase 1C: `children[].alignment.flag_teaching_known` and `children[].alignment.flag_skipping_needed`. These are aggregated on the frontend side into per-group coaching tips like "3 of 7 children are being drilled on letters they already knew at baseline — Lerato, Sipho, Asanda".

---

## Task 1: Django — fix `compute_group_letter_mastery` (full sequence + correct denominator)

**Goal:** Two fixes to the helper, both essential for the frontend to render correct mastery percentages:

1. **Return every letter in the language sequence** regardless of whether it has any mastery or session data. Untouched letters are returned with `children_mastered: 0, sessions_taught: 0`, which lets the frontend render them as grey "not yet" cells.
2. **Fix the denominator bug.** The current helper uses `group_summary.children_count` (session-derived — the count of unique participants who have appeared in any session row for this group). The numerator (`letter_mastery_counts`) is computed from `ChildLetterAlignment2026.objects.filter(...)` — the count of children with baseline assessment rows. These two data sources can disagree: a baseline-assessed child who never attended a session is in the numerator pool but NOT in the denominator. This causes mastery_pct to over-report (sometimes >100% in edge cases) because there are more in the numerator than the denominator can fit.

The fix is to compute `children_total` from the same `ChildLetterAlignment2026` query that produces the numerator. Then `children_total` semantically means "the assessed cohort size" — the kids we have baseline data for. The mastery percentage answers the meaningful question: "of children we measured at baseline, how many knew this letter?"

**Side benefit:** with this fix, the frontend can detect "no assessments exist" via `letter_mastery[0].children_total === 0` — a much cleaner signal than the previous `mastery_pct > 0` heuristic. This is the basis for the no-assessment fallback in Task 10.

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/ea_mastery.py`
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/tests_ea_views.py` (or wherever the helper is tested — check with `grep compute_group_letter_mastery` in the api/ tests directory)

**Working directory:** `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025`

- [ ] **Step 1: Create a Django feature branch**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
source venv/bin/activate
git checkout main
git pull --ff-only
git checkout -b ea-phase1c-prep
```

- [ ] **Step 2: Replace `children_total` with the assessed-cohort count and remove the empty-letter skip**

Open `api/ea_mastery.py`. Find the line near the top of the function (around line 42):

```python
    children_total = group_summary.children_count or 0
```

DELETE this line. We're going to compute `children_total` from the alignment query instead, after the alignment query runs.

Then find the alignment query block (around lines 64–77 — the `alignment_qs = ChildLetterAlignment2026.objects.filter(...)` block). After the existing query, ADD the new `children_total` line:

```python
    # --- Per-letter mastery counts (how many children mastered each letter) ---
    # ChildLetterAlignment2026 has no class_id; use program_name + class_name.
    alignment_qs = ChildLetterAlignment2026.objects.filter(
        program_name=group_summary.program_name,
        class_name=group_summary.class_name,
    )

    # children_total is the count of children with baseline assessment rows
    # for this group. This MUST be the denominator for mastery_pct so that
    # numerator (also from alignment_qs) and denominator come from the same
    # data source. Using group_summary.children_count (session-derived) here
    # would mix two cohorts and over-report mastery percentages.
    children_total = alignment_qs.count()

    letter_mastery_counts: Counter = Counter()
    for row in alignment_qs.only("letters_mastered"):
        ...
```

Then find lines 79–95 (the result-building loop). The current code has:

```python
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

Replace with (delete the `if mastered == 0 and taught == 0: continue` block):

```python
    # --- Build the result in letter_sequence order ---
    # Every letter in the sequence is included, even when it has no mastery
    # or session data yet, so the frontend can render a full alphabet grid
    # with "not yet reached" cells shown in grey.
    result: List[Dict[str, Any]] = []
    for letter in letter_sequence:
        mastered = letter_mastery_counts.get(letter.lower(), 0)
        taught = letter_session_counts.get(letter.lower(), 0)
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

Also update the function docstring. Find the lines starting with `"""Return a list of per-letter mastery dicts for the given group.` near line 21 and replace the section starting with `The list is ordered by the group's language letter sequence, and` and ending with `whether any entry has mastery_pct > 0 or children_mastered > 0.` with:

```
    The list is ordered by the group's language letter sequence and includes
    every letter in the sequence, regardless of whether it has mastery or
    session data. Letters with no data yet have mastery_pct=0 and
    sessions_taught=0 — the frontend renders these as grey "not yet reached"
    cells.

    children_total is the count of children with ChildLetterAlignment2026
    rows for this group (the "assessed cohort"). It MUST be derived from
    the same query as the numerator so that mastery percentages are
    arithmetically consistent. Using group_summary.children_count
    (session-derived) here would mix two cohorts and over-report.

    Callers can detect the "no assessment data" state by checking whether
    children_total == 0 — that's the reliable signal, not mastery_pct.
```

- [ ] **Step 3: Find the existing test for `compute_group_letter_mastery`**

Run:

```bash
grep -rn "compute_group_letter_mastery\|letter_mastery" api/tests*.py api/test*/ 2>&1
```

Note the test file path(s) that exercise this helper or the endpoint.

- [ ] **Step 4: Add two tests**

In the file identified in Step 3, add (or extend) two test cases:

**Test A: Full sequence is returned**

```python
def test_compute_group_letter_mastery_returns_full_language_sequence(self):
    """
    After the Phase 1C-prep fix, every letter in the language sequence
    is returned, including letters with no data yet (so the frontend can
    render them as grey "not yet reached" cells).
    """
    from api.letter_constants import get_sequence
    from api.ea_mastery import compute_group_letter_mastery
    # Use an existing test group. Set up sessions that teach only one letter
    # so most of the sequence should come back empty.
    group = self.create_test_group(language="isiXhosa")  # or whatever factory/fixture exists
    self.create_session(group, letters_taught="a")
    result = compute_group_letter_mastery(group.class_id, group)
    assert len(result) == len(get_sequence("isiXhosa"))
    # The letter "a" should have at least one session taught
    a_entry = next(r for r in result if r["letter"] == "a")
    assert a_entry["sessions_taught"] >= 1
    # Letters not yet touched should be present with zeros
    untouched = [r for r in result if r["letter"] != "a"]
    assert all(r["sessions_taught"] == 0 and r["mastery_pct"] == 0 for r in untouched)
```

**Test B: mastery_pct denominator uses the assessed cohort, not session-attending count**

This is the regression guard for Finding 1. It exists specifically so a future refactor can't silently re-introduce the session-derived denominator.

```python
def test_compute_group_letter_mastery_denominator_is_assessed_cohort(self):
    """
    The mastery_pct denominator must be the count of children with
    ChildLetterAlignment2026 rows (the assessed cohort), NOT the
    session-derived group_summary.children_count. Mixing the two
    sources causes mastery percentages to over-report.
    """
    from api.models import ChildLetterAlignment2026
    from api.ea_mastery import compute_group_letter_mastery
    # Create a group with 5 session-attending children (group_summary.children_count = 5).
    group = self.create_test_group(language="isiXhosa", children_count=5)
    # Create 7 ChildLetterAlignment2026 rows for this group:
    # 5 of them correspond to attending children, 2 are baseline-only.
    for pid in [101, 102, 103, 104, 105, 201, 202]:
        ChildLetterAlignment2026.objects.create(
            participant_id=pid,
            program_name=group.program_name,
            class_name=group.class_name,
            language="isiXhosa",
            letters_mastered=["a"],  # all 7 know letter "a"
            letters_taught=[],
            letters_needed=[],
            letters_skipped=[],
            teaching_known_letters=[],
            flag_teaching_known=False,
            flag_skipping_needed=False,
            alignment_score=0,
        )
    result = compute_group_letter_mastery(group.class_id, group)
    a_entry = next(r for r in result if r["letter"] == "a")
    # Numerator is 7 (all 7 alignment rows have "a")
    assert a_entry["children_mastered"] == 7
    # Denominator MUST be 7 (assessed cohort), not 5 (session-attending)
    assert a_entry["children_total"] == 7, (
        f"children_total should be 7 (assessed cohort), got {a_entry['children_total']}. "
        "If this is 5, the helper has reverted to the session-derived denominator and "
        "mastery_pct will over-report. See Phase 1C plan Finding 1."
    )
    # And mastery_pct = 7/7 = 100%
    assert a_entry["mastery_pct"] == 100
```

Adjust both tests to match the existing test helpers (`create_test_group`, `create_session`, etc.) that are already present in the test file. The test file was identified in Step 3.

- [ ] **Step 5: Run the tests**

```bash
DJANGO_SETTINGS_MODULE=zazi.settings python manage.py test api.tests_ea_views -v 2
```

Expected: all existing tests still pass AND the new test passes.

If `DJANGO_SETTINGS_MODULE=zazi.settings` is wrong, check with `ls zazi/settings.py` or look at `manage.py` for the correct settings module.

- [ ] **Step 6: Commit**

```bash
git add api/ea_mastery.py api/tests_ea_views.py api/tests_ea_mastery.py
git commit -m "fix(ea): return full sequence and use assessed-cohort denominator in compute_group_letter_mastery"
```

---

## Task 2: Django — add per-child alignment data to `ea_group_detail`

**Goal:** Each child in the `children` list gains an `alignment` sub-object populated from `ChildLetterAlignment2026`, or `null` if the child has no alignment row. This data powers the per-child coaching tips on the detail page (Q2 wide reading).

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/views.py` (function `ea_group_detail`)
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/tests_ea_views.py`

- [ ] **Step 1: Update `ea_group_detail` to load alignment data**

Open `api/views.py` and find the `ea_group_detail` function around line 1605. The function currently builds the `children` list by aggregating `TeampactSession2026` rows (lines 1719–1757) and then returns the response at the bottom (lines 1762–1789).

Add a new step between the children-list build and the response assembly: query `ChildLetterAlignment2026` for the group's children, build a `participant_id → alignment` dict, and attach the alignment to each child.

First, update the existing import line at the top of the `ea_group_detail` function (around line 1620) to include the new model. Find:

```python
    from api.models import GroupSummary2026, TeampactSession2026
```

Replace with:

```python
    from api.models import GroupSummary2026, TeampactSession2026, ChildLetterAlignment2026
```

Then, after line 1757 (the `children.sort(...)` call) and before line 1759 (`# --- Letter mastery ---`), insert:

```python
    # --- Per-child alignment data ---
    alignment_rows = (
        ChildLetterAlignment2026.objects
        .filter(
            program_name=group.program_name,
            class_name=group.class_name,
        )
        .values(
            'participant_id',
            'flag_teaching_known',
            'flag_skipping_needed',
            'teaching_known_letters',
            'letters_skipped',
            'alignment_score',
        )
    )
    alignment_by_pid: dict = {}
    for row in alignment_rows:
        pid = row['participant_id']
        if pid is None:
            continue
        alignment_by_pid[pid] = {
            'flag_teaching_known': bool(row['flag_teaching_known']),
            'flag_skipping_needed': bool(row['flag_skipping_needed']),
            'teaching_known_letters': row['teaching_known_letters'] or [],
            'letters_skipped': row['letters_skipped'] or [],
            'alignment_score': row['alignment_score'] or 0,
        }

    # Attach alignment to each child (or None if no row)
    for child in children:
        child['alignment'] = alignment_by_pid.get(child['participant_id'])
```

Note: Task 3 will further expand this block to include non-attending assessed children. For now, just commit Task 2's version — the alignment data attaches only to children already in the list.

- [ ] **Step 2: Update the test**

In `api/tests_ea_views.py`, find the existing tests for `ea_group_detail` (search for `def test_ea_group_detail` or similar). Add a new test that creates a `ChildLetterAlignment2026` row and asserts it surfaces in the response.

```python
def test_ea_group_detail_includes_per_child_alignment(self):
    """Each child in the response should have an alignment sub-object when
    ChildLetterAlignment2026 has a row, or None otherwise."""
    from api.models import ChildLetterAlignment2026
    # Use whatever fixture/factory the test class already uses for groups + children
    group = self.test_group  # or .group, or .create_test_group(...) — match existing tests
    child_pid = self.test_child_pid  # participant_id known to the test fixture
    ChildLetterAlignment2026.objects.create(
        participant_id=child_pid,
        program_name=group.program_name,
        class_name=group.class_name,
        language="isiXhosa",
        letters_mastered=["a", "e"],
        letters_taught=["a", "e", "i"],
        letters_needed=["i"],
        letters_skipped=[],
        teaching_known_letters=["a", "e"],
        flag_teaching_known=True,
        flag_skipping_needed=False,
        alignment_score=67,
    )
    # Call the endpoint
    url = f"/api/ea/{group.ea_user_id}/groups/{group.class_id}/"
    response = self.client.get(
        url,
        HTTP_X_INTERNAL_AUTH=settings.INTERNAL_API_SECRET,
    )
    assert response.status_code == 200
    payload = response.json()
    matching = [c for c in payload["children"] if c["participant_id"] == child_pid]
    assert len(matching) == 1
    alignment = matching[0]["alignment"]
    assert alignment is not None
    assert alignment["flag_teaching_known"] is True
    assert alignment["flag_skipping_needed"] is False
    assert alignment["teaching_known_letters"] == ["a", "e"]
    assert alignment["alignment_score"] == 67
    # Child without an alignment row should have alignment=None
    others = [c for c in payload["children"] if c["participant_id"] != child_pid]
    if others:
        assert all(c["alignment"] is None for c in others)
```

Match the factory/fixture naming to what already exists in the test file. If the existing tests use `self.setUp()` to create test data, reuse those entities; do not duplicate fixtures.

- [ ] **Step 3: Run the tests**

```bash
DJANGO_SETTINGS_MODULE=zazi.settings python manage.py test api.tests_ea_views -v 2
```

Expected: existing tests still pass and the new test passes.

- [ ] **Step 4: Commit**

```bash
git add api/views.py api/tests_ea_views.py
git commit -m "feat(ea): attach per-child alignment data to ea_group_detail response"
```

---

## Task 3: Django — include non-attending assessed children in the list

**Goal:** A child who has completed a baseline assessment (has a `ChildLetterAlignment2026` row for this group) but has never attended a session must still appear in the `children` list with zero attendance counts. Currently the list is built from session-attendance rows only, so these children are invisible — but they are the most at-risk kids in the group.

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/views.py` (function `ea_group_detail`)
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/tests_ea_views.py`

- [ ] **Step 1: Merge assessed-but-never-attended children into the list**

In `ea_group_detail` (in `api/views.py`), Task 2 added the `alignment_by_pid` dict between the sort and the letter-mastery compute. Now also ensure that any participant in `alignment_by_pid` who is NOT yet in the `children` list gets added as a zero-attendance row BEFORE the attach-alignment loop. Names for these non-attending children come from `TeampactParticipant.name` (the canonical TeamPact participant table — `ChildLetterAlignment2026` does not have a name field, but `TeampactParticipant` does, keyed on `participant_id`).

Replace the block added in Task 2 with this expanded version. Find:

```python
    # --- Per-child alignment data ---
    from api.models import ChildLetterAlignment2026
    ...
    # Attach alignment to each child (or None if no row)
    for child in children:
        child['alignment'] = alignment_by_pid.get(child['participant_id'])
```

Replace with:

```python
    # --- Per-child alignment data ---
    alignment_rows = (
        ChildLetterAlignment2026.objects
        .filter(
            program_name=group.program_name,
            class_name=group.class_name,
        )
        .values(
            'participant_id',
            'flag_teaching_known',
            'flag_skipping_needed',
            'teaching_known_letters',
            'letters_skipped',
            'alignment_score',
        )
    )
    alignment_by_pid: dict = {}
    for row in alignment_rows:
        pid = row['participant_id']
        if pid is None:
            continue
        alignment_by_pid[pid] = {
            'flag_teaching_known': bool(row['flag_teaching_known']),
            'flag_skipping_needed': bool(row['flag_skipping_needed']),
            'teaching_known_letters': row['teaching_known_letters'] or [],
            'letters_skipped': row['letters_skipped'] or [],
            'alignment_score': row['alignment_score'] or 0,
        }

    # Build a set of participant_ids already in the children list
    existing_pids = {c['participant_id'] for c in children}

    # Find participant_ids that need a name lookup (assessed but never attended)
    missing_pids = [pid for pid in alignment_by_pid.keys() if pid not in existing_pids]

    # Look up names from TeampactParticipant for assessed-but-never-attended kids
    name_by_pid: dict = {}
    if missing_pids:
        from api.models import TeampactParticipant
        for row in TeampactParticipant.objects.filter(
            participant_id__in=missing_pids
        ).values('participant_id', 'name'):
            name_by_pid[row['participant_id']] = row['name'] or ''

    # Add assessed-but-never-attended children at the top of the list
    # (they have the lowest attendance — zero — and should be surfaced first).
    for pid in missing_pids:
        children.append({
            'participant_id': pid,
            'name': name_by_pid.get(pid) or f'Child #{pid}',
            'sessions_attended': 0,
            'sessions_total': 0,
            'attendance_rate': 0,
            'last_attended': None,
        })

    # Re-sort after the merge (attendance rate ascending, then sessions attended descending)
    children.sort(key=lambda c: (c['attendance_rate'], -c['sessions_attended']))

    # Attach alignment to each child (None if no alignment row)
    for child in children:
        child['alignment'] = alignment_by_pid.get(child['participant_id'])
```

The `TeampactParticipant` import is done lazily inside the `if missing_pids:` block — only loads the model when there's actually a non-attending child to look up. The existing top-level import line from Task 2 stays as-is.

**Why `TeampactParticipant`:** verified by inspection of `api/models.py` line 602 — `TeampactParticipant` is the canonical source of TeamPact learner names, keyed on `participant_id`, and synced from the TeamPact `/participants` endpoint. `ChildLetterAlignment2026` does not have a `name` field. The fallback `f'Child #{pid}'` handles the rare case where a participant has an alignment row but no `TeampactParticipant` row yet.

- [ ] **Step 2: Update the test to cover the non-attender case**

Add a new test that creates an alignment row for a participant who has no session rows and asserts that participant still appears in the children list with zero attendance.

```python
def test_ea_group_detail_includes_assessed_children_with_no_sessions(self):
    """A child with a ChildLetterAlignment2026 row but no TeampactSession2026
    rows should still appear in the children list with zero attendance.
    Their name comes from TeampactParticipant (the canonical name source)."""
    from api.models import ChildLetterAlignment2026, TeampactParticipant
    group = self.test_group
    never_attended_pid = 999999  # a participant_id not in any session fixture
    TeampactParticipant.objects.create(
        participant_id=never_attended_pid,
        name="Absent Angela",
        org_id=1,  # required field on TeampactParticipant; pick any test value
    )
    ChildLetterAlignment2026.objects.create(
        participant_id=never_attended_pid,
        program_name=group.program_name,
        class_name=group.class_name,
        language="isiXhosa",
        letters_mastered=[],
        letters_taught=[],
        letters_needed=["a"],
        letters_skipped=[],
        teaching_known_letters=[],
        flag_teaching_known=False,
        flag_skipping_needed=False,
        alignment_score=0,
    )
    url = f"/api/ea/{group.ea_user_id}/groups/{group.class_id}/"
    response = self.client.get(
        url,
        HTTP_X_INTERNAL_AUTH=settings.INTERNAL_API_SECRET,
    )
    assert response.status_code == 200
    payload = response.json()
    never_attended = [c for c in payload["children"] if c["participant_id"] == never_attended_pid]
    assert len(never_attended) == 1
    child = never_attended[0]
    assert child["name"] == "Absent Angela"
    assert child["sessions_attended"] == 0
    assert child["sessions_total"] == 0
    assert child["attendance_rate"] == 0
    assert child["last_attended"] is None
    # Should be sorted near the top of the list (lowest attendance)
    assert payload["children"][0]["attendance_rate"] == 0
```

**Note on `TeampactParticipant.objects.create`:** the model has two required fields without defaults: `participant_id` (PK) and `org_id` (IntegerField, indexed, no default). All other fields are nullable or have defaults. The test fixture above passes `org_id=1` which is sufficient — adjust if existing test fixtures use a specific org_id.

- [ ] **Step 3: Run the tests**

```bash
DJANGO_SETTINGS_MODULE=zazi.settings python manage.py test api.tests_ea_views -v 2
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add api/views.py api/tests_ea_views.py
git commit -m "feat(ea): include assessed-but-never-attended children in group detail"
```

---

## Task 4: Django — push, merge, deploy, verify

**Goal:** Land Tasks 1–3 on the Django `main` branch, deploy to Render, and verify the new response shape is live.

- [ ] **Step 1: Run the full test suite one more time**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
source venv/bin/activate
DJANGO_SETTINGS_MODULE=zazi.settings python manage.py test api -v 2
```

Expected: everything green. If anything is red, stop and fix before pushing.

- [ ] **Step 2: Push the Django feature branch**

```bash
git push -u origin ea-phase1c-prep
```

- [ ] **Step 3: Merge to main**

```bash
git checkout main
git pull --ff-only
git merge --no-ff ea-phase1c-prep -m "Merge ea-phase1c-prep: extend ea_group_detail for Phase 1C"
git push origin main
```

- [ ] **Step 4: Wait for Render deploy**

Watch the Django service dashboard on Render. The deploy should run migrations (none in this case) and restart the service. Estimate 2–4 minutes.

- [ ] **Step 5: Verify the new response shape live**

With a known-good user_id (28739, Shadey) and a known class_id from Shadey's groups, call the endpoint:

```bash
# Get INTERNAL_API_SECRET from the Render dashboard or .env
curl -s "https://<your-django-host>/api/ea/28739/groups/<class_id>/" \
  -H "X-Internal-Auth: $INTERNAL_API_SECRET" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert 'letter_mastery' in d
assert 'children' in d
print('letter_mastery length:', len(d['letter_mastery']))
# Expect full language sequence (26 for isiXhosa, 26 for English, 22 for Afrikaans)
print('first letter entry:', d['letter_mastery'][0] if d['letter_mastery'] else None)
print('children count:', len(d['children']))
first_child = d['children'][0] if d['children'] else None
if first_child:
    print('first child has alignment key:', 'alignment' in first_child)
    print('first child alignment:', first_child.get('alignment'))
"
```

Expected:
- `letter_mastery length: 26` for isiXhosa (or 22 for Afrikaans)
- First child should have `'alignment' in first_child == True`
- Some children may have `alignment: null` and others a full object

If any assertion fails, stop and investigate — do not proceed to Task 5 with a broken Django contract.

- [ ] **Step 6: Verify Phase 1B still works**

Open `https://zazi-izandi.co.za/my-kids`, sign in as the linked test EA. Expect the overview page to still render correctly — the Phase 1B frontend is unchanged and the Phase 1B endpoint (`/api/ea/<user_id>/`) is unchanged by this Django PR.

- [ ] **Step 7: Delete the Django feature branch**

```bash
git branch -d ea-phase1c-prep
```

---

## Task 5: Next.js — extend `lib/ea/types.ts` with group detail types

**Goal:** Add TypeScript types matching the Django response shape after Tasks 1–3. All new types live in the existing `lib/ea/types.ts` file alongside the Phase 1B types.

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/lib/ea/types.ts`

**Working directory:** `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs`

- [ ] **Step 1: Create the Next.js feature branch**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs
git checkout main
git pull --ff-only
git checkout -b ea-phase1c-detail
```

- [ ] **Step 2: Read the existing types file**

Read `lib/ea/types.ts` to see the Phase 1B types and the export order. You'll append the new types at the bottom without touching the existing ones.

- [ ] **Step 3: Append the new types**

Add the following block at the end of `lib/ea/types.ts` (after the existing `EaOverviewResponse` interface):

```typescript
// --- Phase 1C: Group Detail types ---

export interface EaChildAlignment {
  flag_teaching_known: boolean;
  flag_skipping_needed: boolean;
  teaching_known_letters: string[];
  letters_skipped: string[];
  alignment_score: number;
}

export interface EaChild {
  participant_id: number;
  name: string;
  sessions_attended: number;
  sessions_total: number;
  attendance_rate: number;
  last_attended: string | null;
  alignment: EaChildAlignment | null;
}

export interface EaLetterMastery {
  letter: string;
  children_mastered: number;
  children_total: number;
  mastery_pct: number;
  sessions_taught: number;
}

export interface EaSessionAttendee {
  participant_id: number;
  name: string;
  present: boolean;
}

export interface EaSession {
  session_id: number;
  date: string | null;
  letters_taught: string[];
  attendance_count: number;
  attendance_total: number;
  notes: string;
  attendees: EaSessionAttendee[];
}

export interface EaGroupProgress {
  current_letter: string;
  progress_index: number;
  progress_pct: number;
}

export interface EaGroupDetail {
  class_id: number | null;
  group_name: string;
  school_name: string;
  grade: string;
  phase: "letters" | "blending";
  language: string;
  progress: EaGroupProgress;
  avg_sessions_per_week: number;
  sessions_this_week: number;
  total_sessions: number;
  flags: EaFlag[];
  children: EaChild[];
  recent_sessions: EaSession[];
  letter_mastery: EaLetterMastery[];
}
```

**Design notes:**

- `attendance_rate` is a decimal (0–1) per the Django contract, NOT a percentage. The frontend multiplies by 100 when displaying.
- `EaChild.alignment` is nullable because children without a baseline assessment row return `null`.
- `EaGroupDetail.phase` is typed as `"letters" | "blending"` (not the discriminated `EaLetterGroup | EaBlendingGroup` union used in Phase 1B, because the detail page has the same shape for both phases — the only difference is that `LetterMasteryPath` is hidden for blending).
- `EaLetterMastery.mastery_pct` is a rounded integer 0–100 per the Django helper.
- `EaSession.notes` is `string` not `string | null` — the Django view returns an empty string when there is no note.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add lib/ea/types.ts
git commit -m "feat(ea): add TypeScript types for group detail response"
```

---

## Task 6: Next.js — add `getGroupDetail` to `lib/ea/api.ts`

**Goal:** A `React.cache()`-wrapped fetcher that returns `EaGroupDetailResult` — a discriminated union with explicit 404 handling for the redirect-on-invalid-class-id case. Both the EA and PM detail routes call this.

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/lib/ea/api.ts`

- [ ] **Step 1: Append the new fetcher**

Read the existing `lib/ea/api.ts`. After the existing `getEaOverview` export, append:

```typescript
import type { EaGroupDetail } from "./types";

export type EaGroupDetailResult =
  | { ok: true; data: EaGroupDetail }
  | { ok: false; error: string; status?: number };

export const getGroupDetail = cache(
  async (
    userId: number,
    classId: number,
  ): Promise<EaGroupDetailResult> => {
    try {
      const res = await djangoFetch(
        `/api/ea/${userId}/groups/${classId}/`,
        { cache: "no-store" },
      );

      if (res.status === 404) {
        return { ok: false, error: "group not found", status: 404 };
      }

      if (!res.ok) {
        return {
          ok: false,
          error: `Django returned ${res.status}`,
          status: res.status,
        };
      }

      const data: EaGroupDetail = await res.json();
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  },
);
```

**Important:** The existing file already imports `cache` from `"react"` and `djangoFetch` from `"@/lib/django-fetch"`. Do NOT add duplicate imports. Only add the `EaGroupDetail` type import at the top if it is not already imported. The existing file already has `import type { EaOverviewResponse } from "./types"` — extend that line to include `EaGroupDetail`:

```typescript
import type { EaOverviewResponse, EaGroupDetail } from "./types";
```

Then remove the standalone `import type { EaGroupDetail } from "./types"` line if you added it.

**Design notes:**

- 404 is handled explicitly because invalid-class-id is a well-defined path that the EA page redirects on. Other non-200 statuses are general errors that render `BackendErrorState`.
- `cache: "no-store"` prevents cross-request caching (user-specific data — every render must be fresh).
- `React.cache()` dedups within a single render lifecycle, so a hypothetical future case where the layout ALSO calls `getGroupDetail` would not double-fetch (Phase 1C does not currently need this, but it's free insurance).

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/ea/api.ts
git commit -m "feat(ea): add getGroupDetail fetcher with 404 handling"
```

---

## Task 7: Next.js — move shared components to `components/group-detail/`

**Goal:** Create the new `components/group-detail/` directory and move/extract two shared components into it: `CoachingTip` (moved from Phase 1B's `components/my-kids/coaching-tip.tsx`) and `StatusBadge` (newly extracted from the internal helper in `components/my-kids/group-card.tsx`). This refactor is small but touches shipped Phase 1B code — the implementer must update Phase 1B's `group-card.tsx` imports and verify the overview page still renders.

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/group-detail/coaching-tip.tsx`
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/group-detail/status-badge.tsx`
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/my-kids/group-card.tsx`
- Delete: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/my-kids/coaching-tip.tsx`

- [ ] **Step 1: Create the new coaching-tip file**

Create `components/group-detail/coaching-tip.tsx` with the exact contents from the existing `components/my-kids/coaching-tip.tsx` file (copy verbatim — this is a pure move). The import of `EaFlag` from `@/lib/ea/types` stays the same.

Read the existing file first to get the full content, then write it to the new path.

- [ ] **Step 2: Create the new status-badge file**

Create `components/group-detail/status-badge.tsx` with this content (extracted from the internal `StatusBadge` function in `components/my-kids/group-card.tsx`):

```typescript
import type { EaFlag } from "@/lib/ea/types";

interface StatusBadgeProps {
  flags: EaFlag[];
}

export function StatusBadge({ flags }: StatusBadgeProps) {
  if (flags.includes("ghost_group")) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 shrink-0 whitespace-nowrap">
        Low dosage
      </span>
    );
  }
  if (
    flags.includes("moving_too_fast") ||
    flags.includes("stagnation") ||
    flags.includes("curriculum_gaps")
  ) {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 shrink-0 whitespace-nowrap">
        Needs attention
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 shrink-0 whitespace-nowrap">
      On track
    </span>
  );
}
```

Note: the parameter type changed from `{ flags: string[] }` (as it was in the internal helper) to `{ flags: EaFlag[] }` — this is a tightening that catches typos at type-check time.

- [ ] **Step 3: Update `group-card.tsx` to import from the new location and remove the internal helpers**

Open `components/my-kids/group-card.tsx`. Change the imports at the top:

```typescript
import { BookOpen, Layers } from "lucide-react";
import type { EaGroup } from "@/lib/ea/types";
import { CoachingTip, getTopFlag } from "@/components/group-detail/coaching-tip";
import { StatusBadge } from "@/components/group-detail/status-badge";
```

Then DELETE the internal `StatusBadge` function definition (the function and its JSX). Keep `LetterProgressBar`, `BlendingSessionBar`, `formatGroupName`, and the exported `GroupCard` function.

The rest of the file (the `LetterProgressBar`, `BlendingSessionBar`, `formatGroupName`, `GroupCardProps`, and `GroupCard` function) stays exactly as it is.

- [ ] **Step 4: Delete the old coaching-tip file**

```bash
git rm components/my-kids/coaching-tip.tsx
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors. If errors appear about missing `StatusBadge` or `CoachingTip`, double-check the import paths.

- [ ] **Step 6: Lint just the touched files**

```bash
npx eslint components/group-detail/coaching-tip.tsx components/group-detail/status-badge.tsx components/my-kids/group-card.tsx
```

Expected: no errors.

- [ ] **Step 7: Smoke-build to confirm Phase 1B still renders**

```bash
npm run build 2>&1 | tail -20
```

Expected: `Route (app)` table shows all 29 routes, `/my-kids` still listed as `ƒ`. No build errors.

- [ ] **Step 8: Commit**

```bash
git add components/group-detail/coaching-tip.tsx components/group-detail/status-badge.tsx components/my-kids/group-card.tsx components/my-kids/coaching-tip.tsx
git commit -m "refactor(my-kids): move CoachingTip and StatusBadge to components/group-detail"
```

---

## Task 8: Build `GroupDetailHeader` component

**Goal:** The top of the detail page. A back arrow linking to a configurable route (EA view → `/my-kids`, PM view → `/pm/education-assistants/<user-id>`), the group name (with the EA prefix stripped the same way `GroupCard` strips it), grade, school, a row of key stats (sessions this week, children count), and the status badge.

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/group-detail/group-detail-header.tsx`

- [ ] **Step 1: Create the file**

```typescript
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { EaGroupDetail } from "@/lib/ea/types";
import { StatusBadge } from "./status-badge";

function formatGroupName(raw: string, eaName?: string): string {
  if (!eaName) return raw;
  const prefix = `${eaName}-`;
  return raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
}

interface GroupDetailHeaderProps {
  group: EaGroupDetail;
  backHref: string;
  backLabel?: string;
  eaName?: string;
}

export function GroupDetailHeader({
  group,
  backHref,
  backLabel = "Back",
  eaName,
}: GroupDetailHeaderProps) {
  const displayName = formatGroupName(group.group_name, eaName);
  const childrenCount = group.children.length;

  return (
    <header className="space-y-3">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {backLabel}
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-slate-900 break-words">
            {displayName}
          </h1>
          <p className="text-xs text-slate-500">
            {group.grade} · {group.school_name}
          </p>
        </div>
        <StatusBadge flags={group.flags} />
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        <span>
          <span className="font-semibold text-slate-900">
            {group.sessions_this_week}
          </span>{" "}
          sessions this week
        </span>
        <span>
          <span className="font-semibold text-slate-900">{childrenCount}</span>{" "}
          {childrenCount === 1 ? "child" : "children"}
        </span>
        <span>
          <span className="font-semibold text-slate-900">
            {group.total_sessions}
          </span>{" "}
          total
        </span>
      </div>
    </header>
  );
}
```

**Design notes:**

- `backHref` is a prop so both the EA route and the PM route can pass their own "back to" destination.
- `backLabel` defaults to `"Back"` — the EA route can override to `"Back to My Groups"`, the PM route can override to `"Back to EA performance"`.
- `eaName` is optional. When the EA view renders this, it passes `eaName={data.ea_name}` (from the overview endpoint — but the detail endpoint does not return `ea_name`, so the EA page passes it from a secondary call to `getEaOverview`). The PM route does not pass `eaName` so the group name renders with the full raw form (which is fine — the PM knows which EA they're looking at from the URL context).

**Wait — subtle issue:** the EA detail page doesn't currently have the EA name available from `getGroupDetail`. Two options:
- (a) Also call `getEaOverview` on the EA route to get `ea_name`, at zero cost (React.cache dedups with the layout's call).
- (b) Add `ea_name` to the group detail endpoint response.

Option (a) is zero backend cost since `React.cache()` already dedups. Go with (a). The EA route imports `getEaOverview` and calls it alongside `getGroupDetail`, then passes the returned `ea_name` into `GroupDetailHeader`.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/group-detail/group-detail-header.tsx
git commit -m "feat(group-detail): add header component with back link and stats"
```

---

## Task 9: Build `CoachingTipPanel` component

**Goal:** Render ALL applicable coaching tips for the group, prioritized correctly per the updated `documentation/letter-mastery-data-model.md` (Two interpretable signals):

1. **Curriculum coverage tip (highest priority)** — letters in the programme order that haven't been taught yet ("letters_skipped" union across all assessed children). This is the strongest coaching signal because it's a fact about EA teaching behavior measured against the programme order. Frame at the GROUP level, not per-child — the gap is in the EA's curriculum coverage, which affects every child equally.
2. **Group-level flag tips** — the four group flags (`ghost_group`, `moving_too_fast`, `curriculum_gaps`, `stagnation`) rendered via the existing `CoachingTip` component. ALL applicable flags shown (Phase 1B's overview card showed only the top one).
3. **Drilling-known-letters tip (lowest priority, secondary)** — per-child aggregated `teaching_known_letters` ("3 of 7 children — Lerato, Sipho, Asanda — already knew letters a, e at their baseline assessment"). This is a minor signal per the data doc; surface it last and frame it gently.

Copy must respect the mastery-data constraints — nothing may claim what children CURRENTLY know, only what they knew at baseline. Curriculum signals describe EA teaching behavior, not child knowledge. Uses the `CoachingTip` renderer for group-level flag tips, and adds new custom cards for the curriculum gap tip and the per-child teaching-known tip.

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/group-detail/coaching-tip-panel.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { Lightbulb, Users, Target } from "lucide-react";
import type { EaGroupDetail, EaChild, EaFlag } from "@/lib/ea/types";
import { CoachingTip } from "./coaching-tip";

const GROUP_FLAG_PRIORITY: EaFlag[] = [
  "ghost_group",
  "moving_too_fast",
  "curriculum_gaps",
  "stagnation",
];

function getChildrenWithTeachingKnown(children: EaChild[]): EaChild[] {
  return children.filter(
    (c) =>
      c.alignment?.flag_teaching_known &&
      (c.alignment?.teaching_known_letters.length ?? 0) > 0,
  );
}

function formatNameList(children: EaChild[], maxDisplay = 3): string {
  const names = children.map((c) => c.name).filter((n) => n);
  if (names.length === 0) return "";
  if (names.length <= maxDisplay) {
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  }
  const shown = names.slice(0, maxDisplay).join(", ");
  const remaining = names.length - maxDisplay;
  return `${shown}, and ${remaining} ${remaining === 1 ? "other" : "others"}`;
}

function unionLetters(
  children: EaChild[],
  field: "teaching_known_letters" | "letters_skipped",
): string[] {
  const letters = new Set<string>();
  for (const c of children) {
    const list = c.alignment?.[field] ?? [];
    for (const l of list) letters.add(l.toLowerCase());
  }
  return Array.from(letters).sort();
}

interface CoachingTipPanelProps {
  group: EaGroupDetail;
}

export function CoachingTipPanel({ group }: CoachingTipPanelProps) {
  // PRIORITY 1: Curriculum coverage gap (strongest signal per the data doc).
  // Aggregate letters_skipped at the GROUP level — the gap is in the EA's
  // teaching coverage, which affects every assessed child the same way.
  // Frame as a group-level statement, not "N of X children".
  const groupSkippedLetters = unionLetters(group.children, "letters_skipped");
  const hasCurriculumGap = groupSkippedLetters.length > 0;

  // PRIORITY 2: Group-level flags (Phase 1B's CoachingTip renderer). All
  // applicable flags are shown, not just the top one (which is what the
  // overview card does).
  const groupFlags = GROUP_FLAG_PRIORITY.filter((f) => group.flags.includes(f));

  // PRIORITY 3: Drilling-known-letters (minor secondary signal per the data
  // doc — drilling known letters supports automaticity and is largely
  // harmless if only here and there). Frame gently and last.
  const teachingKnownKids = getChildrenWithTeachingKnown(group.children);

  const hasAnyTip =
    hasCurriculumGap ||
    groupFlags.length > 0 ||
    teachingKnownKids.length > 0;

  if (!hasAnyTip) return null;

  const total = group.children.length;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-slate-900">
        Coaching suggestions
      </h2>

      {/* PRIORITY 1: Curriculum coverage gap (group-level) */}
      {hasCurriculumGap ? (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          <Target
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
            aria-hidden="true"
          />
          <div>
            <p>
              <span className="font-semibold">
                Letters from the programme order that haven&apos;t been taught
                yet:
              </span>{" "}
              <span className="font-semibold">
                {groupSkippedLetters.join(", ")}
              </span>
              .
            </p>
            <p className="mt-1">
              These come before your current position in the programme
              sequence. Consider going back to cover them before moving
              forward.
            </p>
          </div>
        </div>
      ) : null}

      {/* PRIORITY 2: Group-level flag tips (all of them) */}
      {groupFlags.map((flag) => (
        <CoachingTip key={flag} flag={flag} />
      ))}

      {/* PRIORITY 3: Drilling-known-letters (minor, gentle framing) */}
      {teachingKnownKids.length > 0 ? (
        <div className="flex items-start gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
          <Users
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500"
            aria-hidden="true"
          />
          <div>
            <p>
              <span className="font-semibold">
                {teachingKnownKids.length} of {total} children
              </span>{" "}
              already knew some letters at their baseline assessment:{" "}
              <span className="font-semibold">
                {formatNameList(teachingKnownKids)}
              </span>
              .
            </p>
            {unionLetters(teachingKnownKids, "teaching_known_letters").length >
            0 ? (
              <p className="mt-1">
                Letters they already knew:{" "}
                <span className="font-semibold">
                  {unionLetters(
                    teachingKnownKids,
                    "teaching_known_letters",
                  ).join(", ")}
                </span>
                . If you&apos;d like, you can move faster on these letters for
                these children.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
```

**Design notes (read carefully — copy compliance):**

- **Priority order matters and is enforced by the JSX order**: curriculum gap tip first (strongest signal per `documentation/letter-mastery-data-model.md` § "Two interpretable signals"), then group-level flag tips, then the drilling-known-letters tip last (lowest priority, framed gently).
- **Curriculum gap tip is GROUP-level** (not "N of X children") because the gap is in the EA's teaching coverage — every assessed child is affected by the same skipped letters in the same way. Per-child framing was wrong because it implied the gap was a property of individual children rather than a property of the EA's session sequence. The doc's "Group-level vs per-child framing" subsection is explicit about this.
- The curriculum gap tip uses `Target` icon (different from the secondary tips) and amber background — most prominent.
- The drilling-known-letters tip uses slate (grey) background instead of amber, signaling lower priority. Slate also matches the gentle "if you'd like, you can move faster" framing — not alarming.
- All references to mastery use past tense and baseline framing: *"already knew at their baseline assessment"*, *"already knew"*. Never *"have mastered"*, *"know"*, *"struggling"*.
- The curriculum tip language is fact-based about teaching behavior, not about child knowledge. *"Letters from the programme order that haven't been taught yet"* — that's a fact about session content vs the programme sequence, not a claim about what children know.
- Names of affected children are shown inline in the drilling-known tip to make it actionable for that subset of children.
- No drilling-known tip is shown if no child in the group has the flag. The whole panel hides if there are zero curriculum gaps, zero group flags, AND zero drilling-known tips.
- `Target` and `Users` icons are visually distinct, helping readers scan tip categories.
- `&apos;` is used in the JSX strings (escaped apostrophe) because the project has `react/no-unescaped-entities` as a lint rule — using a literal `'` or Unicode `\u2019` inside JSX text nodes can trip it depending on context. Using `&apos;` is the safe form for this rule.

- [ ] **Step 2: Type-check and lint**

```bash
npx tsc --noEmit
npx eslint components/group-detail/coaching-tip-panel.tsx
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/group-detail/coaching-tip-panel.tsx
git commit -m "feat(group-detail): add CoachingTipPanel with per-child alignment aggregation"
```

---

## Task 10: Build `LetterMasteryPath` component

**Goal:** The main visualization of the detail page. Renders the full language-appropriate alphabet (as returned by Django) in a wrapped grid — 5 letter cells per row. Each cell shows the letter, its mastery percentage (if mastery > 0), and session dots underneath (literal dots up to 9, then `× N`). Color-coded by mastery percentage. Legend below. No-assessment fallback copy when no letter has any mastery data.

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/group-detail/letter-mastery-path.tsx`

- [ ] **Step 1: Create the file**

```typescript
import type { EaLetterMastery } from "@/lib/ea/types";

function cellStyle(
  mastery_pct: number,
  hasAssessments: boolean,
): string {
  // No baseline assessments exist for this group — every cell is grey
  // regardless of session activity. The dots and the explainer text
  // above the grid carry the meaning instead.
  if (!hasAssessments) {
    return "bg-slate-50 border-slate-200 text-slate-600";
  }
  if (mastery_pct >= 70) {
    return "bg-green-100 border-green-300 text-green-900";
  }
  if (mastery_pct >= 30) {
    return "bg-amber-100 border-amber-300 text-amber-900";
  }
  return "bg-red-100 border-red-300 text-red-900";
}

function SessionDots({ count }: { count: number }) {
  if (count === 0) return <div className="mt-1 h-1.5" aria-hidden="true" />;
  if (count <= 9) {
    return (
      <div className="mt-1 flex h-1.5 items-center justify-center gap-0.5">
        {Array.from({ length: count }).map((_, i) => (
          <span
            key={i}
            className="block h-1 w-1 rounded-full bg-blue-500"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }
  return (
    <div className="mt-1 text-[9px] font-semibold text-blue-600">
      × {count}
    </div>
  );
}

interface LetterMasteryPathProps {
  letters: EaLetterMastery[];
}

export function LetterMasteryPath({ letters }: LetterMasteryPathProps) {
  // Defensive guard for malformed responses; the Django contract guarantees
  // a full language sequence here (Task 1 fix).
  if (letters.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Letter progress</h2>
        <p className="mt-2 text-xs text-slate-500">
          Letter progress data unavailable.
        </p>
      </section>
    );
  }

  // After Task 1's denominator fix, `children_total` is the count of children
  // with ChildLetterAlignment2026 rows for this group. It's the same value
  // across every letter in the array. children_total === 0 is the reliable
  // "no baseline assessments exist" signal — much cleaner than the old
  // `mastery_pct > 0` heuristic, which could not distinguish "no assessments"
  // from "assessments exist but nobody mastered anything yet".
  const childrenAssessed = letters[0].children_total;
  const hasAssessments = childrenAssessed > 0;
  const anySessions = letters.some((l) => l.sessions_taught > 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Letter progress
        </h2>
        <span className="text-[10px] text-slate-400">
          Pedagogical sequence
        </span>
      </div>

      {!hasAssessments && anySessions ? (
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          Your kids haven&apos;t taken their baseline assessments yet, so we
          can&apos;t show what they knew when you started. The dots below show
          the sessions you&apos;ve taught so far.
        </p>
      ) : null}

      {!hasAssessments && !anySessions ? (
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          Letter progress will appear here once your group starts sessions and
          completes their baseline assessments.
        </p>
      ) : null}

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
        {letters.map((l) => (
          <div
            key={l.letter}
            className={`flex flex-col items-center rounded-md border px-1 py-2 ${cellStyle(
              l.mastery_pct,
              hasAssessments,
            )}`}
          >
            <div className="text-[10px] leading-none">
              {hasAssessments ? `${l.mastery_pct}%` : " "}
            </div>
            <div className="mt-1 text-lg font-bold leading-none">
              {l.letter}
            </div>
            <SessionDots count={l.sessions_taught} />
          </div>
        ))}
      </div>

      {letters.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm border border-green-300 bg-green-100" />
            Most knew at baseline (&gt;70%)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm border border-amber-300 bg-amber-100" />
            Some knew at baseline (30–70%)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm border border-red-300 bg-red-100" />
            Few knew at baseline (&lt;30%)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm border border-slate-200 bg-slate-50" />
            Not assessed
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-1 w-1 rounded-full bg-blue-500" />
            = 1 session taught
          </span>
        </div>
      ) : null}
    </section>
  );
}
```

**Design notes (copy compliance is load-bearing — read `documentation/letter-mastery-data-model.md` § "Language guidance" if unsure):**

- Legend copy uses past tense: *"Most knew at baseline"*, *"Some knew at baseline"*, *"Few knew at baseline"*. Never *"mastered"* without the temporal qualifier.
- **No-assessment detection uses `letters[0].children_total === 0`** (the Finding 1 / Task 1 fix). After Task 1 lands, `children_total` is the count of `ChildLetterAlignment2026` rows for the group; if it's zero, no baseline assessments exist. This is reliable, unlike the old `mastery_pct > 0` heuristic which couldn't distinguish "no assessments" from "assessments exist but nobody mastered anything yet".
- Two distinct no-assessment messages: (a) sessions exist but no assessments → *"Your kids haven't taken their baseline assessments yet, so we can't show what they knew when you started. The dots below show the sessions you've taught so far."* and (b) brand-new group with neither sessions nor assessments → *"Letter progress will appear here once your group starts sessions and completes their baseline assessments."*
- When `hasAssessments === false`, all cells render grey regardless of mastery_pct (which is 0 anyway). The percentage line is blank (a non-breaking space to keep vertical alignment).
- When `hasAssessments === true`, every cell shows its percentage (even 0%, which is honest — "no baseline kids knew this letter") and is colored by the appropriate bucket.
- Session dots: literal dots up to 9, then `× N` badge. The user confirmed real data currently peaks at 4–5 sessions per letter, so the cap almost never fires.
- Grid is `grid-cols-5` on mobile (390px wide → ~70px per cell with 2×0.5rem gaps, legible for the letter + percentage + dots) and `grid-cols-6` on `sm` breakpoint (640px+) for slightly denser layout on tablets.
- The `letters.length === 0` defensive guard is dead code under the Task 1 contract (the helper always returns the full sequence), but kept as cheap insurance against malformed responses.
- No `"use client"` directive — purely server-rendered.
- The `&apos;` in `haven't` and `can't` uses the escaped form to satisfy `react/no-unescaped-entities` lint rule.

- [ ] **Step 2: Type-check and lint**

```bash
npx tsc --noEmit
npx eslint components/group-detail/letter-mastery-path.tsx
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/group-detail/letter-mastery-path.tsx
git commit -m "feat(group-detail): add LetterMasteryPath visualization component"
```

---

## Task 11: Build `ChildrenList` component

**Goal:** A sorted list of children in the group, with name, attendance fraction and percentage, last-attended date, a ⚠ icon for low-attendance or never-attended kids, and inline per-child alignment badges (`teaching known`, `has gaps`) when `alignment` is non-null.

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/group-detail/children-list.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { AlertTriangle } from "lucide-react";
import type { EaChild } from "@/lib/ea/types";

const LOW_ATTENDANCE_THRESHOLD = 0.5;
const STALE_ATTENDANCE_GAP_DAYS = 7;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(d);
}

function daysBetween(later: string | null, earlier: string | null): number | null {
  if (!later || !earlier) return null;
  const a = new Date(later);
  const b = new Date(earlier);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function isAtRisk(
  child: EaChild,
  mostRecentSessionDate: string | null,
): boolean {
  if (child.sessions_total === 0) return true;
  if (child.attendance_rate < LOW_ATTENDANCE_THRESHOLD) return true;
  const gap = daysBetween(mostRecentSessionDate, child.last_attended);
  if (gap !== null && gap > STALE_ATTENDANCE_GAP_DAYS) return true;
  return false;
}

function ChildRow({ child, atRisk }: { child: EaChild; atRisk: boolean }) {
  const pct = Math.round(child.attendance_rate * 100);
  const teachingKnown =
    child.alignment?.flag_teaching_known &&
    (child.alignment?.teaching_known_letters.length ?? 0) > 0;
  const hasGaps =
    child.alignment?.flag_skipping_needed &&
    (child.alignment?.letters_skipped.length ?? 0) > 0;

  return (
    <li className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {atRisk ? (
            <AlertTriangle
              className="h-3.5 w-3.5 shrink-0 text-amber-500"
              aria-label="Low attendance"
            />
          ) : null}
          <span className="truncate text-sm font-medium text-slate-900">
            {child.name || `Child #${child.participant_id}`}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          {child.sessions_total === 0 ? (
            <span>Not yet attended</span>
          ) : (
            <span>
              {child.sessions_attended}/{child.sessions_total} sessions ·{" "}
              Last seen {formatDate(child.last_attended)}
            </span>
          )}
        </div>
        {teachingKnown || hasGaps ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {hasGaps ? (
              <span className="inline-flex items-center rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                Programme letters not yet taught:{" "}
                {child.alignment!.letters_skipped.join(", ")}
              </span>
            ) : null}
            {teachingKnown ? (
              <span className="inline-flex items-center rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                Knew at baseline:{" "}
                {child.alignment!.teaching_known_letters.join(", ")}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        {child.sessions_total === 0 ? (
          <span className="text-xs text-slate-400">—</span>
        ) : (
          <span
            className={`text-sm font-semibold ${
              atRisk ? "text-amber-700" : "text-slate-700"
            }`}
          >
            {pct}%
          </span>
        )}
      </div>
    </li>
  );
}

interface ChildrenListProps {
  items: EaChild[];
  mostRecentSessionDate: string | null;
}

export function ChildrenList({
  items,
  mostRecentSessionDate,
}: ChildrenListProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Children</h2>
        <p className="mt-2 text-xs text-slate-500">
          No children yet. They&apos;ll appear here once they join your group.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Children</h2>
        <span className="text-[10px] text-slate-400">Sorted by attendance</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((c) => {
          const atRisk = isAtRisk(c, mostRecentSessionDate);
          return <ChildRow key={c.participant_id} child={c} atRisk={atRisk} />;
        })}
      </ul>
    </section>
  );
}
```

**Design notes:**

- The prop is named `items` rather than `children` to avoid the `react/no-children-prop` lint rule (which flags components that accept `children` as an explicit named prop rather than as a JSX slot). Calls to this component use `<ChildrenList items={data.children} mostRecentSessionDate={...} />`.
- `mostRecentSessionDate` is the date string of the group's most recent session (`recent_sessions[0]?.date ?? null`). It's used to detect children who have stopped attending while their peers continue — see `isAtRisk` below.
- Backend already sorts children by attendance rate ascending, so the frontend does not re-sort — just renders in order.
- `isAtRisk` returns `true` if ANY of three conditions hold: (a) the child has zero sessions (never attended), (b) attendance rate is below 50%, or (c) the gap between the group's most recent session and the child's `last_attended` exceeds 7 days. Spec § 5.3: "⚠ indicator for low attendance OR haven't attended recently". The third condition is the "haven't attended recently" half — comparing to `mostRecentSessionDate` (rather than wall-clock now) correctly handles school breaks: when ALL sessions pause, the gap stays small for everyone, so no false positives.
- `LOW_ATTENDANCE_THRESHOLD = 0.5` and `STALE_ATTENDANCE_GAP_DAYS = 7` are named constants for future tuning.
- `daysBetween` is a pure helper inside this file — no `Date.now()` involvement, so the `react-hooks/purity` lint rule has nothing to flag.
- Per-child alignment badges show two distinct categories matching the data doc's "Two interpretable signals":
  - **`Programme letters not yet taught: b, c`** — amber background (higher visual weight). This is the curriculum coverage signal — the strongest coaching signal per the data doc. Frame it as a property of the EA's teaching, not the child. Shown when `flag_skipping_needed` is true.
  - **`Knew at baseline: a, e`** — slate background (lower visual weight). This is the drilling-known-letters signal — minor secondary observation per the data doc. Past-tense framing enforces mastery-data compliance. Shown when `flag_teaching_known` is true.
- Both badges are shown ONLY when the corresponding flag is true AND the letter list is non-empty.
- The amber-then-slate visual ordering matches the priority order in `CoachingTipPanel` (curriculum > drilling-known).
- Date formatting uses `Intl.DateTimeFormat("en-ZA")` with `Africa/Johannesburg` timezone, matching the Phase 1B pattern on the overview page.
- A child with `sessions_total === 0` renders "Not yet attended" as the subtext — no fraction, no percentage, just the ⚠ icon signaling "this kid needs to come to sessions".
- `child.name || \`Child #${child.participant_id}\`` handles the edge case where a TeamPact name is empty.

- [ ] **Step 2: Type-check and lint**

```bash
npx tsc --noEmit
npx eslint components/group-detail/children-list.tsx
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/group-detail/children-list.tsx
git commit -m "feat(group-detail): add ChildrenList with alignment badges and at-risk indicator"
```

---

## Task 12: Build `RecentSessions` component

**Goal:** Last 10 sessions, newest-first. Each session shows date, letters taught, attendance count, EA session notes (if present), and an expandable per-child attendance accordion. Use native HTML `<details>`/`<summary>` to keep it as a server component — no `"use client"` directive needed.

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/group-detail/recent-sessions.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { Calendar, ChevronDown } from "lucide-react";
import type { EaSession } from "@/lib/ea/types";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Johannesburg",
  }).format(d);
}

function SessionRow({ session }: { session: EaSession }) {
  return (
    <li className="border-b border-slate-100 py-3 last:border-b-0">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 marker:hidden [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-900">
              <Calendar
                className="h-3 w-3 text-slate-400"
                aria-hidden="true"
              />
              {formatDate(session.date)}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {session.letters_taught.length > 0
                ? `Letters: ${session.letters_taught.join(", ")}`
                : "No letters recorded"}
              {" · "}
              {session.attendance_count}/{session.attendance_total} present
            </div>
            {session.notes ? (
              <p className="mt-1 text-xs italic leading-relaxed text-slate-600">
                {session.notes}
              </p>
            ) : null}
          </div>
          <ChevronDown
            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <ul className="mt-2 ml-5 space-y-1">
          {session.attendees.map((a) => (
            <li
              key={a.participant_id}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  a.present ? "bg-green-500" : "bg-slate-300"
                }`}
                aria-hidden="true"
              />
              <span
                className={
                  a.present ? "text-slate-700" : "text-slate-400 line-through"
                }
              >
                {a.name || `Child #${a.participant_id}`}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

interface RecentSessionsProps {
  sessions: EaSession[];
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  if (sessions.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Recent sessions</h2>
        <p className="mt-2 text-xs text-slate-500">
          No sessions recorded yet.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Recent sessions
        </h2>
        <span className="text-[10px] text-slate-400">
          Last {sessions.length}
        </span>
      </div>
      <ul>
        {sessions.map((s) => (
          <SessionRow key={s.session_id} session={s} />
        ))}
      </ul>
    </section>
  );
}
```

**Design notes:**

- `<details>`/`<summary>` provides native expand/collapse with zero JavaScript. The chevron rotates via `group-open:rotate-180` (Tailwind's `group-open:` variant targets the parent `details[open]` state).
- `marker:hidden [&::-webkit-details-marker]:hidden` hides the default triangle that browsers add to `<summary>` so our chevron is the sole affordance.
- Per-child attendance uses a small green/grey dot + strikethrough on absent names. Minimal visual weight — the important thing is the list, not the styling.
- `session.notes` renders as italic slate-600 under the session summary when non-empty. Empty strings short-circuit the conditional.
- `formatDate` uses `Africa/Johannesburg` timezone consistent with the children list.
- Clicking the chevron/summary toggles open — no client component, no state, no hydration. 

- [ ] **Step 2: Type-check and lint**

```bash
npx tsc --noEmit
npx eslint components/group-detail/recent-sessions.tsx
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/group-detail/recent-sessions.tsx
git commit -m "feat(group-detail): add RecentSessions with native details accordion"
```

---

## Task 13: Build `FlagPillStrip` component (PM-only display)

**Goal:** A small component that renders the group-level flag names as raw labeled pills, used ONLY in the PM detail page. Per `documentation/letter-mastery-data-model.md` § "For mentor / PM / funder-facing copy": *"On PM views, **keep** the raw flag names alongside any coaching-framed language. PMs scan multiple EAs quickly and the flag pills are faster than prose."*

The EA route does NOT render this component — EAs see only the friendly coaching tips from `CoachingTipPanel`. The PM route renders both: `FlagPillStrip` for fast scanning, then `CoachingTipPanel` for the same coaching language EAs see.

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/group-detail/flag-pill-strip.tsx`

- [ ] **Step 1: Create the file**

```typescript
import type { EaFlag } from "@/lib/ea/types";

const FLAG_LABELS: Record<EaFlag, string> = {
  ghost_group: "Ghost group",
  moving_too_fast: "Moving too fast",
  curriculum_gaps: "Curriculum gaps",
  stagnation: "Stagnation",
};

interface FlagPillStripProps {
  flags: EaFlag[];
}

export function FlagPillStrip({ flags }: FlagPillStripProps) {
  if (flags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map((f) => (
        <span
          key={f}
          className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700"
        >
          {FLAG_LABELS[f]}
        </span>
      ))}
    </div>
  );
}
```

**Design notes:**

- Raw labels (`Ghost group`, `Moving too fast`, etc.) — same vocabulary used elsewhere in the PM dashboard (e.g. the Quality Flags page), so PMs can scan them quickly.
- Slate-100 background, slate-700 text — neutral grey, signals "technical metadata" rather than urgent coaching. Visually distinct from the amber coaching tip cards.
- Uppercase + tracking — cues the PM that these are technical labels, not prose.
- Returns `null` when no flags — avoids rendering an empty container.
- Exports the `FLAG_LABELS` mapping is intentionally NOT done — this keeps the PM-facing labels in one place. If they need to be reused (e.g. in the future PM scatter plot enhancements), extract them to `lib/ea/flag-labels.ts` then.
- No `"use client"` — purely declarative.

- [ ] **Step 2: Type-check and lint**

```bash
npx tsc --noEmit
npx eslint components/group-detail/flag-pill-strip.tsx
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/group-detail/flag-pill-strip.tsx
git commit -m "feat(group-detail): add FlagPillStrip for PM-only raw flag display"
```

---

## Task 14: Create EA detail route `/my-kids/groups/[class_id]/page.tsx`

**Goal:** The main EA-facing route. Reads `class_id` from the URL, reads `teampact_user_id` from Clerk session metadata, calls `getGroupDetail()`, handles 404 (redirect to `/my-kids`) and error (render `BackendErrorState`), then composes all the detail components. Also calls `getEaOverview()` to fetch the EA's name for the header (free via `React.cache()` dedup with the layout).

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/app/my-kids/groups/[class_id]/page.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getGroupDetail, getEaOverview } from "@/lib/ea/api";
import type { EaMetadata } from "@/lib/ea/types";
import { NotLinkedState } from "@/components/my-kids/not-linked-state";
import { BackendErrorState } from "@/components/my-kids/backend-error-state";
import { GroupDetailHeader } from "@/components/group-detail/group-detail-header";
import { CoachingTipPanel } from "@/components/group-detail/coaching-tip-panel";
import { LetterMasteryPath } from "@/components/group-detail/letter-mastery-path";
import { ChildrenList } from "@/components/group-detail/children-list";
import { RecentSessions } from "@/components/group-detail/recent-sessions";

interface Params {
  class_id: string;
}

export default async function MyKidsGroupDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { class_id } = await params;
  const classIdNum = Number(class_id);
  if (!Number.isFinite(classIdNum) || classIdNum <= 0) {
    redirect("/my-kids");
  }

  const { sessionClaims } = await auth();
  const meta = sessionClaims?.metadata as EaMetadata | undefined;
  if (!meta?.teampact_user_id) {
    return <NotLinkedState />;
  }

  const result = await getGroupDetail(meta.teampact_user_id, classIdNum);

  if (!result.ok) {
    if (result.status === 404) {
      redirect("/my-kids");
    }
    return <BackendErrorState />;
  }

  const { data } = result;

  // Also fetch overview for the EA name used in the header
  // (React.cache() dedups with the layout's call — no extra HTTP request).
  const overviewResult = await getEaOverview(meta.teampact_user_id);
  const eaName =
    overviewResult.ok && overviewResult.data.ea_name
      ? overviewResult.data.ea_name
      : undefined;

  return (
    <div className="space-y-4">
      <GroupDetailHeader
        group={data}
        backHref="/my-kids"
        backLabel="Back to My Groups"
        eaName={eaName}
      />
      <CoachingTipPanel group={data} />
      {data.phase === "letters" ? (
        <LetterMasteryPath letters={data.letter_mastery} />
      ) : null}
      <ChildrenList
        items={data.children}
        mostRecentSessionDate={data.recent_sessions[0]?.date ?? null}
      />
      <RecentSessions sessions={data.recent_sessions} />
    </div>
  );
}
```

**Design notes:**

- `Number.isFinite(classIdNum) || classIdNum <= 0` guards against `NaN`, infinity, negative numbers, and zero. Next.js's dynamic route segment gives us a string, so we must parse and validate.
- `redirect()` from `next/navigation` throws a special error that Next.js catches — the function does not return after `redirect()`.
- `NotLinkedState` is reused from Phase 1B (it lives in `components/my-kids/` — appropriate for the EA route).
- `BackendErrorState` is reused from Phase 1B.
- Spread component composition: header → coaching tips → (mastery path only if letters phase) → children list → recent sessions. The order matches the spec § 5.
- The `getEaOverview()` call is guaranteed zero-HTTP-cost because `React.cache()` dedups with the layout's identical call. The layout happens-before the page in Next.js render order, so the layout's call primes the cache.
- `ChildrenList` takes `items={data.children}` (not `children={...}`) per the naming convention established in Task 11, avoiding the `react/no-children-prop` lint rule. TypeScript enforces this at the call site.

- [ ] **Step 2: Type-check and lint**

```bash
npx tsc --noEmit
npx eslint app/my-kids/groups/
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/my-kids/groups/
git commit -m "feat(my-kids): add group detail route at /my-kids/groups/[class_id]"
```

---

## Task 15: Make `GroupCard` clickable

**Goal:** The Phase 1B `GroupCard` was built as a display-only `<article>` in anticipation of Phase 1C. Now wrap it in a `<Link>` so tapping a card navigates to `/my-kids/groups/[class_id]`. When `class_id` is `null`, do not wrap in a link (the card still renders as a plain article).

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/components/my-kids/group-card.tsx`

- [ ] **Step 1: Update the GroupCard component**

Read `components/my-kids/group-card.tsx`. Add `import Link from "next/link"` at the top. Find the `export function GroupCard` function. Wrap the returned `<article>` in a `<Link>` when `group.class_id` is non-null:

Replace the `return` statement of `GroupCard` with:

```typescript
export function GroupCard({ group, showSchoolName = false, eaName }: GroupCardProps) {
  const topFlag = getTopFlag(group.flags);
  const displayName = formatGroupName(group.group_name, eaName);

  const cardBody = (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-900">
            {displayName}
          </h2>
          <p className="text-xs text-slate-500">
            {group.grade}
            {showSchoolName ? ` · ${group.school_name}` : ""}
          </p>
        </div>
        <StatusBadge flags={group.flags} />
      </div>

      {group.phase === "letters" ? (
        <LetterProgressBar
          progressPct={group.progress_pct}
          currentLetter={group.current_letter}
        />
      ) : (
        <BlendingSessionBar totalSessions={group.total_sessions} />
      )}

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <BookOpen className="h-3 w-3" />
          {group.sessions_this_week} this week
        </span>
        <span>{group.total_sessions} total</span>
        <span>{group.children_count} kids</span>
      </div>

      {topFlag ? <CoachingTip flag={topFlag} /> : null}
    </article>
  );

  if (group.class_id === null) {
    return cardBody;
  }

  return (
    <Link
      href={`/my-kids/groups/${group.class_id}`}
      className="block focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-xl"
    >
      {cardBody}
    </Link>
  );
}
```

The top of the file needs `import Link from "next/link";` added. The other existing imports (BookOpen, Layers, EaGroup, CoachingTip, getTopFlag, StatusBadge) stay as they are.

**Design notes:**

- `cardBody` is extracted so the conditional wrapping (link vs no-link) doesn't duplicate the JSX.
- `hover:border-slate-300` adds a subtle hover affordance to signal clickability.
- `focus:ring-2 focus:ring-primary/40` adds keyboard focus visibility on the Link wrapper.
- `rounded-xl` on the Link matches the card's rounded corners so the focus ring looks right.
- When `class_id === null` (which happens for malformed legacy groups), the card still renders but is not clickable — better than crashing or redirecting.

- [ ] **Step 2: Type-check and lint**

```bash
npx tsc --noEmit
npx eslint components/my-kids/group-card.tsx
```

Expected: zero errors.

- [ ] **Step 3: Smoke-build**

```bash
npm run build 2>&1 | tail -15
```

Expected: build succeeds, `/my-kids` route still listed, new `/my-kids/groups/[class_id]` route now listed.

- [ ] **Step 4: Commit**

```bash
git add components/my-kids/group-card.tsx
git commit -m "feat(my-kids): wrap GroupCard in Link for detail page navigation"
```

---

## Task 16: Create minimal PM EA detail route `/pm/education-assistants/[user-id]/page.tsx`

**Goal:** A small server component that renders an EA's profile and group list inside the PM layout. This is a 1D-lite stub that the spec assumes exists (spec § 5 line 460 says invalid PM group detail pages should redirect here, and the PM group detail back-arrow points here). Full Phase 1D will replace this with the spec-aligned EA detail panel that includes the scatter-plot integration, alignment badges, and per-EA stats. For 1D-lite, we just need a route that exists and shows minimal useful content.

**Why this route is in 1D-lite, not full 1D:** the PM group detail page (Task 17) needs a "back to" target that is not the scatter plot (because the scatter plot loses the EA context — the PM has to re-click their EA's dot). Building a minimal `[user-id]` page is the cheapest way to give it a sensible parent. The page is small (~60 lines) and gets fleshed out in full Phase 1D.

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/app/pm/education-assistants/[user-id]/page.tsx`

- [ ] **Step 1: Create the file**

```typescript
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEaOverview } from "@/lib/ea/api";
import { BackendErrorState } from "@/components/my-kids/backend-error-state";

interface Params {
  "user-id": string;
}

export default async function PMEaDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const resolved = await params;
  const userIdNum = Number(resolved["user-id"]);
  if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
    redirect("/pm/education-assistants");
  }

  const result = await getEaOverview(userIdNum);
  if (!result.ok) {
    return <BackendErrorState />;
  }

  const { data } = result;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href="/pm/education-assistants"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to EAs
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-slate-900">{data.ea_name}</h1>
        <p className="text-xs text-slate-500">{data.primary_school}</p>
        <p className="mt-1 text-xs text-slate-400">
          {data.groups.length}{" "}
          {data.groups.length === 1 ? "group" : "groups"}
        </p>
      </div>

      {data.groups.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-xs text-slate-500">
          No groups for this EA yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {data.groups.map((g, index) => (
            <li key={g.class_id ?? index}>
              {g.class_id !== null ? (
                <Link
                  href={`/pm/education-assistants/${userIdNum}/groups/${g.class_id}`}
                  className="flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {g.group_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {g.grade} · {g.school_name}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {g.total_sessions} sessions
                  </span>
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-400">
                      {g.group_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {g.grade} · {g.school_name} (no class_id)
                    </p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-[10px] italic text-slate-400">
        Phase 1D will expand this page with sessions/day, alignment badges,
        flag pills, and progress bars per group row. For now, click a group
        to see its detail page.
      </p>
    </div>
  );
}
```

**Design notes:**

- **Reuses `getEaOverview()` from `lib/ea/api.ts`** — same data Phase 1B's overview page uses. No new fetcher needed. `React.cache()` dedups if anything else in the same render also calls it.
- **Group rows are simple `<li>` items, not `GroupCard`.** GroupCard auto-wraps in a Link to `/my-kids/groups/[class_id]` (per Task 15), which is wrong for the PM context — PMs should land on `/pm/education-assistants/<user-id>/groups/<class_id>`, not the EA view. Re-implementing as a simple list avoids the GroupCard prop refactor and keeps the PM stub minimal. Full Phase 1D may revisit this with a configurable GroupCard variant.
- **Disabled rows for null `class_id`** — defensive against legacy groups with null class_id. They still display but are not clickable.
- **`max-w-2xl mx-auto`** matches the EA detail page width inside the PM sidebar.
- **`Phase 1D will expand this page` footer note** — sets explicit expectations for any PM who lands here in the meantime. Italic + tiny font, doesn't dominate the page but makes the temporary nature visible.
- **No `"use client"` directive** — purely server-rendered.
- **404/error handling**: invalid user_id → redirect to scatter plot. API error → `BackendErrorState`. EA with zero groups → friendly empty state, not an error.

- [ ] **Step 2: Type-check and lint**

```bash
npx tsc --noEmit
npx eslint app/pm/education-assistants/
```

Expected: zero errors.

- [ ] **Step 3: Smoke-build**

```bash
npm run build 2>&1 | tail -15
```

Expected: build succeeds. The new route `/pm/education-assistants/[user-id]` should appear as a dynamic (`ƒ`) route in the route table.

- [ ] **Step 4: Commit**

```bash
git add app/pm/education-assistants/
git commit -m "feat(pm): add minimal EA detail page (1D-lite stub)"
```

---

## Task 17: Create PM detail route `/pm/education-assistants/[user-id]/groups/[class_id]/page.tsx`

**Goal:** The PM-side equivalent of the EA detail route. Same components, different layout (inherits PM sidebar via `app/pm/layout.tsx`), different back link (`/pm/education-assistants` instead of `/my-kids`), different auth rule (PM requires `funder`+ role — the existing middleware handles this), and the user_id comes from the URL segment rather than from Clerk session metadata (PMs can look at any EA's data).

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/app/pm/education-assistants/[user-id]/groups/[class_id]/page.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { redirect } from "next/navigation";
import { getGroupDetail } from "@/lib/ea/api";
import { BackendErrorState } from "@/components/my-kids/backend-error-state";
import { GroupDetailHeader } from "@/components/group-detail/group-detail-header";
import { FlagPillStrip } from "@/components/group-detail/flag-pill-strip";
import { CoachingTipPanel } from "@/components/group-detail/coaching-tip-panel";
import { LetterMasteryPath } from "@/components/group-detail/letter-mastery-path";
import { ChildrenList } from "@/components/group-detail/children-list";
import { RecentSessions } from "@/components/group-detail/recent-sessions";

interface Params {
  "user-id": string;
  class_id: string;
}

export default async function PMGroupDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const resolved = await params;
  const userIdNum = Number(resolved["user-id"]);
  const classIdNum = Number(resolved.class_id);

  // Invalid user_id → redirect all the way back to the scatter plot
  // (the EA detail stub at /pm/education-assistants/<user-id> would also
  // bounce on this, so save a hop).
  if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
    redirect("/pm/education-assistants");
  }

  // Invalid class_id but valid user_id → redirect to the EA detail page
  // (Task 16 stub) so the PM can pick a different group for the same EA.
  // This matches spec § 7 line 460: "Redirect to /pm/education-assistants/[user-id]".
  if (!Number.isFinite(classIdNum) || classIdNum <= 0) {
    redirect(`/pm/education-assistants/${userIdNum}`);
  }

  const result = await getGroupDetail(userIdNum, classIdNum);

  if (!result.ok) {
    if (result.status === 404) {
      redirect(`/pm/education-assistants/${userIdNum}`);
    }
    return <BackendErrorState />;
  }

  const { data } = result;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <GroupDetailHeader
        group={data}
        backHref={`/pm/education-assistants/${userIdNum}`}
        backLabel="Back to EA"
      />
      {/* PM-only: raw flag pills for fast scanning (per data doc § PM copy) */}
      <FlagPillStrip flags={data.flags} />
      <CoachingTipPanel group={data} />
      {data.phase === "letters" ? (
        <LetterMasteryPath letters={data.letter_mastery} />
      ) : null}
      <ChildrenList
        items={data.children}
        mostRecentSessionDate={data.recent_sessions[0]?.date ?? null}
      />
      <RecentSessions sessions={data.recent_sessions} />
    </div>
  );
}
```

**Design notes:**

- The route segment is `[user-id]` (hyphenated, matches existing `/pm/education-assistants` naming conventions). Next.js allows hyphens in dynamic segments; access via `params["user-id"]`.
- `max-w-2xl mx-auto` keeps the content column the same width as the EA view, centered inside the PM sidebar's main area. The PM layout has its own wider padding; the inner max-w gives a consistent reading width.
- **`FlagPillStrip` rendered ONLY in this PM route** — not in the EA route. Per `documentation/letter-mastery-data-model.md` § "For mentor / PM / funder-facing copy": *"On PM views, keep the raw flag names alongside any coaching-framed language. PMs scan multiple EAs quickly and the flag pills are faster than prose."* The pill strip sits between the header and `CoachingTipPanel` so PMs can scan technical labels first, then read coaching language.
- `eaName` is NOT passed to `GroupDetailHeader` because the PM view doesn't have a cheap way to get it (the layout doesn't fetch EA overview data, and calling `getEaOverview()` just for the name would be one extra Django roundtrip). The header renders with the unstripped group name, which is fine for PMs — they want context about which EA they're viewing.
- **Two-level back-redirect**: invalid `user_id` → scatter plot; invalid `class_id` (but valid user_id) → `/pm/education-assistants/<user_id>` (the EA detail stub from Task 16). This matches spec § 7 line 460: *"Redirect to /pm/education-assistants/[user-id]"*. The EA detail stub becomes the natural "level-up" target — PM lands on the EA's profile and can pick a different group.
- **`backHref` points to the EA detail stub**, not the scatter plot. The "Back to EA" label is shorter than "Back to EA detail" and clear in context.
- Existing middleware at `/middleware.ts` already protects `/pm*` routes at minimum role `funder`. A user with role `ea` would be blocked before this route runs. No additional auth code needed.
- `BackendErrorState` is reused from `components/my-kids/` — the edge-state component has no EA-specific styling, just a generic "something went wrong" card. Acceptable cross-directory reuse. If the reuse feels wrong, a future refactor can move it to `components/shared/` or duplicate it — not worth doing as part of 1C.

- [ ] **Step 2: Type-check and lint**

```bash
npx tsc --noEmit
npx eslint app/pm/education-assistants/
```

Expected: zero errors.

- [ ] **Step 3: Smoke-build**

```bash
npm run build 2>&1 | tail -15
```

Expected: build succeeds. Both `/my-kids/groups/[class_id]` and `/pm/education-assistants/[user-id]/groups/[class_id]` should appear as dynamic (`ƒ`) routes.

- [ ] **Step 4: Commit**

```bash
git add app/pm/education-assistants/
git commit -m "feat(pm): add group detail route reusing components/group-detail"
```

---

## Task 18: Playwright e2e tests for invalid-detail-route redirects

**Goal:** Automated regression coverage for the unauthenticated-deep-link and malformed-`class_id` redirect paths. Builds on the existing pattern in `e2e/my-kids-auth.spec.ts` which already covers `/my-kids` itself. Phase 1B added 3 new e2e tests for the auth surface; this task adds 2 new ones for the detail-route surface.

**Files:**
- Create or modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/e2e/my-kids-auth.spec.ts`

- [ ] **Step 1: Read the existing test file**

```bash
cat e2e/my-kids-auth.spec.ts
```

Note the existing test structure (test groups, helpers, expectations). The new tests should follow the same structure.

- [ ] **Step 2: Add the new tests at the end of the existing test group**

Append these test blocks inside the existing `test.describe("/my-kids auth", ...)` block:

```typescript
  test("unauthenticated deep link to a group detail page redirects with full path preserved", async ({
    page,
  }) => {
    await page.goto("/my-kids/groups/67982");
    await expect(page).toHaveURL(
      /\/login\?redirect_url=%2Fmy-kids%2Fgroups%2F67982/,
    );
  });

  test("malformed class_id in detail route redirects to overview (signed-out users still see login first)", async ({
    page,
  }) => {
    // Signed-out users hit middleware first → redirect to login regardless
    // of whether the URL is malformed. We just verify they don't crash and
    // they end up on a login page.
    await page.goto("/my-kids/groups/abc");
    // Either the middleware redirects to /login, or the page-level
    // validation redirects to /my-kids first then middleware redirects
    // to /login. Both are acceptable as long as the user lands on /login.
    await expect(page).toHaveURL(/\/login/);
  });
```

If the existing file uses a different convention (e.g. `test.describe.only`, or explicit URL builders), match it.

- [ ] **Step 3: Run the affected test file**

```bash
npx playwright test e2e/my-kids-auth.spec.ts 2>&1 | tail -20
```

Expected: all tests pass — the 3 existing tests plus the 2 new ones (5 total in this file). If anything is red, debug before committing.

- [ ] **Step 4: Run the full Playwright suite as a regression check**

```bash
npx playwright test 2>&1 | tail -10
```

Expected: 13 tests pass (11 from before + 2 new).

- [ ] **Step 5: Commit**

```bash
git add e2e/my-kids-auth.spec.ts
git commit -m "test(my-kids): add e2e regression for detail-route redirect paths"
```

---

## Task 19: Manual smoke test

**Goal:** Verify every path of the EA and PM detail pages end-to-end on a local dev server with real Django data. No code changes in this task.

**Prerequisite:** Tasks 5–15 committed, `npm run build` succeeds.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Scenario A — EA view: letter-phase group with real data**

Open `http://localhost:3000/my-kids` in incognito, sign in as the linked test EA (Shadey, `teampact_user_id=28739`). Click any letter-phase group card.

**Expected (structural — counts and flags vary with real data):**
- URL is `/my-kids/groups/<class_id>` where `<class_id>` is the clicked group's ID.
- Back arrow labeled "Back to My Groups" top of page.
- Group name (EA prefix stripped, e.g. "Letters-Group 1"), grade, school underneath.
- Status badge top-right.
- Stats row: `N sessions this week · N children · N total`.
- **No `FlagPillStrip` is visible** — that's PM-only.
- Coaching suggestions section (if any signals are present), in this priority order:
  1. **Curriculum gap tip** (Target icon, amber background): *"Letters from the programme order that haven't been taught yet: ..."* — appears if any assessed child has `letters_skipped` populated. The listed letters are the union across all assessed children.
  2. **Group-level flag tips** (Lightbulb icon, amber background): rendered via `CoachingTip`, one per applicable group flag. ALL applicable flags shown, not just the top one.
  3. **Drilling-known-letters tip** (Users icon, slate background — visually less prominent): *"N of total children — Lerato, Sipho, Asanda — already knew some letters at their baseline assessment..."* — appears if any child has `teaching_known_letters` populated.
- `Letter progress` section: wrapped grid of all 26 letters (isiXhosa sequence). Each cell shows the percentage ABOVE the letter, with session dots BELOW. Some cells coloured (green/amber/red) by mastery bucket, some grey if no assessment data exists. Legend below.
- `Children` section: list of kids sorted by attendance ascending. Lowest-attendance kids at top with ⚠. Each row shows name, sessions fraction, percentage. Some kids have alignment badges inline: amber `Programme letters not yet taught: ...` for curriculum gaps, slate `Knew at baseline: ...` for drilling-known.
- `Recent sessions` section: last 10 sessions newest-first. Click a session → it expands to show per-child attendance (green dots for present, grey strikethrough for absent). Click again → it collapses. Session notes (italic slate-600) appear below the session metadata when present.

- [ ] **Step 3: Scenario B — EA view: blending group**

Navigate back (hit the back arrow), click a blending-phase group card.

**Expected:**
- All sections render EXCEPT `Letter progress` is entirely absent (not rendered at all, not even as an empty section).
- Coaching suggestions still work.
- Children list still works.
- Recent sessions still work.

- [ ] **Step 4: Scenario C — EA view: invalid class_id**

Manually enter `http://localhost:3000/my-kids/groups/999999` in the address bar. (Still signed in as Shadey.)

**Expected:** Silent redirect to `/my-kids` (overview page). No flash, no error.

- [ ] **Step 5: Scenario D — EA view: malformed class_id**

Enter `http://localhost:3000/my-kids/groups/abc` in the address bar.

**Expected:** Silent redirect to `/my-kids`.

- [ ] **Step 6: Scenario E — EA view: deep link from signed-out state**

Sign out via the UserButton. Open a new tab: `http://localhost:3000/my-kids/groups/<valid_class_id>`.

**Expected:** Redirect to `/login?redirect_url=%2Fmy-kids%2Fgroups%2F<valid_class_id>`. After sign-in, land back on the detail page.

- [ ] **Step 7: Scenario F — EA view: mobile viewport**

Sign back in as Shadey. In Chrome DevTools, toggle device toolbar (Cmd-Shift-M), pick iPhone 14 Pro (~390px wide). Reload a detail page.

**Expected:**
- Header, coaching tips, and all sections fit without horizontal scroll.
- `Letter progress` grid is `grid-cols-5` — visible 5 letters per row.
- Each letter cell shows letter + percentage + dots without clipping.
- Legend text wraps cleanly.
- Children list rows don't overflow.
- Recent sessions expand/collapse animation (chevron rotation) works via CSS.
- Bottom of page has breathing room (`pb-20` from layout).

- [ ] **Step 8: Scenario G — PM view: EA detail stub page (Task 16)**

Sign out. Sign in as a staff user (role `funder` or higher). Manually enter `http://localhost:3000/pm/education-assistants/28739` (Shadey's user_id, no group segment).

**Expected:**
- PM sidebar visible on the left.
- Page renders the minimal EA detail stub: "Back to EAs" link, "Shadey Africander" heading, "Abraham Levy Primary School" subtitle, group count, and a list of clickable group rows.
- Italic footer note about Phase 1D expansion is visible.
- Click any group row → navigates to `/pm/education-assistants/28739/groups/<class_id>`.

- [ ] **Step 9: Scenario H — PM view: letter-phase group detail**

From Scenario G, click any letter-phase group row.

**Expected:**
- URL is `/pm/education-assistants/28739/groups/<class_id>`.
- PM sidebar still visible on the left.
- Detail page renders in the main area, centered at `max-w-2xl`.
- All sections from EA Scenario A render identically (header, coaching tip panel, letter mastery path, children list, recent sessions).
- **`FlagPillStrip` is visible** between the header and the coaching tip panel — small grey pills with raw flag labels (`Curriculum gaps`, `Moving too fast`, etc.) for any flags this group has. EA view does NOT show this.
- Group name renders WITH the EA prefix (e.g. "Shadey Africander-Letters-Group 1") because the PM view does not pass `eaName` to `GroupDetailHeader`.
- Back arrow labeled "Back to EA", linking to `/pm/education-assistants/28739` (the EA detail stub from Scenario G).
- Click the back arrow → lands back on the EA detail stub.

- [ ] **Step 10: Scenario I — PM view: invalid class_id (valid user_id)**

Manually enter `http://localhost:3000/pm/education-assistants/28739/groups/999999`.

**Expected:** Silent redirect to `/pm/education-assistants/28739` (the EA detail stub for Shadey), NOT to the scatter plot. The PM stays in the EA's context.

- [ ] **Step 11: Scenario J — PM view: invalid user_id**

Manually enter `http://localhost:3000/pm/education-assistants/99999/groups/1`.

**Expected:** Silent redirect to `/pm/education-assistants` (the scatter plot landing page) — both segments are bad, so we bounce all the way back.

- [ ] **Step 12: Scenario K — Curriculum gap coaching tip (verify Finding 2 reversal)**

Find a group in your real data that has the `flag_curriculum_gaps` flag, OR has any child with `flag_skipping_needed === true` and `letters_skipped` non-empty. (Use the existing `/pm/letter-alignment` page to identify a candidate.)

Navigate to that group's detail page (either `/my-kids/groups/<class_id>` as the EA, or `/pm/education-assistants/<user_id>/groups/<class_id>` as a staff user).

**Expected:**
- The first card in the "Coaching suggestions" section is the curriculum gap tip with a `Target` icon.
- Tip text reads: *"Letters from the programme order that haven't been taught yet: {letters}. These come before your current position in the programme sequence. Consider going back to cover them before moving forward."*
- Letters listed are the union of `letters_skipped` across all assessed children in the group.
- This tip appears BEFORE any group-level flag tips and BEFORE any drilling-known-letters tip.

- [ ] **Step 13: Scenario L — PM view: EA role blocked**

Sign out. Sign in as the linked test EA (Shadey). In the address bar enter `http://localhost:3000/pm/education-assistants/28739/groups/<class_id>`.

**Expected:** Middleware redirects to `/login?error=insufficient_role` (or the equivalent middleware response). EAs don't have `funder`+ role.

- [ ] **Step 14: Stop the dev server**

Ctrl-C. If any scenario failed, go back and fix.

- [ ] **Step 15: No commit — this task has no code changes.**

---

## Task 20: Playwright regression, merge, and deploy

**Goal:** Final regression, merge to main, deploy to production, and run a smoke test on a real phone.

**Prerequisite:** Task 19 all scenarios pass.

- [ ] **Step 1: Run the full Playwright suite**

```bash
npx playwright test 2>&1 | tail -30
```

Expected: all 13 tests pass — 11 from Phase 1A/1B plus the 2 new detail-route redirect tests added in Task 18. Content tests against Clerk-authenticated users remain deferred to a later phase.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin ea-phase1c-detail
```

- [ ] **Step 3: Merge to main**

```bash
git checkout main
git pull --ff-only
git merge --no-ff ea-phase1c-detail -m "Merge ea-phase1c-detail: Phase 1C group detail page + Phase 1D-lite PM route"
git push origin main
```

- [ ] **Step 4: Wait for Vercel deploy**

Watch https://vercel.com. Deploy should take 1–3 minutes.

- [ ] **Step 5: Production smoke test — EA view on a real phone**

On a physical phone, open `https://zazi-izandi.co.za/my-kids`. Sign in as the linked test EA. Tap a group card.

**Expected:**
- Detail page loads with header, coaching tips, letter mastery path (for letter-phase groups), children list, recent sessions.
- Mastery path readable — 5 letters per row, mastery % and dots visible.
- Tap a session to expand per-child attendance.
- Back arrow returns to overview.
- No horizontal scroll anywhere.

- [ ] **Step 6: Production smoke test — PM view**

Still on the phone (or desktop), sign out. Sign in as a staff user. Manually navigate to `https://zazi-izandi.co.za/pm/education-assistants/28739/groups/<class_id>` for a known-good class_id.

**Expected:**
- PM sidebar visible, detail page in main area.
- Same sections as EA view, same data.
- Back arrow → `/pm/education-assistants`.

- [ ] **Step 7: Production regression check**

Sign in as staff. Verify:
- `/pm` loads with real data
- `/pm/education-assistants` loads with the scatter plot
- `/schools-2026` loads
- `/my-kids` (Phase 1B overview) still renders with clickable cards

- [ ] **Step 8: Delete the feature branch**

```bash
git branch -d ea-phase1c-detail
```

- [ ] **Step 9: Mark Phase 1C + 1D-lite complete**

Phase 1C ships the group detail page. Phase 1D-lite ships the PM-side route. Full Phase 1D (scatter plot enhancements, click-through from the scatter dot to the group detail via the existing EA detail panel) is tracked separately.

---

## Phase 1C Completion Criteria

Phase 1C + 1D-lite are done when all of the following are true:

**Django backend (Tasks 1–4):**
- [ ] `compute_group_letter_mastery` returns every letter in the language sequence (not just letters with data). Verified with unit test.
- [ ] `compute_group_letter_mastery` uses `alignment_qs.count()` (assessed cohort) as the `children_total` denominator, NOT `group_summary.children_count` (session-derived). The numerator and denominator come from the same data source. Verified with the dedicated regression test from Finding 1.
- [ ] `ea_group_detail` view attaches per-child `alignment` data from `ChildLetterAlignment2026` to each item in `children`. Verified with unit test.
- [ ] `ea_group_detail` view includes children who have an alignment row but no session rows (zero-attendance kids), with names from `TeampactParticipant`. Verified with unit test.
- [ ] Django PR merged to main, deployed, and verified live with a curl test.

**Next.js types and data layer (Tasks 5–7):**
- [ ] `lib/ea/types.ts` exports `EaGroupDetail`, `EaChild`, `EaChildAlignment`, `EaLetterMastery`, `EaSession`, `EaSessionAttendee`, `EaGroupProgress`.
- [ ] `lib/ea/api.ts` exports `getGroupDetail(userId, classId)` wrapped in `React.cache()` with explicit 404 handling.
- [ ] `components/my-kids/coaching-tip.tsx` has been deleted and Phase 1B's `group-card.tsx` imports `CoachingTip`/`getTopFlag`/`StatusBadge` from `components/group-detail/`.

**Components (Tasks 8–13):**
- [ ] `components/group-detail/` directory exists with: `coaching-tip.tsx`, `status-badge.tsx`, `group-detail-header.tsx`, `coaching-tip-panel.tsx`, `letter-mastery-path.tsx`, `children-list.tsx`, `recent-sessions.tsx`, `flag-pill-strip.tsx`.
- [ ] `LetterMasteryPath` renders the full alphabet sequence (26 letters for isiXhosa/English, 22 for Afrikaans) wrapped to 5 columns on mobile.
- [ ] `LetterMasteryPath` detects "no assessments exist" via `letters[0].children_total === 0` (the Finding 1 / Task 1 fix), NOT via `mastery_pct > 0`.
- [ ] `LetterMasteryPath` shows the percentage above the letter (per spec § 5.2), not below. Cells are colored only when assessments exist.
- [ ] `LetterMasteryPath` shows session dots literal up to 9, then `× N` badge for 10+.
- [ ] `LetterMasteryPath` is entirely absent (not rendered) for blending groups.
- [ ] `CoachingTipPanel` renders tips in priority order: (1) curriculum coverage gap (group-level, highest priority), (2) all applicable group-level flag tips, (3) per-child drilling-known-letters tip (lowest priority). Verified against the priority order in `documentation/letter-mastery-data-model.md` § "Two interpretable signals".
- [ ] Curriculum coverage tip is framed at the GROUP level (*"Letters from the programme order that haven't been taught yet: ..."*), not as "N of X children have gaps". The gap is a property of the EA's teaching coverage, not of individual children.
- [ ] All coaching copy uses past-tense baseline framing for mastery signals and curriculum-focused language for skipping signals. Verified by re-reading against `documentation/letter-mastery-data-model.md` § "Language guidance".
- [ ] `ChildrenList` shows ⚠ for children with attendance < 50% OR zero sessions OR a gap > 7 days between the group's most recent session and the child's `last_attended` (i.e. they've started missing sessions while peers continue).
- [ ] `ChildrenList` shows per-child alignment badges inline: amber `Programme letters not yet taught: ...` (curriculum gap, higher visual weight) and slate `Knew at baseline: ...` (drilling-known, lower visual weight).
- [ ] `RecentSessions` uses native `<details>` for expandable per-child attendance (no client component).
- [ ] `RecentSessions` shows session notes when present (empty string short-circuits).
- [ ] `FlagPillStrip` exists and renders raw flag labels (`Ghost group`, `Moving too fast`, `Curriculum gaps`, `Stagnation`) as small grey pills.

**Routes (Tasks 14–17):**
- [ ] `GroupCard` is wrapped in a `<Link>` to `/my-kids/groups/[class_id]` when `class_id` is non-null. Falls back to a non-clickable article when `class_id === null`.
- [ ] `/my-kids/groups/[class_id]/page.tsx` renders all sections: header, coaching tip panel, letter mastery path (letters phase only), children list, recent sessions. Does NOT render `FlagPillStrip` (PM-only).
- [ ] `/pm/education-assistants/[user-id]/page.tsx` exists as a minimal 1D-lite stub: EA name + school + group list with clickable rows + back link to `/pm/education-assistants`.
- [ ] `/pm/education-assistants/[user-id]/groups/[class_id]/page.tsx` renders the same sections inside the PM layout AND additionally renders `FlagPillStrip` between the header and the coaching tip panel.
- [ ] Invalid `class_id` (EA view) → redirects to `/my-kids`. Verified manually.
- [ ] Invalid `class_id` (PM view, valid user_id) → redirects to `/pm/education-assistants/[user-id]` (the EA detail stub from Task 16). Verified manually. Matches spec § 7 line 460.
- [ ] Invalid `user_id` (PM view) → redirects to `/pm/education-assistants` (scatter plot). Verified manually.
- [ ] PM EA detail stub back arrow → `/pm/education-assistants` (scatter plot). PM group detail back arrow → `/pm/education-assistants/[user-id]` (the EA detail stub).

**Verification (Tasks 18–20):**
- [ ] Two new Playwright e2e tests exist for `/my-kids/groups/[class_id]` redirect paths: unauthenticated deep link preserves the redirect_url; malformed class_id ends up on a login page.
- [ ] Mobile viewport (390px) renders all sections without horizontal scroll.
- [ ] All 13 Playwright tests pass (11 from Phase 1A/1B + 2 from Task 18).
- [ ] Production deploy is green, EA detail page renders correctly on a real phone, PM detail page renders correctly.
- [ ] `/pm/education-assistants` scatter plot and `/schools-2026` still load (regression check).

---

## Next Plan

Once Phase 1C + 1D-lite are complete, the next plan will cover **Phase 1D (full)** — enhancements to the existing `/pm/education-assistants` scatter plot page:

- Add progress bars on each group row in the existing EA detail panel below the scatter plot
- Make each group row clickable → navigates to `/pm/education-assistants/[user-id]/groups/[class_id]` (the route built in this plan)
- Add status badges per group row
- Consider EA-level aggregates (e.g. "this EA has 3 groups with teaching-known flags")
- Consider alignment flag pills on group rows for PM quick-scanning (per spec § 6)

The route file exists after 1D-lite; full Phase 1D is purely about enhancing the entry point from the scatter plot detail panel.

Phase 2 (AI coaching) and Phase 3 (chatbot) remain tracked separately and depend on careful prompt engineering around the mastery-data constraints.
