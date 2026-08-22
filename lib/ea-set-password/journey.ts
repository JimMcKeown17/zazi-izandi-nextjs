import {
  parseOperationCandidate,
  SAFE_MESSAGES,
  type PasswordJourneyResult,
} from "./contract";

type ProviderError = { code?: string; message?: string } | null;

export type TemporaryPasswordSession = { access_token: string };

export type PasswordAuthBoundary = {
  getSession(): Promise<{ data: { session: TemporaryPasswordSession | null }; error: ProviderError }>;
  updateUser(attributes: { password: string }): Promise<{ error: ProviderError }>;
  signOut(options: { scope: "local" }): Promise<unknown>;
  onAuthStateChange(listener: (event: string, session: TemporaryPasswordSession | null) => void): () => void;
};

export type CompletionBoundary = (request: {
  operationId: string;
  bearer: string;
}) => Promise<{ ok: boolean }>;

export type PasswordJourney = {
  capture(operationIdCandidate: string | null | undefined): Promise<PasswordJourneyResult>;
  submit(password: string, confirmation: string): Promise<PasswordJourneyResult>;
};

function waitOneProviderTurn(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

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
  clearUrl: () => void;
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
    async capture(operationIdCandidate) {
      // Capture the non-secret candidate first. URL scrubbing is deliberately
      // deferred until auth-js has consumed or rejected its URL session.
      const candidate = parseOperationCandidate(operationIdCandidate);
      operationId = candidate.kind === "valid" ? candidate.operationId : null;

      // A recovery link is not distinguished by its URL alone. Supabase emits
      // PASSWORD_RECOVERY only for a verified recovery redirect. Operation
      // candidates still require Django's exact UUID/kind/state validation.
      let unsubscribe: (() => void) | null = null;
      let subscriptionRegistered = false;
      let outcome: PasswordJourneyResult = {
        kind: "terminal_error",
        code: "invalid_link",
        message: SAFE_MESSAGES.invalidLink,
      };
      try {
        let recoverySession: TemporaryPasswordSession | null = null;
        let resolveRecoveryEvent: (() => void) | null = null;
        const recoveryEvent = new Promise<void>((resolve) => {
          resolveRecoveryEvent = resolve;
        });
        try {
          unsubscribe = dependencies.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY" && session?.access_token) {
              recoverySession = session;
              resolveRecoveryEvent?.();
            }
          });
          subscriptionRegistered = true;
        } catch {
          await discardSession();
        }

        if (subscriptionRegistered && !unsubscribe) {
          await discardSession();
        } else if (unsubscribe) {
          let result: {
            data: { session: TemporaryPasswordSession | null };
            error: ProviderError;
          } | null = null;
          try {
            result = await dependencies.auth.getSession();
            // auth-js schedules PASSWORD_RECOVERY after it has saved the URL
            // session. Give that scheduled provider turn a bounded opportunity
            // to arrive before deciding an operation-less link is invalid.
            if (!operationId) {
              await Promise.race([recoveryEvent, waitOneProviderTurn()]);
            }
          } catch {
            // The shared result validation below performs one local discard.
          }

          if (!result || result.error || !result.data.session?.access_token) {
            await discardSession();
          } else if (candidate.kind === "invalid") {
            await discardSession();
          } else if (!operationId && !recoverySession) {
            await discardSession();
          } else {
            temporarySession = recoverySession ?? result.data.session;
            outcome = { kind: "ready" };
          }
        }
      } finally {
        // Never leave credentials or an operation candidate in history after
        // the provider capture attempt, including terminal rejection.
        try {
          unsubscribe?.();
        } catch {
          // Local reference disposal and URL cleanup remain mandatory.
        }
        try {
          dependencies.clearUrl();
        } catch {
          // URL credential removal is a hard gate: do not expose a usable form
          // when browser history could still retain provider credentials.
          await discardSession();
          outcome = {
            kind: "terminal_error",
            code: "invalid_link",
            message: SAFE_MESSAGES.invalidLink,
          };
        }
      }
      return outcome;
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
        // Provider-proved self-service recovery must never hit Django.
        await discardSession();
      }

      return { kind: "success", message: SAFE_MESSAGES.success };
    },
  };
}
