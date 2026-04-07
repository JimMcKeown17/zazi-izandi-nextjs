# Letter Alignment & Language-Aware Flags — Design Spec

**Date:** 2026-04-07
**Status:** Draft
**Author:** Jim + Claude

## Context

Education assistants (EAs) teach children in small groups, following a prescribed letter order. Each child has a unique baseline — some letters are already mastered from assessment, others still need to be learned. Currently, there is no mechanism to verify whether an EA is teaching the *right* letters for each child. The existing `curriculum_gaps` flag only checks whether letters were skipped in the teaching sequence (session data only, no assessment data), and it applies a single hardcoded isiXhosa letter order to all groups regardless of language.

This design introduces:
1. **Participant-level linking** between sessions and assessments via `participant_id`
2. **Per-child letter alignment analysis** — comparing assessment-mastered letters to session-taught letters
3. **Two new assessment-informed flags** — `teaching_known` and `skipping_needed`
4. **Language-aware letter sequences** across the entire system (fixing existing flags too)
5. **A dedicated `/pm/letter-alignment` page** with group heatmap and child drill-down

## Pedagogical Letter Orders

Three languages, each with a different teaching sequence:

| Language | Length | Sequence |
|----------|--------|----------|
| isiXhosa | 26 | a, e, i, o, u, b, l, m, k, p, s, h, z, n, d, y, f, w, v, x, g, t, q, r, c, j |
| English | 26 | a, m, s, t, n, i, p, c, f, d, h, o, r, b, l, k, e, g, w, v, u, j, y, z, q, x |
| Afrikaans | 22 | o, i, a, u, e, s, n, m, d, l, t, k, f, b, p, y, r, v, w, h, g, j |

**Key constraint:** Sequences have different lengths. All progress calculations must use `len(sequence)` rather than hardcoding 26.

---

## Part 1: Language-Aware Letter Constants (Django)

### New shared module: `api/letter_constants.py`

Single source of truth replacing 6 hardcoded copies across the codebase.

```python
LETTER_SEQUENCES = {
    'isiXhosa':  ['a','e','i','o','u','b','l','m','k','p',
                  's','h','z','n','d','y','f','w','v','x',
                  'g','t','q','r','c','j'],
    'English':   ['a','m','s','t','n','i','p','c','f','d',
                  'h','o','r','b','l','k','e','g','w','v',
                  'u','j','y','z','q','x'],
    'Afrikaans': ['o','i','a','u','e','s','n','m','d','l',
                  't','k','f','b','p','y','r','v','w','h',
                  'g','j'],
}

LETTER_INDICES = {
    lang: {letter: i for i, letter in enumerate(seq)}
    for lang, seq in LETTER_SEQUENCES.items()
}

DEFAULT_LANGUAGE = 'isiXhosa'

def get_sequence(language: str) -> list:
    return LETTER_SEQUENCES.get(language, LETTER_SEQUENCES[DEFAULT_LANGUAGE])

def get_index(language: str) -> dict:
    return LETTER_INDICES.get(language, LETTER_INDICES[DEFAULT_LANGUAGE])
```

### Files to update (remove hardcoded sequences, import from `letter_constants`):

| File | Current lines | What changes |
|------|--------------|--------------|
| `compute_group_summaries_2026.py` | 24-28 | Import from `letter_constants`, pass `language` to all flag functions |
| `compute_school_summaries_2026.py` | 22-27 | Import from `letter_constants`, pass `language` |
| `calculate_assessment_cohorts.py` | 26-30 | Import from `letter_constants` |
| `views.py` | 78-80, 944-948 | Import from `letter_constants` (two separate hardcoded copies) |

---

## Part 2: Language Field on GroupSummary2026

### Model change

Add `language` field to `GroupSummary2026`:

```python
language = models.CharField(max_length=50, blank=True, default='',
                            help_text="Teaching language (isiXhosa/English/Afrikaans)")
```

### Language determination (in `compute_group_summaries_2026.py`)

During the nightly compute, for each group `(program_name, class_name)`:
1. Query `Assessment2026` for all assessments matching that `(program_name, class_name)`
2. Take the most common `Assessment2026.language` value (majority vote)
3. Store on `GroupSummary2026.language`
4. Fall back to `DEFAULT_LANGUAGE` ('isiXhosa') if no assessments found

**Source of truth:** `Assessment2026.language` is derived from survey ID (815→isiXhosa, 816→Afrikaans, 817→English) — this is authoritative.

### Existing flag functions updated to accept language

All flag functions gain a `language` parameter and use `get_sequence(language)` / `get_index(language)`:

- `_flag_curriculum_gaps(group_sessions, language)` — renamed to "Not Following Letter Order" in UI
- `_flag_moving_too_fast(group_sessions, language)`
- `_flag_stagnation(group_sessions, language)`
- `_flag_same_letter_groups(ea_groups, language)`
- `_max_progress_index(letters, language)`
- `_letter_progress_from_latest(sessions, language)`

Progress percentage calculation changes from `(index + 1) / 26 * 100` to `(index + 1) / len(get_sequence(language)) * 100`.

---

## Part 3: Participant ID Linking & Child Letter Alignment

### New model: `ChildLetterAlignment2026`

One row per child (by `participant_id`), recomputed nightly.

| Field | Type | Purpose |
|-------|------|---------|
| `participant_id` | BigIntegerField (PK) | Links sessions and assessments |
| `program_name` | CharField | School name |
| `class_name` | CharField | Group name |
| `language` | CharField | From assessment |
| `assessment_response_id` | CharField | Which assessment was used |
| `assessment_date` | DateField | When the assessment happened |
| `letters_mastered` | JSONField (list) | Letters child got correct on assessment |
| `letters_needed` | JSONField (list) | All remaining letters to learn (pedagogical order) |
| `letters_taught` | JSONField (list) | All letters taught in sessions for this child's group |
| `current_teaching_index` | IntegerField | Furthest letter position in group's sessions |
| `letters_skipped` | JSONField (list) | Needed letters before current teaching position that were never taught |
| `teaching_known_letters` | JSONField (list) | Taught letters that child already mastered |
| `alignment_score` | FloatField | % of taught letters that are actually needed (0-100) |
| `flag_skipping_needed` | BooleanField | True if `len(letters_skipped) > threshold` |
| `flag_teaching_known` | BooleanField | True if `len(teaching_known_letters) > threshold` |
| `computed_at` | DateTimeField | Timestamp of last computation |

### Assessment mastery calculation (masi-app logic)

For each child with a `participant_id`:
1. Find the latest NMB assessment (survey 815/816/817) for that `participant_id`
   - Cast: session `participant_id` (BigInteger) matched to assessment `participant_id` (CharField) via `str()`
2. Get all `AssessmentCell2026` rows for that assessment where `question_type='letters'`
3. Determine `last_letter_attempted` index from assessment cells
4. For each of the N pedagogical letters (language-specific):
   - Find all positions in the EGRA 60-letter set where this letter appears
   - Only consider positions up to `last_letter_attempted` index
   - Letter is **mastered** if ALL attempted instances have `status='correct'`

### Alignment computation

```
letters_needed = [l for l in pedagogical_order if l not in letters_mastered]
letters_taught = set of all letters taught in sessions for this group
current_teaching_index = max position in pedagogical_order among letters_taught
letters_skipped = [l for l in letters_needed
                   if pedagogical_index(l) < current_teaching_index
                   and l not in letters_taught]
teaching_known_letters = [l for l in letters_taught if l in letters_mastered]
alignment_score = len(letters_taught ∩ letters_needed) / len(letters_taught) * 100
```

### EGRA letter sets

The 60-letter assessment grids are language-specific. These are already defined in the masi app (`src/constants/egraConstants.js`) and must be replicated in Django for the mastery calculation:

- **isiXhosa 60-letter set:** `['l','a','m','e','s','n','l','s','m','e','y','i','k','n','d','h','f','u','h','v','f','y','c','i','t','k','d','z','f','d','t','z','o','j','p','r','c','w','p','o','w','a','e','x','q','l','g','o','u','z','x','r','v','b','j','b','q','u','r','g']`
- **English 60-letter set:** `['l','a','m','E','p','n','L','s','o','e','Y','i','K','N','d','H','f','U','b','v','F','y','C','I','T','k','D','Z','f','d','t','z','O','J','P','r','c','W','p','o','w','A','E','x','Q','I','g','O','U','z','X','r','V','B','j','h','q','u','R','G']`
- **Afrikaans 60-letter set:** `['I','a','m','E','p','n','L','s','o','e','Y','i','K','N','d','H','f','U','h','v','F','y','d','I','T','k','D','M','f','d','t','I','O','J','P','r','B','W','p','o','w','A','E','h','S','I','g','O','U','K','b','r','V','B','j','b','e','u','R','G']`

**Note:** The EGRA sets are documented for reference but are **not a computational dependency**. Django already has `AssessmentCell2026` with per-cell `cell_id` and `status` — mastery is computed directly from those records without needing the grid layout. Mastery comparison normalizes to lowercase.

### New management command: `compute_letter_alignment_2026.py`

Runs nightly after `compute_group_summaries_2026`. Steps:
1. Get all distinct `participant_id` values from `TeampactSession2026`
2. For each, find matching `Assessment2026` records (cast int→str for join)
3. Compute mastery using masi-app logic
4. Compute alignment fields
5. Bulk upsert into `ChildLetterAlignment2026`

### Group-level flag aggregation

Two new boolean fields on `GroupSummary2026`:

| Field | Triggers when |
|-------|--------------|
| `flag_teaching_known` | ≥50% of assessed children in the group have `len(teaching_known_letters) > 2` |
| `flag_skipping_needed` | ≥50% of assessed children in the group have `len(letters_skipped) > 1` |

Additional aggregate fields on `GroupSummary2026`:

| Field | Type | Purpose |
|-------|------|---------|
| `alignment_avg_score` | FloatField | Average alignment score across assessed children |
| `children_with_skips` | IntegerField | Count of children with skipped letters |
| `children_assessed` | IntegerField | Count of children with linked assessments |
| `children_total` | IntegerField | Total distinct children in group sessions |

### Rename existing flag

`flag_curriculum_gaps` → keep the field name for backwards compatibility, but rename in UI to **"Not Following Letter Order"**. Description: "EA skipped 2+ letters in the prescribed teaching sequence."

---

## Part 4: New API Endpoint

### `GET /api/letter-alignment/`

Query params: `?school=X&group=Y` (both optional, filters results)

Response shape:
```json
{
  "group_summary": {
    "program_name": "School ABC",
    "class_name": "Grade 1 Group A",
    "language": "isiXhosa",
    "letter_sequence": ["a","e","i","o","u","b",...],
    "letters_taught": ["a","e","i","o","u","b","l"],
    "current_teaching_index": 6,
    "children_assessed": 8,
    "children_total": 10,
    "alignment_avg_score": 72.5,
    "flag_teaching_known": false,
    "flag_skipping_needed": true
  },
  "children": [
    {
      "participant_id": 12345,
      "assessment_date": "2026-03-15",
      "letters_mastered": ["a","e","i"],
      "letters_needed": ["o","u","b","l","m",...],
      "letters_taught": ["a","e","i","o","u","b","l"],
      "letters_skipped": [],
      "teaching_known_letters": ["a","e","i"],
      "alignment_score": 57.1,
      "flag_skipping_needed": false,
      "flag_teaching_known": true
    }
  ]
}
```

### Updated existing endpoints

`/api/groups-2026/` response gains:
- `language` field per group
- `letter_sequence` array per group (or globally if all same language)
- `flag_teaching_known` and `flag_skipping_needed` booleans
- `alignment_avg_score`, `children_with_skips`, `children_assessed`, `children_total`

`/api/flag-evidence/` response gains:
- `language` field
- `letter_sequence` array (language-specific)

---

## Part 5: Frontend — New `/pm/letter-alignment` Page

### Page structure

1. **Programme context bar** (existing shared component — cohort selector, week, data freshness)
2. **Summary KPIs** (4 cards):
   - Groups Assessed (count / total, % coverage)
   - Avg Alignment (% across assessed children)
   - Teaching Known (count of flagged groups)
   - Skipping Needed (count of flagged groups)
3. **Groups table** (sortable, filterable):
   - Columns: School, Group, EA, Language (badge), Children, Assessed, Alignment %, Flags
   - Rows highlighted: red tint for `skipping_needed`, amber for `teaching_known`
   - Click row → expand child drill-down
4. **Child drill-down** (expanded below clicked row or slide-in panel):
   - Group heatmap: rows = children, columns = letters in language-specific teaching order
   - Five cell states:
     - **Orange** = mastered on assessment
     - **Green** = being taught (needed by child)
     - **Gray** = not yet reached by group
     - **Red** = skipped (child needs this, EA moved past it)
     - **Amber bordered** = teaching known (child already mastered, still being taught)
   - Vertical line marker at group's current teaching position
   - Legend explaining all states
   - Explanatory text box

### New files

| File | Purpose |
|------|---------|
| `app/pm/letter-alignment/page.tsx` | Server component page, fetches data via ISR |
| `components/pm/letter-alignment/alignment-kpis.tsx` | Summary KPI cards |
| `components/pm/letter-alignment/alignment-group-table.tsx` | Sortable group table |
| `components/pm/letter-alignment/alignment-heatmap.tsx` | Child × letter heatmap grid |

### Sidebar entry

Add "Letter Alignment" to `components/pm/layout/pm-sidebar.tsx` with an appropriate icon (e.g., `AlignLeft` or `Grid3X3` from Lucide).

---

## Part 6: Frontend — Language Fixes to Existing Pages

### `lib/pm/constants.ts`

Replace single `LETTER_SEQUENCE` with language-keyed lookup:

```typescript
export const LETTER_SEQUENCES: Record<string, readonly string[]> = {
  isiXhosa: ["a","e","i","o","u","b","l","m","k","p","s","h","z","n","d","y","f","w","v","x","g","t","q","r","c","j"],
  English: ["a","m","s","t","n","i","p","c","f","d","h","o","r","b","l","k","e","g","w","v","u","j","y","z","q","x"],
  Afrikaans: ["o","i","a","u","e","s","n","m","d","l","t","k","f","b","p","y","r","v","w","h","g","j"],
} as const;

export const DEFAULT_LANGUAGE = "isiXhosa";
```

Keep a `LETTER_SEQUENCE` export as `LETTER_SEQUENCES[DEFAULT_LANGUAGE]` for backwards compatibility during migration.

### `lib/pm/types.ts`

Add to `GroupSummary` interface:
- `language: string`

Add to `FlagEvidenceResponse`:
- `language: string`

New interface `ChildLetterAlignment` for the alignment API response.

### Files that import `LETTER_SEQUENCE`:

| File | Change |
|------|--------|
| `components/pm/letter-progress/progress-overview.tsx` | Use `group.language` to select sequence; render language-specific letter grid |
| `components/pm/quality-flags/flag-evidence-panel.tsx` | Use `evidence.letter_sequence` from API response instead of imported constant; replace hardcoded "26" with `evidence.letter_sequence.length` |
| `app/pm/letter-progress/page.tsx` | Remove hardcoded "26-letter sequence (a, e, i, ...)" text; make dynamic or remove |

---

## Part 7: Flag System Summary

After this work, the quality flags page shows 7 flags:

| Flag | Label (UI) | Level | Data Source | Trigger |
|------|-----------|-------|-------------|---------|
| `flag_curriculum_gaps` | Not Following Letter Order | Group | Sessions | 2+ letters skipped in language-specific sequence |
| `flag_moving_too_fast` | Moving Too Fast | Group | Sessions | >70% transitions with zero letter overlap |
| `flag_stagnation` | Stagnation | Group | Sessions | Same max letter for 2+ weeks with 4+ sessions |
| `flag_same_letter_group` | Same Letter Groups | Group (per EA) | Sessions | EA has 3+ groups at same progress index |
| `flag_ghost_group` | Ghost Group | Group | Sessions | No session in 5+ weekdays |
| `flag_teaching_known` | Teaching Known Letters | Child → Group | Sessions + Assessments | ≥50% of assessed children have >2 known letters being taught |
| `flag_skipping_needed` | Skipping Needed Letters | Child → Group | Sessions + Assessments | ≥50% of assessed children have >1 needed letter skipped |

All flags using letter order (first 4) become language-aware.

---

## Verification Plan

### Backend
1. Run `compute_group_summaries_2026` with language support — verify `GroupSummary2026.language` is populated correctly for known isiXhosa, English, and Afrikaans groups
2. Verify existing flags produce same results for isiXhosa groups (regression) and different/correct results for English/Afrikaans groups
3. Run `compute_letter_alignment_2026` — verify `ChildLetterAlignment2026` records are created with correct mastery calculations
4. Spot-check a few children manually: query their assessment cells, manually compute mastery, compare to stored result
5. Hit `/api/letter-alignment/?school=X&group=Y` and verify response shape matches spec
6. Hit `/api/groups-2026/` and verify `language`, new flag fields, and aggregate fields are present

### Frontend
1. Navigate to `/pm/letter-progress` — verify letter sequence grid renders language-specific order per group
2. Navigate to `/pm/quality-flags` — verify "Not Following Letter Order" label, new flag cards for Teaching Known and Skipping Needed
3. Click a flagged item — verify evidence panel uses language-specific sequence (no hardcoded "of 26")
4. Navigate to `/pm/letter-alignment` — verify KPIs, group table, and child heatmap render correctly
5. Click a group row — verify child drill-down shows correct 5-state heatmap
6. Test with an Afrikaans group — verify 22-letter sequence renders correctly (not 26)

### Data integrity
1. Verify participant_id type casting works: pick a known child, confirm their session participant_id matches their assessment participant_id after casting
2. Verify children without assessments are excluded from alignment (not erroneously flagged)
3. Verify ECD children (no participant_id) are excluded gracefully
