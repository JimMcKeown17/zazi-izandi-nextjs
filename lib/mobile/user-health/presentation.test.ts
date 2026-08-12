import assert from "node:assert/strict";
import test from "node:test";

import {
  getActivityStage,
  getProvisioningAuthenticationPresentation,
  getUserAttentionReasons,
  hasSeededDataReady,
  isQuiet,
  matchesUserHealthPredicate,
  selectBoardRows,
  sortUserHealthRows,
} from "./presentation";
import {
  LEGACY_MOBILE_USER_HEALTH_PAYLOAD,
  VALID_MOBILE_USER_HEALTH_PAYLOAD,
} from "./test-fixtures";

const base = VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0];
const legacyBase = LEGACY_MOBILE_USER_HEALTH_PAYLOAD.users[0];
const noDevice = {
  registered: false as const,
  platform: null,
  app_version: null,
  last_seen_at: null,
};
const noActivity = {
  clock_entries: 0,
  sessions: 0,
  app_assessments: 0,
  last_clock_in_at: null,
  last_session_at: null,
  last_app_assessment_at: null,
  last_activity_at: null,
};

test("import-complete seeded users are distinguished from seeded data gaps", () => {
  const [healthy, missingGroups] = VALID_MOBILE_USER_HEALTH_PAYLOAD.users;
  assert.equal(hasSeededDataReady(healthy), true);
  assert.equal(hasSeededDataReady(missingGroups), false);
  assert.deepEqual(getUserAttentionReasons(missingGroups), [
    "seeded_groups_missing",
    "seeded_memberships_incomplete",
  ]);
});
test("zero data is expected for a self-setup ECD user", () => {
  const selfSetup = VALID_MOBILE_USER_HEALTH_PAYLOAD.users[2];
  assert.deepEqual(getUserAttentionReasons(selfSetup), []);
});

test("auth blocks are reported as an attention reason", () => {
  const blocked = VALID_MOBILE_USER_HEALTH_PAYLOAD.users[3];
  assert.deepEqual(getUserAttentionReasons(blocked), ["auth_blocked"]);
});

test("usage evidence in the window means active", () => {
  assert.equal(getActivityStage(base), "active");
});

test("without in-window activity, remaining reach evidence yields reached, not not_started", () => {
  const outsideWindow = { ...legacyBase, activity: noActivity };
  assert.equal(getActivityStage(outsideWindow), "reached");
});

test("legacy current evidence can regress when no lifetime fields exist", () => {
  const deviceLost = {
    ...legacyBase,
    auth: { ...legacyBase.auth, authenticated_after_provisioning: false },
    app_device: noDevice,
    activity: noActivity,
  };
  assert.equal(getActivityStage(deviceLost), "not_started");
});

test("a provisioning-check timestamp alone does not advance the stage", () => {
  const preCutoff = {
    ...legacyBase,
    auth: { ...legacyBase.auth, authenticated_after_provisioning: false },
    app_device: noDevice,
    activity: noActivity,
  };
  assert.equal(getActivityStage(preCutoff), "not_started");
});

test("post-provisioning authentication or a device signal reaches the EA without proving usage", () => {
  const authOnly = {
    ...legacyBase,
    app_device: noDevice,
    activity: noActivity,
  };
  assert.equal(getActivityStage(authOnly), "reached");
  const deviceOnly = {
    ...legacyBase,
    auth: {
      ...legacyBase.auth,
      authenticated_after_provisioning: false,
    },
    activity: noActivity,
  };
  assert.equal(getActivityStage(deviceOnly), "reached");
});

test("stage is a lifetime ratchet: shrinking the window cannot regress active", () => {
  const outsideWindow = {
    ...base,
    last_ever_activity_at: "2026-07-01T09:00:00.000Z",
    ever_registered_device: false,
    first_app_open_at: null,
    last_app_open_at: null,
    auth: { ...base.auth, authenticated_after_provisioning: false },
    app_device: noDevice,
    activity: noActivity,
  };

  assert.equal(getActivityStage(outsideWindow), "active");
});

test("stage is a lifetime ratchet: token invalidation cannot regress reached", () => {
  const invalidatedDevice = {
    ...base,
    first_ever_activity_at: null,
    last_ever_activity_at: null,
    ever_registered_device: true,
    first_app_open_at: null,
    last_app_open_at: null,
    auth: { ...base.auth, authenticated_after_provisioning: false },
    app_device: noDevice,
    activity: noActivity,
  };

  assert.equal(getActivityStage(invalidatedDevice), "reached");
});

test("a signed-in app open alone proves reached", () => {
  const appOpenOnly = VALID_MOBILE_USER_HEALTH_PAYLOAD.users.find(
    (user) => user.display_name === "Ayanda Ndlovu"
  );
  assert.ok(appOpenOnly);

  assert.equal(getActivityStage(appOpenOnly), "reached");
  assert.equal(matchesUserHealthPredicate(appOpenOnly, "active"), false);
  assert.equal(matchesUserHealthPredicate(appOpenOnly, "activated"), false);
});

test("legacy rows without lifetime fields keep their windowed stage", () => {
  assert.equal(getActivityStage(legacyBase), "active");
  assert.equal(
    getActivityStage({ ...legacyBase, activity: noActivity }),
    "reached"
  );
});

test("quiet means activated ever but silent in the window", () => {
  const quiet = { ...base, activity: noActivity };
  const windowedActive = base;
  const neverActivated = VALID_MOBILE_USER_HEALTH_PAYLOAD.users[3];

  assert.equal(isQuiet(quiet), true);
  assert.equal(isQuiet(windowedActive), false);
  assert.equal(isQuiet(neverActivated), false);
});

test("the active predicate stays windowed and excludes quiet rows", () => {
  const quiet = { ...base, activity: noActivity };
  assert.equal(matchesUserHealthPredicate(quiet, "active"), false);
  assert.equal(matchesUserHealthPredicate(quiet, "activated"), true);
  assert.equal(matchesUserHealthPredicate(quiet, "quiet"), true);

  assert.equal(matchesUserHealthPredicate(base, "active"), true);
  assert.equal(matchesUserHealthPredicate(base, "activated"), true);
  assert.equal(matchesUserHealthPredicate(base, "quiet"), false);
});

test("the active predicate count reconciles with the summary tile count", () => {
  const activeRows = VALID_MOBILE_USER_HEALTH_PAYLOAD.users.filter((user) =>
    matchesUserHealthPredicate(user, "active")
  );

  assert.equal(
    activeRows.length,
    VALID_MOBILE_USER_HEALTH_PAYLOAD.summary.active_in_window
  );
});

test("blockers are reported independently of the stage", () => {
  const blockedButActive = {
    ...base,
    auth: { ...base.auth, state: "unconfirmed" as const },
  };
  assert.equal(getActivityStage(blockedButActive), "active");
  assert.deepEqual(getUserAttentionReasons(blockedButActive), ["auth_blocked"]);
  assert.equal(matchesUserHealthPredicate(blockedButActive, "has_blockers"), true);
  assert.equal(matchesUserHealthPredicate(blockedButActive, "active"), true);
});

test("post-provisioning authentication presentation identifies proven auth evidence", () => {
  const authOnly = { ...base, app_device: noDevice, activity: noActivity };

  assert.deepEqual(getProvisioningAuthenticationPresentation(authOnly), {
    label: "Authenticated after provisioning",
    detail: "Auth proof; app and device are not identified",
    tone: "proven",
  });
});

test("a provisioning-check timestamp is presented as no authentication proof", () => {
  const preCutoff = {
    ...base,
    auth: {
      ...base.auth,
      last_sign_in_at: "2026-08-08T02:58:00.000Z",
      authenticated_after_provisioning: false,
    },
    app_device: noDevice,
    activity: noActivity,
  };

  assert.equal(
    getProvisioningAuthenticationPresentation(preCutoff).label,
    "No authentication after provisioning"
  );
});

test("urgency sort puts blocked EAs first, then the least-advanced stages", () => {
  const rows = VALID_MOBILE_USER_HEALTH_PAYLOAD.users;
  const sorted = sortUserHealthRows(rows, "urgency");
  const blockedCount = sorted.filter(
    (user) => getUserAttentionReasons(user).length > 0
  ).length;
  assert.deepEqual(
    sorted
      .slice(0, blockedCount)
      .map((user) => getUserAttentionReasons(user).length > 0),
    Array(blockedCount).fill(true)
  );
  assert.notEqual(sorted, rows);
});

test("last_activity sort is newest first with never-active EAs last", () => {
  const sorted = sortUserHealthRows(
    VALID_MOBILE_USER_HEALTH_PAYLOAD.users,
    "last_activity"
  );
  const stamps = sorted.map((user) => user.activity.last_activity_at);
  const nonNull = stamps.filter((stamp): stamp is string => stamp !== null);
  assert.deepEqual(nonNull, [...nonNull].sort().reverse());
  assert.equal(
    stamps.indexOf(null),
    stamps.length - stamps.filter((stamp) => stamp === null).length
  );
});

test("last_activity sort compares mixed offsets and fractional precision chronologically", () => {
  const rows = [
    {
      ...base,
      user_id: "offset-earlier",
      display_name: "Offset earlier",
      activity: {
        ...base.activity,
        last_activity_at: "2026-08-11T10:30:00+02:00",
      },
    },
    {
      ...base,
      user_id: "fraction-earlier",
      display_name: "Fraction earlier",
      activity: {
        ...base.activity,
        last_activity_at: "2026-08-11T09:00:00.1Z",
      },
    },
    {
      ...base,
      user_id: "offset-later",
      display_name: "Offset later",
      activity: {
        ...base.activity,
        last_activity_at: "2026-08-11T11:30:00+02:00",
      },
    },
    {
      ...base,
      user_id: "fraction-later",
      display_name: "Fraction later",
      activity: {
        ...base.activity,
        last_activity_at: "2026-08-11T09:00:00.19Z",
      },
    },
  ];

  assert.deepEqual(
    sortUserHealthRows(rows, "last_activity").map(
      (user) => user.display_name
    ),
    ["Offset later", "Fraction later", "Fraction earlier", "Offset earlier"]
  );
});

test("selectBoardRows with the immediate query is what exports must use", () => {
  const users = VALID_MOBILE_USER_HEALTH_PAYLOAD.users;
  const narrowed = selectBoardRows(users, {
    query: users[1].user_id,
    predicate: "all",
    cohort: "all",
    sortKey: "urgency",
  });
  assert.deepEqual(narrowed.map((user) => user.user_id), [users[1].user_id]);
});

test("selectBoardRows applies query, predicate, cohort, and sort in one selection", () => {
  const rows = selectBoardRows(VALID_MOBILE_USER_HEALTH_PAYLOAD.users, {
    query: "example.org",
    predicate: "has_blockers",
    cohort: "seeded",
    sortKey: "name",
  });

  assert.deepEqual(rows.map((user) => user.display_name), ["Lihle Jacobs"]);
});
