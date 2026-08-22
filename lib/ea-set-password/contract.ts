export const PERMITTED_SUPABASE_PROJECT_REF = "yaclyyurdwarhmiheojr";

const CANONICAL_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function canonicalOperationId(candidate: string | null | undefined): string | null {
  if (!candidate || !CANONICAL_UUID_PATTERN.test(candidate)) return null;
  return candidate;
}

export type OperationCandidate =
  | { kind: "absent" }
  | { kind: "valid"; operationId: string }
  | { kind: "invalid" };

/** A non-empty candidate is evidence-bearing input, never a query-mode hint. */
export function parseOperationCandidate(candidate: string | null | undefined): OperationCandidate {
  if (candidate == null) return { kind: "absent" };
  const operationId = canonicalOperationId(candidate);
  return operationId ? { kind: "valid", operationId } : { kind: "invalid" };
}

/** A user-safe outcome. It deliberately never includes provider error text. */
export type PasswordJourneyResult =
  | { kind: "ready" }
  | { kind: "success"; message: string }
  | { kind: "recoverable_error"; code: "password_mismatch" | "weak_password"; message: string }
  | { kind: "terminal_error"; code: "invalid_link" | "completion_unconfirmed" | "unavailable"; message: string };

export const SAFE_MESSAGES = {
  ready: "Choose a new password to continue.",
  success: "Your password has been updated. You can now sign in to the Zazi iZandi app.",
  passwordMismatch: "The two passwords do not match. Please try again.",
  weakPassword: "Choose a stronger password, then try again.",
  invalidLink: "This password link is no longer valid. Request a new password link and try again.",
  completionUnconfirmed:
    "Your password was changed, but we could not confirm the secure completion step. Please contact support before signing in.",
  unavailable: "We could not update your password right now. Please request a new link and try again.",
} as const;
