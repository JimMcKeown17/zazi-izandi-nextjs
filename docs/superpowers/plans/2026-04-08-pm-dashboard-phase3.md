# PM Dashboard Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Assessments and Mentor Visits pages (Django endpoints + Next.js frontend) to complete Phase 3 of the PM dashboard migration from Streamlit.

**Architecture:** Pre-computed nightly summaries in Django (matching existing `SchoolSummary2026`/`GroupSummary2026` pattern) served via JSON API endpoints. Next.js server components fetch via ISR, render client-side Recharts charts. Proxy routes forward from Next.js to Django.

**Tech Stack:** Django 5 (Python), Next.js 16 (App Router), React 19, TypeScript, Recharts, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-04-08-pm-dashboard-phase3-design.md`

---

## File Structure

### Django (`/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/`)

| Action | File | Purpose |
|--------|------|---------|
| Create | `management/commands/compute_assessment_summary_2026.py` | Nightly command: aggregates Assessment2026 into JSON cache |
| Create | `management/commands/compute_mentor_visit_summary_2026.py` | Nightly command: aggregates MentorVisit2026 into JSON cache |
| Modify | `models.py` | Add `AssessmentSummaryCache2026` and `MentorVisitSummaryCache2026` models |
| Modify | `views.py` | Add `assessments_summary` and `mentor_visits_summary` view functions |
| Modify | `urls.py` | Add URL patterns for the two new endpoints |

### Next.js (`/Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/`)

| Action | File | Purpose |
|--------|------|---------|
| Modify | `lib/pm/types.ts` | Add `AssessmentsSummaryResponse` and `MentorVisitsSummaryResponse` types |
| Modify | `lib/pm/api.ts` | Add `getAssessmentsSummary()` and `getMentorVisitsSummary()` functions |
| Create | `app/api/assessments-summary/route.ts` | Proxy to Django |
| Create | `app/api/mentor-visits-summary/route.ts` | Proxy to Django |
| Replace | `app/pm/assessments/page.tsx` | Server component: fetches data, renders assessment components |
| Replace | `app/pm/mentor-visits/page.tsx` | Server component: fetches data, renders mentor visit components |
| Create | `components/pm/assessments/assessment-kpis.tsx` | 6 KPI cards for assessment metrics |
| Create | `components/pm/assessments/cohort-comparison.tsx` | Treatment vs control grouped bar chart |
| Create | `components/pm/assessments/score-distribution.tsx` | LCPM histogram by grade with threshold lines |
| Create | `components/pm/assessments/school-comparison.tsx` | Horizontal bar chart of avg LCPM by school |
| Create | `components/pm/assessments/language-grade-breakdown.tsx` | Grouped bar chart by language and grade |
| Create | `components/pm/mentor-visits/visit-kpis.tsx` | 4 KPI cards for visit metrics |
| Create | `components/pm/mentor-visits/visits-over-time.tsx` | Weekly visits bar chart |
| Create | `components/pm/mentor-visits/compliance-checks.tsx` | 5 compliance sections (donut + flagged table) |
| Create | `components/pm/mentor-visits/quality-ratings.tsx` | Session quality and teacher relationship bars |
| Create | `components/pm/mentor-visits/mentor-summary-table.tsx` | Sortable per-mentor summary |
| Create | `components/pm/mentor-visits/coverage-gaps.tsx` | Coverage rate + overdue schools table |
| Modify | `components/pm/layout/pm-sidebar.tsx` | Remove Compare nav entry |
| Delete | `app/pm/compare/page.tsx` | Remove placeholder |

---

## Task 1: Django Cache Models

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/models.py` (append after `GroupSummary2026`)

These are simple single-row JSON cache models, following the pattern of `SchoolSummary2026` but storing pre-computed JSON instead of structured fields (the aggregation shape is complex and doesn't benefit from SQL-level querying).

- [ ] **Step 1: Add the two cache models to models.py**

Add at the end of the file, after the existing `GroupSummary2026` model:

```python
class AssessmentSummaryCache2026(models.Model):
    """Single-row JSON cache for /api/assessments-summary/. Recomputed nightly."""
    key = models.CharField(max_length=50, primary_key=True, default="latest")
    data = models.JSONField(default=dict)
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Assessment Summary Cache 2026"

    def __str__(self):
        return f"AssessmentSummaryCache2026 ({self.computed_at})"


class MentorVisitSummaryCache2026(models.Model):
    """Single-row JSON cache for /api/mentor-visits-summary/. Recomputed nightly."""
    key = models.CharField(max_length=50, primary_key=True, default="latest")
    data = models.JSONField(default=dict)
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Mentor Visit Summary Cache 2026"

    def __str__(self):
        return f"MentorVisitSummaryCache2026 ({self.computed_at})"
```

- [ ] **Step 2: Create and run the migration**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
python manage.py makemigrations api --name="add_assessment_mentor_summary_caches_2026"
python manage.py migrate
```

Expected: Migration created and applied successfully.

- [ ] **Step 3: Commit**

```bash
git add api/models.py api/migrations/
git commit -m "feat: add AssessmentSummaryCache2026 and MentorVisitSummaryCache2026 models"
```

---

## Task 2: Assessment Summary Compute Command

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/management/commands/compute_assessment_summary_2026.py`

This command queries `Assessment2026`, groups by school/language/grade/cohort, and stores the aggregated JSON in `AssessmentSummaryCache2026`.

- [ ] **Step 1: Create the compute command**

```python
"""
Nightly command: pre-compute assessment summary for /api/assessments-summary/.
Reads from Assessment2026, groups by school/language/grade/cohort,
stores result in AssessmentSummaryCache2026.
"""
import math
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Assessment2026, AssessmentSummaryCache2026

# Cohort school lists — uppercased for case-insensitive matching.
# Copied from views.py TREATMENT_SCHOOLS / SEF_SCHOOLS to keep the command
# self-contained (these rarely change).
from api.views import TREATMENT_SCHOOLS, SEF_SCHOOLS


def _classify_cohort(program_name: str) -> str:
    """Return 'treatment', 'sef', or 'control'."""
    upper = (program_name or "").upper()
    if upper in TREATMENT_SCHOOLS:
        return "treatment"
    if upper in SEF_SCHOOLS:
        return "sef"
    return "control"


def _safe_pct(numerator: int, denominator: int) -> float:
    if denominator == 0:
        return 0.0
    return round(numerator / denominator * 100, 1)


class Command(BaseCommand):
    help = "Pre-compute assessment summary for the PM dashboard."

    def handle(self, *args, **options):
        qs = Assessment2026.objects.filter(
            language__in=["isiXhosa", "English", "Afrikaans"],
            assessment_type="baseline",
        ).values(
            "response_id", "program_name", "language", "grade",
            "letters_total_correct", "nonwords_total_correct",
            "words_total_correct", "assessment_complete", "stop_rule_reached",
        )

        rows = list(qs)
        if not rows:
            self.stdout.write(self.style.WARNING("No baseline assessments found."))
            AssessmentSummaryCache2026.objects.update_or_create(
                key="latest",
                defaults={"data": {"generated_at": timezone.now().isoformat(), "overview": {}, "by_cohort": [], "by_language": [], "by_grade": [], "score_distribution": [], "by_school": []}},
            )
            return

        # Tag each row with cohort
        for r in rows:
            r["cohort"] = _classify_cohort(r["program_name"])
            r["lcpm"] = r["letters_total_correct"] or 0

        total = len(rows)

        # --- Overview ---
        lcpm_values = [r["lcpm"] for r in rows]
        nonwords_values = [r["nonwords_total_correct"] or 0 for r in rows]
        words_values = [r["words_total_correct"] or 0 for r in rows]

        zero_count = sum(1 for r in rows if r["lcpm"] == 0)

        gr1_rows = [r for r in rows if r["grade"] == "Grade 1"]
        grR_rows = [r for r in rows if r["grade"] == "Grade R"]

        gr1_at_benchmark = sum(1 for r in gr1_rows if r["lcpm"] >= 40)
        grR_at_benchmark = sum(1 for r in grR_rows if r["lcpm"] >= 10)

        stop_rule_count = sum(1 for r in rows if str(r.get("stop_rule_reached", "")).lower() in ("yes", "true", "1"))
        complete_count = sum(1 for r in rows if str(r.get("assessment_complete", "")).lower() in ("yes", "true", "1"))

        overview = {
            "total_assessed": total,
            "avg_lcpm": round(sum(lcpm_values) / total, 1),
            "avg_wcpm": round(sum(words_values) / total, 1),
            "avg_nonwords": round(sum(nonwords_values) / total, 1),
            "pct_zero_letters": _safe_pct(zero_count, total),
            "pct_at_benchmark_gr1": _safe_pct(gr1_at_benchmark, len(gr1_rows)),
            "pct_at_benchmark_grR": _safe_pct(grR_at_benchmark, len(grR_rows)),
            "stop_rule_rate": _safe_pct(stop_rule_count, total),
            "completion_rate": _safe_pct(complete_count, total),
        }

        # --- By Cohort ---
        cohort_groups = {}
        for r in rows:
            c = r["cohort"]
            if c not in cohort_groups:
                cohort_groups[c] = []
            cohort_groups[c].append(r)

        by_cohort = []
        for cohort_name, cohort_rows in sorted(cohort_groups.items()):
            cnt = len(cohort_rows)
            lcpms = [r["lcpm"] for r in cohort_rows]
            zeros = sum(1 for v in lcpms if v == 0)
            # Benchmark: use grade-specific thresholds
            c_gr1 = [r for r in cohort_rows if r["grade"] == "Grade 1"]
            c_grR = [r for r in cohort_rows if r["grade"] == "Grade R"]
            at_bench_gr1 = sum(1 for r in c_gr1 if r["lcpm"] >= 40)
            at_bench_grR = sum(1 for r in c_grR if r["lcpm"] >= 10)
            total_benchmarkable = len(c_gr1) + len(c_grR)
            at_bench_total = at_bench_gr1 + at_bench_grR

            by_cohort.append({
                "cohort": cohort_name,
                "count": cnt,
                "avg_lcpm": round(sum(lcpms) / cnt, 1),
                "pct_zero": _safe_pct(zeros, cnt),
                "pct_at_benchmark": _safe_pct(at_bench_total, total_benchmarkable),
            })

        # --- By Language ---
        lang_groups = {}
        for r in rows:
            lang = r["language"] or "Unknown"
            if lang not in lang_groups:
                lang_groups[lang] = []
            lang_groups[lang].append(r)

        by_language = []
        for lang, lang_rows in sorted(lang_groups.items()):
            cnt = len(lang_rows)
            lcpms = [r["lcpm"] for r in lang_rows]
            by_language.append({
                "language": lang,
                "count": cnt,
                "avg_lcpm": round(sum(lcpms) / cnt, 1),
            })

        # --- By Grade ---
        grade_groups = {}
        for r in rows:
            g = r["grade"] or "Unknown"
            if g not in grade_groups:
                grade_groups[g] = []
            grade_groups[g].append(r)

        by_grade = []
        for grade, grade_rows in sorted(grade_groups.items()):
            cnt = len(grade_rows)
            lcpms = [r["lcpm"] for r in grade_rows]
            zeros = sum(1 for v in lcpms if v == 0)
            threshold = 40 if grade == "Grade 1" else 10
            at_bench = sum(1 for v in lcpms if v >= threshold)
            by_grade.append({
                "grade": grade,
                "count": cnt,
                "avg_lcpm": round(sum(lcpms) / cnt, 1),
                "pct_zero": _safe_pct(zeros, cnt),
                "pct_at_benchmark": _safe_pct(at_bench, cnt),
            })

        # --- Score Distribution (buckets of 5) ---
        max_score = max(lcpm_values) if lcpm_values else 0
        num_buckets = math.ceil((max_score + 1) / 5) if max_score > 0 else 1
        distribution = [{"bucket": i * 5, "count": 0} for i in range(num_buckets)]
        for v in lcpm_values:
            idx = min(v // 5, num_buckets - 1)
            distribution[idx]["count"] += 1

        # --- By School ---
        school_groups = {}
        for r in rows:
            school = r["program_name"] or "Unknown"
            if school not in school_groups:
                school_groups[school] = {"cohort": r["cohort"], "rows": []}
            school_groups[school]["rows"].append(r)

        by_school = []
        for school, info in sorted(school_groups.items()):
            s_rows = info["rows"]
            cnt = len(s_rows)
            lcpms = [r["lcpm"] for r in s_rows]
            zeros = sum(1 for v in lcpms if v == 0)
            # Grade-weighted benchmark
            s_gr1 = [r for r in s_rows if r["grade"] == "Grade 1"]
            s_grR = [r for r in s_rows if r["grade"] == "Grade R"]
            at_bench = sum(1 for r in s_gr1 if r["lcpm"] >= 40) + sum(1 for r in s_grR if r["lcpm"] >= 10)
            total_bench = len(s_gr1) + len(s_grR)

            by_school.append({
                "school": school,
                "cohort": info["cohort"],
                "count": cnt,
                "avg_lcpm": round(sum(lcpms) / cnt, 1),
                "pct_zero": _safe_pct(zeros, cnt),
                "pct_at_benchmark": _safe_pct(at_bench, total_bench),
            })

        # --- Store ---
        payload = {
            "generated_at": timezone.now().isoformat(),
            "overview": overview,
            "by_cohort": by_cohort,
            "by_language": by_language,
            "by_grade": by_grade,
            "score_distribution": distribution,
            "by_school": by_school,
        }

        AssessmentSummaryCache2026.objects.update_or_create(
            key="latest",
            defaults={"data": payload},
        )

        self.stdout.write(self.style.SUCCESS(
            f"Assessment summary computed: {total} assessments, "
            f"{len(by_school)} schools, {len(by_cohort)} cohorts."
        ))
```

- [ ] **Step 2: Run the command locally to verify**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
python manage.py compute_assessment_summary_2026
```

Expected: `Assessment summary computed: X assessments, Y schools, Z cohorts.`

- [ ] **Step 3: Commit**

```bash
git add api/management/commands/compute_assessment_summary_2026.py
git commit -m "feat: add compute_assessment_summary_2026 management command"
```

---

## Task 3: Mentor Visit Summary Compute Command

**Files:**
- Create: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/management/commands/compute_mentor_visit_summary_2026.py`

- [ ] **Step 1: Create the compute command**

```python
"""
Nightly command: pre-compute mentor visit summary for /api/mentor-visits-summary/.
Reads from MentorVisit2026, stores result in MentorVisitSummaryCache2026.
"""
from collections import defaultdict
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import MentorVisit2026, MentorVisitSummaryCache2026, SchoolSummary2026


def _extract_yes_no(val: str) -> str | None:
    """Extract Yes/No/Did not observe from potentially compound values."""
    if not val or not val.strip():
        return None
    lower = val.strip().lower()
    if not lower or lower in ("", "n/a", "na"):
        return None
    if any(x in lower for x in [
        "didn't observe", "did not observe", "could not observe",
        "no sessions", "not observe", "i did not"
    ]):
        return "not_observed"
    if lower.startswith("yes"):
        return "yes"
    if lower.startswith("no"):
        return "no"
    return None


def _normalize_rating(val: str) -> str | None:
    """Normalize quality ratings to Excellent/Good/Average/Poor/Did not observe."""
    if not val or not val.strip():
        return None
    lower = val.strip().lower()
    if not lower or lower in ("", "n/a", "na"):
        return "Did not observe"
    if any(x in lower for x in [
        "didn't observe", "did not observe", "could not observe",
        "no sessions", "not observe", "i did not"
    ]):
        return "Did not observe"
    if "excellent" in lower:
        return "Excellent"
    if "very good" in lower or "good" in lower:
        return "Good"
    if "average" in lower or "fair" in lower or "moderate" in lower:
        return "Average"
    if "poor" in lower:
        return "Poor"
    return None


RATING_TO_NUM = {"Excellent": 4, "Good": 3, "Average": 2, "Poor": 1}

COMPLIANCE_FIELDS = [
    "grouping_correct",
    "letter_tracker_correct",
    "teaching_correct_letters",
    "comment_section_usage",
    "mastery_before_blending",
]

QUALITY_RATING_FIELDS = [
    "session_quality",
    "teacher_relationship",
]


class Command(BaseCommand):
    help = "Pre-compute mentor visit summary for the PM dashboard."

    def handle(self, *args, **options):
        visits = list(MentorVisit2026.objects.all().values(
            "response_id", "mentor_name", "school_name", "ea_name",
            "grade", "class_name", "response_start_at",
            "grouping_correct", "letter_tracker_correct",
            "teaching_correct_letters", "comment_section_usage",
            "mastery_before_blending", "session_quality",
            "teacher_relationship", "duration_minutes",
        ))

        if not visits:
            self.stdout.write(self.style.WARNING("No mentor visits found."))
            MentorVisitSummaryCache2026.objects.update_or_create(
                key="latest",
                defaults={"data": {"generated_at": timezone.now().isoformat()}},
            )
            return

        total = len(visits)
        mentors = set()
        schools = set()
        eas = set()

        for v in visits:
            if v["mentor_name"]:
                mentors.add(v["mentor_name"])
            if v["school_name"]:
                schools.add(v["school_name"])
            if v["ea_name"]:
                eas.add(v["ea_name"])

        # --- Overview ---
        overview = {
            "total_visits": total,
            "unique_mentors": len(mentors),
            "schools_visited": len(schools),
            "eas_observed": len(eas),
        }

        # --- Compliance ---
        compliance = {}
        for field in COMPLIANCE_FIELDS:
            counts = {"yes": 0, "no": 0, "not_observed": 0}
            for v in visits:
                result = _extract_yes_no(v.get(field, "") or "")
                if result and result in counts:
                    counts[result] += 1
            compliance[field] = counts

        # --- Quality Ratings ---
        quality_ratings = {}
        for field in QUALITY_RATING_FIELDS:
            counts = {"Excellent": 0, "Good": 0, "Average": 0, "Poor": 0, "Did not observe": 0}
            for v in visits:
                rating = _normalize_rating(v.get(field, "") or "")
                if rating and rating in counts:
                    counts[rating] += 1
            quality_ratings[field] = counts

        # --- Visits Over Time (weekly) ---
        week_counts = defaultdict(int)
        for v in visits:
            dt = v.get("response_start_at")
            if dt:
                # Week starts on Monday
                week_start = dt.date() - timedelta(days=dt.weekday())
                week_counts[week_start.isoformat()] += 1

        visits_over_time = [
            {"week_start": ws, "visits": cnt}
            for ws, cnt in sorted(week_counts.items())
        ]

        # --- By Mentor ---
        mentor_data = defaultdict(lambda: {"visits": 0, "schools": set(), "quality_scores": []})
        for v in visits:
            m = v.get("mentor_name")
            if not m:
                continue
            mentor_data[m]["visits"] += 1
            if v.get("school_name"):
                mentor_data[m]["schools"].add(v["school_name"])
            rating = _normalize_rating(v.get("session_quality", "") or "")
            if rating and rating in RATING_TO_NUM:
                mentor_data[m]["quality_scores"].append(RATING_TO_NUM[rating])

        by_mentor = []
        for mentor, info in sorted(mentor_data.items()):
            scores = info["quality_scores"]
            avg_q = round(sum(scores) / len(scores), 1) if scores else None
            by_mentor.append({
                "mentor": mentor,
                "visits": info["visits"],
                "schools_visited": len(info["schools"]),
                "avg_quality_score": avg_q,
            })

        # --- Flagged EAs (most recent visit has "No" for any compliance field) ---
        ea_visits = defaultdict(list)
        for v in visits:
            ea = v.get("ea_name")
            if ea:
                ea_visits[ea].append(v)

        flagged_eas = []
        for ea, ea_visit_list in ea_visits.items():
            # Sort by date descending, take most recent
            sorted_visits = sorted(
                ea_visit_list,
                key=lambda x: x.get("response_start_at") or timezone.datetime.min,
                reverse=True,
            )
            latest = sorted_visits[0]
            for field in COMPLIANCE_FIELDS:
                result = _extract_yes_no(latest.get(field, "") or "")
                if result == "no":
                    visit_date = latest.get("response_start_at")
                    flagged_eas.append({
                        "ea_name": ea,
                        "school": latest.get("school_name", ""),
                        "mentor": latest.get("mentor_name", ""),
                        "issue": field,
                        "visit_date": visit_date.date().isoformat() if visit_date else None,
                    })

        # --- Coverage ---
        today = date.today()
        cutoff = today - timedelta(days=14)

        # All programme schools (from SchoolSummary2026)
        all_school_names = set(
            SchoolSummary2026.objects.values_list("school_name", flat=True)
        )

        # Latest visit per school
        school_last_visit = {}
        for v in visits:
            school = v.get("school_name")
            dt = v.get("response_start_at")
            if school and dt:
                existing = school_last_visit.get(school)
                if not existing or dt > existing:
                    school_last_visit[school] = dt

        schools_visited_14d = sum(
            1 for dt in school_last_visit.values()
            if dt.date() >= cutoff
        )

        gaps = []
        # Schools in programme but not visited, or visited > 14d ago
        for school in all_school_names:
            last_dt = school_last_visit.get(school)
            if last_dt is None:
                gaps.append({
                    "school": school,
                    "last_visit": None,
                    "days_since": None,
                })
            elif last_dt.date() < cutoff:
                days_since = (today - last_dt.date()).days
                gaps.append({
                    "school": school,
                    "last_visit": last_dt.date().isoformat(),
                    "days_since": days_since,
                })

        # Sort: never-visited first, then by days_since descending
        gaps.sort(key=lambda g: (g["days_since"] is not None, -(g["days_since"] or 9999)))

        coverage = {
            "schools_visited_14d": schools_visited_14d,
            "total_schools": len(all_school_names),
            "coverage_rate": round(
                schools_visited_14d / max(len(all_school_names), 1) * 100, 1
            ),
            "gaps": gaps,
        }

        # --- Store ---
        payload = {
            "generated_at": timezone.now().isoformat(),
            "overview": overview,
            "compliance": compliance,
            "quality_ratings": quality_ratings,
            "visits_over_time": visits_over_time,
            "by_mentor": by_mentor,
            "flagged_eas": flagged_eas,
            "coverage": coverage,
        }

        MentorVisitSummaryCache2026.objects.update_or_create(
            key="latest",
            defaults={"data": payload},
        )

        self.stdout.write(self.style.SUCCESS(
            f"Mentor visit summary computed: {total} visits, "
            f"{len(mentors)} mentors, {len(schools)} schools visited."
        ))
```

- [ ] **Step 2: Run the command locally to verify**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
python manage.py compute_mentor_visit_summary_2026
```

Expected: `Mentor visit summary computed: X visits, Y mentors, Z schools visited.`

- [ ] **Step 3: Commit**

```bash
git add api/management/commands/compute_mentor_visit_summary_2026.py
git commit -m "feat: add compute_mentor_visit_summary_2026 management command"
```

---

## Task 4: Django API Views & URLs

**Files:**
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/views.py`
- Modify: `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/api/urls.py`

- [ ] **Step 1: Add the two view functions to views.py**

Add at the end of views.py, after the existing `letter_alignment_unmatched` view:

```python
@api_view(["GET"])
def assessments_summary(request):
    """
    GET /api/assessments-summary/
    Returns pre-computed assessment summary from AssessmentSummaryCache2026.
    """
    from api.models import AssessmentSummaryCache2026

    try:
        cache = AssessmentSummaryCache2026.objects.get(key="latest")
        return JsonResponse(cache.data)
    except AssessmentSummaryCache2026.DoesNotExist:
        return JsonResponse(
            {"error": "Assessment summary not yet computed. Run compute_assessment_summary_2026."},
            status=404,
        )


@api_view(["GET"])
def mentor_visits_summary(request):
    """
    GET /api/mentor-visits-summary/
    Returns pre-computed mentor visit summary from MentorVisitSummaryCache2026.
    """
    from api.models import MentorVisitSummaryCache2026

    try:
        cache = MentorVisitSummaryCache2026.objects.get(key="latest")
        return JsonResponse(cache.data)
    except MentorVisitSummaryCache2026.DoesNotExist:
        return JsonResponse(
            {"error": "Mentor visit summary not yet computed. Run compute_mentor_visit_summary_2026."},
            status=404,
        )
```

- [ ] **Step 2: Add URL patterns to urls.py**

Add these two lines to the `urlpatterns` list in `api/urls.py`:

```python
    path('assessments-summary/', views.assessments_summary, name='assessments-summary'),
    path('mentor-visits-summary/', views.mentor_visits_summary, name='mentor-visits-summary'),
```

- [ ] **Step 3: Test the endpoints locally**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2025
python manage.py runserver 8000
# In another terminal:
curl http://localhost:8000/api/assessments-summary/ | python -m json.tool | head -20
curl http://localhost:8000/api/mentor-visits-summary/ | python -m json.tool | head -20
```

Expected: JSON responses with `generated_at`, `overview`, and other top-level keys.

- [ ] **Step 4: Commit**

```bash
git add api/views.py api/urls.py
git commit -m "feat: add assessments-summary and mentor-visits-summary API endpoints"
```

---

## Task 5: Next.js Types & API Functions

**Files:**
- Modify: `lib/pm/types.ts`
- Modify: `lib/pm/api.ts`

- [ ] **Step 1: Add TypeScript types to lib/pm/types.ts**

Add at the end of the file:

```typescript
// ─── Assessments Summary API Response ──────────────────────────

export interface AssessmentsSummaryResponse {
  generated_at: string;
  overview: {
    total_assessed: number;
    avg_lcpm: number;
    avg_wcpm: number;
    avg_nonwords: number;
    pct_zero_letters: number;
    pct_at_benchmark_gr1: number;
    pct_at_benchmark_grR: number;
    stop_rule_rate: number;
    completion_rate: number;
  };
  by_cohort: AssessmentCohortRow[];
  by_language: AssessmentLanguageRow[];
  by_grade: AssessmentGradeRow[];
  score_distribution: ScoreDistributionBucket[];
  by_school: AssessmentSchoolRow[];
}

export interface AssessmentCohortRow {
  cohort: string;
  count: number;
  avg_lcpm: number;
  pct_zero: number;
  pct_at_benchmark: number;
}

export interface AssessmentLanguageRow {
  language: string;
  count: number;
  avg_lcpm: number;
}

export interface AssessmentGradeRow {
  grade: string;
  count: number;
  avg_lcpm: number;
  pct_zero: number;
  pct_at_benchmark: number;
}

export interface ScoreDistributionBucket {
  bucket: number;
  count: number;
}

export interface AssessmentSchoolRow {
  school: string;
  cohort: string;
  count: number;
  avg_lcpm: number;
  pct_zero: number;
  pct_at_benchmark: number;
}

// ─── Mentor Visits Summary API Response ────────────────────────

export interface MentorVisitsSummaryResponse {
  generated_at: string;
  overview: {
    total_visits: number;
    unique_mentors: number;
    schools_visited: number;
    eas_observed: number;
  };
  compliance: Record<string, { yes: number; no: number; not_observed: number }>;
  quality_ratings: Record<string, Record<string, number>>;
  visits_over_time: VisitsTimeSeriesPoint[];
  by_mentor: MentorRow[];
  flagged_eas: FlaggedEARow[];
  coverage: CoverageData;
}

export interface VisitsTimeSeriesPoint {
  week_start: string;
  visits: number;
}

export interface MentorRow {
  mentor: string;
  visits: number;
  schools_visited: number;
  avg_quality_score: number | null;
}

export interface FlaggedEARow {
  ea_name: string;
  school: string;
  mentor: string;
  issue: string;
  visit_date: string | null;
}

export interface CoverageData {
  schools_visited_14d: number;
  total_schools: number;
  coverage_rate: number;
  gaps: CoverageGap[];
}

export interface CoverageGap {
  school: string;
  last_visit: string | null;
  days_since: number | null;
}
```

- [ ] **Step 2: Add API fetch functions to lib/pm/api.ts**

Add the import for the new types at the top of the file:

```typescript
import type {
  ProgrammeOverviewResponse,
  SchoolPerformanceRow,
  SessionsActivityResponse,
  Groups2026Response,
  FlagEvidenceResponse,
  LetterAlignmentResponse,
  AssessmentsSummaryResponse,
  MentorVisitsSummaryResponse,
} from "./types";
```

Add the following functions and empty constants at the end of the file:

```typescript
// ─── Assessments Summary ──────────────────────────────────────

export interface AssessmentsSummaryResult {
  data: AssessmentsSummaryResponse;
  isLive: boolean;
}

export async function getAssessmentsSummary(): Promise<AssessmentsSummaryResult> {
  const apiUrl = process.env.DJANGO_API_URL;

  if (!apiUrl) {
    console.warn("[pm/api] DJANGO_API_URL not set — assessments data unavailable");
    return { data: EMPTY_ASSESSMENTS_SUMMARY, isLive: false };
  }

  try {
    const res = await fetch(`${apiUrl}/api/assessments-summary/`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`[pm/api] Assessments summary returned ${res.status}`);
      return { data: EMPTY_ASSESSMENTS_SUMMARY, isLive: false };
    }

    return { data: await res.json(), isLive: true };
  } catch (error) {
    console.error("[pm/api] Failed to fetch assessments summary:", error);
    return { data: EMPTY_ASSESSMENTS_SUMMARY, isLive: false };
  }
}

const EMPTY_ASSESSMENTS_SUMMARY: AssessmentsSummaryResponse = {
  generated_at: "",
  overview: {
    total_assessed: 0,
    avg_lcpm: 0,
    avg_wcpm: 0,
    avg_nonwords: 0,
    pct_zero_letters: 0,
    pct_at_benchmark_gr1: 0,
    pct_at_benchmark_grR: 0,
    stop_rule_rate: 0,
    completion_rate: 0,
  },
  by_cohort: [],
  by_language: [],
  by_grade: [],
  score_distribution: [],
  by_school: [],
};

// ─── Mentor Visits Summary ────────────────────────────────────

export interface MentorVisitsSummaryResult {
  data: MentorVisitsSummaryResponse;
  isLive: boolean;
}

export async function getMentorVisitsSummary(): Promise<MentorVisitsSummaryResult> {
  const apiUrl = process.env.DJANGO_API_URL;

  if (!apiUrl) {
    console.warn("[pm/api] DJANGO_API_URL not set — mentor visits data unavailable");
    return { data: EMPTY_MENTOR_VISITS_SUMMARY, isLive: false };
  }

  try {
    const res = await fetch(`${apiUrl}/api/mentor-visits-summary/`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`[pm/api] Mentor visits summary returned ${res.status}`);
      return { data: EMPTY_MENTOR_VISITS_SUMMARY, isLive: false };
    }

    return { data: await res.json(), isLive: true };
  } catch (error) {
    console.error("[pm/api] Failed to fetch mentor visits summary:", error);
    return { data: EMPTY_MENTOR_VISITS_SUMMARY, isLive: false };
  }
}

const EMPTY_MENTOR_VISITS_SUMMARY: MentorVisitsSummaryResponse = {
  generated_at: "",
  overview: {
    total_visits: 0,
    unique_mentors: 0,
    schools_visited: 0,
    eas_observed: 0,
  },
  compliance: {},
  quality_ratings: {},
  visits_over_time: [],
  by_mentor: [],
  flagged_eas: [],
  coverage: {
    schools_visited_14d: 0,
    total_schools: 0,
    coverage_rate: 0,
    gaps: [],
  },
};
```

- [ ] **Step 3: Verify types compile**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No type errors related to the new types.

- [ ] **Step 4: Commit**

```bash
git add lib/pm/types.ts lib/pm/api.ts
git commit -m "feat: add assessment and mentor visit types and API functions"
```

---

## Task 6: Next.js Proxy Routes

**Files:**
- Create: `app/api/assessments-summary/route.ts`
- Create: `app/api/mentor-visits-summary/route.ts`

These follow the exact pattern of `app/api/flag-evidence/route.ts`.

- [ ] **Step 1: Create assessments-summary proxy route**

Create `app/api/assessments-summary/route.ts`:

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const apiUrl = process.env.DJANGO_API_URL;
  if (!apiUrl) {
    return NextResponse.json(
      { error: "Backend API URL not configured" },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${apiUrl}/api/assessments-summary/`);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Backend returned an error" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to reach backend" },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 2: Create mentor-visits-summary proxy route**

Create `app/api/mentor-visits-summary/route.ts`:

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const apiUrl = process.env.DJANGO_API_URL;
  if (!apiUrl) {
    return NextResponse.json(
      { error: "Backend API URL not configured" },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${apiUrl}/api/mentor-visits-summary/`);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Backend returned an error" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to reach backend" },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/assessments-summary/route.ts app/api/mentor-visits-summary/route.ts
git commit -m "feat: add proxy routes for assessments and mentor visits endpoints"
```

---

## Task 7: Assessments Page & Components

**Files:**
- Replace: `app/pm/assessments/page.tsx`
- Create: `components/pm/assessments/assessment-kpis.tsx`
- Create: `components/pm/assessments/cohort-comparison.tsx`
- Create: `components/pm/assessments/score-distribution.tsx`
- Create: `components/pm/assessments/school-comparison.tsx`
- Create: `components/pm/assessments/language-grade-breakdown.tsx`

- [ ] **Step 1: Create assessment-kpis.tsx**

Create `components/pm/assessments/assessment-kpis.tsx`:

```tsx
import type { AssessmentsSummaryResponse } from "@/lib/pm/types";
import { KPICard } from "@/components/pm/shared/kpi-card";

interface AssessmentKPIsProps {
  data: AssessmentsSummaryResponse;
}

export function AssessmentKPIs({ data }: AssessmentKPIsProps) {
  const { overview } = data;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <KPICard
        label="Children Assessed"
        value={overview.total_assessed.toLocaleString()}
        subtitle={`${data.by_language.map((l) => `${l.count.toLocaleString()} ${l.language}`).join(" · ")}`}
        borderColor="border-l-blue-500"
      />
      <KPICard
        label="Avg Letters Correct"
        value={overview.avg_lcpm.toFixed(1)}
        subtitle={`Words: ${overview.avg_wcpm.toFixed(1)} · Non-words: ${overview.avg_nonwords.toFixed(1)}`}
        borderColor="border-l-purple-500"
      />
      <KPICard
        label="Zero Letter Knowledge"
        value={`${overview.pct_zero_letters.toFixed(1)}%`}
        subtitle="children scoring 0 letters correct"
        borderColor={overview.pct_zero_letters > 30 ? "border-l-red-500" : "border-l-amber-500"}
      />
      <KPICard
        label="At Benchmark (Gr 1)"
        value={`${overview.pct_at_benchmark_gr1.toFixed(1)}%`}
        subtitle="Grade 1 children at 40+ letters correct"
        borderColor={overview.pct_at_benchmark_gr1 >= 20 ? "border-l-green-500" : "border-l-amber-500"}
      />
      <KPICard
        label="At Benchmark (Gr R)"
        value={`${overview.pct_at_benchmark_grR.toFixed(1)}%`}
        subtitle="Grade R children at 10+ letters correct"
        borderColor={overview.pct_at_benchmark_grR >= 30 ? "border-l-green-500" : "border-l-amber-500"}
      />
      <KPICard
        label="Completion Rate"
        value={`${overview.completion_rate.toFixed(1)}%`}
        subtitle={`Stop rule: ${overview.stop_rule_rate.toFixed(1)}%`}
        borderColor="border-l-cyan-500"
      />
    </div>
  );
}
```

- [ ] **Step 2: Create cohort-comparison.tsx**

Create `components/pm/assessments/cohort-comparison.tsx`:

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { AssessmentCohortRow } from "@/lib/pm/types";

interface CohortComparisonProps {
  data: AssessmentCohortRow[];
}

const COHORT_COLORS: Record<string, string> = {
  treatment: "#2c5aa0",
  control: "#94a3b8",
  sef: "#ffd641",
};

const COHORT_LABELS: Record<string, string> = {
  treatment: "Treatment",
  control: "Control",
  sef: "SEF",
};

export function CohortComparison({ data }: CohortComparisonProps) {
  // Build chart data: one entry per metric, with cohort values as separate keys
  const metrics = [
    { key: "avg_lcpm", label: "Avg Letters Correct" },
    { key: "pct_zero", label: "% Zero Letters" },
    { key: "pct_at_benchmark", label: "% At Benchmark" },
  ] as const;

  const chartData = metrics.map((m) => {
    const row: Record<string, string | number> = { metric: m.label };
    for (const cohort of data) {
      row[cohort.cohort] = cohort[m.key];
    }
    return row;
  });

  const cohorts = data.map((c) => c.cohort);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-800">Treatment vs Control</p>
        <p className="text-xs text-slate-500">
          {data.map((c) => `${COHORT_LABELS[c.cohort] || c.cohort}: ${c.count.toLocaleString()} children`).join(" · ")}
        </p>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-sm text-slate-400">
          No cohort data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="metric"
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {cohorts.map((cohort) => (
              <Bar
                key={cohort}
                dataKey={cohort}
                name={COHORT_LABELS[cohort] || cohort}
                fill={COHORT_COLORS[cohort] || "#6b7280"}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create score-distribution.tsx**

Create `components/pm/assessments/score-distribution.tsx`:

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { ScoreDistributionBucket } from "@/lib/pm/types";

interface ScoreDistributionProps {
  data: ScoreDistributionBucket[];
}

const THRESHOLDS = [
  { value: 0, label: "Zero", color: "#ef4444" },
  { value: 10, label: "Gr R benchmark", color: "#f59e0b" },
  { value: 40, label: "Gr 1 benchmark", color: "#22c55e" },
];

export function ScoreDistribution({ data }: ScoreDistributionProps) {
  const chartData = data.map((d) => ({
    label: `${d.bucket}–${d.bucket + 4}`,
    bucket: d.bucket,
    count: d.count,
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-800">Score Distribution</p>
        <p className="text-xs text-slate-500">Letters correct (LCPM) — all children</p>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-sm text-slate-400">
          No distribution data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
              formatter={(value: number) => [value.toLocaleString(), "Children"]}
            />
            <Bar dataKey="count" fill="#2c5aa0" radius={[4, 4, 0, 0]} />
            {THRESHOLDS.map((t) => {
              // Map threshold value to bar index
              const idx = data.findIndex((d) => d.bucket === t.value);
              if (idx < 0) return null;
              return (
                <ReferenceLine
                  key={t.value}
                  x={chartData[idx]?.label}
                  stroke={t.color}
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: t.label,
                    position: "top",
                    fontSize: 10,
                    fill: t.color,
                  }}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create school-comparison.tsx**

Create `components/pm/assessments/school-comparison.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { AssessmentSchoolRow } from "@/lib/pm/types";

interface SchoolComparisonProps {
  data: AssessmentSchoolRow[];
}

const COHORT_FILLS: Record<string, string> = {
  treatment: "#2c5aa0",
  control: "#94a3b8",
  sef: "#ffd641",
};

export function SchoolComparison({ data }: SchoolComparisonProps) {
  const [showAll, setShowAll] = useState(false);

  const sorted = [...data].sort((a, b) => b.avg_lcpm - a.avg_lcpm);
  const displayed = showAll ? sorted : sorted.slice(0, 30);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">School Comparison</p>
          <p className="text-xs text-slate-500">Average letters correct by school</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#2c5aa0" }} />
            Treatment
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#94a3b8" }} />
            Control
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#ffd641" }} />
            SEF
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-sm text-slate-400">
          No school data available
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={Math.max(300, displayed.length * 24)}>
            <BarChart
              data={displayed}
              layout="vertical"
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="school"
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                width={180}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
                formatter={(value: number) => [value.toFixed(1), "Avg LCPM"]}
              />
              <Bar dataKey="avg_lcpm" radius={[0, 4, 4, 0]}>
                {displayed.map((entry, i) => (
                  <Cell key={i} fill={COHORT_FILLS[entry.cohort] || "#6b7280"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {sorted.length > 30 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-2 text-xs text-primary hover:underline"
            >
              {showAll ? "Show top 30" : `Show all ${sorted.length} schools`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create language-grade-breakdown.tsx**

Create `components/pm/assessments/language-grade-breakdown.tsx`:

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { AssessmentsSummaryResponse } from "@/lib/pm/types";

interface LanguageGradeBreakdownProps {
  data: AssessmentsSummaryResponse;
}

const GRADE_COLORS: Record<string, string> = {
  "Grade R": "#60a5fa",
  "Grade 1": "#22c55e",
  "Grade 2": "#a78bfa",
};

export function LanguageGradeBreakdown({ data }: LanguageGradeBreakdownProps) {
  // Pivot: one row per language, grade values as columns
  // We need to know which grades exist
  const grades = [...new Set(data.by_grade.map((g) => g.grade))];

  // Build a cross-tab of language x grade from the raw by_school data
  // Since by_language doesn't break down by grade, we approximate from by_school
  // Alternatively, just show by_language and by_grade as two separate simple charts
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* By Language */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-800">By Language</p>
          <p className="text-xs text-slate-500">Average letters correct</p>
        </div>
        {data.by_language.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-slate-400">
            No data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.by_language} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="language"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
              />
              <Bar dataKey="avg_lcpm" name="Avg LCPM" fill="#2c5aa0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* By Grade */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-800">By Grade</p>
          <p className="text-xs text-slate-500">Average letters correct and % zero knowledge</p>
        </div>
        {data.by_grade.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-slate-400">
            No data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.by_grade} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="grade"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {grades.map((grade) => (
                <Bar
                  key={grade}
                  dataKey="avg_lcpm"
                  name="Avg LCPM"
                  fill={GRADE_COLORS[grade] || "#6b7280"}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Replace the assessments page.tsx**

Replace `app/pm/assessments/page.tsx`:

```tsx
import { getAssessmentsSummary } from "@/lib/pm/api";
import { AssessmentKPIs } from "@/components/pm/assessments/assessment-kpis";
import { CohortComparison } from "@/components/pm/assessments/cohort-comparison";
import { ScoreDistribution } from "@/components/pm/assessments/score-distribution";
import { SchoolComparison } from "@/components/pm/assessments/school-comparison";
import { LanguageGradeBreakdown } from "@/components/pm/assessments/language-grade-breakdown";
import { AlertTriangle } from "lucide-react";

export default async function AssessmentsPage() {
  const { data, isLive } = await getAssessmentsSummary();

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {!isLive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-amber-800">
            <span className="font-semibold">Assessment data unavailable.</span>{" "}
            The assessments API is not responding. Data shown below may be empty.
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Assessments</h1>
        <p className="text-sm text-slate-500">
          Baseline EGRA scores — {data.overview.total_assessed.toLocaleString()} children assessed
        </p>
      </div>

      {/* KPI Cards */}
      <AssessmentKPIs data={data} />

      {/* Treatment vs Control */}
      <CohortComparison data={data.by_cohort} />

      {/* Row: Distribution + Language/Grade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ScoreDistribution data={data.score_distribution} />
        <LanguageGradeBreakdown data={data} />
      </div>

      {/* School Comparison */}
      <SchoolComparison data={data.by_school} />
    </div>
  );
}
```

- [ ] **Step 7: Verify the page renders**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs
npm run dev
# Open http://localhost:3000/pm/assessments
```

Expected: Page renders with KPIs, charts, and school comparison. If Django is running with computed data, shows live data; otherwise shows amber warning with empty state.

- [ ] **Step 8: Commit**

```bash
git add app/pm/assessments/ components/pm/assessments/
git commit -m "feat: build assessments page with KPIs, cohort comparison, and charts"
```

---

## Task 8: Mentor Visits Page & Components

**Files:**
- Replace: `app/pm/mentor-visits/page.tsx`
- Create: `components/pm/mentor-visits/visit-kpis.tsx`
- Create: `components/pm/mentor-visits/visits-over-time.tsx`
- Create: `components/pm/mentor-visits/compliance-checks.tsx`
- Create: `components/pm/mentor-visits/quality-ratings.tsx`
- Create: `components/pm/mentor-visits/mentor-summary-table.tsx`
- Create: `components/pm/mentor-visits/coverage-gaps.tsx`

- [ ] **Step 1: Create visit-kpis.tsx**

Create `components/pm/mentor-visits/visit-kpis.tsx`:

```tsx
import type { MentorVisitsSummaryResponse } from "@/lib/pm/types";
import { KPICard } from "@/components/pm/shared/kpi-card";

interface VisitKPIsProps {
  data: MentorVisitsSummaryResponse;
}

export function VisitKPIs({ data }: VisitKPIsProps) {
  const { overview, coverage } = data;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KPICard
        label="Total Visits"
        value={overview.total_visits}
        borderColor="border-l-blue-500"
      />
      <KPICard
        label="Mentors Active"
        value={overview.unique_mentors}
        borderColor="border-l-purple-500"
      />
      <KPICard
        label="Schools Visited"
        value={overview.schools_visited}
        subtitle={`of ${coverage.total_schools} total`}
        borderColor="border-l-cyan-500"
      />
      <KPICard
        label="EAs Observed"
        value={overview.eas_observed}
        borderColor="border-l-green-500"
      />
    </div>
  );
}
```

- [ ] **Step 2: Create visits-over-time.tsx**

Create `components/pm/mentor-visits/visits-over-time.tsx`:

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { VisitsTimeSeriesPoint } from "@/lib/pm/types";

interface VisitsOverTimeProps {
  data: VisitsTimeSeriesPoint[];
}

function formatWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

export function VisitsOverTime({ data }: VisitsOverTimeProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatWeek(d.week_start),
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-800">Visits Over Time</p>
        <p className="text-xs text-slate-500">Visits per week</p>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-sm text-slate-400">
          No visit data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
            />
            <Bar dataKey="visits" fill="#2c5aa0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create compliance-checks.tsx**

Create `components/pm/mentor-visits/compliance-checks.tsx`:

```tsx
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { FlaggedEARow } from "@/lib/pm/types";

interface ComplianceChecksProps {
  compliance: Record<string, { yes: number; no: number; not_observed: number }>;
  flaggedEAs: FlaggedEARow[];
}

const FIELD_LABELS: Record<string, string> = {
  grouping_correct: "Grouping Correct",
  letter_tracker_correct: "Letter Tracker Correct",
  teaching_correct_letters: "Teaching Correct Letters",
  comment_section_usage: "Comment Section Usage",
  mastery_before_blending: "Mastery Before Blending",
};

const STATUS_COLORS = {
  yes: "#22c55e",
  no: "#ef4444",
  not_observed: "#94a3b8",
};

const STATUS_LABELS = {
  yes: "Yes",
  no: "No",
  not_observed: "Not Observed",
};

export function ComplianceChecks({ compliance, flaggedEAs }: ComplianceChecksProps) {
  const fields = Object.keys(FIELD_LABELS);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-800">Compliance Checks</h2>

      {fields.map((field) => {
        const counts = compliance[field];
        if (!counts) return null;

        const total = counts.yes + counts.no + counts.not_observed;
        if (total === 0) return null;

        const pieData = [
          { name: "Yes", value: counts.yes },
          { name: "No", value: counts.no },
          { name: "Not Observed", value: counts.not_observed },
        ].filter((d) => d.value > 0);

        const flaggedForField = flaggedEAs.filter((ea) => ea.issue === field);
        const yesRate = total > 0 ? Math.round((counts.yes / total) * 100) : 0;

        return (
          <div key={field} className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-800">
                {FIELD_LABELS[field]}
              </p>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  yesRate >= 90
                    ? "bg-green-50 text-green-700"
                    : yesRate >= 70
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700"
                }`}
              >
                {yesRate}% compliant
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Donut chart */}
              <div className="flex items-center justify-center">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={
                            STATUS_COLORS[
                              entry.name === "Yes"
                                ? "yes"
                                : entry.name === "No"
                                  ? "no"
                                  : "not_observed"
                            ]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Flagged EAs table */}
              <div className="lg:col-span-2">
                {flaggedForField.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-green-600">
                    All EAs compliant (most recent visit = Yes)
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-amber-600 font-semibold mb-2">
                      {flaggedForField.length} EA(s) flagged — most recent visit was No
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-1.5 px-2 font-semibold text-slate-600">EA</th>
                            <th className="text-left py-1.5 px-2 font-semibold text-slate-600">School</th>
                            <th className="text-left py-1.5 px-2 font-semibold text-slate-600">Mentor</th>
                            <th className="text-left py-1.5 px-2 font-semibold text-slate-600">Visit Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {flaggedForField.map((ea, i) => (
                            <tr key={i} className="border-b border-slate-100">
                              <td className="py-1.5 px-2 text-slate-800">{ea.ea_name}</td>
                              <td className="py-1.5 px-2 text-slate-600">{ea.school}</td>
                              <td className="py-1.5 px-2 text-slate-600">{ea.mentor}</td>
                              <td className="py-1.5 px-2 text-slate-500">{ea.visit_date || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create quality-ratings.tsx**

Create `components/pm/mentor-visits/quality-ratings.tsx`:

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";

interface QualityRatingsProps {
  ratings: Record<string, Record<string, number>>;
}

const FIELD_LABELS: Record<string, string> = {
  session_quality: "Session Quality",
  teacher_relationship: "EA-Teacher Relationship",
};

const RATING_ORDER = ["Excellent", "Good", "Average", "Poor", "Did not observe"];

const RATING_COLORS: Record<string, string> = {
  Excellent: "#22c55e",
  Good: "#2c5aa0",
  Average: "#f59e0b",
  Poor: "#ef4444",
  "Did not observe": "#cbd5e1",
};

export function QualityRatings({ ratings }: QualityRatingsProps) {
  const fields = Object.keys(FIELD_LABELS);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {fields.map((field) => {
        const counts = ratings[field];
        if (!counts) return null;

        const chartData = RATING_ORDER.filter((r) => (counts[r] || 0) > 0).map(
          (rating) => ({
            rating,
            count: counts[rating] || 0,
          })
        );

        if (chartData.length === 0) return null;

        return (
          <div key={field} className="bg-white rounded-lg shadow-sm p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-slate-800">
                {FIELD_LABELS[field]}
              </p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="rating"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.rating} fill={RATING_COLORS[entry.rating] || "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Create mentor-summary-table.tsx**

Create `components/pm/mentor-visits/mentor-summary-table.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { MentorRow } from "@/lib/pm/types";

interface MentorSummaryTableProps {
  data: MentorRow[];
}

type SortKey = "mentor" | "visits" | "schools_visited" | "avg_quality_score";

function qualityLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 3.5) return `${score.toFixed(1)} (Excellent)`;
  if (score >= 2.5) return `${score.toFixed(1)} (Good)`;
  if (score >= 1.5) return `${score.toFixed(1)} (Average)`;
  return `${score.toFixed(1)} (Poor)`;
}

function qualityColor(score: number | null): string {
  if (score === null) return "text-slate-400";
  if (score >= 3.5) return "text-green-600";
  if (score >= 2.5) return "text-blue-600";
  if (score >= 1.5) return "text-amber-600";
  return "text-red-600";
}

export function MentorSummaryTable({ data }: MentorSummaryTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("visits");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortKey] ?? -1;
    const bVal = b[sortKey] ?? -1;
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return sortAsc ? (
      <ChevronUp className="w-3 h-3 inline" />
    ) : (
      <ChevronDown className="w-3 h-3 inline" />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <p className="text-sm font-semibold text-slate-800 mb-3">Mentor Summary</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {[
                { key: "mentor" as SortKey, label: "Mentor" },
                { key: "visits" as SortKey, label: "Visits" },
                { key: "schools_visited" as SortKey, label: "Schools" },
                { key: "avg_quality_score" as SortKey, label: "Avg Quality" },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="text-left py-2 px-3 font-semibold text-slate-600 cursor-pointer hover:text-slate-900"
                >
                  {label} <SortIcon col={key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.mentor} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-3 font-medium text-slate-800">{row.mentor}</td>
                <td className="py-2 px-3 text-slate-600">{row.visits}</td>
                <td className="py-2 px-3 text-slate-600">{row.schools_visited}</td>
                <td className={`py-2 px-3 font-medium ${qualityColor(row.avg_quality_score)}`}>
                  {qualityLabel(row.avg_quality_score)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create coverage-gaps.tsx**

Create `components/pm/mentor-visits/coverage-gaps.tsx`:

```tsx
import type { CoverageData } from "@/lib/pm/types";
import { KPICard } from "@/components/pm/shared/kpi-card";

interface CoverageGapsProps {
  data: CoverageData;
}

function getCoverageColor(rate: number): string {
  if (rate >= 80) return "border-l-green-500";
  if (rate >= 60) return "border-l-amber-500";
  return "border-l-red-500";
}

function getDaysBadge(days: number | null): { text: string; className: string } {
  if (days === null) return { text: "Never visited", className: "bg-red-100 text-red-700" };
  if (days >= 30) return { text: `${days}d`, className: "bg-red-100 text-red-700" };
  if (days >= 21) return { text: `${days}d`, className: "bg-amber-100 text-amber-700" };
  return { text: `${days}d`, className: "bg-yellow-50 text-yellow-700" };
}

export function CoverageGaps({ data }: CoverageGapsProps) {
  return (
    <div className="space-y-4">
      {/* Coverage KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <KPICard
          label="School Coverage (14 days)"
          value={`${data.coverage_rate.toFixed(1)}%`}
          subtitle={`${data.schools_visited_14d} of ${data.total_schools} schools visited`}
          borderColor={getCoverageColor(data.coverage_rate)}
        />
        <KPICard
          label="Coverage Gaps"
          value={data.gaps.length}
          subtitle="schools not visited in 14+ days"
          borderColor={data.gaps.length > 0 ? "border-l-red-500" : "border-l-green-500"}
        />
      </div>

      {/* Gaps Table */}
      {data.gaps.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm font-semibold text-slate-800 mb-3">Schools Needing Visits</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">School</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">Last Visit</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600">Days Since</th>
                </tr>
              </thead>
              <tbody>
                {data.gaps.map((gap) => {
                  const badge = getDaysBadge(gap.days_since);
                  return (
                    <tr key={gap.school} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-slate-800">{gap.school}</td>
                      <td className="py-2 px-3 text-slate-500">{gap.last_visit || "Never"}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                          {badge.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Replace the mentor-visits page.tsx**

Replace `app/pm/mentor-visits/page.tsx`:

```tsx
import { getMentorVisitsSummary } from "@/lib/pm/api";
import { VisitKPIs } from "@/components/pm/mentor-visits/visit-kpis";
import { VisitsOverTime } from "@/components/pm/mentor-visits/visits-over-time";
import { ComplianceChecks } from "@/components/pm/mentor-visits/compliance-checks";
import { QualityRatings } from "@/components/pm/mentor-visits/quality-ratings";
import { MentorSummaryTable } from "@/components/pm/mentor-visits/mentor-summary-table";
import { CoverageGaps } from "@/components/pm/mentor-visits/coverage-gaps";
import { AlertTriangle } from "lucide-react";

export default async function MentorVisitsPage() {
  const { data, isLive } = await getMentorVisitsSummary();

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {!isLive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-amber-800">
            <span className="font-semibold">Mentor visit data unavailable.</span>{" "}
            The mentor visits API is not responding. Data shown below may be empty.
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Mentor Visits</h1>
        <p className="text-sm text-slate-500">
          {data.overview.total_visits} visits by {data.overview.unique_mentors} mentors across {data.overview.schools_visited} schools
        </p>
      </div>

      {/* KPI Cards */}
      <VisitKPIs data={data} />

      {/* Visits Over Time */}
      <VisitsOverTime data={data.visits_over_time} />

      {/* Compliance Checks */}
      <ComplianceChecks compliance={data.compliance} flaggedEAs={data.flagged_eas} />

      {/* Quality Ratings */}
      <QualityRatings ratings={data.quality_ratings} />

      {/* Mentor Summary */}
      <MentorSummaryTable data={data.by_mentor} />

      {/* Coverage Gaps */}
      <CoverageGaps data={data.coverage} />
    </div>
  );
}
```

- [ ] **Step 8: Verify the page renders**

```bash
# With dev server running:
# Open http://localhost:3000/pm/mentor-visits
```

Expected: Page renders with KPIs, weekly bar chart, compliance donuts, quality ratings, mentor table, and coverage gaps.

- [ ] **Step 9: Commit**

```bash
git add app/pm/mentor-visits/ components/pm/mentor-visits/
git commit -m "feat: build mentor visits page with compliance checks, quality ratings, and coverage"
```

---

## Task 9: Sidebar Cleanup & Compare Page Removal

**Files:**
- Modify: `components/pm/layout/pm-sidebar.tsx`
- Delete: `app/pm/compare/page.tsx`

- [ ] **Step 1: Remove Compare from sidebar navigation**

In `components/pm/layout/pm-sidebar.tsx`, remove the `SECONDARY_NAV_ITEMS` array and the section that renders it:

Delete the `GitCompare` import from the lucide import line.

Delete the `SECONDARY_NAV_ITEMS` constant:
```typescript
const SECONDARY_NAV_ITEMS: NavItem[] = [
  { name: "Compare", href: "/pm/compare", icon: GitCompare },
];
```

Delete the separator and secondary nav rendering block in the `<nav>`:
```tsx
          {/* Separator */}
          <div className="my-2 border-t border-slate-700/50" />

          {SECONDARY_NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
```

- [ ] **Step 2: Delete the Compare page**

```bash
rm app/pm/compare/page.tsx
rmdir app/pm/compare
```

- [ ] **Step 3: Verify sidebar renders correctly**

Open http://localhost:3000/pm and verify:
- Compare is no longer in the sidebar
- All 8 primary nav items still display correctly
- Navigating to `/pm/compare` returns a 404

- [ ] **Step 4: Run lint and type check**

```bash
npm run lint
npx tsc --noEmit --pretty
```

Expected: No errors related to removed Compare page or sidebar changes.

- [ ] **Step 5: Commit**

```bash
git add components/pm/layout/pm-sidebar.tsx
git add -u app/pm/compare/
git commit -m "chore: remove Compare placeholder page and sidebar entry"
```

---

## Task 10: Build Verification & Final Check

- [ ] **Step 1: Run full production build**

```bash
cd /Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs
npm run build
```

Expected: Build succeeds with no errors. Both `/pm/assessments` and `/pm/mentor-visits` are statically analyzed.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No lint errors.

- [ ] **Step 3: Manual smoke test**

With `npm run dev` running and Django serving the computed data:

1. Navigate to `/pm/assessments`:
   - KPIs show non-zero values
   - Treatment vs Control chart renders with grouped bars
   - Score distribution histogram shows LCPM buckets
   - School comparison shows bars colored by cohort
   - Language/Grade breakdown shows grouped data

2. Navigate to `/pm/mentor-visits`:
   - KPIs show visit/mentor/school/EA counts
   - Weekly visits bar chart renders
   - 5 compliance sections each show a donut and flagged EA table
   - Quality ratings show Excellent/Good/Average/Poor bars
   - Mentor summary table is sortable
   - Coverage gaps show schools needing visits with day-count badges

3. Navigate to `/pm` sidebar:
   - Assessments and Mentor Visits nav items are highlighted when active
   - Compare is no longer visible
   - `/pm/compare` returns 404

- [ ] **Step 4: Commit all remaining changes (if any)**

```bash
git status
# If any unstaged changes remain, add and commit them
```
