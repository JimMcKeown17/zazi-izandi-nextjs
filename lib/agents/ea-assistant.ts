/**
 * EA Assistant agent definition (AI SDK v6, direct OpenAI provider).
 *
 * The agent is constructed per-request with:
 *   - teampact_user_id (closure-scopes the getGroupDetail tool)
 *   - a Django-computed snapshot (injected into the system prompt)
 *   - a mode ("brief" | "chat")
 *
 * Why per-request: the snapshot is the EA's current state; stale snapshots
 * would produce stale plans. The agent itself is cheap to construct — it's
 * a configuration object, not a persistent connection.
 */
import { openai } from "@ai-sdk/openai";
import { InferAgentUIMessage, ToolLoopAgent } from "ai";

import { createGetGroupDetailTool } from "@/lib/tools/get-group-detail";
import type { EaAiSnapshot } from "@/lib/ea/types";
import { buildSystemPrompt, type PromptMode } from "@/lib/ea/ai/system-prompt";

export const DEFAULT_EA_AI_MODEL = "gpt-5.4-mini";

export function resolveModelId(): string {
  return process.env.EA_AI_MODEL || DEFAULT_EA_AI_MODEL;
}

export function createEaAssistant(opts: {
  teampactUserId: number;
  snapshot: EaAiSnapshot;
  mode: PromptMode;
}) {
  return new ToolLoopAgent({
    model: openai(resolveModelId()),
    instructions: buildSystemPrompt(opts.snapshot, opts.mode),
    tools: {
      getGroupDetail: createGetGroupDetailTool(opts.teampactUserId),
    },
    providerOptions: {
      openai: {
        // gpt-5.4-mini handles assistant workflows well at low reasoning.
        // Bump to "medium" only if dogfood surfaces regressions.
        reasoning_effort: "low",
      },
    },
  });
}

export type EaAssistantUIMessage = InferAgentUIMessage<
  ReturnType<typeof createEaAssistant>
>;
