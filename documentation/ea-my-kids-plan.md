# EA "My Kids" Page — Strategy & Implementation Plan

> Plan for building an AI-powered, personalized experience for Education Assistants (EAs) that shows them their groups, children, progress, quality flags, and AI-generated curriculum coaching. This is the second workstream, implemented after the PM Dashboard.

---

## Table of Contents

1. [Vision & Goals](#vision--goals)
2. [User Persona: Education Assistants](#user-persona-education-assistants)
3. [Authentication & Data Scoping](#authentication--data-scoping)
4. [Page Structure & UX](#page-structure--ux)
5. [Pre-Computed AI Insights (Phase 1)](#pre-computed-ai-insights-phase-1)
6. [AI Chatbot with Tools (Phase 2)](#ai-chatbot-with-tools-phase-2)
7. [Curriculum Knowledge System](#curriculum-knowledge-system)
8. [Mobile-First Design](#mobile-first-design)
9. [Future: Child-Level Mastery Capture](#future-child-level-mastery-capture)
10. [Django API Endpoints Required](#django-api-endpoints-required)
11. [Implementation Sequence](#implementation-sequence)

---

## Vision & Goals

**Vision:** AI as a "curriculum coach in your pocket" for every Education Assistant. Training EAs is expensive and they're geographically scattered across South Africa. The more curriculum knowledge the AI holds, the less intensive in-person training needs to be. EAs can focus on what they do best — building relationships with children — while the AI guides them on what to teach and how.

**Goals:**
1. Show each EA their groups, children, and progress in a mobile-friendly interface
2. Surface quality flags specific to their practice (not punitive, but coaching-oriented)
3. Generate daily "Here's what you should do today" recommendations per group
4. Eventually provide a chat interface where EAs can ask curriculum questions
5. Make the programme guide's knowledge actionable and personalized

**Non-goals (for now):**
- Replacing TeamPact for session logging (EAs continue to log sessions there)
- Building a full mobile app (responsive web / PWA approach first)
- Peer comparison or leaderboards (avoid creating competition between EAs)

**Tone principle:** Everything on this page should feel **supportive and coaching-oriented**, never surveillance or punitive. Flags should be framed as "Here's something to check" not "You're doing this wrong."

---

## User Persona: Education Assistants

| Attribute | Detail |
|-----------|--------|
| **Who** | Young South Africans (typically 18-25) hired to deliver the literacy programme in schools |
| **Tech comfort** | Comfortable with smartphones, use TeamPact daily, active on WhatsApp |
| **Device** | Primarily Android smartphones, limited data plans |
| **Language** | isiXhosa speakers primarily, English as second language |
| **Context** | Work in schools, often in rural/peri-urban Eastern Cape. Limited connectivity |
| **Motivation** | Care deeply about children, want to do a good job, may lack curriculum confidence |
| **Pain points** | Uncertain what to teach next, no feedback between mentor visits, paper LKPT is cumbersome |
| **Key need** | "Tell me what I should do with each group today" |

---

## Authentication & Data Scoping

### New Clerk Role: `ea`

Add to the role hierarchy:
```typescript
const ROLE_LEVELS: Record<Role, number> = {
  ea: 0,           // NEW — can only see own data
  funder: 1,
  junior_staff: 2,
  senior_staff: 3,
  admin: 4
};
```

### How EAs Are Identified

EAs are identified in the data by `user_name` in `TeampactSession2026`. To link a Clerk user to their TeamPact data:

**Option A — Clerk metadata mapping:**
Store the EA's TeamPact `user_name` in Clerk publicMetadata:
```json
{
  "role": "ea",
  "teampact_user_name": "Thando Mkhize"
}
```
The API uses this to filter all queries to the EA's own data.

**Option B — Email matching:**
Match Clerk user email to `TeampactSession2026.user_email`. Less reliable (email may differ).

**Recommended: Option A.** Admin sets up EA accounts in Clerk with their TeamPact user_name in metadata.

### Data Scoping Rules

- EA can ONLY see data where `user_name` / `collected_by` matches their own name
- EA cannot see other EAs' data, school-level aggregates, or PM dashboard
- EA cannot see their quality flags in the same way PMs see them — flags are reframed as coaching tips

### Route Protection

```typescript
const PROTECTED_ROUTES: Record<string, Role> = {
  "/schools": "funder",
  "/pm": "funder",
  "/my-kids": "ea"    // NEW — accessible to ea and above
};
```

Note: Funders/staff can also access `/my-kids` (role >= ea), but the page shows data scoped to the logged-in user's EA identity. Staff without a TeamPact user_name would see a "not linked" state.

---

## Page Structure & UX

### Route: `/my-kids`

**Landing page — Group Progress Overview**

This is what the EA sees when they log in. Designed based on the selected mockup:

```
┌──────────────────────────────────────┐
│  My Groups — Siyazama PS             │
│  Thursday, 3 April 2026              │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ Group 1 (Grade R)            │    │
│  │ a─e─i─[●]───────────────── │    │
│  │ 15%  │  4 sessions this week │    │
│  │ ✅ On track                   │    │
│  │                              │    │
│  │ 💡 Ready to introduce 'o'.   │    │
│  │    Keep reviewing a, e, i.   │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ Group 2 (Grade R)            │    │
│  │ a─[●]────────────────────── │    │
│  │ 8%   │  2 sessions this week │    │
│  │ ⚠ Needs more sessions        │    │
│  │                              │    │
│  │ 💡 Focus on 'a' and 'e'.    │    │
│  │    Try the memory game today.│    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ Group 3 (Grade 1, Blending)  │    │
│  │ Letters complete ✅           │    │
│  │ Blending Stage B (3-letter)  │    │
│  │ 3 sessions this week         │    │
│  │ ✅ On track                   │    │
│  │                              │    │
│  │ 💡 Practice 3-letter words:  │    │
│  │    ewe, yam, bam. Use board  │    │
│  │    game with these words.    │    │
│  └──────────────────────────────┘    │
│                                      │
│  [💬 Ask a question...]              │
└──────────────────────────────────────┘
```

### Key Elements Per Group Card:

1. **Group name and grade** — clear identification
2. **Letter progress bar** — visual position on the 26-letter sequence
3. **Progress percentage** — numeric progress
4. **Sessions this week** — dosage indicator
5. **Status badge** — On track / Needs attention / Low dosage (same thresholds as PM)
6. **AI coaching tip** — 1-2 sentence recommendation for today's session (pre-computed)

### Group Card Tap → Group Detail

### Route: `/my-kids/[group-id]`

When an EA taps a group card, they see detailed information:

```
┌──────────────────────────────────────┐
│  ← Group 1 (Grade R)                │
│  Siyazama PS                         │
│                                      │
│  ┌─ TODAY'S PLAN ──────────────┐    │
│  │ Review: a, e, i              │    │
│  │ Introduce: o                 │    │
│  │ Suggested game: Container    │    │
│  │ game — pick a letter, say    │    │
│  │ its sound and a word.        │    │
│  │                              │    │
│  │ Note: Sipho and Anathi are   │    │
│  │ still struggling with 'i'.   │    │
│  │ Give them extra turns.       │    │
│  └──────────────────────────────┘    │
│                                      │
│  ── CHILDREN (7) ──────────────────  │
│  Sipho M.        │ 12 sessions       │
│  Anathi K.       │ 11 sessions       │
│  Zinhle D.       │ 12 sessions       │
│  ... (4 more)                        │
│                                      │
│  ── RECENT SESSIONS ──────────────── │
│  Apr 2  │ a, e, i  │ 7/7 attended   │
│  Apr 1  │ a, e, i  │ 6/7 attended   │
│  Mar 31 │ a, e     │ 7/7 attended   │
│  Mar 28 │ a, e     │ 5/7 attended   │
│  Mar 27 │ a        │ 7/7 attended   │
│                                      │
│  ── LETTER JOURNEY ──────────────── │
│  a ████████████ (5 sessions)         │
│  e ████████ (4 sessions)             │
│  i ██████ (3 sessions)               │
│  o (next up)                         │
│                                      │
│  ── COACHING NOTES ──────────────── │
│  💡 This group is progressing well.  │
│  You've given 'a' plenty of          │
│  repetition (5 sessions). The group  │
│  seems ready to add 'o' while        │
│  continuing to review a, e, i.       │
│  Remember: 1-2 new letters, 2-3      │
│  review letters per session.         │
│                                      │
│  ⚠ Attendance dipped on Mar 28.     │
│  Check if Sipho and Anathi were      │
│  the ones absent.                    │
└──────────────────────────────────────┘
```

### Key Elements of Group Detail:

1. **Today's Plan** — AI-generated session recommendation
2. **Children list** — names and session attendance count
3. **Recent sessions** — last 5 sessions with letters and attendance
4. **Letter Journey** — visual showing how many sessions each letter has been covered
5. **Coaching Notes** — AI-generated analysis of the group's trajectory

---

## Pre-Computed AI Insights (Phase 1)

### Architecture

```
Nightly Cron (Django)
  │
  ├── sync_teampact_sessions_2026
  ├── compute_school_summaries_2026
  │
  └── generate_ea_insights          ← NEW management command
      │
      ├── For each EA:
      │   ├── Gather: all groups, recent sessions, letter progress, flags
      │   ├── Build prompt with curriculum context + EA data
      │   ├── Call Claude API (anthropic SDK)
      │   └── Store structured insights in DB
      │
      └── Save to: EADailyInsight model
```

### New Django Model: `EADailyInsight`

```python
class EADailyInsight(models.Model):
    ea_name = models.CharField(max_length=255, db_index=True)
    school_name = models.CharField(max_length=255)
    generated_for_date = models.DateField(db_index=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    
    # Structured insights (JSON)
    group_insights = models.JSONField()
    # Format:
    # [
    #   {
    #     "group": "Grade R Group 1",
    #     "status": "on_track",  # on_track, needs_attention, low_dosage
    #     "coaching_tip": "Ready to introduce 'o'. Keep reviewing a, e, i.",
    #     "todays_plan": {
    #       "review_letters": ["a", "e", "i"],
    #       "new_letters": ["o"],
    #       "suggested_game": "Container game",
    #       "game_description": "Pick a letter, say its sound and a word.",
    #       "special_notes": "Sipho and Anathi struggling with 'i' — give extra turns."
    #     },
    #     "flags": ["none"],
    #     "progress_summary": "Group has covered a, e, i over 5 sessions. Good repetition."
    #   },
    #   ...
    # ]
    
    # Overall EA summary
    overall_summary = models.TextField()  # "You're doing well this week..."
    overall_flags = models.JSONField(default=list)  # Coaching-framed flags
    
    class Meta:
        unique_together = ('ea_name', 'generated_for_date')
```

### Claude API Prompt Design

The `generate_ea_insights` command builds a prompt for each EA:

```
System prompt:
  - Full programme guide (from zazi_izandi_programme_guide.md)
  - Role: "You are a supportive curriculum coach for Zazi iZandi EAs"
  - Output format: structured JSON matching EADailyInsight.group_insights
  - Tone: encouraging, specific, actionable

User prompt:
  - EA name, school, groups managed
  - Per group:
    - Current letter progress (index, letter)
    - Last 10 sessions: dates, letters taught, attendance
    - Session notes from last 5 sessions
    - Flags that apply to this group
    - Children in group (names, attendance counts)
  - Mentor visit feedback (if any recent)
  - Today's date and day of week

Instructions:
  - For each group, recommend what to do today
  - Suggest specific review letters and new letters (following programme rules)
  - Recommend a game/activity from the programme guide
  - Note any children who may need extra attention (low attendance, mentioned struggling in notes)
  - Frame flags as coaching opportunities, not criticism
  - Keep tips short (1-2 sentences per group)
```

### Cost Estimation

- ~185 EAs × ~1 Claude API call per EA per day
- Each call: ~2000 input tokens (programme guide excerpt + data) + ~500 output tokens
- Estimated daily cost: ~185 × $0.015 ≈ **$2.80/day** (using Claude Haiku for batch insights)
- Could optimize further by batching EAs at the same school

### Fallback Strategy

If AI generation fails for an EA (API error, timeout):
- Use rule-based fallback: calculate recommended letters from last session + programme rules
- Mark insight as "rule_based" vs "ai_generated"
- Retry on next nightly run

---

## AI Chatbot with Tools (Phase 2)

### Architecture: Vercel AI SDK

```
EA (browser)
  │
  └── /my-kids chat interface
      │
      └── Next.js API route: /api/chat
          │
          ├── Vercel AI SDK (streamText / generateText)
          ├── Claude model (claude-sonnet or claude-haiku)
          ├── System prompt: programme guide + EA context
          │
          └── Tools (function calling):
              ├── get_my_groups()
              ├── get_group_sessions(group, date_range)
              ├── get_group_children(group)
              ├── get_letter_progress(group)
              ├── get_child_attendance(child_name)
              ├── get_curriculum_recommendation(group, current_letter)
              ├── get_my_flags()
              ├── get_game_suggestion(letters, group_size)
              └── get_blending_readiness(group)
```

### Tool Definitions

Each tool calls the Django API on behalf of the authenticated EA (scoped to their data):

#### `get_my_groups()`
**Purpose:** List all groups the EA manages
**Returns:** Group names, grades, children count, current letter, sessions this week

#### `get_group_sessions(group_name: str, days: int = 10)`
**Purpose:** Get recent session history for a specific group
**Returns:** Array of sessions with date, letters taught, attendance count, notes

#### `get_group_children(group_name: str)`
**Purpose:** List children in a group with attendance data
**Returns:** Child names, total sessions attended, attendance rate, last attended date

#### `get_letter_progress(group_name: str)`
**Purpose:** Detailed letter progression for a group
**Returns:** Current letter, progress index, letters covered, sessions per letter, next recommended letters

#### `get_child_attendance(child_name: str)`
**Purpose:** Individual child's attendance history
**Returns:** Sessions attended, sessions missed, attendance trend, groups enrolled

#### `get_curriculum_recommendation(group_name: str, current_letter: str)`
**Purpose:** AI-informed recommendation based on programme rules
**Returns:** Review letters, new letters to introduce, rationale, game suggestions
**Logic:** Applies programme guide rules — max 2 new, 2-3 review, appropriate to group level

#### `get_my_flags()`
**Purpose:** Get coaching-framed quality flags for this EA
**Returns:** Array of flags with coaching-oriented descriptions and suggested actions

#### `get_game_suggestion(letters: list[str], group_size: int)`
**Purpose:** Suggest a game/activity from the programme guide for given letters
**Returns:** Game name, description, setup instructions, materials needed
**Source:** Programme Guide games section (memory, container, snap, board, hopscotch, etc.)

#### `get_blending_readiness(group_name: str)`
**Purpose:** Assess whether a group is ready for blending
**Returns:** Ready/not ready, letter mastery evidence, recommended blending stage if ready

### Chat UX

- Floating chat button at bottom of `/my-kids` page
- Opens a slide-up chat panel (mobile-friendly)
- Pre-populated suggested questions:
  - "What should I do with Group 1 today?"
  - "Is Group 2 ready for blending?"
  - "Which children have low attendance?"
  - "Suggest a game for letters a, e, i"
- Streaming responses (Vercel AI SDK `useChat` hook)
- Chat history persists for current session (not across sessions — keeps costs down)

### Cost Management for Chat

- Use Claude Haiku for chat (fast, cheap)
- Limit conversation turns per day per EA (e.g., 20 turns)
- System prompt includes only relevant group data, not all programme data
- Tools fetch data on demand rather than stuffing everything into context

---

## Curriculum Knowledge System

The AI's effectiveness depends on how well it understands the Zazi iZandi curriculum. Here's how we embed that knowledge:

### System Prompt Structure

```
[ROLE]
You are a supportive curriculum coach for a Zazi iZandi Education Assistant.
Your job is to help them implement the programme correctly with their groups of children.
Be encouraging, specific, and practical. Speak simply and clearly.

[PROGRAMME RULES — NON-NEGOTIABLE]
1. Each session: max 2 new letters, 2-3 review letters, 2-5 total
2. Letter sequence: a, e, i, o, u, b, l, m, k, p, s, h, z, n, d, y, f, w, v, x, g, t, q, r, c, j
3. Groups must be at different letter levels (not all doing the same)
4. Mastery = consistent, confident identification of both lowercase and uppercase
5. Children need 5-10 exposures before mastery — don't rush
6. Blending only after strong letter foundation
7. Blending progression: 2-letter CVs → 3-letter → 4-letter words → complex consonants
8. Sessions are 20 minutes, play-based, with games
9. Good notes should mention who mastered what and who needs more practice

[GAMES AVAILABLE]
- Flashcard drill: Show letters, say sounds individually and as group
- Memory game: 5 matching pairs (2 current + 3 review letters)
- Container game: Pass container, pick letter, say sound + word
- Snap: Match identical letters, say sound
- Board game: 15 spaces with 5 target letters (2 current + 3 review × 3)
- Hopscotch: Letters on ground, say sound while hopping
- Letter writing: Copy, trace, air write, sand/flour, playdough
- Letter writing race: Hear letter, say sound, write quickly
For blending:
- Board game (blending): Spaces have syllables/words
- Hopscotch (blending): Grid has syllables/words
- Letter substitution: Replace one letter to make new words
- Syllable substitution: Swap syllables to make new words

[EA CONTEXT — injected per request]
EA: {name}
School: {school}
Groups: {group summary with current progress}

[TODAY'S DATE]
{date}
```

### Curriculum Knowledge Maintenance

The programme guide is stored at `documentation/zazi_izandi_programme_guide.md`. When the programme evolves:
1. Update the markdown file
2. The nightly insight generation and chat system prompt both read from this source
3. No retraining needed — the AI uses the latest guide content each time

---

## Mobile-First Design

EAs will primarily access this on smartphones. Design principles:

### Layout
- **Single-column layout** on all screen sizes
- **Large tap targets** (minimum 44px)
- **Bottom navigation** (My Groups / Chat / Profile) — thumb-friendly
- **Swipe between groups** (horizontal swipe on group cards)
- **Pull-to-refresh** for latest data

### Performance
- **Minimal JS bundle** — server components where possible
- **Skeleton loading states** — show placeholder cards while data loads
- **ISR + SWR** — stale-while-revalidate for instant perceived loading
- **Image optimization** — no unnecessary images, SVG icons only

### Offline Considerations (Future/PWA)
- **Service worker** caches the last-loaded group data
- EA can view their groups offline (stale data)
- Chat requires connectivity
- "Last updated: 2 hours ago" indicator when offline

### Data Usage
- Minimize payload sizes — only fetch data for the EA's own groups
- Lazy load group detail data (only when card is tapped)
- No auto-playing media or large assets

### Language (Future)
- Consider isiXhosa translations for key UI elements
- AI responses could be generated in isiXhosa (Claude supports it)
- Start with English, add isiXhosa as a toggle

---

## Future: Child-Level Mastery Capture

Currently, child-level mastery is tracked on paper (LKPT). Digitizing this is a critical gap.

### Option A: Add to "My Kids" Page (PWA Approach)

Build a simple mastery capture form within the group detail page:

```
┌──────────────────────────────────────┐
│  ← Group 1 — Update Mastery         │
│                                      │
│  Letter: e                           │
│                                      │
│  Sipho M.    [✅ Mastered] [❌ Not yet]│
│  Anathi K.   [✅ Mastered] [❌ Not yet]│
│  Zinhle D.   [✅ Mastered] [❌ Not yet]│
│  ... (4 more)                        │
│                                      │
│  [Save & Next Letter →]              │
└──────────────────────────────────────┘
```

**Pros:** Immediate digital capture, no separate app needed
**Cons:** Yet another data entry step for EAs, needs connectivity

### Option B: Mobile App with Offline Support

Build a dedicated mobile app (React Native / Expo) with offline-first mastery capture that syncs when connected.

**Pros:** Works offline (critical for rural schools), can be more tailored
**Cons:** Separate codebase, app store distribution, longer timeline

### Option C: Enhanced TeamPact Integration

Work with TeamPact to add child-level mastery fields to their session capture flow.

**Pros:** No new app, integrated into existing workflow
**Cons:** Dependent on TeamPact's development timeline and flexibility

### Recommended Path

Start with **Option A** (PWA on the website) as a lightweight experiment. If EAs adopt it and find it valuable, invest in **Option B** (dedicated mobile app) for the offline-first experience. Explore **Option C** in parallel as a longer-term solution.

### Data Model for Child Mastery

See [Data Metrics Reference — Future Data Capture](data-metrics-reference.md#future-data-capture-mobile-app) for the proposed schema.

### Impact on AI Analysis

With child-level mastery data, the AI could:
- Recommend specific letters to review based on which children haven't mastered them
- Identify children who are falling behind within a group
- Suggest regrouping when one child is far behind or ahead
- Track individual learning velocity (letters mastered per week)
- Generate truly personalized session plans based on who actually knows what

---

## Django API Endpoints Required

### `/api/ea/me/`
**Auth:** EA must be authenticated, data scoped by `user_name`
```json
{
  "ea_name": "Thando Mkhize",
  "school": "Siyazama PS",
  "groups": [
    {
      "group_id": "grade-r-group-1",
      "group_name": "Grade R Group 1",
      "grade": "Grade R",
      "children_count": 7,
      "current_letter": "i",
      "progress_index": 2,
      "progress_pct": 11.5,
      "sessions_this_week": 4,
      "total_sessions": 18,
      "last_session_date": "2026-04-02",
      "dosage_status": "on_track",
      "coaching_tip": "Ready to introduce 'o'. Keep reviewing a, e, i.",
      "flags": []
    },
    ...
  ],
  "overall_summary": "Great week! 12 sessions across 5 groups. Keep up the momentum.",
  "overall_flags": [],
  "insights_generated_at": "2026-04-03T02:00:00Z"
}
```

### `/api/ea/me/groups/<group-id>/`
**Auth:** Scoped to EA's groups only
```json
{
  "group_name": "Grade R Group 1",
  "grade": "Grade R",
  "school": "Siyazama PS",
  "children": [
    {"name": "Sipho M.", "participant_id": 123, "sessions_attended": 12, "attendance_rate": 0.85},
    ...
  ],
  "recent_sessions": [
    {
      "date": "2026-04-02",
      "letters_taught": ["a", "e", "i"],
      "new_letters": [],
      "review_letters": ["a", "e", "i"],
      "attended": 7,
      "total": 7,
      "notes": "All learners confident with 'a' and 'e'. Sipho still hesitant on 'i'."
    },
    ...
  ],
  "letter_journey": [
    {"letter": "a", "sessions_count": 5, "first_taught": "2026-03-15", "last_taught": "2026-04-02"},
    {"letter": "e", "sessions_count": 4, "first_taught": "2026-03-18", "last_taught": "2026-04-02"},
    {"letter": "i", "sessions_count": 3, "first_taught": "2026-03-25", "last_taught": "2026-04-02"}
  ],
  "todays_plan": {
    "review_letters": ["a", "e", "i"],
    "new_letters": ["o"],
    "suggested_game": "Container game",
    "game_description": "Learners pass a container while singing. When the song stops, the child picks a letter card, says the sound, and gives an isiXhosa word beginning with that sound.",
    "special_notes": "Sipho still hesitant on 'i' — give him extra turns. Anathi was absent on Mar 28, check she's caught up."
  },
  "progress": {
    "current_letter": "i",
    "progress_index": 2,
    "progress_pct": 11.5,
    "next_letter": "o",
    "phase": "letters"
  },
  "coaching_analysis": "This group is progressing well. You've given 'a' solid repetition (5 sessions) which is exactly what the programme recommends. The group appears ready to add 'o' to their sessions while continuing to consolidate a, e, i. Remember: 1-2 new letters and 2-3 review letters each session."
}
```

### `/api/ea/me/insights/`
**Auth:** Scoped to EA
```json
{
  "generated_for_date": "2026-04-03",
  "generated_at": "2026-04-03T02:00:00Z",
  "generation_method": "ai_generated",
  "overall_summary": "Great week so far! You've done 8 sessions across your 5 groups in 3 days. Group 1 and 3 are on track for dosage this week. Try to fit in an extra session for Group 2 — they're a bit behind.",
  "group_insights": [...],
  "overall_flags": [
    {
      "type": "low_dosage",
      "group": "Grade R Group 2",
      "message": "Group 2 has only had 2 sessions this week. Can you fit in one more before Friday?",
      "severity": "info"
    }
  ]
}
```

### `/api/chat` (Next.js API route, not Django)
**Purpose:** Vercel AI SDK chat endpoint
**Auth:** Clerk session, EA scoped
**Implementation:** Next.js Route Handler using `@ai-sdk/anthropic`

```typescript
// app/api/chat/route.ts
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const eaName = getEANameFromClerkSession();
  
  const result = streamText({
    model: anthropic('claude-3-5-haiku-20241022'),
    system: buildSystemPrompt(eaName),
    messages,
    tools: {
      get_my_groups: tool({
        description: 'Get all groups this EA manages',
        parameters: z.object({}),
        execute: async () => fetchFromDjango(`/api/ea/${eaName}/groups/`),
      }),
      get_group_sessions: tool({
        description: 'Get recent sessions for a specific group',
        parameters: z.object({
          group_name: z.string(),
          days: z.number().default(10),
        }),
        execute: async ({ group_name, days }) => 
          fetchFromDjango(`/api/ea/${eaName}/groups/${group_name}/sessions/?days=${days}`),
      }),
      // ... other tools
    },
    maxSteps: 5,
  });
  
  return result.toDataStreamResponse();
}
```

---

## Implementation Sequence

### Phase 1: Static "My Kids" Page (2-3 development sessions)

| Step | Task | Dependencies |
|------|------|-------------|
| 1.1 | Add `ea` role to Clerk RBAC (middleware.ts, header.tsx) | None |
| 1.2 | Build Django `/api/ea/me/` endpoint (scoped by user_name) | None (backend) |
| 1.3 | Build Django `/api/ea/me/groups/<group-id>/` endpoint | None (backend) |
| 1.4 | Create `/my-kids` route with group progress overview | 1.1, 1.2 |
| 1.5 | Create `/my-kids/[group-id]` route with group detail | 1.3 |
| 1.6 | Build letter progress visualization component | 1.4 |
| 1.7 | Mobile-first responsive design and testing | 1.4, 1.5 |

### Phase 2: Pre-Computed AI Insights (2-3 development sessions)

| Step | Task | Dependencies |
|------|------|-------------|
| 2.1 | Create `EADailyInsight` Django model | None (backend) |
| 2.2 | Build `generate_ea_insights` management command | 2.1 |
| 2.3 | Add to nightly cron on Render | 2.2 |
| 2.4 | Build `/api/ea/me/insights/` endpoint | 2.1 |
| 2.5 | Integrate coaching tips into group cards | Phase 1 complete, 2.4 |
| 2.6 | Integrate "Today's Plan" into group detail page | Phase 1 complete, 2.4 |
| 2.7 | Build fallback rule-based recommendations | 2.2 |

### Phase 3: AI Chatbot (2-3 development sessions)

| Step | Task | Dependencies |
|------|------|-------------|
| 3.1 | Install Vercel AI SDK (`ai`, `@ai-sdk/anthropic`) | None |
| 3.2 | Build `/api/chat` route handler with tools | 3.1 |
| 3.3 | Build Django endpoints for chat tools (sessions, children, etc.) | None (backend) |
| 3.4 | Build chat UI component (slide-up panel, mobile-friendly) | 3.1 |
| 3.5 | Implement tool functions (get_my_groups, get_group_sessions, etc.) | 3.2, 3.3 |
| 3.6 | Add suggested questions and conversation starters | 3.4 |
| 3.7 | Add rate limiting and cost management | 3.5 |
| 3.8 | Testing with real EA data and iteration | All above |

### Phase 4: Child Mastery Capture (Future)

| Step | Task | Dependencies |
|------|------|-------------|
| 4.1 | Design child mastery data model (Django) | None |
| 4.2 | Build mastery capture UI in group detail page | Phase 1 |
| 4.3 | Build Django endpoints for saving mastery data | 4.1 |
| 4.4 | Integrate mastery data into AI recommendations | Phase 2, 4.3 |
| 4.5 | PWA setup (service worker, offline caching) | 4.2 |

---

## Success Criteria

- [ ] EA can log in with Clerk and see only their own groups and children
- [ ] Group progress overview loads quickly on mobile (< 3 seconds)
- [ ] AI coaching tips are generated nightly and shown on the landing page
- [ ] Group detail page shows actionable "Today's Plan" with specific letters and games
- [ ] Quality flags are presented as coaching tips, not punitive warnings
- [ ] Chat interface allows EAs to ask natural language questions about their groups
- [ ] All AI recommendations comply with programme rules (max 2 new letters, etc.)
- [ ] System gracefully handles offline/slow connections (loading states, cached data)

---

## Open Questions

1. **EA onboarding** — How do we create Clerk accounts for ~185 EAs? Bulk import? Self-registration with approval? WhatsApp-based signup flow?
2. **isiXhosa support** — Should AI generate tips in isiXhosa from the start, or English first?
3. **Notification system** — Should EAs get WhatsApp or push notifications with their daily insights, or is the website sufficient?
4. **Mentor access** — Should mentors be able to view their assigned EAs' "My Kids" pages? Useful for coaching but adds complexity
5. **Feedback loop** — How do we know if EAs are actually using the recommendations? Track "Today's Plan viewed" events?
6. **Data consent** — Do we need additional consent from parents/schools for AI-generated insights about children?

---

## Related Documentation

- [Data, Metrics & Flags Reference](data-metrics-reference.md) — all data fields, metrics formulas, and flag logic
- [PM Dashboard Plan](pm-dashboard-plan.md) — the PM-facing workstream (implemented first)
- [Zazi iZandi Programme Guide](zazi_izandi_programme_guide.md) — curriculum rules the AI enforces
- [Data & Backend](data-and-backend.md) — current Django API setup
