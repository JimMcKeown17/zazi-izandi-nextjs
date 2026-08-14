import assert from "node:assert/strict";
import test from "node:test";

import {
  createPagerState,
  getSyncIncidentPagerKey,
  reducePagerState,
} from "./pager-state";
import { mobileSyncIncidentsSchema, responseMatchesRequest } from "./schema";
import { VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD } from "./test-fixtures";
import type { MobileSyncIncidentsResponse } from "./types";

function initialPage() {
  const data = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD);
  data.applied_filters.limit = 1;
  data.summary.receipts = 3;
  data.summary.affected_users = 3;
  data.summary.support_roots = 3;
  data.next_cursor = "signed.page.one";
  return data;
}

function nextIncident(receivedAt = "2026-08-14T11:57:00Z") {
  const second = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD.incidents[0]);
  second.actor.user_id = "00000000-0000-4000-8000-000000000005";
  second.actor.display_name = "Second Fixture EA";
  second.receipt.actor_user_id = second.actor.user_id;
  second.receipt.mutation_id = "00000000-0000-4000-8000-000000000006";
  second.receipt.incident_key = `support:v1:${second.receipt.mutation_id}`;
  second.receipt.local_record_id = "00000000-0000-4000-8000-000000000007";
  second.receipt.client_stream_id = "00000000-0000-4000-8000-000000000008";
  second.receipt.received_at = receivedAt;
  return second;
}

function thirdIncident() {
  const third = nextIncident("2026-08-14T11:56:00Z");
  third.actor.user_id = "00000000-0000-4000-8000-000000000009";
  third.actor.display_name = "Third Fixture EA";
  third.receipt.actor_user_id = third.actor.user_id;
  third.receipt.mutation_id = "00000000-0000-4000-8000-000000000011";
  third.receipt.incident_key = `support:v1:${third.receipt.mutation_id}`;
  third.receipt.local_record_id = "00000000-0000-4000-8000-000000000012";
  third.receipt.client_stream_id = "00000000-0000-4000-8000-000000000013";
  return third;
}

function fourthIncident() {
  const fourth = thirdIncident();
  fourth.actor.user_id = "00000000-0000-4000-8000-000000000014";
  fourth.actor.display_name = "Fourth Fixture EA";
  fourth.receipt.actor_user_id = fourth.actor.user_id;
  fourth.receipt.mutation_id = "00000000-0000-4000-8000-000000000015";
  fourth.receipt.incident_key = `support:v1:${fourth.receipt.mutation_id}`;
  fourth.receipt.local_record_id = "00000000-0000-4000-8000-000000000016";
  fourth.receipt.client_stream_id = "00000000-0000-4000-8000-000000000017";
  fourth.receipt.received_at = "2026-08-14T11:55:00Z";
  return fourth;
}

function assertValidPage(
  data: MobileSyncIncidentsResponse,
  cursor: string | null
) {
  const parsed = mobileSyncIncidentsSchema.safeParse(data);
  assert.equal(parsed.success, true, parsed.error?.message);
  if (parsed.success) {
    assert.equal(
      responseMatchesRequest(parsed.data, {
        days: 7,
        limit: data.applied_filters.limit,
        cursor,
      }),
      true
    );
  }
}

test("the pager blocks duplicate loads and accumulates a valid next page", () => {
  const initial = initialPage();
  assertValidPage(initial, null);
  const state = createPagerState(initial);
  const loading = reducePagerState(state, {
    type: "request_started",
    requestId: 1,
  });
  const duplicateClick = reducePagerState(loading, {
    type: "request_started",
    requestId: 2,
  });
  assert.equal(duplicateClick, loading);

  const pageTwo = structuredClone(initial);
  pageTwo.incidents = [nextIncident()];
  pageTwo.page_count = 1;
  pageTwo.next_cursor = "signed.page.two";
  assertValidPage(pageTwo, "signed.page.one");

  const accumulated = reducePagerState(loading, {
    type: "response_received",
    requestId: 1,
    result: { ok: true, data: pageTwo },
  });
  assert.equal(accumulated.incidents.length, 2);
  assert.equal(accumulated.nextCursor, "signed.page.two");
  assert.equal(accumulated.inFlightRequestId, null);

  const pageThree = structuredClone(initial);
  pageThree.incidents = [thirdIncident()];
  pageThree.next_cursor = null;
  assertValidPage(pageThree, "signed.page.two");
  const complete = reducePagerState(
    reducePagerState(accumulated, {
      type: "request_started",
      requestId: 2,
    }),
    {
      type: "response_received",
      requestId: 2,
      result: { ok: true, data: pageThree },
    }
  );
  assert.equal(complete.incidents.length, 3);
  assert.equal(complete.nextCursor, null);
  assert.equal(complete.needsRefresh, false);
});

test("an empty terminal continuation fails closed while receipts remain outstanding", () => {
  const initial = initialPage();
  const loading = reducePagerState(createPagerState(initial), {
    type: "request_started",
    requestId: 1,
  });
  const terminal = structuredClone(initial);
  terminal.incidents = [];
  terminal.page_count = 0;
  terminal.next_cursor = null;
  assertValidPage(terminal, "signed.page.one");

  const complete = reducePagerState(loading, {
    type: "response_received",
    requestId: 1,
    result: { ok: true, data: terminal },
  });
  assert.equal(complete.needsRefresh, true);
  assert.equal(complete.nextCursor, null);
  assert.equal(complete.incidents.length, 1);
});

test("stale cursors discard later pages and old responses are ignored after reset", () => {
  const initial = initialPage();
  const firstLoading = reducePagerState(createPagerState(initial), {
    type: "request_started",
    requestId: 1,
  });
  const stale = reducePagerState(firstLoading, {
    type: "response_received",
    requestId: 1,
    result: {
      ok: false,
      status: 409,
      kind: "stale_cursor",
      message: "The alert list changed.",
    },
  });
  assert.deepEqual(stale.incidents, initial.incidents);
  assert.equal(stale.nextCursor, null);
  assert.equal(stale.needsRefresh, true);

  const reset = createPagerState(initial);
  const lateResponse = reducePagerState(reset, {
    type: "response_received",
    requestId: 1,
    result: { ok: true, data: initial },
  });
  assert.equal(lateResponse, reset);
});

test("a refreshed backend snapshot remounts pager state even when filters do not change", () => {
  const first = initialPage();
  const refreshed = structuredClone(first);
  refreshed.applied_filters.snapshot_received_before =
    "2026-08-14T12:00:00.000001Z";

  const filters = {
    days: 7,
    schoolId: null,
    incidentKind: null,
    descriptorKey: null,
    limit: 1,
  } as const;

  assert.notEqual(
    getSyncIncidentPagerKey(filters, first),
    getSyncIncidentPagerKey(filters, refreshed)
  );
});

test("a rejected action request clears loading state and remains retryable", () => {
  const initial = initialPage();
  const loading = reducePagerState(createPagerState(initial), {
    type: "request_started",
    requestId: 1,
  });
  const failed = reducePagerState(loading, {
    type: "request_failed",
    requestId: 1,
    message: "Sync incident alerts could not load another page. Try again.",
  });

  assert.equal(failed.inFlightRequestId, null);
  assert.equal(failed.nextCursor, "signed.page.one");
  assert.match(failed.error ?? "", /Try again/);

  const retrying = reducePagerState(failed, {
    type: "request_started",
    requestId: 2,
  });
  assert.equal(retrying.inFlightRequestId, 2);
});

test("the pager rejects changed snapshots, cross-page disorder, and cursor cycles", () => {
  const initial = initialPage();
  const filtersChanged = structuredClone(initial);
  filtersChanged.applied_filters.snapshot_received_before =
    "2026-08-14T12:00:00.000001Z";
  filtersChanged.generated_at = "2026-08-14T12:00:00.000001Z";
  filtersChanged.next_cursor = "signed.page.two";
  assertValidPage(filtersChanged, "signed.page.one");

  const changedSnapshot = reducePagerState(
    reducePagerState(createPagerState(initial), {
      type: "request_started",
      requestId: 1,
    }),
    {
      type: "response_received",
      requestId: 1,
      result: { ok: true, data: filtersChanged },
    }
  );
  assert.equal(changedSnapshot.needsRefresh, true);
  assert.equal(changedSnapshot.nextCursor, null);

  const summaryChanged = structuredClone(initial);
  summaryChanged.summary.affected_users = 2;
  summaryChanged.next_cursor = "signed.page.two";
  assertValidPage(summaryChanged, "signed.page.one");
  const changedSummary = reducePagerState(
    reducePagerState(createPagerState(initial), {
      type: "request_started",
      requestId: 2,
    }),
    {
      type: "response_received",
      requestId: 2,
      result: { ok: true, data: summaryChanged },
    }
  );
  assert.equal(changedSummary.needsRefresh, true);

  const outOfOrder = structuredClone(initial);
  outOfOrder.incidents = [nextIncident("2026-08-14T11:59:00Z")];
  outOfOrder.next_cursor = "signed.page.two";
  assertValidPage(outOfOrder, "signed.page.one");
  const disordered = reducePagerState(
    reducePagerState(createPagerState(initial), {
      type: "request_started",
      requestId: 3,
    }),
    {
      type: "response_received",
      requestId: 3,
      result: { ok: true, data: outOfOrder },
    }
  );
  assert.equal(disordered.needsRefresh, true);

  const overlapping = structuredClone(initial);
  overlapping.next_cursor = "signed.page.two";
  assertValidPage(overlapping, "signed.page.one");
  const duplicateRejected = reducePagerState(
    reducePagerState(createPagerState(initial), {
      type: "request_started",
      requestId: 4,
    }),
    {
      type: "response_received",
      requestId: 4,
      result: { ok: true, data: overlapping },
    }
  );
  assert.equal(duplicateRejected.needsRefresh, true);

  const shortTerminal = structuredClone(initial);
  shortTerminal.incidents = [nextIncident()];
  shortTerminal.next_cursor = null;
  assertValidPage(shortTerminal, "signed.page.one");
  const exhausted = reducePagerState(
    reducePagerState(createPagerState(initial), {
      type: "request_started",
      requestId: 5,
    }),
    {
      type: "response_received",
      requestId: 5,
      result: { ok: true, data: shortTerminal },
    }
  );
  assert.equal(exhausted.needsRefresh, true);
  assert.equal(exhausted.nextCursor, null);
  assert.deepEqual(exhausted.incidents, initial.incidents);

  const twoItemInitial = initialPage();
  twoItemInitial.applied_filters.limit = 2;
  twoItemInitial.incidents = [twoItemInitial.incidents[0], nextIncident()];
  twoItemInitial.page_count = 2;
  assertValidPage(twoItemInitial, null);
  const overcountPage = structuredClone(twoItemInitial);
  overcountPage.incidents = [thirdIncident(), fourthIncident()];
  overcountPage.next_cursor = null;
  assertValidPage(overcountPage, "signed.page.one");
  const overcounted = reducePagerState(
    reducePagerState(createPagerState(twoItemInitial), {
      type: "request_started",
      requestId: 6,
    }),
    {
      type: "response_received",
      requestId: 6,
      result: { ok: true, data: overcountPage },
    }
  );
  assert.equal(overcounted.needsRefresh, true);

  const pageTwo = structuredClone(initial);
  pageTwo.incidents = [nextIncident()];
  pageTwo.next_cursor = "signed.page.two";
  assertValidPage(pageTwo, "signed.page.one");
  const afterPageTwo = reducePagerState(
    reducePagerState(createPagerState(initial), {
      type: "request_started",
      requestId: 7,
    }),
    {
      type: "response_received",
      requestId: 7,
      result: { ok: true, data: pageTwo },
    }
  );
  assert.equal(afterPageTwo.needsRefresh, false);

  const cursorAtTotal = structuredClone(initial);
  cursorAtTotal.incidents = [thirdIncident()];
  cursorAtTotal.next_cursor = "signed.page.three";
  assertValidPage(cursorAtTotal, "signed.page.two");
  const totalWithCursor = reducePagerState(
    reducePagerState(afterPageTwo, {
      type: "request_started",
      requestId: 8,
    }),
    {
      type: "response_received",
      requestId: 8,
      result: { ok: true, data: cursorAtTotal },
    }
  );
  assert.equal(totalWithCursor.needsRefresh, true);

  const cyclic = structuredClone(initial);
  cyclic.incidents = [thirdIncident()];
  cyclic.next_cursor = "signed.page.one";
  assertValidPage(cyclic, "signed.page.two");
  const cycleRejected = reducePagerState(
    reducePagerState(afterPageTwo, {
      type: "request_started",
      requestId: 9,
    }),
    {
      type: "response_received",
      requestId: 9,
      result: { ok: true, data: cyclic },
    }
  );
  assert.equal(cycleRejected.needsRefresh, true);
  assert.equal(cycleRejected.nextCursor, null);
});
