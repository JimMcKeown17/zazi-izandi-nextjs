# Calendar-Aware Dosage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every time-based dosage metric divide by *expected teaching days* (weekdays minus resolved closures/absences) instead of raw calendar weekdays, make the ghost flag calendar-aware, and surface calendar/data-quality problems on a new PM tab — without ever letting inference mutate a headline metric.

**Architecture:** The denominator fix is entirely about passing the already-supported `program_name` / `youth_uid` arguments into the existing `count_work_days()` / `closed_dates()` resolver at each call site (the resolver and the Masi closure cache already work; the call sites just weren't using them). Session silence is diagnostic only: a new `/api/data-quality/` endpoint reports unexplained-silence schools, unmapped schools, and sync-run health to a new `/pm/data-quality` frontend tab. No session-derived "clamp" — the official denominator is calendar-only and fails pessimistic.

**Tech Stack:** Django 5 + DRF-style function views (Python, pandas for nightly computes), PostgreSQL; Next.js 16 App Router + React 19 + TypeScript + Tailwind (server components calling Django via `djangoFetch`).

**Design spec:** `docs/superpowers/specs/2026-07-20-dosage-date-boundaries-design.md` (read it first).

## Global Constraints

- **Two repos.** Backend tasks (1–6) are in the **Django** repo `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025` on a new branch `feat/calendar-aware-dosage`. Frontend tasks (7–10) are in **this Next.js** repo `/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs` on a new branch `feat/pm-data-quality`.
- **Django: always activate the venv first** — `source venv/bin/activate` — before any `manage.py` command.
- **Django tests:** `python manage.py test api.<module> --settings=config.settings.dev`. The dev DB user has CREATEDB (verified). Patch time via `unittest.mock.patch` on the command/view module's `timezone.now` (freezegun is NOT installed).
- **Django service auth in endpoint tests:** class decorator `@override_settings(INTERNAL_API_SECRET="test-secret-123")` and header `{"HTTP_X_INTERNAL_AUTH": "test-secret-123"}` on `self.client.get(...)`.
- **Frontend: no unit test framework.** Tests are Playwright specs in `/e2e/*.spec.ts` (`npx playwright test`). Server components fetch through `lib/pm/api.ts` helpers returning `{ data, isLive }`; preserve the `?cohort=` param.
- **Git:** feature branches only; **no `Co-Authored-By` trailer** in commit messages. Commit after each task.
- **Session-inclusion cutoff is `2026-02-23`** (confirmed correct; the nightly already uses it, the live endpoints wrongly use `ProgrammeTargets.programme_start_date` = 2026-02-02).
- **The resolver is `api/utils/work_days.py`**: `count_work_days(start, end, *, program_name=None, youth_uid=None)` and `closed_dates(start, end, *, program_name=None)`. Passing `program_name` resolves school/region/type-scoped closures; passing `youth_uid` subtracts that EA's absences. `program_name` is the Teampact school name (e.g. `"Astra Primary School"`), resolved to identity via `SchoolIdentity2026`. `youth_uid` comes from `youth_uid_for_ea(ea_name)` (already in `work_days.py`).

---

## Repo A — Django (`/Users/jimmckeown/Development/Zazi_iZandi_Website_2025`, branch `feat/calendar-aware-dosage`)

Create the branch before Task 1:
```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025 && git checkout -b feat/calendar-aware-dosage
```

### Task 1: `MasiSyncRun` model + sync-run logging

**Why first:** `closure_calendar_ok` (Task 4) and the data-quality endpoint (Task 6) both need a real record of *when the sync last succeeded* — `masi_updated_at` on the cache is the upstream *edit* time (maxes at 24 Jun in prod) and would false-alarm "stale" on a cache synced today.

**Files:**
- Modify: `api/models.py` (add `MasiSyncRun` after `SchoolIdentity2026`, ~line 1451)
- Create: `api/migrations/00NN_masisyncrun.py` (via makemigrations)
- Modify: `api/management/commands/sync_masi_calendar.py:39-66`
- Test: `api/tests_masi_sync_run.py` (new)

**Interfaces:**
- Produces: `MasiSyncRun` model with fields `command`, `started_at`, `finished_at`, `ok` (bool), `date_from` (Date), `date_to` (Date), `closures_count` (int), `absences_count` (int), `error` (text). Helper `MasiSyncRun.latest_ok(command='sync_masi_calendar')` returns the most recent `ok=True` row or `None`.

- [ ] **Step 1: Write the failing test**

Create `api/tests_masi_sync_run.py`:
```python
from datetime import date
from unittest.mock import patch
from django.core.management import call_command
from django.test import TestCase
from api.models import MasiSyncRun, SchoolClosureCache


def _resp(payload):
    class R:
        status_code = 200
        def raise_for_status(self): pass
        def json(self): return payload
    return R()


class MasiSyncRunLoggingTest(TestCase):
    @patch("api.management.commands.sync_masi_calendar.requests.get")
    def test_successful_sync_writes_ok_run(self, mock_get):
        closures = [{
            "id": 1, "date": "2026-06-22", "scope_key": "type:primary",
            "scope_type": "type", "scope_school_type": "primary",
            "scope_region": None, "school_uid": None, "is_open": False,
            "source": "manual", "reason": "break", "updated_at": "2026-06-01T00:00:00Z",
        }]
        mock_get.side_effect = [_resp(closures), _resp([])]
        call_command("sync_masi_calendar", "--date-from", "2026-01-01", "--date-to", "2026-12-31")

        run = MasiSyncRun.latest_ok()
        self.assertIsNotNone(run)
        self.assertTrue(run.ok)
        self.assertEqual(run.closures_count, 1)
        self.assertEqual(run.absences_count, 0)
        self.assertEqual(run.date_from, date(2026, 1, 1))
        self.assertEqual(run.date_to, date(2026, 12, 31))
        self.assertEqual(SchoolClosureCache.objects.count(), 1)

    @patch("api.management.commands.sync_masi_calendar.requests.get")
    def test_failed_sync_writes_failed_run_and_reraises(self, mock_get):
        import requests
        mock_get.side_effect = requests.RequestException("boom")
        with self.assertRaises(Exception):
            call_command("sync_masi_calendar", "--date-from", "2026-01-01", "--date-to", "2026-12-31")
        self.assertIsNone(MasiSyncRun.latest_ok())
        self.assertEqual(MasiSyncRun.objects.filter(ok=False).count(), 1)

    @patch("api.management.commands.sync_masi_calendar.requests.get")
    def test_empty_closures_do_not_wipe_populated_cache(self, mock_get):
        from datetime import date
        SchoolClosureCache.objects.create(masi_id=1, date=date(2026, 6, 22),
            scope_key="type:primary", scope_type="type", canonical_type="primary", is_open=False)
        mock_get.side_effect = [_resp([]), _resp([])]  # upstream returns nothing
        with self.assertRaises(Exception):
            call_command("sync_masi_calendar", "--date-from", "2026-01-01", "--date-to", "2026-12-31")
        self.assertEqual(SchoolClosureCache.objects.count(), 1)  # cache intact
        self.assertIsNone(MasiSyncRun.latest_ok())
        self.assertEqual(MasiSyncRun.objects.filter(ok=False).count(), 1)

    @patch("api.management.commands.sync_masi_calendar.requests.get")
    def test_empty_closures_allowed_with_flag(self, mock_get):
        from datetime import date
        SchoolClosureCache.objects.create(masi_id=1, date=date(2026, 6, 22),
            scope_key="type:primary", scope_type="type", canonical_type="primary", is_open=False)
        mock_get.side_effect = [_resp([]), _resp([])]
        call_command("sync_masi_calendar", "--date-from", "2026-01-01", "--date-to", "2026-12-31",
                     "--allow-empty")
        self.assertEqual(SchoolClosureCache.objects.count(), 0)  # deliberately cleared
        self.assertIsNotNone(MasiSyncRun.latest_ok())
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source venv/bin/activate && python manage.py test api.tests_masi_sync_run --settings=config.settings.dev`
Expected: FAIL — `ImportError: cannot import name 'MasiSyncRun'`.

- [ ] **Step 3: Add the model**

In `api/models.py`, immediately after the `SchoolIdentity2026` class (~line 1451) add:
```python
class MasiSyncRun(models.Model):
    """One row per Masi sync attempt (closures/absences). The authoritative record
    of when the calendar last synced -- distinct from a closure row's masi_updated_at
    (which is the upstream edit time). Used for the closure_calendar_ok health signal."""
    command = models.CharField(max_length=50, default="sync_masi_calendar", db_index=True)
    started_at = models.DateTimeField()
    finished_at = models.DateTimeField(null=True, blank=True)
    ok = models.BooleanField(default=False, db_index=True)
    date_from = models.DateField(null=True, blank=True)
    date_to = models.DateField(null=True, blank=True)
    closures_count = models.IntegerField(default=0)
    absences_count = models.IntegerField(default=0)
    error = models.TextField(blank=True, default="")

    class Meta:
        indexes = [models.Index(fields=["command", "ok", "-finished_at"])]

    @classmethod
    def latest_ok(cls, command="sync_masi_calendar"):
        return cls.objects.filter(command=command, ok=True).order_by("-finished_at").first()
```

- [ ] **Step 4: Make the migration**

Run: `source venv/bin/activate && python manage.py makemigrations api --settings=config.settings.dev`
Expected: creates `api/migrations/00NN_masisyncrun.py`.

- [ ] **Step 5: Write the run log + validate-then-replace guard into the command**

First add an `--allow-empty` flag in `add_arguments` (alongside `--date-from`/`--date-to`):
```python
        parser.add_argument('--allow-empty', action='store_true',
                            help='Permit replacing a populated cache with an empty payload.')
```
Then, in `api/management/commands/sync_masi_calendar.py`, replace the body of `handle` from the `try:` (line 39) through the final `self.stdout.write(...)` (line 66) with:
```python
        from api.models import MasiSyncRun  # local import to avoid circulars
        from datetime import date as _date
        started = timezone.now()

        def _d(s):
            return _date.fromisoformat(s)

        def _fail(msg):
            MasiSyncRun.objects.create(
                command="sync_masi_calendar", started_at=started, finished_at=timezone.now(),
                ok=False, date_from=_d(date_from), date_to=_d(date_to), error=msg,
            )
            raise CommandError(msg)

        try:
            closures = self._get(f'{base}/closures/export/', params, headers)
            absences = self._get(f'{base}/absences/export/', params, headers)
        except requests.RequestException as exc:
            _fail(f'Masi calendar sync failed (cache left intact): {exc}')

        # Validate before the destructive replace. A malformed payload (not a list,
        # or closures missing required keys) or an empty full-window payload while a
        # populated cache exists is almost certainly an upstream failure, not a real
        # "everything is open" state. Refuse to wipe; record a failed run.
        if not isinstance(closures, list) or not isinstance(absences, list):
            _fail('Masi returned a non-list payload; cache left intact.')
        _required = {'id', 'date', 'scope_key', 'scope_type', 'is_open'}
        for r in closures:
            missing = _required - set(r)
            if missing:
                _fail(f'Closure row missing keys {sorted(missing)}; cache left intact.')
        existing = SchoolClosureCache.objects.filter(date__gte=date_from, date__lte=date_to).count()
        if not closures and existing and not options.get('allow_empty'):
            _fail(f'Masi returned 0 closures for {date_from}..{date_to} but cache has '
                  f'{existing}; cache left intact. Use --allow-empty if intentional.')

        with transaction.atomic():
            SchoolClosureCache.objects.filter(date__gte=date_from, date__lte=date_to).delete()
            SchoolClosureCache.objects.bulk_create([
                SchoolClosureCache(
                    masi_id=r['id'], date=r['date'], scope_key=r['scope_key'],
                    scope_type=r['scope_type'], canonical_type=r.get('scope_school_type'),
                    scope_region=r.get('scope_region'), school_uid=r.get('school_uid'),
                    is_open=r['is_open'], source=r.get('source', ''), reason=r.get('reason', ''),
                    masi_updated_at=r.get('updated_at'),
                ) for r in closures
            ])
            StaffAbsenceCache.objects.filter(date__gte=date_from, date__lte=date_to).delete()
            StaffAbsenceCache.objects.bulk_create([
                StaffAbsenceCache(
                    masi_id=r['id'], date=r['date'], youth_uid=r['youth_uid'],
                    reason=r.get('reason', ''), masi_updated_at=r.get('updated_at'),
                ) for r in absences
            ])
            MasiSyncRun.objects.create(
                command="sync_masi_calendar", started_at=started, finished_at=timezone.now(),
                ok=True, date_from=_d(date_from), date_to=_d(date_to),
                closures_count=len(closures), absences_count=len(absences),
            )

        self.stdout.write(self.style.SUCCESS(
            f'Synced {len(closures)} closures, {len(absences)} absences for {date_from}..{date_to}.'
        ))
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `source venv/bin/activate && python manage.py test api.tests_masi_sync_run --settings=config.settings.dev`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add api/models.py api/migrations/ api/management/commands/sync_masi_calendar.py api/tests_masi_sync_run.py
git commit -m "Add MasiSyncRun log + validate-then-replace guard for Masi calendar sync"
```

---

### Task 2: Calendar-scope the nightly dosage denominators (group + school)

**Files:**
- Modify: `api/management/commands/compute_school_summaries_2026.py:208`
- Modify: `api/management/commands/compute_group_summaries_2026.py:355`
- Test: `api/tests_dosage_calendar.py` (new)

**Interfaces:**
- Consumes: `count_work_days(start, end, *, program_name=...)` from `api/utils/work_days.py`; `SchoolIdentity2026`, `SchoolClosureCache` fixtures.
- Produces: `SchoolSummary2026.avg_sessions_per_group_per_week` and `GroupSummary2026.avg_sessions_per_week` now exclude school-/type-scoped closures.

- [ ] **Step 1: Write the failing test**

Create `api/tests_dosage_calendar.py`:
```python
from datetime import date, datetime, timezone as tz
from unittest.mock import patch
from django.core.management import call_command
from django.test import TestCase
from api.models import (
    TeampactSession2026, SchoolSummary2026, GroupSummary2026,
    SchoolClosureCache, SchoolIdentity2026,
)

FIXED_NOW = datetime(2026, 3, 20, 12, 0, tzinfo=tz.utc)  # a Friday


def _session(sid, day, school="Test Primary", group="G1", user="EA One"):
    return TeampactSession2026.objects.create(
        attendance_id=sid, session_id=sid, program_name=school, class_name=group,
        user_id=1, user_name=user,
        session_started_at=datetime(day.year, day.month, day.day, 12, 0, tzinfo=tz.utc),
    )


class CalendarScopedDosageTest(TestCase):
    def setUp(self):
        SchoolIdentity2026.objects.create(
            program_name="Test Primary", school_uid="SCH-T",
            canonical_type="primary", suburb="TESTBURG",
        )
        # A type:primary closure covering the whole week 2026-03-09..03-13 (Mon-Fri)
        for d in [date(2026, 3, 9), date(2026, 3, 10), date(2026, 3, 11),
                  date(2026, 3, 12), date(2026, 3, 13)]:
            SchoolClosureCache.objects.create(
                masi_id=hash((str(d), "t")) % 100000, date=d,
                scope_key="type:primary", scope_type="type", canonical_type="primary",
                is_open=False,
            )
        # 3 sessions in the first week (Mon/Tue/Wed 2026-03-02..03-04)
        _session(1, date(2026, 3, 2)); _session(2, date(2026, 3, 3)); _session(3, date(2026, 3, 4))

    def test_school_dosage_excludes_type_scoped_closure(self):
        # weekdays 03-02..03-20 = 15; minus 5 closed = 10 work-days = 2 work-weeks.
        # 3 sessions / 2 weeks / 1 group = 1.5  (was 3/3 = 1.0 without program_name)
        with patch("api.management.commands.compute_school_summaries_2026.timezone.now", return_value=FIXED_NOW):
            call_command("compute_school_summaries_2026")
        s = SchoolSummary2026.objects.get(school_name="Test Primary")
        self.assertEqual(s.avg_sessions_per_group_per_week, 1.5)

    def test_group_dosage_excludes_type_scoped_closure(self):
        with patch("api.management.commands.compute_school_summaries_2026.timezone.now", return_value=FIXED_NOW), \
             patch("api.management.commands.compute_group_summaries_2026.timezone.now", return_value=FIXED_NOW):
            call_command("compute_school_summaries_2026")
            call_command("compute_group_summaries_2026")
        g = GroupSummary2026.objects.get(class_name="G1")
        self.assertEqual(g.avg_sessions_per_week, 1.5)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source venv/bin/activate && python manage.py test api.tests_dosage_calendar --settings=config.settings.dev`
Expected: FAIL — both assert 1.5 but get 1.0 (denominator still counts the closed week).

- [ ] **Step 3: Pass `program_name` at the school call site**

`api/management/commands/compute_school_summaries_2026.py:208` — change:
```python
                work_days = count_work_days(earliest.date(), now.date())
```
to:
```python
                work_days = count_work_days(earliest.date(), now.date(), program_name=school_name)
```

- [ ] **Step 4: Pass `program_name` at the group call site**

`api/management/commands/compute_group_summaries_2026.py:355` — change:
```python
                work_days = count_work_days(first_date, now.date())
```
to:
```python
                work_days = count_work_days(first_date, now.date(), program_name=program)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `source venv/bin/activate && python manage.py test api.tests_dosage_calendar --settings=config.settings.dev`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add api/management/commands/compute_school_summaries_2026.py api/management/commands/compute_group_summaries_2026.py api/tests_dosage_calendar.py
git commit -m "Scope nightly dosage denominators to per-school closures"
```

---

### Task 3: Calendar-aware ghost flag

**Files:**
- Modify: `api/management/commands/compute_group_summaries_2026.py:390-393` (and add a helper near line 121)
- Test: `api/tests_ghost_flag_calendar.py` (new)

**Interfaces:**
- Consumes: `closed_dates(start, end, *, program_name=...)` from `api/utils/work_days.py`.
- Produces: `GroupSummary2026.flag_ghost` now counts only *expected-open* weekdays (weekdays minus school closures) since the last session.

- [ ] **Step 1: Write the failing test**

Create `api/tests_ghost_flag_calendar.py`:
```python
from datetime import date, datetime, timezone as tz
from unittest.mock import patch
from django.core.management import call_command
from django.test import TestCase
from api.models import TeampactSession2026, GroupSummary2026, SchoolClosureCache, SchoolIdentity2026

FIXED_NOW = datetime(2026, 3, 20, 12, 0, tzinfo=tz.utc)


def _session(sid, day, school, group="G1"):
    return TeampactSession2026.objects.create(
        attendance_id=sid, session_id=sid, program_name=school, class_name=group,
        user_id=1, user_name="EA One",
        session_started_at=datetime(day.year, day.month, day.day, 12, 0, tzinfo=tz.utc),
    )


class GhostFlagCalendarTest(TestCase):
    def test_break_does_not_ghost_flag(self):
        # School on a type:primary break 03-09..03-20; last session 03-06.
        SchoolIdentity2026.objects.create(program_name="Break School", school_uid="SCH-B",
                                           canonical_type="primary", suburb="B")
        for d in [date(2026, 3, 9), date(2026, 3, 10), date(2026, 3, 11), date(2026, 3, 12),
                  date(2026, 3, 13), date(2026, 3, 16), date(2026, 3, 17), date(2026, 3, 18),
                  date(2026, 3, 19), date(2026, 3, 20)]:
            SchoolClosureCache.objects.create(masi_id=hash(str(d)) % 100000, date=d,
                scope_key="type:primary", scope_type="type", canonical_type="primary", is_open=False)
        for i, d in enumerate([date(2026, 3, 2), date(2026, 3, 4), date(2026, 3, 6)]):
            _session(i + 1, d, "Break School")
        with patch("api.management.commands.compute_school_summaries_2026.timezone.now", return_value=FIXED_NOW), \
             patch("api.management.commands.compute_group_summaries_2026.timezone.now", return_value=FIXED_NOW):
            call_command("compute_school_summaries_2026")
            call_command("compute_group_summaries_2026")
        self.assertFalse(GroupSummary2026.objects.get(school_name="Break School").flag_ghost)

    def test_real_silence_still_ghost_flags(self):
        # Same last session 03-06, but NO closure -> genuinely abandoned -> flag.
        SchoolIdentity2026.objects.create(program_name="Dead School", school_uid="SCH-D",
                                           canonical_type="primary", suburb="D")
        for i, d in enumerate([date(2026, 3, 2), date(2026, 3, 4), date(2026, 3, 6)]):
            _session(i + 10, d, "Dead School")
        with patch("api.management.commands.compute_school_summaries_2026.timezone.now", return_value=FIXED_NOW), \
             patch("api.management.commands.compute_group_summaries_2026.timezone.now", return_value=FIXED_NOW):
            call_command("compute_school_summaries_2026")
            call_command("compute_group_summaries_2026")
        self.assertTrue(GroupSummary2026.objects.get(school_name="Dead School").flag_ghost)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source venv/bin/activate && python manage.py test api.tests_ghost_flag_calendar --settings=config.settings.dev`
Expected: FAIL — `test_break_does_not_ghost_flag` fails (break currently flags because `_count_weekdays` ignores closures).

- [ ] **Step 3: Add a closure-aware helper**

In `api/management/commands/compute_group_summaries_2026.py`, add near `_count_weekdays` (after line 129):
```python
def _open_weekdays_since(last_date, today, program_name):
    """Weekdays strictly after last_date up to today that were expected-open for this
    school (Mon-Fri minus resolved closures). Unlike count_work_days there is no min-1
    floor, so a fully-closed gap correctly returns 0."""
    from api.utils.work_days import closed_dates
    closed = closed_dates(last_date + timedelta(days=1), today, program_name=program_name)
    count = 0
    current = last_date + timedelta(days=1)
    while current <= today:
        if current.weekday() < 5 and current not in closed:
            count += 1
        current += timedelta(days=1)
    return count
```

- [ ] **Step 4: Use it in the ghost flag**

`api/management/commands/compute_group_summaries_2026.py:391-393` — change:
```python
            if last_date:
                weekdays_since = _count_weekdays(last_date, now.date())
                flag_ghost = weekdays_since >= 5
```
to:
```python
            if last_date:
                weekdays_since = _open_weekdays_since(last_date, now.date(), program)
                flag_ghost = weekdays_since >= 5
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `source venv/bin/activate && python manage.py test api.tests_ghost_flag_calendar --settings=config.settings.dev`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add api/management/commands/compute_group_summaries_2026.py api/tests_ghost_flag_calendar.py
git commit -m "Make ghost-group flag calendar-aware (breaks no longer mass-flag)"
```

---

### Task 4: `programme_overview` — session cutoff, on-track target, calendar-aware EA metrics, `closure_calendar_ok`

**Files:**
- Create: `api/constants_2026.py` (shared `SESSION_INCLUSION_CUTOFF`, `CLOSURE_STALE_AFTER_DAYS`), `api/utils/calendar_health.py` (shared health evaluator)
- Modify: `api/utils/work_days.py` (add `modal_school`), `api/views.py` (session cutoff, on-track target, **weighted_dosage → group-weighted**, EA modal denominators, `closure_calendar_ok`)
- Test: `api/tests_programme_overview_calendar.py` (new)

**Interfaces:**
- Consumes: `MasiSyncRun` (Task 1); `count_work_days(..., program_name=, youth_uid=)`, `youth_uid_for_ea`, `modal_school` (work_days.py).
- Produces: `weighted_dosage` is now the group-weighted mean of `GroupSummary2026.avg_sessions_per_week` (kills the school-formula staggered-start bias); `data_health.closure_calendar_ok` (bool) from the shared `calendar_health()`; on-track uses `targets.target_dosage`; EA programme-day denominators are calendar/absence aware with a session-deduped modal school. Shared helpers: `calendar_health(today) -> dict`, `modal_school({session_id: program}) -> str|None`.

- [ ] **Step 1: Write the failing tests**

Create `api/tests_programme_overview_calendar.py`:
```python
from datetime import date, timedelta
from django.test import TestCase, override_settings
from django.utils import timezone
from api.models import ProgrammeTargets, SchoolSummary2026, GroupSummary2026, MasiSyncRun

AUTH = {"HTTP_X_INTERNAL_AUTH": "test-secret-123"}


def _targets():
    ProgrammeTargets.objects.create(
        year=2026, programme_start_date=date(2026, 2, 2),
        programme_end_date=date(2026, 11, 30), teaching_start_date=date(2026, 3, 9),
        target_dosage=2.5, target_on_track_pct=80.0, target_flag_resolution_pct=70.0,
        target_assessment_coverage_pct=95.0, target_mentor_coverage_days=30,
    )


def _ok_sync(**kw):
    now = timezone.now()
    d = dict(command="sync_masi_calendar", started_at=now, finished_at=now, ok=True,
             date_from=date(2026, 1, 1), date_to=date(2026, 12, 31),
             closures_count=384, absences_count=1340)
    d.update(kw)
    return MasiSyncRun.objects.create(**d)


@override_settings(INTERNAL_API_SECRET="test-secret-123")
class ClosureCalendarOkTest(TestCase):
    def setUp(self):
        _targets()
        SchoolSummary2026.objects.create(school_name="Astra Primary School",
                                         school_type="Primary School", children_count=50)

    def _ok(self):
        return self.client.get("/api/programme-overview/?cohort=all", **AUTH).json()["data_health"]["closure_calendar_ok"]

    def test_false_when_no_sync(self):
        self.assertFalse(self._ok())

    def test_true_with_recent_full_window_sync(self):
        _ok_sync()
        self.assertTrue(self._ok())

    def test_false_when_latest_attempt_failed_after_success(self):
        _ok_sync()
        MasiSyncRun.objects.create(command="sync_masi_calendar", started_at=timezone.now(),
            finished_at=timezone.now(), ok=False, date_from=date(2026, 1, 1),
            date_to=date(2026, 12, 31), error="boom")
        self.assertFalse(self._ok())

    def test_false_when_window_misses_cutoff(self):
        _ok_sync(date_from=date(2026, 6, 1))  # starts after the 2026-02-23 cutoff
        self.assertFalse(self._ok())

    def test_false_when_stale(self):
        _ok_sync(finished_at=timezone.now() - timedelta(days=5))
        self.assertFalse(self._ok())


@override_settings(INTERNAL_API_SECRET="test-secret-123")
class WeightedDosageGroupWeightedTest(TestCase):
    def setUp(self):
        _targets()
        # School-formula would give a different number; group-weighted mean = 2.25.
        SchoolSummary2026.objects.create(school_name="Astra Primary School",
            school_type="Primary School", children_count=50,
            groups_count=2, avg_sessions_per_group_per_week=1.0)
        GroupSummary2026.objects.create(school_name="Astra Primary School",
            program_name="Astra Primary School", class_name="G1", ea_name="EA One",
            avg_sessions_per_week=1.5)
        GroupSummary2026.objects.create(school_name="Astra Primary School",
            program_name="Astra Primary School", class_name="G2", ea_name="EA Two",
            avg_sessions_per_week=3.0)

    def test_weighted_dosage_is_group_weighted_mean(self):
        resp = self.client.get("/api/programme-overview/?cohort=all", **AUTH)
        self.assertEqual(resp.json()["kpis"]["weighted_dosage"], 2.25)
```
> If `GroupSummary2026.objects.create(...)` raises for a missing required field, add it (the error names it) — the model has many defaulted fields; `program_name`, `class_name`, `school_name`, `ea_name`, `avg_sessions_per_week` are the load-bearing ones here.

- [ ] **Step 2: Run test to verify it fails**

Run: `source venv/bin/activate && python manage.py test api.tests_programme_overview_calendar --settings=config.settings.dev`
Expected: FAIL — `KeyError: 'closure_calendar_ok'`.

- [ ] **Step 3: Add the shared constant + `modal_school` + `calendar_health` helpers**

Create `api/constants_2026.py`:
```python
"""Shared 2026 programme constants (single source of truth for cross-module values)."""
from datetime import timezone as _tz
from datetime import datetime as _dt

# Sessions before this date are training/demos and excluded from all metrics.
# The nightly computes already use this; live endpoints must match it.
SESSION_INCLUSION_CUTOFF = _dt(2026, 2, 23, tzinfo=_tz.utc)

# How recent the last successful Masi calendar sync must be for the calendar to
# be considered healthy.
CLOSURE_STALE_AFTER_DAYS = 2
```

Add `modal_school` to `api/utils/work_days.py` (deterministic so the scatter and its trajectory always pick the same school):
```python
def modal_school(session_program_map):
    """The school an EA logged the most DISTINCT sessions at, given a
    {session_id: program_name} map. Ties broken alphabetically so the result is
    stable across endpoints. Returns None for an empty map."""
    from collections import Counter
    if not session_program_map:
        return None
    counts = Counter(session_program_map.values())
    return min(counts.items(), key=lambda kv: (-kv[1], kv[0]))[0]
```

Create `api/utils/calendar_health.py` — the single evaluator both endpoints share, so the Overview badge and the Data Quality tab can never disagree:
```python
"""Is the closure calendar healthy as of `today`? Used by programme_overview
(the badge) and data_quality (the tab). Judges the most recent sync ATTEMPT."""
from datetime import timedelta
from django.utils import timezone
from api.models import MasiSyncRun
from api.constants_2026 import SESSION_INCLUSION_CUTOFF, CLOSURE_STALE_AFTER_DAYS


def calendar_health(today):
    latest = (MasiSyncRun.objects.filter(command="sync_masi_calendar")
              .order_by("-started_at").first())
    last_ok = MasiSyncRun.latest_ok()
    cutoff_date = SESSION_INCLUSION_CUTOFF.date()
    fresh = bool(latest and latest.ok and latest.finished_at
                 and (timezone.now() - latest.finished_at) <= timedelta(days=CLOSURE_STALE_AFTER_DAYS))
    covers = bool(latest and latest.ok and latest.date_from and latest.date_to
                  and latest.date_from <= cutoff_date and latest.date_to >= today)
    ok = bool(latest and latest.ok and fresh and covers)
    return {
        "ok": ok,
        "last_ok_at": last_ok.finished_at.isoformat() if last_ok and last_ok.finished_at else None,
        "date_from": last_ok.date_from.isoformat() if last_ok and last_ok.date_from else None,
        "date_to": last_ok.date_to.isoformat() if last_ok and last_ok.date_to else None,
        "closures_count": last_ok.closures_count if last_ok else 0,
        "latest_attempt_failed": bool(latest and not latest.ok),
    }
```

- [ ] **Step 4: Session cutoff, group-weighted dosage, on-track target, `closure_calendar_ok`**

In `api/views.py`:

Add to the imports near line 17:
```python
from api.constants_2026 import SESSION_INCLUSION_CUTOFF
from api.utils.calendar_health import calendar_health
```

**(a) Session cutoff.** Line 606 — change the EA session filter start:
```python
        .filter(session_started_at__gte=start_date)
```
to:
```python
        .filter(session_started_at__gte=SESSION_INCLUSION_CUTOFF)
```

**(b) Group-weighted dosage.** The current school-formula weighted dosage (lines 556-558) has a staggered-start bias (it divides late-starting groups by the whole school's window). Replace lines 556-558:
```python
    # --- Weighted dosage (from school-level data, which uses per-school first_session_date) ---
    total_weighted = sum(s.avg_sessions_per_group_per_week * s.groups_count for s in schools)
    weighted_dosage = round(total_weighted / max(total_groups, 1), 2)
```
with a comment placeholder (the real computation moves below, after `groups_qs` exists):
```python
    # weighted_dosage is computed below from GroupSummary2026 (group-weighted) --
    # see just after groups_qs is finalized.
```
Then, immediately after `groups_qs` is finalized (right after line 570 `groups_qs = [g for g in groups_qs if not is_excluded_program(g.program_name)]`, before the `on_track =` line), insert:
```python
    # Group-weighted dosage: mean of each group's own calendar-scoped dosage.
    # This is the one shared dosage implementation; the school formula is not used
    # for the headline anymore (it understated staggered-start schools).
    _group_dosages = [g.avg_sessions_per_week for g in groups_qs]
    weighted_dosage = round(sum(_group_dosages) / max(len(_group_dosages), 1), 2)
```

**(c) On-track targets.** Line 572 (now shifted down by the insert) — change the on-track literal:
```python
    on_track = sum(1 for g in groups_qs if g.avg_sessions_per_week >= 2.5)
```
to:
```python
    on_track = sum(1 for g in groups_qs if g.avg_sessions_per_week >= targets.target_dosage)
```
And the EA on-track literal (line 661):
```python
        sum(1 for r in sessions_per_day_worked_values if r >= 2.5) / max(total_active_eas, 1) * 100, 1
```
to:
```python
        sum(1 for r in sessions_per_day_worked_values if r >= targets.target_dosage) / max(total_active_eas, 1) * 100, 1
```

**(d) `closure_calendar_ok`.** Immediately before the `return JsonResponse({` at line 745, add:
```python
    closure_calendar_ok = calendar_health(today)["ok"]
```
In the `"data_health"` dict (lines 792-796) add the field:
```python
        "data_health": {
            "freshness_hours": freshness_hours,
            "last_sync": latest_compute.isoformat(),
            "join_match_rate": join_match_rate,
            "closure_calendar_ok": closure_calendar_ok,
        },
```

- [ ] **Step 5: Make EA programme-day denominators calendar/absence aware**

`sessions_2026` is attendance-grain (multiple rows per `session_id`), so the modal school must be counted over **distinct sessions**, not raw rows. Extend the `ea_data` aggregation. In `api/views.py` (~lines 622-633) it currently reads:
```python
    ea_data = defaultdict(lambda: {'session_ids': set(), 'dates': set()})
    for row in ea_sessions_qs:
        eid = row.get('user_id')
        ename = row.get('user_name')
        if eid is None and not ename:
            continue
        ea_key = eid if eid is not None else f"name:{ename}"
        ea_data[ea_key]['session_ids'].add(row['session_id'])
        ea_data[ea_key]['dates'].add(row['session_started_at'].date())
```
Change it to keep a `{session_id: program_name}` map (deduping by session) and the name:
```python
    ea_data = defaultdict(lambda: {'session_ids': set(), 'dates': set(),
                                   'session_school': {}, 'user_name': None})
    for row in ea_sessions_qs:
        eid = row.get('user_id')
        ename = row.get('user_name')
        if eid is None and not ename:
            continue
        ea_key = eid if eid is not None else f"name:{ename}"
        ea_data[ea_key]['session_ids'].add(row['session_id'])
        ea_data[ea_key]['dates'].add(row['session_started_at'].date())
        ea_data[ea_key]['session_school'][row['session_id']] = row['program_name']
        ea_data[ea_key]['user_name'] = ename
```
Then in the metrics loop change lines 650-651:
```python
        first_date = min(stats['dates'])
        work_days = count_work_days(first_date, today)
```
to:
```python
        first_date = min(stats['dates'])
        # Modal school (over distinct sessions, deterministic) resolves the EA's
        # school-type break; youth_uid subtracts their personal absences.
        work_days = count_work_days(
            first_date, today,
            program_name=modal_school(stats['session_school']),
            youth_uid=youth_uid_for_ea(stats['user_name']),
        )
```
Extend the resolver import near line 17 to include `youth_uid_for_ea` and `modal_school`:
```python
from .utils.work_days import count_work_days, closed_dates, youth_uid_for_ea, modal_school
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `source venv/bin/activate && python manage.py test api.tests_programme_overview_calendar --settings=config.settings.dev`
Expected: PASS (6 tests). Also run the existing overview test to confirm no regression: `python manage.py test api.tests_ea_roster --settings=config.settings.dev`.

- [ ] **Step 7: Commit**

```bash
git add api/constants_2026.py api/utils/calendar_health.py api/utils/work_days.py api/views.py api/tests_programme_overview_calendar.py
git commit -m "programme_overview: group-weighted dosage, 2026-02-23 cutoff, target_dosage, calendar-aware EA metrics, closure_calendar_ok"
```

---

### Task 5: Calendar-scope the EA scatter + trajectory denominators (`ea_performance` + `ea_performance_history`)

**Why this matters:** the `/pm/education-assistants` scatter (x = sessions/programme-day, y = alignment) is a high-value operational tool. Its x-axis is currently break-inflated exactly like weighted dosage was. The scatter (`ea_performance`) and its over-time trajectory (`ea_performance_history`) must stay in **parity** — both compute the same x — so both denominators change together, using the same modal-school + absence resolution.

**Files:**
- Modify: `api/views.py` — `ea_performance` (start filter ~line 1458; denominator ~1570-1575), `ea_performance_history` (start filter ~line 1741; per-EA loop ~1807; denominator ~1826)
- Test: `api/tests_ea_performance_calendar.py` (new)

**Interfaces:**
- Consumes: `SESSION_INCLUSION_CUTOFF`, `count_work_days(..., program_name=, youth_uid=)`, `youth_uid_for_ea` (all imported in Task 4).
- Produces: both endpoints' `sessions_per_programme_day` exclude school-scoped closures + the EA's absences. Each EA's modal school = the `program_name` they logged most sessions at.

- [ ] **Step 1: Write the failing test**

Create `api/tests_ea_performance_calendar.py`:
```python
from datetime import date, datetime, timezone as tz
from django.test import TestCase, override_settings
from api.models import (
    ProgrammeTargets, TeampactSession2026, SchoolClosureCache, StaffAbsenceCache,
    SchoolIdentity2026, YouthIdentity2026, GroupAlignmentSnapshot2026,
)

AUTH = {"HTTP_X_INTERNAL_AUTH": "test-secret-123"}


def _targets():
    ProgrammeTargets.objects.create(
        year=2026, programme_start_date=date(2026, 2, 2),
        programme_end_date=date(2026, 11, 30), teaching_start_date=date(2026, 3, 9),
        target_dosage=2.5, target_on_track_pct=80.0, target_flag_resolution_pct=70.0,
        target_assessment_coverage_pct=95.0, target_mentor_coverage_days=30)


def _session(sid, day, school="Astra Primary School", group="G1", user="EA One", uid=1):
    TeampactSession2026.objects.create(
        attendance_id=sid, session_id=sid, program_name=school, class_name=group,
        user_id=uid, user_name=user,
        session_started_at=datetime(day.year, day.month, day.day, 12, 0, tzinfo=tz.utc))


@override_settings(INTERNAL_API_SECRET="test-secret-123")
class EAScatterHistoryParityTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        _targets()
        SchoolIdentity2026.objects.create(program_name="Astra Primary School", school_uid="SCH-A",
                                          canonical_type="primary", suburb="A")
        for d in [date(2026, 3, 9), date(2026, 3, 10), date(2026, 3, 11), date(2026, 3, 12), date(2026, 3, 13)]:
            SchoolClosureCache.objects.create(masi_id=hash(str(d)) % 100000, date=d,
                scope_key="type:primary", scope_type="type", canonical_type="primary", is_open=False)
        _session(1, date(2026, 3, 2)); _session(2, date(2026, 3, 3)); _session(3, date(2026, 3, 4))
        # Anchor both endpoints' end date to 2026-03-20 via the latest snapshot.
        GroupAlignmentSnapshot2026.objects.create(
            snapshot_date=date(2026, 3, 20), program_name="Astra Primary School",
            class_name="G1", ea_name="EA One")

    def test_scatter_x_excludes_type_scoped_closure(self):
        # weekdays 03-02..03-20 = 15; minus 5 type:primary closed = 10 work-days.
        # 3 sessions / 10 = 0.3  (was 3/15 = 0.2 without program_name)
        eas = {e["ea_name"]: e for e in self.client.get("/api/ea-performance/?cohort=all", **AUTH).json()["eas"]}
        self.assertEqual(eas["EA One"]["sessions_per_programme_day"], 0.3)

    def test_history_last_point_equals_scatter(self):
        # Parity: the trajectory's final x at the anchor date must equal the scatter x.
        eas = {e["ea_name"]: e for e in self.client.get("/api/ea-performance-history/?cohort=all", **AUTH).json()["eas"]}
        self.assertEqual(eas["EA One"]["trajectory"][-1]["x"], 0.3)


@override_settings(INTERNAL_API_SECRET="test-secret-123")
class EAScatterAbsenceTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        _targets()
        SchoolIdentity2026.objects.create(program_name="Astra Primary School", school_uid="SCH-A",
                                          canonical_type="primary", suburb="A")
        YouthIdentity2026.objects.create(ea_name="EA One", youth_uid="YTH-1")
        StaffAbsenceCache.objects.create(masi_id=1, youth_uid="YTH-1", date=date(2026, 3, 5))
        _session(1, date(2026, 3, 2)); _session(2, date(2026, 3, 3)); _session(3, date(2026, 3, 4))
        GroupAlignmentSnapshot2026.objects.create(
            snapshot_date=date(2026, 3, 20), program_name="Astra Primary School",
            class_name="G1", ea_name="EA One")

    def test_scatter_x_excludes_personal_absence(self):
        # 15 weekdays - 0 closures - 1 absence (03-05) = 14 work-days; 3/14 = 0.21
        eas = {e["ea_name"]: e for e in self.client.get("/api/ea-performance/?cohort=all", **AUTH).json()["eas"]}
        self.assertEqual(eas["EA One"]["sessions_per_programme_day"], 0.21)
```
> If `YouthIdentity2026`/`StaffAbsenceCache.objects.create(...)` raises for a missing required field, add it (the error names it). The load-bearing fields are `ea_name`+`youth_uid` (identity) and `youth_uid`+`date` (absence).

- [ ] **Step 2: Run test to verify it fails**

Run: `source venv/bin/activate && python manage.py test api.tests_ea_performance_calendar --settings=config.settings.dev`
Expected: FAIL — `test_scatter_x_excludes_type_scoped_closure` asserts 0.3 but gets 0.2 (closed week still counted).

- [ ] **Step 3: Fix `ea_performance` (scatter) cutoff + denominator**

`api/views.py:1458` — change `start_date = targets.programme_start_date` to:
```python
    start_date = SESSION_INCLUSION_CUTOFF
```
The scatter's `ea_session_data` build (~lines 1476-1490) currently keeps only attendance-weighted `school_counts`. Add a session-deduped `{session_id: program}` map. Change the defaultdict factory to include `'session_school': {}`, and inside the row loop add:
```python
        ea_session_data[ea_key]['session_school'][row['session_id']] = row['program_name']
```
`api/views.py:1570-1575` — the block currently reads:
```python
            work_days = count_work_days(first_date, end_date)
            sessions_per_programme_day = round(total_sessions / max(work_days, 1), 2)
            school = max(
                session_info['school_counts'],
                key=session_info['school_counts'].get
            ) if session_info['school_counts'] else ''
```
Use the shared deterministic modal school (over distinct sessions) plus the EA's absences:
```python
            work_days = count_work_days(
                first_date, end_date,
                program_name=modal_school(session_info['session_school']),
                youth_uid=youth_uid_for_ea(ea_name),
            )
            sessions_per_programme_day = round(total_sessions / max(work_days, 1), 2)
            school = modal_school(session_info['session_school']) or ''
```

- [ ] **Step 4: Fix `ea_performance_history` (trajectory) cutoff + denominator**

`api/views.py:1741` — change `start_date = targets.programme_start_date` to:
```python
        start_date = SESSION_INCLUSION_CUTOFF
```
In the per-EA loop, just after `for ea_name in sorted(all_ea_names):` and `sess_list = ea_sessions.get(ea_name, [])` (~line 1808), derive the same deterministic modal school (deduped by session id — `sess_list` entries are `(date, session_id, program_name)`) and youth_uid once:
```python
        _modal = modal_school({sid: prog for _, sid, prog in sess_list})
        _youth_uid = youth_uid_for_ea(ea_name)
```
`api/views.py:1826` — change:
```python
                work_days = count_work_days(first_date, d)
```
to:
```python
                work_days = count_work_days(first_date, d, program_name=_modal, youth_uid=_youth_uid)
```
> This makes the trajectory use the same whole-period modal school + absences as the scatter, so the final trajectory x equals the scatter x (the parity test). Per-date modal (so a mid-year school transfer doesn't retro-change older points) is a deferred refinement — see Deferred.

- [ ] **Step 5: Run tests to verify they pass**

Run: `source venv/bin/activate && python manage.py test api.tests_ea_performance_calendar --settings=config.settings.dev`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add api/views.py api/tests_ea_performance_calendar.py
git commit -m "Scope EA scatter + trajectory denominators to closures + absences; 2026-02-23 cutoff"
```

---

### Task 6: `/api/data-quality/` endpoint

**Files:**
- Modify: `api/views.py` (add `data_quality` view), `api/urls.py` (add route)
- Test: `api/tests_data_quality.py` (new)

**Interfaces:**
- Consumes: `SESSION_INCLUSION_CUTOFF`, `closed_dates`, `MasiSyncRun.latest_ok()`, `SchoolIdentity2026`, `TeampactSession2026`, `exclude_excluded_programs`.
- Produces: `GET /api/data-quality/` → JSON `{ closure_calendar: calendar_health(today), unmapped_schools: [name...], silent_schools: [{school, last_session_date, expected_open_days}] }` — `closure_calendar` is the shared evaluator's dict `{ok, last_ok_at, date_from, date_to, closures_count, latest_attempt_failed}`. Constant `SILENCE_THRESHOLD_DAYS = 10`.

- [ ] **Step 1: Write the failing test**

Create `api/tests_data_quality.py`:
```python
from datetime import date, datetime, timezone as tz
from unittest.mock import patch
from django.test import TestCase, override_settings
from api.models import TeampactSession2026, SchoolClosureCache, SchoolIdentity2026, MasiSyncRun

AUTH = {"HTTP_X_INTERNAL_AUTH": "test-secret-123"}
FIXED_NOW = datetime(2026, 3, 20, 12, 0, tzinfo=tz.utc)


def _session(sid, day, school, group="G1"):
    TeampactSession2026.objects.create(
        attendance_id=sid, session_id=sid, program_name=school, class_name=group,
        user_id=1, user_name="EA One",
        session_started_at=datetime(day.year, day.month, day.day, 12, 0, tzinfo=tz.utc))


@override_settings(INTERNAL_API_SECRET="test-secret-123")
class DataQualityEndpointTest(TestCase):
    def test_silent_school_with_no_closure_is_flagged(self):
        SchoolIdentity2026.objects.create(program_name="Silent School", school_uid="SCH-S",
                                          canonical_type="primary", suburb="S")
        _session(1, date(2026, 3, 2), "Silent School")  # last session 03-02, ~14 open weekdays silence
        with patch("api.views.timezone.now", return_value=FIXED_NOW):
            resp = self.client.get("/api/data-quality/", **AUTH)
        names = [s["school"] for s in resp.json()["silent_schools"]]
        self.assertIn("Silent School", names)

    def test_school_on_break_is_not_flagged(self):
        SchoolIdentity2026.objects.create(program_name="Break School", school_uid="SCH-B",
                                          canonical_type="primary", suburb="B")
        _session(2, date(2026, 3, 2), "Break School")
        for d in [date(2026, 3, 3), date(2026, 3, 4), date(2026, 3, 5), date(2026, 3, 6),
                  date(2026, 3, 9), date(2026, 3, 10), date(2026, 3, 11), date(2026, 3, 12),
                  date(2026, 3, 13), date(2026, 3, 16), date(2026, 3, 17), date(2026, 3, 18),
                  date(2026, 3, 19), date(2026, 3, 20)]:
            SchoolClosureCache.objects.create(masi_id=hash(str(d)) % 100000, date=d,
                scope_key="type:primary", scope_type="type", canonical_type="primary", is_open=False)
        with patch("api.views.timezone.now", return_value=FIXED_NOW):
            resp = self.client.get("/api/data-quality/", **AUTH)
        names = [s["school"] for s in resp.json()["silent_schools"]]
        self.assertNotIn("Break School", names)

    def test_unmapped_school_is_flagged(self):
        _session(3, date(2026, 3, 18), "Unmapped School")  # no SchoolIdentity2026 row
        with patch("api.views.timezone.now", return_value=FIXED_NOW):
            resp = self.client.get("/api/data-quality/", **AUTH)
        self.assertIn("Unmapped School", resp.json()["unmapped_schools"])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source venv/bin/activate && python manage.py test api.tests_data_quality --settings=config.settings.dev`
Expected: FAIL — 404 (route not defined).

- [ ] **Step 3: Add the view**

In `api/views.py` add (reuse existing helpers `exclude_excluded_programs`, `closed_dates`, `SESSION_INCLUSION_CUTOFF`, `MasiSyncRun`, `SchoolIdentity2026`):
```python
SILENCE_THRESHOLD_DAYS = 10  # expected-open weekdays of silence before we ask "break or problem?"


@csrf_exempt  # X-Internal-Auth is enforced by middleware, same as programme_overview
def data_quality(request):
    from datetime import timedelta
    from django.db.models import Max
    today = timezone.now().date()

    sess = exclude_excluded_programs(
        TeampactSession2026.objects
        .filter(session_started_at__gte=SESSION_INCLUSION_CUTOFF)
        .exclude(program_name__isnull=True).exclude(program_name__exact='')
    )
    # last session date per school
    per_school = sess.values('program_name').annotate(last=Max('session_started_at'))

    mapped = set(SchoolIdentity2026.objects.values_list('program_name', flat=True))
    active_names = set()
    silent = []
    for row in per_school:
        name = row['program_name']
        active_names.add(name)
        last_date = row['last'].date()
        if last_date >= today:
            continue
        closed = closed_dates(last_date + timedelta(days=1), today, program_name=name)
        open_days = 0
        d = last_date + timedelta(days=1)
        while d <= today:
            if d.weekday() < 5 and d not in closed:
                open_days += 1
            d += timedelta(days=1)
        if open_days >= SILENCE_THRESHOLD_DAYS:
            silent.append({
                "school": name,
                "last_session_date": last_date.isoformat(),
                "expected_open_days": open_days,
            })

    unmapped = sorted(n for n in active_names if n not in mapped)
    silent.sort(key=lambda s: -s["expected_open_days"])

    return JsonResponse({
        # Same evaluator the Overview badge uses, so the two never disagree.
        "closure_calendar": calendar_health(today),
        "unmapped_schools": unmapped,
        "silent_schools": silent,
    })
```
Note: `programme_overview` carries only `@csrf_exempt`; `X-Internal-Auth` is enforced globally by middleware, so `data_quality` needs no extra guard. `exclude_excluded_programs`, `closed_dates`, `SESSION_INCLUSION_CUTOFF`, `calendar_health`, and `SchoolIdentity2026` are all imported/available in `views.py` after Task 4. (`calendar_health` is imported there in Task 4 Step 4.)

- [ ] **Step 4: Add the route**

In `api/urls.py`, add alongside the other flat routes (mirror the `programme-overview` line):
```python
    path('data-quality/', views.data_quality, name='data_quality'),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `source venv/bin/activate && python manage.py test api.tests_data_quality --settings=config.settings.dev`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add api/views.py api/urls.py api/tests_data_quality.py
git commit -m "Add /api/data-quality/ (silent schools, unmapped schools, calendar health)"
```

- [ ] **Step 7: Full Django suite regression check**

Run: `source venv/bin/activate && python manage.py test api --settings=config.settings.dev`
Expected: all pass. Fix any regressions before moving to frontend.

---

## Repo B — Next.js (`/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs`, branch `feat/pm-data-quality`)

Create the branch:
```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs && git checkout -b feat/pm-data-quality
```

### Task 7: `closure_calendar_ok` in types/transform + staleness badge on the context bar

**Files:**
- Modify: `lib/pm/types.ts:67-71` (`DataHealth`)
- Modify: `lib/pm/api.ts:74` (`transformOverviewResponse`) and `:465-469` (`EMPTY_PROGRAMME_OVERVIEW.data_health`)
- Modify: `components/pm/layout/programme-context-bar.tsx:53-62` (badge next to `HealthBadge`)
- Test: manual (no unit framework); verified via Task 8's page + `npm run build`

**Interfaces:**
- Consumes: Django `data_health.closure_calendar_ok` (Task 4).
- Produces: `DataHealth.closure_calendar_ok: boolean`; a linking amber badge on the overview when false.

- [ ] **Step 1: Extend the `DataHealth` type**

`lib/pm/types.ts:67-71` — change:
```tsx
export interface DataHealth {
  freshness_hours: number;
  last_sync: string;
  join_match_rate: number;
}
```
to:
```tsx
export interface DataHealth {
  freshness_hours: number;
  last_sync: string;
  join_match_rate: number;
  closure_calendar_ok: boolean;
}
```

- [ ] **Step 2: Map it in the transform + fallback**

`lib/pm/api.ts:74` — change `data_health: raw.data_health,` to:
```tsx
    data_health: {
      ...raw.data_health,
      closure_calendar_ok: raw.data_health?.closure_calendar_ok ?? false,
    },
```
In `EMPTY_PROGRAMME_OVERVIEW` (lines 465-469), add `closure_calendar_ok: false,` to the `data_health` object.

- [ ] **Step 3: Add the linking badge**

`components/pm/layout/programme-context-bar.tsx` — add `import Link from "next/link";` and `import { AlertTriangle } from "lucide-react";` at the top, then inside the right-hand cluster (lines 53-62), before `<HealthBadge health={health} />`, add:
```tsx
  {!data_health.closure_calendar_ok && (
    <Link
      href="/pm/data-quality"
      className="flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
    >
      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
      Calendar stale
    </Link>
  )}
```

- [ ] **Step 4: Make the frontend `recomputeKPIs` weighted dosage group-weighted**

`app/pm/page.tsx` recomputes `weightedDosage` from school rows for cohort filtering (lines ~40-47), which reproduces the school-formula staggered-start bias the Django change (Task 4) just removed. It already derives `filteredGroups` (used for on-track). Change the weighted-dosage computation to the group-weighted mean, matching Django:
```tsx
  const weightedDosage =
    filteredGroups !== null && filteredGroups.length > 0
      ? filteredGroups.reduce((sum, g) => sum + g.avg_sessions_per_week, 0) /
        filteredGroups.length
      : baseKPIs.weighted_dosage;
```
(Replace the existing `totalGroups`/`weightedDosage` block. `totalGroups` may still be used elsewhere in `recomputeKPIs` — keep its declaration if so; only the dosage computation changes. `filteredGroups` and `g.avg_sessions_per_week` are the same values the on-track recompute already uses.)

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: compiles with no type errors (the new required `closure_calendar_ok` field is satisfied by the transform + fallback).

- [ ] **Step 6: Commit**

```bash
git add lib/pm/types.ts lib/pm/api.ts components/pm/layout/programme-context-bar.tsx app/pm/page.tsx
git commit -m "Group-weighted dosage in recomputeKPIs; closure-stale linking badge on PM overview"
```

---

### Task 8: `/pm/data-quality` page + sidebar item + fetcher + e2e auth test

**Files:**
- Modify: `lib/pm/types.ts` (add `DataQuality` types), `lib/pm/api.ts` (add `getDataQuality` + `EMPTY_DATA_QUALITY`)
- Create: `app/pm/data-quality/page.tsx`
- Modify: `components/pm/layout/pm-sidebar.tsx:7-22` (icon import) and `:34-47` (nav item)
- Create: `e2e/pm-data-quality.spec.ts`

**Interfaces:**
- Consumes: `GET /api/data-quality/` (Task 6); `djangoFetch`.
- Produces: `getDataQuality()` → `{ data: DataQuality, isLive }`.

- [ ] **Step 1: Write the middleware-coverage e2e test (supplemental)**

Create `e2e/pm-data-quality.spec.ts` (mirrors `e2e/my-kids-auth.spec.ts:50-74`). **Note:** `middleware.ts` protects `/pm(.*)` *before* route resolution, so this redirect happens whether or not the page exists — it verifies middleware coverage, NOT that the page renders. Page render is checked by build + manual smoke below (the e2e harness has no signed-in-session support, so an authenticated render test is deferred — see Deferred).
```tsx
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "@playwright/test";

test.describe("/pm/data-quality auth (middleware coverage)", () => {
  test("unauthenticated visit redirects to login with redirect_url preserved", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/pm/data-quality");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("redirect_url=%2Fpm%2Fdata-quality");
  });
});
```

- [ ] **Step 2: Run the e2e test**

Run: `npx playwright test e2e/pm-data-quality.spec.ts`
Expected: PASS (middleware protects the prefix). This is the supplemental check; the load-bearing page-render verification is Step 6 (build + manual smoke).

- [ ] **Step 3: Add types + fetcher**

In `lib/pm/types.ts` add:
```tsx
export interface SilentSchool {
  school: string;
  last_session_date: string;
  expected_open_days: number;
}
export interface DataQuality {
  closure_calendar: {
    ok: boolean;
    last_ok_at: string | null;
    date_from: string | null;
    date_to: string | null;
    closures_count: number;
    latest_attempt_failed?: boolean;
  };
  unmapped_schools: string[];
  silent_schools: SilentSchool[];
}
```
In `lib/pm/api.ts` add (mirror `getProgrammeOverview`, lines 83-102):
```tsx
export interface DataQualityResult { data: DataQuality; isLive: boolean; }

const EMPTY_DATA_QUALITY: DataQuality = {
  closure_calendar: { ok: false, last_ok_at: null, date_from: null, date_to: null, closures_count: 0 },
  unmapped_schools: [],
  silent_schools: [],
};

export async function getDataQuality(): Promise<DataQualityResult> {
  try {
    const res = await djangoFetch(`/api/data-quality/`, { next: { revalidate: 300 } });
    if (!res.ok) {
      console.error(`[pm/api] data-quality returned ${res.status}`);
      return { data: EMPTY_DATA_QUALITY, isLive: false };
    }
    return { data: await res.json(), isLive: true };
  } catch (error) {
    console.error("[pm/api] Failed to fetch data-quality:", error);
    return { data: EMPTY_DATA_QUALITY, isLive: false };
  }
}
```
Add `DataQuality` to the type import at the top of `api.ts`.

- [ ] **Step 4: Create the page** (mirror `app/pm/quality-flags/page.tsx`)

Create `app/pm/data-quality/page.tsx`:
```tsx
import { getDataQuality } from "@/lib/pm/api";
import { AlertTriangle, CheckCircle2, MapPinOff } from "lucide-react";

export default async function DataQualityPage() {
  const { data, isLive } = await getDataQuality();
  const cal = data.closure_calendar;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {!isLive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-amber-800">
            <span className="font-semibold">Data quality API unavailable.</span>{" "}
            The list below may be empty.
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-slate-900">Data Quality</h1>
        <p className="text-sm text-slate-500">
          Diagnostic signals only — none of these change the headline metrics.
        </p>
      </div>

      {/* Closure calendar health */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
          {cal.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  : <AlertTriangle className="h-4 w-4 text-amber-500" />}
          Closure calendar
        </h2>
        <p className="text-sm text-slate-600">
          {cal.ok
            ? `Healthy — last synced ${cal.last_ok_at ? new Date(cal.last_ok_at).toLocaleString() : "unknown"}, ${cal.closures_count} closures covering ${cal.date_from} to ${cal.date_to}.`
            : "Stale or unavailable — dosage may be understated until the Masi calendar sync succeeds. Check the Render cron for sync_masi_calendar."}
        </p>
      </section>

      {/* Unexplained silence */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900 mb-2">Schools silent with no closure on record</h2>
        {data.silent_schools.length === 0 ? (
          <p className="text-sm text-slate-500">None. Every silent school has a closure explaining it.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {data.silent_schools.map((s) => (
              <li key={s.school} className="py-2 flex justify-between gap-4">
                <span className="text-slate-800">{s.school}</span>
                <span className="text-slate-500">
                  last session {s.last_session_date} · {s.expected_open_days} expected-open days silent
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Break or problem? Author the closure in Masi (calendar corrects the metric) or investigate the school.
        </p>
      </section>

      {/* Unmapped schools */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
          <MapPinOff className="h-4 w-4 text-slate-400" /> Schools without a Masi identity
        </h2>
        {data.unmapped_schools.length === 0 ? (
          <p className="text-sm text-slate-500">None. Every active school resolves to a Masi identity.</p>
        ) : (
          <p className="text-sm text-slate-700">
            These schools fall back to global-only closures (their term breaks won't be excluded):{" "}
            <span className="font-medium">{data.unmapped_schools.join(", ")}</span>
          </p>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Add the sidebar nav item**

`components/pm/layout/pm-sidebar.tsx` — add `ShieldAlert` to the `lucide-react` import (lines 7-22), then add to `NAV_ITEMS` (after the "Schools" line):
```tsx
  { name: "Data Quality", href: "/pm/data-quality", icon: ShieldAlert },
```

- [ ] **Step 6: Build + manual render smoke (load-bearing page check)**

Run: `npm run build` — expect clean (proves the new route + page compile with no type errors). Then start the dev server and, signed in as a PM-role user, open `/pm/data-quality` and confirm: the three sections render, the calendar-health line reflects the Django `closure_calendar` payload, and (against prod-like data) the 2 known unmapped schools and any silent schools appear. Also confirm the middleware-coverage e2e still passes: `npx playwright test e2e/pm-data-quality.spec.ts`.

- [ ] **Step 7: Commit**

```bash
git add lib/pm/types.ts lib/pm/api.ts app/pm/data-quality/ components/pm/layout/pm-sidebar.tsx e2e/pm-data-quality.spec.ts
git commit -m "Add /pm/data-quality tab (calendar health, silent schools, unmapped schools)"
```

---

### Task 9: Retire the stale `/pm/schools/[name]` holiday copy — DEFERRED (second wave)

**Not in this pass.** `lib/schools-2026/constants.ts` hardcodes a 1-entry `SCHOOL_HOLIDAYS_2026` + `TEACHING_START_DATE` used by `lib/schools-2026/enrich.ts:45` for each EA's `avgPerProgrammeDay` on the school-detail drill-down. A correct fix cannot be frontend-only (the browser can't reach the Masi calendar); it requires exposing a calendar-aware `programme_work_days` on the Django `groups-2026` payload (`views.groups_2026_summary`) and consuming it in `enrich.ts`, retiring the stale constant. Drill-down only and needs a Django endpoint change, so defer. See Deferred section. (The Overview and the EA scatter are unaffected — they already use Django-computed, calendar-aware numbers after Tasks 2, 4, 5.)

---

### Task 10: Fix the mislabeled metric docs

**Files:**
- Modify: `documentation/data-metrics-reference.md:283-284,352-353` (Next.js repo)

- [ ] **Step 1: Correct the week/month labels**

Change lines 283-284 and 352-353 from "current ISO week" / "current calendar month" to the actual behavior: rolling 7-day and 30-day windows anchored to the nightly compute run.
```markdown
| `sessions_this_week` | int | Distinct sessions in the rolling last 7 days (anchored to nightly compute run) |
| `sessions_this_month` | int | Distinct sessions in the rolling last 30 days (anchored to nightly compute run) |
```
And the Dosage Metrics table rows 352-353 similarly (replace "current ISO week"/"current calendar month" with "rolling last 7 days"/"rolling last 30 days"). Update row 354's `weeks_since_programme_start` note to "work-weeks = expected teaching days (weekdays minus resolved closures) / 5".

- [ ] **Step 2: Commit**

```bash
git add documentation/data-metrics-reference.md
git commit -m "Docs: correct sessions_this_week/month labels and dosage denominator note"
```

---

## Deferred (explicitly out of scope — the last 5%)

- **Task 9 — `/pm/schools/[name]` per-EA programme-day denominator.** Retire the stale frontend `SCHOOL_HOLIDAYS_2026`/`TEACHING_START_DATE` by exposing calendar-aware `programme_work_days` on the Django `groups-2026` payload (`views.groups_2026_summary`) and consuming it in `lib/schools-2026/enrich.ts`. Drill-down only; needs a Django endpoint change. (Overview + EA scatter are already correct.)
- **Per-date modal school for the EA trajectory.** Task 5 uses one whole-period modal school for all trajectory points (required for scatter parity). If an EA transfers schools mid-year, older points use the later school's calendar. A per-date modal (from sessions on-or-before each date) would fix this but breaks the simple scatter-parity invariant; revisit if multi-school EAs prove common.
- **Authenticated-render E2E for `/pm/data-quality`.** The e2e harness has no signed-in-session support (all specs are unauthenticated redirect checks). Building a PM-role signed-in fixture (test-user creds + session) would let an E2E assert the page actually renders content, not just that middleware redirects.
- Interval-exact closure semantics (a closure explains only the dates it covers) and failure-to-resume timers for the unexplained-silence signal.
- A labelled validation study (confusion matrix of break vs abandonment vs outage) and threshold sensitivity analysis for `SILENCE_THRESHOLD_DAYS`.
- Consolidating the 4 duplicated `PROGRAMME_START_DATE` copies into `api/constants_2026.py` (this plan only fixes the live-endpoint cutoff; the nightly already uses 2026-02-23).
- Year-end programme-end / assessment-start denominator (a separate, year-end concern driven by `ProgrammeTargets.programme_end_date` / the EGRA dataset).
- Making the "Week N of 38" counter holiday-aware (cosmetic).

## Verification (production, after deploy)

1. On the Django branch, run the computes against a prod-like DB (or verify post-deploy nightly): confirm cohort-filtered weighted dosage lands **~2.1** (group-weighted; verified in analysis as calendar-only school-formula = 1.75, group-weighted = 2.12 — this plan ships the group-weighted number). Confirm it is *not* ~1.1 (current) and *not* a clamped-up value; on-track-groups rises in step; the active-flag count drops as break-driven ghost flags clear.
2. Confirm `/pm` shows no "Calendar stale" badge once a `MasiSyncRun` `ok` row exists (it does — synced 2026-07-20), despite `masi_updated_at` being weeks old.
3. Confirm `/pm/data-quality` lists the 2 known unmapped schools (`Malukhanye ECD`, `Witterkleibosch`) until identities are added, and lists any school silent >10 expected-open days with no closure.
4. Confirm a school that stopped mid-programme still reads **low** dosage (no clamp masking).
5. On `/pm/education-assistants`, confirm the scatter x-axis (sessions/programme-day) shifts right (denominators no longer count the break) and that a given EA's scatter point matches the end of its trajectory line (parity between `ea_performance` and `ea_performance_history`).
