import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_USER_HEALTH_DAYS,
  firstUserHealthParam,
  parseUserHealthDays,
} from "./page-state";

test("the activity window defaults to seven days and accepts Today", () => {
  assert.equal(DEFAULT_USER_HEALTH_DAYS, 7);
  assert.equal(parseUserHealthDays(undefined), 7);
  assert.equal(parseUserHealthDays("1"), 1);
  assert.equal(parseUserHealthDays("90"), 90);
});

test("invalid or repeated activity-window parameters fail to a bounded default", () => {
  assert.equal(parseUserHealthDays("0"), 7);
  assert.equal(parseUserHealthDays("91"), 7);
  assert.equal(parseUserHealthDays("7.5"), 7);
  assert.equal(parseUserHealthDays("today"), 7);
  assert.equal(firstUserHealthParam(["1", "30"]), "1");
});
