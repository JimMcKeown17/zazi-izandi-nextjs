import assert from "node:assert/strict";
import test from "node:test";

import { decodeMobileUserHealthResponse } from "./response";
import { mobileUserHealthSchema } from "./schema";
import {
  LEGACY_MOBILE_USER_HEALTH_PAYLOAD,
  VALID_MOBILE_USER_HEALTH_PAYLOAD,
} from "./test-fixtures";
import type { MobileUserHealthResponse } from "./types";

const primaryWave = {
  id: "aaaaaaaa-0000-4000-8000-000000000001",
  name: "ZZ Primary 2026",
  launch_date: "2026-08-08",
};

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

test("setup mode, expectation, and attention reasons must reconcile", () => {
  const mismatchedExpectation = structuredClone(
    VALID_MOBILE_USER_HEALTH_PAYLOAD
  ) as MobileUserHealthResponse;
  mismatchedExpectation.users[0].data.expectation = "self_setup";

  const inventedSeedBlocker = structuredClone(
    VALID_MOBILE_USER_HEALTH_PAYLOAD
  ) as MobileUserHealthResponse;
  inventedSeedBlocker.users[2].attention_reasons = [
    "seeded_children_missing",
  ];

  const missingAuthBlocker = structuredClone(
    VALID_MOBILE_USER_HEALTH_PAYLOAD
  ) as MobileUserHealthResponse;
  missingAuthBlocker.users[3].attention_reasons = [];

  assert.equal(
    mobileUserHealthSchema.safeParse(mismatchedExpectation).success,
    false
  );
  assert.equal(
    mobileUserHealthSchema.safeParse(inventedSeedBlocker).success,
    false
  );
  assert.equal(
    mobileUserHealthSchema.safeParse(missingAuthBlocker).success,
    false
  );
});

test("decoding RETAINS wave, lifetime, and app_open values exactly", () => {
  const payload = structuredClone(
    VALID_MOBILE_USER_HEALTH_PAYLOAD
  ) as MobileUserHealthResponse;
  payload.wave_options = [primaryWave];
  for (const user of payload.users) {
    user.wave = null;
  }
  payload.users[0].wave = primaryWave;
  payload.users[0].first_ever_activity_at = "2026-05-01T08:00:00+00:00";
  payload.users[0].last_ever_activity_at =
    payload.users[0].activity.last_activity_at ??
    "2026-08-10T11:30:00+00:00";
  payload.users[0].ever_registered_device = true;
  payload.users[0].first_app_open_at = "2026-08-09T06:45:00+00:00";
  payload.users[0].last_app_open_at = "2026-08-11T06:45:00+00:00";

  const parsed = mobileUserHealthSchema.parse(payload);

  assert.deepEqual(parsed.wave_options, [primaryWave]);
  assert.deepEqual(parsed.users[0].wave, primaryWave);
  assert.equal(
    parsed.users[0].first_ever_activity_at,
    "2026-05-01T08:00:00+00:00"
  );
  assert.equal(
    parsed.users[0].last_ever_activity_at,
    payload.users[0].activity.last_activity_at
  );
  assert.equal(parsed.users[0].ever_registered_device, true);
  assert.equal(
    parsed.users[0].first_app_open_at,
    "2026-08-09T06:45:00+00:00"
  );
  assert.equal(
    parsed.users[0].last_app_open_at,
    "2026-08-11T06:45:00+00:00"
  );
});

test("accepts the pre-wave legacy payload unchanged", () => {
  assert.equal(
    mobileUserHealthSchema.safeParse(LEGACY_MOBILE_USER_HEALTH_PAYLOAD).success,
    true
  );
});

test("rejects inverted lifetime bounds", () => {
  const payload = structuredClone(
    VALID_MOBILE_USER_HEALTH_PAYLOAD
  ) as MobileUserHealthResponse;
  payload.users[0].first_ever_activity_at = "2026-08-12T06:10:00+00:00";
  payload.users[0].last_ever_activity_at = "2026-08-11T06:10:00+00:00";

  assert.equal(mobileUserHealthSchema.safeParse(payload).success, false);
});

test("rejects one-sided lifetime and app_open nullity", () => {
  const lifetimePayload = structuredClone(
    VALID_MOBILE_USER_HEALTH_PAYLOAD
  ) as MobileUserHealthResponse;
  lifetimePayload.users[0].first_ever_activity_at = null;
  lifetimePayload.users[0].last_ever_activity_at =
    "2026-08-11T06:10:00+00:00";

  const appOpenPayload = structuredClone(
    VALID_MOBILE_USER_HEALTH_PAYLOAD
  ) as MobileUserHealthResponse;
  appOpenPayload.users[0].first_app_open_at =
    "2026-08-11T06:00:00+00:00";
  appOpenPayload.users[0].last_app_open_at = null;

  assert.equal(
    mobileUserHealthSchema.safeParse(lifetimePayload).success,
    false
  );
  assert.equal(
    mobileUserHealthSchema.safeParse(appOpenPayload).success,
    false
  );
});

test("rejects Part B timestamp pairs whose optional keys do not ship together", () => {
  const lifetimePayload = structuredClone(
    VALID_MOBILE_USER_HEALTH_PAYLOAD
  ) as MobileUserHealthResponse;
  lifetimePayload.users[3].first_ever_activity_at = null;
  delete lifetimePayload.users[3].last_ever_activity_at;

  const appOpenPayload = structuredClone(
    VALID_MOBILE_USER_HEALTH_PAYLOAD
  ) as MobileUserHealthResponse;
  appOpenPayload.users[3].first_app_open_at = null;
  delete appOpenPayload.users[3].last_app_open_at;

  assert.equal(
    mobileUserHealthSchema.safeParse(lifetimePayload).success,
    false
  );
  assert.equal(
    mobileUserHealthSchema.safeParse(appOpenPayload).success,
    false
  );
});

test("rejects lifetime bounds that do not cover windowed activity", () => {
  const nullLifetimePayload = structuredClone(
    VALID_MOBILE_USER_HEALTH_PAYLOAD
  ) as MobileUserHealthResponse;
  nullLifetimePayload.users[0].first_ever_activity_at = null;
  nullLifetimePayload.users[0].last_ever_activity_at = null;

  const staleLifetimePayload = structuredClone(
    VALID_MOBILE_USER_HEALTH_PAYLOAD
  ) as MobileUserHealthResponse;
  staleLifetimePayload.users[0].last_ever_activity_at =
    "2026-08-11T06:09:59+00:00";

  assert.equal(
    mobileUserHealthSchema.safeParse(nullLifetimePayload).success,
    false
  );
  assert.equal(
    mobileUserHealthSchema.safeParse(staleLifetimePayload).success,
    false
  );
});

test("rejects inverted app_open bounds", () => {
  const payload = structuredClone(
    VALID_MOBILE_USER_HEALTH_PAYLOAD
  ) as MobileUserHealthResponse;
  payload.users[0].first_app_open_at = "2026-08-12T06:45:00+00:00";
  payload.users[0].last_app_open_at = "2026-08-11T06:45:00+00:00";

  assert.equal(mobileUserHealthSchema.safeParse(payload).success, false);
});

test("rejects a user wave missing from wave_options", () => {
  const payload = structuredClone(
    VALID_MOBILE_USER_HEALTH_PAYLOAD
  ) as MobileUserHealthResponse;
  payload.wave_options = [];
  for (const user of payload.users) {
    user.wave = null;
  }
  payload.users[0].wave = primaryWave;

  assert.equal(mobileUserHealthSchema.safeParse(payload).success, false);
});

test("rejects duplicate wave_option ids", () => {
  const duplicatePayload = structuredClone(
    VALID_MOBILE_USER_HEALTH_PAYLOAD
  ) as MobileUserHealthResponse;
  for (const user of duplicatePayload.users) {
    user.wave = null;
  }
  duplicatePayload.wave_options = [primaryWave, primaryWave];

  assert.equal(
    mobileUserHealthSchema.safeParse(duplicatePayload).success,
    false
  );
});

test("accepts unique wave_options regardless of payload ordering", () => {
  const unsortedPayload = structuredClone(
    VALID_MOBILE_USER_HEALTH_PAYLOAD
  ) as MobileUserHealthResponse;
  unsortedPayload.wave_options = [
    ...(unsortedPayload.wave_options ?? []),
  ].reverse();

  const idUnsortedPayload = structuredClone(
    VALID_MOBILE_USER_HEALTH_PAYLOAD
  ) as MobileUserHealthResponse;
  for (const user of idUnsortedPayload.users) {
    user.wave = null;
  }
  idUnsortedPayload.wave_options = [
    {
      id: "aaaaaaaa-0000-4000-8000-000000000003",
      name: "Same name",
      launch_date: "2026-08-12",
    },
    {
      id: "aaaaaaaa-0000-4000-8000-000000000002",
      name: "same NAME",
      launch_date: "2026-08-12",
    },
  ];

  assert.equal(
    mobileUserHealthSchema.safeParse(unsortedPayload).success,
    true
  );
  assert.equal(
    mobileUserHealthSchema.safeParse(idUnsortedPayload).success,
    true
  );
});

test("rejects a registered device that claims never-registered", () => {
  const payload = structuredClone(
    VALID_MOBILE_USER_HEALTH_PAYLOAD
  ) as MobileUserHealthResponse;
  payload.users[0].ever_registered_device = false;

  assert.equal(mobileUserHealthSchema.safeParse(payload).success, false);
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
