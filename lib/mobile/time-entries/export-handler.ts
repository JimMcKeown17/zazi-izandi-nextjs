import { hasCapability, type Role } from "@/lib/mobile/capabilities";
import { csvSchoolTypeAttestationSatisfied } from "./export-attestation";
import {
  buildTimeEntriesExportRequest,
  type MobileTimeEntriesFilters,
} from "./request";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CSV_HEADER =
  "time_entry_id,user_id,ea_name,employment_status,current_school_id,current_school,local_date,sign_in_time,sign_out_time,duration_minutes,auto_clocked_out,is_active,sign_in_lat,sign_in_lon,sign_out_lat,sign_out_lon";
const MAX_CSV_BYTES = 5_000_000;
const CAPACITY_ATTESTATION = "mobile-time-entries-capacity-v1";
const CAPACITY_CODE = "mobile_time_entries_export_capacity_exceeded";
const CAPACITY_MESSAGE =
  "This reporting window is too large to download safely. Choose a shorter reporting window or one school and try again.";

export type TimeEntriesExportSession = {
  userId: string | null;
  sessionClaims?: { metadata?: { role?: Role } } | null;
  getToken(): Promise<string | null>;
};

export type TimeEntriesExportDependencies = {
  getSession(): Promise<TimeEntriesExportSession>;
  fetchUpstream(path: string, init: RequestInit): Promise<Response>;
  now?: () => Date;
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

function parseFilters(request: Request): MobileTimeEntriesFilters | null {
  const params = new URL(request.url).searchParams;
  const allowed = new Set(["days", "school_id", "school_type"]);
  for (const key of params.keys()) {
    if (!allowed.has(key) || params.getAll(key).length !== 1) return null;
  }

  const rawDays = params.get("days") ?? "30";
  if (!/^\d{1,2}$/.test(rawDays)) return null;
  const days = Number(rawDays);
  if (!Number.isInteger(days) || days < 1 || days > 90) return null;

  const schoolId = params.get("school_id");
  if (schoolId !== null && !UUID_PATTERN.test(schoolId)) return null;

  const rawSchoolType = params.get("school_type");
  const schoolType =
    rawSchoolType === "ecd" || rawSchoolType === "primary"
      ? rawSchoolType
      : null;
  if (rawSchoolType !== null && schoolType === null) return null;

  return { days, schoolId, schoolType };
}

async function readBoundedBytes(response: Response): Promise<Uint8Array> {
  const rawLength = response.headers.get("content-length");
  if (rawLength !== null) {
    if (!/^\d+$/.test(rawLength) || Number(rawLength) > MAX_CSV_BYTES) {
      await response.body?.cancel();
      throw new Error("Clock export byte limit exceeded");
    }
  }
  if (!response.body) throw new Error("Clock export body missing");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_CSV_BYTES) {
        await reader.cancel();
        throw new Error("Clock export byte limit exceeded");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (total === 0) throw new Error("Clock export body missing");

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function validCsvEnvelope(bytes: Uint8Array): boolean {
  try {
    const csv = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return (
      csv.startsWith(`${CSV_HEADER}\n`) &&
      csv.endsWith("\n") &&
      !csv.includes("\u0000")
    );
  } catch {
    return false;
  }
}

export async function handleTimeEntriesExport(
  request: Request,
  dependencies: TimeEntriesExportDependencies
): Promise<Response> {
  const session = await dependencies.getSession();
  if (!session.userId) return jsonResponse({ error: "authentication required" }, 401);
  const role = session.sessionClaims?.metadata?.role;
  if (!hasCapability(role, "mobile.csv.export")) {
    return jsonResponse({ error: "insufficient role" }, 403);
  }

  const filters = parseFilters(request);
  if (!filters) return jsonResponse({ error: "invalid export filters" }, 400);
  const token = await session.getToken();
  if (!token) return jsonResponse({ error: "session expired" }, 401);

  const upstreamRequest = buildTimeEntriesExportRequest(token, filters);
  let upstream: Response;
  try {
    upstream = await dependencies.fetchUpstream(upstreamRequest.path, {
      ...upstreamRequest.init,
      signal: request.signal,
    });
  } catch (error) {
    console.error("[mobile/export] Failed to reach Django Clock export", {
      errorClass: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse({ error: "export service unavailable" }, 502);
  }

  if (upstream.status === 413) {
    const attested =
      upstream.headers.get("x-zazi-export-error") === CAPACITY_ATTESTATION;
    await upstream.body?.cancel();
    if (!attested) {
      return jsonResponse({ error: "The export could not be generated." }, 502);
    }
    return jsonResponse(
      { error: CAPACITY_MESSAGE, code: CAPACITY_CODE },
      413
    );
  }

  if (!upstream.ok) {
    await upstream.body?.cancel();
    return jsonResponse(
      {
        error:
          upstream.status === 400
            ? "Narrow the date or school filter and try again."
            : "The export could not be generated.",
      },
      upstream.status === 400 ? 400 : 502
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (
    !contentType.toLowerCase().startsWith("text/csv") ||
    !csvSchoolTypeAttestationSatisfied(
      upstream.headers.get("x-applied-school-type"),
      filters.schoolType ?? null
    )
  ) {
    await upstream.body?.cancel();
    return jsonResponse(
      { error: "The export service returned an unexpected response." },
      502
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = await readBoundedBytes(upstream);
  } catch (error) {
    console.error("[mobile/export] Clock export violated its byte contract", {
      errorClass: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse({ error: "The export could not be generated." }, 502);
  }
  if (!validCsvEnvelope(bytes)) {
    return jsonResponse({ error: "The export could not be generated." }, 502);
  }

  const stamp = (dependencies.now?.() ?? new Date()).toISOString().slice(0, 10);
  const filename = `zazi-time-entries-${stamp}.csv`;
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  return new Response(body, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Zazi-Download-Filename": filename,
    },
  });
}
