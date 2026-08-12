import assert from "node:assert/strict";
import test from "node:test";

import { decodeMobileUserHealthResponse } from "./response";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "./test-fixtures";

test("a complete cross-source user health payload is accepted", async () => {
  const result = await decodeMobileUserHealthResponse(
    new Response(JSON.stringify(VALID_MOBILE_USER_HEALTH_PAYLOAD), {
      status: 200,
    })
  );
  assert.deepEqual(result, {
    ok: true,
    data: VALID_MOBILE_USER_HEALTH_PAYLOAD,
  });
});

test("health-board summaries and device evidence must reconcile", async () => {
  const invalidSummary = {
    ...VALID_MOBILE_USER_HEALTH_PAYLOAD,
    summary: {
      ...VALID_MOBILE_USER_HEALTH_PAYLOAD.summary,
      authenticated_after_provisioning: 99,
    },
  };
  assert.equal(
    (
      await decodeMobileUserHealthResponse(
        new Response(JSON.stringify(invalidSummary), { status: 200 })
      )
    ).ok,
    false
  );

  const invalidAuthenticationEvidence = {
    ...VALID_MOBILE_USER_HEALTH_PAYLOAD,
    users: [
      {
        ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0],
        auth: {
          ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0].auth,
          authenticated_after_provisioning: false,
        },
      },
      ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users.slice(1),
    ],
  };
  assert.equal(
    (
      await decodeMobileUserHealthResponse(
        new Response(JSON.stringify(invalidAuthenticationEvidence), { status: 200 })
      )
    ).ok,
    false
  );

  const invalidDevice = {
    ...VALID_MOBILE_USER_HEALTH_PAYLOAD,
    users: [
      {
        ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0],
        app_device: {
          ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0].app_device,
          platform: null,
        },
      },
      ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users.slice(1),
    ],
  };
  assert.equal(
    (
      await decodeMobileUserHealthResponse(
        new Response(JSON.stringify(invalidDevice), { status: 200 })
      )
    ).ok,
    false
  );
});

test("health-board HTTP and malformed-body failures are sanitized", async () => {
  assert.deepEqual(
    await decodeMobileUserHealthResponse(new Response("", { status: 503 })),
    {
      ok: false,
      status: 503,
      message: "The onboarding health service could not return user data.",
    }
  );
  assert.deepEqual(
    await decodeMobileUserHealthResponse(new Response("", { status: 200 })),
    {
      ok: false,
      status: 502,
      message: "The onboarding health service returned an unexpected format.",
    }
  );
});
