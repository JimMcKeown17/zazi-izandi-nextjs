import assert from "node:assert/strict";
import test from "node:test";

import {
  handleTimeEntriesExport,
  type TimeEntriesExportSession,
} from "./export-handler";

const CSV_HEADER =
  "time_entry_id,user_id,ea_name,employment_status,current_school_id,current_school,local_date,sign_in_time,sign_out_time,duration_minutes,auto_clocked_out,is_active,sign_in_lat,sign_in_lon,sign_out_lat,sign_out_lon";

function request(query = "days=30") {
  return new Request(
    `https://zazi.example/mobile-app/exports/time-entries?${query}`
  );
}

function session(
  role: "admin" | "senior_staff" | "junior_staff",
  userId: string | null = "staff_1"
): TimeEntriesExportSession {
  return {
    userId,
    sessionClaims: { metadata: { role } },
    getToken: async () => "signed-token",
  };
}

test("authorization and exact filter validation happen before Django", async () => {
  for (const [currentSession, query, status] of [
    [session("senior_staff", null), "days=30", 401],
    [session("junior_staff"), "days=30", 403],
    [session("admin"), "days=30&days=7", 400],
    [session("admin"), "days=30&unknown=1", 400],
  ] as const) {
    let calls = 0;
    const response = await handleTimeEntriesExport(request(query), {
      getSession: async () => currentSession,
      fetchUpstream: async () => {
        calls += 1;
        throw new Error("must not run");
      },
    });

    assert.equal(response.status, status);
    assert.equal(calls, 0);
  }
});

test("an exact Clock capacity attestation becomes actionable 413 copy", async () => {
  let cancelled = false;
  const upstream = new Response(
    new ReadableStream({
      cancel() {
        cancelled = true;
      },
    }),
    {
      status: 413,
      headers: {
        "X-Zazi-Export-Error": "mobile-time-entries-capacity-v1",
      },
    }
  );

  const response = await handleTimeEntriesExport(request("days=90"), {
    getSession: async () => session("admin"),
    fetchUpstream: async () => upstream,
  });

  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), {
    error:
      "This reporting window is too large to download safely. Choose a shorter reporting window or one school and try again.",
    code: "mobile_time_entries_export_capacity_exceeded",
  });
  assert.equal(cancelled, true);
});

test("wrong capacity attestations and oversized bodies fail closed", async () => {
  const wrongToken = await handleTimeEntriesExport(request(), {
    getSession: async () => session("admin"),
    fetchUpstream: async () =>
      new Response("private", {
        status: 413,
        headers: { "X-Zazi-Export-Error": "wrong-contract" },
      }),
  });
  assert.equal(wrongToken.status, 502);

  const oversized = await handleTimeEntriesExport(request(), {
    getSession: async () => session("admin"),
    fetchUpstream: async () =>
      new Response("must-not-be-read", {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Length": "5000001",
          "X-Applied-School-Type": "none",
        },
      }),
  });
  assert.equal(oversized.status, 502);
});

test("an authorized export preserves bytes, scope, and a stable filename", async () => {
  const csv = new TextEncoder().encode(`${CSV_HEADER}\n`);
  let path = "";
  let headers = new Headers();
  const response = await handleTimeEntriesExport(
    request("days=30&school_type=ecd"),
    {
      getSession: async () => session("senior_staff"),
      fetchUpstream: async (nextPath, init) => {
        path = nextPath;
        headers = new Headers(init.headers);
        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "X-Applied-School-Type": "ecd",
          },
        });
      },
      now: () => new Date("2026-09-02T23:59:59Z"),
    }
  );

  assert.equal(
    path,
    "/api/mobile/exports/time-entries/?days=30&school_type=ecd"
  );
  assert.equal(headers.get("Authorization"), "Bearer signed-token");
  assert.equal(response.status, 200);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), csv);
  assert.equal(
    response.headers.get("X-Zazi-Download-Filename"),
    "zazi-time-entries-2026-09-02.csv"
  );
});
