import assert from "node:assert/strict";
import test from "node:test";

import { decodeMobileUserProfileResponse } from "./response";
import { VALID_MOBILE_USER_PROFILE_PAYLOAD } from "./test-fixtures";

test("a complete user profile response is decoded without losing values", async () => {
  assert.deepEqual(
    await decodeMobileUserProfileResponse(
      new Response(JSON.stringify(VALID_MOBILE_USER_PROFILE_PAYLOAD), {
        status: 200,
      })
    ),
    { ok: true, data: VALID_MOBILE_USER_PROFILE_PAYLOAD }
  );
});

test("HTTP 404 with the not-found code maps despite extra metadata", async () => {
  assert.deepEqual(
    await decodeMobileUserProfileResponse(
      new Response(
        JSON.stringify({
          error: "user not found",
          code: "mobile_user_not_found",
          correlation_id: "profile-404-test",
        }),
        { status: 404 }
      )
    ),
    { ok: false, status: 404, notFound: true }
  );
});

test("HTTP 422 with the integrity code maps despite extra metadata", async () => {
  assert.deepEqual(
    await decodeMobileUserProfileResponse(
      new Response(
        JSON.stringify({
          error: "mobile reporting data integrity issue",
          code: "mobile_user_profile_data_integrity",
          correlation_id: "profile-422-test",
        }),
        { status: 422 }
      )
    ),
    { ok: false, status: 422, dataQuality: true }
  );
});

test("codeless and unknown-code profile errors stay generic", async () => {
  const cases = [
    {
      status: 404,
      payload: { error: "user not found" },
    },
    {
      status: 404,
      payload: { error: "user not found", code: "unknown_not_found" },
    },
    {
      status: 422,
      payload: { error: "mobile reporting data integrity issue" },
    },
    {
      status: 422,
      payload: {
        error: "mobile reporting data integrity issue",
        code: "unknown_integrity_issue",
      },
    },
  ] as const;

  for (const { status, payload } of cases) {
    assert.deepEqual(
      await decodeMobileUserProfileResponse(
        new Response(JSON.stringify(payload), { status })
      ),
      {
        ok: false,
        status,
        message: "The user profile service could not return user data.",
      }
    );
  }
});

test("the reporting-unavailable 502 code remains a generic service failure", async () => {
  assert.deepEqual(
    await decodeMobileUserProfileResponse(
      new Response(
        JSON.stringify({
          error: "mobile reporting service unavailable",
          code: "mobile_reporting_unavailable",
        }),
        { status: 502 }
      )
    ),
    {
      ok: false,
      status: 502,
      message: "The user profile service could not return user data.",
    }
  );
});

test("unknown 4xx and 5xx statuses remain generic service errors", async () => {
  for (const status of [409, 500]) {
    assert.deepEqual(
      await decodeMobileUserProfileResponse(
        new Response(JSON.stringify({ error: "unexpected failure" }), {
          status,
        })
      ),
      {
        ok: false,
        status,
        message: "The user profile service could not return user data.",
      }
    );
  }
});

test("route-level HTML and malformed 404 responses stay service errors", async () => {
  const expected = {
    ok: false,
    status: 404,
    message: "The user profile service could not return user data.",
  };

  assert.deepEqual(
    await decodeMobileUserProfileResponse(
      new Response("<html>Not Found</html>", { status: 404 })
    ),
    expected
  );
  assert.deepEqual(
    await decodeMobileUserProfileResponse(
      new Response(JSON.stringify({ error: "not found", detail: "route" }), {
        status: 404,
      })
    ),
    expected
  );
  assert.deepEqual(
    await decodeMobileUserProfileResponse(new Response(null, { status: 404 })),
    expected
  );
});

test("non-OK and malformed successful responses use sanitized service errors", async () => {
  assert.deepEqual(
    await decodeMobileUserProfileResponse(new Response("", { status: 503 })),
    {
      ok: false,
      status: 503,
      message: "The user profile service could not return user data.",
    }
  );
  assert.deepEqual(
    await decodeMobileUserProfileResponse(new Response("", { status: 200 })),
    {
      ok: false,
      status: 502,
      message: "The user profile service returned an unexpected format.",
    }
  );
});
