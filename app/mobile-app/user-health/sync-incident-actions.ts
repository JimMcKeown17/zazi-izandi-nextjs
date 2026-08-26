"use server";

import { auth } from "@clerk/nextjs/server";

import { hasCapability } from "@/lib/mobile/capabilities";
import {
  createSyncIncidentPageLoader,
  type SyncIncidentPageActionResult,
} from "@/lib/mobile/sync-incidents/load-page";
import { fetchMobileSyncIncidentsV2WithToken } from "@/lib/mobile/sync-incidents/server-fetch";

const loadPage = createSyncIncidentPageLoader({
  authorize: async () => {
    const session = await auth();
    if (!session.userId) {
      return { ok: false, kind: "not_authenticated" } as const;
    }
    const role = (
      session.sessionClaims?.metadata as { role?: unknown } | undefined
    )?.role;
    if (!hasCapability(role, "mobile.sync_incidents.read")) {
      return { ok: false, kind: "not_authorized" } as const;
    }
    const token = await session.getToken();
    return token
      ? ({ ok: true, token } as const)
      : ({ ok: false, kind: "not_authenticated" } as const);
  },
  fetchPage: fetchMobileSyncIncidentsV2WithToken,
});

export async function loadNextMobileSyncIncidentPage(
  input: unknown
): Promise<SyncIncidentPageActionResult> {
  return loadPage(input);
}
