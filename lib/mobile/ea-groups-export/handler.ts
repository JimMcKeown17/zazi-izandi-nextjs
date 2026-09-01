import { hasCapability, type Role } from "@/lib/mobile/capabilities";
import { buildEaGroupsExportRequest } from "./request";
import {
  EA_GROUPS_EXPORT_CAPACITY_ERROR,
  EA_GROUPS_EXPORT_SCHEMA,
  eaGroupsDownloadFilename,
  readBoundedResponseBytes,
} from "./transport";

export type EaGroupsExportSession = {
  userId: string | null;
  sessionClaims?: { metadata?: { role?: Role } } | null;
  getToken(): Promise<string | null>;
};

export type EaGroupsExportDependencies = {
  getSession(): Promise<EaGroupsExportSession>;
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

function capacityResponse(): Response {
  return jsonResponse(
    {
      error: "The export is larger than the safe download limit. Contact the data team.",
      code: "mobile_ea_groups_export_capacity_exceeded",
    },
    413
  );
}

export async function handleEaGroupsExport(
  request: Request,
  dependencies: EaGroupsExportDependencies
): Promise<Response> {
  const session = await dependencies.getSession();
  if (!session.userId) {
    return jsonResponse({ error: "authentication required" }, 401);
  }
  const role = session.sessionClaims?.metadata?.role;
  if (!hasCapability(role, "mobile.csv.export")) {
    return jsonResponse({ error: "insufficient role" }, 403);
  }
  const token = await session.getToken();
  if (!token) {
    return jsonResponse({ error: "session expired" }, 401);
  }
  if (new URL(request.url).searchParams.size > 0) {
    return jsonResponse({ error: "EA groups export does not accept filters" }, 400);
  }

  const upstreamRequest = buildEaGroupsExportRequest(token);
  let upstream: Response;
  try {
    upstream = await dependencies.fetchUpstream(upstreamRequest.path, {
      ...upstreamRequest.init,
      signal: request.signal,
    });
  } catch (error) {
    console.error("[mobile/export] Failed to reach Django EA groups export:", error);
    return jsonResponse({ error: "export service unavailable" }, 502);
  }

  if (upstream.status === 413) {
    const attested =
      upstream.headers.get("x-zazi-export-error") ===
      EA_GROUPS_EXPORT_CAPACITY_ERROR;
    await upstream.body?.cancel();
    return attested
      ? capacityResponse()
      : jsonResponse({ error: "The export could not be generated." }, 502);
  }
  if (!upstream.ok) {
    await upstream.body?.cancel();
    return jsonResponse({ error: "The export could not be generated." }, 502);
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (
    !contentType.toLowerCase().startsWith("text/csv") ||
    upstream.headers.get("x-zazi-export-schema") !== EA_GROUPS_EXPORT_SCHEMA
  ) {
    await upstream.body?.cancel();
    return jsonResponse(
      { error: "The export service returned an unexpected format." },
      502
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = await readBoundedResponseBytes(upstream);
  } catch (error) {
    console.error("[mobile/export] EA groups export exceeded its byte contract:", error);
    return jsonResponse({ error: "The export could not be generated." }, 502);
  }
  const filename = eaGroupsDownloadFilename(dependencies.now?.() ?? new Date());
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  return new Response(body, {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Zazi-Export-Schema": EA_GROUPS_EXPORT_SCHEMA,
      "X-Zazi-Download-Filename": filename,
    },
  });
}
