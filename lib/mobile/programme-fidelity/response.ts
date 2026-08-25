import {
  aggregateResponseMatchesRequest,
  programmeFidelitySchema,
  programmeFidelitySessionsSchema,
  sessionsResponseMatchesRequest,
} from "./schema";
import type {
  ProgrammeFidelityExpansion,
  ProgrammeFidelityFilters,
  ProgrammeFidelityResponse,
  ProgrammeFidelityResult,
  ProgrammeFidelitySessionResponse,
} from "./types";

function failure(status: number): ProgrammeFidelityResult<never> {
  if (status === 400) {
    return {
      ok: false,
      status,
      kind: "invalid_filters",
      message: "The selected programme-fidelity filters are invalid.",
    };
  }
  if (status === 401) {
    return {
      ok: false,
      status,
      kind: "not_authenticated",
      message: "Your session has expired. Refresh and sign in again.",
    };
  }
  if (status === 403) {
    return {
      ok: false,
      status,
      kind: "not_authorized",
      message: "Programme fidelity is not available for this role.",
    };
  }
  if (status === 404) {
    return {
      ok: false,
      status,
      kind: "not_found",
      message: "That EA and group are not in the current programme-fidelity view.",
    };
  }
  if (status === 503) {
    return {
      ok: false,
      status,
      kind: "not_computed",
      message: "Programme fidelity has not completed its first local calculation yet.",
    };
  }
  return {
    ok: false,
    status,
    kind: "unavailable",
    message: "Programme fidelity is temporarily unavailable.",
  };
}

async function payload(response: Response): Promise<unknown | undefined> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function decodeProgrammeFidelityResponse(
  response: Response,
  filters: ProgrammeFidelityFilters
): Promise<ProgrammeFidelityResult<ProgrammeFidelityResponse>> {
  if (!response.ok) return failure(response.status);
  const parsed = programmeFidelitySchema.safeParse(await payload(response));
  if (!parsed.success || !aggregateResponseMatchesRequest(parsed.data, filters)) {
    return failure(502);
  }
  return { ok: true, data: parsed.data };
}

export async function decodeProgrammeFidelitySessionsResponse(
  response: Response,
  ids: ProgrammeFidelityExpansion
): Promise<ProgrammeFidelityResult<ProgrammeFidelitySessionResponse>> {
  if (!response.ok) return failure(response.status);
  const parsed = programmeFidelitySessionsSchema.safeParse(await payload(response));
  if (!parsed.success || !sessionsResponseMatchesRequest(parsed.data, ids)) {
    return failure(502);
  }
  return { ok: true, data: parsed.data };
}
