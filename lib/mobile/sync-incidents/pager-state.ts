import type { SyncIncidentPageActionResult } from "./load-page";
import { getIncidentIdentity } from "./presentation";
import type {
  MobileSyncIncidentFilters,
  MobileSyncIncidentItem,
  MobileSyncIncidentsResponse,
} from "./types";

export interface SyncIncidentPagerState {
  initialIncidents: MobileSyncIncidentItem[];
  incidents: MobileSyncIncidentItem[];
  nextCursor: string | null;
  seenCursors: string[];
  snapshotContract: string;
  expectedReceiptCount: number;
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
  | {
      type: "request_failed";
      requestId: number;
      message: string;
    };

export function getSyncIncidentPagerKey(
  filters: Omit<MobileSyncIncidentFilters, "cursor">,
  data: MobileSyncIncidentsResponse
): string {
  return [
    filters.days,
    filters.schoolId ?? "",
    filters.incidentKind ?? "",
    filters.descriptorKey ?? "",
    data.applied_filters.snapshot_received_before,
  ].join("|");
}

export function createPagerState(
  data: MobileSyncIncidentsResponse
): SyncIncidentPagerState {
  return {
    initialIncidents: data.incidents,
    incidents: data.incidents,
    nextCursor: data.next_cursor,
    seenCursors: data.next_cursor === null ? [] : [data.next_cursor],
    snapshotContract: getSnapshotContract(data),
    expectedReceiptCount: data.summary.receipts,
    inFlightRequestId: null,
    error: null,
    needsRefresh: false,
  };
}

function getSnapshotContract(data: MobileSyncIncidentsResponse): string {
  return JSON.stringify({
    applied_filters: data.applied_filters,
    summary: data.summary,
  });
}

function timestampMicros(value: string): bigint {
  const [secondPart, fractionPart = ""] = value.slice(0, -1).split(".");
  return (
    BigInt(Date.parse(`${secondPart}Z`)) * BigInt(1000) +
    BigInt(fractionPart.padEnd(6, "0"))
  );
}

function isStrictlyAfterInDescendingOrder(
  previous: MobileSyncIncidentItem,
  current: MobileSyncIncidentItem
): boolean {
  const previousTime = timestampMicros(previous.receipt.received_at);
  const currentTime = timestampMicros(current.receipt.received_at);
  if (currentTime !== previousTime) return currentTime < previousTime;
  if (current.receipt.actor_user_id !== previous.receipt.actor_user_id) {
    return current.receipt.actor_user_id < previous.receipt.actor_user_id;
  }
  return current.receipt.incident_key < previous.receipt.incident_key;
}

function isValidContinuation(
  state: SyncIncidentPagerState,
  data: MobileSyncIncidentsResponse
): boolean {
  if (getSnapshotContract(data) !== state.snapshotContract) return false;
  if (data.next_cursor !== null && state.seenCursors.includes(data.next_cursor)) {
    return false;
  }

  const cumulativeCount = state.incidents.length + data.incidents.length;
  if (
    cumulativeCount > state.expectedReceiptCount ||
    (data.next_cursor === null &&
      cumulativeCount !== state.expectedReceiptCount) ||
    (data.next_cursor !== null &&
      cumulativeCount >= state.expectedReceiptCount)
  ) {
    return false;
  }

  const currentIdentities = new Set(state.incidents.map(getIncidentIdentity));
  if (data.incidents.some((item) => currentIdentities.has(getIncidentIdentity(item)))) {
    return false;
  }

  const previous = state.incidents.at(-1);
  const current = data.incidents[0];
  return !previous || !current || isStrictlyAfterInDescendingOrder(previous, current);
}

function requireFirstPageRefresh(
  state: SyncIncidentPagerState
): SyncIncidentPagerState {
  return {
    ...state,
    incidents: state.initialIncidents,
    nextCursor: null,
    inFlightRequestId: null,
    error: null,
    needsRefresh: true,
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

  if (event.type === "request_failed") {
    return {
      ...state,
      inFlightRequestId: null,
      error: event.message,
      needsRefresh: false,
    };
  }

  if (event.result.ok) {
    if (!isValidContinuation(state, event.result.data)) {
      return requireFirstPageRefresh(state);
    }
    return {
      ...state,
      incidents: appendUniqueIncidents(
        state.incidents,
        event.result.data.incidents
      ),
      nextCursor: event.result.data.next_cursor,
      seenCursors:
        event.result.data.next_cursor === null
          ? state.seenCursors
          : [...state.seenCursors, event.result.data.next_cursor],
      inFlightRequestId: null,
      error: null,
      needsRefresh: false,
    };
  }
  if (event.result.kind === "stale_cursor") {
    return requireFirstPageRefresh(state);
  }
  return {
    ...state,
    inFlightRequestId: null,
    error: event.result.message,
    needsRefresh: false,
  };
}
