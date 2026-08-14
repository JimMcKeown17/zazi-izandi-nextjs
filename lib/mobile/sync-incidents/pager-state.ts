import type { SyncIncidentPageActionResult } from "./load-page";
import { getIncidentIdentity } from "./presentation";
import type {
  MobileSyncIncidentItem,
  MobileSyncIncidentsResponse,
} from "./types";

export interface SyncIncidentPagerState {
  initialIncidents: MobileSyncIncidentItem[];
  incidents: MobileSyncIncidentItem[];
  nextCursor: string | null;
  inFlightRequestId: number | null;
  error: string | null;
  needsRefresh: boolean;
}

export type SyncIncidentPagerEvent =
  | { type: "request_started"; requestId: number }
  | {
      type: "response_received";
      requestId: number;
      result: SyncIncidentPageActionResult;
    }
  | { type: "filters_changed"; data: MobileSyncIncidentsResponse };

export function createPagerState(
  data: MobileSyncIncidentsResponse
): SyncIncidentPagerState {
  return {
    initialIncidents: data.incidents,
    incidents: data.incidents,
    nextCursor: data.next_cursor,
    inFlightRequestId: null,
    error: null,
    needsRefresh: false,
  };
}

function appendUniqueIncidents(
  current: MobileSyncIncidentItem[],
  incoming: MobileSyncIncidentItem[]
): MobileSyncIncidentItem[] {
  const identities = new Set(current.map(getIncidentIdentity));
  const combined = [...current];
  for (const incident of incoming) {
    const identity = getIncidentIdentity(incident);
    if (!identities.has(identity)) {
      identities.add(identity);
      combined.push(incident);
    }
  }
  return combined;
}

export function reducePagerState(
  state: SyncIncidentPagerState,
  event: SyncIncidentPagerEvent
): SyncIncidentPagerState {
  if (event.type === "filters_changed") {
    return createPagerState(event.data);
  }
  if (event.type === "request_started") {
    if (state.inFlightRequestId !== null || state.nextCursor === null) {
      return state;
    }
    return {
      ...state,
      inFlightRequestId: event.requestId,
      error: null,
      needsRefresh: false,
    };
  }
  if (state.inFlightRequestId !== event.requestId) return state;

  if (event.result.ok) {
    return {
      ...state,
      incidents: appendUniqueIncidents(
        state.incidents,
        event.result.data.incidents
      ),
      nextCursor: event.result.data.next_cursor,
      inFlightRequestId: null,
      error: null,
      needsRefresh: false,
    };
  }
  if (event.result.kind === "stale_cursor") {
    return {
      ...state,
      incidents: state.initialIncidents,
      nextCursor: null,
      inFlightRequestId: null,
      error: null,
      needsRefresh: true,
    };
  }
  return {
    ...state,
    inFlightRequestId: null,
    error: event.result.message,
    needsRefresh: false,
  };
}
