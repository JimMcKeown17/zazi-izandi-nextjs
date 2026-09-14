export type CoachPlusState =
  | { kind: "ok"; enabled: boolean; updatedAt: string | null }
  | { kind: "unauthorized" }
  | { kind: "refused" }
  | { kind: "unavailable" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCanonicalUserId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function decodeCoachPlusResponse(status: number, body: unknown): CoachPlusState {
  if (status === 401 || status === 403) return { kind: "unauthorized" };
  if (status === 400) return { kind: "refused" };
  if (status !== 200 || !body || typeof body !== "object" || Array.isArray(body)) return { kind: "unavailable" };
  const record = body as Record<string, unknown>;
  if (record.feature_key !== "ai_coach" || typeof record.enabled !== "boolean") return { kind: "unavailable" };
  const updatedAt = typeof record.server_updated_at === "string" ? record.server_updated_at : null;
  return { kind: "ok", enabled: record.enabled, updatedAt };
}
