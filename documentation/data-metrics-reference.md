# Data, Metrics & Flags Reference

> Comprehensive reference for all data sources, calculated metrics, quality flags, and API endpoints used across the Zazi iZandi project management and EA-facing features. This document is the single source of truth for future development sessions.

---

## Table of Contents

1. [Data Pipeline Overview](#data-pipeline-overview)
2. [Raw Data Sources](#raw-data-sources)
3. [Linking Keys](#linking-keys)
4. [Calculated Metrics](#calculated-metrics)
5. [Quality & Data Integrity Flags](#quality--data-integrity-flags)
6. [Aggregation Levels](#aggregation-levels)
7. [API Endpoints](#api-endpoints)
8. [Letter Sequence & Curriculum Constants](#letter-sequence--curriculum-constants)
9. [School & Cohort Classification](#school--cohort-classification)
10. [Future Data Capture (Mobile App)](#future-data-capture-mobile-app)

---

## Data Pipeline Overview

```
TeamPact API (surveys + session tracking)
    │
    ▼
Django Management Commands (nightly cron on Render)
    ├── sync_teampact_sessions_2026     → TeampactSession2026
    ├── sync_assessments_2026           → Assessment2026
    ├── sync_assessment_cells_2026      → AssessmentCell2026
    ├── sync_mentor_visits_2026         → MentorVisit2026 (survey 824)
    ├── sync_teampact_participants      → TeampactParticipant
    └── compute_school_summaries_2026   → SchoolSummary2026
    │
    ▼
PostgreSQL Database (Render)
    │
    ▼
Django REST API Endpoints
    │
    ▼
Next.js Frontend (ISR, revalidate: 300s)
```

**Refresh cadence:** Nightly cron syncs all data from TeamPact. `SchoolSummary2026` is pre-computed after sync. Next.js pages use ISR with 300-second revalidation windows.

---

## Raw Data Sources

### 1. Sessions — `TeampactSession2026`

**Source:** TeamPact attendance/session API
**Django model:** `api.models.TeampactSession2026`
**Sync command:** `sync_teampact_sessions_2026`
**One row per:** participant per session (i.e., if 7 children attend a session, there are 7 rows sharing the same `session_id`)

| Field | Type | Description | Indexed |
|-------|------|-------------|---------|
| `attendance_id` | PK | Unique row identifier | Yes |
| `session_id` | str | Groups all participants in one session | Yes |
| `session_started_at` | datetime | When the session began | Yes |
| `session_ended_at` | datetime | When the session ended | |
| `session_duration` | int | Duration in seconds | |
| `user_name` | str | **EA name** (the teaching assistant) | Yes |
| `user_id` | int | EA's TeamPact user ID | |
| `user_firstname` | str | EA first name | |
| `user_lastname` | str | EA last name | |
| `user_email` | str | EA email | |
| `user_mobile_number` | str | EA phone | |
| `program_name` | str | **School name** | Yes |
| `program_id` | int | School's TeamPact program ID | |
| `class_name` | str | **Group name** (e.g., "Group 1", "Grade R Group 2") | Yes |
| `class_id` | int | Group's TeamPact class ID | |
| `participant_id` | int | Child's TeamPact participant ID | Yes |
| `participant_name` | str | Child's full name | |
| `participant_firstname` | str | Child's first name | |
| `participant_lastname` | str | Child's last name | |
| `participant_gender` | str | Child's gender | |
| `participant_year_born` | int | Child's birth year | |
| `letters_taught` | str | **Comma-separated letters worked on** (e.g., "a, e, i") | Yes |
| `num_letters_taught` | int | Count of letters in this session | Yes |
| `session_text` | str | **EA's session notes/comments** | |
| `session_topic` | str | Session topic tag | |
| `attended_percentage` | float | Attendance % for this session | |
| `attended_total` | int | Number of children who attended | |
| `participant_total` | int | Total children in group | |
| `attendance_status` | str | Whether this child attended | |
| `latitude` | float | GPS location of session | |
| `longitude` | float | GPS location of session | |
| `org_id` | int | Organisation ID | |
| `org_name` | str | Organisation name | |
| `session_tag_ids` | str | Tag IDs (used for letter extraction) | |
| `is_flagged` | bool | Manual flag | |
| `flag_reason` | str | Reason for manual flag | |

**Key note:** To get unique sessions (not per-participant rows), group by `session_id` or deduplicate on `(session_id, class_name, user_name)`.

---

### 2. Assessments — `Assessment2026`

**Source:** TeamPact surveys 805 (ECD), 815 (isiXhosa), 816 (Afrikaans), 817 (English)
**Django model:** `api.models.Assessment2026`
**Sync command:** `sync_assessments_2026`
**One row per:** child per assessment

| Field | Type | Description | Indexed |
|-------|------|-------------|---------|
| `response_id` | PK | Unique assessment response ID | Yes |
| `survey_id` | int | Which survey (805/815/816/817) | |
| `survey_name` | str | Survey name | |
| `participant_id` | int | Child's TeamPact ID | |
| `first_name` | str | Child's first name | |
| `last_name` | str | Child's last name | |
| `gender` | str | Child's gender | |
| `grade` | str | Child's grade | Yes |
| `language` | str | Assessment language (isiXhosa/Afrikaans/English/ECD) | Yes |
| `program_name` | str | **School name** | |
| `class_name` | str | **Group name** | |
| `class_id` | int | Group's TeamPact class ID | |
| `collected_by` | str | **EA name** who administered the assessment | |
| `response_date` | date | When assessment was taken | Yes |
| `letters_total_correct` | int | **EGRA score: letters correct in 1 minute** | |
| `letters_total_incorrect` | int | Letters incorrect | |
| `letters_total_attempted` | int | Letters attempted | |
| `letters_total_not_attempted` | int | Letters not attempted | |
| `nonwords_total_correct` | int | Non-words correct | |
| `nonwords_total_incorrect` | int | Non-words incorrect | |
| `nonwords_total_attempted` | int | Non-words attempted | |
| `nonwords_total_not_attempted` | int | Non-words not attempted | |
| `words_total_correct` | int | Words correct | |
| `words_total_incorrect` | int | Words incorrect | |
| `words_total_attempted` | int | Words attempted | |
| `words_total_not_attempted` | int | Words not attempted | |
| `assessment_complete` | bool | Whether assessment was fully completed | |
| `stop_rule_reached` | bool | Whether first-5-wrong stop rule triggered | |
| `timer_elapsed` | bool | Whether 1-minute timer ran out | |
| `assessment_type` | str | "baseline" or "endline" | |

**Key assessment rule:** EGRA >= 30 letters correct means child does NOT need catch-up participation.

---

### 3. Assessment Cells — `AssessmentCell2026`

**Source:** Synced from TeamPact survey cell-level data
**Django model:** `api.models.AssessmentCell2026`
**Sync command:** `sync_assessment_cells_2026`
**One row per:** individual letter/word item in an assessment

| Field | Type | Description |
|-------|------|-------------|
| `id` | PK | Auto-generated ID |
| `response` | FK | Links to `Assessment2026.response_id` |
| `question_type` | str | "letters", "nonwords", or "words" |
| `cell_id` | str | The actual letter or word tested |
| `cell_index` | int | Position in the assessment grid |
| `status` | str | "correct", "incorrect", or "incomplete" |
| `time_taken` | float | Time to respond (if available) |

**Use case:** Enables per-letter analysis — which specific letters does a child know/not know? Critical for validating whether session content matches child needs.

---

### 4. Participants — `TeampactParticipant`

**Source:** TeamPact participant/roster API
**Django model:** `api.models.TeampactParticipant`
**One row per:** child enrolled in the programme

| Field | Type | Description | Indexed |
|-------|------|-------------|---------|
| `participant_id` | PK | TeamPact participant ID | Yes |
| `name` | str | Full name | |
| `firstname` | str | First name | |
| `lastname` | str | Last name | |
| `gender` | str | Gender | |
| `year_born` | int | Birth year | |
| `parent_name` | str | Parent/guardian name | |
| `parent_mobile_number` | str | Parent phone | |
| `status` | str | Active/inactive | |
| `is_active` | bool | Currently active | |
| `is_archived` | bool | Archived | |
| `parental_consent` | bool | Consent received | |
| `org_id` | int | Organisation | Yes |
| `total_attendance` | int | Lifetime attendance count | |
| `sessions_available` | int | Total sessions available | |
| `classes` | JSON | **Array of class objects** `[{"id": 123, "name": "Group 1", "program_id": 456}]` | |
| `latest_session_date` | date | Most recent session | Yes |

**Key field:** `classes` JSON array links children to their groups and schools.

---

### 5. Mentor Visits — `MentorVisit2026`

**Source:** TeamPact survey 824 (Mentor Visit Tracker 2026)
**Django model:** `api.models.MentorVisit2026`
**One row per:** mentor visit observation

| Field | Type | Description | Indexed |
|-------|------|-------------|---------|
| `response_id` | PK | Unique visit ID | Yes |
| `user_name` | str | Mentor name (who submitted) | Yes |
| `mentor_name` | str | Mentor name | |
| `school_name` | str | School visited | Yes |
| `ea_name` | str | EA being observed | Yes |
| `grade` | str | Grade observed | |
| `class_name` | str | Group observed | |
| `response_start_at` | datetime | Visit start time | Yes |
| `response_end_at` | datetime | Visit end time | |
| `duration_minutes` | float | Visit duration | |
| `is_completed` | bool | Survey completed | |
| `grouping_correct` | str | Are groups correctly formed? | |
| `grouping_explanation` | str | Explanation of grouping assessment | |
| `letter_tracker_correct` | str | Is LKPT being used correctly? | |
| `comment_section_usage` | str | Are session comments being used? | |
| `teaching_correct_letters` | str | Teaching appropriate letters for level? | |
| `mastery_before_blending` | str | Ensuring mastery before blending? | |
| `learner_engagement` | str | Learner engagement level | |
| `ea_energy_preparation` | str | EA energy and preparation | |
| `session_quality` | str | Overall session quality rating | |
| `sessions_per_day` | str | Sessions per day observed | |
| `teacher_relationship` | str | EA-teacher relationship quality | |
| `trouble_getting_children` | str | Difficulty getting children for sessions? | |
| `additional_commentary` | str | Free-text mentor notes | |

**Rating scale:** Responses use "Excellent", "Good", "Average", "Poor", "Did not observe" and "Yes"/"No" formats.

---

### 6. School Summaries — `SchoolSummary2026`

**Source:** Pre-computed nightly by `compute_school_summaries_2026` management command
**Django model:** `api.models.SchoolSummary2026`
**One row per:** school

| Field | Type | Description |
|-------|------|-------------|
| `school_name` | PK | School name |
| `school_type` | str | "ECD" or "Primary School" |
| `ea_names` | JSON | Array of EA names at this school |
| `ea_count` | int | Number of EAs |
| `children_count` | int | Number of unique children |
| `groups_count` | int | Number of unique groups |
| `sessions_this_week` | int | Unique sessions in current week |
| `sessions_this_month` | int | Unique sessions in current month |
| `total_sessions` | int | Unique sessions since programme start |
| `avg_sessions_per_group_per_week` | float | **Key dosage metric** |
| `same_letter_group_flagged_eas` | int | EAs flagged for same-letter-groups |
| `moving_too_fast_flagged_eas` | int | EAs flagged for moving too fast |
| `latitude` | float | School GPS lat |
| `longitude` | float | School GPS lon |
| `computed_at` | datetime | When this summary was generated |

**Consumed by:** `/api/schools-2026/` endpoint → Next.js `/schools-2026` page

---

## Linking Keys

How to join data across tables:

| From | To | Join Key(s) |
|------|----|-------------|
| Session → School | `program_name` | `TeampactSession2026.program_name` = school name |
| Session → Group | `class_name` | `TeampactSession2026.class_name` = group name |
| Session → EA | `user_name` | `TeampactSession2026.user_name` = EA name |
| Session → Child | `participant_id` | `TeampactSession2026.participant_id` |
| Assessment → School | `program_name` | `Assessment2026.program_name` = school name |
| Assessment → Group | `class_name` | `Assessment2026.class_name` = group name |
| Assessment → EA | `collected_by` | `Assessment2026.collected_by` = EA name |
| Assessment → Child | `participant_id` | `Assessment2026.participant_id` |
| Assessment → Cells | `response_id` | `AssessmentCell2026.response` FK |
| Session ↔ Assessment | composite | Match on `program_name` + `class_name` + `user_name`/`collected_by`, filter by date |
| Participant → Groups | `classes` JSON | Parse `TeampactParticipant.classes` for `class_id` and `program_id` |
| Mentor Visit → EA | `ea_name` | `MentorVisit2026.ea_name` = EA name |
| Mentor Visit → School | `school_name` | `MentorVisit2026.school_name` = school name |

**Important:** Linking is name-based (string matching), not ID-based, for sessions ↔ assessments. This means EA name consistency matters.

---

## Calculated Metrics

### Dosage Metrics

| Metric | Formula | Aggregation | Purpose |
|--------|---------|-------------|---------|
| **Sessions per day** | Count distinct `session_id` for a given date | School, EA | Daily activity monitoring |
| **Sessions this week** | Count distinct `session_id` where `session_started_at` is in current ISO week | School, EA, Group | Weekly dosage tracking |
| **Sessions this month** | Count distinct `session_id` where `session_started_at` is in current calendar month | School, EA | Monthly dosage tracking |
| **Avg sessions per group per week** | `total_sessions / (groups_count * weeks_since_programme_start)` | School | **Primary dosage KPI.** Target: 3+ sessions/group/week |
| **Days active** | Count distinct dates with at least 1 session | EA | EA engagement metric |
| **Sessions per EA per day** | `daily_sessions / active_eas_that_day` | School | Workload balance |

**Dosage thresholds (for color-coding):**
- **Green (On Track):** avg >= 3 sessions/group/week
- **Yellow (Needs Attention):** avg 2-3 sessions/group/week
- **Red (Low Dosage):** avg < 2 sessions/group/week

---

### Progress Metrics

| Metric | Formula | Aggregation | Purpose |
|--------|---------|-------------|---------|
| **Letter progress index** | Index of rightmost letter in `letters_taught` within the [letter sequence](#letter-sequence--curriculum-constants) (0-25) | Group | Where a group is in the curriculum |
| **Letter progress %** | `(max_progress_index + 1) / 26 * 100` | Group | Percentage through letter curriculum |
| **Current letter** | Letter at `max_progress_index` in the sequence | Group | What the group is currently working on |
| **Letters per session** | Average of `num_letters_taught` across sessions | EA, Group | Session intensity |
| **New letters introduced** | Letters in current session NOT present in previous session | Group (per session) | Rate of new content |
| **Review letters** | Letters in current session that WERE in previous session | Group (per session) | Consolidation effort |
| **New-to-review ratio** | `new_letters / total_letters_in_session` | Group (per session) | Balance of new vs review (ideal: ~40% new, ~60% review) |
| **Sessions per letter** | Sessions a group spent on a given letter before moving on | Group | Mastery pace indicator |

---

### Assessment Metrics

| Metric | Formula | Aggregation | Purpose |
|--------|---------|-------------|---------|
| **EGRA score** | `letters_total_correct` | Child | Baseline/endline letter-sound knowledge |
| **EGRA improvement** | `endline_score - baseline_score` | Child | Individual learning gain |
| **Average EGRA score** | Mean of `letters_total_correct` | Group, School, Programme | Group/school performance |
| **Stop rule rate** | `% of assessments where stop_rule_reached = true` | School | How many children know < 5 letters |
| **Eligibility rate** | `% of children with EGRA >= 30` | School | Children not needing catch-up |
| **Cohort session range** | Bucketed session count before endline: 0-10, 11-20, 21-30, 31-40, 41+ | Child | Dose-response analysis |
| **Non-words score** | `nonwords_total_correct` | Child | Blending ability indicator |
| **Words score** | `words_total_correct` | Child | Reading ability indicator |

---

### Quality Metrics

| Metric | Formula | Aggregation | Purpose |
|--------|---------|-------------|---------|
| **Sequence adherence score** | `% of prerequisite letters covered before current letter` | EA, Group | How well the EA follows the letter sequence |
| **Review ratio** | `% of sessions with at least 1 review letter` | EA | Consolidation practice |
| **No-review percentage** | `% of session transitions with zero letter overlap` | EA, Group | Identifies pure-new-content sessions |
| **Note quality** | Binary: session_text is non-empty and > 10 characters | EA | Session documentation quality |
| **Mentor visit quality** | Aggregate of observation ratings | EA | External quality assessment |
| **Group differentiation score** | `unique_letter_levels / total_groups` for an EA | EA | Whether groups work at different levels |

---

## Quality & Data Integrity Flags

### Existing Flags

#### 1. Same Letter Groups
- **What it detects:** EA has 3+ groups all working on the exact same letter
- **Why it matters:** Violates programme rule that "all groups should NOT be doing the same letters." Groups are ability-based and should be at different levels
- **Calculation:** For each EA, get latest session per group → extract current letter → if 3+ groups share the same letter, flag
- **Threshold:** 3+ groups at same letter level
- **False positive risk:** High early in programme when many Grade R groups legitimately start at letter 'a'
- **Recommended action:** Mentor should verify group differentiation; EA may need regrouping support
- **DB field:** `SchoolSummary2026.same_letter_group_flagged_eas`

#### 2. Moving Too Fast
- **What it detects:** EA advances to new letters without reviewing previously taught letters
- **Why it matters:** Programme requires 2-3 review letters per session. Children need 5-10 exposures for mastery. No review = no consolidation
- **Calculation:** For each group, analyze consecutive session pairs → if `letters_taught` in session N has zero overlap with session N-1, that's a "no review" transition → if >70% of transitions are no-review, flag
- **Threshold:** >70% of session transitions have zero letter overlap
- **Scope:** Primarily applied to Grade R EAs
- **Recommended action:** EA needs coaching on including review letters; mentor should discuss session planning
- **DB field:** `SchoolSummary2026.moving_too_fast_flagged_eas`

---

### New Flags (To Implement)

#### 3. Ghost Groups
- **What it detects:** Groups that haven't had a session in 5+ weekdays
- **Why it matters:** Every group needs consistent, frequent sessions. A dormant group means children aren't receiving intervention
- **Calculation:** For each group (EA + class_name), get `max(session_started_at)` → if `today - max_date > 5 weekdays`, flag
- **Threshold:** 5+ weekdays without a session
- **Aggregation:** Group-level, rolled up to EA and school
- **Recommended action:** Investigate why — EA absence? Teacher blocking access? Group dissolved?
- **Severity:** High (direct impact on children's learning)

#### 4. Curriculum Gaps
- **What it detects:** Letters skipped in the prescribed sequence
- **Why it matters:** The letter sequence is carefully ordered. Skipping letters (e.g., jumping from "a, e, i" to "b" without "o, u") means the EA isn't following the curriculum
- **Calculation:** For each group, collect all letters taught across all sessions → map to sequence indices → identify gaps where expected intermediate letters were never taught
- **Threshold:** 1+ letters in the sequence skipped (never appeared in any session for that group) while later letters have been taught
- **Nuance:** Small gaps early may be acceptable if the group's baseline showed those letters already mastered. Cross-reference with baseline EGRA cell data
- **Recommended action:** Mentor should review whether skipped letters are already mastered (from baseline) or truly missed
- **Severity:** Medium (may indicate curriculum misunderstanding)

#### 5. Stagnation
- **What it detects:** Group hasn't progressed to new letters in 2+ weeks despite having sessions
- **Why it matters:** While review is essential, prolonged stagnation may indicate the EA doesn't know when to move on, or the group isn't achieving mastery
- **Calculation:** For each group, look at `max(progress_index)` over the last 10 weekdays vs. the prior 10 weekdays → if identical and session count > 4 in recent period, flag
- **Threshold:** Same max letter for 2+ weeks with 4+ sessions in that period
- **Nuance:** Some stagnation is expected and healthy (consolidation). This flag is for prolonged periods with no forward movement at all
- **Recommended action:** Mentor should check if children are struggling (need regrouping?) or if EA needs guidance on mastery criteria and when to introduce new letters
- **Severity:** Medium

#### 6. Unbalanced Groups
- **What it detects:** An EA's groups have very different session counts
- **Why it matters:** All groups deserve equal attention. If Group 1 has 25 sessions and Group 4 has 5, some children are being neglected
- **Calculation:** For each EA, get session count per group → calculate coefficient of variation (CV) or simply `max - min` → flag if spread is too large
- **Threshold:** If any group has < 50% of the sessions of the EA's most-active group (and min sessions > 0)
- **Recommended action:** Investigate scheduling — is the EA prioritizing certain groups? Are some groups harder to access?
- **Severity:** Medium-High

---

### Future Flag Candidates

These flags should be considered for future implementation as data quality and volume mature:

#### 7. Too Many New Letters
- **What it detects:** Session introduces >2 letters not seen in the group's previous session
- **Why it matters:** Programme rule: "no more than 2 new letters in a session"
- **Calculation:** Compare `letters_taught` in consecutive sessions → count letters in session N not in session N-1
- **Threshold:** >2 new letters in a single session
- **Source:** Programme Guide, Section "Recommended letter selection rule"

#### 8. Premature Blending
- **What it detects:** Group begins blending activities before establishing strong letter foundation
- **Why it matters:** Programme requires solid letter-sound knowledge before blending (CVs → 3-letter → 4-letter → complex consonants)
- **Calculation:** Detect blending-type content in sessions (multi-letter combinations, specific blending tags) while group's letter progress is still low
- **Threshold:** Blending content appearing when progress_index < ~15 (group hasn't covered 60% of letters)
- **Note:** Requires ability to distinguish "letters taught" from "blending content" in session tags

#### 9. Empty/Vague Notes
- **What it detects:** Sessions with empty, very short, or repetitive notes
- **Why it matters:** Good session notes should "identify who has mastered what, who needs work, and the next instructional step." Notes are part of implementation quality
- **Calculation:** Check `session_text` for null, empty, < 10 characters, or high similarity to the EA's other recent notes
- **Threshold:** > 50% of sessions in past 2 weeks have poor notes

#### 10. Attendance Drop
- **What it detects:** Significant decrease in attendance percentage over recent sessions for a group
- **Why it matters:** Declining attendance may indicate children losing interest, teacher conflicts, or scheduling issues
- **Calculation:** Compare average `attended_percentage` in last 5 sessions vs. prior 10 sessions
- **Threshold:** >20 percentage point drop

#### 11. Session Duration Anomaly
- **What it detects:** Sessions significantly shorter or longer than expected 20 minutes
- **Why it matters:** Programme sessions are designed for 20 minutes. Very short sessions may be incomplete; very long ones may indicate the EA is combining groups or doing something different
- **Calculation:** Check `session_duration` (in seconds)
- **Threshold:** < 10 minutes or > 40 minutes
- **Note:** `session_duration` reliability depends on EA clicking start/end at correct times

#### 12. Weekend/Off-Hours Sessions
- **What it detects:** Sessions logged on weekends or outside school hours
- **Why it matters:** Data quality flag — likely a data entry error or delayed sync
- **Calculation:** Check `session_started_at` day-of-week and hour
- **Threshold:** Saturday/Sunday, or before 7:00 or after 17:00

---

## Aggregation Levels

Data can be aggregated at these levels, from most granular to most aggregate:

```
Child (participant_id)
  └── Group (class_name within a school)
        └── EA (user_name)
              └── School (program_name)
                    └── Region (NMB vs East London, derived from school lists)
                          └── School Type (ECD vs Primary School)
                                └── Programme (all schools)
```

**Per-level key metrics:**

| Level | Key Metrics |
|-------|-------------|
| **Child** | EGRA score, attendance rate, sessions attended, group membership |
| **Group** | Letter progress index/%, sessions this week, current letter, flags |
| **EA** | Sessions/day, groups managed, children count, flags, mentor feedback |
| **School** | EA count, total children, avg sessions/group/week, dosage status, flagged EAs |
| **Region** | School count, avg dosage, assessment averages |
| **Programme** | Total schools, EAs, children, sessions, overall dosage, assessment impact |

---

## API Endpoints

### Existing Endpoints (Django)

| Endpoint | Method | Returns | Used By |
|----------|--------|---------|---------|
| `/api/schools-2026/` | GET | `SchoolSummary2026` array with summary stats | Next.js `/schools-2026` page |
| `/api/letter-progress/` | GET | Nested JSON: schools → EAs → groups with progress data | Streamlit (not yet Next.js) |
| `/api/sessions/` | GET | All `TeampactSession` records | Streamlit |
| `/api/explore-data/` | GET | HTML tables of EGRA data | Internal use |

### New Endpoints Needed

| Endpoint | Method | Returns | Purpose | Consumer |
|----------|--------|---------|---------|----------|
| `/api/programme-overview/` | GET | Aggregate KPIs: total schools, EAs, children, sessions, dosage, assessment summary, flag counts | PM Dashboard overview page | Next.js |
| `/api/sessions-activity/` | GET | Session time-series data with filters (school, EA, date range) | PM Dashboard sessions page | Next.js |
| `/api/letter-progress-2026/` | GET | Letter progress per group with filters (school, EA, grade, mentor) | PM Dashboard letter progress page | Next.js |
| `/api/quality-flags/` | GET | All flags (existing + new) with EA/school/group detail | PM Dashboard flags page | Next.js |
| `/api/assessments-summary/` | GET | Baseline/endline comparison data with cohort analysis | PM Dashboard assessments page | Next.js |
| `/api/mentor-visits-summary/` | GET | Aggregated mentor visit data with quality ratings | PM Dashboard mentor visits page | Next.js |
| `/api/ea/me/` | GET | EA's own data: groups, children, sessions, progress, flags, AI insights | EA "My Kids" page | Next.js |
| `/api/ea/me/groups/<group_id>/` | GET | Detailed group data: children, session history, letter progression | EA group detail page | Next.js |
| `/api/ea/me/insights/` | GET | Pre-computed AI-generated daily insights and recommendations | EA "My Kids" page | Next.js |

---

## Letter Sequence & Curriculum Constants

### Letter Sequence (26 letters in prescribed teaching order)

```
Index:  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25
Letter: a  e  i  o  u  b  l  m  k  p  s  h  z  n  d  y  f  w  v  x  g  t  q  r  c  j
```

**Vowels first** (a, e, i, o, u), then consonants in order of instructional priority.

### Blending Progression Stages

| Stage | Content | Prerequisite |
|-------|---------|-------------|
| A | 2-letter CVs (e.g., "ba", "le", "ke") | Strong letter-sound foundation |
| B | 3-letter combinations (e.g., "ewe", "yam", "bam") | Fluent CV reading |
| C | 4-letter words (e.g., "mama", "buza", "vula") | Comfortable 3-letter reading |
| D | Special isiXhosa 2-letter sounds (e.g., "th", "ph", "ny", "hl") | Successful basic word reading |

### Key Programme Constants

| Constant | Value | Source |
|----------|-------|--------|
| Target group size | 7 (ideal 6-8, allowed 5-9) | Programme Guide |
| Min blending threshold | EGRA >= 30 letters correct | Programme Guide |
| Session duration | 20 minutes | Programme Guide |
| Max new letters per session | 2 | Programme Guide |
| Review letters per session | 2-3 | Programme Guide |
| Total letters per session | 2-5 | Programme Guide |
| Target sessions per group per week | 3+ (daily ideal) | Implementation standard |
| Exposures for mastery | 5-10 sessions per letter | Programme Guide |
| EGRA time limit | 1 minute | Assessment protocol |
| EGRA stop rule | 5 consecutive incorrect → stop | Assessment protocol |

---

## School & Cohort Classification

### School Types
- **Primary School** — Grades R, 1, 2
- **ECD** — Early Childhood Development centres

### Cohorts (from `data/2026_cohorts.py`)
- **Treatment schools** — 51 schools where the programme is active
- **SEF schools** — 10 schools (Schools Education Fund partnership)
- **Control schools** — 61 schools for comparison (no intervention)

### Regional Classification
- **Nelson Mandela Bay (NMB)** schools
- **East London** schools

Derived from school name lookups in `data/mentor_schools.py`.

### Mentor Assignment
Each school is assigned a mentor, configured in `data/mentor_schools.py`. Mentors are responsible for quality oversight at their assigned schools.

---

## Future Data Capture (Mobile App)

Currently captured on paper but not digitally — critical gaps for future mobile app or PWA:

### Child-Level Mastery (LKPT Digitization)
| Field | Type | Description |
|-------|------|-------------|
| `child_id` | FK | Link to participant |
| `letter` | str | Letter being tracked |
| `lowercase_mastered` | bool | Can identify lowercase sound |
| `uppercase_mastered` | bool | Can identify uppercase sound |
| `mastered_at` | date | When mastery was confirmed |
| `mastered_in_session` | FK | Which session confirmed mastery |
| `exposure_count` | int | Number of sessions this letter was taught before mastery |

### Blending Tracker Digitization
| Field | Type | Description |
|-------|------|-------------|
| `child_id` | FK | Link to participant |
| `stage` | str | A (2-letter), B (3-letter), C (4-letter), D (complex) |
| `item` | str | Specific CV/word being tracked |
| `can_read` | bool | Can the child read this fluently |
| `assessed_at` | date | When last checked |

### Session Enhancement Fields
| Field | Type | Description |
|-------|------|-------------|
| `game_used` | str | Which game/activity was used (flashcards, board game, memory, etc.) |
| `materials_used` | list | Materials available during session |
| `session_photo` | file | Photo of teaching setup or LKPT |
| `ea_self_rating` | int | EA's own assessment of session quality (1-5) |
| `individual_struggles` | list | Children who struggled today (names + letters) |
| `individual_mastery` | list | Children who showed mastery today (names + letters) |

---

## Appendix: Streamlit Pages Cross-Reference

For tracking which Streamlit pages have been migrated to Next.js:

| Streamlit Page | Status | Next.js Equivalent | Priority |
|----------------|--------|--------------------|----------|
| Sessions 2026 | To migrate | `/pm/sessions` | Phase 2 |
| Baseline 2026 | To migrate | `/pm/assessments` | Phase 3 |
| ECD Baseline 2026 | To migrate | `/pm/assessments` (combined) | Phase 3 |
| Letter Progress 2026 | To migrate | `/pm/letter-progress` | Phase 2 |
| Letter Progress Detailed 2026 | To migrate | `/pm/letter-progress` (drill-down) | Phase 2 |
| Flag: Same Letter Groups | To migrate | `/pm/quality-flags` | Phase 2 |
| Flag: Moving Too Fast | To migrate | `/pm/quality-flags` | Phase 2 |
| Mentor Visits 2026 | To migrate | `/pm/mentor-visits` | Phase 3 |
| Session Quality Review | To migrate | `/pm/quality-flags` (enhanced) | Phase 2 |
