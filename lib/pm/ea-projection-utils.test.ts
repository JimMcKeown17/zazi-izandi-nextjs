import assert from "node:assert/strict";
import test from "node:test";

import {
  pointAt,
  resolveWindowStartDate,
  summarizeImproving,
} from "./ea-history-utils";
import { stableEAKeys } from "./ea-projection-utils";
import type {
  EAPerformanceHistoryResponse,
  EAPerformanceItem,
} from "./types";


function current(overrides: Partial<EAPerformanceItem> = {}): EAPerformanceItem {
  return {
    ea_key: "id:1",
    ea_user_id: 1,
    ea_name: "Current Name",
    school: "Astra",
    sessions_per_programme_day: 2,
    alignment_avg_score: 80,
    total_sessions: 10,
    groups_count: 1,
    letters_groups_count: 1,
    blending_groups_count: 0,
    children_count: 10,
    active_flags_count: 0,
    groups: [],
    ...overrides,
  };
}

function history(
  overrides: Partial<EAPerformanceHistoryResponse> = {}
): EAPerformanceHistoryResponse {
  return {
    generated_at: "2026-08-10T02:00:00Z",
    snapshot_date: "2026-08-10",
    data_health: { stale: false, source_session_max: null },
    sampling: {
      strategy: "weekly-plus-window-anchors-v1",
      source_date_count: 3,
      returned_date_count: 3,
    },
    dates: ["2026-07-13", "2026-07-27", "2026-08-10"],
    eas: [],
    ...overrides,
  };
}

test("current rows remain the stable roster when history is unavailable", () => {
  assert.deepEqual(stableEAKeys([current()], history({ dates: [], eas: [] })), [
    "id:1",
  ]);
});

test("ID identity tolerates display-name changes and unions current/history", () => {
  const result = stableEAKeys(
    [current(), current({ ea_key: "id:2", ea_user_id: 2, ea_name: "Current Only" })],
    history({
      eas: [
        {
          ea_key: "id:1",
          ea_user_id: 1,
          ea_name: "Old Name",
          school: "Astra",
          trajectory: [],
        },
        {
          ea_key: "id:3",
          ea_user_id: 3,
          ea_name: "History Only",
          school: "Astra",
          trajectory: [],
        },
      ],
    })
  );
  assert.deepEqual(result, ["id:1", "id:2", "id:3"]);
});

test("late joiners are placeholders before their first as-of row", () => {
  const trajectory = [{ date: "2026-08-10", x: 2, y: 80 }];
  assert.equal(pointAt(trajectory, "2026-07-27"), null);
  assert.deepEqual(pointAt(trajectory, "2026-08-10"), trajectory[0]);
});

test("2w and 4w window anchors remain exact with sampled history", () => {
  const sampled = history();
  assert.equal(resolveWindowStartDate(sampled, "2w"), "2026-07-27");
  assert.equal(resolveWindowStartDate(sampled, "4w"), "2026-07-13");
});

test("unavailable and successful-but-insufficient history are distinct", () => {
  const onePoint = history({
    dates: ["2026-08-10"],
    eas: [{
      ea_key: "id:1",
      ea_user_id: 1,
      ea_name: "EA One",
      school: "Astra",
      trajectory: [{ date: "2026-08-10", x: 2, y: 80 }],
    }],
  });
  assert.equal(summarizeImproving(onePoint, false).status, "unavailable");
  assert.equal(summarizeImproving(onePoint, true).status, "insufficient");
});
