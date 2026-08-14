"use client";

import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef } from "react";

import { loadNextMobileSyncIncidentPage } from "@/app/mobile-app/user-health/sync-incident-actions";
import { SyncIncidentList } from "./sync-incident-alerts";
import {
  createPagerState,
  reducePagerState,
} from "@/lib/mobile/sync-incidents/pager-state";
import type {
  MobileSyncIncidentFilters,
  MobileSyncIncidentsResponse,
} from "@/lib/mobile/sync-incidents/types";

export function SyncIncidentPager({
  initialData,
  filters,
}: {
  initialData: MobileSyncIncidentsResponse;
  filters: Omit<MobileSyncIncidentFilters, "cursor">;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(
    reducePagerState,
    initialData,
    createPagerState
  );
  const nextRequestId = useRef(0);
  const inFlight = useRef(false);
  const additionalIncidents = state.incidents.slice(
    state.initialIncidents.length
  );

  useEffect(() => {
    if (state.needsRefresh) router.refresh();
  }, [router, state.needsRefresh]);

  async function loadMore() {
    if (inFlight.current || state.nextCursor === null) return;
    inFlight.current = true;
    const requestId = ++nextRequestId.current;
    const cursor = state.nextCursor;
    dispatch({ type: "request_started", requestId });
    try {
      const result = await loadNextMobileSyncIncidentPage({
        days: filters.days,
        schoolId: filters.schoolId ?? null,
        incidentKind: filters.incidentKind ?? null,
        descriptorKey: filters.descriptorKey ?? null,
        limit: filters.limit,
        cursor,
      });
      dispatch({ type: "response_received", requestId, result });
    } catch {
      dispatch({
        type: "request_failed",
        requestId,
        message: "Sync incident alerts could not load another page. Try again.",
      });
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div className="space-y-3" data-testid="mobile-sync-incident-pager">
      {additionalIncidents.length > 0 ? (
        <SyncIncidentList incidents={additionalIncidents} />
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.error}
        </p>
      ) : null}

      {state.nextCursor ? (
        <button
          type="button"
          onClick={loadMore}
          disabled={state.inFlightRequestId !== null}
          className="h-10 rounded-md border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-50 disabled:cursor-wait disabled:opacity-60"
        >
          {state.inFlightRequestId !== null ? "Loading…" : "Load more receipts"}
        </button>
      ) : additionalIncidents.length > 0 ? (
        <p className="text-xs text-slate-500">All receipts in this snapshot are shown.</p>
      ) : null}
    </div>
  );
}
