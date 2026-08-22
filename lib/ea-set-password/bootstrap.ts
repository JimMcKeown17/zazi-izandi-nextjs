import { SAFE_MESSAGES, type PasswordJourneyResult } from "./contract";
import type { PasswordJourney } from "./journey";

export type PasswordJourneyBootstrap =
  | { journey: PasswordJourney; operationCandidate: string | null; result: null }
  | { journey: null; operationCandidate: null; result: PasswordJourneyResult };

/**
 * Keeps browser URL cleanup independent of client construction. A malformed
 * public configuration must not leave an invite/recovery URL in history.
 */
export function bootstrapPasswordJourney(input: {
  search: string;
  clearUrl: () => void;
  createJourney: () => PasswordJourney;
}): PasswordJourneyBootstrap {
  const operationCandidates = new URLSearchParams(input.search).getAll("operation_id");
  const operationCandidate =
    operationCandidates.length <= 1
      ? (operationCandidates[0] ?? null)
      : "duplicate-operation-id-is-invalid";
  try {
    return { journey: input.createJourney(), operationCandidate, result: null };
  } catch {
    try {
      input.clearUrl();
    } catch {
      // Client construction already failed, so no journey or usable form is
      // returned even when the browser refuses the history replacement.
    }
    return {
      journey: null,
      operationCandidate: null,
      result: { kind: "terminal_error", code: "unavailable", message: SAFE_MESSAGES.unavailable },
    };
  }
}
