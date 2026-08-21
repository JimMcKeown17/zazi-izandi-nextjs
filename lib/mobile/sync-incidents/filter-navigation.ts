import type { MobileSyncIncidentKind } from "./types";

const DESCRIPTOR_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;

export function buildSyncIncidentFilterHref(
  currentSearch: string,
  selection: {
    incidentKind: MobileSyncIncidentKind | null;
    descriptorKey: string | null;
  }
): string {
  const query = new URLSearchParams(
    currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch
  );
  query.delete("cursor");
  query.delete("actor_user_id");

  if (selection.incidentKind === null) query.delete("incident_kind");
  else query.set("incident_kind", selection.incidentKind);

  const descriptorKey = selection.descriptorKey?.trim().toUpperCase() ?? null;
  if (descriptorKey === null || descriptorKey === "") {
    query.delete("descriptor_key");
  } else {
    if (!DESCRIPTOR_PATTERN.test(descriptorKey)) {
      throw new TypeError("descriptor filter is invalid");
    }
    query.set("descriptor_key", descriptorKey);
  }

  const serialized = query.toString();
  return `/mobile-app/user-health/sync-diagnostics${serialized ? `?${serialized}` : ""}`;
}
