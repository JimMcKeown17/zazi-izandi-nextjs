import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { djangoFetch } from "@/lib/django-fetch";
import { hasCapability, type Role } from "@/lib/mobile/capabilities";
import { buildTimeEntriesExportRequest } from "@/lib/mobile/time-entries/request";
import { csvSchoolTypeAttestationSatisfied } from "@/lib/mobile/time-entries/export-attestation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseFilters(request: Request): {
  days: number;
  schoolId: string | null;
  schoolType: "ecd" | "primary" | null;
} | null {
  const url = new URL(request.url);
  const rawDays = url.searchParams.get("days") ?? "30";
  if (!/^\d{1,3}$/.test(rawDays)) return null;
  const days = Number(rawDays);
  if (!Number.isInteger(days) || days < 1 || days > 90) return null;

  const schoolId = url.searchParams.get("school_id");
  if (schoolId !== null && !UUID_PATTERN.test(schoolId)) return null;

  const rawSchoolType = url.searchParams.get("school_type");
  let schoolType: "ecd" | "primary" | null = null;
  if (rawSchoolType === "ecd" || rawSchoolType === "primary") {
    schoolType = rawSchoolType;
  } else if (rawSchoolType !== null) {
    return null;
  }
  return { days, schoolId, schoolType };
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;
  if (kind !== "time-entries") {
    return NextResponse.json({ error: "export not found" }, { status: 404 });
  }

  const session = await auth();
  if (!session.userId) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }
  const role = (
    session.sessionClaims?.metadata as { role?: Role } | undefined
  )?.role;
  if (!hasCapability(role, "mobile.csv.export")) {
    return NextResponse.json({ error: "insufficient role" }, { status: 403 });
  }

  const filters = parseFilters(request);
  if (!filters) {
    return NextResponse.json({ error: "invalid export filters" }, { status: 400 });
  }

  const token = await session.getToken();
  if (!token) {
    return NextResponse.json({ error: "session expired" }, { status: 401 });
  }

  const upstreamRequest = buildTimeEntriesExportRequest(token, filters);
  let upstream: Response;
  try {
    upstream = await djangoFetch(upstreamRequest.path, {
      ...upstreamRequest.init,
      signal: request.signal,
    });
  } catch (error) {
    console.error("[mobile/export] Failed to reach Django:", error);
    return NextResponse.json(
      { error: "export service unavailable" },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    return NextResponse.json(
      {
        error:
          upstream.status === 400
            ? "Narrow the date or school filter and try again."
            : "The export could not be generated.",
      },
      { status: upstream.status === 400 ? 400 : 502 }
    );
  }
  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("text/csv")) {
    return NextResponse.json(
      { error: "The export service returned an unexpected format." },
      { status: 502 }
    );
  }

  // Fail closed: unlike the JSON reports, the CSV carries no applied_filters
  // echo, so a backend deployed before the school-type contract would silently
  // stream an unfiltered (GPS-bearing) export for an ECD/Primary request. Only
  // proceed when the export service attests it applied the requested type.
  if (
    !csvSchoolTypeAttestationSatisfied(
      upstream.headers.get("x-applied-school-type"),
      filters.schoolType
    )
  ) {
    return NextResponse.json(
      {
        error:
          "The export service could not confirm the ECD/Primary filter was applied.",
      },
      { status: 502 }
    );
  }

  const csv = await upstream.text();
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zazi-time-entries-${stamp}.csv"`,
    },
  });
}
