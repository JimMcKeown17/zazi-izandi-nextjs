import { strict as assert } from "node:assert";
import { test } from "node:test";

import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "./test-fixtures";
import {
  filterRowsByWave,
  getWaveDayNumber,
  hasPartBCapability,
} from "./wave";

test("wave day number is whole days between launch and generated_at in SAST", () => {
  assert.equal(getWaveDayNumber("2026-08-08", "2026-08-12T10:00:00+02:00"), 4);
  // SAST rollover: 23:30 UTC on the 11th is already the 12th in SAST
  assert.equal(getWaveDayNumber("2026-08-08", "2026-08-11T23:30:00+00:00"), 4);
  assert.equal(getWaveDayNumber("2026-08-08", "2026-08-08T06:00:00+02:00"), 0);
  assert.equal(getWaveDayNumber("2026-08-20", "2026-08-12T10:00:00+02:00"), -8);
});

test("filterRowsByWave narrows to a wave, to no-wave, or passes all", () => {
  const users = VALID_MOBILE_USER_HEALTH_PAYLOAD.users;
  const primaryWaveId = VALID_MOBILE_USER_HEALTH_PAYLOAD.wave_options[0].id;

  assert.equal(filterRowsByWave(users, "all"), users);
  assert.deepEqual(
    filterRowsByWave(users, "none").map((user) => user.display_name),
    ["Zimasa Diko"]
  );
  assert.deepEqual(
    filterRowsByWave(users, primaryWaveId).map((user) => user.display_name),
    ["Asemahle Mancayi", "Lihle Jacobs"]
  );
});

test("Part B capability is based on wave_options key presence", () => {
  assert.equal(hasPartBCapability({ wave_options: [] }), true);
  assert.equal(hasPartBCapability({}), false);
});
