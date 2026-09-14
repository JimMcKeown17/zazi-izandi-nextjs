import assert from "node:assert/strict";
import test from "node:test";

import { decodeCoachPlusResponse, isCanonicalUserId } from "./coach-plus";

test("decodes an enabled row", () => {
  assert.deepEqual(decodeCoachPlusResponse(200, { user_id: "u", feature_key: "ai_coach", enabled: true, server_updated_at: "2026-09-13T10:00:00Z" }),
    { kind: "ok", enabled: true, updatedAt: "2026-09-13T10:00:00Z" });
});

test("maps 403 to unauthorized and 502 to unavailable", () => {
  assert.deepEqual(decodeCoachPlusResponse(403, { error: "forbidden" }), { kind: "unauthorized" });
  assert.deepEqual(decodeCoachPlusResponse(502, { error: "upstream_unavailable" }), { kind: "unavailable" });
});

test("rejects a wrong feature key", () => {
  assert.deepEqual(decodeCoachPlusResponse(200, { feature_key: "other", enabled: true }), { kind: "unavailable" });
});

test("validates user ids", () => {
  assert.equal(isCanonicalUserId("00000000-0000-0000-0000-000000000001"), true);
  assert.equal(isCanonicalUserId("nope"), false);
});

test("maps 401 to unauthorized and 400 to refused", () => {
  assert.deepEqual(decodeCoachPlusResponse(401, { error: "unauthorized" }), { kind: "unauthorized" });
  assert.deepEqual(decodeCoachPlusResponse(400, { error: "invalid_user_id" }), { kind: "refused" });
});

test("decodes a disabled row with no timestamp", () => {
  assert.deepEqual(decodeCoachPlusResponse(200, { user_id: "u", feature_key: "ai_coach", enabled: false, server_updated_at: null }),
    { kind: "ok", enabled: false, updatedAt: null });
});

test("treats malformed 200 bodies as unavailable", () => {
  assert.deepEqual(decodeCoachPlusResponse(200, null), { kind: "unavailable" });
  assert.deepEqual(decodeCoachPlusResponse(200, []), { kind: "unavailable" });
  assert.deepEqual(decodeCoachPlusResponse(200, "ok"), { kind: "unavailable" });
  assert.deepEqual(decodeCoachPlusResponse(200, { feature_key: "ai_coach", enabled: "true" }), { kind: "unavailable" });
});
