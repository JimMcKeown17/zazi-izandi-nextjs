import type {
  MobileReassignCreateJobInput,
  MobileReassignEntityKind,
  MobileReassignScope,
} from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertToken(token: string): void {
  if (!token) throw new Error("A Clerk session token is required");
}

export function validateMobileReassignUuid(value: string, field: string): string {
  if (!UUID_PATTERN.test(value)) throw new TypeError(`${field} must be a canonical UUID`);
  return value.toLowerCase();
}

export function validateMobileReassignScope(
  scope: MobileReassignScope,
  scopeClassId?: string | null
): { scope: MobileReassignScope; scopeClassId: string | null } {
  if (scope !== "roster" && scope !== "class") throw new TypeError("scope is invalid");
  const classId = scopeClassId == null ? null : validateMobileReassignUuid(scopeClassId, "scopeClassId");
  if ((scope === "class") !== Boolean(classId)) {
    throw new TypeError("scope=class requires scopeClassId and roster does not allow it");
  }
  return { scope, scopeClassId: classId };
}

function headers(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function buildMobileReassignRosterRequest(
  clerkSessionToken: string,
  input: { fromEa: string; scope?: MobileReassignScope; scopeClassId?: string | null }
): { path: string; init: RequestInit } {
  assertToken(clerkSessionToken);
  const fromEa = validateMobileReassignUuid(input.fromEa, "fromEa");
  const { scope, scopeClassId } = validateMobileReassignScope(
    input.scope ?? "roster",
    input.scopeClassId
  );
  const query = new URLSearchParams({ from_ea: fromEa, scope });
  if (scopeClassId) query.set("scope_class_id", scopeClassId);
  return {
    path: `/api/mobile/handover/roster/?${query.toString()}`,
    init: { method: "GET", cache: "no-store", redirect: "manual", headers: headers(clerkSessionToken) },
  };
}

export function buildMobileReassignCreateJobRequest(
  clerkSessionToken: string,
  input: MobileReassignCreateJobInput
): { path: string; init: RequestInit } {
  assertToken(clerkSessionToken);
  const fromEa = validateMobileReassignUuid(input.fromEa, "fromEa");
  const toEa = validateMobileReassignUuid(input.toEa, "toEa");
  const { scope, scopeClassId } = validateMobileReassignScope(input.scope, input.scopeClassId);
  const reason = input.reason.trim();
  if (!reason || reason.length > 200) throw new RangeError("reason is required and must be at most 200 characters");
  const unresolved_decisions = (input.unresolvedDecisions ?? []).map((decision) => {
    if (!["class", "group", "child"].includes(decision.entityKind)) {
      throw new TypeError("unresolved decision entity kind is invalid");
    }
    if (decision.decision !== "move" && decision.decision !== "leave") {
      throw new TypeError("unresolved decision must be move or leave");
    }
    return {
      entity_kind: decision.entityKind as MobileReassignEntityKind,
      entity_id: validateMobileReassignUuid(decision.entityId, "unresolved decision entityId"),
      decision: decision.decision,
    };
  });
  return {
    path: "/api/mobile/handover/jobs/",
    init: {
      method: "POST",
      cache: "no-store",
      redirect: "manual",
      headers: { ...headers(clerkSessionToken), "Content-Type": "application/json" },
      body: JSON.stringify({
        from_ea: fromEa,
        to_ea: toEa,
        scope,
        scope_class_id: scopeClassId,
        reason,
        unresolved_decisions,
      }),
    },
  };
}

export function buildMobileReassignExecuteRequest(
  clerkSessionToken: string,
  jobId: string
): { path: string; init: RequestInit } {
  assertToken(clerkSessionToken);
  return {
    path: `/api/mobile/handover/jobs/${validateMobileReassignUuid(jobId, "jobId")}/execute/`,
    init: { method: "POST", cache: "no-store", redirect: "manual", headers: headers(clerkSessionToken) },
  };
}

export function buildMobileReassignJobStatusRequest(
  clerkSessionToken: string,
  jobId: string
): { path: string; init: RequestInit } {
  assertToken(clerkSessionToken);
  return {
    path: `/api/mobile/handover/jobs/${validateMobileReassignUuid(jobId, "jobId")}/`,
    init: { method: "GET", cache: "no-store", redirect: "manual", headers: headers(clerkSessionToken) },
  };
}
