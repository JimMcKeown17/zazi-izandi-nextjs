import assert from "node:assert/strict";
import test from "node:test";

import { decodeMobileTimeEntriesActivityResponse } from "./response";
import { VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD } from "./test-fixtures";

test("a complete clock report with open and automatic entries is accepted", async () => {
  const response = new Response(
    JSON.stringify(VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );

  assert.deepEqual(
    await decodeMobileTimeEntriesActivityResponse(response, { schoolType: null }),
    {
      ok: true,
      data: VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD,
    }
  );
});

test("clock responses fail closed when active state and nullable fields disagree", async () => {
  const invalid = {
    ...VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD,
    entries: [
      {
        ...VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD.entries[0],
        is_active: false,
      },
      ...VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD.entries.slice(1),
    ],
  };

  const result = await decodeMobileTimeEntriesActivityResponse(
    new Response(JSON.stringify(invalid), { status: 200 }),
    { schoolType: null }
  );
  assert.deepEqual(result, {
    ok: false,
    status: 502,
    message: "The clock report returned an unexpected data format.",
  });
});

test("clock responses fail closed when summary totals do not reconcile", async () => {
  const invalid = {
    ...VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD,
    summary: {
      ...VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD.summary,
      completed_duration_minutes: 999,
    },
  };

  const result = await decodeMobileTimeEntriesActivityResponse(
    new Response(JSON.stringify(invalid), { status: 200 }),
    { schoolType: null }
  );
  assert.equal(result.ok, false);
});

test("clock HTTP and malformed-body failures are sanitized", async () => {
  assert.deepEqual(
    await decodeMobileTimeEntriesActivityResponse(new Response("", { status: 503 }), {
      schoolType: null,
    }),
    {
      ok: false,
      status: 503,
      message: "The mobile-app report service could not return clock data.",
    }
  );
  assert.deepEqual(
    await decodeMobileTimeEntriesActivityResponse(new Response("{", { status: 200 }), {
      schoolType: null,
    }),
    {
      ok: false,
      status: 502,
      message: "The clock report returned an unexpected data format.",
    }
  );
});

test("a clock report that does not confirm the requested school type fails closed", async () => {
  const response = new Response(
    JSON.stringify(VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
  assert.deepEqual(
    await decodeMobileTimeEntriesActivityResponse(response, { schoolType: "primary" }),
    {
      ok: false,
      status: 502,
      message:
        "The mobile-app report could not confirm the ECD/Primary filter was applied.",
    }
  );

  const filtered = {
    ...VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD,
    applied_filters: {
      ...VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD.applied_filters,
      school_type: "primary",
    },
  };
  assert.deepEqual(
    await decodeMobileTimeEntriesActivityResponse(
      new Response(JSON.stringify(filtered), { status: 200 }),
      { schoolType: "primary" }
    ),
    { ok: true, data: filtered }
  );
});
