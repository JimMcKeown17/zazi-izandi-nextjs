import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProgrammeFidelityHref,
  describeCurrentAdvice,
  recentSessionsHref,
} from "./presentation";
import {
  EA_ID,
  GROUP_ID,
  VALID_PROGRAMME_FIDELITY_PAYLOAD,
} from "./test-fixtures";

test("current guidance names next letters without claiming the EA is on track", () => {
  const copy = describeCurrentAdvice(VALID_PROGRAMME_FIDELITY_PAYLOAD.rows[0]);
  assert.match(copy, /m.*a/i);
  assert.match(copy, /low tracker coverage/i);
  assert.doesNotMatch(copy, /on track/i);

  const noFlag = {
    ...VALID_PROGRAMME_FIDELITY_PAYLOAD.rows[0],
    primary_reason: "NO_IMMEDIATE_FLAG" as const,
  };
  assert.doesNotMatch(describeCurrentAdvice(noFlag), /on track/i);
});

test("former owners receive no current tracker guidance", () => {
  assert.match(
    describeCurrentAdvice(VALID_PROGRAMME_FIDELITY_PAYLOAD.rows[1]),
    /former owner.*not assigned/i
  );
});

test("expansion preserves recognized filters and exactly one group/EA pair", () => {
  assert.equal(
    buildProgrammeFidelityHref(
      { schoolId: null, eaUserId: EA_ID, attention: "current" },
      { groupId: GROUP_ID, eaUserId: EA_ID }
    ),
    `/mobile-app/programme-fidelity?ea_user_id=${EA_ID}&attention=current&expanded_group_id=${GROUP_ID}&expanded_ea_user_id=${EA_ID}`
  );
  assert.equal(
    buildProgrammeFidelityHref(
      { schoolId: null, eaUserId: EA_ID, attention: "current" },
      null
    ),
    `/mobile-app/programme-fidelity?ea_user_id=${EA_ID}&attention=current`
  );
});

test("no-recent-session links remain bounded and promise only the available school filter", () => {
  assert.equal(
    recentSessionsHref(VALID_PROGRAMME_FIDELITY_PAYLOAD.rows[0]),
    `/mobile-app/sessions?days=14&school_id=${VALID_PROGRAMME_FIDELITY_PAYLOAD.rows[0].school_id}`
  );
});
