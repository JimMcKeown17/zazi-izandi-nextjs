# Backend Implementation: `is_blending` Field + `GroupSummary2026` Model

> Implementation plan for adding the `is_blending` computed field to session sync and creating the `GroupSummary2026` pre-computed summary model in the Django backend.

**Target repo:** `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025`
**Affected app:** `api`

---

## Overview

Two changes, in order:

1. **Add `is_blending` to `TeampactSession2026`** — new boolean field, computed during sync from `class_name`
2. **Create `GroupSummary2026` model + `compute_group_summaries_2026` command** — nightly pre-computed group-level summaries with phase, progress, and flags

---

## Step 1: Add `is_blending` to TeampactSession2026

### 1.1 Model Change

**File:** `api/models.py` — `TeampactSession2026` class

Add field after `flag_reason`:

```python
is_blending = models.BooleanField(
    default=False,
    db_index=True,
    help_text="True if class_name contains 'blending' (case-insensitive). Computed during sync."
)
```

### 1.2 Migration

```bash
python manage.py makemigrations api -n "add_is_blending_to_teampact_session_2026"
python manage.py migrate
```

### 1.3 Backfill Existing Records

Run a one-time data migration or management command to set `is_blending` on existing rows:

```python
# In the migration's RunPython or as a standalone command:
from django.db.models.functions import Lower
from django.db.models import Q

TeampactSession2026.objects.filter(
    class_name__icontains='blending'
).update(is_blending=True)
```

### 1.4 Update Sync Command

**File:** `api/management/commands/sync_teampact_sessions_2026.py`

In the `flatten_record()` function, after extracting `class_name`, add:

```python
class_name = class_data.get('name', '') or ''
# ... existing code ...
is_blending = 'blending' in class_name.lower()
```

And include `is_blending` in the returned dict / model creation:

```python
'is_blending': is_blending,
```

---

## Step 2: Create GroupSummary2026 Model

### 2.1 Model Definition

**File:** `api/models.py` — add after `SchoolSummary2026`

```python
class GroupSummary2026(models.Model):
    """
    Pre-computed nightly summary of 2026 group data.
    One row per group (program_name + class_name).
    Rebuilt entirely by compute_group_summaries_2026.
    """
    program_name = models.CharField(max_length=255, help_text="School name")
    class_name = models.CharField(max_length=255, help_text="Group name")
    ea_name = models.CharField(max_length=255, help_text="Primary EA (most sessions)")
    grade = models.CharField(max_length=50, blank=True, default='', help_text="Detected from class_name")

    # Phase
    phase = models.CharField(
        max_length=20,
        choices=[('letters', 'Letters'), ('blending', 'Blending')],
        default='letters',
        db_index=True,
        help_text="'letters' or 'blending' — derived from class_name"
    )
    blending_start_date = models.DateField(
        null=True, blank=True,
        help_text="First session date for this blending group. Null for letter-phase groups."
    )

    # Children
    children_count = models.IntegerField(default=0)
    children_names = models.JSONField(default=list, help_text="Array of child names")

    # Letter progress (letter-phase groups only)
    current_letter = models.CharField(max_length=5, blank=True, default='')
    progress_index = models.IntegerField(default=-1, help_text="0-25 for letters, -1 for blending")
    progress_pct = models.FloatField(default=0, help_text="(index+1)/26*100, 0 for blending")

    # Sessions
    sessions_this_week = models.IntegerField(default=0)
    sessions_this_month = models.IntegerField(default=0)
    total_sessions = models.IntegerField(default=0)
    avg_sessions_per_week = models.FloatField(default=0)
    last_session_date = models.DateField(null=True, blank=True)

    # Flags (letter-phase flags only apply when phase='letters')
    flag_same_letter_group = models.BooleanField(default=False)
    flag_moving_too_fast = models.BooleanField(default=False)
    flag_ghost_group = models.BooleanField(default=False)
    flag_stagnation = models.BooleanField(default=False)
    flag_curriculum_gaps = models.BooleanField(default=False)

    # Metadata
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'group_summaries_2026'
        unique_together = ('program_name', 'class_name')
        ordering = ['program_name', 'class_name']
        indexes = [
            models.Index(fields=['program_name']),
            models.Index(fields=['ea_name']),
            models.Index(fields=['phase']),
        ]

    def __str__(self):
        return f"{self.program_name} — {self.class_name} ({self.phase})"
```

### 2.2 Migration

```bash
python manage.py makemigrations api -n "add_group_summary_2026"
python manage.py migrate
```

---

## Step 3: Create `compute_group_summaries_2026` Management Command

**File:** `api/management/commands/compute_group_summaries_2026.py`

This follows the exact same pattern as `compute_school_summaries_2026`:

```python
"""
Nightly job: rebuild GroupSummary2026 from TeampactSession2026.
Run AFTER sync_teampact_sessions_2026 completes.

Usage:
    python manage.py compute_group_summaries_2026
"""
import logging
from datetime import datetime, timedelta, timezone as dt_timezone
from collections import defaultdict

import pandas as pd
from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import TeampactSession2026, GroupSummary2026

logger = logging.getLogger(__name__)

PROGRAMME_START_DATE = datetime(2026, 2, 23, tzinfo=dt_timezone.utc)

LETTER_SEQUENCE = [
    'a', 'e', 'i', 'o', 'u', 'b', 'l', 'm', 'k', 'p',
    's', 'h', 'z', 'n', 'd', 'y', 'f', 'w', 'v', 'x',
    'g', 't', 'q', 'r', 'c', 'j'
]
LETTER_INDEX = {letter: idx for idx, letter in enumerate(LETTER_SEQUENCE)}

EXCLUDED_PROGRAMS = {"Masinyusane"}


class Command(BaseCommand):
    help = "Rebuild GroupSummary2026 table from session data"

    def handle(self, *args, **options):
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        weeks_elapsed = max((now - PROGRAMME_START_DATE).days / 7, 1)

        # ── 1. Load all 2026 sessions into a DataFrame ──
        qs = (
            TeampactSession2026.objects
            .filter(session_started_at__gte=PROGRAMME_START_DATE)
            .exclude(program_name__isnull=True)
            .exclude(program_name='')
            .exclude(program_name__in=EXCLUDED_PROGRAMS)
            .values(
                'session_id', 'session_started_at', 'program_name',
                'class_name', 'user_name', 'participant_name',
                'letters_taught', 'num_letters_taught', 'is_blending',
            )
        )
        df = pd.DataFrame.from_records(qs)

        if df.empty:
            logger.warning("No sessions found — clearing GroupSummary2026.")
            GroupSummary2026.objects.all().delete()
            return

        # ── 2. Deduplicate to unique sessions (one row per session) ──
        sessions_df = df.drop_duplicates(subset=['session_id', 'class_name'])

        # ── 3. Group by (program_name, class_name) ──
        summaries = []
        for (program, class_name), group_df in df.groupby(['program_name', 'class_name']):
            group_sessions = sessions_df[
                (sessions_df['program_name'] == program) &
                (sessions_df['class_name'] == class_name)
            ]

            # Phase detection
            is_blending = bool('blending' in str(class_name).lower())
            phase = 'blending' if is_blending else 'letters'

            # EA: who has the most sessions for this group
            ea_name = (
                group_sessions['user_name']
                .value_counts()
                .idxmax()
            ) if not group_sessions.empty else ''

            # Grade detection from class_name
            grade = detect_grade(class_name)

            # Children
            children = sorted(group_df['participant_name'].dropna().unique().tolist())

            # Session counts
            total = group_sessions['session_id'].nunique()
            this_week = group_sessions[
                group_sessions['session_started_at'] >= week_ago
            ]['session_id'].nunique()
            this_month = group_sessions[
                group_sessions['session_started_at'] >= month_ago
            ]['session_id'].nunique()
            avg_per_week = round(total / weeks_elapsed, 2)
            last_date = (
                group_sessions['session_started_at'].max().date()
                if not group_sessions.empty else None
            )

            # Letter progress (letters phase only)
            current_letter = ''
            progress_index = -1
            progress_pct = 0.0
            if not is_blending and not group_sessions.empty:
                progress_index, current_letter = compute_letter_progress(group_sessions)
                progress_pct = round((progress_index + 1) / 26 * 100, 1) if progress_index >= 0 else 0

            # Blending start date
            blending_start = None
            if is_blending and not group_sessions.empty:
                blending_start = group_sessions['session_started_at'].min().date()

            # ── Flags ──
            flag_ghost = False
            flag_moving = False
            flag_stagnation = False
            flag_gaps = False
            # same_letter_group is EA-level, computed in a second pass

            if last_date:
                weekdays_since = count_weekdays(last_date, now.date())
                flag_ghost = weekdays_since >= 5

            if not is_blending and total >= 3:
                flag_moving = compute_moving_too_fast(group_sessions)
                flag_stagnation = compute_stagnation(group_sessions, now)
                flag_gaps = compute_curriculum_gaps(group_sessions)

            summaries.append(GroupSummary2026(
                program_name=program,
                class_name=class_name,
                ea_name=ea_name,
                grade=grade,
                phase=phase,
                blending_start_date=blending_start,
                children_count=len(children),
                children_names=children,
                current_letter=current_letter,
                progress_index=progress_index,
                progress_pct=progress_pct,
                sessions_this_week=this_week,
                sessions_this_month=this_month,
                total_sessions=total,
                avg_sessions_per_week=avg_per_week,
                last_session_date=last_date,
                flag_moving_too_fast=flag_moving,
                flag_ghost_group=flag_ghost,
                flag_stagnation=flag_stagnation,
                flag_curriculum_gaps=flag_gaps,
                # flag_same_letter_group set in second pass below
            ))

        # ── 4. Second pass: same-letter-group flag (EA-level) ──
        # Group summaries by EA, check if 3+ letter-phase groups share the same progress_index
        ea_groups = defaultdict(list)
        for s in summaries:
            if s.phase == 'letters':
                ea_groups[s.ea_name].append(s)

        for ea, groups in ea_groups.items():
            index_counts = defaultdict(list)
            for g in groups:
                if g.progress_index >= 0:
                    index_counts[g.progress_index].append(g)
            for idx, flagged_groups in index_counts.items():
                if len(flagged_groups) >= 3:
                    for g in flagged_groups:
                        g.flag_same_letter_group = True

        # ── 5. Atomic save ──
        GroupSummary2026.objects.all().delete()
        GroupSummary2026.objects.bulk_create(summaries, batch_size=100)
        logger.info(f"Computed {len(summaries)} group summaries.")
```

### Helper Functions

These go in the same file or in a shared utility module:

```python
def detect_grade(class_name: str) -> str:
    """Parse grade from class_name string."""
    cn = class_name.lower()
    if 'grade r' in cn or 'gr r' in cn:
        return 'Grade R'
    elif 'grade 1' in cn or 'gr 1' in cn:
        return 'Grade 1'
    elif 'grade 2' in cn or 'gr 2' in cn:
        return 'Grade 2'
    return ''


def compute_letter_progress(group_sessions: pd.DataFrame) -> tuple[int, str]:
    """Get rightmost letter index from latest session."""
    latest = group_sessions.sort_values('session_started_at').iloc[-1]
    letters_str = str(latest.get('letters_taught', '') or '')
    letters = [l.strip().lower() for l in letters_str.split(',') if l.strip()]
    max_idx = -1
    max_letter = ''
    for letter in letters:
        idx = LETTER_INDEX.get(letter, -1)
        if idx > max_idx:
            max_idx = idx
            max_letter = letter
    return max_idx, max_letter


def count_weekdays(start_date, end_date) -> int:
    """Count weekdays between two dates (exclusive of start, inclusive of end)."""
    count = 0
    current = start_date + timedelta(days=1)
    while current <= end_date:
        if current.weekday() < 5:
            count += 1
        current += timedelta(days=1)
    return count


def compute_moving_too_fast(group_sessions: pd.DataFrame) -> bool:
    """Flag if >70% of session transitions have zero letter overlap."""
    sorted_sessions = group_sessions.sort_values('session_started_at')
    letter_sets = []
    for _, row in sorted_sessions.iterrows():
        letters_str = str(row.get('letters_taught', '') or '')
        letters = {l.strip().lower() for l in letters_str.split(',') if l.strip()}
        if letters:
            letter_sets.append(letters)

    if len(letter_sets) < 2:
        return False

    no_review = 0
    total_transitions = len(letter_sets) - 1
    for i in range(1, len(letter_sets)):
        if not letter_sets[i].intersection(letter_sets[i - 1]):
            no_review += 1

    return (no_review / total_transitions) > 0.70 if total_transitions > 0 else False


def compute_stagnation(group_sessions: pd.DataFrame, now) -> bool:
    """Flag if same max letter for 2+ weeks with 4+ sessions in recent period."""
    two_weeks_ago = now - timedelta(days=14)
    four_weeks_ago = now - timedelta(days=28)

    recent = group_sessions[group_sessions['session_started_at'] >= two_weeks_ago]
    prior = group_sessions[
        (group_sessions['session_started_at'] >= four_weeks_ago) &
        (group_sessions['session_started_at'] < two_weeks_ago)
    ]

    if recent['session_id'].nunique() < 4 or prior.empty:
        return False

    recent_max = get_max_progress_index(recent)
    prior_max = get_max_progress_index(prior)

    return recent_max == prior_max and recent_max >= 0


def compute_curriculum_gaps(group_sessions: pd.DataFrame) -> bool:
    """Flag if letters were skipped in the prescribed sequence."""
    all_letters = set()
    for _, row in group_sessions.iterrows():
        letters_str = str(row.get('letters_taught', '') or '')
        letters = {l.strip().lower() for l in letters_str.split(',') if l.strip()}
        all_letters.update(letters)

    if not all_letters:
        return False

    # Get indices of all taught letters
    taught_indices = sorted([LETTER_INDEX[l] for l in all_letters if l in LETTER_INDEX])
    if len(taught_indices) < 2:
        return False

    max_taught = max(taught_indices)
    expected = set(range(0, max_taught + 1))
    taught_set = set(taught_indices)
    gaps = expected - taught_set

    # Allow small gaps (1 letter) as they may be baseline-mastered
    return len(gaps) > 1


def get_max_progress_index(sessions_df: pd.DataFrame) -> int:
    """Get highest letter index across all sessions."""
    max_idx = -1
    for _, row in sessions_df.iterrows():
        letters_str = str(row.get('letters_taught', '') or '')
        for letter in letters_str.split(','):
            letter = letter.strip().lower()
            idx = LETTER_INDEX.get(letter, -1)
            if idx > max_idx:
                max_idx = idx
    return max_idx
```

---

## Step 4: Add to Nightly Cron

On Render, add the new command to the cron schedule:

```
# Existing:
sync_teampact_sessions_2026          → 00:00 UTC
compute_school_summaries_2026        → 01:00 UTC

# New (add after school summaries):
compute_group_summaries_2026         → 01:15 UTC
```

Or chain them:
```bash
python manage.py sync_teampact_sessions_2026 && \
python manage.py compute_school_summaries_2026 && \
python manage.py compute_group_summaries_2026
```

---

## Step 5: Create API Endpoint

**File:** `api/views.py` — add new view

```python
def groups_2026_summary(request):
    """Return all group summaries as JSON."""
    groups = GroupSummary2026.objects.all()
    return JsonResponse({
        'generated_at': timezone.now().isoformat(),
        'total_groups': groups.count(),
        'groups': [
            {
                'program_name': g.program_name,
                'class_name': g.class_name,
                'ea_name': g.ea_name,
                'grade': g.grade,
                'phase': g.phase,
                'blending_start_date': g.blending_start_date.isoformat() if g.blending_start_date else None,
                'children_count': g.children_count,
                'children_names': g.children_names,
                'current_letter': g.current_letter,
                'progress_index': g.progress_index,
                'progress_pct': g.progress_pct,
                'sessions_this_week': g.sessions_this_week,
                'sessions_this_month': g.sessions_this_month,
                'total_sessions': g.total_sessions,
                'avg_sessions_per_week': g.avg_sessions_per_week,
                'last_session_date': g.last_session_date.isoformat() if g.last_session_date else None,
                'flags': {
                    'same_letter_group': g.flag_same_letter_group,
                    'moving_too_fast': g.flag_moving_too_fast,
                    'ghost_group': g.flag_ghost_group,
                    'stagnation': g.flag_stagnation,
                    'curriculum_gaps': g.flag_curriculum_gaps,
                },
            }
            for g in groups
        ]
    })
```

**File:** `api/urls.py` — add route

```python
path('groups-2026/', views.groups_2026_summary, name='groups-2026-summary'),
```

---

## Implementation Order

| Step | What | Where | Dependencies |
|------|------|-------|-------------|
| 1 | Add `is_blending` field to `TeampactSession2026` model | `api/models.py` | None |
| 2 | Create + run migration | `api/migrations/` | Step 1 |
| 3 | Backfill `is_blending` on existing rows | One-time command or data migration | Step 2 |
| 4 | Update `sync_teampact_sessions_2026` to set `is_blending` | `api/management/commands/` | Step 1 |
| 5 | Add `GroupSummary2026` model | `api/models.py` | None |
| 6 | Create + run migration | `api/migrations/` | Step 5 |
| 7 | Create `compute_group_summaries_2026` command | `api/management/commands/` | Steps 5, 2 |
| 8 | Test locally: run sync, then compute, verify output | Local | Steps 4, 7 |
| 9 | Add `/api/groups-2026/` endpoint | `api/views.py`, `api/urls.py` | Step 5 |
| 10 | Deploy to Render | Render dashboard | All above |
| 11 | Add `compute_group_summaries_2026` to Render cron | Render dashboard | Step 10 |

---

## Verification

After deploying:

1. **Run sync manually:** `python manage.py sync_teampact_sessions_2026`
2. **Check `is_blending` populated:** `TeampactSession2026.objects.filter(is_blending=True).count()` — should be > 0 if any blending groups exist
3. **Run group compute:** `python manage.py compute_group_summaries_2026`
4. **Check results:** `GroupSummary2026.objects.count()` — should match number of unique (program_name, class_name) pairs
5. **Check phases:** `GroupSummary2026.objects.filter(phase='blending').count()` — should be > 0
6. **Check flags:** `GroupSummary2026.objects.filter(flag_ghost_group=True).count()` — verify reasonableness
7. **Hit API:** `curl https://zazi-izandi-website-main.onrender.com/api/groups-2026/` — verify JSON response
8. **Verify letter-phase flags exclude blending:** `GroupSummary2026.objects.filter(phase='blending', flag_moving_too_fast=True).count()` — should be 0
