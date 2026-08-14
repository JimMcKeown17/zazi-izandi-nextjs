import assert from "node:assert/strict";
import test from "node:test";

import { createPagerState, reducePagerState } from "./pager-state";
import { VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD } from "./test-fixtures";

function initialPage() {
  const data = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD);
  data.next_cursor = "signed.page.one";
  return data;
}

test("the pager blocks duplicate loads and accumulates by composite identity", () => {
  const initial = initialPage();
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
  const second = structuredClone(pageTwo.incidents[0]);
  second.actor.user_id = "00000000-0000-4000-8000-000000000005";
  second.actor.display_name = "Second Fixture EA";
  second.receipt.actor_user_id = second.actor.user_id;
  second.receipt.mutation_id = "00000000-0000-4000-8000-000000000006";
  second.receipt.incident_key = `support:v1:${second.receipt.mutation_id}`;
  second.receipt.local_record_id = "00000000-0000-4000-8000-000000000007";
  second.receipt.client_stream_id = "00000000-0000-4000-8000-000000000008";
  pageTwo.incidents = [pageTwo.incidents[0], second];
  pageTwo.page_count = 2;
  pageTwo.next_cursor = "signed.page.two";

  const accumulated = reducePagerState(loading, {
    type: "response_received",
    requestId: 1,
    result: { ok: true, data: pageTwo },
  });
  assert.equal(accumulated.incidents.length, 2);
  assert.equal(accumulated.nextCursor, "signed.page.two");
  assert.equal(accumulated.inFlightRequestId, null);
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

  const reset = reducePagerState(firstLoading, {
    type: "filters_changed",
    data: initial,
  });
  const lateResponse = reducePagerState(reset, {
    type: "response_received",
    requestId: 1,
    result: { ok: true, data: initial },
  });
  assert.equal(lateResponse, reset);
});
