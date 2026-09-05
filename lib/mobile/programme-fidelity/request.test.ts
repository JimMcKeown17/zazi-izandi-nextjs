import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProgrammeFidelityRequest,
  buildProgrammeFidelitySessionsRequest,
} from "./request";

const SCHOOL_ID = "a0000000-0000-4000-8000-000000000010";
const EA_ID = "00000000-0000-4000-8000-000000000020";
const GROUP_ID = "00000000-0000-4000-8000-000000000030";

test("aggregate requests forward exact canonical filters and Clerk bearer auth", () => {
  const request = buildProgrammeFidelityRequest("session-token", {
    schoolId: SCHOOL_ID,
    eaUserId: EA_ID,
    attention: "current",
  });

  assert.equal(
    request.path,
    `/api/mobile/programme-fidelity/?school_id=${SCHOOL_ID}&ea_user_id=${EA_ID}&attention=current`
  );
  assert.equal(request.init.method, "GET");
  assert.equal(request.init.cache, "no-store");
  assert.equal(request.init.redirect, "manual");
  assert.deepEqual(request.init.headers, {
    Authorization: "Bearer session-token",
  });
});

test("aggregate requests encode the explicit default without inventing null filters", () => {
  const request = buildProgrammeFidelityRequest("session-token", {
    schoolId: null,
    eaUserId: null,
    attention: "all",
  });

  assert.equal(request.path, "/api/mobile/programme-fidelity/?attention=all");
});

test("session requests require and correlate one canonical group and EA pair", () => {
  const request = buildProgrammeFidelitySessionsRequest("session-token", {
    groupId: GROUP_ID,
    eaUserId: EA_ID,
  });

  assert.equal(
    request.path,
    `/api/mobile/programme-fidelity/sessions/?group_id=${GROUP_ID}&ea_user_id=${EA_ID}`
  );
  assert.deepEqual(request.init.headers, {
    Authorization: "Bearer session-token",
  });
});

test("request builders fail closed on missing auth, noncanonical UUIDs, and unknown attention", () => {
  assert.throws(
    () =>
      buildProgrammeFidelityRequest("", {
        schoolId: null,
        eaUserId: null,
        attention: "all",
      }),
    /Clerk session token/
  );
  assert.throws(() =>
    buildProgrammeFidelityRequest("token", {
      schoolId: SCHOOL_ID.toUpperCase(),
      eaUserId: null,
      attention: "all",
    })
  );
  assert.throws(() =>
    buildProgrammeFidelityRequest("token", {
      schoolId: null,
      eaUserId: null,
      attention: "unexpected" as "all",
    })
  );
  assert.throws(() =>
    buildProgrammeFidelitySessionsRequest("token", {
      groupId: "not-a-uuid",
      eaUserId: EA_ID,
    })
  );
});
