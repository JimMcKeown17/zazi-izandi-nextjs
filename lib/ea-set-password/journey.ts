import {
  parseOperationCandidate,
  SAFE_MESSAGES,
  type PasswordJourneyResult,
} from "./contract";
import type { CapturedPasswordCallback } from "./callback";

type ProviderError = { code?: string; message?: string } | null;

export type TemporaryPasswordSession = { access_token: string };

export type PasswordAuthBoundary = {
  setSession(tokens: { access_token: string; refresh_token: string }): Promise<{
    data: { session: TemporaryPasswordSession | null; user: object | null };
    error: ProviderError;
  }>;
  updateUser(attributes: { password: string }): Promise<{ error: ProviderError }>;
  signOut(options: { scope: "local" }): Promise<unknown>;
};

export type CompletionBoundary = (request: {
  operationId: string;
  bearer: string;
}) => Promise<{ ok: boolean }>;

export type PasswordJourney = {
  capture(callback: CapturedPasswordCallback): Promise<PasswordJourneyResult>;
  submit(password: string, confirmation: string): Promise<PasswordJourneyResult>;
};

function isWeakPassword(error: ProviderError): boolean {
  const code = error?.code?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";
  return code.includes("weak") || message.includes("password should") || message.includes("weak password");
}

/**
 * Keeps the transient bearer in a closure only. No page state, URL, storage,
 * error, or completion body can read it back.
 */
export function createPasswordJourney(dependencies: {
  auth: PasswordAuthBoundary;
  completion: CompletionBoundary;
}): PasswordJourney {
  let temporarySession: TemporaryPasswordSession | null = null;
  let operationId: string | null = null;

  async function discardSession(): Promise<void> {
    temporarySession = null;
    operationId = null;
    try {
      await dependencies.auth.signOut({ scope: "local" });
    } catch {
      // The local reference is already discarded. Never surface provider text.
    }
  }

  return {
    async capture(callback) {
      const candidate = parseOperationCandidate(callback.operationCandidate);
      operationId = candidate.kind === "valid" ? candidate.operationId : null;
      if (candidate.kind === "invalid") {
        await discardSession();
        return { kind: "terminal_error", code: "invalid_link", message: SAFE_MESSAGES.invalidLink };
      }
      try {
        const result = await dependencies.auth.setSession({
          access_token: callback.accessToken,
          refresh_token: callback.refreshToken,
        });
        if (result.error || !result.data.session?.access_token || !result.data.user) {
          await discardSession();
          return { kind: "terminal_error", code: "invalid_link", message: SAFE_MESSAGES.invalidLink };
        }
        if (!operationId && callback.callbackType !== "recovery") {
          await discardSession();
          return { kind: "terminal_error", code: "invalid_link", message: SAFE_MESSAGES.invalidLink };
        }
        temporarySession = result.data.session;
        return { kind: "ready" };
      } catch {
        await discardSession();
        return { kind: "terminal_error", code: "invalid_link", message: SAFE_MESSAGES.invalidLink };
      }
    },

    async submit(password, confirmation) {
      if (!temporarySession) {
        return { kind: "terminal_error", code: "invalid_link", message: SAFE_MESSAGES.invalidLink };
      }
      if (password !== confirmation) {
        return {
          kind: "recoverable_error",
          code: "password_mismatch",
          message: SAFE_MESSAGES.passwordMismatch,
        };
      }

      let updateResult: { error: ProviderError };
      try {
        updateResult = await dependencies.auth.updateUser({ password });
      } catch {
        await discardSession();
        return { kind: "terminal_error", code: "unavailable", message: SAFE_MESSAGES.unavailable };
      }
      if (updateResult.error) {
        if (isWeakPassword(updateResult.error)) {
          return { kind: "recoverable_error", code: "weak_password", message: SAFE_MESSAGES.weakPassword };
        }
        await discardSession();
        return { kind: "terminal_error", code: "unavailable", message: SAFE_MESSAGES.unavailable };
      }

      if (operationId) {
        let completion: { ok: boolean };
        try {
          completion = await dependencies.completion({
            operationId,
            bearer: temporarySession.access_token,
          });
        } catch {
          completion = { ok: false };
        }
        await discardSession();
        if (!completion.ok) {
          return {
            kind: "terminal_error",
            code: "completion_unconfirmed",
            message: SAFE_MESSAGES.completionUnconfirmed,
          };
        }
      } else {
        // Provider-validated self-service recovery must never hit Django.
        await discardSession();
      }

      return { kind: "success", message: SAFE_MESSAGES.success };
    },
  };
}
