import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTeachingOverviewPortfolios,
  type TeachingOverviewPortfolio,
} from "./teaching-overview";
import {
  VALID_CAUSAL_V1_PROGRAMME_FIDELITY_PAYLOAD,
  VALID_CAUSAL_V2_PROGRAMME_FIDELITY_PAYLOAD,
} from "../mobile/programme-fidelity/test-fixtures";
import type {
  ProgrammeFidelityLetterFocus,
  ProgrammeFidelityRowV1,
  ProgrammeFidelityRowV2,
} from "../mobile/programme-fidelity/types";

const EA_A = "00000000-0000-4000-8000-000000000071";
const EA_B = "00000000-0000-4000-8000-000000000072";
const EA_C = "00000000-0000-4000-8000-000000000073";

const v2Row = ({
  groupId,
  eaId,
  name,
  recentSessions,
  letterFocus,
  overrides = {},
}: {
  groupId: string;
  eaId: string;
  name: string;
  recentSessions: number;
  letterFocus: ProgrammeFidelityLetterFocus;
  overrides?: Partial<ProgrammeFidelityRowV2>;
}): ProgrammeFidelityRowV2 => ({
  ...structuredClone(VALID_CAUSAL_V2_PROGRAMME_FIDELITY_PAYLOAD.rows[0]),
  group_id: groupId,
  ea_user_id: eaId,
  ea_display_name: name,
  recent_session_count: recentSessions,
  last_session_date: recentSessions > 0 ? "2026-08-25" : null,
  letter_focus: letterFocus,
  ...overrides,
});

const focus = (
  score: number | null,
  eligible: number,
  overrides: Partial<ProgrammeFidelityLetterFocus> = {}
): ProgrammeFidelityLetterFocus => ({
  focused_session_count: score === 100 ? eligible : 0,
  mixed_session_count: score !== null && score > 0 && score < 100 ? eligible : 0,
  ahead_only_session_count: score === 0 ? eligible : 0,
  unscored_session_count: 0,
  eligible_session_count: eligible,
  session_value_sum: score === null ? 0 : (score * eligible) / 100,
  score,
  ...overrides,
});

const byId = (
  portfolios: TeachingOverviewPortfolio[],
  eaId: string
): TeachingOverviewPortfolio => {
  const result = portfolios.find(({ eaUserId }) => eaUserId === eaId);
  assert.ok(result);
  return result;
};

test("EA portfolios conserve denominators while weighting current groups equally", () => {
  const rows = [
    v2Row({
      groupId: "00000000-0000-4000-8000-000000000081",
      eaId: EA_A,
      name: "Coach A",
      recentSessions: 6,
      letterFocus: focus(100, 6),
      overrides: {
        school_name: "School B",
        roster_size: 6,
        started_count: 3,
        tracker_coverage: 0.5,
        primary_reason: "CURRENT_TRACKER_COVERAGE_LOW",
        above_count: 2,
        causal_post_install_count: 5,
        bootstrap_influenced_count: 1,
      },
    }),
    v2Row({
      groupId: "00000000-0000-4000-8000-000000000082",
      eaId: EA_A,
      name: "Coach A",
      recentSessions: 1,
      letterFocus: focus(0, 1, { unscored_session_count: 2 }),
      overrides: {
        school_name: " School   A ",
        roster_size: 4,
        started_count: 4,
        tracker_coverage: 1,
        primary_reason: "NO_IMMEDIATE_FLAG",
        above_count: 0,
        causal_post_install_count: 1,
        bootstrap_influenced_count: 0,
      },
    }),
    v2Row({
      groupId: "00000000-0000-4000-8000-000000000083",
      eaId: EA_A,
      name: "Coach A",
      recentSessions: 0,
      letterFocus: focus(null, 0),
      overrides: {
        school_name: "School A",
        roster_size: 2,
        started_count: 0,
        tracker_coverage: 0,
        primary_reason: "NO_RECENT_MOBILE_SESSION",
        above_count: 0,
        scored_n: 0,
        score: null,
        causal_post_install_count: 0,
        bootstrap_influenced_count: 0,
      },
    }),
    v2Row({
      groupId: "00000000-0000-4000-8000-000000000084",
      eaId: EA_B,
      name: "Coach A",
      recentSessions: 2,
      letterFocus: focus(null, 0),
    }),
    v2Row({
      groupId: "00000000-0000-4000-8000-000000000085",
      eaId: EA_C,
      name: "Former coach",
      recentSessions: 3,
      letterFocus: focus(100, 3),
      overrides: { is_current_owner: false },
    }),
  ];

  const portfolios = buildTeachingOverviewPortfolios(rows, 2);
  const ea = byId(portfolios, EA_A);
  assert.equal(portfolios.length, 2);
  assert.deepEqual(ea.schoolLabels, ["School A", "School B"]);
  assert.equal(ea.currentGroupCount, 3);
  assert.equal(ea.activeGroupCount, 2);
  assert.equal(ea.inactiveGroupCount, 1);
  assert.equal(ea.totalRecentSessions, 7);
  assert.equal(ea.averageRecentSessionsPerGroup, 7 / 3);
  assert.equal(ea.rosterSize, 12);
  assert.equal(ea.trackerStartedCount, 7);
  assert.equal(ea.trackerCoverage, 7 / 12);
  assert.equal(ea.lowTrackerGroupCount, 1);
  assert.equal(ea.aheadEvidenceGroupCount, 1);
  assert.equal(ea.recentUnscorableGroupCount, 1);
  assert.equal(ea.bootstrapInfluencedGroupCount, 1);
  assert.equal(ea.noImmediateFlagGroupCount, 1);
  assert.equal(ea.focusedSessionCount, 6);
  assert.equal(ea.aheadOnlySessionCount, 1);
  assert.equal(ea.eligibleSessionCount, 7);
  assert.equal(ea.unscoredSessionCount, 2);
  assert.equal(ea.usableGroupCount, 2);
  assert.equal(ea.letterFocusScore, 50);
  assert.equal(ea.causalSessionCount, 6);
  assert.equal(ea.bootstrapSessionCount, 1);

  assert.equal(byId(portfolios, EA_B).letterFocusScore, null);
  assert.equal(byId(portfolios, EA_B).usableGroupCount, 0);
  assert.notEqual(portfolios[0].eaUserId, portfolios[1].eaUserId);
});

test("portfolio projection is independent of input order and stably breaks name ties by UUID", () => {
  const rows = [
    v2Row({
      groupId: "00000000-0000-4000-8000-000000000091",
      eaId: EA_B,
      name: " Same   Name ",
      recentSessions: 1,
      letterFocus: focus(100, 1),
    }),
    v2Row({
      groupId: "00000000-0000-4000-8000-000000000092",
      eaId: EA_A,
      name: "same name",
      recentSessions: 1,
      letterFocus: focus(0, 1),
    }),
  ];
  const forward = buildTeachingOverviewPortfolios(rows, 2);
  const reverse = buildTeachingOverviewPortfolios([...rows].reverse(), 2);
  assert.deepEqual(reverse, forward);
  assert.deepEqual(forward.map(({ eaUserId }) => eaUserId), [EA_A, EA_B]);
});

test("schema 1 and causal-v2 unavailable rows preserve distinct unknown states", () => {
  const v1 = structuredClone(
    VALID_CAUSAL_V1_PROGRAMME_FIDELITY_PAYLOAD.rows[0]
  ) as ProgrammeFidelityRowV1;
  const legacy = byId(buildTeachingOverviewPortfolios([v1], 1), v1.ea_user_id);
  assert.equal(legacy.letterFocusAvailability, "not_calculated_for_run");
  assert.equal(legacy.letterFocusScore, null);
  assert.equal(legacy.usableGroupCount, null);
  assert.equal(legacy.eligibleSessionCount, null);
  assert.equal(legacy.recentUnscorableGroupCount, null);

  const unavailable = structuredClone(
    VALID_CAUSAL_V2_PROGRAMME_FIDELITY_PAYLOAD.rows[0]
  );
  unavailable.letter_focus = null;
  unavailable.alignment_status = "not_yet_available";
  const pending = byId(
    buildTeachingOverviewPortfolios([unavailable], 2),
    unavailable.ea_user_id
  );
  assert.equal(pending.letterFocusAvailability, "not_enough_reliable_evidence");
  assert.equal(pending.letterFocusScore, null);
  assert.equal(pending.usableGroupCount, null);
  assert.equal(pending.eligibleSessionCount, null);
});
