import type {
  ProgrammeFidelityAttention,
  ProgrammeFidelityExpansion,
  ProgrammeFidelityFilters,
} from "./types";

export type {
  ProgrammeFidelityAttention,
  ProgrammeFidelityExpansion,
  ProgrammeFidelityFilters,
} from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ATTENTION_VALUES = new Set<ProgrammeFidelityAttention>([
  "all",
  "current",
  "above",
  "unscored",
  "inactive",
]);

export function isCanonicalUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function validateProgrammeFidelityFilters(
  filters: ProgrammeFidelityFilters
): ProgrammeFidelityFilters {
  if (filters.schoolId !== null && !isCanonicalUuid(filters.schoolId)) {
    throw new TypeError("schoolId must be a canonical UUID");
  }
  if (filters.eaUserId !== null && !isCanonicalUuid(filters.eaUserId)) {
    throw new TypeError("eaUserId must be a canonical UUID");
  }
  if (!ATTENTION_VALUES.has(filters.attention)) {
    throw new TypeError("attention is invalid");
  }
  return { ...filters };
}

function requestInit(token: string): RequestInit {
  if (!token) throw new Error("A Clerk session token is required");
  return {
    method: "GET",
    cache: "no-store",
    redirect: "manual",
    headers: { Authorization: `Bearer ${token}` },
  };
}

export function buildProgrammeFidelityRequest(
  token: string,
  filters: ProgrammeFidelityFilters
): { path: string; init: RequestInit } {
  const validated = validateProgrammeFidelityFilters(filters);
  const query = new URLSearchParams();
  if (validated.schoolId) query.set("school_id", validated.schoolId);
  if (validated.eaUserId) query.set("ea_user_id", validated.eaUserId);
  query.set("attention", validated.attention);
  return {
    path: `/api/mobile/programme-fidelity/?${query.toString()}`,
    init: requestInit(token),
  };
}

export function buildProgrammeFidelitySessionsRequest(
  token: string,
  ids: ProgrammeFidelityExpansion
): { path: string; init: RequestInit } {
  if (!isCanonicalUuid(ids.groupId) || !isCanonicalUuid(ids.eaUserId)) {
    throw new TypeError("groupId and eaUserId must be canonical UUIDs");
  }
  const query = new URLSearchParams({
    group_id: ids.groupId,
    ea_user_id: ids.eaUserId,
  });
  return {
    path: `/api/mobile/programme-fidelity/sessions/?${query.toString()}`,
    init: requestInit(token),
  };
}

function first(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function parseProgrammeFidelityPageQuery(
  params: Record<string, string | string[] | undefined>
): { filters: ProgrammeFidelityFilters; expansion: ProgrammeFidelityExpansion | null } {
  const school = first(params.school_id);
  const ea = first(params.ea_user_id);
  const attention = first(params.attention);
  const group = first(params.expanded_group_id);
  const expandedEa = first(params.expanded_ea_user_id);

  return {
    filters: {
      schoolId: isCanonicalUuid(school) ? school : null,
      eaUserId: isCanonicalUuid(ea) ? ea : null,
      attention: ATTENTION_VALUES.has(attention as ProgrammeFidelityAttention)
        ? (attention as ProgrammeFidelityAttention)
        : "all",
    },
    expansion:
      isCanonicalUuid(group) && isCanonicalUuid(expandedEa)
        ? { groupId: group, eaUserId: expandedEa }
        : null,
  };
}
