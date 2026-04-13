# Letter Mastery: Data Model, Interpretation, and Language Guidance

> **Audience:** anyone building, reviewing, or interpreting the EA "My Kids" page, the PM letter-alignment page, or any AI prompt that uses Zazi iZandi mastery data. Also anyone writing copy that will be shown to Education Assistants (EAs), mentors, or funders.
>
> **Terminology note:** In the Zazi iZandi programme we call our frontline workers **Education Assistants (EAs)**. In other Masinyusane programmes the same role is called a **Literacy Coach (LC)**. If you encounter "LC" in conversation notes, memory, or stakeholder communication, it is the same person as an EA in this codebase. The code and UI use "EA" consistently.
>
> **Status:** Phase 0 (2026-04). Will be updated when child-level mastery capture ships (see "Future" section).

---

## TL;DR

There are two completely different categories of signals in this data, and they have different rules:

**Category A — Curriculum coverage signals** (the strongest, safest coaching signals):

1. **Curriculum coverage is fully observable from session data alone.** What letters did the EA teach? In what order? Did they jump past required letters in the programme sequence? These are facts about EA teaching behavior, NOT claims about child knowledge. They are safe to surface verbatim and they are the most actionable coaching signals we have.
2. **The strongest curriculum signals are `letters_skipped`, `flag_skipping_needed`, and `flag_curriculum_gaps`.** They tell us "the EA moved past these letters in the programme order without ever teaching them." This is a real, evidence-based pedagogical concern.

**Category B — Baseline mastery signals** (use carefully, past-tense framing only):

3. **"Mastery" in our database is a single-assessment snapshot**, not a live indicator of what a child currently knows. There is no way — today — for an EA to report "Sipho mastered letter 'i' in today's session."
4. **Any claim that "children are struggling" or "children aren't learning" cannot be drawn from this data**, because we don't have a current measurement. Mastery data is frozen at the moment of the baseline assessment.
5. **`teaching_known_letters` is a minor secondary signal** — letters a child already knew at baseline that the EA is still teaching. This flags wasted instructional time, but it's a weak concern: drilling known letters can support automaticity and is largely harmless if it's only here and there. It is far less actionable than curriculum gaps. Surface it as low-priority coaching, not as a primary concern.
6. **UI copy and AI prompts must be careful about the word "mastered."** Prefer phrasings that make the temporal scope clear: "known at baseline", "entered knowing", "baseline assessment showed…".

**Future:**

7. **When child-level mastery capture ships (future mobile app / PWA)**, the Category B constraints lift. Curriculum coverage signals (Category A) are unchanged.

---

## The shape of the data

### Where mastery lives

Mastery data comes from **TeamPact survey responses** — specifically the EGRA-style baseline assessment each child takes. The 2026 surveys are:

- Survey **815** — IsiXhosa baseline
- Survey **816** — Afrikaans baseline
- Survey **817** — English baseline
- Survey **805** — ECD baseline

Each survey contains a letter identification question. For each cell/letter, the response records whether the child got it correct, incorrect, or didn't reach it (stopped by stop rule or timer). A child "mastered" a letter if every attempt on that letter is `correct` (the masi-app convention — see `compute_letter_alignment_2026`).

### Where it's stored

`ChildLetterAlignment2026` (Django model in the backend repo — see `api/models.py`):

| Field | What it is |
|---|---|
| `participant_id` | Primary key — TeamPact learner ID |
| `program_name`, `class_name` | The group this child belongs to (composite key — no `class_id` here) |
| `language` | From their assessment (isiXhosa / English / Afrikaans) |
| `assessment_response_id` | Which survey response was used |
| `assessment_date` | When that assessment was done |
| **`letters_mastered`** | JSON list — letters the child got correct on their assessment |
| `letters_taught` | JSON list — letters that have been taught in this child's group's sessions |
| `letters_needed` | JSON list — letters the child still needs to learn (programme-order) |
| `letters_skipped` | JSON list — needed letters before the EA's current position that were never taught |
| **`teaching_known_letters`** | JSON list — taught letters the child already knew at baseline (waste) |
| `alignment_score` | % of taught letters that were genuinely needed (0–100) |
| `flag_skipping_needed` | Boolean — child has gaps in the curriculum coverage |
| `flag_teaching_known` | Boolean — EA is drilling letters this child already knew |

### What's recomputed, and when

`compute_letter_alignment_2026` runs **nightly** and rebuilds this table from fresh TeamPact data. Each nightly run re-reads the assessments and re-reads the session history.

**Important:** the *assessment* data doesn't change from night to night (unless a new assessment is taken). The *session* data does — every time the EA logs a new session, the set of `letters_taught` grows. So nightly recomputes capture "what letters has this EA now taught, relative to what this child already knew at baseline." **The baseline never moves.**

### Where the group-level view comes from

The EA "My Kids" page aggregates per-child data to per-group numbers via `api/ea_mastery.py :: compute_group_letter_mastery()`:

- For each letter in the group's programme sequence, count **how many children in the group had `letters_mastered` containing that letter** → this is `children_mastered`.
- For each letter, count **how many unique sessions taught that letter** → this is `sessions_taught`.
- Letters with neither mastery nor sessions are omitted entirely from the result.

This is the data that drives the group-detail visualization (the "average letter tracker" / "stepping stones" path).

---

## How to interpret the four per-letter cells (Category B view)

This section is about reading **a single letter cell** on the mastery path: the combination of `children_mastered` and `sessions_taught` for one letter. It is the **per-letter mastery view** and falls under Category B (baseline mastery signals).

For the **curriculum coverage view** (Category A — comparing the EA's session order against the programme order, surfacing skipped letters), see § "Two interpretable signals" below. The two views answer different questions and complement each other.

Per-letter mastery patterns:

| Pattern | Example | What we can say (accurately) | What we CANNOT say | Action? |
|---|---|---|---|---|
| **High `children_mastered`, 0 sessions** | `e`: 6 of 7 knew at baseline, 0 sessions taught | The EA correctly skipped a letter the group already knew. Good pedagogy. | — | ✅ None — this is the desired behaviour |
| **High `children_mastered`, many sessions** | `a`: 6 of 7 knew at baseline, 2 sessions taught | Some children are being drilled on letters they already knew. This is the `teaching_known_letters` signal. | Whether *all* children in the sessions knew the letter. Only those flagged at the child level were "known." | ℹ️ Minor: "Most of this group already knew 'a' at baseline — you can move faster on it for these children if you'd like." Low-priority secondary observation, not a primary coaching concern. |
| **Low `children_mastered`, many sessions** | `i`: 0 of 7 knew at baseline, 3 sessions taught | The EA is teaching this letter and, at baseline, no child knew it. | **"Children aren't learning"** — we have no post-assessment data. Children may have learned it; may be in mid-instruction; may genuinely be struggling. We cannot tell these apart from this data. | ❌ None — insufficient information to coach on this |
| **Low `children_mastered`, 0 sessions, still ahead in the sequence** | `q`: 0 of 7, 0 sessions, programme says it comes later | Normal curriculum progression. Letter is in the "not yet reached" part of the programme. | — | ✅ None — this is neutral |

The mistake I want us to avoid is **treating pattern 3 as if it were a per-letter coaching signal**. It looks alarming ("0 of 7 children know 'i' after 3 sessions") but the data doesn't support the alarm — we simply have no idea how many children currently know 'i'. Three sessions of instruction may have taken them from 0/7 to 6/7 and the assessment can't see that.

**However**, pattern 3 across MANY letters in a row, OR a letter at pattern 4 ("low mastered, 0 sessions") that should have been taught by now per the programme order, IS a curriculum gap signal — the cross-cell view is where the real coaching opportunity lives. See the next section.

### Two interpretable signals

There are two signals from the alignment data that we can surface in coaching: a strong one based on curriculum coverage, and a weaker one based on baseline mastery. Both are factual; neither requires inferring what a child currently knows.

#### 1. Curriculum coverage (the strongest signal)

**Fields:** `letters_skipped` (per-child), `flag_skipping_needed` (per-child), `flag_curriculum_gaps` (group-level).

The Zazi iZandi programme defines a strict pedagogical letter sequence per language (`api/letter_constants.py`). The expectation is that EAs teach letters left-to-right in this sequence, only skipping a letter when ≥80–90% of the group already knew it at baseline (a "skip with cause"). When session data shows the EA has moved past letters in the sequence without ever teaching them, that's a curriculum gap.

**This is observable directly from session data.** It's a fact about teacher behavior measured against the programme's own rules. No inference about child knowledge is involved. It is fully safe to surface verbatim in EA-facing and PM-facing UIs, and it is the most actionable coaching signal we have.

Concrete example: if an EA's most recent sessions taught letters `k` and `t` while the per-child `letters_skipped` lists `p, c, f, o, r` (letters before `k` in the programme order that were never taught), that's a clear curriculum gap. The right coaching tip is *"The programme order has letters p, c, f, o, r before your current position, but they haven't been taught yet. Consider going back to cover them before moving forward."* That tip is fact-based, actionable, and free of any claim about what the children currently know.

#### 2. Drilling known letters (the weaker signal)

**Fields:** `teaching_known_letters` (per-child), `flag_teaching_known` (per-child).

For each child, lists letters the EA is teaching that the child already mastered on their baseline assessment. When many children in a group have a populated `teaching_known_letters`, it means the EA is spending time on letters most of the group already knew at baseline.

**This is a weaker signal than curriculum coverage.** Drilling known letters supports automaticity and is largely harmless if it's only here and there — children may benefit from the practice even if they "knew" the letter on a one-shot baseline assessment. Surface this as a low-priority secondary observation, not as a primary coaching concern. The framing should suggest *"you can move faster on these for them if you'd like"* rather than implying the EA is wasting time.

#### Why these two and not others

These two signals are safe because they don't require inferring what children currently know. Both are about teaching behavior measured against teaching expectations:

- Curriculum coverage compares actual sessions against the programme's prescribed letter sequence.
- Drilling known letters compares actual sessions against each child's baseline assessment record.

Neither asks "did the child learn it?" because we don't have post-assessment data. Both ask "what did the EA do?" — a question we can answer factually from session logs and baseline records.

#### Group-level vs per-child framing

Curriculum gaps are usually a GROUP-level issue because the programme order is shared across the group. If the EA skipped letters `p, c, f`, every child in the group is affected by the same gap. Frame curriculum gaps at the group level: *"Your group has not yet covered letters p, c, f from the programme order"* — not *"3 of 7 children have gaps."* The gap is in the EA's teaching coverage, not in the children's individual knowledge.

Drilling-known-letters can be either group-level or per-child, depending on how varied the children's baseline mastery was. If most kids in the group knew "a" at baseline, surface it as a group-level note. If only a few kids knew it, name those kids specifically — they're the ones for whom the practice is redundant.

---

## Coaching tip logic (what the UI may and may not say)

### May say

**Curriculum coverage (Category A — strongest signals, frame at group level):**

- "Your most recent sessions taught {letters}, but the programme order has letters {letters_skipped} before your current position that haven't been taught yet."
- "These letters from the programme order are still missing from your sessions: {letters_skipped}. Consider going back to cover them before moving forward."
- "Your group has skipped letters {letters_skipped} in the programme sequence."
- "You haven't yet covered {letters_needed.slice(0,3)} — the programme order suggests these next."
- "Letters you've taught: a, e, i. Sessions per letter: ..."

**Baseline mastery (Category B — secondary signals, past-tense framing required):**

- "Most of this group already knew these letters at their baseline assessment — you can move faster on them if you'd like."
- "These children — {names} — already knew letters {teaching_known_letters} at their baseline assessment. You can move faster on these for them."
- "These children still need to learn: {letters_needed}"
- "At their baseline assessment, your group's strongest letters were {top from letters_mastered}"

### May NOT say

- "Your children aren't learning the letters you're teaching"
- "Only X% of your group has mastered letter Y" (without the phrase "at baseline")
- "Letter Y is a problem area"
- "Your group is behind on letter Y"
- Anything that *implies* a current knowledge state the data doesn't measure

### The gray area

- "Your group is progressing through the curriculum at a rate of X letters per week" — safe, because this is computed from session data, not mastery.
- "Great job — this group started knowing 4 letters on average at baseline and has now been taught 12 more" — safe and motivating, describes teaching effort not learning outcomes.
- "Letter Y is the next one in the programme sequence" — safe, drawn from `letters_needed`.

---

## Language guidance

### For EA-facing copy (`/my-kids` pages)

EAs read this on their phones, in English that's often their second language, sometimes between sessions. Copy needs to be short, warm, and honest.

**Preferred phrases for mastery data:**

- "Known at baseline"
- "From your kids' first assessment"
- "When we tested"
- "Your kids started knowing…"
- "Baseline results showed…"

**Avoid these phrases entirely:**

- "{N} children have mastered {letter}" — implies a current measurement
- "Children are struggling with {letter}" — not supported by data
- "Your group is behind" — not supported by data
- "Only {N}% mastery on {letter}" — stale, stated as if current

**Tone rules for coaching tips:**

- Lead with acknowledgement of effort ("You've taught {letter} {N} times…")
- Deliver the observation as a question or suggestion, never as a correction
- Never accuse or imply failure
- Always give the EA something to do (specific, concrete, tied to the programme guide)

### For mentor / PM / funder-facing copy (`/pm/*`, `/pm/education-assistants/[user-id]`)

The same data is shown to mentors when they pull up an EA's detail view. PMs reading this have more context and can interpret signals more technically, so the copy can be more direct. But the underlying *constraint* is the same: we still can't claim children aren't learning.

- Flag labels like "Teaching Known" and "Curriculum Gap" are OK for PMs — they're experienced with the terminology from the alignment page.
- On PM views, **keep** the raw flag names alongside any coaching-framed language (this was decided during brainstorming). PMs scan multiple EAs quickly and the flag pills are faster than prose.
- When an AI-generated coaching tip appears in a PM view, it should be the same tip the EA sees — consistency matters when mentors are coaching EAs through visit conversations.

### For AI-generated copy (Phase 2+)

The Phase 2 AI insights generator ("Today's Plan," coaching tips) and the Phase 3 chatbot both will have access to `ChildLetterAlignment2026` data. The system prompt must include guardrails against the forbidden claims above.

Recommended system-prompt additions:

> "There are two categories of signals in this data, and they have different rules.
>
> CATEGORY A — CURRICULUM COVERAGE SIGNALS (the strongest coaching signals): These are facts about what the EA has taught vs the programme order, observable directly from session data. They include `letters_skipped`, `flag_skipping_needed`, and `flag_curriculum_gaps`. You may freely surface these in coaching tips. Example: 'Your most recent sessions taught letters k and t, but the programme order has p, c, f before your current position — these letters haven't been taught yet. Consider going back to cover them.' These are factual statements about teaching behavior, not claims about child knowledge. Frame curriculum gaps at the GROUP level — every child in a group is affected by the same skipped letters.
>
> CATEGORY B — BASELINE MASTERY SIGNALS (use carefully): Mastery data in this system comes from a single baseline assessment per child. It does NOT reflect what children currently know — only what they knew at the moment they took their first assessment. Do not make claims about current knowledge, current struggles, or how well children are learning from recent teaching. You may make past-tense statements about what children knew at baseline, including the `teaching_known_letters` signal. Frame these as mild observations, not as primary concerns — drilling known letters is largely harmless and supports automaticity.
>
> FORBIDDEN: Do not say 'children are struggling', 'children are not learning', 'children have not mastered letter X', 'your group is behind', or anything that implies a CURRENT knowledge state. We do not have post-baseline assessment data. If asked whether children are learning, explain that we don't have live mastery data yet and suggest the EA look for in-session signs like child confidence, speed, or correct responses.
>
> PRIORITIZE Category A over Category B in coaching output. Curriculum gaps are the most actionable signal we have."

---

## Future: child-level mastery capture

When we ship the ability for EAs to mark a child as having mastered a letter — probably via a mobile app or PWA — this entire document needs a section added, and the Category B constraints change:

- `children_mastered` can reflect **current** knowledge, not just baseline.
- Coaching tips about "children aren't learning" become **possible** to write accurately — the data will support them.
- The mastery path visualization becomes a live progress tracker instead of a baseline + teaching-activity overlay.
- `teaching_known_letters` becomes even less important than it already is, because live mastery updates give a more immediate signal about what's redundant.
- The AI guardrails about "don't claim current knowledge" can be relaxed.
- **Category A curriculum coverage signals are unchanged** — they were never about child knowledge in the first place. They remain the most actionable coaching signal whether or not live mastery capture exists.

Until then, the EA experience must treat baseline mastery (Category B) as a **snapshot**, not a stream. Curriculum coverage (Category A) has no equivalent constraint.

### When to build this

Scoping decisions for the mobile app / PWA mastery-capture flow are in [ea-my-kids-plan.md](ea-my-kids-plan.md) under "Future: Child-Level Mastery Capture." The short version:

1. Start with a PWA form on `/my-kids/groups/[class_id]` that lets the EA mark per-child mastery for the current letter in a session.
2. Offline-first is critical — rural EAs often have poor connectivity.
3. Eventually migrate to a dedicated mobile app (React Native / Expo) if adoption is strong.

---

## Related reading

- [ea-my-kids-plan.md](ea-my-kids-plan.md) — the broader EA "My Kids" feature plan
- [pm-dashboard-architecture.md](pm-dashboard-architecture.md) — where the alignment data surfaces in the PM view
- `docs/superpowers/specs/2026-04-07-letter-alignment-design.md` — the original design of the letter alignment model
- `docs/superpowers/specs/2026-04-09-ea-my-kids-design.md` — the Phase 0 + 1 spec for the EA My Kids page
- `api/ea_mastery.py` (backend) — the helper that produces the group-level mastery data
- `api/management/commands/compute_letter_alignment_2026.py` (backend) — the nightly compute that builds `ChildLetterAlignment2026`
