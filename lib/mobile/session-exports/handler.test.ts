import assert from "node:assert/strict";
import test from "node:test";

import {
  handleSessionExport,
  type SessionExportSession,
} from "./handler";
import {
  DETAIL_EXPORT_KIND,
  PAYROLL_EXPORT_KIND,
  sessionExportConfig,
} from "./transport";

const actorId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const timestamp = "2026-09-02T00:40:10.123456Z";

function request(
  kind: typeof PAYROLL_EXPORT_KIND | typeof DETAIL_EXPORT_KIND = PAYROLL_EXPORT_KIND,
  query = "start_date=2026-02-20&end_date=2026-02-21"
) {
  return new Request(`https://zazi.example/mobile-app/exports/${kind}?${query}`);
}

function session(
  role: "senior_staff" | "admin" | "zz_data_manager" | "junior_staff",
  userId: string | null = "staff_1",
  onToken?: () => void
): SessionExportSession {
  return {
    userId,
    sessionClaims: { metadata: { role } },
    getToken: async () => {
      onToken?.();
      return "signed-token";
    },
  };
}

function payrollCsv(): string {
  return (
    "\ufeffdata_as_of_utc,ea_user_id,ea_name,employment_status," +
    "reporting_school_id_current,reporting_school_name_current," +
    "reporting_school_type_current,2026-02-20,2026-02-21,total_sessions\r\n" +
    `"${timestamp}","${actorId}","Safe EA","active","",` +
    '"Unattributed","","1","0","1"\r\n'
  );
}

function detailCsv(): string {
  return (
    "\ufeffdata_as_of_utc,session_id,session_date,started_at_sast," +
    "ended_at_sast,duration_seconds,duration_minutes,ea_user_id,ea_name," +
    "employment_status,school_id_current,school_name_current," +
    "school_type_current,school_attribution,group_ids,group_names_current," +
    "present_attendees,absent_attendees,excused_attendees,total_attendees\r\n" +
    `"${timestamp}","${sessionId}","2026-02-20","","","","",` +
    `"${actorId}","Safe EA","active","","Unattributed","",` +
    '"unattributed","","","1","0","0","1"\r\n'
  );
}

function upstreamSuccess(kind: typeof PAYROLL_EXPORT_KIND | typeof DETAIL_EXPORT_KIND) {
  const config = sessionExportConfig(kind);
  const csv = kind === PAYROLL_EXPORT_KIND ? payrollCsv() : detailCsv();
  const filename = `zazi-mobile-sessions-${config.filenameSlug}-2026-02-20-to-2026-02-21-as-of-20260902T004010Z.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "X-Zazi-Export-Schema": config.schema,
      "X-Zazi-Range-Start": "2026-02-20",
      "X-Zazi-Range-End-Inclusive": "2026-02-21",
      "X-Zazi-Data-As-Of": timestamp,
      "X-Zazi-Download-Filename": filename,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function successHeaders(
  kind: typeof PAYROLL_EXPORT_KIND | typeof DETAIL_EXPORT_KIND
): Headers {
  return upstreamSuccess(kind).headers;
}

test("authorization and local range validation happen before token or Django", async () => {
  for (const currentSession of [session("senior_staff", null), session("junior_staff")]) {
    let upstreamCalls = 0;
    const response = await handleSessionExport(request(), PAYROLL_EXPORT_KIND, {
      getSession: async () => currentSession,
      fetchUpstream: async () => {
        upstreamCalls += 1;
        throw new Error("must not run");
      },
      today: () => "2026-03-20",
    });
    assert.equal(response.status, currentSession.userId ? 403 : 401);
    assert.equal(upstreamCalls, 0);
  }

  let tokenCalls = 0;
  let upstreamCalls = 0;
  const invalid = await handleSessionExport(
    request(PAYROLL_EXPORT_KIND, "start_date=2026-02-30&end_date=2026-03-19"),
    PAYROLL_EXPORT_KIND,
    {
      getSession: async () => session("admin", "staff_1", () => { tokenCalls += 1; }),
      fetchUpstream: async () => {
        upstreamCalls += 1;
        throw new Error("must not run");
      },
      today: () => "2026-03-20",
    }
  );
  assert.equal(invalid.status, 400);
  assert.equal(tokenCalls, 0);
  assert.equal(upstreamCalls, 0);
});

test("authorized requests preserve filters and accept only fully attested CSV", async () => {
  for (const kind of [PAYROLL_EXPORT_KIND, DETAIL_EXPORT_KIND] as const) {
    let path = "";
    let authorization = "";
    const response = await handleSessionExport(
      request(kind, "start_date=2026-02-20&end_date=2026-02-21&school_type=primary"),
      kind,
      {
        getSession: async () => session("senior_staff"),
        fetchUpstream: async (nextPath, init) => {
          path = nextPath;
          authorization = new Headers(init.headers).get("Authorization") ?? "";
          return upstreamSuccess(kind);
        },
        today: () => "2026-03-20",
      }
    );
    assert.equal(response.status, 200);
    assert.match(path, new RegExp(`/api/mobile/exports/sessions/${sessionExportConfig(kind).djangoSlug}/`));
    assert.match(path, /start_date=2026-02-20/);
    assert.match(path, /end_date=2026-02-21/);
    assert.match(path, /school_type=primary/);
    assert.equal(authorization, "Bearer signed-token");
    assert.equal(response.headers.get("X-Zazi-Data-As-Of"), timestamp);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store, max-age=0");
    assert.deepEqual(
      new Uint8Array(await response.arrayBuffer()),
      new TextEncoder().encode(
        kind === PAYROLL_EXPORT_KIND ? payrollCsv() : detailCsv()
      )
    );
  }
});

test("every exact capacity attestation maps to its recovery-specific local response", async () => {
  for (const kind of [PAYROLL_EXPORT_KIND, DETAIL_EXPORT_KIND] as const) {
    const config = sessionExportConfig(kind);
    for (const recovery of ["population", "shorter-range", "narrow-scope"] as const) {
      let cancelled = false;
      const upstream = new Response(new ReadableStream({ cancel() { cancelled = true; } }), {
        status: 413,
        headers: { "X-Zazi-Export-Error": config.capacity[recovery].token },
      });
      const response = await handleSessionExport(request(kind), kind, {
        getSession: async () => session("admin"),
        fetchUpstream: async () => upstream,
        today: () => "2026-03-20",
      });
      assert.equal(response.status, 413);
      assert.deepEqual(await response.json(), {
        error: config.capacity[recovery].message,
        code: config.capacity[recovery].code,
      });
      assert.equal(cancelled, true);
    }
  }
});

test("wrong capacity tokens and broken success attestations are sanitized 502s", async () => {
  const wrongCapacity = await handleSessionExport(request(), PAYROLL_EXPORT_KIND, {
    getSession: async () => session("admin"),
    fetchUpstream: async () => new Response("private", {
      status: 413,
      headers: { "X-Zazi-Export-Error": "mobile-sessions-detail-capacity-range-v1" },
    }),
    today: () => "2026-03-20",
  });
  assert.equal(wrongCapacity.status, 502);

  const upstream = upstreamSuccess(PAYROLL_EXPORT_KIND);
  upstream.headers.set("X-Zazi-Data-As-Of", "2026-09-02T00:40:11Z");
  const badTimestamp = await handleSessionExport(request(), PAYROLL_EXPORT_KIND, {
    getSession: async () => session("admin"),
    fetchUpstream: async () => upstream,
    today: () => "2026-03-20",
  });
  assert.equal(badTimestamp.status, 502);
  assert.deepEqual(await badTimestamp.json(), { error: "The export could not be generated." });
});

test("declared and chunked CSV byte overflow fail closed", async () => {
  const config = sessionExportConfig(PAYROLL_EXPORT_KIND);
  let declaredCancelled = false;
  let chunkedCancelled = false;
  const declaredHeaders = successHeaders(PAYROLL_EXPORT_KIND);
  declaredHeaders.set("Content-Length", String(config.maxBytes + 1));
  const chunkedHeaders = successHeaders(PAYROLL_EXPORT_KIND);
  for (const upstream of [
    new Response(new ReadableStream({
      cancel() { declaredCancelled = true; },
    }), {
      headers: {
        ...Object.fromEntries(declaredHeaders),
      },
    }),
    new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(config.maxBytes + 1));
      },
      cancel() { chunkedCancelled = true; },
    }), {
      headers: Object.fromEntries(chunkedHeaders),
    }),
  ]) {
    const response = await handleSessionExport(request(), PAYROLL_EXPORT_KIND, {
      getSession: async () => session("admin"),
      fetchUpstream: async () => upstream,
      today: () => "2026-03-20",
    });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      error: "The export could not be generated.",
    });
  }
  assert.equal(declaredCancelled, true);
  assert.equal(chunkedCancelled, true);
});
