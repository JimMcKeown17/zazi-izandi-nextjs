import "server-only";

import { djangoFetch } from "@/lib/django-fetch";
import {
  buildProgrammeFidelityRequest,
  buildProgrammeFidelitySessionsRequest,
} from "./request";
import {
  decodeProgrammeFidelityResponse,
  decodeProgrammeFidelitySessionsResponse,
} from "./response";
import type {
  ProgrammeFidelityExpansion,
  ProgrammeFidelityFilters,
  ProgrammeFidelityResponse,
  ProgrammeFidelityResult,
  ProgrammeFidelitySessionResponse,
} from "./types";

function unavailable<T>(): ProgrammeFidelityResult<T> {
  return {
    ok: false,
    status: 502,
    kind: "unavailable",
    message: "Programme fidelity is temporarily unavailable.",
  };
}

export async function fetchProgrammeFidelityWithToken(
  token: string,
  filters: ProgrammeFidelityFilters
): Promise<ProgrammeFidelityResult<ProgrammeFidelityResponse>> {
  const request = buildProgrammeFidelityRequest(token, filters);
  try {
    return decodeProgrammeFidelityResponse(
      await djangoFetch(request.path, request.init),
      filters
    );
  } catch {
    console.error("[mobile/api] Django programme-fidelity request failed");
    return unavailable();
  }
}

export async function fetchProgrammeFidelitySessionsWithToken(
  token: string,
  ids: ProgrammeFidelityExpansion
): Promise<ProgrammeFidelityResult<ProgrammeFidelitySessionResponse>> {
  const request = buildProgrammeFidelitySessionsRequest(token, ids);
  try {
    return decodeProgrammeFidelitySessionsResponse(
      await djangoFetch(request.path, request.init),
      ids
    );
  } catch {
    console.error("[mobile/api] Django programme-fidelity session request failed");
    return unavailable();
  }
}
