import assert from "node:assert/strict";
import test from "node:test";

import { handleEaGroupsExport, type EaGroupsExportSession } from "./handler";
import {
  EA_GROUPS_EXPORT_CAPACITY_ERROR,
  EA_GROUPS_EXPORT_SCHEMA,
} from "./transport";

const request = () =>
  new Request("https://zazi.example/mobile-app/exports/ea-groups");

function session(
  role: "senior_staff" | "admin" | "zz_data_manager" | "junior_staff",
  userId: string | null = "staff_1"
): EaGroupsExportSession {
  return {
    userId,
    sessionClaims: { metadata: { role } },
    getToken: async () => "signed-token",
  };
}

test("401 and 403 authorization failures never call Django", async () => {
  for (const currentSession of [
    session("senior_staff", null),
    session("junior_staff"),
  ]) {
    let calls = 0;
    const response = await handleEaGroupsExport(request(), {
      getSession: async () => currentSession,
      fetchUpstream: async () => {
        calls += 1;
        throw new Error("must not run");
      },
    });

    assert.equal(response.status, currentSession.userId ? 403 : 401);
    assert.equal(calls, 0);
  }
});

test("an attested 413 maps to the fixed local response without consuming its body", async () => {
  let cancelled = false;
  const upstream = new Response(
    new ReadableStream({
      cancel() {
        cancelled = true;
      },
    }),
    {
      status: 413,
      headers: { "X-Zazi-Export-Error": EA_GROUPS_EXPORT_CAPACITY_ERROR },
    }
  );

  const response = await handleEaGroupsExport(request(), {
    getSession: async () => session("admin"),
    fetchUpstream: async () => upstream,
  });

  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), {
    error: "The export is larger than the safe download limit. Contact the data team.",
    code: "mobile_ea_groups_export_capacity_exceeded",
  });
  assert.equal(cancelled, true);
});

test("a missing or wrong capacity attestation is a sanitized 502", async () => {
  for (const attestation of [null, "wrong-contract"]) {
    const headers = new Headers();
    if (attestation) headers.set("X-Zazi-Export-Error", attestation);
    const response = await handleEaGroupsExport(request(), {
      getSession: async () => session("zz_data_manager"),
      fetchUpstream: async () =>
        new Response("private upstream payload", { status: 413, headers }),
    });

    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      error: "The export could not be generated.",
    });
  }
});

test("authorized export preserves exact bytes and has no User Health dependency", async () => {
  const expected = Uint8Array.from([
    0xef,
    0xbb,
    0xbf,
    ...new TextEncoder().encode("a,b\r\n\"1\",\"2\"\r\n"),
  ]);
  let path = "";
  let authorization = "";
  const response = await handleEaGroupsExport(request(), {
    getSession: async () => session("senior_staff"),
    fetchUpstream: async (nextPath, init) => {
      path = nextPath;
      authorization = new Headers(init.headers).get("Authorization") ?? "";
      return new Response(expected, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "X-Zazi-Export-Schema": EA_GROUPS_EXPORT_SCHEMA,
        },
      });
    },
    now: () => new Date("2026-09-01T23:59:59Z"),
  });

  assert.equal(path, "/api/mobile/exports/ea-groups/");
  assert.equal(authorization, "Bearer signed-token");
  assert.equal(response.status, 200);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), expected);
  assert.equal(
    response.headers.get("X-Zazi-Download-Filename"),
    "zazi-mobile-ea-current-groups-2026-09-01.csv"
  );
});
