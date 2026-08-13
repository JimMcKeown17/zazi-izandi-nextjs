import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUserProfileRequest,
  validateProfileUserId,
} from "./request";

const USER_ID = "3eb26195-c9b4-41a2-a01d-3b341a28177e";

test("profile requests use the user endpoint and Clerk bearer auth", () => {
  const request = buildUserProfileRequest("session-token", USER_ID);
  assert.equal(request.path, `/api/mobile/users/${USER_ID}/`);
  assert.equal(request.init.cache, "no-store");
  assert.equal(
    new Headers(request.init.headers).get("Authorization"),
    "Bearer session-token"
  );
});

test("profile ids are validated in the pure request seam", () => {
  assert.equal(validateProfileUserId("not-a-uuid"), null);
  assert.equal(validateProfileUserId(USER_ID.toUpperCase()), USER_ID);
  assert.throws(
    () => buildUserProfileRequest("session-token", "not-a-uuid"),
    RangeError
  );
});
