import assert from "node:assert/strict";
import test from "node:test";

import { decodeMobileSessionReviewFlagsResponse, decodeMobileSessionsActivityResponse } from "./response";
import {
  VALID_MOBILE_SESSION_REVIEW_FLAGS_PAYLOAD,
  VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD,
} from "./test-fixtures";

test("a complete valid frozen sessions payload is accepted", async () => {
  const response = new Response(
    JSON.stringify(VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );

  assert.deepEqual(await decodeMobileSessionsActivityResponse(response, { schoolType: null }), {
    ok: true,
    data: VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD,
  });
});

test("an upstream HTTP failure becomes a sanitized report-unavailable result", async () => {
  const response = new Response(
    JSON.stringify(VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD),
    { status: 503 }
  );

  assert.deepEqual(await decodeMobileSessionsActivityResponse(response, { schoolType: null }), {
    ok: false,
    status: 503,
    message: "The mobile-app report service could not return session data.",
  });
});

test("2xx empty and malformed JSON become a sanitized report-unavailable result", async () => {
  for (const body of ["", "{"]) {
    const response = new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    assert.deepEqual(await decodeMobileSessionsActivityResponse(response, { schoolType: null }), {
      ok: false,
      status: 502,
      message: "The mobile-app report returned an unexpected data format.",
    });
  }
});

test("2xx schema-invalid JSON becomes a sanitized report-unavailable result", async () => {
  const invalidPayload = {
    ...VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD,
    daily_trend: [
      {
        ...VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD.daily_trend[0],
        total: 999,
      },
      VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD.daily_trend[1],
    ],
  };
  const response = new Response(JSON.stringify(invalidPayload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  assert.deepEqual(await decodeMobileSessionsActivityResponse(response, { schoolType: null }), {
    ok: false,
    status: 502,
    message: "The mobile-app report returned an unexpected data format.",
  });
});

test("a complete valid frozen session-review payload is accepted", async () => {
  const response = new Response(
    JSON.stringify(VALID_MOBILE_SESSION_REVIEW_FLAGS_PAYLOAD),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );

  assert.deepEqual(await decodeMobileSessionReviewFlagsResponse(response), {
    ok: true,
    data: VALID_MOBILE_SESSION_REVIEW_FLAGS_PAYLOAD,
  });
});

test("session review HTTP and schema failures stay unavailable, never a false zero", async () => {
  const failed = new Response(
    JSON.stringify(VALID_MOBILE_SESSION_REVIEW_FLAGS_PAYLOAD),
    { status: 503 }
  );
  assert.deepEqual(await decodeMobileSessionReviewFlagsResponse(failed), {
    ok: false,
    status: 503,
    message: "Session review alerts are unavailable",
  });

  const malformed = new Response(
    JSON.stringify({
      ...VALID_MOBILE_SESSION_REVIEW_FLAGS_PAYLOAD,
      count: 0,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
  assert.deepEqual(await decodeMobileSessionReviewFlagsResponse(malformed), {
    ok: false,
    status: 502,
    message: "Session review alerts are unavailable",
  });
});

test("a report that does not confirm the requested school type fails closed", async () => {
  // Simulates a backend that silently ignores the filter: the caller asked for
  // ECD but the echo is null (or, for a legacy backend, absent entirely).
  const response = new Response(
    JSON.stringify(VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
  assert.deepEqual(
    await decodeMobileSessionsActivityResponse(response, { schoolType: "ecd" }),
    {
      ok: false,
      status: 502,
      message:
        "The mobile-app report could not confirm the ECD/Primary filter was applied.",
    }
  );
});

test("a school-type report is accepted only when the echo confirms it", async () => {
  const filtered = {
    ...VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD,
    applied_filters: {
      ...VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD.applied_filters,
      school_type: "ecd",
    },
  };

  const confirmed = new Response(JSON.stringify(filtered), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  assert.deepEqual(
    await decodeMobileSessionsActivityResponse(confirmed, { schoolType: "ecd" }),
    { ok: true, data: filtered }
  );

  // The same ECD-confirmed payload must NOT satisfy an unfiltered request; an
  // unexpected filter echo is as much a mismatch as a missing one.
  const overFiltered = new Response(JSON.stringify(filtered), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  assert.deepEqual(
    await decodeMobileSessionsActivityResponse(overFiltered, { schoolType: null }),
    {
      ok: false,
      status: 502,
      message:
        "The mobile-app report could not confirm the ECD/Primary filter was applied.",
    }
  );
});
