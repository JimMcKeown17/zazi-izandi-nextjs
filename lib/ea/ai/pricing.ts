/**
 * Cost estimation for OpenAI usage. Prices are USD per 1M tokens from
 * the OpenAI pricing page at plan time — the exact billable amount is
 * what OpenAI invoices, so treat these as approximations for the
 * DailyBrief/ChatMessage.cost_usd_cents field (used for cost sanity
 * queries, not for billing).
 *
 * Update when OpenAI revises pricing or when adding new models.
 */

// USD per 1,000,000 tokens. Expand when new models are introduced.
const PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "gpt-5.4-mini": { inputPer1M: 0.25, outputPer1M: 2.0 },
  "gpt-5.4": { inputPer1M: 2.5, outputPer1M: 10.0 },
  "gpt-5.4-pro": { inputPer1M: 15.0, outputPer1M: 60.0 },
  "gpt-5.4-nano": { inputPer1M: 0.1, outputPer1M: 0.4 },
};

export function estimateCostCents(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const price = PRICING[modelId];
  if (!price) return null;
  const dollars =
    (inputTokens * price.inputPer1M + outputTokens * price.outputPer1M) /
    1_000_000;
  // Round up to the nearest cent. Never report 0 for nonzero usage.
  const cents = Math.ceil(dollars * 100);
  return Math.max(cents, inputTokens + outputTokens > 0 ? 1 : 0);
}
