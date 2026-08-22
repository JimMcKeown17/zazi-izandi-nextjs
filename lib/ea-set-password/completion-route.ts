import { djangoPost } from "@/lib/django-fetch";

import { canonicalOperationId } from "./contract";

type DjangoPost = typeof djangoPost;

type CompletionResponse =
  | { kind: "provisioning_completed"; operation_id: string }
  | { kind: "recovery_completed"; operation_id: string };

function isCompletionResponse(payload: unknown, operationId: string): payload is CompletionResponse {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const value = payload as Record<string, unknown>;
  return (
    Object.keys(value).length === 2 &&
    (value.kind === "provisioning_completed" || value.kind === "recovery_completed") &&
    value.operation_id === operationId
  );
}

export type PasswordCompletionRouteResult =
  | { status: 200; body: { kind: "completed" } }
  | { status: 400 | 401 | 502; body: { kind: "invalid_request" | "completion_unconfirmed" } };

/** Server-only boundary: forwards a temporary bearer in a header, never a URL/body. */
export async function forwardPasswordCompletion(
  request: Request,
  post: DjangoPost = djangoPost
): Promise<PasswordCompletionRouteResult> {
  const authorization = request.headers.get("authorization");
  if (!authorization || !/^Bearer [^\s]+$/.test(authorization)) {
    return { status: 401, body: { kind: "invalid_request" } };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { status: 400, body: { kind: "invalid_request" } };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { status: 400, body: { kind: "invalid_request" } };
  }
  const value = body as Record<string, unknown>;
  if (Object.keys(value).length !== 1 || typeof value.operation_id !== "string") {
    return { status: 400, body: { kind: "invalid_request" } };
  }
  const operationId = canonicalOperationId(value.operation_id);
  if (!operationId) return { status: 400, body: { kind: "invalid_request" } };

  let response: Response;
  try {
    response = await post(
      "/api/mobile/accounts/password-completion/",
      { operation_id: operationId },
      { headers: { Authorization: authorization }, redirect: "manual" }
    );
  } catch {
    return { status: 502, body: { kind: "completion_unconfirmed" } };
  }

  // Redirects and every non-2xx response are deliberately partial truth.
  if (!response.ok || response.type === "opaqueredirect" || response.status >= 300) {
    return { status: 502, body: { kind: "completion_unconfirmed" } };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { status: 502, body: { kind: "completion_unconfirmed" } };
  }
  if (!isCompletionResponse(payload, operationId)) {
    return { status: 502, body: { kind: "completion_unconfirmed" } };
  }

  return { status: 200, body: { kind: "completed" } };
}
