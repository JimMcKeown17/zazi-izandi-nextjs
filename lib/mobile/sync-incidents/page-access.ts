import { hasCapability } from "../capabilities";
import type { MobileSyncIncidentsResult } from "./types";

const NOT_AUTHORIZED_RESULT: MobileSyncIncidentsResult = {
  ok: false,
  status: 403,
  kind: "not_authorized",
  message: "Sync incident alerts are not available for this role.",
};

const INVALID_FILTERS_RESULT: MobileSyncIncidentsResult = {
  ok: false,
  status: 400,
  kind: "invalid_filters",
  message: "The selected sync-incident filters are invalid.",
};

export function resolveSyncIncidentPageRequest(
  role: unknown,
  invalidFilters: boolean,
  load: () => Promise<MobileSyncIncidentsResult>
): Promise<MobileSyncIncidentsResult> {
  if (!hasCapability(role, "mobile.sync_incidents.read")) {
    return Promise.resolve(NOT_AUTHORIZED_RESULT);
  }
  if (invalidFilters) return Promise.resolve(INVALID_FILTERS_RESULT);
  return load();
}
