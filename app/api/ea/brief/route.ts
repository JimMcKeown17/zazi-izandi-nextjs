/**
 * POST /api/ea/brief
 *
 * Streams a newly-generated daily brief back to the client (as a UI Message
 * stream). Flow:
 *   1. Auth via Clerk; extract `teampact_user_id` from session publicMetadata.
 *   2. Global kill-switch (`EA_AI_ENABLED`).
 *   3. Fetch Django ai-snapshot (source of truth for the prompt).
 *   4. Atomic reserve a DailyBrief row in Django. 429 if capped.
 *   5. streamText with `openai("gpt-5.4-mini")`. onFinish persists content +
 *      tokens + cost to Django via `completeBrief`.
 *   6. Return `result.toUIMessageStreamResponse()`.
 *
 * Pricing math for cost_usd_cents: OpenAI lists gpt-5.4-mini at USD per 1M
 * tokens. We store in USD cents (rounded up). Numbers are plan-time
 * estimates; the exact billable amount is what OpenAI actually invoices.
 */
import { auth } from "@clerk/nextjs/server";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

import { getAiSnapshot } from "@/lib/ea/api";
import { buildSystemPrompt } from "@/lib/ea/ai/system-prompt";
import { createGetGroupDetailTool } from "@/lib/tools/get-group-detail";
import {
  completeBrief,
  reserveBriefSlot,
} from "@/lib/ea/ai/django-client";
import { resolveModelId } from "@/lib/agents/ea-assistant";
import { estimateCostCents } from "@/lib/ea/ai/pricing";

type EaSessionMetadata = {
  role?: string;
  teampact_user_id?: number;
};

export async function POST(): Promise<Response> {
  // 1. Auth
  const { sessionClaims } = await auth();
  const metadata = (sessionClaims?.metadata ?? {}) as EaSessionMetadata;
  const teampactUserId = metadata.teampact_user_id;
  if (!teampactUserId || metadata.role !== "ea") {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Kill switch
  if (process.env.EA_AI_ENABLED !== "true") {
    return Response.json(
      { error: "ai_disabled" },
      { status: 503 },
    );
  }

  // 3. Snapshot
  const snapshotResult = await getAiSnapshot(teampactUserId);
  if (!snapshotResult.ok) {
    return Response.json(
      { error: "snapshot_unavailable", details: snapshotResult.error },
      { status: 502 },
    );
  }
  const snapshot = snapshotResult.data;
  if (snapshot.groups.length === 0) {
    return Response.json(
      { error: "no_groups" },
      { status: 400 },
    );
  }

  // 4. Atomic reserve (429 if over cap)
  const modelId = resolveModelId();
  const promptJson = {
    mode: "brief" as const,
    snapshot,
  };
  const reservation = await reserveBriefSlot(teampactUserId, {
    model: modelId,
    prompt_json: promptJson,
  });
  if (!reservation.ok) {
    const status = reservation.status ?? 500;
    return Response.json(
      {
        error: reservation.error,
        cap: reservation.cap,
        current: reservation.current,
      },
      { status },
    );
  }
  const { brief_id } = reservation;

  // 5. Stream
  const result = streamText({
    model: openai(modelId),
    system: buildSystemPrompt(snapshot, "brief"),
    prompt: "Plan today's sessions for me.",
    tools: {
      getGroupDetail: createGetGroupDetailTool(teampactUserId),
    },
    providerOptions: {
      openai: { reasoningEffort: "low" },
    },
    async onFinish({ text, usage }) {
      const inputTokens = usage?.inputTokens ?? null;
      const outputTokens = usage?.outputTokens ?? null;
      const cost =
        inputTokens != null && outputTokens != null
          ? estimateCostCents(modelId, inputTokens, outputTokens)
          : null;
      await completeBrief(teampactUserId, brief_id, {
        content: text,
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        cost_usd_cents: cost,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
