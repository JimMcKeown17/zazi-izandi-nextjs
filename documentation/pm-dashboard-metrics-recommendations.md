# PM Dashboard Metrics Recommendations

> Recommended upgrades to make the PM dashboard world-class, based on review of:
> - `documentation/data-metrics-reference.md`
> - `documentation/pm-dashboard-plan.md`

---

## Purpose

This document captures recommended metric and design improvements **without modifying** `pm-dashboard-plan.md` yet.  
The goal is to increase decision quality, trust, and actionability for funders, mentors, and programme staff.

---

## Priority Findings

### 1) Programme dosage KPI can be biased at aggregate level (High)

Current concept in the PM plan uses a simple mean of school dosage values for programme-level "Average Dosage".  
This can overweight smaller schools and underweight larger schools.

**Recommendation:**

- Keep school-level dosage as-is for school comparisons.
- Add a programme-level **weighted dosage KPI**:

```text
weighted_programme_dosage
= sum(total_sessions) / (sum(groups_count) * weeks_since_programme_start)
```

Use this as the headline programme dosage metric on `/pm`.

---

### 2) Assessment outcomes are strong, but trust/coverage metrics are missing (High)

Outcome KPIs (LCPM, WCPM, benchmark rates) are valuable, but the dashboard also needs representativeness and completion quality metrics.

**Recommendation:**

- Add `assessment_coverage_rate`:

```text
assessment_coverage_rate
= assessed_children / eligible_children
```

- Add `assessment_completeness_rate`:

```text
assessment_completeness_rate
= complete_assessments / started_assessments
```

- Display both rates next to assessment outcome cards so users can interpret confidence in results.

---

### 3) "Teaching-to-need" is identified but not yet measured (High)

The data model includes assessment cell-level detail (`AssessmentCell2026`) and session letter content, which is enough to measure whether instruction targets each group's actual learning needs.

**Recommendation:**

Add `teaching_to_need_alignment` KPI at group and EA levels.

Proposed definition:

```text
teaching_to_need_alignment
= matched_letters_taught_recently / total_letters_taught_recently
```

Where:
- `matched_letters_taught_recently` = letters taught in recent sessions that are in each group's baseline "weak letters" set
- `weak letters` derived from incorrect/incomplete baseline assessment letter cells
- `recently` default = last 10 sessions (or last 14 days)

This metric differentiates volume from instructional quality.

---

### 4) Flag trend cards require explicit historical metric design (Medium)

Planned trend indicators ("up/down vs last week") need a consistent historical basis.

**Recommendation:**

- Define a weekly snapshot strategy for flags.
- Add `flag_resolution_rate_14d`:

```text
flag_resolution_rate_14d
= resolved_within_14_days / new_flags_last_14_days
```

- Define "resolved" explicitly per flag type (e.g., no longer true for 2 consecutive recompute cycles).

---

### 5) Data trust KPIs are needed for executive confidence (Medium)

Current pipeline is robust, but PM pages should expose freshness and linkage reliability.

**Recommendation:**

- Add `data_freshness_hours`:

```text
data_freshness_hours
= now - latest_successful_sync_timestamp
```

- Add `join_match_rate_sessions_assessments`:

```text
join_match_rate_sessions_assessments
= matched_records / candidate_records
```

- Surface both in an "Data Health" section for staff/mentor views.

---

## Recommended Metric Stack

### Tier 1 (Must-Have Now)

1. `weighted_programme_dosage`
2. `assessment_coverage_rate`
3. `assessment_completeness_rate`
4. `on_track_group_rate` (`% groups at >= 3 sessions/week`)
5. `flag_resolution_rate_14d`

### Tier 2 (High Differentiator)

1. `teaching_to_need_alignment`
2. `exposure_adequacy_rate` (`% letters moved past with >= 5 exposures`)
3. `mentor_coverage_recency` (`% schools visited in last 14 days`)

### Tier 3 (Executive Trust & Guardrails)

1. `data_freshness_hours`
2. `join_match_rate_sessions_assessments`
3. Small-sample guardrails (show `n`, suppress unstable rates below minimum `n`)

---

## Practical Dashboard Placement

### `/pm` (Overview)

- Headline: `weighted_programme_dosage`
- Add cards: `on_track_group_rate`, `flag_resolution_rate_14d`
- Add "Data Health" mini-panel: `data_freshness_hours`, join match rate

### `/pm/assessments`

- Keep current outcomes (LCPM/WCPM/benchmarks)
- Add trust cards: `assessment_coverage_rate`, `assessment_completeness_rate`
- Use sample-size labels in all disaggregated charts/tables

### `/pm/quality-flags`

- Keep counts and detail tables
- Add lifecycle view: new flags, resolved flags, and `flag_resolution_rate_14d`

### `/pm/letter-progress`

- Add `teaching_to_need_alignment` in group and EA drill-downs
- Add `exposure_adequacy_rate` where progression is shown

### `/pm/mentor-visits`

- Add `mentor_coverage_recency` and unvisited-school recency buckets

---

## Definition Guardrails (to lock before implementation)

Before coding, finalize these denominator and window rules:

1. **Time windows**  
   - Standard windows: 7d, 14d, 30d, YTD
   - Ensure all trend cards use consistent windows

2. **Eligibility definitions**  
   - Precisely define "eligible children" for assessment coverage by school/grade/language

3. **Low-sample suppression**  
   - Define minimum `n` (example: `n >= 20`) for displaying percentages publicly

4. **Flag resolution semantics**  
   - Define how many consecutive cycles must be clear before a flag is considered resolved

5. **Assessment pairing rules**  
   - Define baseline/endline pairing hierarchy and fallback logic for missing pairs

---

## Suggested Next Step (No Changes Applied Yet)

When ready, the next controlled step is to update `pm-dashboard-plan.md` with:

1. revised KPI definitions for `/pm` and `/pm/assessments`
2. explicit trust/coverage metrics
3. flag lifecycle metrics
4. denominator/window conventions in the endpoint contracts
