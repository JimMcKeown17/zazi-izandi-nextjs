import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  decodeMobileSyncIncidentsResponse,
  decodeMobileSyncIncidentsV2Response,
} from "./response";
import { VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD } from "./test-fixtures";

function validV2Payload(): Record<string, unknown> {
  const payload = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD);
  const receipt = payload.incidents[0].receipt as unknown as Record<
    string,
    unknown
  >;
  (payload as unknown as Record<string, unknown>).schema_version = 2;
  receipt.schema_version = 2;
  receipt.observed_release_label = "1.1.1+30";
  receipt.observed_update_id = "00000000-0000-4000-8000-000000000030";
  receipt.observed_is_embedded_launch = false;
  return payload as unknown as Record<string, unknown>;
}

function validV3Payload(): Record<string, unknown> {
  const payload = validV2Payload();
  const summary = payload.summary as Record<string, unknown>;
  delete summary.integrity_findings;
  summary.support_roots = 0;
  summary.legacy_receipts = 0;
  summary.effective_v3_conditions = 1;
  const receipt = (
    payload.incidents as Array<{ receipt: Record<string, unknown> }>
  )[0].receipt;
  const conditionKey = [
    "integrity-condition:v2",
    "00000000-0000-4000-8000-000000000004",
    "CHILDREN",
    "ack_malformed",
    "ack_error",
    "malformed_response",
  ].join("|");
  Object.assign(receipt, {
    schema_version: 3,
    incident_key: `integrity:v3:${createHash("sha256").update(conditionKey).digest("hex")}:7`,
    incident_kind: "integrity_aggregate",
    descriptor_key: "CHILDREN",
    local_record_id: null,
    mutation_id: null,
    client_stream_id: "00000000-0000-4000-8000-000000000004",
    operation: null,
    source_status: null,
    error_class: "integrity",
    error_code: "ack_malformed",
    reason: "ack_malformed",
    detail_kind: "ack_error",
    detail_code: "malformed_response",
    condition_key: conditionKey,
    report_generation: 7,
    affected_record_count: 205,
  });
  return payload;
}

async function decodeV2(payload: unknown) {
  return decodeMobileSyncIncidentsV2Response(
    new Response(JSON.stringify(payload), { status: 200 }),
    { days: 7, limit: 50 }
  );
}

test("the v2 decoder accepts exact release provenance", async () => {
  const payload = validV2Payload();
  const result = await decodeV2(payload);

  assert.deepEqual(result, { ok: true, data: payload });
});

test("the v2 envelope retains exact v1 receipts during rolling adoption", async () => {
  const payload = structuredClone(
    VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD
  ) as unknown as Record<string, unknown>;
  payload.schema_version = 2;

  const result = await decodeV2(payload);

  assert.deepEqual(result, { ok: true, data: payload });
});

test("the transition decoder accepts either old summaries or schema-3 summaries", async () => {
  for (const payload of [validV2Payload(), validV3Payload()]) {
    const result = await decodeV2(payload);
    assert.deepEqual(result, { ok: true, data: payload });
  }

  const mixed = validV3Payload();
  (mixed.summary as Record<string, unknown>).integrity_findings = 1;
  assert.equal((await decodeV2(mixed)).ok, false);

  const partial = validV3Payload();
  delete (partial.summary as Record<string, unknown>).effective_v3_conditions;
  assert.equal((await decodeV2(partial)).ok, false);
});

test("the v2 envelope accepts exact schema-3 condition receipts", async () => {
  const payload = validV3Payload();
  assert.deepEqual(await decodeV2(payload), { ok: true, data: payload });

  const mutations: Array<(receipt: Record<string, unknown>) => void> = [
    (receipt) => {
      receipt.incident_key = `integrity:v3:${"a".repeat(64)}:7`;
    },
    (receipt) => {
      receipt.condition_key = `${receipt.condition_key as string}x`;
    },
    (receipt) => {
      receipt.report_generation = 8;
    },
    (receipt) => {
      receipt.client_stream_id = null;
    },
    (receipt) => {
      receipt.email = "must-not-leak@example.org";
    },
  ];
  for (const mutate of mutations) {
    const candidate = validV3Payload();
    mutate(
      (candidate.incidents as Array<{ receipt: Record<string, unknown> }>)[0]
        .receipt
    );
    assert.equal((await decodeV2(candidate)).ok, false);
  }
});

test("the v1 decoder remains exact and does not silently widen to v2", async () => {
  const result = await decodeMobileSyncIncidentsResponse(
    new Response(JSON.stringify(validV2Payload()), { status: 200 }),
    { days: 7, limit: 50 }
  );

  assert.equal(result.ok, false);
});

test("a v1 envelope rejects a v2 receipt even if only the outer version is rolled back", async () => {
  const payload = validV2Payload();
  payload.schema_version = 1;

  const result = await decodeMobileSyncIncidentsResponse(
    new Response(JSON.stringify(payload), { status: 200 }),
    { days: 7, limit: 50 }
  );

  assert.equal(result.ok, false);
});

test("v2 rejects missing, extra, and malformed provenance fields", async () => {
  const mutations: Array<(payload: Record<string, unknown>) => void> = [
    (payload) => {
      const receipt = (
        payload.incidents as Array<{ receipt: Record<string, unknown> }>
      )[0].receipt;
      delete receipt.observed_release_label;
    },
    (payload) => {
      const receipt = (
        payload.incidents as Array<{ receipt: Record<string, unknown> }>
      )[0].receipt;
      receipt.unreviewed_provenance = "extra";
    },
    (payload) => {
      payload.unreviewed_summary = {};
    },
    (payload) => {
      const receipt = (
        payload.incidents as Array<{ receipt: Record<string, unknown> }>
      )[0].receipt;
      receipt.observed_update_id = "not-a-uuid";
    },
    (payload) => {
      const receipt = (
        payload.incidents as Array<{ receipt: Record<string, unknown> }>
      )[0].receipt;
      receipt.observed_is_embedded_launch = "false";
    },
    (payload) => {
      const receipt = (
        payload.incidents as Array<{ receipt: Record<string, unknown> }>
      )[0].receipt;
      receipt.observed_release_label = "x".repeat(129);
    },
    (payload) => {
      const receipt = (
        payload.incidents as Array<{ receipt: Record<string, unknown> }>
      )[0].receipt;
      receipt.schema_version = 3;
    },
  ];

  for (const mutate of mutations) {
    const payload = validV2Payload();
    mutate(payload);
    const result = await decodeV2(payload);
    assert.equal(result.ok, false);
  }
});

test("v1 members of a v2 envelope cannot carry v2-only fields", async () => {
  const payload = validV2Payload();
  const receipt = (
    payload.incidents as Array<{ receipt: Record<string, unknown> }>
  )[0].receipt;
  receipt.schema_version = 1;

  const result = await decodeV2(payload);

  assert.equal(result.ok, false);
});

test("provenance relations reject claims inconsistent with launch identity", async () => {
  const unknownLaunch = validV2Payload();
  const unknownReceipt = (
    unknownLaunch.incidents as Array<{ receipt: Record<string, unknown> }>
  )[0].receipt;
  unknownReceipt.observed_is_embedded_launch = null;
  const unknownResult = await decodeV2(unknownLaunch);
  assert.equal(unknownResult.ok, false);

  const embeddedLaunch = validV2Payload();
  const embeddedReceipt = (
    embeddedLaunch.incidents as Array<{ receipt: Record<string, unknown> }>
  )[0].receipt;
  embeddedReceipt.observed_is_embedded_launch = true;
  const embeddedResult = await decodeV2(embeddedLaunch);
  assert.equal(embeddedResult.ok, false);

  const honestlyUnknown = validV2Payload();
  const honestlyUnknownReceipt = (
    honestlyUnknown.incidents as Array<{ receipt: Record<string, unknown> }>
  )[0].receipt;
  honestlyUnknownReceipt.observed_release_label = null;
  honestlyUnknownReceipt.observed_update_id = null;
  honestlyUnknownReceipt.observed_is_embedded_launch = null;
  const honestlyUnknownResult = await decodeV2(honestlyUnknown);
  assert.equal(honestlyUnknownResult.ok, true);

  const embeddedWithoutUpdate = validV2Payload();
  const embeddedWithoutUpdateReceipt = (
    embeddedWithoutUpdate.incidents as Array<{ receipt: Record<string, unknown> }>
  )[0].receipt;
  embeddedWithoutUpdateReceipt.observed_update_id = null;
  embeddedWithoutUpdateReceipt.observed_is_embedded_launch = true;
  const embeddedWithoutUpdateResult = await decodeV2(embeddedWithoutUpdate);
  assert.equal(embeddedWithoutUpdateResult.ok, true);
});
