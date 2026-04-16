/**
 * POST /api/ea/chat
 *
 * Streams one chat turn. Flow:
 *   1. Auth via Clerk; teampact_user_id from publicMetadata.
 *   2. Kill switch.
 *   3. Parse `messages` from useChat body.
 *   4. Append user turn to Django (atomic 429 if chat cap hit).
 *   5. Fetch snapshot; build system prompt.
 *   6. Rolling window: keep last N user/assistant pairs only.
 *   7. streamText with getGroupDetail tool. onFinish appends assistant turn.
 *   8. Return `result.toUIMessageStreamResponse()`.
 */
import { auth } from "@clerk/nextjs/server";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";

import { getAiSnapshot } from "@/lib/ea/api";
import { buildSystemPrompt } from "@/lib/ea/ai/system-prompt";
import { createGetGroupDetailTool } from "@/lib/tools/get-group-detail";
import { appendChatMessage } from "@/lib/ea/ai/django-client";
import { resolveModelId } from "@/lib/agents/ea-assistant";
import { estimateCostCents } from "@/lib/ea/ai/pricing";

type EaSessionMetadata = {
  role?: string;
  teampact_user_id?: number;
};

function defaultHistoryPairs(): number {
  const raw = process.env.EA_AI_CHAT_HISTORY_PAIRS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 6;
}

function messageText(m: UIMessage): string {
  // Flatten UIMessage parts to a text payload; non-text parts are ignored
  // for the purposes of rate-limit logging. The model still sees the full
  // structured message via convertToModelMessages below.
  const parts = (m.parts ?? []) as Array<{ type: string; text?: string }>;
  return parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text ?? "")
    .join("");
}

export async function POST(req: Request): Promise<Response> {
  // 1. Auth
  const { sessionClaims } = await auth();
  const metadata = (sessionClaims?.metadata ?? {}) as EaSessionMetadata;
  const teampactUserId = metadata.teampact_user_id;
  if (!teampactUserId || metadata.role !== "ea") {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Kill switch
  if (process.env.EA_AI_ENABLED !== "true") {
    return Response.json({ error: "ai_disabled" }, { status: 503 });
  }

  // 3. Parse body
  let body: { messages?: UIMessage[] };
  try {
    body = (await req.json()) as { messages?: UIMessage[] };
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const messages = body.messages ?? [];
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  if (!lastUserMessage) {
    return Response.json({ error: "no_user_message" }, { status: 400 });
  }
  const userText = messageText(lastUserMessage);
  if (!userText.trim()) {
    return Response.json({ error: "empty_user_message" }, { status: 400 });
  }

  // 4. Atomic append user turn (429 if capped)
  const modelId = resolveModelId();
  const userAppend = await appendChatMessage(teampactUserId, {
    role: "user",
    content: userText,
  });
  if (!userAppend.ok) {
    const status = userAppend.status ?? 500;
    return Response.json(
      {
        error: userAppend.error,
        cap: userAppend.cap,
        current: userAppend.current,
      },
      { status },
    );
  }

  // 5. Snapshot + prompt
  const snapshotResult = await getAiSnapshot(teampactUserId);
  if (!snapshotResult.ok) {
    return Response.json(
      { error: "snapshot_unavailable", details: snapshotResult.error },
      { status: 502 },
    );
  }
  const snapshot = snapshotResult.data;

  // 6. Rolling window: keep last N * 2 UI messages (one user + one assistant per pair)
  const historyPairs = defaultHistoryPairs();
  const trimmed = messages.slice(-historyPairs * 2);

  // 7. Stream
  const modelMessages = await convertToModelMessages(trimmed);
  const result = streamText({
    model: openai(modelId),
    system: buildSystemPrompt(snapshot, "chat"),
    messages: modelMessages,
    tools: {
      getGroupDetail: createGetGroupDetailTool(teampactUserId),
    },
    providerOptions: {
      openai: { reasoningEffort: "low" },
    },
    async onFinish({ text, usage, toolCalls }) {
      const inputTokens = usage?.inputTokens ?? null;
      const outputTokens = usage?.outputTokens ?? null;
      const cost =
        inputTokens != null && outputTokens != null
          ? estimateCostCents(modelId, inputTokens, outputTokens)
          : null;
      await appendChatMessage(teampactUserId, {
        role: "assistant",
        content: text,
        model: modelId,
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        cost_usd_cents: cost,
        prompt_json: { mode: "chat", snapshot, history_pairs: historyPairs },
        tool_calls: toolCalls ?? null,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
