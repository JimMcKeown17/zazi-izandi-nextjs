import { capturePasswordCallback, type CapturedPasswordCallback } from "./callback";
import { SAFE_MESSAGES, type PasswordJourneyResult } from "./contract";
import type { PasswordJourney } from "./journey";

export type PasswordJourneyBootstrap =
  | { journey: PasswordJourney; callback: CapturedPasswordCallback; result: null }
  | { journey: null; callback: null; result: PasswordJourneyResult };

/**
 * Keeps browser URL cleanup independent of client construction. A malformed
 * public configuration must not leave an invite/recovery URL in history.
 */
export function bootstrapPasswordJourney(input: {
  href: string;
  scrubOriginalCallbackUrl: () => void;
  createJourney: (callback: CapturedPasswordCallback) => PasswordJourney;
}): PasswordJourneyBootstrap {
  const callback = capturePasswordCallback(input.href);
  if (!callback) {
    return {
      journey: null,
      callback: null,
      result: { kind: "terminal_error", code: "invalid_link", message: SAFE_MESSAGES.invalidLink },
    };
  }
  try {
    // This must remain synchronous and precede any Supabase client/provider I/O.
    input.scrubOriginalCallbackUrl();
  } catch {
    return {
      journey: null,
      callback: null,
      result: { kind: "terminal_error", code: "unavailable", message: SAFE_MESSAGES.unavailable },
    };
  }
  try {
    return { journey: input.createJourney(callback), callback, result: null };
  } catch {
    return {
      journey: null,
      callback: null,
      result: { kind: "terminal_error", code: "unavailable", message: SAFE_MESSAGES.unavailable },
    };
  }
}
