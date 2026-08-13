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

test("only the exact endpoint 404 body maps to the not-found variant", async () => {
  assert.deepEqual(
    await decodeMobileUserProfileResponse(
      new Response(JSON.stringify({ error: "user not found" }), {
        status: 404,
      })
    ),
    { ok: false, status: 404, notFound: true }
  );
});

test("the exact integrity-error 422 maps to the data-quality variant", async () => {
  assert.deepEqual(
    await decodeMobileUserProfileResponse(
      new Response(
        JSON.stringify({ error: "mobile reporting data integrity issue" }),
        { status: 422 }
      )
    ),
    { ok: false, status: 422, dataQuality: true }
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

test("route-level HTML and different-JSON 404 responses stay service errors", async () => {
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
    await decodeMobileUserProfileResponse(
      new Response(
        JSON.stringify({ error: "user not found", detail: "unexpected" }),
        { status: 404 }
      )
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
