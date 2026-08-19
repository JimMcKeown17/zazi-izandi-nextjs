import assert from "node:assert/strict";
import test from "node:test";

import {
  SESSION_REVIEW_ALERTS_UNAVAILABLE,
  SESSION_REVIEW_REASON_COPY,
} from "./session-review-copy";

test("session review copy names the roster fact without accusing the EA of fraud", () => {
  assert.equal(
    SESSION_REVIEW_ALERTS_UNAVAILABLE,
    "Session review alerts are unavailable"
  );
  assert.match(
    SESSION_REVIEW_REASON_COPY.same_school_child_not_assigned_to_actor,
    /another education assistant at the same school/
  );
  assert.doesNotMatch(
    SESSION_REVIEW_REASON_COPY.same_school_child_not_assigned_to_actor,
    /fraud|cheat|steal/i
  );
});
