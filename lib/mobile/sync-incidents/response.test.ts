import assert from "node:assert/strict";
import test from "node:test";

import { decodeMobileSyncIncidentsResponse } from "./response";
import { VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD } from "./test-fixtures";

test("the exact reviewed browser incident envelope is accepted", async () => {
  const response = new Response(
    JSON.stringify(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );

  assert.deepEqual(
    await decodeMobileSyncIncidentsResponse(response, {
      days: 7,
      schoolId: null,
      incidentKind: null,
      descriptorKey: null,
      limit: 50,
      cursor: null,
    }),
    { ok: true, data: VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD }
  );
});

test("calendar-impossible timestamps and a false SAST window fail closed", async () => {
  const impossible = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD);
  impossible.generated_at = "2026-02-31T12:00:00Z";

  const impossibleResult = await decodeMobileSyncIncidentsResponse(
    new Response(JSON.stringify(impossible), { status: 200 }),
    { days: 7, limit: 50 }
  );
  assert.equal(impossibleResult.ok, false);

  const falseWindow = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD);
  falseWindow.applied_filters.start_at = "2026-08-07T21:00:00Z";
  const falseWindowResult = await decodeMobileSyncIncidentsResponse(
    new Response(JSON.stringify(falseWindow), { status: 200 }),
    { days: 7, limit: 50 }
  );
  assert.equal(falseWindowResult.ok, false);
});

test("unknown fields fail closed at every browser boundary", async () => {
  const mutations: Array<(payload: Record<string, unknown>) => void> = [
    (payload) => {
      payload.normalized_payload = {};
    },
    (payload) => {
      (payload.applied_filters as Record<string, unknown>).raw_cursor = {};
    },
    (payload) => {
      (payload.summary as Record<string, unknown>).unresolved = 1;
    },
    (payload) => {
      const incident = (payload.incidents as Array<Record<string, unknown>>)[0];
      incident.email = "fixture@example.org";
    },
    (payload) => {
      const incident = (payload.incidents as Array<Record<string, unknown>>)[0];
      (incident.actor as Record<string, unknown>).email = "fixture@example.org";
    },
    (payload) => {
      const incident = (payload.incidents as Array<Record<string, unknown>>)[0];
      (incident.receipt as Record<string, unknown>).normalized_payload = {};
    },
  ];

  for (const mutate of mutations) {
    const payload = structuredClone(
      VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD
    ) as unknown as Record<string, unknown>;
    mutate(payload);
    const result = await decodeMobileSyncIncidentsResponse(
      new Response(JSON.stringify(payload), { status: 200 }),
      { days: 7, limit: 50 }
    );
    assert.equal(result.ok, false);
  }
});

test("HTTP, stale-cursor, and malformed responses remain distinct sanitized states", async () => {
  assert.deepEqual(
    await decodeMobileSyncIncidentsResponse(
      new Response("actor UUID and upstream body", { status: 403 }),
      { days: 7, limit: 50 }
    ),
    {
      ok: false,
      status: 403,
      kind: "not_authorized",
      message: "Sync incident alerts are not available for this role.",
    }
  );
  assert.deepEqual(
    await decodeMobileSyncIncidentsResponse(
      new Response("signed cursor leaked upstream", { status: 409 }),
      { days: 7, limit: 50, cursor: "signed.cursor" }
    ),
    {
      ok: false,
      status: 409,
      kind: "stale_cursor",
      message:
        "The alert list changed. Refreshing from the first page is required.",
    }
  );
  assert.deepEqual(
    await decodeMobileSyncIncidentsResponse(new Response("{", { status: 200 }), {
      days: 7,
      limit: 50,
    }),
    {
      ok: false,
      status: 502,
      kind: "unavailable",
      message: "Sync incident alerts are temporarily unavailable.",
    }
  );
});

test("support receipts retain the released nullable descriptor contract", async () => {
  const payload = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD);
  payload.incidents[0].receipt.descriptor_key = null;

  const result = await decodeMobileSyncIncidentsResponse(
    new Response(JSON.stringify(payload), { status: 200 }),
    { days: 7, limit: 50 }
  );
  assert.equal(result.ok, true);
});

test("integrity and coverage receipts enforce their exact kind-specific shape", async () => {
  const integrity = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD);
  integrity.summary.support_roots = 0;
  integrity.summary.integrity_findings = 1;
  const integrityReceipt = integrity.incidents[0].receipt;
  integrityReceipt.incident_kind = "integrity_aggregate";
  integrityReceipt.incident_key = `integrity:v1:${"a".repeat(64)}`;
  integrityReceipt.mutation_id = null;
  integrityReceipt.client_stream_id = null;
  integrityReceipt.operation = null;
  integrityReceipt.source_status = null;
  integrityReceipt.error_class = "integrity";
  integrityReceipt.reason = "rpc_rejected";
  integrityReceipt.detail_kind = "acknowledgement";
  integrityReceipt.detail_code = "rejected";

  const integrityResult = await decodeMobileSyncIncidentsResponse(
    new Response(JSON.stringify(integrity), { status: 200 }),
    { days: 7, limit: 50 }
  );
  assert.equal(integrityResult.ok, true);

  const overflow = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD);
  overflow.summary.support_roots = 0;
  overflow.summary.coverage_constrained = 1;
  const overflowReceipt = overflow.incidents[0].receipt;
  overflowReceipt.incident_kind = "queue_overflow";
  overflowReceipt.incident_key = "overflow:v1";
  overflowReceipt.descriptor_key = null;
  overflowReceipt.local_record_id = null;
  overflowReceipt.mutation_id = null;
  overflowReceipt.client_stream_id = null;
  overflowReceipt.operation = null;
  overflowReceipt.source_status = null;
  overflowReceipt.error_class = "queue";
  overflowReceipt.reason = null;
  overflowReceipt.detail_kind = null;
  overflowReceipt.detail_code = null;

  const overflowResult = await decodeMobileSyncIncidentsResponse(
    new Response(JSON.stringify(overflow), { status: 200 }),
    { days: 7, limit: 50 }
  );
  assert.equal(overflowResult.ok, true);

  overflowReceipt.descriptor_key = "TIME_ENTRIES";
  const invalidOverflowResult = await decodeMobileSyncIncidentsResponse(
    new Response(JSON.stringify(overflow), { status: 200 }),
    { days: 7, limit: 50 }
  );
  assert.equal(invalidOverflowResult.ok, false);
});

test("actor correlation and microsecond ordering fail closed without Date rounding", async () => {
  const payload = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD);
  const first = payload.incidents[0];
  first.receipt.received_at = "2026-08-14T11:58:00.123456Z";
  payload.summary.newest_received_at = first.receipt.received_at;

  const second = structuredClone(first);
  second.actor.user_id = "00000000-0000-4000-8000-000000000005";
  second.actor.display_name = "Second Fixture EA";
  second.receipt.actor_user_id = second.actor.user_id;
  second.receipt.mutation_id = "00000000-0000-4000-8000-000000000006";
  second.receipt.incident_key = `support:v1:${second.receipt.mutation_id}`;
  second.receipt.local_record_id = "00000000-0000-4000-8000-000000000007";
  second.receipt.client_stream_id = "00000000-0000-4000-8000-000000000008";
  second.receipt.received_at = "2026-08-14T11:58:00.123455Z";

  payload.incidents = [first, second];
  payload.page_count = 2;
  payload.summary.receipts = 2;
  payload.summary.affected_users = 2;
  payload.summary.support_roots = 2;

  const validResult = await decodeMobileSyncIncidentsResponse(
    new Response(JSON.stringify(payload), { status: 200 }),
    { days: 7, limit: 50 }
  );
  assert.equal(validResult.ok, true);

  payload.incidents = [second, first];
  payload.summary.newest_received_at = second.receipt.received_at;
  const wrongOrderResult = await decodeMobileSyncIncidentsResponse(
    new Response(JSON.stringify(payload), { status: 200 }),
    { days: 7, limit: 50 }
  );
  assert.equal(wrongOrderResult.ok, false);

  payload.incidents = [first, second];
  payload.summary.newest_received_at = first.receipt.received_at;
  second.actor.user_id = first.actor.user_id;
  const mismatchResult = await decodeMobileSyncIncidentsResponse(
    new Response(JSON.stringify(payload), { status: 200 }),
    { days: 7, limit: 50 }
  );
  assert.equal(mismatchResult.ok, false);
});

test("a cursor page cannot return the same cursor and create a no-progress loop", async () => {
  const payload = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD);
  payload.applied_filters.limit = 1;
  payload.summary.receipts = 2;
  payload.summary.support_roots = 2;
  payload.next_cursor = "signed.page.one";

  const result = await decodeMobileSyncIncidentsResponse(
    new Response(JSON.stringify(payload), { status: 200 }),
    { days: 7, limit: 1, cursor: "signed.page.one" }
  );
  assert.equal(result.ok, false);
});

test("every page is bounded by its echoed limit, including terminal cursor pages", async () => {
  const payload = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD);
  const second = structuredClone(payload.incidents[0]);
  second.actor.user_id = "00000000-0000-4000-8000-000000000005";
  second.actor.display_name = "Second Fixture EA";
  second.receipt.actor_user_id = second.actor.user_id;
  second.receipt.mutation_id = "00000000-0000-4000-8000-000000000006";
  second.receipt.incident_key = `support:v1:${second.receipt.mutation_id}`;
  second.receipt.local_record_id = "00000000-0000-4000-8000-000000000007";
  second.receipt.client_stream_id = "00000000-0000-4000-8000-000000000008";
  second.receipt.received_at = "2026-08-14T11:57:00Z";
  payload.applied_filters.limit = 1;
  payload.summary.receipts = 2;
  payload.summary.affected_users = 2;
  payload.summary.support_roots = 2;
  payload.incidents = [payload.incidents[0], second];
  payload.page_count = 2;
  payload.next_cursor = null;

  const result = await decodeMobileSyncIncidentsResponse(
    new Response(JSON.stringify(payload), { status: 200 }),
    { days: 7, limit: 1, cursor: "signed.previous.page" }
  );
  assert.equal(result.ok, false);
});

test("email-like or control-bearing actor presentation never reaches the panel", async () => {
  for (const displayName of ["fixture@example.org", "Fixture\u2028EA"]) {
    const payload = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD);
    payload.incidents[0].actor.display_name = displayName;
    const result = await decodeMobileSyncIncidentsResponse(
      new Response(JSON.stringify(payload), { status: 200 }),
      { days: 7, limit: 50 }
    );
    assert.equal(result.ok, false);
  }
});
