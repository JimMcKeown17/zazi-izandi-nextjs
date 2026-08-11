import assert from "node:assert/strict";
import test from "node:test";

import { decodeMobileSessionsActivityResponse } from "./response";
import { VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD } from "./test-fixtures";

test("a complete valid frozen sessions payload is accepted", async () => {
  const response = new Response(
    JSON.stringify(VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );

  assert.deepEqual(await decodeMobileSessionsActivityResponse(response), {
    ok: true,
    data: VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD,
  });
});

test("an upstream HTTP failure becomes a sanitized report-unavailable result", async () => {
  const response = new Response(
    JSON.stringify(VALID_MOBILE_SESSIONS_ACTIVITY_PAYLOAD),
    { status: 503 }
  );

  assert.deepEqual(await decodeMobileSessionsActivityResponse(response), {
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

    assert.deepEqual(await decodeMobileSessionsActivityResponse(response), {
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

  assert.deepEqual(await decodeMobileSessionsActivityResponse(response), {
    ok: false,
    status: 502,
    message: "The mobile-app report returned an unexpected data format.",
  });
});
