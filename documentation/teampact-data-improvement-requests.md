# TeamPact Data Improvement Requests

**Date:** 2026-04-07
**Context:** These requests come from building the Zazi iZandi PM Dashboard and Letter Alignment features. Each item describes a current workaround in our codebase that could be eliminated with a structured field from the TeamPact API.

---

## Critical (blocking features)

### 1. Add `participant_id` to ECD survey (805)

**Current workaround:** ECD children have no participant ID in their assessment responses. We cannot link their assessments to session data at all — 667+ children are invisible to our letter alignment analysis.

**What we need:** The same `participant_id` field that NMB surveys (815/816/817) already return.

**Impact:** Enables per-child tracking for ~20 ECD schools. Without this, ECD children are excluded from all assessment-linked features.

---

### 2. Add `grade` field to group/class objects

**Current workaround:** We parse grade from `class_name` strings using 12+ pattern-matching rules:
- "Grade 1", "Gr 1", "Grade R", "Gr R"
- Afrikaans codes: "-RA-", "-RB-"
- Numeric patterns: "1A", "1B", "2A", "1 D"
- ECD patterns: "PreR", "Pre-R", "Pre R"

If a school uses an unexpected naming convention, grade detection fails silently. We then fall back to matching the EA's assessment data, and finally to a hardcoded ECD school list.

**What we need:** A structured `grade` or `grade_level` field on group/class objects. Values: `"PreR"`, `"GradeR"`, `"Grade1"`, `"Grade2"`, `"Grade3"`.

**Impact:** Removes the most fragile code in our backend. Grade is used for filtering, charting, and KPI breakdowns.

---

### 3. Add `school_type` or `program_type` to program objects

**Current workaround:** We maintain a hardcoded list of ~30 ECD school names in our code:
```python
ECD_LIST = {
    "Bavumeleni ECD", "Emmanuel Day Care", "Green Apple ECD",
    "Ilitha Lethu Day Care", "Kids College ECD", ...
}
```
Any new ECD school requires a code change and redeployment.

**What we need:** A `program_type` field on program objects. Values: `"primary_school"`, `"ecd"`, `"training"`, `"demo"`.

**Impact:** Dynamic school classification. No manual code updates when schools are added or renamed.

---

## High (eliminating fragile workarounds)

### 4. Include `class_name` and `program_name` in survey response endpoints

**Current workaround:** NMB survey responses (`/surveys/{id}/responses`) only return `group_id` as a JSON string (e.g., `"[59979]"`). We must:
1. Parse the JSON string to extract the integer ID
2. Make a separate API call to `GET /groups/{id}` for each unique group
3. Cache results to avoid redundant calls

This adds significant time to the nightly sync and creates a dependency on the groups endpoint.

**What we need:** Include `class_name` and `program_name` directly in survey response records (like ECD surveys already do for some fields).

**Impact:** Eliminates hundreds of secondary API calls during sync. Simpler, faster data pipeline.

---

### 5. Add `session_type` field to session attendance records

**Current workaround:** We exclude non-teaching sessions by keyword-matching the `class_name`:
```python
.exclude(class_name__icontains='check-in')
.exclude(class_name__icontains='check in')
```
If naming conventions change (e.g., "roll call", "attendance", "checkin"), administrative sessions leak into teaching data.

**What we need:** A `session_type` field. Values: `"teaching"`, `"check_in"`, `"assessment"`, `"admin"`.

**Impact:** Clean separation of teaching vs non-teaching sessions without fragile string matching.

---

### 6. Add `teaching_language` to group objects

**Current workaround:** We infer each group's language by:
1. Getting all children's `participant_id`s from sessions
2. Matching each to their assessment record
3. Looking up which survey they completed (815=isiXhosa, 816=Afrikaans, 817=English)
4. Taking a majority vote per group

Groups with no assessed children default to isiXhosa. ECD groups always default because they have no participant IDs.

**What we need:** A `teaching_language` field on group/class objects. Values: `"isiXhosa"`, `"English"`, `"Afrikaans"`.

**Impact:** Direct language assignment. Correct letter sequences for all groups without inference. Critical for the 3 different pedagogical letter orders.

---

### 7. Add `subtest_type` to assessment answer objects

**Current workaround:** Assessment responses don't label which subtest (Letters, Nonwords, Words) each answer belongs to. We infer from:
1. Question label substring matching ("letter" → letters, "non" → nonwords)
2. Cell count heuristic (60 cells = Letters)

If question labels change or cell counts differ, classification breaks silently.

**What we need:** A `subtest_type` field on answer objects. Values: `"letters"`, `"nonwords"`, `"words"`.

**Impact:** Reliable subtest identification. Removes heuristic-based guessing.

---

## Medium (consistency & polish)

### 8. Standardize `participant_id` type across all endpoints

**Current state:** Session API returns `participant_id` as integer. Assessment API returns it as string (or sometimes integer). Every database join requires type casting.

**What we need:** Consistent type (integer preferred) across all endpoints.

---

### 9. Return `user_id` in assessment responses (alongside `user_name`)

**Current state:** We match Education Assistants by name string only. Typos, name changes, or abbreviations (e.g., "Nozuko M" vs "Nozuko Mancayi") create duplicate EA profiles.

**What we need:** A `user_id` field in assessment responses that matches the session `user_id`.

---

### 10. Add `is_active` flag to programs

**Current state:** We hardcode `{"Masinyusane"}` to exclude the training/demo program. Any new non-school program requires a code change.

**What we need:** An `is_active` or `program_status` flag to distinguish production schools from training/demo programs.

---

### 11. Provide canonical EA master list with user_id + normalized name

**Current state:** No deduplication for EA name variants across endpoints. Slight spelling differences create phantom EAs in our analytics.

**What we need:** A user/EA endpoint with canonical names and stable IDs.

---

## Summary

7 of the 11 issues stem from **missing structured metadata** in API responses (grade, school_type, subtest_type, session_type, teaching_language, program_type, user_id). Adding these fields would eliminate ~70% of our workaround code and significantly improve data reliability.

The single highest-impact change would be **adding `participant_id` to ECD survey responses** — this unblocks an entire population of children from our analysis.
