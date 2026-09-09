import "server-only";

import { canonicalOperationId } from "@/lib/ea-set-password/contract";

/** Web rollout only. Django still independently authorizes every request.
 * Unset/invalid: disabled. Canonical UUID: one controlled account. `all`: reviewed release.
 */
export function passwordRecoveryEnabledFor(userId: string): boolean {
  if (typeof userId !== "string" || !canonicalOperationId(userId)) return false;
  const scope = process.env.ZZ_PASSWORD_RECOVERY_SCOPE;
  return scope === "all" || (typeof scope === "string" && canonicalOperationId(scope) === userId);
}

/** The controlled test page is unavailable during a general rollout. */
export function controlledPasswordRecoveryUserId(): string | null {
  return canonicalOperationId(process.env.ZZ_PASSWORD_RECOVERY_SCOPE);
}
