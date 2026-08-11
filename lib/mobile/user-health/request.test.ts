import assert from "node:assert/strict";
import test from "node:test";

import { buildUserHealthRequest } from "./request";

test("user-health requests forward bounded filters and Clerk bearer auth", () => {
  const request = buildUserHealthRequest("session-token", {
    days: 30,
    schoolId: "a0c54f15-e176-42c5-ad0e-300947557005",
  });
  assert.equal(
    request.path,
    "/api/mobile/user-health/?days=30&school_id=a0c54f15-e176-42c5-ad0e-300947557005"
  );
  assert.equal(request.init.cache, "no-store");
  assert.equal(
    new Headers(request.init.headers).get("Authorization"),
    "Bearer session-token"
  );
  assert.throws(
    () => buildUserHealthRequest("session-token", { days: 91 }),
    /between 1 and 90/
  );
});
