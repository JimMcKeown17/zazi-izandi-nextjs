import { createServer } from "node:http";

const host = "127.0.0.1";
const port = 4010;
const ids = {
  from: "00000000-0000-4000-8000-000000000001",
  to: "00000000-0000-4000-8000-000000000002",
  class: "00000000-0000-4000-8000-000000000010",
  assignment: "00000000-0000-4000-8000-000000000100",
  job: "00000000-0000-4000-8000-000000000200",
};
let executed = false;

function job(status, state, retryable) {
  return {
    job: {
      id: ids.job, status, retryable, in_flight: false, scope: "roster", scope_class_id: null,
      from_ea_user_id: ids.from, to_ea_user_id: ids.to, reason: "EA has left the programme",
      requested_by: { clerk_user_id: "mock-clerk-user", email: "" }, progress_cursor: state === "pending" ? -1 : 0,
      total_items: 1, created_at: "2026-08-16T12:00:00+00:00", updated_at: "2026-08-16T12:00:00+00:00",
      summary: state === "pending" ? "0 of 1 records moved. 1 still to go." : "1 of 1 records moved.",
    },
    items: [{
      position: 0, entity_kind: "class", entity_id: ids.class, parent_class_id: null, state,
      refusal_code: "", message: state === "pending" ? "waiting" : "moved",
      expected_assignment_id: ids.assignment, remaining_foreign_claims: 0,
      result: state === "pending" ? {} : { outcome: "transferred", remaining_foreign_claims: 0 },
    }],
  };
}

function roster() {
  const classes = executed ? [] : [{
    entity_kind: "class", entity_id: ids.class, name: "Mock Grade R", parent_class_id: null,
    expected_assignment_id: ids.assignment, source: "ledger",
  }];
  return {
    from_ea: ids.from, from_ea_name: "Mock Departing EA", scope: "roster", scope_class_id: null,
    classes, groups: [], children: [], scalar_only: [], unresolved: [],
    source_counts: { class_ledger_active: classes.length, group_ledger_active: 0, child_ledger_active: 0, scalar_class_rows: classes.length, scalar_group_rows: 0 },
    counts: { classes: classes.length, groups: 0, children: 0, scalar_only: 0, unresolved: 0 },
  };
}

function send(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", `http://${host}:${port}`).pathname;
  if (pathname === "/health") return send(response, 200, { ok: true });
  if (pathname === "/api/mobile/user-health/") return send(response, 502, { error: "deliberately absent from handover mock" });
  if (pathname === "/api/mobile/handover/roster/" && request.method === "GET") return send(response, 200, roster());
  if (pathname === "/api/mobile/handover/jobs/" && request.method === "POST") return send(response, 201, job("created", "pending", true));
  if (pathname === `/api/mobile/handover/jobs/${ids.job}/execute/` && request.method === "POST") {
    executed = true;
    return send(response, 200, job("complete", "transferred", false));
  }
  if (pathname === `/api/mobile/handover/jobs/${ids.job}/` && request.method === "GET") return send(response, 200, job(executed ? "complete" : "created", executed ? "transferred" : "pending", !executed));
  return send(response, 404, { error: "handover job not found" });
}).listen(port, host);
