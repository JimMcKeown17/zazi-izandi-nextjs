import { hasCapability, type Role } from "@/lib/mobile/capabilities";
import { getSastToday, validateSessionExportRange } from "./date-range";
import { buildSessionExportRequest, type SessionExportFilters } from "./request";
import {
  DETAIL_EXPORT_KIND,
  expectedSessionExportFilename,
  parseCsvRecords,
  readBoundedSessionExportBytes,
  sessionExportConfig,
  type CapacityRecovery,
  type SessionExportKind,
} from "./transport";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SessionExportSession = {
  userId: string | null;
  sessionClaims?: { metadata?: { role?: Role } } | null;
  getToken(): Promise<string | null>;
};

export type SessionExportDependencies = {
  getSession(): Promise<SessionExportSession>;
  fetchUpstream(path: string, init: RequestInit): Promise<Response>;
  today?: () => string;
};

function jsonResponse(payload: object, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": "application/json",
    },
  });
}

function parseFilters(request: Request, today: string): SessionExportFilters | null {
  const params = new URL(request.url).searchParams;
  const allowed = new Set(["start_date", "end_date", "school_id", "school_type"]);
  for (const key of params.keys()) {
    if (!allowed.has(key) || params.getAll(key).length !== 1) return null;
  }
  const startDate = params.get("start_date") ?? "";
  const endDate = params.get("end_date") ?? "";
  try {
    validateSessionExportRange({ startDate, endDate, today });
  } catch {
    return null;
  }
  const schoolId = params.get("school_id");
  if (schoolId !== null && !UUID_PATTERN.test(schoolId)) return null;
  const rawSchoolType = params.get("school_type");
  const schoolType =
    rawSchoolType === "ecd" || rawSchoolType === "primary" ? rawSchoolType : null;
  if (rawSchoolType !== null && schoolType === null) return null;
  return { startDate, endDate, schoolId, schoolType };
}

function capacityRecovery(
  kind: SessionExportKind,
  token: string | null
): CapacityRecovery | null {
  const entries = Object.entries(sessionExportConfig(kind).capacity) as Array<
    [CapacityRecovery, { token: string }]
  >;
  return entries.find(([, contract]) => contract.token === token)?.[0] ?? null;
}

function expectedHeader(kind: SessionExportKind, filters: SessionExportFilters): string[] {
  if (kind === DETAIL_EXPORT_KIND) {
    return [
      "data_as_of_utc", "session_id", "session_date", "started_at_sast",
      "ended_at_sast", "duration_seconds", "duration_minutes", "ea_user_id",
      "ea_name", "employment_status", "school_id_current", "school_name_current",
      "school_type_current", "school_attribution", "group_ids",
      "group_names_current", "present_attendees", "absent_attendees",
      "excused_attendees", "total_attendees",
    ];
  }
  const dates: string[] = [];
  const cursor = new Date(`${filters.startDate}T00:00:00Z`);
  const end = new Date(`${filters.endDate}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return [
    "data_as_of_utc", "ea_user_id", "ea_name", "employment_status",
    "reporting_school_id_current", "reporting_school_name_current",
    "reporting_school_type_current", ...dates, "total_sessions",
  ];
}

function csvHasExactProvenance(
  bytes: Uint8Array,
  kind: SessionExportKind,
  filters: SessionExportFilters,
  dataAsOf: string
): boolean {
  try {
    // Keep the BOM visible so the transport check can prove the database CSV
    // envelope rather than accepting an arbitrary UTF-8 text response.
    const csv = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    const records = parseCsvRecords(csv);
    const header = expectedHeader(kind, filters);
    if (records.length < 1 || records[0].join("\u0000") !== header.join("\u0000")) {
      return false;
    }
    return records.slice(1).every(
      (row) => row.length === header.length && row[0] === dataAsOf
    );
  } catch {
    return false;
  }
}

export async function handleSessionExport(
  request: Request,
  kind: SessionExportKind,
  dependencies: SessionExportDependencies
): Promise<Response> {
  const session = await dependencies.getSession();
  if (!session.userId) return jsonResponse({ error: "authentication required" }, 401);
  const role = session.sessionClaims?.metadata?.role;
  if (!hasCapability(role, "mobile.csv.export")) {
    return jsonResponse({ error: "insufficient role" }, 403);
  }
  const filters = parseFilters(request, dependencies.today?.() ?? getSastToday());
  if (!filters) return jsonResponse({ error: "invalid export filters" }, 400);
  const token = await session.getToken();
  if (!token) return jsonResponse({ error: "session expired" }, 401);

  const upstreamRequest = buildSessionExportRequest(kind, token, filters);
  let upstream: Response;
  try {
    upstream = await dependencies.fetchUpstream(upstreamRequest.path, {
      ...upstreamRequest.init,
      signal: request.signal,
    });
  } catch (error) {
    console.error("[mobile/export] Failed to reach Django session export", {
      kind,
      errorClass: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse({ error: "export service unavailable" }, 502);
  }

  const config = sessionExportConfig(kind);
  if (upstream.status === 413) {
    const recovery = capacityRecovery(
      kind,
      upstream.headers.get("x-zazi-export-error")
    );
    await upstream.body?.cancel();
    if (!recovery) return jsonResponse({ error: "The export could not be generated." }, 502);
    const contract = config.capacity[recovery];
    return jsonResponse({ error: contract.message, code: contract.code }, 413);
  }
  if (!upstream.ok) {
    await upstream.body?.cancel();
    return jsonResponse({ error: "The export could not be generated." }, 502);
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  const dataAsOf = upstream.headers.get("x-zazi-data-as-of") ?? "";
  const expectedFilename = expectedSessionExportFilename({
    kind,
    startDate: filters.startDate,
    endDate: filters.endDate,
    dataAsOf,
  });
  const upstreamFilename = upstream.headers.get("x-zazi-download-filename");
  const contentDisposition = upstream.headers.get("content-disposition");
  const attested =
    contentType.toLowerCase().startsWith("text/csv") &&
    upstream.headers.get("x-zazi-export-schema") === config.schema &&
    upstream.headers.get("x-zazi-range-start") === filters.startDate &&
    upstream.headers.get("x-zazi-range-end-inclusive") === filters.endDate &&
    expectedFilename !== null &&
    upstreamFilename === expectedFilename &&
    contentDisposition === `attachment; filename="${expectedFilename}"`;
  if (!attested) {
    await upstream.body?.cancel();
    return jsonResponse({ error: "The export could not be generated." }, 502);
  }

  let bytes: Uint8Array;
  try {
    bytes = await readBoundedSessionExportBytes(upstream, config.maxBytes);
  } catch (error) {
    console.error("[mobile/export] Session export violated its byte contract", {
      kind,
      errorClass: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse({ error: "The export could not be generated." }, 502);
  }
  if (!csvHasExactProvenance(bytes, kind, filters, dataAsOf)) {
    return jsonResponse({ error: "The export could not be generated." }, 502);
  }

  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  return new Response(body, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${expectedFilename}"`,
      "X-Zazi-Export-Schema": config.schema,
      "X-Zazi-Range-Start": filters.startDate,
      "X-Zazi-Range-End-Inclusive": filters.endDate,
      "X-Zazi-Data-As-Of": dataAsOf,
      "X-Zazi-Download-Filename": expectedFilename,
    },
  });
}
