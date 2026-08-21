import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUserHealthOverviewMetrics,
  filterUserHealthPopulation,
  formatActiveCardLabel,
} from "./overview";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "./test-fixtures";

test("overview metrics separate lifetime activation, windowed activity, and blockers", () => {
  const metrics = buildUserHealthOverviewMetrics(
    VALID_MOBILE_USER_HEALTH_PAYLOAD.users
  );

  assert.deepEqual(metrics, {
    accounts: 5,
    activatedEver: 3,
    activeInWindow: 2,
    needsAttention: 2,
    attentionAccess: 1,
    attentionSetup: 1,
  });
});

test("population filters scope every headline denominator without applying triage", () => {
  const users = VALID_MOBILE_USER_HEALTH_PAYLOAD.users;
  const primaryWaveId = VALID_MOBILE_USER_HEALTH_PAYLOAD.wave_options[0].id;

  assert.deepEqual(
    filterUserHealthPopulation(users, {
      cohort: "seeded",
      wave: primaryWaveId,
    }).map((user) => user.display_name),
    ["Asemahle Mancayi", "Lihle Jacobs"]
  );
});

test("the one-day calendar window is labelled Today", () => {
  assert.equal(formatActiveCardLabel(1), "Active today");
  assert.equal(formatActiveCardLabel(7), "Active · 7d");
});
