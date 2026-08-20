import assert from "node:assert/strict";
import test from "node:test";

import { buildSessionReviewFlagsRequest, buildSessionsActivityRequest } from "./request";

test("sessions requests forward the bearer token, filters, and disable caching", () => {
  const request = buildSessionsActivityRequest(
    "clerk-session-token",
    {
      days: 30,
      schoolId: "a0c54f15-e176-42c5-ad0e-300947557005",
    }
  );

  assert.equal(
    request.path,
    "/api/mobile/sessions-activity/?days=30&school_id=a0c54f15-e176-42c5-ad0e-300947557005"
  );
  assert.equal(request.init.cache, "no-store");
  assert.equal(
    new Headers(request.init.headers).get("Authorization"),
    "Bearer clerk-session-token"
  );
  assert.throws(
    () => buildSessionsActivityRequest("token", { days: 91 }),
    /between 1 and 90/
  );
});

test("session review-flag requests forward the bearer token and both school filters", () => {
  const request = buildSessionReviewFlagsRequest("clerk-session-token", {
    schoolId: "a0c54f15-e176-42c5-ad0e-300947557005",
    schoolType: "ecd",
  });

  assert.equal(
    request.path,
    "/api/mobile/session-review-flags/?limit=50&school_id=a0c54f15-e176-42c5-ad0e-300947557005&school_type=ecd"
  );
  assert.equal(request.init.cache, "no-store");
  assert.equal(
    new Headers(request.init.headers).get("Authorization"),
    "Bearer clerk-session-token"
  );
  assert.throws(
    () => buildSessionReviewFlagsRequest("token", { limit: 0 }),
    /between 1 and 100/
  );
});
