import { z } from "zod";

import type {
  MobileSyncIncidentFilters,
  MobileSyncIncidentsResult,
} from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DESCRIPTOR_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const ASCII_CURSOR_PATTERN = /^[\x20-\x7e]{1,2048}$/;

const pageInputSchema = z.strictObject({
  days: z.number().int().min(1).max(90),
  schoolId: z.string().regex(UUID_PATTERN).nullable(),
  incidentKind: z
    .enum(["support_root", "integrity_aggregate", "queue_overflow"])
    .nullable(),
  descriptorKey: z.string().regex(DESCRIPTOR_PATTERN).nullable(),
  limit: z.number().int().min(1).max(100),
  cursor: z.string().regex(ASCII_CURSOR_PATTERN),
});

type AuthorizationResult =
  | { ok: true; token: string }
  | { ok: false; kind: "not_authenticated" | "not_authorized" };

export type SyncIncidentPageAuthorizationFailure =
  | {
      ok: false;
      status: 401;
      kind: "not_authenticated";
      message: "Your session has expired. Refresh and sign in again.";
    }
  | {
      ok: false;
      status: 403;
      kind: "not_authorized";
      message: "Sync incident alerts are not available for this role.";
    };

export type SyncIncidentPageActionResult =
  | MobileSyncIncidentsResult
  | {
      ok: false;
      status: 400;
      kind: "invalid_request";
      message: "The next-page request is invalid.";
    }
  | SyncIncidentPageAuthorizationFailure;

export function createSyncIncidentPageLoader(dependencies: {
  authorize: () => Promise<AuthorizationResult>;
  fetchPage: (
    token: string,
    filters: MobileSyncIncidentFilters
  ) => Promise<MobileSyncIncidentsResult | SyncIncidentPageAuthorizationFailure>;
}) {
  return async function loadPage(
    input: unknown
  ): Promise<SyncIncidentPageActionResult> {
    const parsed = pageInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        status: 400,
        kind: "invalid_request",
        message: "The next-page request is invalid.",
      };
    }

    const authorization = await dependencies.authorize();
    if (!authorization.ok || authorization.token.length === 0) {
      const kind = authorization.ok ? "not_authenticated" : authorization.kind;
      return kind === "not_authenticated"
        ? {
            ok: false,
            status: 401,
            kind,
            message: "Your session has expired. Refresh and sign in again.",
          }
        : {
            ok: false,
            status: 403,
            kind,
            message: "Sync incident alerts are not available for this role.",
          };
    }

    try {
      return await dependencies.fetchPage(authorization.token, parsed.data);
    } catch {
      return {
        ok: false,
        status: 502,
        kind: "unavailable",
        message: "Sync incident alerts are temporarily unavailable.",
      };
    }
  };
}
