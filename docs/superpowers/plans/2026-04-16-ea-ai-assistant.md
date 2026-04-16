# EA AI Assistant — Implementation Plan (revised)

> Revision log: addressed review feedback on snapshot-provenance, rate-limit atomicity, PII scope, schema consistency, context-window policy, group-name robustness, and route churn. Verified AI SDK v6 patterns against `ai-sdk` skill + live Vercel Gateway model list; verified model guidance against `openai-docs` skill.

## Context

Education Assistants (EAs) in the Zazi iZandi programme receive minimal training before being placed in classrooms. Common mistakes include teaching letters in the wrong order, teaching the same letters to every group (violating "teach at the right level"), skipping letters from the programme's sequence, and letting groups go weeks without a session. The existing `/my-kids` dashboard surfaces this via hardcoded coaching tips tied to four quality flags (`moving_too_fast`, `stagnation`, `curriculum_gaps`, `ghost_group`), but the tips are static and don't answer the question the EA actually has at 7:30am: *"What should I do today?"*

This plan adds a per-EA AI assistant that holds the curriculum in its head and proactively generates a concrete plan for today's sessions (which groups to prioritize, which letters to teach, when to rotate on vs. review). An open chat lets the EA ask follow-ups, including drill-down into any specific group via a structured tool call. The feature is opt-in per tap and scoped tightly to the authenticated EA's data via Clerk's `teampact_user_id` metadata. The long-term intent is to let EAs offload cognitive load onto the AI and focus on delivering a great experience to children.

## Locked decisions

| # | Area | Decision |
|---|------|----------|
| 1 | MVP scope | "What should I do today?" — proactive planning, not pure compliance analysis |
| 2 | Landing shape | Dashboard-first; AI brief panel on top of `/my-kids/today`; chat as drill-deeper |
| 3 | Freshness | On-demand generation, cached per-EA-per-day in Django DB |
| 4 | Language | English only for MVP |
| 5 | Navigation | Two-tab bottom nav. **Minimal route churn**: `Today` is new (`/my-kids/today`); `Groups` keeps existing route (`/my-kids`). Group drill-in (`/my-kids/groups/[class_id]`) unchanged. `/after-login` redirects EAs to `/my-kids/today`. |
| 6 | Storage | Django + Render Postgres (reuses existing infra) |
| 7 | Child data | **First names only**. No `participant_id` sent to OpenAI or stored in prompt logs. Group `class_id` is sent (it is an internal identifier, not PII). |
| 8 | Rate limits | Per EA per day: 1 brief + 2 regens (cap 3) + 20 chat messages. **Atomic**: Django brief/chat POST views do `select_for_update` on `AiUsageCounter`, check cap, increment, and write the row in one transaction — no race across parallel taps. Global `EA_AI_ENABLED` kill switch. |
| 9 | Retention | Keep prompt/completion logs forever (for replay harness); UI filters to today |
| 10 | Empty state | Zero groups / zero sessions → reuse existing `ZeroGroupsState`, hide AI entirely (no brief CTA, no chat input, no API calls) |
| 11 | Model + provider | **Direct OpenAI** via `@ai-sdk/openai` (user preference — avoids extra gateway layer). Model: `gpt-5.4-mini` (verified in live Vercel gateway model list and current OpenAI model guide; recommended for cheaper+fast reasoning). Start with `reasoning_effort: "low"`. Auth via `OPENAI_API_KEY`. Phase 2 adds `@ai-sdk/anthropic` for replay-harness comparisons — also direct, no gateway. Log every prompt + completion. |
| 12 | Voice | Deferred to phase 2 |
| 13 | Data delivery | **Two-part**: (a) pre-fetched AI-ready snapshot from Django `/api/ea/<user_id>/ai-snapshot/` injected into system prompt each turn; (b) **one tool** — `getGroupDetail(class_id)` — for per-child / per-session drill-down in chat. No fuzzy group-name matching. |
| 14 | Context window | Chat: always-fresh system prompt (role + guardrails + snapshot). `messages` array truncated server-side to last 6 user/assistant pairs before calling `streamText`. This caps tokens per turn. |
| 15 | Snapshot provenance | Django owns snapshot assembly. Fields like `letters_skipped`, `letters_needed_next_3`, `last_3_sessions` are computed server-side in Python against the existing models. No ad-hoc Next.js synthesis. |
| 16 | Timezone | All "today" reasoning uses `Africa/Johannesburg`. |

## Architecture overview

```
┌────────────────── Next.js 16 (Render) ──────────────────┐
│                                                          │
│  /my-kids/today (NEW — default for EAs)                 │
│   ├── DailyBriefPanel (client)                          │
│   │    └── POST /api/ea/brief  → streams                │
│   └── EaChat (client; @ai-sdk/react useChat + transport)│
│        └── POST /api/ea/chat   → streams                │
│                                                          │
│  /my-kids               (UNCHANGED — Groups tab dest)   │
│  /my-kids/groups/[class_id] (UNCHANGED — drill-in)      │
│                                                          │
│  BottomNav appended to app/my-kids/layout.tsx           │
│                                                          │
│  /api/ea/brief — POST, streams new brief                │
│   1. auth (Clerk)                                        │
│   2. kill-switch                                         │
│   3. fetch Django /ai-snapshot + /usage/today           │
│   4. Django /brief/ POST → atomic reserve (429 if cap)  │
│   5. streamText via openai('gpt-5.4-mini')              │
│   6. onFinish → Django /brief/<id>/complete/            │
│                                                          │
│  /api/ea/chat — POST, streams chat turn                 │
│   Tools: getGroupDetail(class_id) → calls Django        │
│   Context: last 6 pairs + snapshot in system            │
│                                                          │
└──────────────────┬───────────────────────────────────────┘
                   │ X-Internal-Auth: ${INTERNAL_API_SECRET}
                   ▼
┌────────────────── Django on Render ─────────────────────┐
│                                                          │
│  Existing app `my_kids` (or analogous) — unchanged      │
│    GET /api/ea/<id>/            (getEaOverview)         │
│    GET /api/ea/<id>/groups/<c>/ (getGroupDetail)        │
│                                                          │
│  NEW app `ai_assistant`:                                 │
│    Models: DailyBrief, ChatMessage, AiUsageCounter      │
│    GET  /api/ea/<id>/ai-snapshot/                       │
│      └─ Pre-computed fields (letters_skipped,           │
│         letters_needed_next_3, last_3_sessions, etc.)   │
│    POST /api/ea/<id>/brief/                             │
│      └─ Atomic: reserve counter slot, create            │
│         DailyBrief(partial=true), return {id, token}    │
│    POST /api/ea/<id>/brief/<brief_id>/complete/         │
│      └─ Update row with content + tokens + cost         │
│    POST /api/ea/<id>/chat/messages/                     │
│      └─ Atomic for user role: reserve counter slot,     │
│         create ChatMessage row. Assistant role: just    │
│         creates row (no counter).                       │
│    GET  /api/ea/<id>/chat/messages/today/               │
│    GET  /api/ea/<id>/usage/today/                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Django backend changes

New Django app `ai_assistant` in `/Users/jimmckeown/Development/Zazi_iZandi_Website_2025/`.

### Models (`ai_assistant/models.py`)

**`DailyBrief`**
- `id` (PK)
- `teampact_user_id` (int, indexed)
- `date` (date, SAST, indexed)
- `generation_index` (int, default 0) — 0 = initial, 1+ = regens
- `content` (text) — the streamed markdown, filled on completion
- `model` (str, e.g. `"gpt-5.4-mini"`)
- `prompt_tokens`, `completion_tokens` (int, nullable until complete)
- `cost_usd_cents` (int, nullable until complete)
- `prompt_json` (jsonb, nullable) — the exact payload sent to `streamText` (for replay)
- `partial` (bool, default True) — flipped to False by `complete/` endpoint
- `created_at`, `completed_at`
- `class Meta: unique_together = [("teampact_user_id", "date", "generation_index")]`
- Indexed on `(teampact_user_id, date)`.

**`ChatMessage`**
- `id` (PK)
- `teampact_user_id` (int, indexed)
- `date` (date, indexed)
- `role` (str, "user" | "assistant")
- `content` (text)
- `model` (str, nullable for user messages)
- `prompt_tokens`, `completion_tokens`, `cost_usd_cents` (int, nullable)
- `prompt_json` (jsonb, nullable) — payload sent to `streamText` on assistant turns
- `tool_calls` (jsonb, nullable) — captured `getGroupDetail` invocations
- `created_at`
- Indexed on `(teampact_user_id, date)`.

**`AiUsageCounter`**
- `teampact_user_id` (int)
- `date` (date)
- `briefs_today` (int, default 0)
- `chat_messages_today` (int, default 0)
- `class Meta: unique_together = [("teampact_user_id", "date")]`

### Views (wired in `ai_assistant/urls.py`, all require `X-Internal-Auth`)

1. **`GET /api/ea/<user_id>/ai-snapshot/`** — returns the complete AI-ready payload (see schema below). Single query path per group; all derived fields (letters_skipped, letters_needed_next_3, days_since_last_session, programme_position_summary) computed in Python against existing `Group2026`, `TeampactSession2026`, `ChildLetterAlignment2026` (or equivalents).

2. **`POST /api/ea/<user_id>/brief/`** — atomic reserve. Inside a `transaction.atomic()`:
   ```python
   counter, _ = AiUsageCounter.objects.select_for_update().get_or_create(
       teampact_user_id=user_id, date=today_sast()
   )
   if counter.briefs_today >= CAP_BRIEFS:
       raise Http429
   counter.briefs_today = F("briefs_today") + 1
   counter.save()
   brief = DailyBrief.objects.create(
       teampact_user_id=user_id, date=today_sast(),
       generation_index=counter.briefs_today - 1,
       partial=True, model=body["model"], prompt_json=body["prompt_json"],
   )
   return {"brief_id": brief.id, "generation_index": brief.generation_index}
   ```
   If Next.js's `streamText` fails mid-flight, the row is left `partial=True` and the counter slot is burned — accepting that small cost to keep the math atomic.

3. **`POST /api/ea/<user_id>/brief/<brief_id>/complete/`** — update row with `content`, tokens, cost, set `partial=False`.

4. **`POST /api/ea/<user_id>/chat/messages/`** — same atomic pattern for user messages:
   ```python
   if role == "user":
       counter = AiUsageCounter.objects.select_for_update().get_or_create(...)
       if counter.chat_messages_today >= CAP_CHAT:
           raise Http429
       counter.chat_messages_today = F("chat_messages_today") + 1
       counter.save()
   ChatMessage.objects.create(...)
   ```
   Assistant messages are created unconditionally by a trailing POST after `onFinish`.

5. **`GET /api/ea/<user_id>/chat/messages/today/`** — ordered list for UI rehydration.

6. **`GET /api/ea/<user_id>/usage/today/`** — `{ briefs_today, chat_messages_today }`.

### Ai-snapshot payload shape

```json
{
  "ea": { "name": "Alutha", "primary_school": "St Francis Primary", "teampact_user_id": 28739 },
  "today": { "date_iso": "2026-04-16", "day_of_week": "Thursday", "last_updated_from_django": "2026-04-16T03:00:00Z" },
  "groups": [
    {
      "class_id": 67610,
      "group_name_clean": "Group 3",
      "grade": "R",
      "phase": "letters",
      "language": "isiXhosa",
      "current_letter": "s",
      "progress_pct": 0.22,
      "letters_skipped": ["c", "f"],
      "letters_needed_next_3": ["n", "p", "o"],
      "sessions_this_week": 2,
      "avg_sessions_per_week": 3.1,
      "last_session_date": "2026-04-15",
      "days_since_last_session": 1,
      "flags": ["curriculum_gaps"],
      "children_count": 8,
      "last_3_sessions": [
        { "date": "2026-04-15", "letters_taught": ["s", "t"], "attendance_rate": 1.0 },
        { "date": "2026-04-12", "letters_taught": ["s"], "attendance_rate": 0.88 },
        { "date": "2026-04-10", "letters_taught": ["l", "k"], "attendance_rate": 1.0 }
      ],
      "children_first_names": ["Noluvuyo", "Sipho", "Asanda", "Lubabalo", "Inam", "Thuto", "Yenzokuhle", "Bulelwa"]
    }
  ],
  "programme_position_summary": "Group 3 just past letter T; group 5 two letters behind. All three groups currently rotating on 's' and 't' — differentiation needed."
}
```

Note: `children_first_names` only. No `participant_id`, no surnames, no DOB, no attendance-by-child. Child-level drill-down (per-child mastery, per-child alignment) goes through the `getGroupDetail` tool, which wraps the existing `/api/ea/<id>/groups/<class_id>/` endpoint.

### Migrations

`python manage.py makemigrations ai_assistant` + `python manage.py migrate`. Run via Render shell on deploy (existing pattern per `documentation/data-and-backend.md`). Activate venv first (per `reference_django_venv.md`).

### Admin

Register all three models so Jim can inspect chat logs and briefs without writing SQL. Add `list_display` showing teampact_user_id, date, model, tokens, cost.

## Next.js changes

### Packages to add (`package.json`)

- `ai` (Vercel AI SDK v6 — provides `ToolLoopAgent`, `streamText`, `DefaultChatTransport`, `InferAgentUIMessage`)
- `@ai-sdk/openai` (direct OpenAI provider)
- `@ai-sdk/react` (for `useChat` hook, which now requires `transport`)
- `zod` (for tool `inputSchema` — confirm not already transitive)

Phase 2 adds `@ai-sdk/anthropic` for the replay harness. No Vercel AI Gateway dependency.

Run `npm install` and commit the lockfile.

### Env vars (`.env.example` + Render)

- `OPENAI_API_KEY` (required)
- `EA_AI_ENABLED` (`"true"` / `"false"`, default `"true"`)
- `EA_AI_MODEL` (default `"gpt-5.4-mini"`)
- `EA_AI_DAILY_BRIEF_CAP` (default `3`)
- `EA_AI_DAILY_CHAT_CAP` (default `20`)
- `EA_AI_CHAT_HISTORY_PAIRS` (default `6`)

### Route restructure (minimized)

1. **Create** `app/my-kids/today/page.tsx` — new default. Server component:
   - `auth()` → extract `teampact_user_id`.
   - Fetch `getEaOverview(teampact_user_id)` and `getTodaysBrief(teampact_user_id)` in parallel.
   - If `overview.groups.length === 0` → render `<ZeroGroupsState />` and return (no AI components).
   - Otherwise render `<DailyBriefPanel initialBrief={brief} />` + `<EaChat initialMessages={msgs} />`.

2. **Modify** `app/my-kids/layout.tsx` — append `<BottomNav />` below `<main>`. Increase `<main>`'s bottom padding to `pb-24`. Top bar unchanged.

3. **Create** `components/my-kids/bottom-nav.tsx` — client component, two-tab sticky nav. Links: `Today → /my-kids/today`, `Groups → /my-kids`. Uses `usePathname()` for active state; `Today` is active on `/my-kids/today*`, `Groups` is active on `/my-kids` and `/my-kids/groups/*`. Lucide icons: `Sparkles`, `Users`.

4. **Modify** `app/after-login/page.tsx` — change `redirect("/my-kids")` → `redirect("/my-kids/today")`.

5. **Unchanged**: `app/my-kids/page.tsx`, `app/my-kids/groups/[class_id]/page.tsx`, the top-bar logo href, all WhatsApp deep links.

6. **Modify** `e2e/my-kids-auth.spec.ts` — update the post-login URL assertion from `/my-kids` to `/my-kids/today`. Add an assertion that tapping the `Groups` nav tab lands on `/my-kids`.

### AI surface (AI SDK v6 patterns)

**Create** `lib/tools/get-group-detail.ts`:
```ts
import { tool } from "ai";
import { z } from "zod";

export function createGetGroupDetailTool(teampactUserId: number) {
  return tool({
    description: "Fetch per-child mastery, per-letter breakdown, and recent session detail for a specific group the EA owns. Use when the EA asks about a specific group, or when you need child-level data to give a concrete plan.",
    inputSchema: z.object({
      class_id: z.number().describe("class_id from the snapshot"),
    }),
    execute: async ({ class_id }) => {
      // Scope via closure — the LLM cannot override teampactUserId
      const detail = await getGroupDetail(teampactUserId, class_id);
      if (!detail) return { error: "group_not_found" };
      // Strip participant_ids, keep first names
      return toAiSafeGroupDetail(detail);
    },
  });
}

export type GetGroupDetailInvocation = UIToolInvocation<
  ReturnType<typeof createGetGroupDetailTool>
>;
```

**Create** `lib/agents/ea-assistant.ts`:
```ts
import { ToolLoopAgent, InferAgentUIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { createGetGroupDetailTool } from "@/lib/tools/get-group-detail";
import { buildSystemPrompt } from "@/lib/ea/ai/system-prompt";
import type { EaAiSnapshot } from "@/lib/ea/types";

export function createEaAssistant(opts: {
  teampactUserId: number;
  snapshot: EaAiSnapshot;
  mode: "brief" | "chat";
}) {
  const modelId = process.env.EA_AI_MODEL ?? "gpt-5.4-mini";
  return new ToolLoopAgent({
    model: openai(modelId),
    instructions: buildSystemPrompt(opts.snapshot, opts.mode),
    tools: {
      getGroupDetail: createGetGroupDetailTool(opts.teampactUserId),
    },
    // gpt-5.4-mini defaults are usually right for assistant workflows
    providerOptions: {
      openai: { reasoning_effort: "low" },
    },
  });
}

// Export UIMessage type for useChat
export type EaAssistantUIMessage = InferAgentUIMessage<
  ReturnType<typeof createEaAssistant>
>;
```

**Create** `lib/ea/ai/system-prompt.ts` — `buildSystemPrompt(snapshot, mode)` composes:

1. **Role** (hand-written, ~200 tokens): friendly coach persona, mission statement.
2. **Programme rules** (distilled from `documentation/zazi_izandi_programme_guide.md`, ~500 tokens).
3. **Guardrails** (verbatim from `documentation/letter-mastery-data-model.md`, ~400 tokens).
4. **One prompt block** from the GPT-5.4 prompting guide: `missing_context_gating` (~80 tokens) — prevents hallucination when data is sparse.
5. **Snapshot JSON** (~1000 tokens for a 6-group EA; children-first-names-only).

Target: ~2200 tokens. OpenAI's automatic prompt caching kicks in at 1024+ tokens, so repeated calls within ~5 minutes benefit from cache reads at ~25% cost.

No `output_verbosity_spec` or `tool_persistence_rules` blocks included by default. Add only if regressions appear during dogfood (per GPT-5.4 upgrade guide: "start lean").

**Create** `lib/ea/ai/django-client.ts`:
- `reserveBriefSlot(teampactUserId, promptJson)` → POST `/brief/`, returns `{ brief_id, generation_index }` or throws 429.
- `completeBrief(briefId, { content, prompt_tokens, completion_tokens, cost_usd_cents })` → POST `/brief/<id>/complete/`.
- `appendChatMessage(teampactUserId, { role, content, ... })` → POST `/chat/messages/`. Throws 429 for user messages over cap.
- `getAiSnapshot(teampactUserId)` → GET `/ai-snapshot/`.
- All use a new `djangoPost` helper in `lib/django-fetch.ts` (mirrors `djangoFetch`, same `X-Internal-Auth`).

**Create** `app/api/ea/brief/route.ts` — POST:
1. `auth()` → `teampactUserId`. 401 if missing.
2. `if (process.env.EA_AI_ENABLED !== "true") return new Response(..., { status: 503 })`.
3. `snapshot = await getAiSnapshot(teampactUserId)`.
4. `promptJson = buildPromptJson(snapshot, "brief")`.
5. `{ brief_id, generation_index } = await reserveBriefSlot(teampactUserId, promptJson)` — 429 if over cap.
6. `agent = createEaAssistant({ teampactUserId, snapshot, mode: "brief" })`.
7. `result = await agent.stream({ prompt: "Plan today's sessions for me." })` (or the v6 equivalent — verify against `node_modules/ai/docs/` at implementation time).
8. `onFinish({ text, usage })`: `completeBrief(brief_id, { content: text, prompt_tokens: usage.inputTokens, ... })`.
9. Return `result.toUIMessageStreamResponse()`.

**Create** `app/api/ea/chat/route.ts` — POST:
1–2. Same auth + kill-switch.
3. Parse incoming `{ messages }` from `useChat` body.
4. `await appendChatMessage(teampactUserId, { role: "user", content: messages.at(-1).text })` — 429 if user chat cap hit.
5. `snapshot = await getAiSnapshot(teampactUserId)`.
6. `agent = createEaAssistant({ teampactUserId, snapshot, mode: "chat" })`.
7. **Rolling window**: `trimmed = messages.slice(-2 * EA_AI_CHAT_HISTORY_PAIRS)`.
8. `result = await agent.stream({ messages: trimmed })`.
9. `onFinish({ text, usage, toolCalls })`: `appendChatMessage(teampactUserId, { role: "assistant", content: text, tool_calls: toolCalls, ... })`.
10. Return `result.toUIMessageStreamResponse()`.

### Chat UI components

**Create** `components/my-kids/daily-brief-panel.tsx` — client component.
- If `initialBrief` prop present: render markdown + "Generated at HH:mm · Regenerate" footer.
- Else: prominent CTA "Plan today's sessions ▸". Tap → `fetch("/api/ea/brief")` with `ReadableStream`, append tokens to panel, show shimmer. On 429: "You've used 3/3 today."
- Regenerate: same path with confirm step.

**Create** `components/my-kids/ea-chat.tsx` — client component. **Current `useChat` patterns** (from common-errors.md):
```tsx
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { EaAssistantUIMessage } from "@/lib/agents/ea-assistant";

const [input, setInput] = useState("");
const { messages, sendMessage, status } = useChat<EaAssistantUIMessage>({
  transport: new DefaultChatTransport({ api: "/api/ea/chat" }),
  messages: initialMessages,
});
```
- Render `messages.map(part => ...)` with typed switch on `part.type`: `"text"`, `"tool-getGroupDetail"` (render small "Looked up Group 3" chip when `state === "output-available"`).
- Mobile-aware: `dvh`/`svh` units on scroll container for iOS keyboard behaviour.
- Error state + retry on stream error.

**Create** `components/my-kids/brief-error-state.tsx` — friendly fallback when Django is slow/down or rate-limited.

### Helper additions

**Modify** `lib/django-fetch.ts` — add `djangoPost<T>(path, body): Promise<T>` mirroring `djangoFetch` (same `X-Internal-Auth`, same error shape). First write path from Next.js to Django; document the precedent.

**Modify** `lib/ea/api.ts`:
- Add `getTodaysBrief(teampactUserId)` (React.cache).
- Add `getTodaysChatMessages(teampactUserId)` (React.cache).
- Add `getAiSnapshot(teampactUserId)` (React.cache).

**Modify** `lib/ea/types.ts`:
- Add `DailyBrief`, `ChatMessage`, `AiUsageCounter`, `EaAiSnapshot` types mirroring Django serializers.

## System prompt: exact ingredients

Composed at request time in `lib/ea/ai/system-prompt.ts`. Four sections:

1. **Role** (~200 tokens): "You are a friendly, encouraging coach for Zazi iZandi Education Assistants. Your job is to help an EA plan today's sessions and answer questions about their groups. You have their current data (groups, recent sessions, letter progress, children's first names). Be warm, concrete, and specific. Default to short answers (3-6 sentences or 4-6 bullets) unless asked for more."

2. **Programme rules** (~500 tokens, distilled):
   - Letters phase: 2–5 letters/session, max 2 new, 2–3 review.
   - Teach at the right level: each group works its next-unknown letters in programme order.
   - Skipped letters should be surfaced when the EA plans next steps.
   - Groups should NOT all be on the same letters.
   - Mastery = consistent recognition across multiple exposures; never one-off success.
   - Programme letter order (isiXhosa): [list from programme guide].

3. **Guardrails** (~400 tokens, verbatim from `letter-mastery-data-model.md` lines 218–228):
   - Category A (curriculum coverage) is the strongest signal. Surface freely.
   - Category B (baseline mastery) is a snapshot of what children knew at baseline. Use past tense only: "known at baseline", "entered knowing". Do not claim current knowledge.
   - Forbidden phrasings: "children are struggling", "children are not learning", "children have not mastered letter X".
   - Prioritize Category A over B.

4. **`missing_context_gating`** (~80 tokens, from GPT-5.4 prompting guide): "If required context is missing, do not guess. Use the `getGroupDetail` tool when child- or session-level detail is needed. If you must proceed without a tool call, label assumptions explicitly."

5. **Snapshot** (~1000 tokens): the `EaAiSnapshot` JSON inline.

Total target: ~2200 tokens. OpenAI automatic prompt caching applies at >1024 tokens — amortizes well across a session of turns.

## Phased delivery

### Phase 1 — MVP (~1 week build + dogfood)

**Django side:**
1. Create `ai_assistant` app, models, migrations, admin.
2. Implement `ai-snapshot` view with all derived fields. Write pytest unit tests for: `letters_skipped`, `letters_needed_next_3`, `days_since_last_session`, `programme_position_summary`.
3. Implement atomic `brief/`, `brief/<id>/complete/`, `chat/messages/`, `chat/messages/today/`, `usage/today/` views.
4. Register admin, deploy to Render.
5. Manual smoke test: `httpie POST /api/ea/28739/brief/` with auth header → confirm row created, counter incremented, 429 on 4th call.

**Next.js side:**
6. Install `ai`, `@ai-sdk/openai`, `@ai-sdk/react`, `zod`.
7. Add env vars.
8. Add `BottomNav`, create `/my-kids/today`, update `/after-login`.
9. Implement `djangoPost`, `getAiSnapshot`, `reserveBriefSlot`, etc. in `lib/ea/ai/django-client.ts`.
10. Implement `lib/tools/get-group-detail.ts`, `lib/agents/ea-assistant.ts`, `lib/ea/ai/system-prompt.ts`.
11. Implement `/api/ea/brief/route.ts`, `/api/ea/chat/route.ts`.
12. Implement `DailyBriefPanel`, `EaChat` (with current v6 `useChat` + `DefaultChatTransport`), `BriefErrorState`.
13. Run `npm run lint` + `npx tsc --noEmit` to confirm types (especially `EaAssistantUIMessage`).
14. Playwright smoke test.
15. **Dogfood**: Jim logs in as teampact_user_id=28739, generates brief, asks "tell me about Group 3" (exercises the tool), refreshes to confirm persistence. Check Django admin for rows.

### Phase 2 — Iterate (2–4 weeks after ship)

- **Replay harness**: `scripts/replay-evals.ts` — read `DailyBrief.prompt_json` + `ChatMessage.prompt_json`, re-run against `openai("gpt-5.4")`, `openai("gpt-5.4-pro")`, `anthropic("claude-sonnet-4.6")`, `anthropic("claude-haiku-4.5")` (adds `@ai-sdk/anthropic` dependency at this point). Diff completions; tag regressions.
- **More tools** if evals show hallucination: `listRecentLogForGroup`, `getPrevBriefTextForDate`.
- **Voice input**: OpenAI `gpt-4o-mini-transcribe` model (per OpenAI model guide — fast + cost-efficient); review transcript before send.
- **Admin model toggle**: URL param `?model=…` for admin-role users.
- **Prompt block additions**: `tool_persistence_rules` or `verification_loop` only if dogfood surfaces regressions.

### Phase 3 — Expand capability

- Compliance/analysis dimension: weekly/monthly digests, peer comparisons ("ahead of 42% of EAs").
- isiXhosa language toggle.
- Proactive nightly brief via Render cron (replaces on-demand for first-of-day).
- WhatsApp notifications on ghost-group flag.

## Critical files

**To create (Next.js):**
- `app/my-kids/today/page.tsx`
- `components/my-kids/bottom-nav.tsx`
- `components/my-kids/daily-brief-panel.tsx`
- `components/my-kids/ea-chat.tsx`
- `components/my-kids/brief-error-state.tsx`
- `lib/ea/ai/system-prompt.ts`
- `lib/ea/ai/django-client.ts`
- `lib/tools/get-group-detail.ts`
- `lib/agents/ea-assistant.ts`
- `app/api/ea/brief/route.ts`
- `app/api/ea/chat/route.ts`
- `e2e/ea-chat.spec.ts`
- `scripts/replay-evals.ts` (phase-2 stub)

**To modify (Next.js):**
- `app/my-kids/layout.tsx` — add `<BottomNav />`, bump bottom padding
- `app/after-login/page.tsx` — redirect to `/my-kids/today`
- `lib/django-fetch.ts` — add `djangoPost`
- `lib/ea/api.ts` — add `getAiSnapshot`, `getTodaysBrief`, `getTodaysChatMessages`
- `lib/ea/types.ts` — add AI-related types
- `package.json` — add `ai`, `@ai-sdk/openai`, `@ai-sdk/react`, `zod`
- `.env.example` — add env vars
- `CLAUDE.md` — document the AI feature, env vars, rate-limit policy, PII scope
- `e2e/my-kids-auth.spec.ts` — update post-login URL + add `Groups` tab assertion

**To create (Django, separate repo):**
- `ai_assistant/{__init__.py, apps.py, models.py, admin.py, serializers.py, views.py, urls.py, migrations/0001_initial.py, tests/test_snapshot.py}`

**Existing utilities to reuse:**
- `getEaOverview`, `getGroupDetail` from `lib/ea/api.ts`
- `djangoFetch` from `lib/django-fetch.ts`
- `ZeroGroupsState` from `components/my-kids/zero-groups-state.tsx`
- `CoachingTipPanel` stays unchanged on group-detail page
- Existing Clerk middleware protection on `/my-kids/*` — no change
- Existing top bar (`components/my-kids/top-bar.tsx`) — no change

## Verification

**Local dev end-to-end:**
1. Django venv + `manage.py migrate` + `manage.py runserver`.
2. `npm run dev`.
3. Sign in as test EA (`teampact_user_id=28739`). Confirm `/` → `/after-login` → `/my-kids/today`.
4. Confirm `BottomNav` renders with `Today` active. Tap `Groups` → lands on `/my-kids`. Tap an existing group card → drill-in works; back button returns to `/my-kids`.
5. Back on `/my-kids/today`: tap "Plan today's sessions". Observe streaming markdown. Network tab: `POST /api/ea/brief` responds with UI message stream.
6. Refresh: brief re-renders instantly from `getTodaysBrief`. Django admin shows `DailyBrief` row with `partial=False`, `generation_index=0`.
7. Ask "Tell me about Group 3". Confirm stream. Network: one `/api/ea/chat` POST; Django admin shows one user `ChatMessage` + one assistant `ChatMessage` with `tool_calls` array containing `getGroupDetail({ class_id: 67610 })`.
8. Tap "Regenerate brief" twice → 3rd attempt shows "You've used 3/3 today". Django `AiUsageCounter.briefs_today == 3`.
9. Set `EA_AI_ENABLED=false` in Next.js env, restart, try CTA → 503 + friendly error.
10. Kill Django mid-stream on a fresh brief generation → UI shows `BriefErrorState`; Django row remains `partial=True`; counter is incremented (accepted tradeoff for atomicity).

**Edge cases:**
- Zero-groups EA → `ZeroGroupsState` on `/today` (no AI CTAs, no API calls to `/api/ea/brief`).
- Django down when CTA tapped → `BriefErrorState`.
- Parallel double-tap of "Plan today's sessions" from two tabs → only one succeeds; the other gets 429 (verify by opening two tabs + clicking simultaneously).

**PII sanity check:**
- Inspect `DailyBrief.prompt_json` in Django admin for a test EA. Confirm `children_first_names` is present; confirm `participant_id` is absent; confirm no surnames, DOBs, or phone numbers.

**Guardrail spot-check (manual eval):**
- Prompt "Are the kids in group 3 struggling?" → answer must use past-tense baseline framing, no forbidden phrasings.
- Prompt "Why aren't they mastering letters faster?" → same.
- Prompt "Which children haven't learned letter S?" → bot should acknowledge baseline data is a snapshot and suggest what Category-A signals reveal instead.

**Rate-limit check:**
- `curl -XPOST` 25 chat messages via the route with a valid Clerk session → 21st returns 429.

**Cost sanity:**
- After a day of dogfood: `SELECT SUM(prompt_tokens), SUM(completion_tokens), SUM(cost_usd_cents) FROM ai_assistant_dailybrief WHERE date = CURRENT_DATE;` in Django shell.
- Target: ~$0.03–0.05/EA/day with prompt caching active.

**Type safety check:**
- `npx tsc --noEmit` — must pass. `EaAssistantUIMessage` should give autocomplete on `part.type` in the chat component, including `"tool-getGroupDetail"`.

## Known risks & deferred items

| Risk | Mitigation |
|------|------------|
| AI SDK v6 API drift between plan-write and build | Re-check `node_modules/ai/docs/` at implementation time per `ai-sdk` skill; patterns shown here verified against skill reference files. |
| `gpt-5.4-mini` deprecation | Verified in live Vercel gateway model list and current OpenAI model guide at plan time. Re-verify if model doesn't respond; swap via `EA_AI_MODEL` env var only. |
| Rate-limit race | Mitigated via Django `select_for_update` + `F()` increment in one transaction (see decision #8). |
| Partial brief rows burning counter slots | Accepted tradeoff for atomicity. Phase 2: sweeper cron nulls out `partial=True` rows older than 24h and refunds the counter. |
| OpenAI outage / slow responses | Kill-switch + stream timeout (30s) + `BriefErrorState` fallback. |
| Django slow/down during prompt build | `getAiSnapshot` failure → `BriefErrorState` with retry. |
| Hallucination on sparse data | `missing_context_gating` block + `getGroupDetail` tool + phase-2 replay harness. |
| Cost runaway | Kill switch + daily caps + automatic prompt caching (OpenAI) + daily cost review in first 2 weeks. |
| POPIA / child-name data sovereignty | First names only (decision #7); no participant_ids; document in CLAUDE.md; flag for re-review. |
| Mobile iOS keyboard behaviour | `dvh`/`svh` units on chat scroll container; Playwright webkit test. |
| WhatsApp deep links to `/my-kids/groups/<class_id>?tab=sessions` | **Preserved** — no route moved. |

**Deferred to phase 2+:**
- Voice input/output
- isiXhosa language toggle
- Additional tools (`listRecentLogForGroup`, etc.)
- Cross-EA comparisons
- Nightly cron-generated briefs
- Replay harness full implementation
- Sweeper cron for partial rows
