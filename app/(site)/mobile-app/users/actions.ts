"use server";

import { requireMobileCapability } from "@/lib/mobile/auth";
import { passwordRecoveryEnabledFor } from "@/lib/mobile/password-recovery-access";
import { djangoPost } from "@/lib/django-fetch";
import { canonicalOperationId } from "@/lib/ea-set-password/contract";

export type PasswordRecoveryResult = {
  kind: "mail_accepted" | "unconfirmed" | "refused" | "unauthorized";
};

export async function requestMobilePasswordReset(
  input: { userId: string; operationId: string },
): Promise<PasswordRecoveryResult> {
  // Never trust a hidden button or a client-supplied actor as authorization.
  const session = await requireMobileCapability("mobile.accounts.recover");
  if (!input || Object.keys(input).length !== 2 ||
      typeof input.userId !== "string" || typeof input.operationId !== "string" ||
      !canonicalOperationId(input.userId) || !canonicalOperationId(input.operationId)) {
    return { kind: "refused" };
  }
  if (!passwordRecoveryEnabledFor(input.userId)) return { kind: "refused" };
  try {
    const token = await session.getToken();
    if (!token) return { kind: "unauthorized" };
    const response = await djangoPost("/api/mobile/accounts/password-setup/request/", {
      operation_id: input.operationId,
      user_id: input.userId,
    }, { headers: { Authorization: `Bearer ${token}` }, redirect: "manual", signal: AbortSignal.timeout(20000) });
    if ([401, 403].includes(response.status)) return { kind: "unauthorized" };
    if (![202, 409, 503].includes(response.status)) return { kind: "unconfirmed" };
    // Do not expose response bodies or provider errors to the client component.
    const reader = response.body?.getReader();
    if (!reader) return { kind: "unconfirmed" };
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let raw = "";
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 4096) return { kind: "unconfirmed" };
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) return { kind: "unconfirmed" };
    if (response.status === 202 && Object.keys(body).length === 2 &&
        body.operation_id === input.operationId && body.kind === "mail_accepted") {
      return { kind: "mail_accepted" };
    }
    if (response.status === 409 && Object.keys(body).length === 1 && body.kind === "refused") {
      return { kind: "refused" };
    }
    return { kind: "unconfirmed" };
  } catch {
    return { kind: "unconfirmed" };
  }
}
